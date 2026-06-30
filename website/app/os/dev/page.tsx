'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { formatRelativeTime } from '@/lib/utils'
import { authHeaders } from '@/lib/auth'
import type { DevFileNode, DevPatch, DevHistoryEntry } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ======================================================================
   SSE streaming helper
   Returns the full accumulated text string.
   ====================================================================== */

async function streamRequest(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  onPatchId?: (id: string) => void,
): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('ログインが必要です。右上のメニューからサインインしてください。')
    if (res.status === 403) throw new Error('管理者権限が必要です。')
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((err as Record<string, string>).detail ?? `HTTP ${res.status}`)
  }
  if (!res.body) throw new Error('No response body')

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full   = ''   // ← accumulate here, not from state

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return full
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (typeof parsed.content === 'string') {
          full += parsed.content
          onChunk(parsed.content)
        }
        if (typeof parsed.patch_id === 'string' && onPatchId) onPatchId(parsed.patch_id)
      } catch { /* skip malformed */ }
    }
  }
  return full
}

/* ======================================================================
   Risk badge
   ====================================================================== */

function RiskBadge({ level }: { level: string }) {
  const color = level === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : level === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      {level.toUpperCase()}
    </span>
  )
}

/* ======================================================================
   File tree
   ====================================================================== */

