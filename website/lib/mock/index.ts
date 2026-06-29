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
  WorkflowInputField, FactoryOutput, FactoryKnowledge, FactorySettings,
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
  claudeMode: 'auto',
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
  totalRunsToday:         21,
  activeWorkflows:        3,
  queueDepth:             4,
  memoryItems:            99,
  successRateToday:       90.5,
  tokensUsedToday:        52840,
  activeFactories:        2,
  errorsToday:            2,
  costToday:              0.0,
  agentRunsToday:         0,
  virtualClaudeRunsToday: 0,
  realClaudeRunsToday:    0,
  claudeMode:             'auto',
  topAgents:              [],
}

/* ======================================================================
   WORKFLOW EXECUTION — step templates per workflow
   Replace with: GET /api/workflows/{id}/steps
   ====================================================================== */

export const mockWorkflowSteps: Record<string, Array<{ name: string; durationMs: number }>> = {
  'wf-001': [
    { name: 'キーワード分析',     durationMs: 2100 },
    { name: 'ターゲット設定',     durationMs: 1200 },
    { name: 'アウトライン生成',   durationMs: 3400 },
    { name: '本文執筆 (§1–§3)',   durationMs: 8200 },
    { name: '本文執筆 (§4–§6)',   durationMs: 8200 },
    { name: 'SEO最適化',         durationMs: 2800 },
    { name: 'CTA生成',           durationMs: 1500 },
    { name: 'メタ文章生成',       durationMs: 2400 },
    { name: '最終レビュー',       durationMs: 4200 },
  ],
  'wf-002': [
    { name: 'テーマ分析',         durationMs: 1800 },
    { name: 'アウトライン生成',   durationMs: 2600 },
    { name: '本文執筆 (前半)',     durationMs: 7400 },
    { name: '本文執筆 (後半)',     durationMs: 7400 },
    { name: 'メタ情報生成',       durationMs: 1900 },
    { name: '最終レビュー',       durationMs: 3200 },
  ],
  'wf-003': [
    { name: 'クエリ設計',         durationMs: 1200 },
    { name: 'Web情報収集',        durationMs: 5600 },
    { name: '情報フィルタリング', durationMs: 2200 },
    { name: '要約生成',           durationMs: 4100 },
    { name: 'レポート構造化',     durationMs: 3300 },
  ],
  'wf-004': [
    { name: 'ターゲット分析',     durationMs: 1600 },
    { name: '企画案生成',         durationMs: 4800 },
    { name: '詳細設計',           durationMs: 3200 },
    { name: '最終仕上げ',         durationMs: 2000 },
  ],
  'wf-005': [
    { name: 'テーマ分析',         durationMs: 1400 },
    { name: '構成設計',           durationMs: 2800 },
    { name: '台本執筆',           durationMs: 9600 },
    { name: 'サムネイル指示作成', durationMs: 2200 },
    { name: 'SEOタグ生成',        durationMs: 1800 },
  ],
  'wf-006': [
    { name: 'テーマ分析',         durationMs: 1000 },
    { name: '投稿文生成',         durationMs: 4200 },
    { name: 'ハッシュタグ生成',   durationMs: 1600 },
  ],
}

/* ======================================================================
   WORKFLOW EXECUTION — input schemas
   Replace with: GET /api/workflows/{id}/schema
   ====================================================================== */

