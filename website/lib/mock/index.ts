/**
 * Mock data layer — all data is static JSON.
 * Replace each export with a real API call when integrating OpenAI / Anthropic / Google.
 *
 * Convention:
 *   lib/api/*.ts  — real API adapters (create when ready)
 *   The function signatures below define the contract for those adapters.
 */

import type {
  Workflow, WorkflowRun, WorkflowStep,
  FactoryRuntime, QueueItem, ActivityItem,
  MemoryEntry, DashboardMetrics, OsSettings, ModelOption,
} from '@/types'

/* ======================================================================
   HELPERS
   ====================================================================== */

function ago(minutes: number): string {
  const d = new Date(Date.now() - minutes * 60 * 1000)
  return d.toISOString()
}

/* ======================================================================
   MODELS
   ====================================================================== */

export const mockModels: ModelOption[] = [
  { id: 'gpt-4o',               name: 'GPT-4o',              provider: 'openai',    maxTokens: 4096,  contextWindow: 128000 },
  { id: 'gpt-4o-mini',          name: 'GPT-4o mini',         provider: 'openai',    maxTokens: 4096,  contextWindow: 128000 },
  { id: 'claude-sonnet-4-6',    name: 'Claude Sonnet 4.6',   provider: 'anthropic', maxTokens: 8192,  contextWindow: 200000 },
  { id: 'claude-haiku-4-5',     name: 'Claude Haiku 4.5',    provider: 'anthropic', maxTokens: 4096,  contextWindow: 200000 },
  { id: 'gemini-2.0-flash',     name: 'Gemini 2.0 Flash',    provider: 'google',    maxTokens: 8192,  contextWindow: 1000000 },
]

/* ======================================================================
   SETTINGS
   ====================================================================== */

export const mockSettings: OsSettings = {
  defaultModel:        'claude-sonnet-4-6',
  fallbackModel:       'gpt-4o-mini',
  maxConcurrentRuns:   3,
  memoryRetentionDays: 90,
  notifyOnComplete:    true,
  notifyOnError:       true,
  theme:               'dark',
  language:            'ja',
  apiKeys: {
    openai:    '',
    anthropic: '',
    google:    '',
  },
}

/* ======================================================================
   FACTORIES (runtime state)
   ====================================================================== */

export const mockFactories: FactoryRuntime[] = [
  {
    id:              'writing',
    name:            'Writing Factory',
    nameJa:          '文章工場',
    icon:            '✐',
    accentColor:     '#2563EB',
    status:          'active',
    activeWorkflows: 2,
    queuedTasks:     3,
    completedToday:  12,
    errorCount:      0,
    lastActivity:    ago(3),
    memoryItems:     47,
    workflowIds:     ['wf-001', 'wf-002'],
  },
  {
    id:              'research',
    name:            'Research Factory',
    nameJa:          'リサーチ工場',
    icon:            '◎',
    accentColor:     '#059669',
    status:          'active',
    activeWorkflows: 1,
    queuedTasks:     1,
    completedToday:  5,
    errorCount:      1,
    lastActivity:    ago(18),
    memoryItems:     23,
    workflowIds:     ['wf-003'],
  },
  {
    id:              'creator',
    name:            'Creator Factory',
    nameJa:          'クリエイター工場',
    icon:            '✦',
    accentColor:     '#8B5CF6',
    status:          'idle',
    activeWorkflows: 0,
    queuedTasks:     0,
    completedToday:  3,
    errorCount:      0,
    lastActivity:    ago(120),
    memoryItems:     15,
    workflowIds:     ['wf-004'],
  },
  {
    id:              'video',
    name:            'Video Factory',
    nameJa:          '動画工場',
    icon:            '▶',
    accentColor:     '#DC2626',
    status:          'idle',
    activeWorkflows: 0,
    queuedTasks:     2,
    completedToday:  1,
    errorCount:      0,
    lastActivity:    ago(240),
    memoryItems:     8,
    workflowIds:     ['wf-005'],
  },
  {
    id:              'marketing',
    name:            'Marketing Factory',
    nameJa:          'マーケティング工場',
    icon:            '◈',
    accentColor:     '#D97706',
    status:          'idle',
    activeWorkflows: 0,
    queuedTasks:     0,
    completedToday:  0,
    errorCount:      0,
    lastActivity:    ago(480),
    memoryItems:     6,
    workflowIds:     ['wf-006'],
  },
  {
    id:              'fortune',
    name:            'Fortune Factory',
    nameJa:          '占い工場',
    icon:            '✧',
    accentColor:     '#EC4899',
    status:          'disabled',
    activeWorkflows: 0,
    queuedTasks:     0,
    completedToday:  0,
    errorCount:      0,
    lastActivity:    ago(4320),
    memoryItems:     0,
    workflowIds:     [],
  },
]

