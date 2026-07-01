export type NavItem = {
  label: string
  href: string
}

export type Factory = {
  id: string
  name: string
  nameJa: string
  descriptionJa: string
  icon: string
  status: 'active' | 'stub' | 'planned'
  accentColor: string
  features: string[]
  releaseLabel: string
}

export type OsComponent = {
  id: string
  name: string
  descriptionJa: string
  icon: string
}

export type OsLayer = {
  id: string
  title: string
  titleJa: string
  components: OsComponent[]
}

export type RoadmapItem = {
  date: string
  title: string
  descriptionJa: string
  status: 'completed' | 'in-progress' | 'planned'
  isHighlight?: boolean
}

export type Phase = {
  number: number
  title: string
  description: string
  status: 'completed' | 'in-progress' | 'planned'
  percentage: number
}

export type NewsItem = {
  id: string
  title: string
  date: string
  category: string
  href: string
}

export type SocialLink = {
  id:       string
  label:    string
  href:     string
  icon:     'github' | 'x' | 'note' | 'email'
  external: boolean
}

export type LegalLink = {
  label: string
  href:  string
}

/* ======================================================
   AI OS — Runtime types
   ====================================================== */

export type WorkflowStatus = 'running' | 'paused' | 'completed' | 'failed' | 'queued' | 'idle'
export type FactoryStatus  = 'active' | 'idle' | 'error' | 'disabled'
export type MemoryTag      = 'article' | 'research' | 'task' | 'conversation' | 'system'

export type WorkflowStep = {
  id:       string
  name:     string
  status:   'pending' | 'running' | 'done' | 'error'
  durationMs?: number
  output?:  string
}

export type WorkflowRun = {
  id:          string
  workflowId:  string
  workflowName: string
  factoryId:   string
  status:      WorkflowStatus
  startedAt:   string
  endedAt?:    string
  steps:       WorkflowStep[]
  inputSummary: string
  outputSummary?: string
  model:       string
  tokensUsed?: number
  costUsd?:    number
}

export type Workflow = {
  id:          string
  name:        string
  nameJa:      string
  description: string
  factoryId:   string
  stepCount:   number
  avgDurationMs: number
  lastRunAt?:  string
  totalRuns:   number
  successRate: number
  status:      WorkflowStatus
  tags:        string[]
}

export type FactoryRuntime = {
  id:           string
  name:         string
  nameJa:       string
  icon:         string
  accentColor:  string
  status:       FactoryStatus
  activeWorkflows: number
  queuedTasks:  number
  completedToday: number
  errorCount:   number
  lastActivity: string
  memoryItems:  number
  workflowIds?: string[]
}

export type QueueItem = {
  id:         string
  workflowId: string
  factoryId:  string
  name:       string
  priority:   'high' | 'normal' | 'low'
  createdAt:  string
  status:     'queued' | 'running'
}

export type ActivityItem = {
  id:        string
  type:      'run_complete' | 'run_start' | 'run_error' | 'memory_save' | 'settings_change'
  message:   string
  factoryId?: string
  timestamp: string
  meta?:     Record<string, string | number>
}

export type MemoryEntry = {
  id:          string
  title:       string
  summary:     string
  factoryId:   string
  workflowId?: string
  tags:        MemoryTag[]
  createdAt:   string
  size:        number
  model:       string
}

export type AgentStatItem = {
  agentId:   string
  agentName: string
  icon:      string
  runsToday: number
}

export type DashboardMetrics = {
  // Workflow stats
  totalRunsToday:    number
  activeWorkflows:   number
  queueDepth:        number
  memoryItems:       number
  successRateToday:  number
  tokensUsedToday:   number
  activeFactories:   number
  errorsToday:       number
  costToday:         number
  // Agent stats
  agentRunsToday:         number
  virtualClaudeRunsToday: number
  realClaudeRunsToday:    number
  claudeMode:             'auto' | 'real' | 'virtual'
  topAgents:              AgentStatItem[]
}

