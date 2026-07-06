import { SnsPlatform } from '../social/social-types';

export type TimeGrain = 'daily' | 'weekly' | 'monthly';

export interface PerformanceMetrics {
  pv: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number; // 算出項目
  likes: number;
  shares: number;
  comments: number;
  followers: number;
  conversions: number;
  revenue: number;
  roi: number; // 算出項目
}

export interface AnalyticsSnapshot {
  timestamp: string;
  brandId: string;
  platform: SnsPlatform | 'all';
  metrics: PerformanceMetrics;
}

export interface AnalyticsProfileData {
  snapshots: AnalyticsSnapshot[];
}

export interface AggregatedReport {
  period: TimeGrain;
  startDate: string;
  endDate: string;
  totalMetrics: PerformanceMetrics;
  breakdownByPlatform: Record<string, PerformanceMetrics>;
}