/* ======================================================================
   WORKFLOW STEPS (shared template)
   ====================================================================== */

const writingSteps: WorkflowStep[] = [
  { id: 's1', name: 'キーワード分析',       status: 'done',    durationMs: 2100 },
  { id: 's2', name: 'ターゲット設定',        status: 'done',    durationMs: 1200 },
  { id: 's3', name: 'アウトライン生成',      status: 'done',    durationMs: 3400 },
  { id: 's4', name: '本文執筆 (§1–§3)',      status: 'done',    durationMs: 8200 },
  { id: 's5', name: '本文執筆 (§4–§6)',      status: 'running', durationMs: undefined },
  { id: 's6', name: 'SEO最適化',            status: 'pending' },
  { id: 's7', name: 'CTA生成',              status: 'pending' },
  { id: 's8', name: 'メタ文章生成',          status: 'pending' },
  { id: 's9', name: '最終レビュー',          status: 'pending' },
]

const researchSteps: WorkflowStep[] = [
  { id: 's1', name: 'クエリ設計',           status: 'done', durationMs: 800  },
  { id: 's2', name: 'Web情報収集',           status: 'done', durationMs: 5600 },
  { id: 's3', name: '情報フィルタリング',    status: 'done', durationMs: 2200 },
  { id: 's4', name: '要約生成',             status: 'done', durationMs: 4100 },
  { id: 's5', name: 'レポート構造化',        status: 'done', durationMs: 3300 },
]

/* ======================================================================
   WORKFLOWS
   ====================================================================== */

export const mockWorkflows: Workflow[] = [
  {
    id:            'wf-001',
    name:          'Note Article 9-Step',
    nameJa:        'note記事 9ステップ自動生成',
    description:   'キーワードを入力するだけで、SEO最適化されたnote記事を9ステップで自動生成します。',
    factoryId:     'writing',
    stepCount:     9,
    avgDurationMs: 42000,
    lastRunAt:     ago(3),
    totalRuns:     47,
    successRate:   97.8,
    status:        'running',
    tags:          ['note', 'SEO', 'article'],
  },
  {
    id:            'wf-002',
    name:          'Blog Article Generator',
    nameJa:        'ブログ記事生成',
    description:   'ブログ向けの構成・本文・メタ情報をまとめて生成します。',
    factoryId:     'writing',
    stepCount:     6,
    avgDurationMs: 28000,
    lastRunAt:     ago(45),
    totalRuns:     23,
    successRate:   100,
    status:        'idle',
    tags:          ['blog', 'article'],
  },
  {
    id:            'wf-003',
    name:          'Trend Research Report',
    nameJa:        'トレンドリサーチレポート',
    description:   '指定テーマのトレンドを自動収集し、レポート形式で出力します。',
    factoryId:     'research',
    stepCount:     5,
    avgDurationMs: 16000,
    lastRunAt:     ago(18),
    totalRuns:     18,
    successRate:   88.9,
    status:        'paused',
    tags:          ['research', 'trend'],
  },
  {
    id:            'wf-004',
    name:          'Content Concept Generator',
    nameJa:        'コンテンツ企画案生成',
    description:   'ターゲットとテーマから複数の企画案を一括生成します。',
    factoryId:     'creator',
    stepCount:     4,
    avgDurationMs: 12000,
    lastRunAt:     ago(120),
    totalRuns:     11,
    successRate:   90.9,
    status:        'idle',
    tags:          ['concept', 'planning'],
  },
  {
    id:            'wf-005',
    name:          'YouTube Script Generator',
    nameJa:        'YouTube台本生成',
    description:   'YouTube動画の台本・サムネイル指示・タグを自動生成します。',
    factoryId:     'video',
    stepCount:     5,
    avgDurationMs: 22000,
    lastRunAt:     ago(240),
    totalRuns:     7,
    successRate:   85.7,
    status:        'queued',
    tags:          ['youtube', 'script'],
  },
  {
    id:            'wf-006',
    name:          'SNS Post Generator',
    nameJa:        'SNS投稿文生成',
    description:   'Twitter/X・Instagram・LinkedIn向けの投稿文を一括生成します。',
    factoryId:     'marketing',
    stepCount:     3,
    avgDurationMs: 8000,
    lastRunAt:     ago(480),
    totalRuns:     4,
    successRate:   100,
    status:        'idle',
    tags:          ['sns', 'marketing'],
  },
]

