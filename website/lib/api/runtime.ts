/**
 * lib/api/runtime.ts
 *
 * Single point of truth for which adapter is active.
 *
 * CURRENT ADAPTER: rest  (lib/api/adapters/rest.ts)
 *
 * HOW TO SWITCH ADAPTERS
 * ──────────────────────
 * Option A — env var (no code change needed):
 *   Set NEXT_PUBLIC_API_ADAPTER=mock in .env.local to restore mock data.
 *   Leave it unset (or set to "rest") for the REST backend.
 *
 * Option B — import swap:
 *   Change the export below to point at any OsApiAdapter implementation.
 *   Nothing else in the codebase needs to change.
 *
 * AVAILABLE ADAPTERS
 * ──────────────────
 *   mock — lib/api/adapters/mock.ts  (static JSON, simulated delay)
 *   rest — lib/api/adapters/rest.ts  (fetch → NEXT_PUBLIC_API_BASE_URL)
 */

import { mockAdapter } from './adapters/mock'
import { restAdapter } from './adapters/rest'
import type { OsApiAdapter } from './types'

// NEXT_PUBLIC_API_ADAPTER=mock → mock data (useful without a running backend)
// Default → REST backend
export const api: OsApiAdapter =
  process.env.NEXT_PUBLIC_API_ADAPTER === 'mock' ? mockAdapter : restAdapter

/* Re-export types so consumers only need one import path */
export type { OsApiAdapter, ApiResult } from './types'
