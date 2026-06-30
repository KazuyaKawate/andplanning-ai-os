# AIOS — Architecture

## Repository Root

```
andplanning-ai-os/
├── backend/          FastAPI + SQLAlchemy async + SQLite
├── website/          Next.js 16 App Router (TypeScript)
├── AIOS_MEMORY/      This knowledge base
├── nginx.conf        HTTPS, security headers
├── DEPLOYMENT.md
└── .github/workflows/ci.yml
```

## Backend Structure

```
backend/app/
├── main.py           FastAPI entry point, lifespan, CORS, rate limiting
├── models.py         25 SQLAlchemy ORM tables
├── schemas.py        Pydantic request/response schemas
├── auth.py           get_current_user, require_admin (JWT helpers)
├── database.py       AsyncEngine, AsyncSessionLocal, get_db
├── migrations.py     32 CREATE INDEX IF NOT EXISTS (auto-run at startup)
├── config.py         Settings (origins, env vars)
├── notify.py         push_notification() helper
├── seed.py           Initial data seeding
├── routers/          18 routers (see Router System below)
└── services/         9 services (see Service System below)
```

## Router System (18 routers)

| Router        | Prefix             | Auth Required     |
|---------------|--------------------|-------------------|
| auth          | /api/auth          | partial           |
| notifications | /api/notifications | login             |
| health        | /api/health        | public            |
| evolution     | /api/evolution     | POST → login      |
| knowledge     | /api/knowledge     | GET public, POST→login |
| chat          | /api/chat          | public read       |
| dashboard     | /api/dashboard     | public read       |
| factories     | /api/factories     | public read       |
| workflows     | /api/workflows     | public read       |
| runs          | /api/runs          | public read       |
| activity      | /api/activity      | public read       |
| memory        | /api/memory        | public read       |
| settings      | /api/settings      | PATCH → admin     |
| models_api    | /api/models        | public read       |
| chat_history  | /api/chat-sessions | login             |
| agents        | /api/agents        | login             |
| dev           | /api/dev           | login/admin       |
| debug         | /api/debug         | login             |
| team          | /api/team          | login             |

## Service System (9 services)

- `anthropic_svc` — Claude API integration
- `openai_svc` — OpenAI API integration
- `gemini_svc` — Google Gemini integration
- `ollama_svc` — Local Ollama LLM
- `ai_router` — resolve_model(), route_input_db(), route_input_llm()
- `retry` — stream_with_fallback() (Claude→OpenAI→Gemini→Ollama)
- `agent_executor` — run agent tasks with fallback chain
- `project_scanner` — static file analysis, scan_project(), build_project_summary()
- `knowledge_loader` — read AIOS_MEMORY files, return structured context for AI agents

## DB Models (25 tables)

Core: Factory, Workflow, WorkflowRun, ActivityItem, MemoryEntry, OsSettingsRow
Chat: ChatSession, ChatMessageRow
Agents: VirtualAgent, AgentExecution, AgentPromptHistory
Dev: DevPatch, DevHistory
Debug: DebugSession
Team: AgentTask, TeamSession, AgentMessage
Auth: User, Notification
Evolution: ProjectHealthSnapshot, LessonsLearned, ImprovementSuggestion,
           EvolutionReport, QualitySnapshot, ArchitectureAnalysis

## Frontend Structure

```
website/
├── app/
│   ├── os/                   OS shell (16 pages)
│   │   ├── layout.tsx        OsSidebar + OsTopBar
│   │   ├── dashboard/        Metrics, agent status, activity
│   │   ├── workflows/        Workflow list + [id] execution
│   │   ├── factories/        Factory list + [id] detail (5 tabs)
│   │   ├── agents/           Agent management
│   │   ├── memory/           Memory entries
│   │   ├── dev/              Virtual Claude Dev chat + patch flow
│   │   ├── debug/            AI Debugger
│   │   ├── workspace/        Workspace view
│   │   ├── team/             Team task management
│   │   ├── collaborate/      AI Team Collaboration (SSE)
│   │   ├── evolution/        Self-Evolution (6 tabs)
│   │   ├── knowledge/        Knowledge Base dashboard (this phase)
│   │   └── settings/         API keys, Claude Mode, agents table
│   └── login/
├── components/os/
│   ├── OsSidebar.tsx         Navigation (13 items after knowledge added)
│   └── OsTopBar.tsx          User display, logout
├── lib/
│   ├── auth.ts               getToken, authHeaders, apiLogin, apiRegister
│   └── mock/index.ts         (legacy mock data, prefer real API)
└── types/index.ts            Global TypeScript types
```

## Factory System

Each Factory is a named collection of Workflows.
Workflows are sequences of AI steps that an agent executes.
Runs are tracked with cost_usd, status, and output per step.

## Workflow System

WorkflowRun → steps executed sequentially.
Each step: prompt template → AI call via ai_router → output stored in context.
SSE streaming: server pushes chunks as `data: {"type":"chunk","text":"..."}` events.

## Agent System

VirtualAgent table stores agents with: name, role, system_prompt, routing_keywords (JSON),
category, priority, version, is_enabled.
Routing: keyword scoring from DB → LLM routing fallback.
1000+ agent scalable (no code change needed to add agents).

## Memory System

MemoryEntry table: key, value, agent_id, factory_id, metadata (JSON).
project_scanner reads the actual file system for live stats.
knowledge_loader reads AIOS_MEMORY/ for structured historical knowledge.

## Team System

TeamSession + AgentMessage: multi-agent SSE collaboration.
/api/team/collaborate streams each agent's contribution in real time.

## Debug System

DebugSession: analyze code issues, generate patches, track status.
/api/debug/analyze → AI analysis (SSE).

## Evolution System

ProjectHealthSnapshot: files, lines, endpoints, models, completeness score.
ImprovementSuggestion: category, title, description, priority, status.
QualitySnapshot: TypeScript errors, Python errors, build status.
ArchitectureAnalysis: AI-generated architecture review.
LessonsLearned: trigger, lesson, prevention, severity.
EvolutionReport: full CEO-grade executive report (Markdown).

## Security

- JWT_SECRET_KEY: 64-char hex in .env (never committed)
- API key masking: sk-ant***1234 format via _mask_key()
- PROTECTED_FILES set: blocks overwrite of core files
- nginx: HTTPS forced, HSTS, X-Frame-Options DENY, CSP
- Rate limit: 200 req/min (slowapi)
