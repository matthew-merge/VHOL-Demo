import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bus } from "./eventBus";
import * as gateway from "./gateway";
import * as ah from "./agentHandler";
import { detectRedactions } from "./dlp";
import type { Env, GatewayContentItem, HistoryItem } from "./types";

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

  while (true) {
    const response = await gateway.chat(env, session.model, session.history, tools);
    const returnedModel = response.model ?? "";
    if (returnedModel.includes("/")) session.model = returnedModel;
    bus.emit("gateway", "route", `routed → ${returnedModel || "unknown"}`, {
      model: returnedModel,
      usage: response.usage,
    });

    const output = response.output[0];
    session.history.push(output as HistoryItem);

    if (output.finish_reason === "tool_use") {
      for (const item of output.content as GatewayContentItem[]) {
        if (item.type !== "tool_use") continue;
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
      const text = (output.content[0] as GatewayContentItem).text ?? "";
      bus.emit("response", "message", text, { text });
      return text;
    }
  }
}
