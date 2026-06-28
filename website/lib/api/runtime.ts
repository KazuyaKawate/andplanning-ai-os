/**
 * lib/api/runtime.ts
 *
 * Single point of truth for which adapter is active.
 *
 * HOW TO SWITCH ADAPTERS
 * ──────────────────────
 * 1. Implement OsApiAdapter in lib/api/adapters/rest.ts (or openai.ts, etc.)
 * 2. Change the import below to point at the new adapter.
 * 3. Remove this comment and ship.
 *
 * Nothing else in the codebase needs to change — all hooks and pages
 * import `api` from this file only.
 *
 * CURRENT ADAPTER: mock  (lib/api/adapters/mock.ts)
 * NEXT ADAPTERS:
 *   - rest.ts      — REST backend (Express / FastAPI / etc.)
 *   - openai.ts    — direct OpenAI Responses API
 *   - anthropic.ts — direct Anthropic Messages API
 */

import { mockAdapter } from './adapters/mock'
import type { OsApiAdapter } from './types'

/**
 * `api` is the single runtime adapter instance.
 * Import and call it anywhere in the app:
 *
 *   import { api } from '@/lib/api/runtime'
 *   const result = await api.getDashboard()
 *   if (result.ok) { ... result.data ... }
 */
export const api: OsApiAdapter = mockAdapter

/* Re-export types so consumers only need one import path */
export type { OsApiAdapter, ApiResult } from './types'
