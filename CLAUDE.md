# VHOL Demo — project guide for Claude

> Auto-loaded into every Claude Code session in this repo. Read this first.

## What this is

An interactive, presenter-driven demo showing how an engineer builds an **external** (customer-facing) support agent on **Merge Gateway + Agent Handler**. The demo product is **Acme Co**, an e-commerce platform (a Shopify analog); the agent helps a merchant named **Richard**. It is run **fully live** against real Merge APIs on stage — there is no mocked/replay path.

Two browser views of one agent (same Vite app, switched by URL path):
- **Store** (`/`) — Acme Co admin page + a bubble→panel chat widget. What the customer sees.
- **Console** (`/console`) — devtools-style live trace of the agent. Demo-only ("the brain"), open it in a second window.

## How it works (end-to-end flow)

```
Store (/)  ──POST /api/chat──┐                       ┌── Gateway /v1/responses  (intelligent routing: Kimi ↔ Opus)
                             ├── Vite middleware ─────┤
Console ── GET /api/events ──┘   (src/server/*,        └── Agent Handler /search/ , /mcp/ , /registered-users/
   (SSE)                          holds all keys)            → Salesforce · Jira · Notion · Confluence (read-only)
```

1. User opens the chat widget (first time) → `POST /api/session/start` → `startSession` looks up the Registered User (RU) by `origin_user_id`; if none, creates one (shared-auth tool pack, so a fresh RU can call tools immediately). Emits `login → ru_lookup → ru_create`(or `ru_exists`).
2. User sends a message → `POST /api/chat` → `runTurn` (the agentic loop, ported 1:1 from the Python `AH + Gateway` project):
   `searchTools` (AH `/search/`) → `gateway.chat` (no `model` field, so the Gateway **project's** intelligent routing picks the model) → if `tool_use`, `callTool` (AH `/mcp/` JSON-RPC) → loop → final text.
3. Every step emits a structured `AgentEvent` to an in-memory `bus`. The console subscribes via SSE (`GET /api/events`) and renders the trace live.
4. **Reset button** (console) deletes Richard's RU + clears the event log so the create path can be demoed again.

**All Merge keys live server-side only** (read via `loadEnv` in `vite.config.ts`, used only under `src/server/`). Nothing key-related is `VITE_`-prefixed; nothing secret reaches the browser bundle. Do not break this.

## Run / test / type-check

```bash
npm install
cp .env.example .env     # fill GATEWAY_API_KEY, AH_API_KEY, PROJECT_ID, TOOL_PACK_ID (DEMO_* have defaults)
npm run dev              # store at http://localhost:5173/ , console at http://localhost:5173/console
npm run test             # Vitest (32 tests) — mocks the HTTP layer, needs no keys
npx tsc --noEmit         # TYPE-CHECK GATE — use this, NOT `tsc -b`
```

The console must be opened in a **separate window** from the store; they sync through the backend event bus (one active demo session).

## File map

```
vite.config.ts            # registers the /api middleware via createApiPlugin(env); loadEnv keeps keys server-side
tsconfig.json             # SINGLE non-composite project, noEmit:true (see Gotchas — do not re-add composite)
src/
  App.tsx                 # path switch: /console → ConsolePage, else StorePage
  lib/
    events.ts             # AgentEvent + SessionInfo types, isAgentEvent guard, useEventStream() SSE hook
    api.ts                # client fetch wrappers: startSession, sendChat, resetDemo
  pages/
    StorePage.tsx         # store assembly (nav + locations + chat widget)
    ConsolePage.tsx       # console assembly; auto-follows newest event, Reset button
  components/store/        AcmeNav · AcmeLocations · ChatWidget (bubble→panel; starts the session on first open)
  components/console/      StatusBar (deriveStatus) · EventList (color by source, auto-scroll) · EventInspector (JSON)
  server/                 # Node, runs in Vite middleware — THE ONLY PLACE WITH KEYS
    routes.ts             # /api/chat, /api/events (SSE), /api/session/start, /api/reset; holds the single Session
    session.ts            # createSession, runTurn (agentic loop), startSession, resetSession
    gateway.ts            # Gateway client (port of gateway.py)
    agentHandler.ts       # searchTools, callTool, listRegisteredUsers, createRegisteredUser, deleteRegisteredUser
    dlp.ts                # detectRedactions (SSN + redaction markers)
    eventBus.ts           # in-memory pub/sub + log; clear() is LOG-ONLY (keeps SSE subscribers alive across reset)
    systemPrompt.md       # the agent's system prompt — editable, shown on stage
docs/superpowers/specs/2026-06-01-vhol-demo-design.md   # authoritative design spec
docs/superpowers/plans/2026-06-01-vhol-demo.md          # the implementation plan (19 TDD tasks)
```

## Event model

`AgentEvent = { id, ts, source, kind, summary, detail? }`
- `source`: `identity | gateway | agent_handler | dlp | response | error` (drives the console row color)
- `kind`: `login | ru_lookup | ru_create | ru_exists | tool_search | route | tool_call | tool_result | redaction | message | error`
- The console's `StatusBar.deriveStatus` reads `ru_create.detail.response.id`, `ru_exists.detail.registeredUser.id`, and `route.detail.{model,usage}`. If you change a `detail` shape in `session.ts`, update `deriveStatus` too.

## Conventions & gotchas

- **Type-check with `npx tsc --noEmit`, never `tsc -b`.** This is a single non-composite `noEmit` project (mirrors the `ACT_DemoLink` sibling). An earlier `composite + include: src/**` setup emitted `.js`/`.d.ts` into `src/` and made Vitest run every test twice — do NOT reintroduce `composite` or a `tsconfig.node.json`. There must be **zero `.js`/`.d.ts` files under `src/`**.
- **Keys are server-side only.** Never reference Merge keys from `src/lib`, `src/pages`, `src/components`, or use `VITE_`/`import.meta.env` for them.
- **`bus.clear()` is log-only** by design — it must not drop the console's live SSE subscription, or the console goes dark after a reset.
- The orchestrator has a `MAX_TURNS = 10` cap and guards against empty Gateway output / empty final responses.
- TDD: every backend module + the loop has Vitest tests that mock `fetch`. Keep that pattern; tests must stay green and key-free.
- Built and pushed directly on `main` (no feature branches) — solo demo repo at `matthew-merge/VHOL-Demo`.

## Open items (verify on first live run — need real keys + connectors)

1. **DLP redaction shape** — confirm how Agent Handler surfaces a redaction in the `/mcp/` response and that `src/server/dlp.ts` detects it; adjust `REDACTION_MARKERS` if the real shape differs.
2. ~~**RU delete endpoint**~~ ✅ RESOLVED (2026-06-03). `DELETE /api/v1/registered-users/{id}/` works (verified live: create→delete→gone). Two real bugs fixed: (a) **the AH key creates `is_test=true` RUs, but the list endpoint defaults to `is_test=false`** — `listRegisteredUsers` now appends `is_test=true` or the lookup is blind to our own RUs; (b) `resetSession` now deletes by **API lookup on `origin_user_id`** (source of truth), not just the in-memory `session.ruId`, so a dev-server restart no longer orphans the RU. NOTE: `is_test=true` is hardcoded — if the demo ever runs on a *production* AH key, the lookup must flip to `is_test=false`.

## Related local projects (not in this repo)

- `~/Desktop/AH + Gateway` — the original Python terminal chatbot the loop was ported from.
- `~/Desktop/ACT_DemoLink` — the Vite + React + Tailwind + server-middleware pattern this app mirrors.