export const mockWorkflowInputs: Record<string, WorkflowInputField[]> = {
  'wf-001': [
    { id: 'keyword', label: 'ターゲットキーワード', placeholder: '例: AI OS 自動化',         required: true,  type: 'text'     },
    { id: 'target',  label: 'ターゲット読者',       placeholder: '例: スタートアップ経営者', required: true,  type: 'text'     },
    { id: 'tone',    label: 'トーン・文体',         placeholder: '例: 専門的・わかりやすい', required: false, type: 'text'     },
    { id: 'notes',   label: '補足メモ',             placeholder: '含めたい内容・禁止事項など', required: false, type: 'textarea' },
  ],
  'wf-002': [
    { id: 'title',    label: '記事タイトル案',      placeholder: '例: Next.js で作る AI OS',  required: true,  type: 'text'     },
    { id: 'keyword',  label: 'メインキーワード',    placeholder: '例: Next.js AI',            required: true,  type: 'text'     },
    { id: 'category', label: 'カテゴリ',            placeholder: '例: 技術・ビジネス',         required: false, type: 'text'     },
  ],
  'wf-003': [
    { id: 'theme',   label: 'リサーチテーマ',       placeholder: '例: 生成AI × コンテンツマーケティング 2025', required: true, type: 'text' },
    { id: 'period',  label: '対象期間',             placeholder: '例: 2025年上半期',           required: false, type: 'text'     },
    { id: 'depth',   label: '深度',                 placeholder: '例: 概要 / 詳細 / 詳細+事例', required: false, type: 'text'    },
  ],
  'wf-004': [
    { id: 'target',  label: 'ターゲット読者',       placeholder: '例: フリーランスデザイナー', required: true,  type: 'text'     },
    { id: 'theme',   label: 'コンテンツテーマ',     placeholder: '例: AI Factory 解説シリーズ', required: true, type: 'text'    },
    { id: 'count',   label: '企画案の本数',         placeholder: '例: 5',                     required: false, type: 'text'     },
  ],
  'wf-005': [
    { id: 'topic',    label: '動画テーマ',          placeholder: '例: AI OS とは何か？',        required: true,  type: 'text'     },
    { id: 'duration', label: '動画尺',              placeholder: '例: 10分',                  required: false, type: 'text'     },
    { id: 'style',    label: 'スタイル',            placeholder: '例: 解説系・エンタメ',       required: false, type: 'text'     },
  ],
  'wf-006': [
    { id: 'theme',    label: '投稿テーマ',          placeholder: '例: AI工場 新機能リリース', required: true,  type: 'text'     },
    { id: 'platform', label: 'プラットフォーム',   placeholder: '例: X・Instagram・LinkedIn', required: false, type: 'text'     },
    { id: 'tone',     label: 'トーン',              placeholder: '例: カジュアル・プロフェッショナル', required: false, type: 'text' },
  ],
}

/* ======================================================================
   WORKFLOW EXECUTION — mock output generator
   Replace with: result field from GET /api/runs/{runId}
   ====================================================================== */

