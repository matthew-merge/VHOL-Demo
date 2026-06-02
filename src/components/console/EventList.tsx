import type { AgentEvent, EventSource } from "../../lib/events";

const COLOR: Record<EventSource, string> = {
  identity: "border-violet-400",
  gateway: "border-orange-400",
  agent_handler: "border-emerald-400",
  dlp: "border-rose-400",
  response: "border-blue-400",
  error: "border-red-500",
};

interface Props {
  events: AgentEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function EventList({ events, selectedId, onSelect }: Props) {
  return (
    <div className="w-[44%] shrink-0 overflow-y-auto border-r border-neutral-800">
      {events.map((e) => (
        <button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className={`block w-full text-left border-l-4 ${COLOR[e.source]} px-3 py-1.5 text-xs ${
            e.id === selectedId ? "bg-neutral-800" : "hover:bg-neutral-900"
          }`}
        >
          <span className="text-[9px] uppercase tracking-wide text-neutral-500">{e.source}</span>{" "}
          <span className="text-neutral-200">{e.summary}</span>
        </button>
      ))}
    </div>
  );
}
