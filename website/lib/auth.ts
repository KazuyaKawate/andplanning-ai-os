/**
 * Client-side authentication utilities.
 * JWT stored in localStorage under "aios_token".
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const TOKEN_KEY = 'aios_token'
const USER_KEY  = 'aios_user'

export type AuthUser = {
  id:           string
  email:        string
  display_name: string
  role:         'admin' | 'user'
  is_active:    boolean
}

/* ── Token storage ─────────────────────────────────────────────────────── */

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem('token') ?? null
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

/* ── API calls ─────────────────────────────────────────────────────────── */

type AuthResponse = {
  access_token: string
  token_type:   string
  user:         AuthUser
}

export async function apiLogin(email: string, password: string): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const json = await res.json() as AuthResponse & { detail?: string }
    if (!res.ok) return { ok: false, error: json.detail ?? `HTTP ${res.status}` }
    saveAuth(json.access_token, json.user)
    return { ok: true, user: json.user }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function apiRegister(
  email: string,
  password: string,
  display_name?: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, display_name }),
    })
    const json = await res.json() as AuthResponse & { detail?: string }
    if (!res.ok) return { ok: false, error: json.detail ?? `HTTP ${res.status}` }
    saveAuth(json.access_token, json.user)
    return { ok: true, user: json.user }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function apiLogout(): Promise<void> {
  const token = getToken()
  if (token) {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* ignore */ }
  }
  clearAuth()
}

/* ── Auth header helper ─────────────────────────────────────────────────── */

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
