import { useEffect, useState } from "react";
import AcmeNav from "../components/store/AcmeNav";
import AcmeLocations from "../components/store/AcmeLocations";
import ChatWidget from "../components/store/ChatWidget";
import { startSession } from "../lib/api";
import type { SessionInfo } from "../lib/events";

export default function StorePage() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    startSession().then(setSession).catch((err) => console.error("session start failed", err));
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-900">
      <AcmeNav />
      <main className="flex-1 flex overflow-y-auto">
        <AcmeLocations />
      </main>
      {session && <ChatWidget userName={session.name} company={session.company} />}
      <a
        href="/console"
        target="_blank"
        rel="noreferrer"
        className="fixed top-3 right-4 text-xs text-neutral-400 hover:text-neutral-600"
      >
        open monitoring console ↗
      </a>
    </div>
  );
}