/* ======================================================================
   WORKFLOW RUNS
   ====================================================================== */

export const mockWorkflowRuns: WorkflowRun[] = [
  {
    id:            'run-001',
    workflowId:    'wf-001',
    workflowName:  'Note Article 9-Step',
    factoryId:     'writing',
    status:        'running',
    startedAt:     ago(3),
    steps:         writingSteps,
    inputSummary:  'キーワード: AI OS 自動化, ターゲット: スタートアップ経営者',
    model:         'claude-sonnet-4-6',
    tokensUsed:    12340,
  },
  {
    id:            'run-002',
    workflowId:    'wf-001',
    workflowName:  'Note Article 9-Step',
    factoryId:     'writing',
    status:        'completed',
    startedAt:     ago(75),
    endedAt:       ago(73),
    steps:         writingSteps.map(s => ({ ...s, status: 'done' as const, durationMs: s.durationMs ?? 2000 })),
    inputSummary:  'キーワード: ワークフロー自動化 ツール, ターゲット: マーケター',
    outputSummary: '2,400文字の記事を生成。SEOスコア 92/100。',
    model:         'claude-sonnet-4-6',
    tokensUsed:    18420,
  },
  {
    id:            'run-003',
    workflowId:    'wf-003',
    workflowName:  'Trend Research Report',
    factoryId:     'research',
    status:        'paused',
    startedAt:     ago(18),
    steps:         researchSteps.map((s, i) => ({
      ...s,
      status: i < 3 ? 'done' : i === 3 ? 'running' : 'pending',
    } as WorkflowStep)),
    inputSummary:  'テーマ: 生成AI × コンテンツマーケティング 2025',
    model:         'gpt-4o',
    tokensUsed:    8900,
  },
  {
    id:            'run-004',
    workflowId:    'wf-002',
    workflowName:  'Blog Article Generator',
    factoryId:     'writing',
    status:        'completed',
    startedAt:     ago(185),
    endedAt:       ago(183),
    steps:         writingSteps.slice(0, 6).map(s => ({ ...s, status: 'done' as const, durationMs: s.durationMs ?? 1500 })),
    inputSummary:  'タイトル候補: Next.js 16 で作るAI OS',
    outputSummary: '1,800文字のブログ記事を生成。',
    model:         'gpt-4o',
    tokensUsed:    10200,
  },
  {
    id:            'run-005',
    workflowId:    'wf-001',
    workflowName:  'Note Article 9-Step',
    factoryId:     'writing',
    status:        'failed',
    startedAt:     ago(320),
    endedAt:       ago(319),
    steps:         writingSteps.slice(0, 4).map((s, i) => ({
      ...s,
      status: i < 3 ? 'done' : 'error',
    } as WorkflowStep)),
    inputSummary:  'キーワード: <未入力>',
    model:         'claude-sonnet-4-6',
    tokensUsed:    2100,
  },
]

/* ======================================================================
   QUEUE
   ====================================================================== */

export const mockQueue: QueueItem[] = [
  {
    id:         'q-001',
    workflowId: 'wf-001',
    factoryId:  'writing',
    name:       'Note記事生成: ChatGPT vs Claude',
    priority:   'high',
    createdAt:  ago(5),
    status:     'running',
  },
  {
    id:         'q-002',
    workflowId: 'wf-001',
    factoryId:  'writing',
    name:       'Note記事生成: AI Factory とは何か',
    priority:   'normal',
    createdAt:  ago(12),
    status:     'queued',
  },
  {
    id:         'q-003',
    workflowId: 'wf-005',
    factoryId:  'video',
    name:       'YouTube台本: AI OS デモ動画',
    priority:   'normal',
    createdAt:  ago(25),
    status:     'queued',
  },
  {
    id:         'q-004',
    workflowId: 'wf-001',
    factoryId:  'writing',
    name:       'Note記事生成: プロンプトエンジニアリング入門',
    priority:   'low',
    createdAt:  ago(40),
    status:     'queued',
  },
]

/* ======================================================================
   ACTIVITY FEED
   ====================================================================== */

