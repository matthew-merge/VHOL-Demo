import { useEffect, useRef, useState } from "react";
import { useEventStream } from "../lib/events";
import { resetDemo } from "../lib/api";
import StatusBar from "../components/console/StatusBar";
import EventList from "../components/console/EventList";
import EventInspector from "../components/console/EventInspector";

export default function ConsolePage() {
  const events = useEventStream();
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const pinnedRef = useRef(false);

  // auto-follow newest unless the user has pinned a row
  useEffect(() => {
    if (!pinnedRef.current && events.length > 0) {
      setPinnedId(events[events.length - 1].id);
    }
  }, [events]);

  function onSelect(id: string) {
    pinnedRef.current = true;
    setPinnedId(id);
  }

  async function onReset() {
    await resetDemo();
    window.location.reload();
  }

  const selected = events.find((e) => e.id === pinnedId) ?? null;

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-900 text-neutral-200 font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
        <span className="text-sm font-semibold">🧠 Monitoring Console</span>
        <button
          onClick={onReset}
          className="text-xs border border-neutral-700 rounded px-2 py-0.5 hover:bg-neutral-800"
        >
          Reset demo
        </button>
      </div>
      <StatusBar events={events} />
      <div className="flex flex-1 overflow-hidden">
        <EventList events={events} selectedId={pinnedId} onSelect={onSelect} />
        <EventInspector event={selected} />
      </div>
    </div>
  );
}
