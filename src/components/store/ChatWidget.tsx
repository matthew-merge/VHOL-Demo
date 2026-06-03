import { useRef, useState } from "react";
import { startSession, sendChat } from "../../lib/api";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  async function openPanel() {
    setOpen(true);
    if (startedRef.current) return; // start the session exactly once
    startedRef.current = true;
    try {
      const session = await startSession();
      setMessages([
        {
          role: "assistant",
          text: `👋 Welcome, ${session.name} from ${session.company}. How can I help with your store today?`,
        },
      ]);
      setReady(true);
    } catch (err) {
      setMessages([{ role: "assistant", text: `⚠ Couldn't start your session: ${String(err)}` }]);
      startedRef.current = false; // allow a retry on next open
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy || !ready) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const reply = await sendChat(text);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: `⚠ ${String(err)}` }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        aria-label="Open chat"
        onClick={openPanel}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xl shadow-lg"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-72 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="bg-gradient-to-br from-blue-500 to-violet-500 text-white px-3 py-2 font-semibold text-sm flex justify-between">
        <span>Acme Assistant</span>
        <button aria-label="Close chat" onClick={() => setOpen(false)}>—</button>
      </div>
      <div className="p-3 flex-1 max-h-80 overflow-y-auto text-sm space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 ${m.role === "user" ? "bg-blue-50 ml-6" : "bg-neutral-100 mr-6"}`}
          >
            {m.text}
          </div>
        ))}
        {!ready && messages.length === 0 && <div className="text-neutral-400 text-xs">Connecting…</div>}
        {busy && <div className="text-neutral-400 text-xs">Acme Assistant is thinking…</div>}
      </div>
      <div className="border-t border-neutral-100 p-2 flex gap-2">
        <input
          className="flex-1 text-sm outline-none px-2 disabled:opacity-50"
          placeholder={ready ? "Ask anything…" : "Connecting…"}
          value={input}
          disabled={!ready}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          aria-label="Send"
          onClick={send}
          disabled={!ready}
          className="text-blue-600 font-semibold text-sm px-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
