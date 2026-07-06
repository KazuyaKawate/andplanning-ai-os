import { AnalyticsManager } from './analytics-manager';
import { AnalyticsProfileData, TimeGrain } from './analytics-types';
import analyticsData from './analytics-profile.json';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private manager: AnalyticsManager;

  private constructor() {
    this.manager = new AnalyticsManager(analyticsData as AnalyticsProfileData);
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public getSnapshots() {
    return this.manager.getSnapshots();
  }

  public getReport(brandId: string, grain: TimeGrain) {
    return this.manager.generateReport(brandId, grain);
  }

  public getManager(): AnalyticsManager {
    return this.manager;
  }
}
