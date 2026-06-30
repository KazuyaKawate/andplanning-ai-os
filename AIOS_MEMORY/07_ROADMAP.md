# AIOS — Roadmap

## Current Milestone (2026-06-30)

**Business Engine Phase 1 — Organization Layer**
- Organization / OrganizationMember / OrganizationInvite DBモデル追加 ✅
- User.org_id (primary org, soft ref) ✅
- migrations.py — ALTER TABLE + 10 indexes ✅
- /api/orgs/* 13エンドポイント (CRUD + Members + Invites) ✅
- /os/orgs ページ (組織一覧・作成・メンバー管理・招待) ✅
- TypeScript types追加 ✅

**Knowledge Base & Memory Foundation (Phase 6)**
- AIOS_MEMORY/ directory with 7 structured knowledge files ✅
- knowledge_loader service ✅
- /api/knowledge/* endpoints ✅
- /os/knowledge dashboard page ✅
- AI agents auto-load knowledge context ✅

## Production Readiness

| Area                     | Status      | Notes                                      |
|--------------------------|-------------|--------------------------------------------|
| Backend API              | ✅ 95%      | 92 endpoints, auth, rate limit             |
| Frontend UI              | ✅ 90%      | 16+ pages, all connected to real API       |
| Authentication           | ✅ Done     | JWT, bcrypt, admin roles                   |
| Security                 | ✅ Done     | nginx, masking, PROTECTED_FILES            |
| Self-Evolution Engine    | ✅ Done     | Scanner, suggestions, lessons, CEO report  |
| Knowledge Base           | ✅ Done     | Phase 6 complete                           |
| Database                 | ⚠️ 80%     | SQLite OK for demo; swap to PostgreSQL     |
| Testing                  | ⚠️ 60%     | CI checks exist; unit tests needed          |
| Error monitoring         | ⚠️ 50%     | Sentry/Datadog not integrated              |
| Horizontal scaling       | ❌ Pending  | Single-process; needs Redis + workers      |

## Business Readiness

| Area                     | Status      | Notes                                      |
|--------------------------|-------------|--------------------------------------------|
| Organization / Multi-tenant | ✅ Phase 1  | Org + Member + Invite + 13 API endpoints   |
| Marketplace              | ❌ Planned  | Phase 2 target                             |
| Billing / Stripe         | ❌ Planned  | Phase 2 target                             |
| Revenue Dashboard        | ❌ Planned  | Phase 3 target                             |
| Creator revenue share    | ❌ Planned  | Phase 9 target                             |
| Public SaaS launch       | ❌ Planned  | Phase 10 target                            |

## Investor Readiness

| Requirement              | Status      | Notes                                      |
|--------------------------|-------------|--------------------------------------------|
| Working demo             | ✅ Yes      | All core flows functional                  |
| Self-improving AI        | ✅ Yes      | Evolution engine live                      |
| Traction metrics         | ⚠️ Limited | Internal use only; no external users yet   |
| Revenue                  | ❌ None     | Pre-revenue; need billing system           |
| Team                     | ⚠️ Solo    | Need co-founder or key hire                |
| IP / moat                | ⚠️ Partial | Architecture and agent system are novel    |

## Next Recommended Phase (Phase 7 — Marketplace Foundation)

1. **Organization model** — multi-tenant DB layer (Organization, OrgMember tables)
2. **Agent publishing** — upload .apagent ZIP → marketplace listing
3. **Stripe integration** — subscription billing, usage metering
4. **Token wallet** — pre-purchase credits, deduct per run
5. **Public agent store** — browse, preview, purchase agents
6. **Creator dashboard** — earnings, downloads, reviews

## Remaining Priorities (Priority Order)

1. PostgreSQL migration (production-critical)
2. Unit test coverage (CI quality gate)
3. Error monitoring (Sentry)
4. Organization / multi-tenant layer
5. Stripe billing integration
6. Public marketplace UI
7. Revenue dashboard
8. Horizontal scaling (Redis + Celery workers)
9. Mobile-responsive OS UI
10. Public beta launch

## Phase History

- Phase 1: Foundation (2026-06-28)
- Phase 2: Production Readiness (2026-06-29)
- Phase 3: Security & Infrastructure (2026-06-29)
- Phase 4a: Team Collaboration Fix (2026-06-29)
- Phase 4b: VirtualAgent Routing (2026-06-29)
- Phase 5: Self-Evolution Engine (2026-06-30)
- Phase 5b: Dev Chat Auth Fix (2026-06-30)
- Phase 6: Knowledge Base & Memory Foundation (2026-06-30)

---
<!-- ROADMAP IS AUTO-UPDATED — append changes below, never overwrite above -->
