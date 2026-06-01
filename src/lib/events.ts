export const EVENT_SOURCES = [
  "identity",
  "gateway",
  "agent_handler",
  "dlp",
  "response",
  "error",
] as const;

export type EventSource = (typeof EVENT_SOURCES)[number];

export interface AgentEvent {
  id: string;
  ts: number;
  source: EventSource;
  kind: string; // ru_lookup | ru_create | ru_exists | route | tool_search | tool_call | tool_result | redaction | message | login | error
  summary: string;
  detail?: unknown;
}

export interface SessionInfo {
  ruId: string;
  created: boolean;
  name: string;
  company: string;
  originUserId: string;
}

export function isAgentEvent(value: unknown): value is AgentEvent {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.ts === "number" &&
    typeof e.kind === "string" &&
    typeof e.summary === "string" &&
    typeof e.source === "string" &&
    (EVENT_SOURCES as readonly string[]).includes(e.source)
  );
}
