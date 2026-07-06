import { SnsPlatform } from '../social/social-types';

export type CampaignPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface MarketingKPI {
  clicks: number;
  impressions: number;
  followerGrowth: number;
  conversions: number;
  roi: number;
}

export interface MarketingPlanItem {
  contentId: string;
  platform: SnsPlatform;
  scheduledAt: string;
  status: 'planned' | 'active' | 'completed' | 'paused';
}

export interface MarketingCampaign {
  id: string;
  name: string;
  targetAudience: string;
  platforms: SnsPlatform[];
  priority: CampaignPriority;
  plan: MarketingPlanItem[];
  kpi: MarketingKPI;
  improvementHistory: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MarketingProfileData {
  campaigns: MarketingCampaign[];
}
