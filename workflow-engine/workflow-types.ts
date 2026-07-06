export type WorkflowStepId = 
  | 'BrandUpdate' 
  | 'ContentGeneration' 
  | 'SocialPostPrep' 
  | 'MarketingRegistration' 
  | 'PostExecution' 
  | 'AnalyticsCollection' 
  | 'RevenueUpdate' 
  | 'DashboardNotification';

export type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'waiting_approval';

export interface WorkflowStep {
  id: WorkflowStepId;
  name: string;
  status: WorkflowStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: any;
}

export interface BusinessWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowEvent {
  type: string;
  workflowId: string;
  stepId: WorkflowStepId;
  payload: any;
  timestamp: string;
}
