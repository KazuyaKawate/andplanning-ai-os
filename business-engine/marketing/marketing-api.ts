import { MarketingService } from './marketing-service';

/**
 * Marketing Manager API
 */
export const getMarketingCampaigns = async () => {
  const service = MarketingService.getInstance();
  return {
    ok: true,
    data: service.getCampaigns()
  };
};

/**
 * キャンペーンの配信計画をコンテンツと同期させる
 */
export const syncCampaignPlans = async (campaignId: string) => {
  const service = MarketingService.getInstance();
  service.getManager().syncDeliveryPlans(campaignId);
  
  return {
    ok: true,
    data: service.getManager().getCampaignById(campaignId)
  };
};

/**
 * 将来の Analytics 連携用
 */
export const updateCampaignStats = async (campaignId: string, clicks: number, impressions: number) => {
  const service = MarketingService.getInstance();
  service.getManager().updateKPI(campaignId, { clicks, impressions });
  
  return {
    ok: true,
    message: "KPI updated successfully"
  };
};
