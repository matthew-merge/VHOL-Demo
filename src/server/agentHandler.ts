import type { Env, Tool } from "./types";

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
  if (!res.ok) return []; // proceed without tools, like the python client
  const data = (await res.json()) as {
    tools?: { fully_qualified_name: string; description: string; input_schema: unknown }[];
  };
  return (data.tools ?? []).map((t) => ({
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
  const data = (await res.json()) as { result: { content: { text: string }[] } };
  return data.result.content[0].text;
}
