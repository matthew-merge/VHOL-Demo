# VHOL Demo — Design Spec

**Date:** 2026-06-01
**Status:** Approved (design)
**Author:** Matt (with Claude)

## Purpose

An interactive, presenter-driven demo that shows how an engineer can use **Merge Agent Handler** and **Merge Gateway** to build a production-ready, **external** (customer-facing) support agent embedded in their product.

The demo product is **Acme Co**, an e-commerce platform (a Shopify analog). The agent helps **Richard**, a merchant using Acme Co, by answering support questions. It routes prompts through Gateway by complexity and searches Acme Co's own systems (Salesforce, Jira, Notion, Confluence) through Agent Handler for the context needed to answer.

The agent is **external**: it is used by Acme Co's customers, not Acme Co's employees. Tool execution uses Acme Co's own credentials (shared auth); each customer is represented by a per-user Registered User (RU) for identity and governance.

## Goals

- Demonstrate a credible, production-shaped agent built on Gateway + Agent Handler, running **fully live** against real Merge APIs.
- Make the agent's internal behavior legible to an audience: routing decisions, tool calls and results, the RU lifecycle, and DLP.
- Be easy to operate on stage: drop in a Gateway `PROJECT_ID` and an AH `TOOL_PACK_ID` (built live during the talk) and run.

## Non-goals

- No replay/scripted/mocked demo path. The happy path is 100% real API calls (failures are rendered gracefully, not crashed). Reliability comes from rehearsal and pre-staging, not from faking calls.
- The monitoring console is explicitly **demo-only** ("the brain behind the scenes"), not a shipped product surface.
- No per-customer OAuth. Tool auth is shared at the tool-pack level (see Auth Model).

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Live vs scripted | **Fully live** | Authentic; pre-staged + rehearsed. Failures shown, not crashed. |
| Stack | **All-TypeScript**, single Vite + React + TS app | One repo / one `npm run dev`; orchestrator shows cleanly in code on stage; native SSE; mirrors existing `ACT_DemoLink`. |
| Console layout | **Devtools-style** (timeline + inspector) | Compact event list left; full request/response JSON right. Inspector auto-follows newest event; click to pin a past one. |
| Chat widget | **Bubble → panel** | Floating bubble bottom-right that expands to a chat panel; matches "widget in the corner." |
| Auth model | **Shared auth** tool pack | Tool execution uses Acme Co's own credentials, so a freshly created RU calls tools immediately — which makes the live "no RU → create RU" beat work. |

## Architecture

Single Vite + React + TS app (pattern from `ACT_DemoLink`). Two browser views of one agent, synced through a backend event bus (one active demo session at a time).

```
Store view ──POST /api/chat──┐                  ┌── Gateway  /v1/responses  (routing: Kimi ↔ Opus 4.7)
                             ├─ Vite middleware ─┤
Console view ─GET /api/events┘   (orchestrator,  └── Agent Handler  /search/ , /mcp/ , /registered-users/
   (SSE)                          secrets, bus)        → Salesforce · Jira · Notion · Confluence (read-only)
```

- **Store view** (`/`): Acme Co admin page (Locations content from the reference screenshot, rebranded) + chat widget. What a customer sees.
- **Console view** (`/console`): devtools-style monitor. Demo-only.
- **Backend**: Vite dev-server middleware (Node). Holds all Merge keys via `loadEnv` (never `VITE_`-prefixed, so nothing secret reaches the browser), runs the orchestrator, and owns the event bus.

### Components & boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `server/gateway.ts` | POST Gateway `/v1/responses`; return parsed response | env: `GATEWAY_API_KEY`, `PROJECT_ID` |
| `server/agentHandler.ts` | `searchTools` (`/search/` → Gateway tool format), `callTool` (`/mcp/` JSON-RPC), RU `list`/`create`/`delete` | env: `AH_API_KEY`, `TOOL_PACK_ID` |
| `server/orchestrator.ts` | The agentic loop; emits an `AgentEvent` at each step | gateway, agentHandler, eventBus, systemPrompt.md |
| `server/eventBus.ts` | In-memory pub/sub + SSE fan-out for the demo session | — |
| `server/routes.ts` | `/api/chat`, `/api/events`, `/api/session/start`, `/api/reset` | orchestrator, eventBus, agentHandler |
| `lib/events.ts` | `AgentEvent` type + client SSE hook | — |
| `components/store/*` | `AcmeNav`, `AcmeLocations`, `ChatWidget` (bubble + panel) | api, events |
| `components/console/*` | `StatusBar`, `EventList`, `EventInspector` | events |

## The agentic loop

A 1:1 port of the existing Python (`main.py` / `gateway.py` / `agent_handler.py`). Per user turn:

1. `searchTools(message)` → AH `/search/`, convert results to Gateway tool format → emit `tool_search` event.
2. `gateway.chat(history, tools)` → POST `/v1/responses` with `{input: history, tools, tool_choice: "auto", project_id}` and **no `model` field**, so the project's intelligent routing picks the model. The response's returned model → emit `route` event.
3. If `finish_reason === "tool_use"`: for each `tool_use`, `callTool(name, input)` via AH `/mcp/` → emit `tool_call` (with arguments) and `tool_result` events; append the tool result to history; loop.
4. Else return the final assistant text → emit `response` event.

Routing is configured **in the Gateway project** (intelligent routing between a cheap model — Kimi — and a complex model — Opus 4.7). The orchestrator does not pin a model; it displays whatever Gateway returns.

## Event model