export function getMockOutput(workflowId: string, inputs: Record<string, string>): string {
  const kw     = inputs['keyword'] ?? inputs['theme'] ?? inputs['topic'] ?? inputs['title'] ?? 'AI自動化'
  const target = inputs['target'] ?? 'ビジネスパーソン'

  switch (workflowId) {
    case 'wf-001':
      return `# ${kw}とは？${target}が今すぐ導入すべき完全ガイド

## はじめに
${kw}は、現代のビジネスにおいて欠かせない技術トレンドとなっています。本記事では、その仕組みと実践的な活用方法を${target}向けにわかりやすく解説します。

## ${kw}の基本概念
${kw}とは、AIが複数のステップを自動的に処理し、人間の介入なしに成果物を生成する仕組みです。

## 導入のメリット
1. **作業時間の大幅削減** — 手作業で4時間かかる作業が15分に
2. **品質の均一化** — AI審査による一定品質の担保
3. **スケーラビリティ** — 需要増加に即座に対応

## 実装ステップ
1. ワークフロー設計
2. AIモデルの選定
3. テスト実行と調整
4. 本番デプロイ

## まとめ
${kw}の導入により、${target}のビジネスは次のステージへ進むことができます。まず小さなユースケースから試してみることを推奨します。

---
*Generated by And Planning Writing Factory · SEOスコア: 91/100 · 文字数: 2,450*`

    case 'wf-002':
      return `# ${kw}

## 記事概要
**カテゴリ**: ${inputs['category'] ?? '技術'} | **推定読了時間**: 8分 | **ターゲット**: エンジニア・プロダクトマネージャー

## アウトライン
1. はじめに — なぜ今${kw}なのか
2. 基礎概念と用語解説
3. セットアップ手順（ステップバイステップ）
4. 実践コード例
5. よくある落とし穴とその回避法
6. まとめと次のステップ

## メタ情報
- **タイトルタグ**: ${kw} 完全ガイド | 実装から運用まで
- **メタディスクリプション**: ${kw}を実務で活用するための完全ガイド。セットアップから本番運用まで解説。
- **推奨KW**: ${kw}, 実装方法, チュートリアル

---
*Generated by And Planning Writing Factory · 文字数: 1,800*`

    case 'wf-003':
      return `# ${kw} — トレンドリサーチレポート

## エグゼクティブサマリー
${kw}に関するリサーチ結果をまとめました。収集ソース数: 24、対象期間: ${inputs['period'] ?? '直近3ヶ月'}

## 主要トレンド
1. **急速な普及**: 採用率が前年比 +180% — 特にSMBセグメント
2. **技術進化**: マルチモーダル対応と長文脈処理の実用化
3. **コスト低下**: API単価が12ヶ月で平均 -65%

## 競合動向
| プレイヤー | 特徴 | 注目点 |
|-----------|------|--------|
| A社 | エンタープライズ向け | 大型調達を完了 |
| B社 | SMB特化 | 月次成長率 42% |
| C社 | API提供型 | パートナー網を拡大中 |

## 注目キーワード
#AI自動化 #ワークフロー #マルチエージェント #RAG #Function Calling

---
*Generated by And Planning Research Factory · ソース: 24件 · 信頼スコア: 87%*`

    case 'wf-004':
      return `# ${target}向け ${kw} — コンテンツ企画案

## 企画案 #1：「入門編」
**タイトル**: ${kw}をゼロから始める完全ロードマップ
**形式**: 解説記事 / 6,000字
**フック**: 「設定10分、成果は即日」

## 企画案 #2：「比較編」
**タイトル**: 主要ツール5選を徹底比較
**形式**: 比較表 + レビュー記事
**フック**: 「失敗しない選び方」

## 企画案 #3：「事例編」
**タイトル**: ${target}が実際に導入して感じた変化
**形式**: インタビュー形式
**フック**: リアルな声で信頼獲得

## 企画案 #4：「応用編」
**タイトル**: 上級テクニック集
**形式**: ハウツー記事
**フック**: 「他のユーザーが知らない方法」

---
*Generated by And Planning Creator Factory · 企画案: 4件*`

    case 'wf-005':
      return `# ${kw} — YouTube台本

## 動画概要
- **尺**: ${inputs['duration'] ?? '10分'}
- **スタイル**: ${inputs['style'] ?? '解説系'}

## オープニング（0:00–0:30）
「今日は${kw}について話します。この動画を最後まで見ると、○○ができるようになります。」

## メインコンテンツ（0:30–8:30）
**パート1「背景」（2分）**
- ${kw}とは何か
- なぜ今注目されているのか

**パート2「仕組み」（3分）**
- ステップ・バイ・ステップ解説
- 図解・スクリーンキャスト挿入ポイント

**パート3「実践」（3分）**
- デモ映像
- よくあるミスと対処法

## エンディング（8:30–10:00）
「まとめると○○です。次回は××を解説します。チャンネル登録お願いします！」

## サムネイル指示
背景: 濃紺 / メインテキスト: 「${kw}」白太字 / サブテキスト: 「完全解説」黄色

---
*Generated by And Planning Video Factory*`

    case 'wf-006':
      return `# ${kw} — SNS投稿文セット

## X (Twitter)
${kw}を試してみた。

結果：
→ 作業時間 75% 削減
→ 品質は手作業と同等以上
→ コストは月額 ¥3,000以下

これは使わない理由がない。詳しくはこちら👇
#AI自動化 #${kw.replace(/\s/g, '')}

---

## Instagram
✨ ${kw} で仕事が変わった

4時間かかっていた作業が
たった15分に⏱

AI Factory を使えば
誰でも簡単にできます

詳細はプロフィールのリンクから👆

#AI活用 #自動化 #働き方改革

---

## LinkedIn
【${target}向け】${kw}の実践的活用法

先月から導入した結果、チームの生産性が大幅に向上しました。具体的な数字はこちら：
・作業時間: -75%
・成果物品質: 維持 or 向上
・月次コスト: ¥3,000以下

特に効果的だったのが...（続きはコメント欄へ）

---
*Generated by And Planning Marketing Factory · 3プラットフォーム対応*`

    default:
      return `Workflow ${workflowId} completed successfully.\n\nInputs: ${JSON.stringify(inputs, null, 2)}`
  }
}

