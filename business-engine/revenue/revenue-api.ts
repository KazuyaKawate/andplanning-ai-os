import { RevenueService } from './revenue-service';

/**
 * Revenue Engine API
 */
export const getMonthlyRevenue = async (month: string) => {
  const service = RevenueService.getInstance();
  return {
    ok: true,
    data: service.getRevenueSummary(month)
  };
};

/**
 * 収益エントリを記録する (決済完了通知などから呼び出し想定)
 */
export const recordRevenueAction = async (sourceId: string, amount: number, margin: number = 1.0) => {
  const service = RevenueService.getInstance();
  service.getManager().addEntry({
    id: `rev-${Date.now()}`,
    sourceId,
    amount,
    currency: 'JPY',
    date: new Date().toISOString().split('T')[0],
    profitMargin: margin
  });

  return {
    ok: true,
    message: "Revenue recorded successfully"
  };
};

/**
 * 将来の Accounting Engine 連携用
 */
export const exportToAccounting = async (period: string) => {
  return {
    ok: true,
    message: `Revenue data for ${period} exported to Accounting Engine`
  };
};
