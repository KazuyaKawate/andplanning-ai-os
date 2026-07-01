# Project Analysis

Date: 2026-07-01

## Executive Summary

This repository is an AI OS product with a FastAPI backend, a Next.js OS/dashboard frontend, a public marketing website, deployment assets, and an `AIOS_MEMORY/` knowledge base used by embedded AI agents.

The actual architecture has moved beyond the older top-level `ARCHITECTURE.md`. The current implementation is not the documented `src/` + JSON + Streamlit system; it is a FastAPI + SQLAlchemy async + SQLite backend and a Next.js 16 App Router frontend. `AIOS_MEMORY/02_ARCHITECTURE.md` is closer to the current code, but it is also partly stale, especially around auth coverage and model/table counts.

Overall state:

- Backend: broad monolithic FastAPI app with many working CRUD and AI endpoints.
- Frontend: large OS UI connected through a typed API adapter plus some direct `fetch` calls.
- Critical gap: authentication and authorization are inconsistent across backend routers and frontend requests.
- Critical gap: frontend does not currently pass TypeScript or lint checks.
- Production gap: SQLite, background tasks, and in-process AI streaming are acceptable for demos but weak for multi-user SaaS.

## Major Modules And Communication

### Top-Level Runtime

- `docker-compose.yml` runs three services: backend, frontend, and nginx.
- `nginx.conf` routes `/api/` and `/health` to FastAPI and everything else to Next.js.
- Backend starts from `backend/app/main.py`, creates DB tables, runs lightweight migrations, seeds data, registers routers, mounts `/uploads`, and exposes `/health`.
- Frontend starts from `website/app/layout.tsx`; OS pages live under `website/app/os`.

Communication:

- Browser -> Next.js client components -> `website/lib/api/adapters/rest.ts` or direct `fetch`.
- REST/SSE -> FastAPI routers under `/api`.
- Backend -> SQLite via SQLAlchemy async.
- Backend -> OpenAI, Anthropic, Gemini, or Ollama through service wrappers.

### Backend Core

- `backend/app/config.py`: Pydantic settings from `.env`.
- `backend/app/database.py`: async SQLAlchemy engine/session.
- `backend/app/models.py`: core ORM tables for factories, workflows, runs, memory, chat, agents, dev patches, debug sessions, teams, auth, orgs, executor, and Business Engine CRM tables.
- `backend/app/biz_models.py`: marketplace, pricing, purchases, subscriptions, assets, revenue, and knowledge graph models.
- `backend/app/schemas.py` and `backend/app/biz_schemas.py`: Pydantic API contracts.
- `backend/app/migrations.py`: startup `ALTER TABLE` and `CREATE INDEX IF NOT EXISTS`.
- `backend/app/seed.py` and `backend/app/biz_seed.py`: initial factories, workflows, agents, settings, sample data, licenses, and pricing plans.

### Backend Routers

- Auth: `/api/auth/*` handles registration, login, current user, logout, and admin user activation.
- Core OS: dashboard, factories, workflows, runs, activity, memory, settings, models.
- Chat: provider-specific chat endpoints plus unified chat.
- Chat history: persisted sessions and messages.
- Agents: virtual agent CRUD, routing, test, run, and history.
- Dev: project file tree, file inspection, AI-generated plans/patches, patch apply/reject.
- Debug: error analysis and debug patch generation.
- Team: virtual team tasks, sessions, messages, improve/collaborate flows.
- Evolution: project scanning, suggestions, quality snapshots, architecture analysis, lessons, roadmap, reports.
- Knowledge: reads and appends to `AIOS_MEMORY`.
- Orgs: organizations, members, invites.
- Business Engine: CRM clients, deals, tasks, workflow templates.
- Business Knowledge Base: assets, licenses, marketplace, pricing, library, revenue, knowledge graph.
- Executor: AIOS development executor and business task runner.

### Backend Services