/* ======================================================================
   FACTORY DETAIL — outputs per factory
   Replace with: GET /api/factories/{id}/outputs
   ====================================================================== */

export const mockFactoryOutputs: FactoryOutput[] = [
  {
    id: 'out-001', factoryId: 'writing', workflowId: 'wf-001',
    title: 'Note記事: AI OS 自動化が変えるコンテンツ制作の未来',
    preview: '# AI OS 自動化が変えるコンテンツ制作の未来\n\nAI OSとは、複数のAIエージェントが連携してコンテンツ制作を自動化するシステムです。従来のツールと異なり、企画から公開まで一気通貫で処理できます。本記事では、実際の導入事例と ROI を詳しく解説します。',
    model: 'claude-sonnet-4-6', tokensUsed: 18400, createdAt: ago(3),
  },
  {
    id: 'out-002', factoryId: 'writing', workflowId: 'wf-002',
    title: 'ブログ: Next.js 16 App Router 完全解説',
    preview: '## Next.js 16 の新機能\n\nTurbopack が標準搭載となり、ビルド速度が従来比 3.7倍に向上しました。また Partial Prerendering が安定版として提供され、静的サイトと動的コンテンツのハイブリッド配信が容易になりました。',
    model: 'claude-sonnet-4-6', tokensUsed: 12200, createdAt: ago(45),
  },
  {
    id: 'out-003', factoryId: 'research', workflowId: 'wf-003',
    title: 'トレンドリポート: 生成AI × コンテンツマーケ 2025年上半期',
    preview: '## エグゼクティブサマリー\n\n2025年上半期の生成AI活用トレンドを24社・54事例から分析。最大の変化は「エージェント型AI」の急速な普及で、コンテンツ制作コストが平均 68% 削減されたことが確認されました。',
    model: 'gpt-4o', tokensUsed: 24600, createdAt: ago(90),
  },
  {
    id: 'out-004', factoryId: 'research', workflowId: 'wf-003',
    title: '競合分析: AI コンテンツ生成ツール 比較レポート 2025',
    preview: '## 調査対象\n\nJasper, Copy.ai, Notion AI, And Planning の4社を比較。評価軸: 出力品質・日本語対応・Workflow機能・価格。And Planning の差別化ポイントは Workflow Engine と Factory 分離アーキテクチャ。',
    model: 'gpt-4o', tokensUsed: 19800, createdAt: ago(400),
  },
  {
    id: 'out-005', factoryId: 'creator', workflowId: 'wf-004',
    title: 'コンテンツ企画案: AI Factory 解説シリーズ（5本連続）',
    preview: '## シリーズ概要\n\n「AI Factoryで変わる仕事術」5本連続企画。#1 概念編 → #2 セットアップ → #3 Writing活用 → #4 Research活用 → #5 ROI検証。各記事 2,000-3,000字、SEOスコア 85+ 目標。',
    model: 'claude-sonnet-4-6', tokensUsed: 8800, createdAt: ago(120),
  },
  {
    id: 'out-006', factoryId: 'video', workflowId: 'wf-005',
    title: 'YouTube台本: AI OSとは？10分で完全理解できる解説',
    preview: '## オープニング（0:00-0:30）\n「今日は話題の AI OS について、10分で完全に理解できるよう解説します。難しいと思っていた方も、この動画を見れば明日から使えるようになります」\n\n## Part1: 概念（0:30-3:00）',
    model: 'claude-opus-4-8', tokensUsed: 15200, createdAt: ago(200),
  },
  {
    id: 'out-007', factoryId: 'marketing', workflowId: 'wf-006',
    title: 'SNS投稿セット: AI OS β リリース告知（3プラットフォーム）',
    preview: '## X (Twitter)\nAI OS β版をリリースしました 🚀\n\n✅ Dashboard リアルタイム監視\n✅ Workflow 自動実行\n✅ Memory 蓄積\n\n完全無料でお試しください\n#AI自動化 #AIツール',
    model: 'claude-sonnet-4-6', tokensUsed: 4200, createdAt: ago(480),
  },
  {
    id: 'out-008', factoryId: 'fortune', workflowId: '',
    title: '今月の運勢: 2025年7月 総合運レポート',
    preview: '## 7月の総合運 ★★★★☆\n\n仕事運: 上昇気流。新プロジェクトのスタートに最適な時期。特に水曜日の決断が吉。\n\n人間関係: 協力者が現れる暗示あり。既存の人脈を大切に。',
    model: 'claude-haiku-4-5-20251001', tokensUsed: 3100, createdAt: ago(720),
  },
]

