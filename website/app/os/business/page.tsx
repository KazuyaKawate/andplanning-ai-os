/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { api } from '@/lib/api/runtime'
import { authHeaders } from '@/lib/auth'
import StatusBadge from '@/components/os/StatusBadge'
import type { BusinessClient, BusinessDeal, BusinessTask } from '@/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/* ======================================================================
   Kanban columns definitions
   ====================================================================== */
const COLUMNS = [
  { id: 'lead',        title: 'リード',        color: 'border-slate-500/20 bg-slate-500/5 text-slate-400' },
  { id: 'proposal',    title: '提案中',        color: 'border-blue-500/20 bg-blue-500/5 text-blue-400' },
  { id: 'negotiation', title: '交渉中',        color: 'border-purple-500/20 bg-purple-500/5 text-purple-400' },
  { id: 'won',         title: '成約 (Won)',    color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
  { id: 'lost',        title: '失注 (Lost)',   color: 'border-rose-500/20 bg-rose-500/5 text-rose-400' },
] as const

function getBadgeStatus(taskStatus: BusinessTask['status']): 'idle' | 'running' | 'completed' | 'failed' {
  if (taskStatus === 'todo') return 'idle'
  if (taskStatus === 'in_progress') return 'running'
  if (taskStatus === 'done') return 'completed'
  return 'failed'
}

export default function BusinessPage() {
  // --- States ---
  const [clients, setClients] = useState<BusinessClient[]>([])
  const [deals, setDeals] = useState<BusinessDeal[]>([])
  const [tasks, setTasks] = useState<BusinessTask[]>([])
  
  const [selectedClient, setSelectedClient] = useState<BusinessClient | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<BusinessDeal | null>(null)
  const [selectedTask, setSelectedTask] = useState<BusinessTask | null>(null)

  // Loading & UI States
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingDeals, setLoadingDeals] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  
  // Drawer & Streaming States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamError, setStreamError] = useState<string | null>(null)
  const activeReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  // Modal States
  const [clientModal, setClientModal] = useState<{ open: boolean; mode: 'create' | 'edit'; client?: BusinessClient }>({ open: false, mode: 'create' })
  const [dealModal, setDealModal] = useState<{ open: boolean; mode: 'create' | 'edit'; deal?: BusinessDeal }>({ open: false, mode: 'create' })

  // Form states
  const [clientForm, setClientForm] = useState({ name: '', company: '', email: '', phone: '', status: 'lead' })
  const [dealForm, setDealForm] = useState({ title: '', status: 'lead', amount: 0, memo: '' })

  // --- Fetch Operations ---
  const fetchClients = async () => {
    setLoadingClients(true)
    const res = await api.getClients()
    if (res.ok) {
      setClients(res.data)
      if (res.data.length > 0 && !selectedClient) {
        setSelectedClient(res.data[0])
      }
    }
    setLoadingClients(false)
  }

  const fetchDeals = async (clientId: number) => {
    setLoadingDeals(true)
    const res = await api.getDeals({ client_id: clientId })
    if (res.ok) {
      setDeals(res.data)
      // Clear or set selected deal
      if (res.data.length > 0) {
        setSelectedDeal(res.data[0])
      } else {
        setSelectedDeal(null)
        setTasks([])
      }
    }
    setLoadingDeals(false)
  }

  const fetchTasks = async (dealId: number) => {
    setLoadingTasks(true)
    const res = await api.getTasks({ deal_id: dealId })
    if (res.ok) {
      setTasks(res.data)
    }
    setLoadingTasks(false)
  }

  // --- Trigger fetches on selection change ---
  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchDeals(selectedClient.id)
    }
  }, [selectedClient])

  useEffect(() => {
    if (selectedDeal) {
      fetchTasks(selectedDeal.id)
    } else {
      setTasks([])
    }
  }, [selectedDeal])

  // --- Client CRUD ---
  const handleOpenClientCreate = () => {
    setClientForm({ name: '', company: '', email: '', phone: '', status: 'lead' })
    setClientModal({ open: true, mode: 'create' })
  }

  const handleOpenClientEdit = (c: BusinessClient) => {
    setClientForm({ name: c.name, company: c.company ?? '', email: c.email ?? '', phone: c.phone ?? '', status: c.status })
    setClientModal({ open: true, mode: 'edit', client: c })
  }

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (clientModal.mode === 'create') {
      const res = await api.createClient(clientForm)
      if (res.ok) {
        setClients(prev => [...prev, res.data])
        setSelectedClient(res.data)
        setClientModal({ open: false, mode: 'create' })
      }
    } else if (clientModal.mode === 'edit' && clientModal.client) {
      const res = await api.updateClient(clientModal.client.id, clientForm)
      if (res.ok) {
        setClients(prev => prev.map(c => c.id === res.data.id ? res.data : c))
        setSelectedClient(res.data)
        setClientModal({ open: false, mode: 'edit' })
      }
    }
  }

  const handleDeleteClient = async (id: number) => {
    if (confirm('このクライアントを削除してもよろしいですか？すべての関連案件も削除されます。')) {
      const res = await api.deleteClient(id)
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== id))
        setSelectedClient(null)
      }
    }
  }

  // --- Deal CRUD ---
  const handleOpenDealCreate = () => {
    if (!selectedClient) return
    setDealForm({ title: '', status: 'lead', amount: 100000, memo: '' })
    setDealModal({ open: true, mode: 'create' })
  }

  const handleOpenDealEdit = (d: BusinessDeal) => {
    setDealForm({ title: d.title, status: d.status, amount: d.amount ?? 0, memo: d.memo ?? '' })
    setDealModal({ open: true, mode: 'edit', deal: d })
  }

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) return

    if (dealModal.mode === 'create') {
      const res = await api.createDeal({
        client_id: selectedClient.id,
        ...dealForm
      })
      if (res.ok) {
        setDeals(prev => [...prev, res.data])
        setSelectedDeal(res.data)
        setDealModal({ open: false, mode: 'create' })
      }
    } else if (dealModal.mode === 'edit' && dealModal.deal) {
      const res = await api.updateDeal(dealModal.deal.id, dealForm)
      if (res.ok) {
        setDeals(prev => prev.map(d => d.id === res.data.id ? res.data : d))
        setSelectedDeal(res.data)
        setDealModal({ open: false, mode: 'edit' })
      }
    }
  }

  const handleDeleteDeal = async (id: number) => {
    if (confirm('この案件を削除してもよろしいですか？')) {
      const res = await api.deleteDeal(id)
      if (res.ok) {
        setDeals(prev => prev.filter(d => d.id !== id))
        setSelectedDeal(null)
      }
    }
  }

  const handleDealStatusChange = async (deal: BusinessDeal, newStatus: typeof COLUMNS[number]['id']) => {
    const res = await api.updateDeal(deal.id, { status: newStatus })
    if (res.ok) {
      setDeals(prev => prev.map(d => d.id === res.data.id ? res.data : d))
      if (selectedDeal?.id === deal.id) {
        setSelectedDeal(res.data)
      }
    }
  }

  // --- Workflows ---
  const handleStartWorkflow = async () => {
    if (!selectedDeal) return
    const res = await api.startBusinessWorkflow({ deal_id: selectedDeal.id })
    if (res.ok) {
      fetchTasks(selectedDeal.id)
    }
  }

  // --- AI Executor Streaming Engine ---
  const handleRunAi = async (task: BusinessTask) => {
    setIsStreaming(true)
    setStreamingContent('')
    setStreamError(null)
    setIsDrawerOpen(true)
    setSelectedTask(task)

    try {
      const tokenObj = authHeaders()
      const headers: Record<string, string> = {}
      if (tokenObj['Authorization']) {
        headers['Authorization'] = tokenObj['Authorization']
      }

      // Call Streaming run endpoint
      const response = await fetch(`${BASE_URL}/api/business-tasks/${task.id}/run`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Reader initialization failed.')
      }

      activeReaderRef.current = reader
      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Typical SSE is formatted as: data: {"content": "..."}\n\n
        const parts = chunk.split('\n\n')
        for (let part of parts) {
          part = part.trim()
          if (part.startsWith('data: ')) {
            const raw = part.slice(6).trim()
            if (raw === '[DONE]') {
              break
            }
            try {
              const parsed = JSON.parse(raw)
              if (parsed.content) {
                setStreamingContent(prev => prev + parsed.content)
              } else if (parsed.error) {
                setStreamError(parsed.error)
              }
            } catch (e) {
              // Fail-safe for partial packets
            }
          }
        }
      }
    } catch (e: any) {
      setStreamError(e.message ?? String(e))
    } finally {
      setIsStreaming(false)
      activeReaderRef.current = null
      // Re-fetch tasks to get final result_text and updated status from backend
      if (selectedDeal) {
        fetchTasks(selectedDeal.id)
      }
    }
  }

  const handleCancelAi = async (task: BusinessTask) => {
    // Abort client reader if active
    if (activeReaderRef.current) {
      activeReaderRef.current.cancel()
    }
    
    // Call cancel endpoint to reset status on backend
    const res = await api.cancelBusinessTask(task.id)
    if (res.ok) {
      if (selectedDeal) {
        fetchTasks(selectedDeal.id)
      }
      setSelectedTask(res.data)
    }
  }

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-3.5rem)] bg-[#080F1E] text-slate-100 overflow-hidden font-sans">
      
      {/* ─── LEFT: CLIENT DIRECTORY ─── */}
      <aside className="w-full xl:w-72 border-b xl:border-b-0 xl:border-r border-white/[0.06] bg-[#0A1220] flex flex-col shrink-0">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">クライアント</h2>
          <button
            onClick={handleOpenClientCreate}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/20 text-brand-cyan transition-colors"
          >
            ＋ 追加
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingClients ? (
            <div className="p-4 text-center text-slate-500 text-xs">読込中...</div>
          ) : clients.length === 0 ? (
            <div className="p-4 text-center text-slate-600 text-xs">クライアントがいません</div>
          ) : (
            clients.map(c => (
              <div
                key={c.id}
                className={[
                  'group p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2',
                  selectedClient?.id === c.id
                    ? 'border-brand-cyan/40 bg-brand-cyan/[0.03]'
                    : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]',
                ].join(' ')}
                onClick={() => setSelectedClient(c)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white group-hover:text-brand-cyan transition-colors truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.company || '個人'}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenClientEdit(c) }}
                    className="p-1 hover:text-white text-slate-500"
                    title="編集"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(c.id) }}
                    className="p-1 hover:text-rose-400 text-slate-500"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ─── MAIN AREA: KANBAN & PIPELINE ─── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {selectedClient ? (
          <>
            {/* Context bar */}
            <div className="p-4 border-b border-white/[0.06] bg-[#0A1220]/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 font-mono">CRM WORKSPACE</span>
                <h1 className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                  {selectedClient.name} <span className="text-xs font-normal text-slate-400">| {selectedClient.company || '個人顧客'}</span>
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenDealCreate}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-blue hover:bg-brand-blue-bright text-white border border-brand-blue-bright/20 shadow-md transition-colors"
                >
                  ＋ 案件追加
                </button>
              </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto p-4 flex gap-4 min-h-0 bg-[#070E1A]">
              {COLUMNS.map(col => {
                const colDeals = deals.filter(d => d.status === col.id)
                return (
                  <div key={col.id} className="w-72 shrink-0 flex flex-col h-full bg-[#0A1220]/40 rounded-xl border border-white/[0.04]">
                    {/* Header */}
                    <div className="p-3 border-b border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${col.color}`}>
                          {col.title}
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-bold">{colDeals.length}</span>
                      </div>
                    </div>

                    {/* Deal Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {loadingDeals ? (
                        <div className="text-center text-xs text-slate-600 p-4">読込中...</div>
                      ) : colDeals.length === 0 ? (
                        <div className="text-center text-[10px] text-slate-700 p-4 border border-dashed border-white/[0.02] rounded-lg">案件なし</div>
                      ) : (
                        colDeals.map(d => (
                          <div
                            key={d.id}
                            onClick={() => setSelectedDeal(d)}
                            className={[
                              'p-3 rounded-xl border text-left cursor-pointer transition-all',
                              selectedDeal?.id === d.id
                                ? 'border-brand-cyan bg-brand-cyan/[0.02]'
                                : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="text-xs font-bold text-white group-hover:text-brand-cyan transition-colors">{d.title}</h3>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenDealEdit(d) }}
                                  className="text-slate-500 hover:text-white text-[10px] p-0.5"
                                  title="編集"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteDeal(d.id) }}
                                  className="text-slate-500 hover:text-rose-400 text-[10px] p-0.5"
                                  title="削除"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {d.amount !== null && (
                              <p className="text-xs font-mono font-bold text-brand-cyan mt-1.5">
                                ¥{(d.amount).toLocaleString()}
                              </p>
                            )}

                            {d.memo && (
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{d.memo}</p>
                            )}

                            {/* Simple fast column switch on card */}
                            <div className="flex gap-1 mt-3 border-t border-white/[0.04] pt-2 overflow-x-auto scrollbar-none">
                              {COLUMNS.map(targetCol => (
                                <button
                                  key={targetCol.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDealStatusChange(d, targetCol.id)
                                  }}
                                  className={[
                                    'text-[9px] px-1.5 py-0.5 rounded transition-all shrink-0',
                                    d.status === targetCol.id
                                      ? 'bg-white/[0.08] text-white font-bold'
                                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]',
                                  ].join(' ')}
                                >
                                  {targetCol.title[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* LOWER PORTION: EXPANDED DEAL & TASK LIST */}
            {selectedDeal ? (
              <section className="h-64 border-t border-white/[0.06] bg-[#0A1220]/80 flex flex-col shrink-0">
                <div className="p-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">SELECTED DEAL:</span>
                    <span className="text-xs font-bold text-white truncate max-w-xs">{selectedDeal.title}</span>
                  </div>

                  <button
                    onClick={handleStartWorkflow}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors flex items-center gap-1"
                  >
                    🚀 セールスワークフロー始動
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {loadingTasks ? (
                    <div className="text-center text-xs text-slate-500 p-4">読込中...</div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center p-6 text-slate-600 text-xs">
                      タスクがありません。セールスワークフローを起動して自動タスク群を作成してください。
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {tasks.map(t => (
                        <div
                          key={t.id}
                          className={[
                            'p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2',
                            selectedTask?.id === t.id
                              ? 'border-brand-cyan/40 bg-brand-cyan/[0.02]'
                              : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03]',
                          ].join(' ')}
                          onClick={() => {
                            setSelectedTask(task => task?.id === t.id ? t : t)
                            setIsDrawerOpen(true)
                          }}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-xs font-bold text-white truncate">{t.title}</h4>
                              <StatusBadge status={getBadgeStatus(t.status)} dot />
                            </div>
                            {t.description && (
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal">{t.description}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 shrink-0">
                            {t.result_text ? (
                              <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-bold">✓ 成果物あり</span>
                            ) : (
                              <span className="text-[9px] text-slate-500">ドラフト未作成</span>
                            )}

                            <div className="flex gap-1">
                              {t.status === 'in_progress' ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelAi(t) }}
                                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                >
                                  キャンセル
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRunAi(t) }}
                                  className="px-2 py-0.5 text-[9px] font-mono font-semibold rounded bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/20 text-brand-cyan transition-colors"
                                >
                                  Run AI
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <span className="text-2xl mb-1">💼</span>
                <p className="text-sm font-semibold text-slate-500">案件がありません</p>
                <p className="text-xs text-slate-700 mt-1">「新規案件」を追加するか、ワークフローを起動してください。</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-3xl inline-block mb-3">👤</span>
              <p className="text-sm font-semibold text-slate-500">クライアントが選択されていません</p>
              <p className="text-xs text-slate-700 mt-1">左のリストから選択するか、新しく登録してください。</p>
            </div>
          </div>
        )}
      </main>

      {/* ─── RIGHT: AI EXECUTION STREAMING DRAWER ─── */}
      <AnimatePresence>
        {isDrawerOpen && selectedTask && (
          <motion.aside
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0A1220] border-l border-white/[0.08] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-[#080F1E] shrink-0">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">AI EXECUTOR AUTOMATION</span>
                <h2 className="text-xs font-bold text-white mt-0.5">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-500 hover:text-white transition-colors text-xs leading-none"
              >
                ✕ 閉じる
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Task Description */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 space-y-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">タスク説明</p>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedTask.description || 'タスク説明はありません。'}</p>
                
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600">ステータス:</span>
                    <StatusBadge status={getBadgeStatus(selectedTask.status)} dot />
                  </div>
                  
                  {/* Action execution */}
                  {isStreaming ? (
                    <button
                      onClick={() => handleCancelAi(selectedTask)}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                    >
                      ■ 停止
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRunAi(selectedTask)}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900 border border-brand-cyan/20 transition-colors"
                    >
                      ⚡ AIを走らせる
                    </button>
                  )}
                </div>
              </div>

              {/* Streaming Realtime Viewer */}
              {isStreaming && (
                <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/[0.02] p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-cyan font-bold tracking-wider animate-pulse">● AIがドラフト作成中 (SSE Streaming) ...</span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-cyan animate-ping" />
                  </div>
                  <pre className="text-[11px] font-mono text-slate-100 bg-[#070E1A] border border-white/[0.04] rounded-lg p-3 overflow-x-auto overflow-y-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                    {streamingContent || '接続確立中...'}
                  </pre>
                </div>
              )}

              {/* Stream Errors */}
              {streamError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-[10px] text-rose-400 font-bold">エラー発生</p>
                  <p className="text-xs text-rose-300 mt-0.5">{streamError}</p>
                </div>
              )}

              {/* Result Viewer (Saved Output) */}
              {selectedTask.result_text && (
                <div className="rounded-xl border border-emerald-500/20 bg-[#070E1A] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ 最新のAI成果物ドラフト (保存済)</span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      作成: {selectedTask.executed_at ? new Date(selectedTask.executed_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed bg-[#050B14] p-3 rounded-lg whitespace-pre-wrap border border-white/[0.02]">
                    {selectedTask.result_text}
                  </div>
                </div>
              )}

              {/* Error messages if any in DB */}
              {selectedTask.error_msg && !isStreaming && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-[10px] text-rose-400 font-bold">データベースエラー記録</p>
                  <p className="text-xs text-rose-300 mt-0.5">{selectedTask.error_msg}</p>
                </div>
              )}

            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CLIENT CREATE / EDIT ─── */}
      {clientModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0A1220] border border-white/[0.08] rounded-2xl p-5 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-white mb-4">
              {clientModal.mode === 'create' ? '新規クライアント作成' : 'クライアント編集'}
            </h3>
            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">名前 (必須)</label>
                <input
                  type="text" required
                  value={clientForm.name}
                  onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">会社名 / 所属</label>
                <input
                  type="text"
                  value={clientForm.company}
                  onChange={e => setClientForm(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="テック株式会社"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="yamada@tech.com"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">電話番号</label>
                <input
                  type="text"
                  value={clientForm.phone}
                  onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="090-1234-5678"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClientModal({ open: false, mode: 'create' })}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900"
                >
                  保存
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL: DEAL CREATE / EDIT ─── */}
      {dealModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0A1220] border border-white/[0.08] rounded-2xl p-5 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-white mb-4">
              {dealModal.mode === 'create' ? '新規案件作成' : '案件編集'}
            </h3>
            <form onSubmit={handleSaveDeal} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">案件タイトル (必須)</label>
                <input
                  type="text" required
                  value={dealForm.title}
                  onChange={e => setDealForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="AIコンサル導入案件"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">想定金額 (円)</label>
                <input
                  type="number"
                  value={dealForm.amount}
                  onChange={e => setDealForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="100000"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">メモ / 詳細</label>
                <textarea
                  value={dealForm.memo}
                  onChange={e => setDealForm(prev => ({ ...prev, memo: e.target.value }))}
                  className="w-full text-xs bg-[#070E1A] border border-white/[0.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-cyan h-20 resize-none"
                  placeholder="大口の成約が期待できるクライアント..."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDealModal({ open: false, mode: 'create' })}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-brand-cyan hover:bg-brand-cyan-bright text-slate-900"
                >
                  保存
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  )
}
