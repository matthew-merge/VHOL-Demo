import type { SessionInfo } from "./events";

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export function startSession(): Promise<SessionInfo> {
  return postJson<SessionInfo>("/api/session/start");
}

export async function sendChat(message: string): Promise<string> {
  const { text } = await postJson<{ text: string }>("/api/chat", { message });
  return text;
}

export async function resetDemo(): Promise<void> {
  await postJson<{ ok: boolean }>("/api/reset");
}
