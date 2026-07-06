import { MarketingManager } from './marketing-manager';
import { MarketingProfileData } from './marketing-types';
import marketingData from './marketing-profile.json';

export class MarketingService {
  private static instance: MarketingService;
  private manager: MarketingManager;

  private constructor() {
    this.manager = new MarketingManager(marketingData as MarketingProfileData);
  }

  public static getInstance(): MarketingService {
    if (!MarketingService.instance) {
      MarketingService.instance = new MarketingService();
    }
    return MarketingService.instance;
  }

  public getCampaigns() {
    return this.manager.getCampaigns();
  }

  public getManager(): MarketingManager {
    return this.manager;
  }
}
