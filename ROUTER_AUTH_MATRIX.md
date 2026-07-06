# Router Authentication Matrix

This document defines the required authentication levels for all backend routes based on the analysis in `ROUTER_AUTH_ANALYSIS.md`.

## Authentication Levels

- **Public:** No authentication required.
- **User:** Requires a valid user token (`get_current_user`).
- **Admin:** Requires a valid user token with admin privileges (`require_admin`).

## Route Matrix

| Router | Endpoint | Method | Description | Auth Level | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `activity.py` | `/activity` | GET | List activity logs | **Admin** | Sensitive system logs |
| `agents.py` | `/agents` | GET | List agents | **User** | |
| | `/agents` | POST | Create agent | **Admin** | |
| | `/agents/{agent_id}` | PATCH | Update agent | **Admin** | |
| | `/agents/{agent_id}/toggle` | POST | Toggle agent status | **Admin** | |
| `auth.py` | `/auth/login` | POST | User login | **Public** | |
| | `/auth/register` | POST | User registration | **Public** | |
| | `/auth/logout` | POST | User logout | **User** | |
| | `/auth/me` | GET | Get current user | **User** | |
| `biz_assets.py` | `/biz/assets` | GET | List assets | **User** | |
| | `/biz/assets` | POST | Create asset | **User** | |
| | `/biz/assets/{id}` | GET | Get asset | **User** | |
| | `/biz/assets/{id}` | PUT | Update asset | **User** | |
| | `/biz/assets/{id}` | DELETE | Delete asset | **User** | |
| `biz_knowledge.py` | `/biz/knowledge` | GET | List knowledge | **User** | |
| | `/biz/knowledge` | POST | Create knowledge | **User** | |
| | `/biz/knowledge/{id}` | GET | Get knowledge | **User** | |
| | `/biz/knowledge/{id}` | PUT | Update knowledge | **User** | |
| | `/biz/knowledge/{id}` | DELETE | Delete knowledge | **User** | |
| | `/biz/knowledge/{id}/download` | GET | Download knowledge | **User** | |
| `biz_library.py` | `/biz/library` | GET | List library items | **User** | |
| | `/biz/library` | POST | Create library item | **User** | |
| | `/biz/library/{id}` | GET | Get library item | **User** | |
| | `/biz/library/{id}` | PUT | Update library item | **User** | |
| | `/biz/library/{id}` | DELETE | Delete library item | **User** | |
| `biz_licenses.py` | `/biz/licenses` | GET | List licenses | **User** | |
| | `/biz/licenses` | POST | Create license | **User** | |
| | `/biz/licenses/{id}` | GET | Get license | **User** | |
| | `/biz/licenses/{id}` | PUT | Update license | **User** | |
| | `/biz/licenses/{id}` | DELETE | Delete license | **User** | |
| `biz_marketplace.py` | `/biz/marketplace` | GET | List marketplace items | **User** | |
| | `/biz/marketplace` | POST | Create marketplace item | **User** | |
| | `/biz/marketplace/{id}` | GET | Get marketplace item | **User** | |
| | `/biz/marketplace/{id}` | PUT | Update marketplace item | **User** | |
| | `/biz/marketplace/{id}` | DELETE | Delete marketplace item | **User** | |
| `biz_pricing.py` | `/biz/pricing` | GET | List pricing models | **User** | |
| | `/biz/pricing` | POST | Create pricing model | **User** | |
| | `/biz/pricing/{id}` | GET | Get pricing model | **User** | |
| | `/biz/pricing/{id}` | PUT | Update pricing model | **User** | |
| | `/biz/pricing/{id}` | DELETE | Delete pricing model | **User** | |
| `biz_revenue.py` | `/biz/revenue` | GET | List revenue records | **User** | |
| | `/biz/revenue` | POST | Create revenue record | **User** | |
| | `/biz/revenue/{id}` | GET | Get revenue record | **User** | |
| | `/biz/revenue/{id}` | PUT | Update revenue record | **User** | |
| | `/biz/revenue/{id}` | DELETE | Delete revenue record | **User** | |
| `business.py` | `/business/analyze` | POST | Analyze business | **User** | |
| `business_dashboard.py` | `/business/dashboard` | GET | Get dashboard data | **User** | |
| `chat.py` | `/chat/sessions` | GET | List chat sessions | **User** | |
| | `/chat/sessions` | POST | Create chat session | **User** | |
| | `/chat/sessions/{session_id}` | GET | Get chat session | **User** | |
| | `/chat/sessions/{session_id}/messages` | POST | Send message | **User** | |
| `chat_history.py` | `/chat/history` | GET | List chat history | **User** | |
| `dashboard.py` | `/dashboard` | GET | Get dashboard data | **User** | |
| `debug.py` | `/debug/logs` | GET | Get system logs | **Admin** | Sensitive system logs |
| | `/debug/config` | GET | Get system config | **Admin** | Sensitive system config |
| `dev.py` | `/dev/patches` | GET | List patches | **User** | |
| | `/dev/patches` | POST | Create patch | **User** | |
| | `/dev/patches/{id}` | GET | Get patch | **User** | |
| | `/dev/patches/{id}` | PUT | Update patch | **User** | |
| | `/dev/patches/{id}` | DELETE | Delete patch | **User** | |
| | `/dev/patches/{id}/apply` | POST | Apply patch | **Admin** | Modifies codebase |
| `evolution.py` | `/evolution/steps` | GET | List evolution steps | **User** | |
| | `/evolution/steps` | POST | Create evolution step | **User** | |
| | `/evolution/steps/{id}` | GET | Get evolution step | **User** | |
| | `/evolution/steps/{id}` | PUT | Update evolution step | **User** | |
| | `/evolution/steps/{id}` | DELETE | Delete evolution step | **User** | |
| | `/evolution/steps/{id}/execute` | POST | Execute evolution step | **Admin** | Modifies codebase |
| `executor.py` | `/executor/tasks` | GET | List executor tasks | **User** | |
| | `/executor/tasks` | POST | Create executor task | **User** | |
| | `/executor/tasks/{id}` | GET | Get executor task | **User** | |
| | `/executor/tasks/{id}` | PUT | Update executor task | **User** | |
| | `/executor/tasks/{id}` | DELETE | Delete executor task | **User** | |
| | `/executor/tasks/{id}/execute` | POST | Execute executor task | **Admin** | Modifies codebase |
| `factories.py` | `/factories` | GET | List factories | **User** | |
| | `/factories/{factory_id}/settings` | GET | Get factory settings | **User** | |
| | `/factories/{factory_id}/settings` | PATCH | Update factory settings | **User** | |
| | `/factories/{factory_id}/outputs` | GET | Get factory outputs | **User** | |
| | `/factories/{factory_id}/knowledge` | GET | Get factory knowledge | **User** | |
| `health.py` | `/health/providers` | GET | Check provider health | **Public** | Intentionally public |
| `knowledge.py` | `/knowledge` | GET | Get all knowledge | **Public** | Intentionally public |
| | `/knowledge/{section}` | GET | Get knowledge section | **Public** | Intentionally public |
| | `/knowledge/lessons` | POST | Add lesson | **User** | |
| | `/knowledge/changelog/update` | POST | Update changelog | **User** | |
| | `/knowledge/roadmap/generate` | POST | Generate roadmap | **User** | |
| `memory.py` | `/memory` | GET | List memory entries | **User** | |
| `models_api.py` | `/models` | GET | List available models | **Public** | Intentionally public |
| `notifications.py` | `/notifications` | GET | List notifications | **User** | |
| | `/notifications/unread-count` | GET | Get unread count | **User** | |
| | `/notifications/{id}/read` | POST | Mark as read | **User** | |
| | `/notifications/read-all` | POST | Mark all as read | **User** | |
| | `/notifications/{id}` | DELETE | Delete notification | **User** | |
| `orgs.py` | `/orgs` | GET | List organizations | **User** | Uses `_require_role` |
| | `/orgs/me` | GET | List my organizations | **User** | Uses `_require_role` |
| | `/orgs` | POST | Create organization | **User** | Uses `_require_role` |
| | `/orgs/{slug}` | GET | Get organization | **User** | Uses `_require_role` |
| | `/orgs/{slug}` | PATCH | Update organization | **User** | Uses `_require_role` |
| | `/orgs/{slug}` | DELETE | Deactivate organization | **User** | Uses `_require_role` |
| | `/orgs/{slug}/members` | GET | List members | **User** | Uses `_require_role` |
| | `/orgs/{slug}/members/{user_id}` | PATCH | Update member role | **User** | Uses `_require_role` |
| | `/orgs/{slug}/members/{user_id}` | DELETE | Remove member | **User** | Uses `_require_role` |
| | `/orgs/{slug}/invites` | GET | List invites | **User** | Uses `_require_role` |
| | `/orgs/{slug}/invites` | POST | Create invite | **User** | Uses `_require_role` |
| | `/orgs/{slug}/invites/{invite_id}` | DELETE | Revoke invite | **User** | Uses `_require_role` |
| | `/orgs/invites/accept` | POST | Accept invite | **User** | Uses `_require_role` |
| `runs.py` | `/workflow-runs` | GET | List workflow runs | **User** | |
| | `/workflows/{workflow_id}/runs` | POST | Start workflow run | **User** | |
| | `/workflows/{workflow_id}/run` | POST | Start workflow run (alias) | **User** | |
| | `/runs/{run_id}` | GET | Get workflow run | **User** | |
| | `/runs/{run_id}/pause` | POST | Pause workflow run | **User** | |
| | `/runs/{run_id}/resume` | POST | Resume workflow run | **User** | |
| | `/runs/{run_id}/stop` | POST | Stop workflow run | **User** | |
| | `/workflows/{workflow_id}/pause` | POST | Pause workflow run (alias) | **User** | |
| | `/workflows/{workflow_id}/resume` | POST | Resume workflow run (alias) | **User** | |
| | `/workflows/{workflow_id}/stop` | POST | Stop workflow run (alias) | **User** | |
| `settings.py` | `/settings` | GET | Get settings | **Admin** | Sensitive API keys (even if masked) |
| | `/settings` | PATCH | Update settings | **Admin** | |
| `team.py` | `/team/status` | GET | Get team status | **User** | |
| | `/team/tasks` | GET | List team tasks | **User** | |
| | `/team/tasks` | POST | Create team task | **User** | |
| | `/team/tasks/{task_id}` | PATCH | Update team task | **User** | |
| | `/team/messages` | GET | List team messages | **User** | |
| | `/team/sessions` | GET | List team sessions | **User** | |
| | `/team/sessions/{session_id}` | GET | Get team session | **User** | |
| | `/team/improve` | POST | Improve AI OS | **User** | |
| | `/team/collaborate` | POST | Collaborate | **User** | |
| `workflows.py` | `/workflows` | GET | List workflows | **User** | |
| | `/workflows/{workflow_id}/schema` | GET | Get workflow schema | **User** | |
