import { WorkflowEventEmitter } from './workflow-event';
import { WorkflowStepId } from './workflow-types';
import { BrandService } from '../business-engine/brand/brand-service';
import { ContentService } from '../business-engine/content/content-service';
import { SocialService } from '../business-engine/social/social-service';
import { AnalyticsService } from '../business-engine/analytics/analytics-service';
import { RevenueService } from '../business-engine/revenue/revenue-service';

export class WorkflowRunner {
  private emitter = WorkflowEventEmitter.getInstance();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Brand更新 -> Content生成
    this.emitter.on('step_completed:BrandUpdate', (ev) => {
      this.runStep(ev.workflowId, 'ContentGeneration');
    });

    // Content生成 -> Social Hub 同期
    this.emitter.on('step_completed:ContentGeneration', (ev) => {
      this.runStep(ev.workflowId, 'SocialPostPrep');
    });

    // Social Hub 同期 -> Analytics 記録
    this.emitter.on('step_completed:SocialPostPrep', (ev) => {
      this.runStep(ev.workflowId, 'AnalyticsCollection');
    });

    // Analytics 記録 -> Revenue 更新
    this.emitter.on('step_completed:AnalyticsCollection', (ev) => {
      this.runStep(ev.workflowId, 'RevenueUpdate');
    });

    // Revenue 更新 -> Dashboard 通知
    this.emitter.on('step_completed:RevenueUpdate', (ev) => {
      this.runStep(ev.workflowId, 'DashboardNotification');
    });
  }

  async runStep(workflowId: string, stepId: WorkflowStepId) {
    console.log(`[WorkflowRunner] Running step: ${stepId}`);
    
    let result: any;
    
    // 各モジュールの実呼び出し (シミュレーション)
    switch(stepId) {
      case 'BrandUpdate':
        result = BrandService.getInstance().getBrandInfo();
        break;
      case 'ContentGeneration':
        result = ContentService.getInstance().getEntries();
        break;
      case 'SocialPostPrep':
        result = SocialService.getInstance().getAccounts();
        break;
      case 'AnalyticsCollection':
        result = AnalyticsService.getInstance().getSnapshots();
        break;
      case 'RevenueUpdate':
        result = RevenueService.getInstance().getRevenueSummary('2026-07');
        break;
      case 'DashboardNotification':
        result = { notified: true };
        console.log(">>> AIOS WORKFLOW COMPLETED SUCCESSFULLY <<<");
        break;
    }

    this.emitter.emit(`step_completed:${stepId}`, {
      workflowId,
      stepId,
      data: result,
      timestamp: new Date().toISOString()
    });
  }
}