export type ModelOption = {
  id:       string
  name:     string
  provider: 'openai' | 'anthropic' | 'google'
  maxTokens: number
  contextWindow: number
}

export type WorkflowInputField = {
  id:          string
  label:       string
  placeholder: string
  required:    boolean
  type:        'text' | 'textarea' | 'select'
  options?:    string[]
}

export type KnowledgeType = 'prompt' | 'template' | 'reference' | 'example'

export type FactoryOutput = {
  id:         string
  factoryId:  string
  workflowId: string
  title:      string
  preview:    string
  model:      string
  tokensUsed: number
  createdAt:  string
}

export type FactoryKnowledge = {
  id:          string
  factoryId:   string
  title:       string
  description: string
  type:        KnowledgeType
  size:        number
  updatedAt:   string
}

export type FactorySettings = {
  factoryId:        string
  model:            string
  temperature:      number
  maxTokens:        number
  systemPrompt:     string
  autoSaveMemory:   boolean
  notifyOnComplete: boolean
}

export type OsSettings = {
  defaultModel:      string
  fallbackModel:     string
  maxConcurrentRuns: number
  memoryRetentionDays: number
  notifyOnComplete:  boolean
  notifyOnError:     boolean
  theme:             'dark' | 'light' | 'system'
  language:          'ja' | 'en'
  claudeMode:        'auto' | 'real' | 'virtual'
  apiKeys: {
    openai:    string
    anthropic: string
    google:    string
  }
}

export interface VirtualAgent {
  id:                string
  name:              string
  nameJa:            string
  role:              string
  category?:         string
  description:       string
  icon:              string
  preferredProvider: string
  preferredModel?:   string
  memoryScope:       string
  outputFormat:      string
  routingKeywords:   string[]
  priority:          number
  version:           number
  isEnabled:         boolean
  isBuiltin:         boolean
  createdAt:         string
  updatedAt?:        string
  totalRuns?:        number
  successRate?:      number
  lastRunAt?:        string | null
}

export interface VirtualAgentDetail extends VirtualAgent {
  systemPrompt: string
  updatedAt:    string
  totalRuns:    number
  successRate:  number
  lastRunAt:    string | null
}

export interface AgentCreateRequest {
  id:                string
  name:              string
  nameJa:            string
  role:              string
  category?:         string
  description?:      string
  icon?:             string
  systemPrompt:      string
  preferredProvider?: string
  preferredModel?:   string
  memoryScope?:      string
  outputFormat?:     string
  routingKeywords:   string[]
  priority?:         number
}

export interface AgentUpdateRequest {
  name?:              string
  nameJa?:            string
  role?:              string
  category?:          string
  description?:       string
  icon?:              string
  systemPrompt?:      string
  preferredProvider?: string
  preferredModel?:    string
  memoryScope?:       string
  outputFormat?:      string
  routingKeywords?:   string[]
  priority?:          number
  isEnabled?:         boolean
}

export interface AgentTestResult {
  agentId:      string
  agentName:    string
  modelUsed:    string
  isRealClaude: boolean
  output:       string
  tokensUsed:   number
  costUsd:      number
  durationMs:   number
  success:      boolean
  executionId:  string
}

/* ======================================================
   Virtual Claude Dev types
   ====================================================== */

export type DevFileNode = {
  name:      string
  path:      string
  type:      'file' | 'dir'
  size?:     number
  children?: DevFileNode[]
}

export type DevPatch = {
  id:              string
  title:           string
  filePath:        string
  originalContent: string
  newContent:      string
  aiExplanation:   string
  riskLevel:       'low' | 'medium' | 'high'
  status:          'pending' | 'applied' | 'rejected'
  createdAt:       string
  appliedAt?:      string
}

export type DevHistoryEntry = {
  id:         string
  action:     'chat' | 'plan' | 'patch' | 'apply' | 'reject' | 'inspect'
  summary:    string
  filePath?:  string
  patchId?:   string
  modelUsed?: string
  tokens?:    number
  createdAt:  string
}