```ts
type AgentEvent = {
  id: string;
  ts: number;
  source: 'identity' | 'gateway' | 'agent_handler' | 'dlp' | 'response' | 'error';
  kind: string;        // ru_lookup | ru_create | route | tool_search | tool_call | tool_result | redaction | message
  summary: string;     // one-line label for the console's left list
  detail?: unknown;    // full request/response JSON for the inspector
};
```

Console rendering (layout C):
- Left list: `source` color + `summary`, newest at bottom, auto-scrolls.
- Inspector (right): shows the selected event's `detail` as formatted JSON. **Auto-follows the newest event**; clicking a past row pins it for inspection.
- Status bar (pinned top): RU status · current model · turn # · cumulative cost/tokens.

Source colors: identity = purple, agent_handler = green, gateway = orange, dlp = red, response = blue.

## RU lifecycle + reset

**Auth model.** The tool pack uses shared auth: tool execution uses Acme Co's own credentials to Salesforce/Jira/Notion/Confluence. The RU is the customer's scoped identity (for logging/governance) under the Acme Co `shared_credential_group`; it does **not** require per-user OAuth, so a new RU can call tools immediately.

**Identity.** The store view supplies a mock logged-in user from config: `origin_user_id` (e.g. `richard@acme.co`), name `Richard`, company `Acme Co`. This represents client-side info about the logged-in user.

**On session start** (store view load), backend `POST /api/session/start`:
1. `GET https://ah-api.merge.dev/api/v1/registered-users/?origin_user_id=<origin_user_id>` (Bearer `AH_API_KEY`) → emit `ru_lookup` event with the response.
2. If no result: `POST https://ah-api.merge.dev/api/v1/registered-users/` with body:
   ```json
   {
     "id": "<generated-uuid>",
     "origin_user_id": "richard@acme.co",
     "origin_user_name": "Richard",
     "shared_credential_group": { "origin_company_id": "acme-co", "origin_company_name": "Acme Co" },
     "user_type": "HUMAN"
   }
   ```
   → emit `ru_create` event. (`id` is required in the create body; we generate a UUID.)
3. The RU `id` (returned/created) is used as the `registered_user_id` segment in the AH `/mcp/` and `/search/` URLs for subsequent tool calls.

**Reset button** (console): deletes Richard's RU and clears the event log so the next load re-shows the create path. The delete endpoint path is verified against the live API during implementation; fallback if delete is unavailable is to rotate the `origin_user_id` suffix so the lookup returns empty and re-triggers create.

## Configuration

`.env` (server-side only; `.env.example` committed):

```
GATEWAY_API_KEY=        # Gateway bearer
AH_API_KEY=             # Agent Handler org-level bearer (used for RU management AND tool execution)
PROJECT_ID=             # Gateway project (intelligent routing configured) — pasted in on stage
TOOL_PACK_ID=           # AH tool pack (shared auth) — pasted in on stage
DEMO_USER_ORIGIN_ID=richard@acme.co
DEMO_USER_NAME=Richard
DEMO_COMPANY_NAME=Acme Co
DEMO_COMPANY_ID=acme-co
```

`src/server/systemPrompt.md` holds the agent's system prompt as a markdown file — supports the brief's step 5 ("show system vs user prompts; a markdown file in the scaffolding").

## File layout

```
VHOL_demo/
  .env.example
  package.json  vite.config.ts  tsconfig.json  index.html
  README.md
  docs/superpowers/specs/2026-06-01-vhol-demo-design.md
  src/
    main.tsx  App.tsx                      # router: / (store), /console
    index.css
    pages/        StorePage.tsx  ConsolePage.tsx
    components/store/    AcmeNav.tsx  AcmeLocations.tsx  ChatWidget.tsx
    components/console/  StatusBar.tsx  EventList.tsx  EventInspector.tsx
    lib/          events.ts  api.ts
    server/       orchestrator.ts  gateway.ts  agentHandler.ts  eventBus.ts  routes.ts  systemPrompt.md
```

## Build order

1. **Scaffold** — Vite + React + TS + Tailwind v4, router, `.env` plumbing, Vite middleware skeleton (mirrors `ACT_DemoLink`).
2. **Store screen** — Acme Co admin page (Locations) + chat widget (bubble → panel) against a stub backend that echoes. *(Requested starting point.)*
3. **Backend orchestrator** — port `gateway.ts` + `agentHandler.ts` + the loop; wire `/api/chat`; real Gateway + AH calls.
4. **Event bus + SSE + console** — layout C (timeline + auto-following inspector + status bar).
5. **RU lifecycle + reset** — lookup/create on session start; reset button.
6. **DLP surfacing + polish** — show SSN redaction; routing rationale (if returned); cost/tokens.

## Testing

Vitest + TDD on logic, with the HTTP layer (Gateway / AH) mocked — mirroring the existing Python `tests/`:
- Tool-use branching in the orchestrator loop.
- AH → Gateway tool-format conversion.
- RU lookup → create decision (creates only when lookup is empty).
- Event emission (correct `source`/`kind` per step).

The fully-live end-to-end path is validated by rehearsal against real Merge APIs.

## Connectors

Read-only tools across **Salesforce, Jira, Notion, Confluence**.

## Open items / risks (flagged, not blockers)

- **DLP SSN redaction.** Verify how Agent Handler surfaces a redaction in the `/mcp/` response so the console can render a `dlp/redaction` event. (Brief marked this "NEED TO TEST.")
- **RU delete endpoint.** Verify the path against the live API; fallback is rotating `origin_user_id`.
- **Routing rationale.** The console always shows the chosen model; it shows *why* only if Gateway returns that detail.
- **Two windows.** Store and console open in separate browser windows and sync through the backend event bus (single demo session).
```
