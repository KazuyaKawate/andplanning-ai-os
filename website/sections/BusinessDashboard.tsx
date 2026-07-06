'use client'

import { useState, useEffect } from 'react'
import Badge from '@/components/ui/Badge'

interface Brand {
  name: string
  status: string
}

interface SocialPlatform {
  platform: string
  status: string
}

interface AnalyticsSummary {
  impressions: string
  clicks: number
  ctr: string
}

interface RevenueSummary {
  revenue: string
  subs: number
}

interface Workflow {
  name: string
  status: string
  time: string
}

interface Infrastructure {
  dns: string
  ssl: string
}

interface DashboardData {
  brand: Brand
  social: SocialPlatform[]
  content_count: number
  marketing_campaigns: number
  analytics_summary: AnalyticsSummary
  revenue_summary: RevenueSummary
  workflow_history: Workflow[]
  infrastructure: Infrastructure
}

export default function BusinessDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    // API 疎通シミュレーション (実際は fetch を使用)
    const mockData: DashboardData = {
      brand: { name: "AIOS", status: "Active" },
      social: [
        { platform: "GitHub", status: "synced" },
        { platform: "X", status: "synced" },
        { platform: "note", status: "pending" }
      ],
      content_count: 12,
      marketing_campaigns: 3,
      analytics_summary: { impressions: "25k", clicks: 850, ctr: "3.4%" },
      revenue_summary: { revenue: "¥12,800", subs: 42 },
      workflow_history: [
        { name: "Brand Automation", status: "Completed", time: "2h ago" },
        { name: "Content Batch", status: "Running", time: "10m ago" }
      ],
      infrastructure: { dns: "Propagating", ssl: "Pending" }
    }
    setData(mockData)
  }, [])

  if (!data) return <div className="p-8 text-slate-500">Loading Business Dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white">Business Engine Overview</h2>
          <p className="text-sm text-slate-500">Real-time status of all business modules</p>
        </div>
        <Badge variant="default" className="bg-brand-blue/20 text-brand-blue-bright border-brand-blue/30">
          Beta Version
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Brand & Infra */}
        <StatusCard title="Brand Info" value={data.brand.name} status={data.brand.status} />
        <StatusCard title="DNS Status" value={data.infrastructure.dns} status="warning" />
        <StatusCard title="SSL Status" value={data.infrastructure.ssl} status="pending" />
        <StatusCard title="Social Links" value={`${data.social.length} Connected`} status="ok" />

        {/* Metrics */}
        <MetricCard title="Total Impressions" value={data.analytics_summary.impressions} sub="Analytics Engine" />
        <MetricCard title="Total Revenue" value={data.revenue_summary.revenue} sub="Revenue Engine" />
        <MetricCard title="Active Campaigns" value={data.marketing_campaigns} sub="Marketing Manager" />
        <MetricCard title="Total Content" value={data.content_count} sub="Content Manager" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow History */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Workflow Execution</h3>
          <div className="space-y-4">
            {data.workflow_history.map((wf, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{wf.name}</p>
                  <p className="text-[10px] text-slate-600">{wf.time}</p>
                </div>
                <Badge variant="default" className={wf.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'}>
                  {wf.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Social Status */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Social Hub Sync</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.social.map((s, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                <p className="text-xs font-bold text-white mb-1">{s.platform}</p>
                <p className={`text-[10px] uppercase font-mono ${s.status === 'synced' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {s.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ title, value, status }: { title: string; value: string; status: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-lg font-bold text-white mb-1">{value}</p>
      <p className="text-[10px] text-slate-600 italic">{status}</p>
    </div>
  )
}

function MetricCard({ title, value, sub }: { title: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-[10px] text-brand-cyan">{sub}</p>
    </div>
  )
}