/* ======================================================
   AI Team Collaboration — Phase 4
   ====================================================== */

export type CollaborateEvent =
  | { type: 'session_start'; sessionId: string; goal: string; timestamp: string }
  | { type: 'agent_start';   agent: string; icon: string; phase: string; timestamp: string }
  | { type: 'content';       agent: string; text: string; timestamp: string }
  | { type: 'agent_done';    agent: string; summary: string; modelUsed?: string; timestamp: string }
  | { type: 'task_created';  taskId: string; title: string; agent: string; filePath?: string | null; timestamp: string }
  | { type: 'patch_created'; patchId: string; filePath: string; title: string; agent: string; isNew: boolean; timestamp: string }
  | { type: 'review_result'; verdict: string; timestamp: string }
  | { type: 'error';         agent: string; message: string }
  | { type: 'done';          sessionId: string; taskCount: number; patchCount: number; patchIds: string[]; timestamp: string }

/* ======================================================
   Virtual Claude Team types
   ====================================================== */

export type AgentTaskStatus = 'pending' | 'in_progress' | 'review' | 'blocked' | 'completed' | 'failed'

export type AgentTask = {
  id:          string
  sessionId:   string | null
  agentId:     string | null
  title:       string
  description: string
  status:      AgentTaskStatus
  priority:    number
  dependsOn:   string[]
  filePath:    string | null
  patchId:     string | null
  output:      string | null
  errorMsg:    string | null
  tokensUsed:  number | null
  createdAt:   string
  startedAt:   string | null
  completedAt: string | null
}

export type TeamSession = {
  id:             string
  goal:           string
  status:         'planning' | 'active' | 'paused' | 'completed' | 'failed'
  plan:           string | null
  agentsAssigned: string[]
  taskCount:      number
  completedTasks: number
  modelUsed:      string | null
  tokens:         number | null
  createdAt:      string
  updatedAt:      string
}

export type AgentMessage = {
  id:          string
  sessionId:   string | null
  fromAgent:   string
  toAgent:     string | null
  messageType: 'task' | 'review' | 'approve' | 'reject' | 'info' | 'error' | 'plan'
  content:     string
  taskId:      string | null
  patchId:     string | null
  createdAt:   string
}

export type TeamStatus = {
  active_agents:      number
  idle_agents:        number
  total_agents:       number
  pending_tasks:      number
  in_progress_tasks:  number
  completed_tasks:    number
  failed_tasks:       number
  total_sessions:     number
  total_tokens:       number
  recent_activity:    string[]
}

/* ======================================================
   Auto Debugger types
   ====================================================== */

export type DebugStatus = {
  uptime_ok:           boolean
  db_ok:               boolean
  error_rate:          number
  errors_today:        number
  runs_today:          number
  failed_runs:         FailedRunSummary[]
  debug_sessions_total: number
}

export type FailedRunSummary = {
  id:           string
  workflowName: string
  factoryId:    string
  startedAt:    string
  inputSummary: string
}

export type DebugLogEntry = {
  id:        string
  timestamp: string
  level:     'ERROR' | 'WARNING' | 'INFO'
  message:   string
  source:    string
  detail?:   string
}

export type DebugSession = {
  id:           string
  errorText:    string
  errorType:    string | null
  severity:     'low' | 'medium' | 'high' | 'critical'
  source:       string
  rootCause:    string | null
  suggestedFix: string | null
  fullAnalysis: string | null
  patchId:      string | null
  modelUsed:    string | null
  status:       'analyzing' | 'analyzed' | 'patched' | 'resolved'
  createdAt:    string
}

export interface AgentRunResult {
  agentId:      string
  agentName:    string
  modelUsed:    string
  isRealClaude: boolean
  output:       string
  tokensUsed:   number
  costUsd:      number
  executionId:  string
}

/* ======================================================
   Authentication
   ====================================================== */

