# Backend Router Authentication Analysis

This document summarizes the authentication status of all routers in `backend/app/routers/`.

## Authenticated Routers

The following routers have at least some authenticated endpoints.

### `backend/app/routers/auth.py`
- **Authenticated:**
    - `@router.post("/auth/logout")`: Uses `Depends(get_current_user)`.
    - `@router.get("/auth/me")`: Uses `Depends(get_current_user)`.
- **Unauthenticated:**
    - `@router.post("/auth/login")`: Intentionally unauthenticated.
    - `@router.post("/auth/register")`: Intentionally unauthenticated (for now, will be admin-only or disabled in production).

### `backend/app/routers/biz_knowledge.py`
- **Authenticated:**
    - `@router.post("/biz/knowledge")`: Uses `Depends(get_current_user)`.
- **Unauthenticated:**
    - `@router.get("/biz/knowledge")`: Unauthenticated (list).
    - `@router.get("/biz/knowledge/{id}")`: Unauthenticated (get).
    - `@router.put("/biz/knowledge/{id}")`: Unauthenticated (update).
    - `@router.delete("/biz/knowledge/{id}")`: Unauthenticated (delete).
    - `@router.get("/biz/knowledge/{id}/download")`: Unauthenticated (download).

### `backend/app/routers/business.py`
- **Authenticated:**
    - `@router.post("/business/analyze")`: Uses `Depends(get_current_user)`.
- **Unauthenticated:**
    - None.

### `backend/app/routers/knowledge.py`
- **Authenticated:**
    - `@router.post("/knowledge/lessons")`: Uses `Depends(get_current_user)`.
    - `@router.post("/knowledge/changelog/update")`: Uses `Depends(get_current_user)`.
    - `@router.post("/knowledge/roadmap/generate")`: Uses `Depends(get_current_user)`.
- **Unauthenticated:**
    - `@router.get("/knowledge")`: Intentionally unauthenticated.
    - `@router.get("/knowledge/{section}")`: Intentionally unauthenticated.

### `backend/app/routers/orgs.py`
- **Authenticated:**
    - All endpoints use `Depends(get_current_user)` and most also use `_require_role` for authorization.

### `backend/app/routers/settings.py`
- **Authenticated:**
    - `@router.patch("/settings")`: Uses `Depends(require_admin)`.
- **Unauthenticated:**
    - `@router.get("/settings")`: Unauthenticated (returns masked API keys).

### `backend/app/routers/team.py`
- **Authenticated:**
    - `@router.post("/team/improve")`: Uses `Depends(get_current_user)`.
    - `@router.post("/team/collaborate")`: Uses `Depends(get_current_user)`.
- **Unauthenticated:**
    - `@router.get("/team/status")`: Unauthenticated.
    - `@router.get("/team/tasks")`: Unauthenticated (list).
    - `@router.post("/team/tasks")`: Unauthenticated (create).
    - `@router.patch("/team/tasks/{task_id}")`: Unauthenticated (update).
    - `@router.get("/team/messages")`: Unauthenticated (list).
    - `@router.get("/team/sessions")`: Unauthenticated (list).
    - `@router.get("/team/sessions/{session_id}")`: Unauthenticated (get).

## Unauthenticated Routers (Security Risks)

The following routers have no authenticated endpoints.

### `backend/app/routers/activity.py`
- **Unauthenticated:** All endpoints. Allows anyone to view all activity logs.

### `backend/app/routers/agents.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, update, and toggle agents.

### `backend/app/routers/biz_assets.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete business assets.

### `backend/app/routers/biz_library.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete business library items.

### `backend/app/routers/biz_licenses.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete business licenses.

### `backend/app/routers/biz_marketplace.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete business marketplace items.

### `backend/app/routers/biz_pricing.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete business pricing models.

### `backend/app/routers/biz_revenue.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete business revenue records.

### `backend/app/routers/business_dashboard.py`
- **Unauthenticated:** All endpoints. Allows anyone to view business dashboard data.

### `backend/app/routers/chat.py`
- **Unauthenticated:** All endpoints. Allows anyone to start and interact with chat sessions.

### `backend/app/routers/chat_history.py`
- **Unauthenticated:** All endpoints. Allows anyone to view chat history.

### `backend/app/routers/dashboard.py`
- **Unauthenticated:** All endpoints. Allows anyone to view dashboard data.

### `backend/app/routers/debug.py`
- **Unauthenticated:** All endpoints. Allows anyone to view debug information and logs.

### `backend/app/routers/dev.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete development patches.

### `backend/app/routers/evolution.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete evolution steps.

### `backend/app/routers/executor.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, create, update, and delete executor tasks.

### `backend/app/routers/factories.py`
- **Unauthenticated:** All endpoints. Allows anyone to view and modify factory settings and data.

### `backend/app/routers/memory.py`
- **Unauthenticated:** All endpoints. Allows anyone to view memory entries.

### `backend/app/routers/notifications.py`
- **Unauthenticated:** All endpoints. Allows anyone to view, modify, and delete notifications.

### `backend/app/routers/runs.py`
- **Unauthenticated:** All endpoints. Allows anyone to start, stop, pause, and view workflow runs.

### `backend/app/routers/workflows.py`
- **Unauthenticated:** All endpoints. Allows anyone to view all workflows and their schemas.

## Intentionally Unauthenticated Routers

### `backend/app/routers/health.py`
- **Unauthenticated:** `@router.get("/health/providers")`. Intentionally public for health checking.

### `backend/app/routers/models_api.py`
- **Unauthenticated:** `@router.get("/models")`. Intentionally public for listing available models.

## Summary of Needed Actions

1.  **Implement Authentication in Unauthenticated Routers:** Add `Depends(get_current_user)` to all endpoints in the routers listed under "Unauthenticated Routers (Security Risks)".
2.  **Review Mixed-Authentication Routers:** Review `biz_knowledge.py`, `settings.py`, and `team.py` to determine if the unauthenticated endpoints should be authenticated.
3.  **Review Intentionally Unauthenticated Routers:** Confirm that `health.py` and `models_api.py` should remain unauthenticated.
4.  **Review `auth.py`:** Confirm that the register endpoint should remain unauthenticated.
5.  **Review `knowledge.py`:** Confirm that the GET endpoints should remain unauthenticated.

This analysis provides a comprehensive overview of the current state of authentication in the backend routers and highlights areas that need immediate attention to secure the application.