- `ai_router.py`: maps factories/models to providers and estimates token cost.
- `retry.py`: collects streamed provider output and falls back across providers.
- `openai_svc.py`, `anthropic_svc.py`, `gemini_svc.py`, `ollama_svc.py`: provider-specific SSE streamers.
- `agent_executor.py`: virtual agent model selection, memory context, routing, sync/stream execution.
- `executor_engine.py`: shared executor prompt, patch parser, safe path helpers, lightweight test checks, report generator.
- `business_executor.py`: builds CRM context and business task prompts.
- `knowledge_loader.py`: loads `AIOS_MEMORY` files and appends changelog/lesson entries.
- `project_scanner.py`: static project metrics for evolution features.
- `services/storage/*`: local storage implemented; S3/R2 are stubs.
- `services/payment/*`: mock provider implemented; Stripe provider is partial/future.

### Frontend

- `website/app/page.tsx` and `website/sections/*`: public marketing site.
- `website/app/os/*`: authenticated OS pages for dashboard, workflows, factories, business, debug, dev, team, executor, marketplace, orgs, settings, etc.
- `website/components/os/*`: OS shell, sidebar, topbar, auth guard, metric/status components.
- `website/lib/api/runtime.ts`: chooses mock or REST adapter.
- `website/lib/api/adapters/rest.ts`: typed REST adapter.
- `website/lib/api/adapters/mock.ts`: legacy mock implementation.
- `website/lib/auth.ts`: localStorage JWT helpers and direct auth calls.
- `website/types/index.ts`: global frontend domain types.

## Unfinished Or Incomplete Features

1. Marketplace and billing are only partially implemented. Data models and endpoints exist, but real Stripe/payment flows, purchase lifecycle, refunds, webhooks, licensing enforcement, and marketplace publishing workflows are not complete.
2. Storage providers for S3 and R2 are stubs; local uploads are the only real provider.
3. Business Engine is split between CRM CRUD and AI task execution, but ownership/auth/multitenancy is missing.
4. Executor tests are only lightweight syntax/brace checks, not real project tests.
5. Several OS pages are new/unfinished and fail lint or TypeScript.
6. `ARCHITECTURE.md`, `README.md`, and `ROADMAP.md` describe older architecture and progress.
7. The API secret setting exists but is not actually enforced as backend-wide access control.
8. Horizontal scaling is not implemented: no queue, workers, Redis, job locks, or distributed state.
9. SQLite remains the production DB target in compose, despite roadmap calling PostgreSQL production-critical.
10. `uploads/`, SQLite DB files, and log files are present in the working tree, which should be reviewed for repository hygiene.

## Duplicated Code

1. Patch parsing and safety rules are duplicated in `routers/dev.py`, `routers/debug.py`, and `services/executor_engine.py`.
2. `_get_cfg` / settings fallback logic appears in multiple routers and should be centralized.
3. Business task claim/run logic exists in both `routers/business.py` and `routers/executor.py`.
4. Project-root safe path logic is duplicated between dev/debug/executor modules.
5. Frontend data fetching mixes `api` adapter calls and direct `fetch` calls with hand-built auth headers.
6. Pydantic and TypeScript types are manually mirrored, which is already drifting.
7. Business/marketplace concepts are split across `models.py`, `biz_models.py`, `business/`, `routers/business.py`, and `routers/biz_*`.

## Possible Bugs

Priority bugs found:

1. Frontend TypeScript fails: `website/app/os/affiliates/page.tsx` uses `icon_type`, which does not exist in `Resource`.
2. Frontend lint fails with 17 errors, mostly `react-hooks/set-state-in-effect`, plus explicit `any` errors in orgs.
3. `website/lib/api/adapters/rest.ts` sends only `NEXT_PUBLIC_API_KEY`, not the logged-in `localStorage` JWT. Many protected API calls through the adapter will return 401/403 after login.
4. Business REST adapter paths use `/api/clients`, `/api/deals`, `/api/tasks`, and `/api/workflows/start`, but backend business routes are mounted as `/api/business/clients`, `/api/business/deals`, `/api/business/tasks`, and `/api/business/workflows/start`.
5. Business list endpoints ignore filters sent by the frontend (`client_id`, `deal_id`, `status`), so even if paths are fixed the UI will show unfiltered data.
6. `/api/tasks/claim-next` and `/api/business-tasks/run-next` are also exposed from `executor.py` without auth dependencies.
7. Agent routes appear unauthenticated despite docs saying login is required; agent details expose full `systemPrompt`.
8. Workflow run pause/resume can flip DB status, but `_execute_run` does not truly pause/resume an already running provider stream.
9. `stream_with_fallback` buffers complete provider output before replaying it, so many endpoints are not truly live streaming despite using SSE.
10. `WorkflowRun.success_rate` update can undercount the just-completed run because completed rows are queried before commit/flush.