export type AuthUser = {
  id:           string
  email:        string
  display_name: string
  role:         'admin' | 'user'
  is_active:    boolean
  created_at:   string
}

export type AuthResponse = {
  access_token: string
  token_type:   string
  user:         AuthUser
}

/* ======================================================
   Notifications
   ====================================================== */

export type NotificationType =
  | 'run_complete' | 'run_error' | 'patch_created'
  | 'patch_applied' | 'patch_rejected' | 'error' | 'info'

export type Notification = {
  id:         string
  type:       NotificationType
  title:      string
  body:       string
  link:       string | null
  is_read:    boolean
  created_at: string
}

export interface ChatSession {
  id: string
  factoryId?: string
  title: string
  model: string
  totalTokens: number
  totalCost: number
  createdAt: string
  updatedAt: string
  messageCount: number
}

/* ======================================================
   Self-Evolution Engine
   ====================================================== */

export type TechDebtLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown'
export type SuggestionCategory = 'feature' | 'refactor' | 'security' | 'perf' | 'ux'
export type SuggestionDifficulty = 'easy' | 'medium' | 'hard'
export type SuggestionStatus = 'pending' | 'in_progress' | 'done' | 'dismissed'

export type ProjectScan = {
  py_files:      number
  ts_files:      number
  total_files:   number
  py_lines:      number
  ts_lines:      number
  total_lines:   number
  page_routes:   number
  api_routers:   number
  api_endpoints: number
  service_files: number
  db_models:     number
  py_deps:       number
  npm_deps:      number
  pages:         string[]
  routers:       string[]
  services:      string[]
}

export type ProjectHealth = {
  id:                 string | null
  completionPct:      number
  technicalDebt:      TechDebtLevel
  criticalBugs:       number
  estimatedRelease:   string | null
  fileCount:          number
  lineCount:          number
  openPatches:        number
  pendingSuggestions: number
  tsErrors:           number
  pyIssues:           number
  summary:            string | null
  createdAt:          string | null
  scan:               ProjectScan
}

export type ImprovementSuggestion = {
  id:              string
  title:           string
  description:     string
  category:        SuggestionCategory
  reason:          string
  expectedBenefit: string
  difficulty:      SuggestionDifficulty
  priority:        number
  estimatedHours:  number | null
  roiScore:        number | null
  status:          SuggestionStatus
  isQuickWin:      boolean
  createdAt:       string
}

export type QualitySnapshot = {
  id:             string
  tsErrors:       number
  pyIssues:       number
  buildOk:        boolean
  totalFiles:     number
  totalLines:     number
  duplicateScore: number | null
  complexityAvg:  number | null
  securityIssues: number
  depIssues:      number
  createdAt:      string
}

export type ArchitectureAnalysis = {
  id:              string
  riskScore:       number
  maintainability: number
  performance:     number
  securityScore:   number
  issues:          string[]
  suggestions:     string[]
  fullAnalysis:    string | null
  modelUsed:       string | null
  createdAt:       string
}

export type LessonLearned = {
  id:              string
  workflowRunId:   string | null
  factoryId:       string | null
  whatImproved:    string
  whatToImprove:   string
  archChanges:     string | null
  workflowChanges: string | null
  modelUsed:       string | null
  createdAt:       string
}

export type EvolutionReport = {
  id:             string
  reportType:     string
  title:          string
  contentMd:      string
  filesChanged:   string[]
  featuresDone:   string[]
  risks:          string[]
  remainingWork:  string | null
  estLaunchDate:  string | null
  modelUsed:      string | null
  createdAt:      string
}

