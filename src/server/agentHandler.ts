import type { Env, Tool, RegisteredUser } from "./types";

const MAX_INTENT_LEN = 300;

function execBaseUrl(env: Env, ruId: string): string {
  return `https://ah-api.merge.dev/api/v1/tool-packs/${env.TOOL_PACK_ID}/registered-users/${ruId}`;
}

function authHeaders(env: Env): Record<string, string> {
  return { Authorization: `Bearer ${env.AH_API_KEY}`, "Content-Type": "application/json" };
}

export async function searchTools(
  env: Env,
  ruId: string,
  intent: string,
  maxResults = 5
): Promise<Tool[]> {
  const res = await fetch(`${execBaseUrl(env, ruId)}/search/`, {
    method: "POST",
    headers: authHeaders(env),
    body: JSON.stringify({ intent: intent.slice(0, MAX_INTENT_LEN), max_results: maxResults }),
  });
  const raw = await res.text();
  if (!res.ok) {
    // proceed without tools, like the python client — but say WHY (silent [] hid
    // real errors: the model then fabricates a tool call as plain text).
    console.warn(`[searchTools] AH /search/ ${res.status} ${res.statusText} — no tools. Body: ${raw.slice(0, 500)}`);
    return [];
  }
  let data: { tools?: { fully_qualified_name: string; description: string; input_schema: unknown }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn(`[searchTools] AH /search/ 200 but body was not JSON. Body: ${raw.slice(0, 500)}`);
    return [];
  }
  const found = data.tools ?? [];
  if (found.length === 0) {
    // 200 with nothing usable: either genuinely no match, or the response shape
    // drifted (tools under a different key). The raw body tells us which.
    console.warn(`[searchTools] AH /search/ 200 but parsed 0 tools for "${intent.slice(0, 80)}". Raw: ${raw.slice(0, 800)}`);
  }
  return found.map((t) => ({
    type: "function",
    name: t.fully_qualified_name,
    description: t.description,
    parameters: t.input_schema,
  }));
}

export async function callTool(
  env: Env,
  ruId: string,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${execBaseUrl(env, ruId)}/mcp/`, {
    method: "POST",
    headers: authHeaders(env),
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", id: 1, params: { name, arguments: args } }),
  });
  if (!res.ok) {
    throw new Error(`Agent Handler ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const data = (await res.json()) as { result: { content: { text?: string }[] } };
  const item = data.result?.content?.[0];
  if (!item) throw new Error("Agent Handler: empty content in tool result");
  return item.text ?? JSON.stringify(item);
}

// ---- Registered User management (org-level; not tool-pack scoped) ----

const RU_URL = "https://ah-api.merge.dev/api/v1/registered-users/";

export interface NewRegisteredUser {
  id: string;
  origin_user_id: string;
  origin_user_name: string;
  shared_credential_group?: { origin_company_id?: string | null; origin_company_name?: string | null };
  user_type?: "HUMAN" | "SYSTEM";
}

export async function listRegisteredUsers(env: Env, originUserId: string): Promise<RegisteredUser[]> {
  // is_test=true is REQUIRED: the demo's AH key creates is_test=true registered
  // users, but this endpoint defaults to is_test=false. Without it the lookup
  // never sees the RUs we create — startSession would always re-create (and 400
  // once the RU exists), and reset could never find the RU to delete it.
  const url = `${RU_URL}?origin_user_id=${encodeURIComponent(originUserId)}&is_test=true`;
  const res = await fetch(url, { headers: authHeaders(env) });
  if (!res.ok) throw new Error(`AH list RU ${res.status} ${res.statusText}: ${await res.text()}`);
  const data = (await res.json()) as { results?: RegisteredUser[] };
  return data.results ?? [];
}

export async function createRegisteredUser(env: Env, ru: NewRegisteredUser): Promise<RegisteredUser> {
  const res = await fetch(RU_URL, { method: "POST", headers: authHeaders(env), body: JSON.stringify(ru) });
  if (!res.ok) throw new Error(`AH create RU ${res.status} ${res.statusText}: ${await res.text()}`);
  return (await res.json()) as RegisteredUser;
}

export async function deleteRegisteredUser(env: Env, id: string): Promise<void> {
  const res = await fetch(`${RU_URL}${id}/`, { method: "DELETE", headers: authHeaders(env) });
  if (!res.ok && res.status !== 404) {
    throw new Error(`AH delete RU ${res.status} ${res.statusText}: ${await res.text()}`);
  }
}
