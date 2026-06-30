# AIOS — Development Rules

These rules are non-negotiable. All AI agents and human developers must follow them.

## Safety Rules (Absolute)

1. **No kernel/plugin/memory/router modifications** unless explicitly approved by the user
2. **No file deletion** — use deprecation markers, never `rm` or `Delete`
3. **No destructive git commands** — forbidden: `git reset`, `git clean`, `git checkout --`,
   `git rebase`, `git push --force`
4. **No secret exposure** — API keys, JWT secrets, tokens must never appear in full in logs,
   UI, or AI output. Always mask: `sk-ant***1234`
5. **No overwriting working code** — new features must be additive, not replacements

## Human Approval Rule (Critical)

Every AI-generated code change must go through the patch approval flow:

1. AI generates diff/patch → stored in DevPatch (confirmed=False)
2. Human reviews patch in `/os/dev` page
3. Human clicks Approve → `POST /api/dev/apply` (requires admin role)
4. Only then is the patch written to disk

**The AI must never write code directly to production files without human approval.**

## Protected Files

The following files must never be modified by automated processes:

- `backend/app/main.py` — router registration, lifespan
- `backend/app/models.py` — DB schema (add only, never drop columns)
- `backend/app/auth.py` — JWT logic
- `backend/app/database.py` — engine setup
- `backend/.env` — secrets (never read by AI, never logged)

## Patch Workflow

```
1. AI generates patch text
2. POST /api/dev/patch → DevPatch record (confirmed=False)
3. Human reviews at /os/dev
4. POST /api/dev/apply/{id} (admin) → writes file, marks confirmed=True
5. POST /api/dev/reject/{id} (admin) → marks rejected
```

## Naming Rules

- Python files: `snake_case.py`
- TypeScript files: `PascalCase.tsx` for components, `camelCase.ts` for utils
- DB models: PascalCase class names, snake_case column names
- API routes: `/api/{resource}/{action}` kebab-case
- Environment variables: SCREAMING_SNAKE_CASE

## Verification Rules (Every Phase)

After every implementation phase, run and verify:

1. `python -c "import app.main"` — backend imports OK
2. `npx tsc --noEmit` — TypeScript 0 errors
3. `npm run build` — Next.js build succeeds
4. Auth-protected endpoints return 401 without token
5. API keys masked in all responses
6. Existing features still work (regression check)

## Code Style

- Python: type hints on all function signatures, async/await throughout
- TypeScript: strict mode, no `any` unless truly necessary
- No console.log left in production code
- Error handling at system boundaries only (user input, external APIs)
- Comments only when the WHY is non-obvious

## AI Decision Logging

Every AI agent decision must be logged:
- What decision was made
- Which model was used
- Tokens consumed and cost_usd
- Timestamp and session/run ID

This ensures auditability and feeds the Lessons Learned system.
