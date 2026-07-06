import { 
  BusinessWorkflow, 
  WorkflowStep, 
  WorkflowStepId, 
  WorkflowStatus, 
  WorkflowEvent 
} from './workflow-types';
import { BrandService } from '../business-engine/brand/brand-service';
import { SocialService } from '../business-engine/social/social-service';
import { ContentService } from '../business-engine/content/content-service';
import { MarketingService } from '../business-engine/marketing/marketing-service';
import { AnalyticsService } from '../business-engine/analytics/analytics-service';
import { RevenueService } from '../business-engine/revenue/revenue-service';

export class WorkflowManager {
  private activeWorkflows: Map<string, BusinessWorkflow> = new Map();

  constructor() {}

  /**
   * 新しいビジネスワークフローを開始する
   */
  async startBusinessWorkflow(name: string): Promise<string> {
    const id = `wf-${Date.now()}`;
    const workflow: BusinessWorkflow = {
      id,
      name,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: this.createDefaultSteps()
    };

    this.activeWorkflows.set(id, workflow);
    console.log(`[WorkflowEngine] Started new workflow: ${name} (${id})`);

    // 最初のステップを開始
    this.executeStep(id, 'BrandUpdate');
    
    return id;
  }

  private createDefaultSteps(): WorkflowStep[] {
    const stepIds: WorkflowStepId[] = [
      'BrandUpdate', 'ContentGeneration', 'SocialPostPrep', 
      'MarketingRegistration', 'PostExecution', 'AnalyticsCollection', 
      'RevenueUpdate', 'DashboardNotification'
    ];

    return stepIds.map(id => ({
      id,
      name: id.replace(/([A-Z])/g, ' $1').trim(),
      status: 'idle'
    }));
  }

  /**
   * ステップの実行ロジック (イベント駆動のシミュレーション)
   */
  private async executeStep(workflowId: string, stepId: WorkflowStepId) {
    const wf = this.activeWorkflows.get(workflowId);
    if (!wf) return;

    const step = wf.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'running';
    step.startedAt = new Date().toISOString();
    wf.updatedAt = new Date().toISOString();

    try {
      console.log(`[WorkflowEngine] Executing step: ${stepId} for workflow ${workflowId}`);
      
      let output: any = null;

      // 各Engineとの連携
      switch (stepId) {
        case 'BrandUpdate':
          output = BrandService.getInstance().getBrandInfo();
          break;
        case 'ContentGeneration':
          output = ContentService.getInstance().getEntries();
          break;
        case 'SocialPostPrep':
          output = SocialService.getInstance().getAccounts();
          break;
        case 'MarketingRegistration':
          output = MarketingService.getInstance().getCampaigns();
          break;
        case 'AnalyticsCollection':
          output = AnalyticsService.getInstance().getSnapshots();
          break;
        case 'RevenueUpdate':
          output = RevenueService.getInstance().getRevenueSummary('2026-07');
          break;
        default:
          output = { success: true };
      }

      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      step.output = output;

      // 次のステップを判定して実行
      this.triggerNextStep(workflowId, stepId);

    } catch (err) {
      step.status = 'failed';
      step.error = err instanceof Error ? err.message : String(err);
      wf.status = 'failed';
      console.error(`[WorkflowEngine] Step ${stepId} failed: ${step.error}`);
    }
  }

  private triggerNextStep(workflowId: string, currentStepId: WorkflowStepId) {
    const wf = this.activeWorkflows.get(workflowId);
    if (!wf) return;

    const currentIndex = wf.steps.findIndex(s => s.id === currentStepId);
    if (currentIndex < wf.steps.length - 1) {
      const nextStepId = wf.steps[currentIndex + 1].id;
      this.executeStep(workflowId, nextStepId);
    } else {
      wf.status = 'completed';
      wf.updatedAt = new Date().toISOString();
      console.log(`[WorkflowEngine] Workflow ${workflowId} completed successfully!`);
    }
  }

  getWorkflowStatus(id: string): BusinessWorkflow | undefined {
    return this.activeWorkflows.get(id);
  }
}
