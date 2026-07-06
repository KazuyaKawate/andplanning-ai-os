import { RevenueProfileData, RevenueEntry, RevenueSummary, RevenueSource } from './revenue-types';
import { BrandService } from '../brand/brand-service';
import { AnalyticsService } from '../analytics/analytics-service';

export class RevenueManager {
  private data: RevenueProfileData;

  constructor(data: RevenueProfileData) {
    this.data = data;
  }

  getSources(): RevenueSource[] {
    return this.data.sources;
  }

  getEntries(): RevenueEntry[] {
    return this.data.entries;
  }

  /**
   * 特定期間の収益サマリーを生成する
   */
  generateSummary(period: string): RevenueSummary {
    const entries = this.data.entries.filter(e => e.date.startsWith(period));
    const brand = BrandService.getInstance().getBrandInfo();
    
    const summary: RevenueSummary = {
      period,
      totalRevenue: 0,
      totalProfit: 0,
      breakdownByCategory: {},
      breakdownBySource: {}
    };

    entries.forEach(entry => {
      const source = this.data.sources.find(s => s.id === entry.sourceId);
      if (!source) return;

      const profit = entry.amount * entry.profitMargin;
      
      summary.totalRevenue += entry.amount;
      summary.totalProfit += profit;

      // カテゴリ別集計
      summary.breakdownByCategory[source.category] = (summary.breakdownByCategory[source.category] || 0) + entry.amount;
      
      // 収益源別集計
      summary.breakdownBySource[source.name] = (summary.breakdownBySource[source.name] || 0) + entry.amount;
    });

    console.log(`[RevenueEngine] Summary for ${brand.name} - ${period}: Total ¥${summary.totalRevenue}`);
    return summary;
  }

  /**
   * Analytics Engine のデータと照合して ROI を算出する (将来用)
   */
  calculateROI(campaignId: string): number {
    // 将来的に Marketing Manager や Analytics Engine と連携して
    // キャンペーンコスト vs 発生収益を計算する
    return 0;
  }

  addEntry(entry: RevenueEntry): void {
    this.data.entries.push(entry);
  }
}
