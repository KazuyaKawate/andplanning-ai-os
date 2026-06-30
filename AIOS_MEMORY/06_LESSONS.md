# AIOS — Lessons Learned

Append new entries at the bottom. Never overwrite existing entries.
Format: `## [YYYY-MM-DD] Lesson Title`

---

## [2026-06-29] SSE streamBuf Closure Bug

**Bug:** Virtual Claude Dev chat showed "(no response)" even when the AI responded correctly.

**Cause:** `streamBuf` was declared with `useState("")`. The async SSE handler
captured the initial `""` value in its closure. By the time the handler ran,
React had not re-rendered, so reading `streamBuf` always returned `""`.

**Fix:** Changed `streamRequest()` to accumulate all chunks internally and return
the full text as its return value. The caller stores the returned string in state
after the async operation completes — no closure problem.

**Prevention:** Never read React state inside an async handler that runs after
the component's render cycle. Accumulate results in a local variable,
then set state once at the end.

---

## [2026-06-29] Authorization Header Missing After Auth Rollout

**Bug:** All /api/dev/* and /api/team/* calls returned 401 after JWT auth was added.

**Cause:** The frontend was calling fetch() and EventSource() without including
`Authorization: Bearer <token>` headers. The auth system was added to the backend
but the frontend was not updated in the same session.

**Fix:** Added `...authHeaders()` spread to every fetch/SSE call in dev/page.tsx
and team/page.tsx. The `authHeaders()` helper in lib/auth.ts returns
`{ Authorization: "Bearer <token>" }` if a token exists, or `{}` if not.

**Prevention:** After adding any auth-protected endpoint, immediately search the
frontend for all calls to that endpoint path and add authHeaders().
Include a grep step in the phase verification checklist.

---

## [2026-06-29] DevPatch Constructor Bug

**Bug:** POST /api/dev/patch crashed with "unexpected keyword argument 'confirmed'".

**Cause:** The DevPatch SQLAlchemy model was instantiated with `confirmed=False`
but the `confirmed` column had a `server_default` and no Python-side default,
so SQLAlchemy rejected the explicit argument.

**Fix:** Removed `confirmed=False` from the DevPatch() constructor call.
The DB column default handles initialization.

**Prevention:** Never pass column arguments that have server_default to ORM
constructors unless the column has a Python-side `default=` as well.

---

## [2026-06-29] AI Not Following Patch Template

**Bug:** AI agents sometimes returned code without the `---PATCH---` separator,
causing the patch extraction regex to find nothing.

**Cause:** The system prompt mentioned the format but the user message did not
include the actual template. AI models respect user message instructions
more reliably than system prompt format rules.

**Fix:** Embed the exact `---PATCH---` template directly in the user message
alongside the coding task. Include an example of correct output.

**Prevention:** For any AI output that must match a specific format, always
include the exact template in the user message, not only in the system prompt.

---

## [2026-06-29] lang Detection Misfire for Backend Files

**Bug:** Backend TypeScript files were detected as `lang="typescript"` instead
of `lang="python"` when the AI-suggested filename ended in `.ts` but the
content was Python.

**Cause:** The patch extractor inferred `lang` from the filename extension
in the AI output, but the AI sometimes suggested wrong extensions.

**Fix:** Added content-based detection: if the code block starts with `from __future__`,
`import `, `def `, or `class ` without TypeScript keywords, override to `lang="python"`.

**Prevention:** Never rely solely on filename extensions for language detection.
Always cross-check with content patterns.

---

## [2026-06-30] React Closure in SSE Async Handler

**Pattern (generalised from streamBuf bug):**

Any React `useState` value read inside an async callback that fires after
the render cycle will return a stale value. This applies to:
- SSE onmessage handlers
- setTimeout/setInterval callbacks
- Promise .then() chains

**Safe patterns:**
1. Use a `useRef` for values that must be read inside async handlers
2. Accumulate in a local variable, set state once after async completes
3. Use `useReducer` with dispatch for complex accumulation

---
<!-- APPEND NEW ENTRIES BELOW THIS LINE -->