export const mockActivity: ActivityItem[] = [
  {
    id:        'act-001',
    type:      'run_start',
    message:   'Note Article 9-Step を開始しました',
    factoryId: 'writing',
    timestamp: ago(3),
    meta:      { runId: 'run-001', model: 'claude-sonnet-4-6' },
  },
  {
    id:        'act-002',
    type:      'run_complete',
    message:   'Blog Article Generator が完了しました（1,800文字）',
    factoryId: 'writing',
    timestamp: ago(45),
    meta:      { runId: 'run-004', tokens: 10200 },
  },
  {
    id:        'act-003',
    type:      'run_error',
    message:   'Note Article 9-Step でエラーが発生しました（入力不足）',
    factoryId: 'writing',
    timestamp: ago(60),
    meta:      { runId: 'run-005', step: 'アウトライン生成' },
  },
  {
    id:        'act-004',
    type:      'memory_save',
    message:   'Research レポートをメモリに保存しました',
    factoryId: 'research',
    timestamp: ago(90),
    meta:      { memoryId: 'mem-004', size: 3200 },
  },
  {
    id:        'act-005',
    type:      'run_complete',
    message:   'Note Article 9-Step が完了しました（2,400文字）',
    factoryId: 'writing',
    timestamp: ago(75),
    meta:      { runId: 'run-002', tokens: 18420 },
  },
  {
    id:        'act-006',
    type:      'settings_change',
    message:   'デフォルトモデルを Claude Sonnet 4.6 に変更しました',
    timestamp: ago(180),
    meta:      { model: 'claude-sonnet-4-6' },
  },
  {
    id:        'act-007',
    type:      'run_start',
    message:   'Trend Research Report を開始しました',
    factoryId: 'research',
    timestamp: ago(18),
    meta:      { runId: 'run-003', model: 'gpt-4o' },
  },
]

/* ======================================================================
   MEMORY
   ====================================================================== */

export const mockMemory: MemoryEntry[] = [
  {
    id:         'mem-001',
    title:      'AIコンテンツ自動化の市場トレンド 2025',
    summary:    '生成AI活用によるコンテンツ自動化市場は2025年に前年比180%成長の見込み。特にSMBセグメントでの採用率が急増。',
    factoryId:  'research',
    workflowId: 'wf-003',
    tags:       ['research', 'article'],
    createdAt:  ago(90),
    size:       3200,
    model:      'gpt-4o',
  },
  {
    id:         'mem-002',
    title:      'note記事: AI OS 自動化 SEOキーワード分析結果',
    summary:    'ターゲットKW「AI OS 自動化」の月間検索数: 1,200。競合難易度: 中。推奨KW群を特定済み。',
    factoryId:  'writing',
    workflowId: 'wf-001',
    tags:       ['article', 'task'],
    createdAt:  ago(185),
    size:       1840,
    model:      'claude-sonnet-4-6',
  },
  {
    id:         'mem-003',
    title:      'マーケター向けワークフロー自動化 記事アウトライン',
    summary:    '6セクション構成。課題→解決策→事例→実装手順→ROI試算→CTA。SEOスコア予測: 88/100。',
    factoryId:  'writing',
    workflowId: 'wf-001',
    tags:       ['article', 'task'],
    createdAt:  ago(75),
    size:       2100,
    model:      'claude-sonnet-4-6',
  },
  {
    id:         'mem-004',
    title:      '競合分析: AI コンテンツ生成ツール 比較レポート',
    summary:    'Jasper, Copy.ai, Notion AI, And Planningの比較。差別化ポイント: Workflow Engine・Factory分離・日本語特化。',
    factoryId:  'research',
    workflowId: 'wf-003',
    tags:       ['research', 'task'],
    createdAt:  ago(90),
    size:       4100,
    model:      'gpt-4o',
  },
  {
    id:         'mem-005',
    title:      'コンテンツ企画: AI Factory 解説シリーズ 構成案',
    summary:    '5本連続企画。#1 概念編 → #2 セットアップ → #3 Writing → #4 Research → #5 ROI検証。',
    factoryId:  'creator',
    workflowId: 'wf-004',
    tags:       ['article', 'conversation'],
    createdAt:  ago(120),
    size:       1600,
    model:      'claude-sonnet-4-6',
  },
  {
    id:         'mem-006',
    title:      'システム: API使用量サマリー 2025-06',
    summary:    '総トークン使用量: 284,500。Anthropic: 68%, OpenAI: 32%。月間コスト試算: ¥4,200。',
    factoryId:  'writing',
    tags:       ['system'],
    createdAt:  ago(2880),
    size:       890,
    model:      'system',
  },
]

/* ======================================================================
   DASHBOARD METRICS
   ====================================================================== */

export const mockDashboard: DashboardMetrics = {
  totalRunsToday:   21,
  activeWorkflows:  3,
  queueDepth:       4,
  memoryItems:      99,
  successRateToday: 90.5,
  tokensUsedToday:  52840,
  activeFactories:  2,
  errorsToday:      2,
}

/* ======================================================================
   UTILITY — format helpers (used in UI components, not real API)
   ====================================================================== */

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h / 24)}日前`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
