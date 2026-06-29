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
