import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { bus } from "./eventBus";
import { createSession, runTurn, startSession } from "./session";
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
