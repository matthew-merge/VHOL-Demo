import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { bus } from "./eventBus";
import * as gateway from "./gateway";
import * as ah from "./agentHandler";
import { detectRedactions } from "./dlp";
import type { Env, GatewayContentItem, HistoryItem, Tool } from "./types";

const MAX_TURNS = 18;

// Dynamic per-message tool search has brittle recall (natural phrasing often returns
// nothing) and only surfaces one system at a time. The demo spans systems — the
// account/tier lives in Salesforce, what each plan includes (limits, quotas) in the
// Notion entitlements guide, and known bugs in Jira — so on substantive turns we
// guarantee this cross-system core toolkit, merged with the per-message search. Otherwise
// the agent can't complete a multi-step answer like "tier from the account, then its
// location limit from the guide."
const CORE_INTENTS = [
  "salesforce account plan tier subscription",
  // `get_page` only returns a page's metadata — the numbers live in its blocks/tables,
  // so we must surface the content-reading tools (get_block_children) and, if the guide
  // is a database, the query tools too.
  "notion read the contents of a page its blocks tables and rows",
  "notion query a database table rows and entries",
  "jira known issues bugs tickets status",
];

async function coreTools(env: Env, ruId: string): Promise<Tool[]> {
  const lists = await Promise.all(CORE_INTENTS.map((intent) => ah.searchTools(env, ruId, intent)));
  const seen = new Set<string>();
  const out: Tool[] = [];
  for (const list of lists) {
    for (const t of list) {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        out.push(t);
      }
    }
  }
  return out;
}

// Pure greetings/pleasantries: kept tool-free so they route to the cheap model.
function isTrivialGreeting(message: string): boolean {
  return /^(hi|hello|hey|yo|hiya|howdy|sup|thanks|thank you|thx|good (morning|afternoon|evening))[\s!.?,]*$/i.test(
    message.trim()
  );
}

// The model occasionally emits a tool call as plain text; never show that raw blob.
function looksLikeFabricatedToolCall(text: string): boolean {
  return /"name"\s*:\s*"[\w./-]+"/.test(text) && /"(input|arguments)"\s*:/.test(text);
}

export interface Session {
  ruId: string | null;
  originUserId: string;
  name: string;
  company: string;
  companyId: string;
  history: HistoryItem[];
  model: string;
  /** in-flight session-start promise; lets concurrent starts share one create */
  starting?: Promise<{ ruId: string; created: boolean }> | null;
}

function systemPrompt(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "systemPrompt.md"), "utf8");
}

function systemMessage(): HistoryItem {
  return { type: "message", role: "system", content: systemPrompt() };
}

export function createSession(env: Env): Session {
  return {
    ruId: null,
    originUserId: env.DEMO_USER_ORIGIN_ID,
    name: env.DEMO_USER_NAME,
    company: env.DEMO_COMPANY_NAME,
    companyId: env.DEMO_COMPANY_ID,
    history: [systemMessage()],
    model: "",
  };
}

export async function runTurn(env: Env, session: Session, userMessage: string): Promise<string> {
  if (!session.ruId) throw new Error("Session has no Registered User. Call startSession first.");

  session.history.push({ type: "message", role: "user", content: userMessage });

  // Re-route per user turn: clear any model pinned by a previous turn so the
  // Gateway's intelligent routing re-evaluates THIS message's complexity (e.g.
  // a trivial "hello" → cheap model, a tool-heavy question → premium model).
  // We still pin to the routed model *within* the turn (below) so the tool-use
  // loop stays coherent on one model across tool_result follow-ups.
  session.model = "";

  let tools = await ah.searchTools(env, session.ruId, userMessage);
  if (!isTrivialGreeting(userMessage)) {
    // Real question: guarantee the cross-system core toolkit (Salesforce account +
    // Notion guides), merged with whatever the per-message search surfaced — so the
    // agent can answer multi-step questions instead of guessing.
    const names = new Set(tools.map((t) => t.name));
    for (const t of await coreTools(env, session.ruId)) {
      if (!names.has(t.name)) tools.push(t);
    }
  }
  bus.emit(
    "agent_handler",
    "tool_search",
    tools.length ? `found ${tools.length} tool(s)` : "no tools needed",
    { intent: userMessage, tools: tools.map((t) => t.name) }
  );

  let turns = 0;
  while (true) {
    if (++turns > MAX_TURNS) throw new Error(`Exceeded ${MAX_TURNS} tool-call turns without a final response`);
    const response = await gateway.chat(env, session.model, session.history, tools);
    const returnedModel = response.model ?? "";
    if (returnedModel.includes("/")) session.model = returnedModel;
    bus.emit("gateway", "route", `routed → ${returnedModel || "unknown"}`, {
      model: returnedModel,
      usage: response.usage,
    });

    const output = response.output[0];
    if (!output) throw new Error("Gateway returned an empty output array");
    session.history.push(output as HistoryItem);

    if (output.finish_reason === "tool_use") {
      for (const item of output.content as GatewayContentItem[]) {
        if (item.type !== "tool_use") continue;
        // Gateway guarantees `name`/`input` are present on tool_use items; ruId is non-null per the guard above.
        bus.emit("agent_handler", "tool_call", `${item.name}(…)`, {
          name: item.name,
          arguments: item.input,
        });
        const result = await ah.callTool(env, session.ruId!, item.name!, item.input ?? {});

        const redactions = detectRedactions(result);
        if (redactions.length) {
          bus.emit("dlp", "redaction", `⚠ DLP: ${redactions.join(", ")} in ${item.name} result`, {
            tool: item.name,
            redactions,
          });
        }
        bus.emit("agent_handler", "tool_result", `${item.name} → result`, {
          name: item.name,
          result,
        });
        session.history.push({ type: "tool_result", tool_use_id: item.id, content: result });
      }
    } else {
      let text = (output.content[0] as GatewayContentItem | undefined)?.text ?? "";

      // Safety net: never surface a raw tool-call blob to the merchant.
      if (looksLikeFabricatedToolCall(text)) {
        text = "Sorry — I couldn't pull that up just now. Could you try rephrasing, or I can connect you with our team?";
      }

      if (!text) {
        bus.emit("error", "error", "Gateway returned an empty final response", { output });
      }
      const finalText = text || "(no response)";
      bus.emit("response", "message", finalText, { text: finalText });
      return finalText;
    }
  }
}

