'use client'

import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/auth'
import type { Organization, OrgMember, OrgInvite } from '@/types'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
type OrgRole = 'developer' | 'admin' | 'viewer'

/* ─── helpers ──────────────────────────────────────────────────────────── */

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts?.headers ?? {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'エラーが発生しました')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-slate-700 text-slate-300',
  pro:        'bg-brand-blue/30 text-brand-cyan',
  enterprise: 'bg-violet-900/40 text-violet-300',
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${PLAN_BADGE[plan] ?? PLAN_BADGE.free}`}>
      {plan}
    </span>
  )
}

function OrgCard({
  org, onSelect,
}: {
  org: Organization
  onSelect: (o: Organization) => void
}) {
  return (
    <button
      onClick={() => onSelect(org)}
      className="text-left w-full rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] transition-colors p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{org.name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">/{org.slug}</p>
        </div>
        <PlanBadge plan={org.plan} />
      </div>
      {org.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{org.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-slate-600">
        <span>メンバー {org.member_count} / {org.max_members}</span>
        <span>{org.is_active ? '✅ アクティブ' : '⛔ 無効'}</span>
      </div>
    </button>
  )
}

/* ─── Org Detail Panel ───────────────────────────────────────────────────── */

function OrgDetail({
  org, onBack, onRefresh,
}: {
  org: Organization
  onBack: () => void
  onRefresh: () => void
}) {
  const [members, setMembers]     = useState<OrgMember[]>([])
  const [invites, setInvites]     = useState<OrgInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<OrgRole>('developer')
  const [tab, setTab]             = useState<'members' | 'invites'>('members')
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')

  useEffect(() => {
    apiFetch<OrgMember[]>(`/orgs/${org.slug}/members`).then(setMembers).catch(() => {})
    apiFetch<OrgInvite[]>(`/orgs/${org.slug}/invites`).then(setInvites).catch(() => {})
  }, [org.slug])

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setLoading(true)
    setMsg('')
    try {
      const inv = await apiFetch<OrgInvite>(`/orgs/${org.slug}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      setInvites(p => [inv, ...p])
      setInviteEmail('')
      setMsg('招待を送信しました')
    } catch (e: unknown) {
      setMsg(`エラー: ${errorMessage(e)}`)
    } finally {
      setLoading(false)
    }
  }

  async function revokeInvite(inviteId: string) {
    await apiFetch(`/orgs/${org.slug}/invites/${inviteId}`, { method: 'DELETE' }).catch(() => {})
    setInvites(p => p.map(i => i.id === inviteId ? { ...i, status: 'revoked' as const } : i))
  }

  async function removeMember(userId: string) {
    await apiFetch(`/orgs/${org.slug}/members/${userId}`, { method: 'DELETE' }).catch(() => {})
    setMembers(p => p.filter(m => m.user_id !== userId))
  }

  const ROLE_COLOR: Record<string, string> = {
    owner:    'text-amber-400',
    admin:    'text-brand-cyan',
    developer:'text-emerald-400',
    viewer:   'text-slate-400',
  }

  const STATUS_COLOR: Record<string, string> = {
    pending:  'text-amber-400',
    accepted: 'text-emerald-400',
    revoked:  'text-slate-500',
    expired:  'text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-white transition-colors">
          ← 一覧に戻る
        </button>
        <span className="text-slate-700">/</span>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white">{org.name}</p>
          <PlanBadge plan={org.plan} />
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-2">
        <p className="text-xs text-slate-500 font-mono">slug: /{org.slug}</p>
        {org.description && <p className="text-xs text-slate-400">{org.description}</p>}
        <p className="text-xs text-slate-600">
          メンバー {org.member_count} / {org.max_members} ｜ オーナー ID: {org.owner_id.slice(0, 8)}…
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['members', 'invites'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${
              tab === t ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'members' ? `メンバー (${members.length})` : `招待 (${invites.length})`}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.05] bg-white/[0.02]">
              <div>
                <p className="text-sm text-slate-300">{m.display_name || m.email}</p>
                <p className="text-xs text-slate-600">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${ROLE_COLOR[m.role] ?? ''}`}>{m.role}</span>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(m.user_id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-xs text-slate-600 px-4">メンバーがいません</p>}
        </div>
      )}

      {tab === 'invites' && (
        <div className="space-y-4">
          {/* Send invite form */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">招待を送る</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as OrgRole)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
              >
                <option value="developer">developer</option>
                <option value="admin">admin</option>
                <option value="viewer">viewer</option>
              </select>
              <button
                onClick={sendInvite}
                disabled={loading || !inviteEmail.trim()}
                className="px-4 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors disabled:opacity-40"
              >
                {loading ? '送信中…' : '招待'}
              </button>
            </div>
            {msg && <p className="text-xs text-slate-400">{msg}</p>}
          </div>

          {/* Invite list */}
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.05] bg-white/[0.02]">
              <div>
                <p className="text-sm text-slate-300">{inv.email}</p>
                <p className="text-xs text-slate-600">
                  role: {inv.role} ｜ 期限: {inv.expires_at.slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${STATUS_COLOR[inv.status] ?? ''}`}>{inv.status}</span>
                {inv.status === 'pending' && (
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    取り消し
                  </button>
                )}
              </div>
            </div>
          ))}
          {invites.length === 0 && <p className="text-xs text-slate-600 px-4">招待がありません</p>}
        </div>
      )}
    </div>
  )
}

