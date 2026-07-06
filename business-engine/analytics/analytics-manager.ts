import { 
  AnalyticsProfileData, 
  AnalyticsSnapshot, 
  PerformanceMetrics, 
  TimeGrain, 
  AggregatedReport 
} from './analytics-types';
import { BrandService } from '../brand/brand-service';
import { SocialService } from '../social/social-service';

export class AnalyticsManager {
  private data: AnalyticsProfileData;

  constructor(data: AnalyticsProfileData) {
    this.data = data;
  }

  getSnapshots(): AnalyticsSnapshot[] {
    return this.data.snapshots;
  }

  /**
   * 指定された期間と条件で集計レポートを生成する
   */
  generateReport(brandId: string, grain: TimeGrain): AggregatedReport {
    const snapshots = this.data.snapshots.filter(s => s.brandId === brandId);
    
    // 初期化
    const totalMetrics: PerformanceMetrics = {
      pv: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0,
      likes: 0, shares: 0, comments: 0, followers: 0,
      conversions: 0, revenue: 0, roi: 0
    };

    const breakdown: Record<string, PerformanceMetrics> = {};

    snapshots.forEach(s => {
      const m = s.metrics;
      const plat = s.platform;

      if (!breakdown[plat]) {
        breakdown[plat] = { ...totalMetrics };
      }

      // 単純加算項目
      ['pv', 'impressions', 'reach', 'clicks', 'likes', 'shares', 'comments', 'conversions', 'revenue'].forEach(key => {
        (totalMetrics as any)[key] += (m as any)[key];
        (breakdown[plat] as any)[key] += (m as any)[key];
      });

      // 最新値を採用する項目 (フォロワー数など)
      totalMetrics.followers = Math.max(totalMetrics.followers, m.followers);
      breakdown[plat].followers = m.followers;
    });

    // 算出項目の計算 (CTR, ROI)
    if (totalMetrics.impressions > 0) {
      totalMetrics.ctr = totalMetrics.clicks / totalMetrics.impressions;
    }
    
    // 将来の AI Agent 向けフィードバック
    console.log(`[Analytics] Report generated for ${brandId}. Total Revenue: ${totalMetrics.revenue}`);

    return {
      period: grain,
      startDate: snapshots.length > 0 ? snapshots[0].timestamp : '',
      endDate: snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : '',
      totalMetrics,
      breakdownByPlatform: breakdown
    };
  }

  addSnapshot(snapshot: AnalyticsSnapshot): void {
    this.data.snapshots.push(snapshot);
  }
}
