import { SocialService } from './social-service';
import { BrandService } from '../brand/brand-service';

/**
 * Social Hub API
 */
export const getSocialAccounts = async () => {
  const service = SocialService.getInstance();
  return {
    ok: true,
    data: service.getAccounts()
  };
};

/**
 * Brand Manager との同期を実行するアクション
 */
export const syncAllSocialsWithBrand = async () => {
  const socialService = SocialService.getInstance();
  const brandService = BrandService.getInstance();
  
  const brandProfile = brandService.getBrandInfo();
  socialService.getManager().syncWithBrandProfile(brandProfile);
  
  return {
    ok: true,
    message: "All social profiles are queued for synchronization with Brand Profile."
  };
};
