import { AnalyticsService } from './analytics-service';
import { TimeGrain } from './analytics-types';

/**
 * Analytics Engine API
 */
export const getAnalyticsSnapshots = async () => {
  const service = AnalyticsService.getInstance();
  return {
    ok: true,
    data: service.getSnapshots()
  };
};

/**
 * 集計レポートを取得する
 */
export const getAggregatedReport = async (brandId: string, grain: TimeGrain = 'daily') => {
  const service = AnalyticsService.getInstance();
  const report = service.getReport(brandId, grain);
  
  return {
    ok: true,
    data: report
  };
};

/**
 * 実績値を注入する（外部クロール・API収集用）
 */
export const recordMetricsAction = async (brandId: string, platform: any, metrics: any) => {
  const service = AnalyticsService.getInstance();
  service.getManager().addSnapshot({
    timestamp: new Date().toISOString(),
    brandId,
    platform,
    metrics
  });
  
  return {
    ok: true,
    message: "Metrics recorded successfully"
  };
};
