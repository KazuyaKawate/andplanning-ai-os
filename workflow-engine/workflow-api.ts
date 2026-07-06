import { WorkflowService } from './workflow-service';

/**
 * Workflow Engine API
 */
export const runLaunchWorkflow = async () => {
  const service = WorkflowService.getInstance();
  const workflowId = await service.startLaunchWorkflow();
  return {
    ok: true,
    workflowId,
    message: "Launch & Monetization workflow has been initialized."
  };
};

export const getWorkflowStatus = async (id: string) => {
  const service = WorkflowService.getInstance();
  const status = service.getStatus(id);
  if (!status) {
    return { ok: false, error: "Workflow not found" };
  }
  return {
    ok: true,
    data: status
  };
};