## Security Issues

Critical/high:

1. Many sensitive routers lack auth. Examples include agents CRUD/detail/run, runs start/stop, chat, dashboard/core data reads, business CRM CRUD, business task claim, settings GET, dev history/patch list, and debug history/logs.
2. `GET /api/agents/{agent_id}` returns full system prompts without auth.
3. Business CRM endpoints expose and mutate client/deal/task data without auth.
4. Default JWT secret fallback is hardcoded. Production docs instruct setting a secret, but the app will still run insecurely if omitted.
5. JWTs are stored in `localStorage`, increasing XSS blast radius.
6. Dev/executor patch-apply capabilities write to disk. Admin is required for apply, but patch generation and patch lists expose sensitive code context to any logged-in user, and some dev read endpoints are public.
7. `/uploads` is publicly mounted. Upload validation is handled in asset routes, but serving is broad and should be reviewed for content-type and access policy.
8. API keys are stored in the DB, masked on read, but encryption-at-rest is not implemented.
9. `NEXT_PUBLIC_API_KEY` is documented as a bearer token but any `NEXT_PUBLIC_*` value is public in the browser bundle.
10. CORS defaults are localhost-only, but production security relies entirely on correct `.env`.

## Performance Bottlenecks

1. SQLite will bottleneck under concurrent writes from runs, chat sessions, teams, executor tasks, marketplace, and CRM.
2. AI streaming fallback buffers all output before returning to clients, increasing latency and memory use.
3. Long AI jobs run inside FastAPI/background task process rather than a durable worker queue.
4. Project scanning and file reads happen synchronously in request paths for evolution/dev features.
5. Dashboard/stat endpoints perform repeated aggregate queries without caching.
6. Startup seeding/upserts are large and run on every app startup.
7. Frontend pages often fetch serially and then trigger more fetches from selection effects.
8. Some pages use direct browser-side heavy state and large lists without pagination or virtualization.

## Verification Results

Commands run:

- `python -m compileall app` from `backend`: passed.
- `npm run lint` from `website`: failed with 17 errors and 14 warnings.
- `npx tsc --noEmit` from `website`: failed with `icon_type` type mismatch in `app/os/affiliates/page.tsx`.

## Prioritized Roadmap

### P0: Stabilize Security And Build Health

1. Define a route auth matrix and apply `get_current_user` / `require_admin` consistently.
2. Fix the REST adapter to send the logged-in JWT, not `NEXT_PUBLIC_API_KEY`.
3. Fix Business Engine path mismatch and query filtering.
4. Remove hardcoded JWT secret fallback in production mode.
5. Fix TypeScript and lint failures so CI can block regressions.
6. Lock down agent detail/system prompt endpoints.

### P1: Consolidate Architecture

1. Update `ARCHITECTURE.md`, `README.md`, and `ROADMAP.md` to match FastAPI/Next.js/SQLite reality.
2. Centralize patch parsing, safe path checks, provider config lookup, and SSE parsing.
3. Split monolithic models into clearer bounded modules or at least document ownership.
4. Generate OpenAPI-derived TypeScript types or add contract tests to stop schema drift.

### P2: Production Readiness

1. Move from SQLite to PostgreSQL with Alembic migrations.
2. Move long-running AI work to a durable queue/worker system.
3. Add real integration tests for auth, business CRUD, agent execution, patch workflow, and marketplace flows.
4. Add error monitoring and structured request/job logging.
5. Add encryption-at-rest for provider API keys or migrate secrets to a secrets manager.

### P3: Product Completion

1. Complete marketplace publishing, purchase, license enforcement, and creator revenue flows.
2. Complete Stripe provider and webhook handling.
3. Complete S3/R2 storage providers.
4. Add tenant scoping to organizations, CRM data, assets, purchases, agents, workflows, and memory.
5. Improve OS frontend data loading, pagination, and mobile behavior.

