import { BrandService } from './brand-service';

/**
 * Brand API (Mock logic for Business Engine Integration)
 * In a real implementation, this would be integrated with FastAPI/Next.js routes.
 */
export const getBrandProfile = async () => {
  const service = BrandService.getInstance();
  return {
    ok: true,
    data: service.getBrandInfo()
  };
};

export const getSocialLinks = async () => {
  const service = BrandService.getInstance();
  return {
    ok: true,
    data: service.getActiveSocials()
  };
};
