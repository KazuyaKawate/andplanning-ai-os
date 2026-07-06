import { BrandManager, BrandProfile } from './brand-manager';
import brandData from './brand-profile.json';

export class BrandService {
  private static instance: BrandService;
  private manager: BrandManager;

  private constructor() {
    // In a real TS environment, you'd need to ensure the JSON matches the interface
    this.manager = new BrandManager(brandData as BrandProfile);
  }

  public static getInstance(): BrandService {
    if (!BrandService.instance) {
      BrandService.instance = new BrandService();
    }
    return BrandService.instance;
  }

  public getBrandInfo(): BrandProfile {
    return this.manager.getProfile();
  }

  public getActiveSocials() {
    return this.manager.getSnsLinks(true);
  }
}