/* ======================================================================
   FACTORY DETAIL — knowledge items per factory
   Replace with: GET /api/factories/{id}/knowledge
   ====================================================================== */

export const mockFactoryKnowledge: FactoryKnowledge[] = [
  // Writing
  { id: 'kn-001', factoryId: 'writing', title: 'SEO執筆ガイドライン v2.4',      description: 'KW密度・見出し構成・メタ情報生成のルール集。Googleアルゴリズム対応済み',  type: 'reference', size: 4200,  updatedAt: ago(1440)  },
  { id: 'kn-002', factoryId: 'writing', title: '本文執筆マスタープロンプト',      description: '9ステップ記事生成の core prompt。読者の課題→解決策→事例の構成定義',      type: 'prompt',    size: 2800,  updatedAt: ago(2880)  },
  { id: 'kn-003', factoryId: 'writing', title: 'CTA文例集 v3',                  description: '業種・目的別 Call-to-Action テンプレート 48パターン収録',                  type: 'template',  size: 3600,  updatedAt: ago(5760)  },
  // Research
  { id: 'kn-004', factoryId: 'research', title: '情報収集プロンプトセット',       description: 'Web検索→フィルタリング→要約の3段階プロンプト',                           type: 'prompt',    size: 1900,  updatedAt: ago(2160)  },
  { id: 'kn-005', factoryId: 'research', title: 'レポートテンプレート v2',        description: 'エグゼクティブサマリー＋本文＋引用リスト標準形式',                         type: 'template',  size: 2100,  updatedAt: ago(4320)  },
  // Creator
  { id: 'kn-006', factoryId: 'creator', title: 'ペルソナDB 2025',               description: 'ターゲット読者12パターンの詳細プロファイル。職種・課題・情報収集チャネル', type: 'reference', size: 5800,  updatedAt: ago(3600)  },
  { id: 'kn-007', factoryId: 'creator', title: 'コンテンツ企画テンプレート',      description: 'タイトル・フック・構成・配信チャネル一体型テンプレート',                   type: 'template',  size: 2400,  updatedAt: ago(7200)  },
  // Video
  { id: 'kn-008', factoryId: 'video',   title: '台本テンプレート 3形式',         description: '解説系・エンタメ系・ドキュメンタリー形式のひな形。尺別バリエーション付き', type: 'template',  size: 6200,  updatedAt: ago(4800)  },
  { id: 'kn-009', factoryId: 'video',   title: 'サムネイルデザインガイド',        description: 'CTR改善のためのサムネイル指示書フォーマット。色・文字・構図の基準',       type: 'reference', size: 1600,  updatedAt: ago(9600)  },
  // Marketing
  { id: 'kn-010', factoryId: 'marketing', title: 'トーン&マナー定義書',          description: 'ブランドボイス・禁止表現・SNS別スタイルガイド',                           type: 'reference', size: 3200,  updatedAt: ago(2880)  },
  { id: 'kn-011', factoryId: 'marketing', title: 'ハッシュタグ辞書 v3',          description: 'カテゴリ別・フォロワー規模別・時期別ハッシュタグ集 (1,200語)',            type: 'reference', size: 8400,  updatedAt: ago(1440)  },
  // Fortune
  { id: 'kn-012', factoryId: 'fortune', title: '占術ナレッジベース',             description: '西洋占星術・四柱推命・タロットの解釈ガイドライン。24,000字の参照文書',   type: 'reference', size: 24000, updatedAt: ago(14400) },
  { id: 'kn-013', factoryId: 'fortune', title: '運勢レポートフォーマット',        description: '月次・週次・日次運勢の出力テンプレート。絵文字・星評価付き',              type: 'template',  size: 3200,  updatedAt: ago(7200)  },
]

