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
  workflowIds:  string[]
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

export type DashboardMetrics = {
  totalRunsToday:    number
  activeWorkflows:   number
  queueDepth:        number
  memoryItems:       number
  successRateToday:  number
  tokensUsedToday:   number
  activeFactories:   number
  errorsToday:       number
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
  type:        'text' | 'textarea'
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
  apiKeys: {
    openai:    string
    anthropic: string
    google:    string
  }
}
