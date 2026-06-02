import type { AgentEvent } from "../../lib/events";

export interface Status {
  ruId: string;
  model: string;
  tokens: number;
}

export function deriveStatus(events: AgentEvent[]): Status {
  let ruId = "—";
  let model = "—";
  let tokens = 0;
  for (const e of events) {
    const d = (e.detail ?? {}) as Record<string, any>;
    if (e.kind === "ru_create") ruId = d.response?.id ?? ruId;
    if (e.kind === "ru_exists") ruId = d.registeredUser?.id ?? ruId;
    if (e.kind === "route") {
      if (typeof d.model === "string" && d.model) model = d.model;
      if (d.usage) tokens += (d.usage.input_tokens ?? 0) + (d.usage.output_tokens ?? 0);
    }
  }
  return { ruId, model, tokens };
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="bg-neutral-800 border border-neutral-700 rounded-full px-3 py-0.5">
      {label} <b className="text-white">{value}</b>
    </span>
  );
}

export default function StatusBar({ events }: { events: AgentEvent[] }) {
  const { ruId, model, tokens } = deriveStatus(events);
  return (
    <div className="flex gap-2 flex-wrap text-[11px] text-neutral-300 px-3 py-2 border-b border-neutral-800">
      <Chip label="RU" value={ruId} />
      <Chip label="Model" value={model} />
      <Chip label="Tokens" value={String(tokens)} />
    </div>
  );
}
