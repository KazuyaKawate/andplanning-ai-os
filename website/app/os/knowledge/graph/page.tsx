'use client'

import { useState, useEffect, useCallback } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface GraphNode { id: string; type: string; label: string; icon: string }
interface GraphEdge { id: string; source: string; target: string; relation_type: string; strength: number }
interface GraphData  { nodes: GraphNode[]; edges: GraphEdge[]; total_nodes: number; total_edges: number }
interface RelationForm {
  source_type: string; source_id: string; target_type: string
  target_id: string; relation_type: string; strength: string
}
interface Relation   {
  id: string; source_type: string; source_id: string
  target_type: string; target_id: string; relation_type: string
  strength: number; auto_generated: boolean; created_at: string
}

const ENTITY_TYPES = [
  'factory', 'workflow', 'agent', 'asset', 'marketplace_item',
  'template', 'prompt', 'knowledge_pack', 'plugin', 'business_pack',
]

const RELATION_TYPES = [
  'uses', 'contains', 'extends', 'requires', 'produces',
  'derives_from', 'related_to', 'sold_in', 'created_by', 'depends_on',
]

const ENTITY_ICONS: Record<string, string> = {
  factory: '🏭', workflow: '▶️', agent: '🤖', asset: '🎨',
  marketplace_item: '🛒', template: '📋', prompt: '💬',
  knowledge_pack: '📦', plugin: '🔌', business_pack: '💼', user: '👤',
}

const EDGE_COLORS: Record<string, string> = {
  uses: 'text-cyan-400', contains: 'text-blue-400', extends: 'text-violet-400',
  requires: 'text-amber-400', produces: 'text-green-400', derives_from: 'text-orange-400',
  related_to: 'text-slate-400', sold_in: 'text-pink-400', created_by: 'text-emerald-400',
  depends_on: 'text-red-400', supersedes: 'text-yellow-400', part_of: 'text-indigo-400',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP')
}

