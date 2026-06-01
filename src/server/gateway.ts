import type { Env, GatewayResponse, HistoryItem, Tool } from "./types";

const GATEWAY_URL = "https://api-gateway.merge.dev/v1/responses";

export async function chat(
  env: Env,
  model: string,
  history: HistoryItem[],
  tools: Tool[]
): Promise<GatewayResponse> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(model ? { model } : {}),
      input: history,
      ...(tools.length ? { tools, tool_choice: "auto" } : {}),
      project_id: env.PROJECT_ID,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gateway ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return (await res.json()) as GatewayResponse;
}