export function startSession(env: Env, session: Session): Promise<{ ruId: string; created: boolean }> {
  // Idempotent: already-started → no-op; start in flight → share it.
  if (session.ruId) return Promise.resolve({ ruId: session.ruId, created: false });
  if (session.starting) return session.starting;

  session.starting = (async () => {
    bus.emit(
      "identity",
      "login",
      `${session.name} logged in — ${session.company} · ${session.originUserId}`,
      { name: session.name, company: session.company, originUserId: session.originUserId }
    );

    const existing = await ah.listRegisteredUsers(env, session.originUserId);
    bus.emit(
      "agent_handler",
      "ru_lookup",
      `GET registered-users?origin_user_id=${session.originUserId} → ${existing.length} result(s)`,
      { count: existing.length, results: existing }
    );

    let ruId: string;
    let created = false;
    if (existing.length === 0) {
      const request = {
        id: randomUUID(),
        origin_user_id: session.originUserId,
        origin_user_name: session.name,
        shared_credential_group: { origin_company_id: session.companyId, origin_company_name: session.company },
        user_type: "HUMAN" as const,
      };
      const ru = await ah.createRegisteredUser(env, request);
      ruId = ru.id;
      created = true;
      bus.emit(
        "agent_handler",
        "ru_create",
        `POST registered-users → 201 · RU ${ru.id} created under ${session.company}`,
        { request, response: ru }
      );
    } else {
      if (existing.length > 1) {
        console.warn(`[startSession] ${existing.length} RUs match ${session.originUserId}; using the first.`);
      }
      ruId = existing[0].id;
      bus.emit("agent_handler", "ru_exists", `RU ${ruId} already exists for ${session.name}`, {
        registeredUser: existing[0],
      });
    }

    session.ruId = ruId;
    return { ruId, created };
  })();

  // If the start fails, clear the in-flight promise so a later attempt can retry.
  session.starting.catch(() => {
    session.starting = null;
  });

  return session.starting;
}

export async function resetSession(env: Env, session: Session): Promise<Session> {
  // Authoritative cleanup: delete every RU for this origin_user_id by looking
  // it up against Agent Handler (the source of truth), not just the in-memory
  // session.ruId. A dev-server restart loses ruId but the RU lives on in AH, so
  // a ruId-only delete would silently leave it behind. Each call is best-effort
  // — a lookup failure must not stop us deleting the id we already know.
  const ids = new Set<string>();
  if (session.ruId) ids.add(session.ruId);
  try {
    const existing = await ah.listRegisteredUsers(env, session.originUserId);
    for (const ru of existing) ids.add(ru.id);
  } catch (err) {
    console.warn("[reset] RU lookup failed (continuing with in-memory id):", err);
  }
  for (const id of ids) {
    try {
      await ah.deleteRegisteredUser(env, id);
    } catch (err) {
      console.warn(`[reset] deleteRegisteredUser(${id}) failed (best-effort):`, err);
    }
  }
  bus.clear();
  return createSession(env);
}
