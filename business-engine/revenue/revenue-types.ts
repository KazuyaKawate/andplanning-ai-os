export type RevenueCategory = 
  | 'Ad' 
  | 'Subscription' 
  | 'Affiliate' 
  | 'ApiUsage' 
  | 'VideoSale' 
  | 'EcSale' 
  | 'Other';

export interface RevenueSource {
  id: string;
  name: string;
  category: RevenueCategory;
  platform: string; // Integration with Social Hub
}

export interface RevenueEntry {
  id: string;
  sourceId: string;
  amount: number;
  currency: string;
  date: string;
  profitMargin: number; // 0.0 to 1.0
}

export interface RevenueSummary {
  period: string; // e.g., "2026-07"
  totalRevenue: number;
  totalProfit: number;
  breakdownByCategory: Record<string, number>;
  breakdownBySource: Record<string, number>;
}

export interface RevenueProfileData {
  sources: RevenueSource[];
  entries: RevenueEntry[];
}
