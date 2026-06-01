import { describe, it, expect, vi, afterEach } from "vitest";
import { listRegisteredUsers, createRegisteredUser, deleteRegisteredUser } from "./agentHandler";
import type { Env } from "./types";

const env: Env = { AH_API_KEY: "ah_key" };
afterEach(() => vi.restoreAllMocks());

describe("registered users", () => {
  it("lists by origin_user_id and returns results[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await listRegisteredUsers(env, "richard@acme.co");
    expect(out).toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://ah-api.merge.dev/api/v1/registered-users/?origin_user_id=richard%40acme.co"
    );
  });

  it("creates an RU with a generated id and company group", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "ru_new", origin_user_id: "richard@acme.co" }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const ru = await createRegisteredUser(env, {
      id: "uuid-1", origin_user_id: "richard@acme.co", origin_user_name: "Richard",
      shared_credential_group: { origin_company_id: "acme-co", origin_company_name: "Acme Co" }, user_type: "HUMAN",
    });
    expect(ru.id).toBe("ru_new");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).shared_credential_group.origin_company_name).toBe("Acme Co");
  });

  it("deletes by id and tolerates 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(deleteRegisteredUser(env, "ru_x")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("https://ah-api.merge.dev/api/v1/registered-users/ru_x/");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});
