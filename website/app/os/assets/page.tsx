'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { authHeaders } from '@/lib/auth'

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface BizAsset {
  id: string
  owner_id: string
  name: string
  asset_type: string
  public_url: string | null
  mime_type: string
  size_bytes: number
  tags: string[]
  description: string
  is_public: boolean
  usage_count: number
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  icon: '🎯', image: '🖼️', video: '🎬', audio: '🎵',
  code: '</>', prompt: '💬', document: '📄', model_weight: '🧠',
}

const TYPES = ['', 'icon', 'image', 'video', 'audio', 'code', 'prompt', 'document', 'model_weight']
const TYPE_LABELS: Record<string, string> = {
  icon: 'Icon', image: 'Image', video: 'Video', audio: 'Audio',
  code: 'Code', prompt: 'Prompt', document: 'Document', model_weight: 'Model',
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function AssetsPage() {
  const [assets, setAssets]       = useState<BizAsset[]>([])
  const [loading, setLoading]     = useState(true)
  const [typeFilter, setType]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected]   = useState<BizAsset | null>(null)
  const fileRef                   = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (typeFilter) params.set('asset_type', typeFilter)
      const res  = await fetch(`${BASE}/api/biz/assets/my/list?${params}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      setAssets(Array.isArray(data) ? data : [])
    } catch { setAssets([]) }
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  const upload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    fd.append('asset_type', guessType(file))
    fd.append('is_public', 'false')
    try {
      const res = await fetch(`${BASE}/api/biz/assets/upload`, {
        method: 'POST', headers: authHeaders(), body: fd,
      })
      if (res.ok) { await load() }
    } catch {}
    setUploading(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  const deleteAsset = async (id: string) => {
    if (!confirm('このアセットを削除しますか？')) return
    await fetch(`${BASE}/api/biz/assets/${id}`, { method: 'DELETE', headers: authHeaders() })
    setAssets(prev => prev.filter(a => a.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="min-h-screen bg-[#060D1A] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">🎨 Assets</h1>
          <p className="text-slate-500 text-sm mt-0.5">{assets.length}件のアセット</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          {uploading ? 'アップロード中...' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]) }} />
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              typeFilter === t
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-slate-200',
            ].join(' ')}
          >
            {t ? `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}` : 'すべて'}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-white/[0.08] rounded-xl p-6 mb-6 text-center cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all"
        onClick={() => fileRef.current?.click()}
      >
        <p className="text-slate-600 text-sm">ここにファイルをドロップ、またはクリックしてアップロード</p>
        <p className="text-slate-700 text-xs mt-1">最大 100MB · 画像/音声/動画/コード/Prompt 対応</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-600">読み込み中...</div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-slate-500">アセットがまだありません</p>
          <p className="text-slate-700 text-xs mt-1">上のエリアにファイルをドロップしてください</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {assets.map(a => (
            <AssetCard key={a.id} asset={a} onClick={() => setSelected(a)} />
          ))}
        </div>
      )}

      {selected && (
        <AssetDetailPanel asset={selected} onClose={() => setSelected(null)} onDelete={deleteAsset} />
      )}
    </div>
  )
}

function AssetCard({ asset, onClick }: { asset: BizAsset; onClick: () => void }) {
  const icon = TYPE_ICONS[asset.asset_type] ?? '📄'
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {asset.is_public && <span className="text-[10px] text-green-400 bg-green-400/10 px-1 rounded">公開</span>}
      </div>
      <p className="text-xs font-medium truncate">{asset.name}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{fmtBytes(asset.size_bytes)}</p>
    </button>
  )
}

function AssetDetailPanel({ asset, onClose, onDelete }: {
  asset: BizAsset; onClose: () => void; onDelete: (id: string) => void
}) {
  const icon = TYPE_ICONS[asset.asset_type] ?? '📄'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-[#0D1830] border border-white/[0.08] p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <div>
            <h2 className="font-bold">{asset.name}</h2>
            <p className="text-xs text-slate-500">{asset.asset_type} · {fmtBytes(asset.size_bytes)}</p>
          </div>
        </div>
        {asset.public_url && asset.asset_type === 'image' && (
          <img src={asset.public_url} alt={asset.name} className="w-full rounded-lg mb-4 max-h-48 object-contain bg-white/[0.03]" />
        )}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="rounded-lg bg-white/[0.03] p-2">
            <p className="text-slate-500">MIME</p>
            <p className="text-slate-300 truncate">{asset.mime_type || '—'}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-2">
            <p className="text-slate-500">利用回数</p>
            <p className="text-slate-300">{asset.usage_count}回</p>
          </div>
        </div>
        {asset.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {asset.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400">{t}</span>
            ))}
          </div>
        )}
        {asset.public_url && (
          <a href={asset.public_url} target="_blank" rel="noreferrer"
            className="block text-center py-2 rounded-lg bg-white/[0.04] text-slate-300 text-sm mb-3 hover:bg-white/[0.08]">
            ダウンロード
          </a>
        )}
        <button
          onClick={() => onDelete(asset.id)}
          className="w-full py-2 rounded-lg border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
        >
          削除
        </button>
      </div>
    </div>
  )
}

function guessType(file: File): string {
  const m = file.type
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m.includes('text') || m.includes('json') || m.includes('javascript') || m.includes('python'))
    return 'code'
  if (file.name.endsWith('.md') || file.name.endsWith('.txt')) return 'document'
  return 'document'
}
