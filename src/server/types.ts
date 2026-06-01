export type Env = Record<string, string>;

/** Items in the Gateway `input` array: user messages, assistant outputs, tool results. */
export type HistoryItem = Record<string, unknown>;

export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: unknown;
}

export interface GatewayContentItem {
  type: string; // "text" | "tool_use"
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface GatewayOutput {
  finish_reason: string;
  content: GatewayContentItem[];
  [k: string]: unknown;
}

export interface GatewayResponse {
  model?: string;
  output: GatewayOutput[];
  usage?: { input_tokens?: number; output_tokens?: number; [k: string]: unknown };
  [k: string]: unknown;
}

export interface RegisteredUser {
  id: string;
  origin_user_id: string;
  origin_user_name?: string;
  shared_credential_group?: {
    origin_company_id?: string | null;
    origin_company_name?: string | null;
  } | null;
  authenticated_connectors?: string[];
  user_type?: string;
  is_test?: boolean;
}
