import { describe, it, expect, vi, afterEach } from "vitest";
import { searchTools, callTool } from "./agentHandler";
import type { Env } from "./types";

const env: Env = { AH_API_KEY: "ah_key", TOOL_PACK_ID: "tp_1" };
afterEach(() => vi.restoreAllMocks());

describe("agentHandler.searchTools", () => {
  it("converts AH tools to Gateway format and hits the RU-scoped url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tools: [
        { fully_qualified_name: "salesforce__search_records", description: "d", input_schema: { type: "object" } },
      ] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const tools = await searchTools(env, "ru_9", "find order");
    expect(tools).toEqual([
      { type: "function", name: "salesforce__search_records", description: "d", parameters: { type: "object" } },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://ah-api.merge.dev/api/v1/tool-packs/tp_1/registered-users/ru_9/search/"
    );
  });

  it("returns [] when search fails (mirror python)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("err", { status: 500 })));
    expect(await searchTools(env, "ru_9", "x")).toEqual([]);
  });
});

describe("agentHandler.callTool", () => {
  it("posts JSON-RPC tools/call and returns result text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: { content: [{ type: "text", text: "DONE" }] } }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await callTool(env, "ru_9", "jira__search_issues", { q: "x" });
    expect(out).toBe("DONE");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ jsonrpc: "2.0", method: "tools/call", params: { name: "jira__search_issues", arguments: { q: "x" } } });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://ah-api.merge.dev/api/v1/tool-packs/tp_1/registered-users/ru_9/mcp/"
    );
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500, statusText: "ERR" })));
    await expect(callTool(env, "ru_9", "x", {})).rejects.toThrow(/Agent Handler 500/);
  });
});