function FileTreeNode({
  node, depth, onSelect, selected,
}: {
  node: DevFileNode
  depth: number
  onSelect: (path: string) => void
  selected: string | null
}) {
  const [open, setOpen] = useState(depth < 2)
  const isFile = node.type === 'file'
  const isSelected = selected === node.path

  return (
    <div>
      <button
        onClick={() => isFile ? onSelect(node.path) : setOpen(o => !o)}
        className={[
          'w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-xs transition-colors',
          isSelected ? 'bg-brand-blue/20 text-brand-cyan' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
        ].join(' ')}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="shrink-0 text-[10px]">
          {isFile ? '📄' : open ? '📂' : '📁'}
        </span>
        <span className="truncate font-mono">{node.name}</span>
        {isFile && node.size !== undefined && (
          <span className="text-[9px] text-slate-700 ml-auto shrink-0">
            {node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(0)}K`}
          </span>
        )}
      </button>
      {!isFile && open && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ======================================================================
   Diff viewer (simple line-by-line)
   ====================================================================== */

function DiffViewer({ original, updated }: { original: string; updated: string }) {
  const origLines = original.split('\n')
  const updLines  = updated.split('\n')
  const maxLen    = Math.max(origLines.length, updLines.length)

  // Simple line diff: mark added/removed/changed
  const rows: { orig: string | null; upd: string | null; kind: 'same' | 'add' | 'del' | 'change' }[] = []
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? null
    const u = updLines[i]  ?? null
    if (o === u)          rows.push({ orig: o, upd: u, kind: 'same' })
    else if (o === null)  rows.push({ orig: null, upd: u, kind: 'add' })
    else if (u === null)  rows.push({ orig: o, upd: null, kind: 'del' })
    else                  rows.push({ orig: o, upd: u, kind: 'change' })
  }

  const visible = rows.filter(r => r.kind !== 'same').slice(0, 200)
  if (visible.length === 0) return <p className="text-xs text-slate-600 p-3">変更なし</p>

  return (
    <div className="font-mono text-[11px] overflow-auto max-h-72">
      {visible.map((row, i) => (
        <div key={i} className={[
          'flex',
          row.kind === 'add'    ? 'bg-emerald-500/10' : '',
          row.kind === 'del'    ? 'bg-red-500/10'      : '',
          row.kind === 'change' ? 'bg-amber-500/10'    : '',
        ].join(' ')}>
          {row.orig !== null && (
            <span className={`px-2 py-0.5 whitespace-pre border-r border-white/[0.05] flex-1 ${row.kind !== 'same' ? 'text-red-400' : 'text-slate-600'}`}>
              {row.kind !== 'same' ? '- ' : '  '}{row.orig}
            </span>
          )}
          {row.upd !== null && (
            <span className={`px-2 py-0.5 whitespace-pre flex-1 ${row.kind !== 'same' ? 'text-emerald-400' : 'text-slate-600'}`}>
              {row.kind !== 'same' ? '+ ' : '  '}{row.upd}
            </span>
          )}
        </div>
      ))}
      {rows.filter(r => r.kind !== 'same').length > 200 && (
        <p className="text-slate-600 text-[10px] p-2">… (大きなdiffは省略されています)</p>
      )}
    </div>
  )
}

/* ======================================================================
   Patch card
   ====================================================================== */

function PatchCard({
  patch,
  onApply,
  onReject,
  applying,
}: {
  patch: DevPatch
  onApply: (id: string) => void
  onReject: (id: string) => void
  applying: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const isActive = applying === patch.id

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={[
        'rounded-xl border p-4 space-y-3',
        patch.status === 'pending'  ? 'border-brand-blue/20 bg-brand-blue/5'  : '',
        patch.status === 'applied'  ? 'border-emerald-500/20 bg-emerald-500/5' : '',
        patch.status === 'rejected' ? 'border-white/[0.06] bg-white/[0.02] opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-white truncate">{patch.title}</p>
            <RiskBadge level={patch.riskLevel} />
            <span className={[
              'text-[10px] font-mono px-1.5 py-0.5 rounded',
              patch.status === 'pending'  ? 'bg-blue-500/20 text-blue-400'    : '',
              patch.status === 'applied'  ? 'bg-emerald-500/20 text-emerald-400' : '',
              patch.status === 'rejected' ? 'bg-slate-500/20 text-slate-500'  : '',
            ].join(' ')}>
              {patch.status.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono truncate">{patch.filePath}</p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] text-slate-600 hover:text-slate-400 shrink-0 mt-0.5"
        >
          {expanded ? '▲ collapse' : '▼ diff'}
        </button>
      </div>

      {patch.aiExplanation && (
        <p className="text-[11px] text-slate-400 leading-relaxed">{patch.aiExplanation}</p>
      )}

      {expanded && (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.05] bg-white/[0.02]">
            <p className="text-[10px] text-slate-600 font-mono">diff — {patch.filePath}</p>
          </div>
          <DiffViewer original={patch.originalContent} updated={patch.newContent} />
        </div>
      )}

      {patch.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onApply(patch.id)}
            disabled={!!applying}
            className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
          >
            {isActive ? '適用中…' : '✓ Apply'}
          </button>
          <button
            onClick={() => onReject(patch.id)}
            disabled={!!applying}
            className="flex-1 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            ✕ Reject
          </button>
        </div>
      )}

      <p className="text-[9px] text-slate-700 font-mono">{formatRelativeTime(patch.createdAt)}</p>
    </motion.div>
  )
}

/* ======================================================================
   Chat message
   ====================================================================== */

type ChatMsg = { role: 'user' | 'assistant'; content: string; ts: string }

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={[
        'max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed',
        isUser
          ? 'bg-brand-blue/20 text-slate-200 border border-brand-blue/30'
          : 'bg-white/[0.04] text-slate-300 border border-white/[0.06]',
      ].join(' ')}>
        {!isUser && (
          <p className="text-[10px] text-brand-cyan font-mono mb-1">🛠️ Virtual Claude Dev</p>
        )}
        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        <p className="text-[9px] text-slate-700 mt-1.5 font-mono">
          {new Date(msg.ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

/* ======================================================================
   Main page
   ====================================================================== */

export default function DevPage() {
  // Chat state
  const [messages,    setMessages]    = useState<ChatMsg[]>([])
  const [input,       setInput]       = useState('')
  const [streaming,   setStreaming]   = useState(false)
  const [streamBuf,   setStreamBuf]   = useState('')

  // File inspector
  const [fileTree,    setFileTree]    = useState<DevFileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent,  setFileContent]  = useState<string | null>(null)
  const [fileLoading,  setFileLoading]  = useState(false)
  const [treeLoading,  setTreeLoading]  = useState(true)

  // Patches
  const [patches,     setPatches]     = useState<DevPatch[]>([])
  const [applying,    setApplying]    = useState<string | null>(null)

  // History
  const [history,     setHistory]     = useState<DevHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Panel tabs
  const [rightTab, setRightTab] = useState<'files' | 'patches' | 'history'>('files')

  // Error
  const [error, setError] = useState<string | null>(null)

  const chatEndRef  = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    import('@/lib/auth').then(({ isAuthenticated }) => setIsLoggedIn(isAuthenticated()))
  }, [])

  // Load file tree on mount
  useEffect(() => {
    setTreeLoading(true)
    fetch(`${BASE_URL}/api/dev/files`)
      .then(r => r.json())
      .then((data: DevFileNode[]) => setFileTree(data))
      .catch(e => setError(String(e)))
      .finally(() => setTreeLoading(false))
  }, [])

  // Load patches
  const loadPatches = useCallback(() => {
    fetch(`${BASE_URL}/api/dev/patches`)
      .then(r => r.json())
      .then((data: DevPatch[]) => setPatches(data))
      .catch(() => {})
  }, [])

  // Load history
  const loadHistory = useCallback(() => {
    fetch(`${BASE_URL}/api/dev/history?limit=30`)
      .then(r => r.json())
      .then((data: DevHistoryEntry[]) => setHistory(data))
      .catch(() => {})
  }, [])

  useEffect(() => { loadPatches() }, [loadPatches])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamBuf])

  // Inspect a file
  async function handleInspect(path: string) {
    setSelectedFile(path)
    setFileContent(null)
    setFileLoading(true)
    setRightTab('files')
    try {
      const res = await fetch(`${BASE_URL}/api/dev/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ path }),
      })
      const data = await res.json() as { content: string; path: string }
      if (res.ok) {
        setFileContent(data.content)
      } else {
        setFileContent(`Error: ${(data as Record<string, string>).detail ?? 'Cannot read file'}`)
      }
    } catch (e) {
      setFileContent(`Error: ${String(e)}`)
    } finally {
      setFileLoading(false)
    }
  }

  // Ask Virtual Claude Dev to inspect/discuss the selected file
  async function handleAskAboutFile() {
    if (!selectedFile) return
    const text = `このファイルをレビューしてください: \`${selectedFile}\``
    await sendMessage(text)
  }

  // Generate a patch for the selected file
  async function handleGeneratePatch() {
    if (!selectedFile || !input.trim()) return
    const task = input.trim()
    setInput('')
    setStreaming(true)
    setStreamBuf('')

    const assistantTs = new Date().toISOString()
    setMessages(m => [...m, { role: 'user', content: `[Patch] ${task}\nFile: ${selectedFile}`, ts: new Date().toISOString() }])

    let patchId: string | null = null
    let full = ''
    try {
      full = await streamRequest(
        '/api/dev/patch',
        { task, file_path: selectedFile, context: fileContent?.slice(0, 2000) ?? '' },
        (chunk) => setStreamBuf(b => b + chunk),
        (id)    => { patchId = id },
      )
    } catch (e) {
      full = `Error: ${String(e)}`
      setStreamBuf(full)
    }

    setMessages(m => [...m, { role: 'assistant', content: full || '(no response)', ts: assistantTs }])
    setStreamBuf('')
    setStreaming(false)

    if (patchId) {
      loadPatches()
      setRightTab('patches')
    }
  }

  // Generate an implementation plan
  async function handleGeneratePlan() {
    if (!input.trim()) return
    const task = input.trim()
    setInput('')
    setStreaming(true)
    setStreamBuf('')

    setMessages(m => [...m, { role: 'user', content: `[Plan] ${task}`, ts: new Date().toISOString() }])
    const assistantTs = new Date().toISOString()

    let full = ''
    try {
      full = await streamRequest(
        '/api/dev/plan',
        { task, context: selectedFile ? `Current file: ${selectedFile}` : '', files: selectedFile ? [selectedFile] : [] },
        (chunk) => setStreamBuf(b => b + chunk),
      )
    } catch (e) {
      full = `Error: ${String(e)}`
      setStreamBuf(full)
    }

    setMessages(m => [...m, { role: 'assistant', content: full || '(no response)', ts: assistantTs }])
    setStreamBuf('')
    setStreaming(false)
  }

  // General chat
  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || streaming) return
    if (!text) setInput('')
    setStreaming(true)
    setStreamBuf('')

    const userMsg: ChatMsg = { role: 'user', content: userText, ts: new Date().toISOString() }
    setMessages(m => [...m, userMsg])

    const assistantTs = new Date().toISOString()
    const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    let patchId: string | null = null
    let full = ''

    try {
      full = await streamRequest(
        '/api/dev/chat',
        { messages: chatHistory },
        (chunk) => setStreamBuf(b => b + chunk),
        (id)    => { patchId = id },
      )
    } catch (e) {
      full = `Error: ${String(e)}`
      setStreamBuf(full)
    }

    setMessages(m => [...m, { role: 'assistant', content: full || '(no response)', ts: assistantTs }])
    setStreamBuf('')
    setStreaming(false)

    if (patchId) {
      loadPatches()
      setRightTab('patches')
    }
  }

  // Apply patch
  async function handleApply(patchId: string) {
    setApplying(patchId)
    setError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/dev/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ patchId, confirmed: true }),
      })
      const data = await res.json() as { ok: boolean; message: string }
      if (res.ok && data.ok) {
        loadPatches()
        loadHistory()
        setMessages(m => [...m, {
          role: 'assistant',
          content: `✅ ${data.message}`,
          ts: new Date().toISOString(),
        }])
      } else {
        setError((data as unknown as Record<string, string>).detail ?? data.message ?? 'Apply failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setApplying(null)
    }
  }

  // Reject patch
  async function handleReject(patchId: string) {
    try {
      await fetch(`${BASE_URL}/api/dev/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ patchId, confirmed: true }),
      })
      loadPatches()
    } catch { /* ignore */ }
  }

  const pendingCount = patches.filter(p => p.status === 'pending').length

  return (
    <div className="flex flex-col h-full gap-4 max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading text-white flex items-center gap-2">
            🛠️ Virtual Claude Dev
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            AI開発アシスタント — ファイル検査・実装計画・安全なパッチ提案
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600">
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingCount} 件承認待ち
            </span>
          )}
          <button
            onClick={() => { loadHistory(); setShowHistory(h => !h) }}
            className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.07] text-slate-400 transition-colors"
          >
            {showHistory ? '▲ 履歴を閉じる' : '▼ 開発履歴'}
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-600 hover:text-slate-400">✕</button>
        </div>
      )}

      {/* Dev History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Development History</p>
            </div>
            <div className="overflow-x-auto">
              {history.length === 0 ? (
                <p className="text-xs text-slate-600 p-4">アクション履歴がありません</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {['Action', 'Summary', 'File', 'Model', '時刻'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] text-slate-600 uppercase tracking-widest font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 20).map(row => (
                      <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-2">
                          <span className="font-mono text-brand-cyan">{row.action}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-400 max-w-xs truncate">{row.summary}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-[10px] truncate max-w-[160px]">
                          {row.filePath ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">
                          {row.modelUsed?.split('-').slice(-1)[0] ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-mono text-[10px]">
                          {formatRelativeTime(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3-panel grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 min-h-0">

        {/* Left: File Inspector */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Files</p>
            {selectedFile && (
              <button
                onClick={handleAskAboutFile}
                className="text-[10px] text-brand-cyan hover:underline"
              >
                Claudeに聞く →
              </button>
            )}
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto py-2">
            {treeLoading ? (
              <div className="px-3 py-4 text-xs text-slate-600">Loading tree…</div>
            ) : (
              fileTree.map(node => (
                <FileTreeNode key={node.path} node={node} depth={0} onSelect={handleInspect} selected={selectedFile} />
              ))
            )}
          </div>

          {/* File content preview */}
          {selectedFile && (
            <div className="border-t border-white/[0.06] shrink-0">
              <div className="px-3 py-2 flex items-center justify-between">
                <p className="text-[10px] font-mono text-slate-500 truncate">{selectedFile}</p>
                {fileLoading && <span className="text-[10px] text-slate-600 animate-pulse">読込中…</span>}
              </div>
              {fileContent !== null && !fileLoading && (
                <pre className="text-[10px] font-mono text-slate-400 px-3 pb-3 max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                  {fileContent.slice(0, 3000)}{fileContent.length > 3000 ? '\n… (truncated)' : ''}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Center: Chat */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Virtual Claude Dev Chat
            </p>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="text-[10px] text-slate-700 hover:text-slate-500">
                クリア
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-8 space-y-3">
                <p className="text-4xl">🛠️</p>
                <p className="text-xs text-slate-500">Virtual Claude Dev へ質問してください</p>
                {!isLoggedIn && (
                  <div className="mx-auto max-w-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-400 font-medium">⚠️ ログインが必要です</p>
                    <p className="text-[11px] text-amber-400/70 mt-1">
                      チャット・パッチ生成にはサインインが必要です。右上のメニューからログインしてください。
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {[
                    'このプロジェクトの構造を説明して',
                    '改善できる点を教えて',
                    '左でファイルを選択してバグを探して',
                    'APIエンドポイントを追加するパッチを作って',
                    'このコードをリファクタリングする計画を立てて',
                    'テストを書くべき箇所はどこ？',
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => { setInput(hint); textareaRef.current?.focus() }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
            {streaming && streamBuf && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                  <p className="text-[10px] text-brand-cyan font-mono mb-1">🛠️ Virtual Claude Dev</p>
                  <pre className="whitespace-pre-wrap font-sans">{streamBuf}</pre>
                  <span className="inline-block w-1.5 h-3 bg-brand-cyan animate-pulse ml-0.5 rounded-sm" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/[0.06] p-3 space-y-2 shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder={selectedFile
                ? `"${selectedFile}" について質問 or パッチ指示…`
                : 'Virtual Claude Dev に質問 (Shift+Enter で改行, Enter で送信)'}
              rows={3}
              disabled={streaming}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:border-brand-cyan/40 focus:outline-none resize-none disabled:opacity-40"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => void sendMessage()}
                disabled={streaming || !input.trim()}
                className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/80 transition-colors disabled:opacity-40"
              >
                {streaming ? '生成中…' : '▶ 送信'}
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={streaming || !input.trim()}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.08] text-xs font-semibold hover:bg-white/[0.10] transition-colors disabled:opacity-40"
              >
                📋 計画生成
              </button>
              {selectedFile && (
                <button
                  onClick={handleGeneratePatch}
                  disabled={streaming || !input.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-40"
                >
                  🔧 パッチ生成
                </button>
              )}
            </div>
            {selectedFile && (
              <p className="text-[10px] text-slate-600 font-mono">
                選択中: <span className="text-brand-cyan">{selectedFile}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Patches / Files / History tabs */}
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] min-h-0 overflow-hidden">
          <div className="flex border-b border-white/[0.06] shrink-0">
            {(['patches', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setRightTab(tab); if (tab === 'history') loadHistory() }}
                className={[
                  'flex-1 py-2.5 text-[11px] font-medium transition-colors',
                  rightTab === tab
                    ? 'text-white border-b-2 border-brand-cyan bg-white/[0.03]'
                    : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {tab === 'patches'
                  ? `Patches${pendingCount ? ` (${pendingCount})` : ''}`
                  : 'History'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {rightTab === 'patches' && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-600 font-mono">{patches.length} patches</p>
                  <button onClick={loadPatches} className="text-[10px] text-slate-600 hover:text-slate-400">↻ 更新</button>
                </div>
                {patches.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-xs text-slate-600">パッチ提案がありません</p>
                    <p className="text-[10px] text-slate-700 mt-1">左パネルでファイルを選択し、チャットでパッチを依頼してください</p>
                  </div>
                )}
                {patches.map(p => (
                  <PatchCard
                    key={p.id}
                    patch={p}
                    onApply={handleApply}
                    onReject={handleReject}
                    applying={applying}
                  />
                ))}
              </>
            )}

            {rightTab === 'history' && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-600 font-mono">{history.length} actions</p>
                  <button onClick={loadHistory} className="text-[10px] text-slate-600 hover:text-slate-400">↻ 更新</button>
                </div>
                {history.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-8">履歴がありません</p>
                )}
                {history.map(row => (
                  <div key={row.id} className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-blue/20 text-brand-cyan">
                        {row.action}
                      </span>
                      <p className="text-[10px] text-slate-700 font-mono ml-auto">
                        {formatRelativeTime(row.createdAt)}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{row.summary}</p>
                    {row.filePath && (
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">{row.filePath}</p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