/* ─── Create Org Modal ───────────────────────────────────────────────────── */

function CreateOrgModal({
  onClose, onCreate,
}: {
  onClose: () => void
  onCreate: (org: Organization) => void
}) {
  const [name, setName]         = useState('')
  const [desc, setDesc]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  async function submit() {
    if (!name.trim()) return
    setLoading(true)
    setErr('')
    try {
      const org = await apiFetch<Organization>('/orgs', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      })
      onCreate(org)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0D1829] p-6 space-y-4 shadow-2xl">
        <p className="text-base font-semibold text-white">新しい組織を作成</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">組織名 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Company"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">説明（任意）</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="この組織について..."
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 resize-none"
            />
          </div>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white px-4 py-2 transition-colors">
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={loading || !name.trim()}
            className="px-5 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors disabled:opacity-40"
          >
            {loading ? '作成中…' : '作成'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function OrgsPage() {
  const [orgs, setOrgs]           = useState<Organization[]>([])
  const [selected, setSelected]   = useState<Organization | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')

  async function fetchOrgs() {
    setLoading(true)
    try {
      const data = await apiFetch<Organization[]>('/orgs/me')
      setOrgs(data)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrgs() }, [])

  function handleCreate(org: Organization) {
    setOrgs(p => [org, ...p])
    setShowCreate(false)
    setSelected(org)
  }

  return (
    <div className="min-h-screen bg-[#060D1B] text-white">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        {!selected && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">組織管理</h1>
              <p className="text-xs text-slate-500 mt-1">Organization — Business Engine Phase 1</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              組織を作成
            </button>
          </div>
        )}

        {/* Content */}
        {selected ? (
          <OrgDetail
            org={selected}
            onBack={() => { setSelected(null); fetchOrgs() }}
            onRefresh={fetchOrgs}
          />
        ) : (
          <>
            {loading && (
              <div className="text-center py-16">
                <div className="inline-block w-6 h-6 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
                <p className="text-xs text-slate-600 mt-3">読み込み中…</p>
              </div>
            )}
            {err && <p className="text-sm text-red-400">{err}</p>}
            {!loading && !err && orgs.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl mb-3">🏢</p>
                <p className="text-sm text-slate-400">組織がまだありません</p>
                <p className="text-xs text-slate-600 mt-1">「組織を作成」から最初の組織を追加しましょう</p>
              </div>
            )}
            <div className="grid gap-3">
              {orgs.map(org => (
                <OrgCard key={org.id} org={org} onSelect={setSelected} />
              ))}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateOrgModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
