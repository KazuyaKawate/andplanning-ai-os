import { SocialManager } from './social-manager';
import { SocialProfileData } from './social-types';
import socialData from './social-profile.json';

export class SocialService {
  private static instance: SocialService;
  private manager: SocialManager;

  private constructor() {
    this.manager = new SocialManager(socialData as SocialProfileData);
  }

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  public getAccounts() {
    return this.manager.getAccounts();
  }

  public getManager(): SocialManager {
    return this.manager;
  }
}
