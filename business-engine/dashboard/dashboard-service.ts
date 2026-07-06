import { DashboardEventEmitter, DashboardEventPayload } from './dashboard-event';

export interface DashboardState {
  lastUpdated: string;
  recentEvents: DashboardEventPayload[];
  stats: {
    brandName: string;
    contentCount: number;
    activeSocials: number;
    totalRevenue: number;
  };
}

export class DashboardService {
  private static instance: DashboardService;
  private emitter = DashboardEventEmitter.getInstance();
  private state: DashboardState;

  private constructor() {
    this.state = {
      lastUpdated: new Date().toISOString(),
      recentEvents: [],
      stats: {
        brandName: 'AIOS',
        contentCount: 0,
        activeSocials: 0,
        totalRevenue: 0
      }
    };
    this.setupListeners();
  }

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  private setupListeners() {
    this.emitter.on('brand_updated', (ev) => this.updateState(ev));
    this.emitter.on('content_created', (ev) => this.updateState(ev));
    this.emitter.on('social_synced', (ev) => this.updateState(ev));
    this.emitter.on('workflow_completed', (ev) => this.updateState(ev));
    this.emitter.on('revenue_updated', (ev) => this.updateState(ev));
    this.emitter.on('analytics_updated', (ev) => this.updateState(ev));
  }

  private updateState(event: DashboardEventPayload) {
    this.state.lastUpdated = event.timestamp;
    this.state.recentEvents = [event, ...this.state.recentEvents].slice(0, 10);

    // 特定のイベントに基づいた統計の更新
    switch (event.type) {
      case 'brand_updated':
        this.state.stats.brandName = event.data.name;
        break;
      case 'content_created':
        this.state.stats.contentCount += 1;
        break;
      case 'revenue_updated':
        this.state.stats.totalRevenue += (event.data.amount || 0);
        break;
    }

    console.log(`[DashboardService] State updated via ${event.type}`);
  }

  public getState(): DashboardState {
    return this.state;
  }
}
