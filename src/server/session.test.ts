import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { bus } from "./eventBus";
import { createSession, runTurn, startSession, resetSession } from "./session";
import type { Env } from "./types";
import * as ah from "./agentHandler";
import * as gateway from "./gateway";

const env: Env = {
  GATEWAY_API_KEY: "g", AH_API_KEY: "a", PROJECT_ID: "p", TOOL_PACK_ID: "tp",
  DEMO_USER_ORIGIN_ID: "richard@acme.co", DEMO_USER_NAME: "Richard",
  DEMO_COMPANY_NAME: "Acme Co", DEMO_COMPANY_ID: "acme-co",
};

beforeEach(() => bus.clear());
afterEach(() => vi.restoreAllMocks());

describe("createSession", () => {
  it("seeds a system message from systemPrompt.md", () => {
    const s = createSession(env);
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ type: "message", role: "system" });
    expect(String((s.history[0] as { content: string }).content)).toContain("Acme Co Support Assistant");
  });
});

describe("runTurn", () => {
  it("does one tool round-trip then returns final text, emitting events", async () => {
    const s = createSession(env);
    s.ruId = "ru_1";

    vi.spyOn(ah, "searchTools").mockResolvedValue([
      { type: "function", name: "salesforce__search_records", description: "d", parameters: {} },
    ]);
    vi.spyOn(ah, "callTool").mockResolvedValue('{"plan":"Starter","max_locations":2}');

    const chat = vi.spyOn(gateway, "chat");
    chat.mockResolvedValueOnce({
      model: "anthropic/claude-opus-4-7",
      output: [{ finish_reason: "tool_use", content: [
        { type: "tool_use", id: "tu_1", name: "salesforce__search_records", input: { q: "plan" } },
      ] }],
    });
    chat.mockResolvedValueOnce({
      model: "anthropic/claude-opus-4-7",
      output: [{ finish_reason: "stop", content: [{ type: "text", text: "Your Starter plan allows 2 locations." }] }],
      usage: { input_tokens: 800, output_tokens: 40 },
    });

    const text = await runTurn(env, s, "Why can't I add a third location?");

    expect(text).toContain("2 locations");
    expect(s.model).toBe("anthropic/claude-opus-4-7");
    const kinds = bus.getLog().map((e) => e.kind);
    expect(kinds).toEqual([
      "tool_search", "route", "tool_call", "tool_result", "route", "message",
    ]);
    expect(s.history.length).toBe(5); // system + user + assistant(tool_use) + tool_result + assistant(text)
  });

  it("routes a trivial message with no tools straight to a reply", async () => {
    const s = createSession(env);
    s.ruId = "ru_1";
    vi.spyOn(ah, "searchTools").mockResolvedValue([]);
    vi.spyOn(gateway, "chat").mockResolvedValue({
      model: "moonshot/kimi-k2",
      output: [{ finish_reason: "stop", content: [{ type: "text", text: "Hi Richard!" }] }],
    });

    const text = await runTurn(env, s, "Hello");
    expect(text).toBe("Hi Richard!");
    expect(bus.getLog().map((e) => e.kind)).toEqual(["tool_search", "route", "message"]);
    expect(s.history.length).toBe(3); // system + user + assistant(text)
  });

  it("attaches the cross-system core toolkit (Salesforce + Notion) on a substantive turn", async () => {
    const s = createSession(env);
    s.ruId = "ru_1";

    // Per-message search misses; the core intents surface Salesforce + Notion tools,
    // including the content-reading tool that lets the agent read a guide's body.
    const search = vi
      .spyOn(ah, "searchTools")
      .mockResolvedValueOnce([]) // per-message search
      .mockResolvedValueOnce([
        { type: "function", name: "salesforce__get_account", description: "d", parameters: {} },
      ]) // core: account / tier
      .mockResolvedValueOnce([
        { type: "function", name: "notion__get_block_children", description: "d", parameters: {} },
      ]) // core: page contents
      .mockResolvedValueOnce([
        { type: "function", name: "notion__query_database", description: "d", parameters: {} },
      ]) // core: database
      .mockResolvedValueOnce([
        { type: "function", name: "jira__search_issues", description: "d", parameters: {} },
      ]); // core: known bugs
    vi.spyOn(ah, "callTool").mockResolvedValue('{"plan":"Tier 3"}');

    const chat = vi.spyOn(gateway, "chat");
    chat.mockResolvedValueOnce({
      model: "anthropic/claude-opus-4-7",
      output: [{ finish_reason: "tool_use", content: [{ type: "tool_use", id: "tu_1", name: "salesforce__get_account", input: {} }] }],
    });
    chat.mockResolvedValueOnce({
      model: "anthropic/claude-opus-4-7",
      output: [{ finish_reason: "stop", content: [{ type: "text", text: "You're on Tier 3." }] }],
    });

    const text = await runTurn(env, s, "why can't I add a third location?");

    expect(text).toBe("You're on Tier 3.");
    expect(search).toHaveBeenCalledTimes(5); // per-message search + 4 core intents
    const toolNames = (chat.mock.calls[0][3] as { name: string }[]).map((t) => t.name);
    expect(toolNames).toEqual(
      expect.arrayContaining(["salesforce__get_account", "notion__get_block_children", "jira__search_issues"])
    );
    expect(bus.getLog().map((e) => e.kind)).toContain("tool_call");
  });

  it("keeps a greeting tool-free (no core fallback)", async () => {
    const s = createSession(env);
    s.ruId = "ru_1";
    const search = vi.spyOn(ah, "searchTools").mockResolvedValue([]);
    vi.spyOn(gateway, "chat").mockResolvedValue({
      model: "openai/gpt-5-nano",
      output: [{ finish_reason: "stop", content: [{ type: "text", text: "Hi there!" }] }],
    });

    const text = await runTurn(env, s, "hello");
    expect(text).toBe("Hi there!");
    expect(search).toHaveBeenCalledTimes(1); // no core fallback for a greeting
  });

  it("re-routes on every user turn instead of pinning the first turn's model", async () => {
    const s = createSession(env);
    s.ruId = "ru_1";
    vi.spyOn(ah, "searchTools").mockResolvedValue([]);
    const chat = vi
      .spyOn(gateway, "chat")
      .mockResolvedValueOnce({
        model: "moonshot/kimi-k2",
        output: [{ finish_reason: "stop", content: [{ type: "text", text: "Hi!" }] }],
      })
      .mockResolvedValueOnce({
        model: "anthropic/claude-opus-4-7",
        output: [{ finish_reason: "stop", content: [{ type: "text", text: "Detailed." }] }],
      });

    await runTurn(env, s, "hello"); // cheap turn pins moonshot/kimi-k2 within the turn
    await runTurn(env, s, "Why am I blocked from adding a third location?");

    // Each turn must start UNPINNED (model "") so the Gateway re-routes on the new
    // message. The bug: turn 2 was called with "moonshot/kimi-k2", bypassing routing.
    expect(chat.mock.calls[0][1]).toBe("");
    expect(chat.mock.calls[1][1]).toBe("");
  });
});

