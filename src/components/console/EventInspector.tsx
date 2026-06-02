import type { AgentEvent } from "../../lib/events";

export default function EventInspector({ event }: { event: AgentEvent | null }) {
  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
        Select an event to inspect its payload
      </div>
    );
  }
  return (
    <div className="flex-1 bg-neutral-950 p-3 overflow-auto">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">
        {event.source} · {event.kind}
      </div>
      <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
        {JSON.stringify(event.detail ?? { summary: event.summary }, null, 2)}
      </pre>
    </div>
  );
}
