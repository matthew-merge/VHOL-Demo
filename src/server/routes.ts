import type { IncomingMessage, ServerResponse } from "node:http";
import type { PluginOption } from "vite";
import type { Env } from "./types";
import { readJson, sendJson } from "./http";
import { bus } from "./eventBus";
import { createSession, runTurn, startSession, resetSession, type Session } from "./session";

export function createApiPlugin(env: Env): PluginOption {
  let session: Session = createSession(env);
  const getSession = () => session;
  const setSession = (s: Session) => {
    session = s;
  };

  return {
    name: "vhol-api",
    configureServer(server) {
      server.middlewares.use("/api/chat", chatHandler(env, getSession));
      server.middlewares.use("/api/events", eventsHandler());
      server.middlewares.use("/api/session/start", sessionStartHandler(env, getSession));
      server.middlewares.use("/api/reset", resetHandler(env, getSession, setSession));
    },
  };
}

function chatHandler(env: Env, getSession: () => Session) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    try {
      const { message } = await readJson<{ message?: string }>(req);
      if (!message) return sendJson(res, 400, { error: "message is required" });
      const text = await runTurn(env, getSession(), message);
      sendJson(res, 200, { text });
    } catch (err) {
      bus.emit("error", "error", String(err), { detail: String(err) });
      sendJson(res, 500, { error: String(err) });
    }
  };
}

function eventsHandler() {
  return (req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    for (const event of bus.getLog()) res.write(`data: ${JSON.stringify(event)}\n\n`);
    const unsub = bus.subscribe((event) => res.write(`data: ${JSON.stringify(event)}\n\n`));
    req.on("close", unsub);
  };
}

function sessionStartHandler(env: Env, getSession: () => Session) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    try {
      const session = getSession();
      const { created } = await startSession(env, session);
      sendJson(res, 200, {
        ruId: session.ruId,
        created,
        name: session.name,
        company: session.company,
        originUserId: session.originUserId,
      });
    } catch (err) {
      bus.emit("error", "error", String(err), { detail: String(err) });
      sendJson(res, 500, { error: String(err) });
    }
  };
}

function resetHandler(env: Env, getSession: () => Session, setSession: (s: Session) => void) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    try {
      setSession(await resetSession(env, getSession()));
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { error: String(err) });
    }
  };
}
