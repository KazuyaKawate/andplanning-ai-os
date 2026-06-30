# AIOS — Changelog

Append new entries at the bottom. Never overwrite existing entries.
Format: `## [YYYY-MM-DD] Phase N — Title`

---

## [2026-06-28] Phase 1 — AI OS Foundation

**Completed:**
- Next.js 16 App Router project setup with OS shell layout
- ConditionalShell in `app/layout.tsx` (hides Header/Footer for /os routes)
- OsSidebar + OsTopBar components
- 5 initial OS pages: dashboard, workflows, factories, agents, settings
- Mock data layer in `lib/mock/index.ts`
- FastAPI backend skeleton with SQLAlchemy async + SQLite
- Initial DB models: Factory, Workflow, WorkflowRun, ActivityItem, MemoryEntry, OsSettingsRow
- VirtualAgent system with 9 built-in agents
- AI fallback chain: Claude → OpenAI → Gemini → Ollama
- stream_with_fallback() SSE streaming service
- Cost tracking (cost_usd per WorkflowRun)

**Key Decisions:**
- Chose App Router over Pages Router for better server component support
- SQLite for fast prototyping (swap to PostgreSQL for production)
- ConditionalShell pattern to avoid forking the layout

---

## [2026-06-29] Phase 2 — Production Readiness Audit

**Completed:**
- API key masking (`_mask_key`, `_is_masked`) — sk-ant***1234 format
- DB indexes: 22 CREATE INDEX IF NOT EXISTS in migrations.py
- JWT authentication system (User model, auth.py, /api/auth/* endpoints)
- Rate limiting via slowapi (200 req/min)
- Structured logging (logging.basicConfig INFO)
- Notification system (Notification model + CRUD)
- Login page (/login)
- Client auth utilities (lib/auth.ts: getToken, authHeaders, apiLogin, apiRegister)
- OsTopBar user display with logout
- Frontend Dockerfile
- nginx.conf (HTTPS, HSTS, X-Frame-Options, CSP)
- docker-compose.yml with frontend + backend + nginx

**Key Decisions:**
- JWT_SECRET_KEY generated as 64-char hex, stored in .env only
- Admin role required for /api/dev/apply and /api/settings PATCH
- Public pages remain accessible without auth (dashboard reads are public)

---

## [2026-06-29] Phase 3 — Security & Infrastructure

**Completed:**
- JWT_SECRET_KEY safely added to .env (never committed)
- Auth enforcement on 10 dangerous endpoints
- Admin role enforcement (apply, settings PATCH)
- Ollama local LLM support (ollama_svc.py)
- AI provider health check endpoint (GET /api/health/providers)
- GitHub Actions CI/CD (.github/workflows/ci.yml)
- Production deployment documentation (DEPLOYMENT.md)
- Docker build configuration (DOCKER_BUILD=1)
- nginx security header completion
- Final production readiness audit → 95% ready

**Key Decisions:**
- Kept SQLite for now (performance acceptable at current scale)
- Ollama as local fallback for air-gapped/cost-sensitive deployments
- CI runs: Python import check + TypeScript compile + Next.js build

---

## [2026-06-29] Phase 4a — AI Team Collaboration Fix

**Completed:**
- Fixed /api/team/collaborate SSE streaming (confirmed=False constructor bug)
- Fixed fallback for None file paths in agent output
- Fixed ---PATCH--- template injection in agent prompts
- Fixed lang="typescript" misdetection for backend-claude agent
- ChatSession + ChatMessageRow DB models
- Chat history endpoints (/api/chat-sessions/*)

---

## [2026-06-29] Phase 4b — VirtualAgent Routing Upgrade

**Completed:**
- Added category, routing_keywords (JSON), priority, version columns to VirtualAgent
- virtual-claude-code agent with 41 routing keywords + Claude Code system prompt
- DB-driven routing (1000-agent scalable, no code changes to add agents)
- route_input_db() + route_input_llm() in ai_router service
- Dashboard Agent Status panel (claudeMode badge, run counts, top agents)

---

## [2026-06-30] Phase 5 — Self-Evolution Engine

**Completed:**
- 6 new DB models: ProjectHealthSnapshot, LessonsLearned, ImprovementSuggestion,
  EvolutionReport, QualitySnapshot, ArchitectureAnalysis
- 15 new endpoints under /api/evolution/*
- project_scanner.py: scan_project(), build_project_summary() static analysis
- /os/evolution page with 6 tabs: Overview / Suggestions / Quality / Architect / Lessons / CEO Report
- OsSidebar Evolution link added

---

## [2026-06-30] Phase 5b — Dev Chat Authentication Fix

**Completed:**
- Fixed 401 errors in /os/dev: added authHeaders() to all fetch/SSE calls
- Fixed React state closure bug: streamBuf returned by value instead of read from state
- 401/403 errors converted to Japanese user-friendly messages
- Login banner displayed when not authenticated
- Dev page hint text unified in Japanese

**Root Causes Fixed:**
- Authorization header missing after auth system was added
- streamBuf closure captured "" at async boundary → "(no response)" bug

---

## [2026-06-30] Phase 6 — Knowledge Base & Memory Foundation

**Completed:**
- Created AIOS_MEMORY/ directory with 7 structured knowledge files
- knowledge_loader.py service: reads files, returns structured context for AI agents
- /api/knowledge/* router (8 GET + 3 POST endpoints)
- /os/knowledge page: project overview, architecture, rules, business, changelog, lessons, roadmap
- OsSidebar Knowledge link added
- AI agent system prompt injection: dev, team, evolution agents now load knowledge context

---
<!-- APPEND NEW ENTRIES BELOW THIS LINE -->