describe("startSession", () => {
  it("creates an RU when none exists and emits identity + lookup + create", async () => {
    bus.clear();
    const s = createSession(env);
    vi.spyOn(ah, "listRegisteredUsers").mockResolvedValue([]);
    vi.spyOn(ah, "createRegisteredUser").mockResolvedValue({ id: "ru_new", origin_user_id: env.DEMO_USER_ORIGIN_ID });

    const { ruId, created } = await startSession(env, s);
    expect(created).toBe(true);
    expect(ruId).toBe("ru_new");
    expect(s.ruId).toBe("ru_new");
    expect(bus.getLog().map((e) => e.kind)).toEqual(["login", "ru_lookup", "ru_create"]);
  });
});

describe("startSession (existing RU)", () => {
  it("reuses an existing RU and emits ru_exists without creating", async () => {
    bus.clear();
    const s = createSession(env);
    vi.spyOn(ah, "listRegisteredUsers").mockResolvedValue([
      { id: "ru_existing", origin_user_id: env.DEMO_USER_ORIGIN_ID },
    ]);
    const createSpy = vi.spyOn(ah, "createRegisteredUser");

    const { ruId, created } = await startSession(env, s);

    expect(created).toBe(false);
    expect(ruId).toBe("ru_existing");
    expect(s.ruId).toBe("ru_existing");
    expect(createSpy).not.toHaveBeenCalled();
    expect(bus.getLog().map((e) => e.kind)).toEqual(["login", "ru_lookup", "ru_exists"]);
  });
});

