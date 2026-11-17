import type { IncomingMessage } from "node:http";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  // Public origin the app is served from, e.g. https://store.acme.example
  appBaseUrl: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

const CALLBACK_PATH = "/api/oauth/callback";

// Step 1: send the customer to the identity provider's consent screen.
export function buildAuthorizeUrl(config: OAuthConfig, state: string): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", `${config.appBaseUrl}${CALLBACK_PATH}`);
  url.searchParams.set("state", state);
  return url.toString();
}

// Step 2: the provider redirects back to CALLBACK_PATH with ?code=...&state=...
export function readCallback(req: IncomingMessage, expectedState: string): string {
  const url = new URL(req.url ?? "", "http://placeholder");
  if (url.searchParams.get("state") !== expectedState) {
    throw new Error("OAuth state mismatch");
  }
  const code = url.searchParams.get("code");
  if (!code) throw new Error("OAuth callback is missing the authorization code");
  return code;
}

// Step 3: swap the authorization code for tokens.
export async function exchangeCode(
  config: OAuthConfig,
  req: IncomingMessage,
  code: string,
): Promise<TokenResponse> {
  const path = (req.url ?? "").split("?")[0];
  const redirectUri = `http://${req.headers.host}${path}`;

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}
