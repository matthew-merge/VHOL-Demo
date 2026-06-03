# VHOL Demo — External Support Agent on Merge Gateway + Agent Handler

A two-view demo: an **Acme Co** storefront with an embedded support agent (`/`)
and a **monitoring console** that traces the agent live (`/console`).

## Setup
1. `npm install`
2. `cp .env.example .env` and fill in `GATEWAY_API_KEY`, `AH_API_KEY`,
   `PROJECT_ID`, `TOOL_PACK_ID`. The `DEMO_*` identity vars have working defaults.
3. `npm run dev`
4. Open `http://localhost:5173/` (store) and `http://localhost:5173/console`
   (monitor) in two windows.

## How it works
The Vite dev-server middleware (`src/server/`) holds all Merge keys, runs the
agentic loop (Gateway routing + Agent Handler tool calls), manages the per-user
Registered User lifecycle, and streams structured events to the console over SSE.

## Tests
`npm run test`

## Live demo smoke checklist (requires a real `.env`)
1. `npm run dev`; open `/console` in one window and `/` in another.
2. On first opening the chat widget: the console shows `identity → ru_lookup → ru_create` (first run).
3. Send "Hello" in the widget: console shows `tool_search → route` (cheap model) and a reply appears.
4. Send "Why can't I add a third location?": console shows `route` (Opus), `tool_call`/`tool_result` rows, optionally a `dlp` row; the widget shows the answer.
5. Click a past event → the inspector pins it; new events stop auto-following until reload.
6. Click "Reset demo" → the console clears; reload the store → the `ru_create` path shows again.

During the first live run, verify two things flagged in the design and adjust if needed:
- **DLP redaction**: confirm how Agent Handler surfaces a redaction in the `/mcp/` response and that `src/server/dlp.ts` detects it.
- **RU delete**: confirm the `DELETE /registered-users/{id}/` endpoint behaves as expected for the Reset button (otherwise rotate `origin_user_id`).