export type EvolutionEvent =
  | { type: 'scan_start';        scanId: string }
  | { type: 'scan_done';         scanId: string; completionPct: number; technicalDebt: string; criticalBugs: number; estimatedRelease: string | null }
  | { type: 'generating';        count: number }
  | { type: 'suggestions_done';  saved: number; modelUsed: string }
  | { type: 'parse_error';       message: string }
  | { type: 'architect_start';   analysisId: string }
  | { type: 'architect_done';    analysisId: string; riskScore: number; maintainability: number; performance: number; securityScore: number; issueCount: number }
  | { type: 'roadmap_start';     reportId: string }
  | { type: 'roadmap_done';      reportId: string; estLaunchDate: string | null }
  | { type: 'report_start';      reportId: string }
  | { type: 'report_done';       reportId: string; estLaunchDate: string | null }
  | { type: 'content';           content: string }
  | { type: 'error';             message: string }

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  tokens?: number
  costUsd?: number
  createdAt: string
}

/* ======================================================
   Organization — Business Engine Phase 1
   ====================================================== */

export type OrgPlan = 'free' | 'pro' | 'enterprise'
export type OrgRole = 'owner' | 'admin' | 'developer' | 'viewer' | 'platform_admin'
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type Organization = {
  id:          string
  name:        string
  slug:        string
  description: string
  plan:        OrgPlan
  owner_id:    string
  max_members: number
  is_active:   boolean
  avatar_url:  string | null
  website_url: string | null
  member_count: number
  created_at:  string
  updated_at:  string
}

export type OrgMember = {
  user_id:      string
  email:        string
  display_name: string
  role:         OrgRole
  joined_at:    string
}

export type OrgInvite = {
  id:         string
  org_id:     string
  email:      string
  role:       OrgRole
  invited_by: string
  status:     InviteStatus
  expires_at: string
  created_at: string
}

export type OrgCreateRequest = {
  name:        string
  description?: string
}

export type OrgUpdateRequest = {
  name?:        string
  description?: string
  avatar_url?:  string
  website_url?: string
}

export type OrgInviteRequest = {
  email: string
  role:  'admin' | 'developer' | 'viewer'
}

/* ======================================================
   AIOS Executor — Phase 1
   ====================================================== */

export type ExecutorStatus =
  | 'pending'
  | 'planning'
  | 'planned'
  | 'patching'
  | 'awaiting_approval'
  | 'applying'
  | 'applied'
  | 'testing'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type ExecutorProvider = 'auto' | 'anthropic' | 'google' | 'openai' | 'ollama'

export type ExecutorTestCheck = {
  name:   string
  ok:     boolean
  detail: string
}

export type ExecutorTestResult = {
  ok:      boolean
  checks:  ExecutorTestCheck[]
  summary: string
}

export type ExecutorTask = {
  id:             string
  title:          string
  instruction:    string
  status:         ExecutorStatus
  priority:       number
  provider:       ExecutorProvider
  model:          string | null
  created_by:     string | null
  assigned_agent: string
  target_files:   string[]
  plan_content:   string | null
  patch_id:       string | null
  test_result:    ExecutorTestResult | null
  report:         string | null
  error_msg:      string | null
  created_at:     string
  updated_at:     string
}

export type ExecutorTaskCreateRequest = {
  title:        string
  instruction:  string
  target_files?: string[]
  priority?:    number
  provider?:    ExecutorProvider
  model?:       string
}

/* ======================================================
   Business Engine — Phase 4
   ====================================================== */

export type BusinessClient = {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: 'active' | 'inactive' | 'lead'
  created_at: string
}

export type BusinessClientCreate = {
  name: string
  company?: string
  email?: string
  phone?: string
  status?: string
}

export type BusinessDeal = {
  id: number
  client_id: number
  title: string
  status: 'lead' | 'proposal' | 'negotiation' | 'won' | 'lost'
  amount: number | null
  expected_close_date: string | null
  memo: string | null
  created_at: string
}

export type BusinessDealCreate = {
  client_id: number
  title: string
  status?: string
  amount?: number
  expected_close_date?: string
  memo?: string
}

export type BusinessTask = {
  id: number
  deal_id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'failed' | 'done'
  result_text: string | null
  executed_at: string | null
  error_msg: string | null
  created_at: string
}

export type BusinessTaskCreate = {
  deal_id: number
  title: string
  description?: string
  status?: string
}

