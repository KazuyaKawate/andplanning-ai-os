import { WorkflowManager } from './workflow-manager';

export class WorkflowService {
  private static instance: WorkflowService;
  private manager: WorkflowManager;

  private constructor() {
    this.manager = new WorkflowManager();
  }

  public static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  public async startLaunchWorkflow() {
    return this.manager.startBusinessWorkflow("Full AIOS Launch & Monetization Workflow");
  }

  public getStatus(id: string) {
    return this.manager.getWorkflowStatus(id);
  }
}