export default function KnowledgeGraphPage() {
  const [graph, setGraph]         = useState<GraphData | null>(null)
  const [relations, setRelations] = useState<Relation[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'graph' | 'list' | 'add'>('graph')
  const [filterType, setFType]    = useState('')
  const [selected, setSelected]   = useState<string | null>(null)
  const [form, setForm]           = useState<RelationForm>({
    source_type: 'factory', source_id: '', target_type: 'workflow',
    target_id: '', relation_type: 'uses', strength: '1.0',
  })
  const [saving, setSaving]   = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('filter_type', filterType)
    try {
      const [gRes, rRes] = await Promise.all([
        fetch(`${BASE}/api/biz/knowledge/graph?${params}`).then(r => r.json()),
        fetch(`${BASE}/api/biz/knowledge/relations?${params}`).then(r => r.json()),
      ])
      setGraph(gRes)
      setRelations(Array.isArray(rRes) ? rRes : [])
    } catch { setGraph(null) }
    setLoading(false)
  }, [filterType])

  useEffect(() => { load() }, [load])

  const addRelation = async () => {
    if (!form.source_id || !form.target_id) { setMessage('source_id と target_id は必須です'); return }
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${BASE}/api/biz/knowledge/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...form, strength: parseFloat(form.strength) }),
      })
      const data = await res.json()
      if (res.ok) { setMessage('リレーションを追加しました'); load(); setView('list') }
      else setMessage(data.detail || 'エラーが発生しました')
    } catch { setMessage('ネットワークエラー') }
    setSaving(false)
  }

  const deleteRelation = async (id: string) => {
    if (!confirm('このリレーションを削除しますか？')) return
    await fetch(`${BASE}/api/biz/knowledge/relations/${id}`, { method: 'DELETE', headers: authHeaders() })
    setRelations(prev => prev.filter(r => r.id !== id))
    await load()
  }

  const autoGenerate = async (sourceType: string, sourceId: string) => {
    setMessage('AI自動生成中...')
    const res = await fetch(
      `${BASE}/api/biz/knowledge/relations/auto?source_type=${sourceType}&source_id=${sourceId}`,
      { method: 'POST', headers: authHeaders() }
    )
    const data = await res.json()
    setMessage(`${data.relations_created || 0}件のリレーションを自動生成しました`)
    load()
  }

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">🕸️ Knowledge Graph</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {graph ? `${graph.total_nodes}ノード · ${graph.total_edges}エッジ` : 'エンティティ間のリレーショングラフ'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('add')}
            className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30"
          >
            + リレーション追加
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
          {message}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFType('')} className={tabCls(filterType === '')}>すべて</button>
        {ENTITY_TYPES.map(t => (
          <button key={t} onClick={() => setFType(t)} className={tabCls(filterType === t)}>
            {ENTITY_ICONS[t]} {t}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {(['graph', 'list'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={['px-4 py-1.5 rounded-lg text-sm transition-colors', view === v ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'].join(' ')}>
            {v === 'graph' ? 'グラフビュー' : 'リストビュー'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-600">読み込み中...</div>
      ) : view === 'add' ? (
        <AddRelationForm
          form={form} setForm={setForm} saving={saving}
          onSave={addRelation} onCancel={() => setView('list')}
        />
      ) : view === 'graph' ? (
        <GraphView graph={graph} selected={selected} onSelect={setSelected} onAutoGen={autoGenerate} />
      ) : (
        <RelationList relations={relations} onDelete={deleteRelation} onAutoGen={autoGenerate} />
      )}
    </div>
  )
}

/* ─── Graph View (ASCII/text) ────────────────────────────────────────────── */

function GraphView({ graph, selected, onSelect, onAutoGen }: {
  graph: GraphData | null; selected: string | null
  onSelect: (id: string | null) => void
  onAutoGen: (type: string, id: string) => void
}) {
  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-4xl mb-3">🕸️</div>
        <p className="text-slate-400">リレーションがまだありません</p>
        <p className="text-slate-600 text-sm mt-1">「+ リレーション追加」から最初のリレーションを作成してください</p>
      </div>
    )
  }

  // Group nodes by type
  const byType: Record<string, GraphNode[]> = {}
  for (const n of graph.nodes) {
    if (!byType[n.type]) byType[n.type] = []
    byType[n.type].push(n)
  }

  const selectedNode = selected ? graph.nodes.find(n => n.id === selected) : null
  const connectedEdges = selected ? graph.edges.filter(e => e.source === selected || e.target === selected) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Node clusters */}
      <div className="lg:col-span-2 space-y-3">
        {Object.entries(byType).map(([type, nodes]) => (
          <div key={type} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {ENTITY_ICONS[type]} {type} ({nodes.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {nodes.map(n => (
                <button
                  key={n.id}
                  onClick={() => onSelect(selected === n.id ? null : n.id)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs border transition-all font-mono',
                    selected === n.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/20',
                  ].join(' ')}
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Edge visualization */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            エッジ ({graph.edges.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(selected ? connectedEdges : graph.edges.slice(0, 30)).map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-mono truncate max-w-[30%]">{e.source.split(':')[1]?.slice(0, 8) ?? e.source}</span>
                <span className={`px-2 py-0.5 rounded border border-white/[0.06] font-medium ${EDGE_COLORS[e.relation_type] ?? 'text-slate-400'}`}>
                  {e.relation_type}
                </span>
                <span className="text-slate-500 font-mono truncate max-w-[30%]">{e.target.split(':')[1]?.slice(0, 8) ?? e.target}</span>
              </div>
            ))}
            {!selected && graph.edges.length > 30 && (
              <p className="text-slate-600 text-xs">+{graph.edges.length - 30}件 (エンティティを選択してフィルタ)</p>
            )}
          </div>
        </div>
      </div>

      {/* Selected node detail */}
      <div className="space-y-3">
        {selectedNode ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <h3 className="text-sm font-semibold mb-3">{selectedNode.icon} 選択中</h3>
            <div className="space-y-2 mb-4">
              <div className="text-xs">
                <span className="text-slate-500">タイプ: </span>
                <span className="text-slate-300">{selectedNode.type}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">ID: </span>
                <span className="text-slate-300 font-mono">{selectedNode.label}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">接続エッジ: </span>
                <span className="text-cyan-400">{connectedEdges.length}本</span>
              </div>
            </div>
            <button
              onClick={() => {
                const [type, id] = selectedNode.id.split(':')
                onAutoGen(type, id)
              }}
              className="w-full py-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-medium hover:bg-violet-500/20"
            >
              🤖 AI自動リレーション生成
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
            <p className="text-slate-600 text-sm">ノードをクリックして詳細を表示</p>
          </div>
        )}

        {/* Legend */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">リレーション凡例</h3>
          <div className="space-y-1.5">
            {Object.entries(EDGE_COLORS).map(([rel, cls]) => (
              <div key={rel} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${cls.replace('text-', 'bg-')}`} />
                <span className={cls}>{rel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Relation List ──────────────────────────────────────────────────────── */

function RelationList({ relations, onDelete, onAutoGen }: {
  relations: Relation[]
  onDelete: (id: string) => void
  onAutoGen: (type: string, id: string) => void
}) {
  if (relations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <div className="text-3xl mb-2">🕸️</div>
        <p className="text-slate-400">リレーションがまだありません</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {relations.map(r => (
        <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span>{ENTITY_ICONS[r.source_type] ?? '◻️'}</span>
              <span className="text-slate-500 font-mono text-xs truncate">{r.source_id.slice(0, 12)}</span>
              <span className={`text-xs font-medium ${EDGE_COLORS[r.relation_type] ?? 'text-slate-400'}`}>
                ─{r.relation_type}→
              </span>
              <span>{ENTITY_ICONS[r.target_type] ?? '◻️'}</span>
              <span className="text-slate-500 font-mono text-xs truncate">{r.target_id.slice(0, 12)}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-600">{fmtDate(r.created_at)}</span>
              {r.auto_generated && <span className="text-[10px] text-violet-400">AI生成</span>}
              <span className="text-[10px] text-slate-600">strength: {r.strength}</span>
            </div>
          </div>
          <button
            onClick={() => onDelete(r.id)}
            className="text-slate-600 hover:text-red-400 transition-colors text-sm px-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─── Add Relation Form ──────────────────────────────────────────────────── */

function AddRelationForm({ form, setForm, saving, onSave, onCancel }: {
  form: RelationForm
  setForm: (f: RelationForm) => void
  saving: boolean; onSave: () => void; onCancel: () => void
}) {
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="font-bold text-lg mb-5">+ リレーション追加</h2>
        <div className="space-y-4">
          <SelectField label="Source タイプ" value={form.source_type} options={ENTITY_TYPES}
            onChange={v => setForm({ ...form, source_type: v })} />
          <InputField label="Source ID" value={form.source_id} placeholder="エンティティのID"
            onChange={v => setForm({ ...form, source_id: v })} />
          <SelectField label="リレーションタイプ" value={form.relation_type} options={RELATION_TYPES}
            onChange={v => setForm({ ...form, relation_type: v })} />
          <SelectField label="Target タイプ" value={form.target_type} options={ENTITY_TYPES}
            onChange={v => setForm({ ...form, target_type: v })} />
          <InputField label="Target ID" value={form.target_id} placeholder="エンティティのID"
            onChange={v => setForm({ ...form, target_id: v })} />
          <InputField label="強度 (0.0〜1.0)" value={form.strength} placeholder="1.0"
            onChange={v => setForm({ ...form, strength: v })} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:text-white">
            キャンセル
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50">
            {saving ? '保存中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none">
        {options.map(o => <option key={o} value={o} className="bg-slate-900">{ENTITY_ICONS[o] ?? ''} {o}</option>)}
      </select>
    </div>
  )
}

function InputField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  )
}

function tabCls(active: boolean) {
  return [
    'px-3 py-1.5 rounded-lg text-xs transition-colors',
    active ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
           : 'bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:text-slate-300',
  ].join(' ')
}
