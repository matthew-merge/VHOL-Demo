import { describe, it, expect, vi, afterEach } from "vitest";
import { chat } from "./gateway";
import type { Env } from "./types";

const env: Env = { GATEWAY_API_KEY: "gw_key", PROJECT_ID: "proj_1" };

afterEach(() => vi.restoreAllMocks());

describe("gateway.chat", () => {
  it("posts history + tools + project_id and omits model when empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ model: "moonshot/kimi-k2", output: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await chat(env, "", [{ type: "message", role: "user", content: "hi" }], [
      { type: "function", name: "t", description: "d", parameters: {} },
    ]);

    expect(res.model).toBe("moonshot/kimi-k2");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-gateway.merge.dev/v1/responses");
    expect(init.headers.Authorization).toBe("Bearer gw_key");
    const body = JSON.parse(init.body);
    expect(body.model).toBeUndefined();
    expect(body.project_id).toBe("proj_1");
    expect(body.tool_choice).toBe("auto");
    expect(body.input).toHaveLength(1);
  });

  it("includes model when provided and throws on non-ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 500, statusText: "ERR" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(chat(env, "anthropic/claude-opus-4-7", [], [])).rejects.toThrow(/Gateway 500/);
  });
});
