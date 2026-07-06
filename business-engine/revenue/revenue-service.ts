import { RevenueManager } from './revenue-manager';
import { RevenueProfileData } from './revenue-types';
import revenueData from './revenue-profile.json';

export class RevenueService {
  private static instance: RevenueService;
  private manager: RevenueManager;

  private constructor() {
    this.manager = new RevenueManager(revenueData as RevenueProfileData);
  }

  public static getInstance(): RevenueService {
    if (!RevenueService.instance) {
      RevenueService.instance = new RevenueService();
    }
    return RevenueService.instance;
  }

  public getRevenueSummary(period: string) {
    return this.manager.generateSummary(period);
  }

  public getManager(): RevenueManager {
    return this.manager;
  }
}