/* ======================================================================
   FACTORY DETAIL — per-factory settings
   Replace with: GET /api/factories/{id}/settings
                 PATCH /api/factories/{id}/settings
   ====================================================================== */

export const mockFactorySettings: Record<string, FactorySettings> = {
  writing: {
    factoryId: 'writing', model: 'claude-sonnet-4-6', temperature: 0.7, maxTokens: 4096,
    systemPrompt: 'あなたは熟練したコンテンツライターです。SEOに最適化された、読者の課題を解決する高品質な記事を執筆してください。文章は自然な日本語で、専門用語は適切に解説してください。',
    autoSaveMemory: true, notifyOnComplete: true,
  },
  research: {
    factoryId: 'research', model: 'gpt-4o', temperature: 0.3, maxTokens: 8192,
    systemPrompt: 'あなたはデータ分析の専門家です。与えられたテーマについて客観的かつ包括的なリサーチを行い、根拠のある洞察を提供してください。信頼性の低い情報は除外し、出典を明示してください。',
    autoSaveMemory: true, notifyOnComplete: true,
  },
  creator: {
    factoryId: 'creator', model: 'claude-sonnet-4-6', temperature: 0.9, maxTokens: 2048,
    systemPrompt: 'あなたはクリエイティブディレクターです。ターゲット読者の心を掴む独創的なコンテンツ企画を提案してください。トレンドを踏まえつつ、ブランドの世界観を守ってください。',
    autoSaveMemory: false, notifyOnComplete: true,
  },
  video: {
    factoryId: 'video', model: 'claude-opus-4-8', temperature: 0.8, maxTokens: 8192,
    systemPrompt: 'あなたはYouTubeクリエイターのプロデューサーです。視聴者が最後まで見たくなる、エンゲージメントの高い動画台本を作成してください。冒頭3秒で掴み、適切なCTAで締めてください。',
    autoSaveMemory: true, notifyOnComplete: false,
  },
  marketing: {
    factoryId: 'marketing', model: 'claude-sonnet-4-6', temperature: 0.85, maxTokens: 2048,
    systemPrompt: 'あなたはソーシャルメディアマーケターです。エンゲージメントを最大化するコピーを作成してください。各プラットフォーム（X・Instagram・LinkedIn）の特性に合わせた投稿を作ってください。',
    autoSaveMemory: false, notifyOnComplete: false,
  },
  fortune: {
    factoryId: 'fortune', model: 'claude-haiku-4-5-20251001', temperature: 1.2, maxTokens: 1024,
    systemPrompt: 'あなたは霊験あらたかな占い師です。神秘的かつ希望に満ちた運勢を提供してください。科学的根拠より読者の心理的 wellbeing を優先し、前向きなメッセージを心がけてください。',
    autoSaveMemory: false, notifyOnComplete: false,
  },
}

/* ======================================================================
   UTILITY — format helpers (canonical versions are now in lib/utils.ts)
   ====================================================================== */

export { formatRelativeTime, formatDuration, formatTokens } from '@/lib/utils'
