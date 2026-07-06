import { MarketingCampaign, MarketingProfileData, MarketingPlanItem } from './marketing-types';
import { ContentService } from '../content/content-service';
import { SocialService } from '../social/social-service';
import { BrandService } from '../brand/brand-service';

export class MarketingManager {
  private data: MarketingProfileData;

  constructor(data: MarketingProfileData) {
    this.data = data;
  }

  getCampaigns(): MarketingCampaign[] {
    return this.data.campaigns;
  }

  getCampaignById(id: string): MarketingCampaign | undefined {
    return this.data.campaigns.find(c => c.id === id);
  }

  /**
   * Content Manager からコンテンツを取得し、配信計画を自動生成・更新する
   */
  syncDeliveryPlans(campaignId: string): void {
    const campaign = this.getCampaignById(campaignId);
    if (!campaign) return;

    const contentEntries = ContentService.getInstance().getEntries();
    const brand = BrandService.getInstance().getBrandInfo();

    // キャンペーンに関連するコンテンツをフィルタリングして計画に追加
    contentEntries.forEach(content => {
      // 例: キャンペーン名がタイトルに含まれる、またはカテゴリが一致する場合
      if (content.category === 'Announcements' || content.title.includes('β版')) {
        content.targetPlatforms.forEach(platform => {
          // 既に計画にない場合のみ追加
          const exists = campaign.plan.some(p => p.contentId === content.id && p.platform === platform);
          
          if (!exists) {
            const planItem: MarketingPlanItem = {
              contentId: content.id,
              platform: platform,
              scheduledAt: content.scheduledAt || new Date().toISOString(),
              status: 'planned'
            };
            campaign.plan.push(planItem);
            console.log(`[MarketingHub] Added content ${content.id} to campaign ${campaign.name} for ${platform}`);
          }
        });
      }
    });

    campaign.updatedAt = new Date().toISOString();
  }

  updateKPI(campaignId: string, stats: Partial<MarketingCampaign['kpi']>): void {
    const campaign = this.getCampaignById(campaignId);
    if (campaign) {
      campaign.kpi = { ...campaign.kpi, ...stats };
      campaign.updatedAt = new Date().toISOString();
    }
  }

  addImprovementLog(campaignId: string, log: string): void {
    const campaign = this.getCampaignById(campaignId);
    if (campaign) {
      campaign.improvementHistory.push(`${new Date().toISOString().split('T')[0]}: ${log}`);
      campaign.updatedAt = new Date().toISOString();
    }
  }
}
