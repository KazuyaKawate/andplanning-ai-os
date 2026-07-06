export type DashboardEventType = 
  | 'brand_updated' 
  | 'content_created' 
  | 'social_synced' 
  | 'workflow_completed' 
  | 'revenue_updated' 
  | 'analytics_updated';

export interface DashboardEventPayload {
  type: DashboardEventType;
  data: any;
  timestamp: string;
}

export type DashboardEventListener = (event: DashboardEventPayload) => void;

export class DashboardEventEmitter {
  private static instance: DashboardEventEmitter;
  private listeners: Map<string, DashboardEventListener[]> = new Map();

  private constructor() {}

  public static getInstance(): DashboardEventEmitter {
    if (!DashboardEventEmitter.instance) {
      DashboardEventEmitter.instance = new DashboardEventEmitter();
    }
    return DashboardEventEmitter.instance;
  }

  on(type: DashboardEventType, listener: DashboardEventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  emit(type: DashboardEventType, data: any) {
    const payload: DashboardEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    console.log(`[DashboardEvent] Emitting: ${type}`);
    this.listeners.get(type)?.forEach(listener => listener(payload));
  }
}
