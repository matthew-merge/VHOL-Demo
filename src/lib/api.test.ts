import { describe, it, expect, vi, afterEach } from "vitest";
import { startSession, sendChat, resetDemo } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("client api", () => {
  it("startSession posts and returns SessionInfo", async () => {
    const body = { ruId: "ru_1", created: true, name: "Richard", company: "Acme Co", originUserId: "richard@acme.co" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
    expect(await startSession()).toEqual(body);
  });

  it("sendChat posts the message and returns text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "hi" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendChat("hello")).toBe("hi");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: "hello" });
  });

  it("resetDemo posts to /api/reset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await resetDemo();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/reset");
  });
});