describe("resetSession", () => {
  it("deletes the RU, clears the bus, and returns a fresh session", async () => {
    bus.clear();
    const s = createSession(env);
    s.ruId = "ru_old";
    s.history.push({ type: "message", role: "user", content: "hi" });
    vi.spyOn(ah, "listRegisteredUsers").mockResolvedValue([
      { id: "ru_old", origin_user_id: env.DEMO_USER_ORIGIN_ID },
    ]);
    const delSpy = vi.spyOn(ah, "deleteRegisteredUser").mockResolvedValue(undefined);
    bus.emit("identity", "login", "noise");

    const fresh = await resetSession(env, s);

    expect(delSpy).toHaveBeenCalledWith(env, "ru_old");
    expect(bus.getLog()).toEqual([]);
    expect(fresh.ruId).toBeNull();
    expect(fresh.history).toHaveLength(1); // system message only
  });

  it("cleans up RUs found by lookup even when in-memory ruId is null (server restart)", async () => {
    bus.clear();
    const s = createSession(env);
    s.ruId = null; // dev server restarted since the RU was created
    vi.spyOn(ah, "listRegisteredUsers").mockResolvedValue([
      { id: "ru_orphan", origin_user_id: env.DEMO_USER_ORIGIN_ID },
    ]);
    const delSpy = vi.spyOn(ah, "deleteRegisteredUser").mockResolvedValue(undefined);

    await resetSession(env, s);

    expect(delSpy).toHaveBeenCalledWith(env, "ru_orphan");
  });

  it("still deletes the in-memory ruId when the lookup fails (best-effort)", async () => {
    bus.clear();
    const s = createSession(env);
    s.ruId = "ru_old";
    vi.spyOn(ah, "listRegisteredUsers").mockRejectedValue(new Error("AH list 500"));
    const delSpy = vi.spyOn(ah, "deleteRegisteredUser").mockResolvedValue(undefined);

    const fresh = await resetSession(env, s);

    expect(delSpy).toHaveBeenCalledWith(env, "ru_old");
    expect(fresh.ruId).toBeNull();
  });
});

describe("startSession idempotency", () => {
  it("creates the RU only once under concurrent calls", async () => {
    bus.clear();
    const s = createSession(env);
    const listSpy = vi.spyOn(ah, "listRegisteredUsers").mockResolvedValue([]);
    const createSpy = vi
      .spyOn(ah, "createRegisteredUser")
      .mockResolvedValue({ id: "ru_new", origin_user_id: env.DEMO_USER_ORIGIN_ID });

    const [a, b] = await Promise.all([startSession(env, s), startSession(env, s)]);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ ruId: "ru_new", created: true });
    expect(b).toEqual({ ruId: "ru_new", created: true });
    expect(s.ruId).toBe("ru_new");
    expect(bus.getLog().map((e) => e.kind)).toEqual(["login", "ru_lookup", "ru_create"]);
  });

  it("short-circuits when the session already has an RU", async () => {
    const s = createSession(env);
    s.ruId = "ru_existing";
    const listSpy = vi.spyOn(ah, "listRegisteredUsers");
    const r = await startSession(env, s);
    expect(r).toEqual({ ruId: "ru_existing", created: false });
    expect(listSpy).not.toHaveBeenCalled();
  });
});
