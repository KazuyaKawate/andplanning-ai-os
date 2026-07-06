import { WorkflowStepId } from './workflow-types';

export interface WorkflowEventPayload {
  workflowId: string;
  stepId: WorkflowStepId;
  data: any;
  timestamp: string;
}

export type WorkflowEventListener = (event: WorkflowEventPayload) => void;

export class WorkflowEventEmitter {
  private static instance: WorkflowEventEmitter;
  private listeners: Map<string, WorkflowEventListener[]> = new Map();

  private constructor() {}

  public static getInstance(): WorkflowEventEmitter {
    if (!WorkflowEventEmitter.instance) {
      WorkflowEventEmitter.instance = new WorkflowEventEmitter();
    }
    return WorkflowEventEmitter.instance;
  }

  on(eventName: string, listener: WorkflowEventListener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(listener);
  }

  emit(eventName: string, payload: WorkflowEventPayload) {
    console.log(`[WorkflowEvent] Event emitted: ${eventName} for ${payload.stepId}`);
    this.listeners.get(eventName)?.forEach(listener => listener(payload));
  }
}
