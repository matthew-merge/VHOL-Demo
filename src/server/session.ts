import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { bus } from "./eventBus";
import * as gateway from "./gateway";
import * as ah from "./agentHandler";
import { detectRedactions } from "./dlp";
import type { Env, GatewayContentItem, HistoryItem } from "./types";

const MAX_TURNS = 10;

export interface Session {
  ruId: string | null;
  originUserId: string;
  name: string;
  company: string;
  companyId: string;
  history: HistoryItem[];
  model: string;
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

  const tools = await ah.searchTools(env, session.ruId, userMessage);
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
      const text = (output.content[0] as GatewayContentItem | undefined)?.text ?? "";
      if (!text) {
        bus.emit("error", "error", "Gateway returned an empty final response", { output });
      }
      const finalText = text || "(no response)";
      bus.emit("response", "message", finalText, { text: finalText });
      return finalText;
    }
  }
}

export async function startSession(env: Env, session: Session): Promise<{ ruId: string; created: boolean }> {
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
    ruId = existing[0].id;
    bus.emit("agent_handler", "ru_exists", `RU ${ruId} already exists for ${session.name}`, {
      registeredUser: existing[0],
    });
  }

  session.ruId = ruId;
  return { ruId, created };
}

export async function resetSession(env: Env, session: Session): Promise<Session> {
  if (session.ruId) {
    try {
      await ah.deleteRegisteredUser(env, session.ruId);
    } catch {
      // best-effort; reset must always succeed for the demo
    }
  }
  bus.clear();
  return createSession(env);
}
