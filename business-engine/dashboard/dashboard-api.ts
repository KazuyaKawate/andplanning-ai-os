import { DashboardService } from './dashboard-service';
import { DashboardEventEmitter } from './dashboard-event';

/**
 * Dashboard Real-time API
 */
export const getDashboardState = async () => {
  const service = DashboardService.getInstance();
  return {
    ok: true,
    data: service.getState()
  };
};

/**
 * 手動でイベントをエミットする（開発・デバッグ用）
 */
export const triggerDashboardUpdate = (type: any, data: any) => {
  DashboardEventEmitter.getInstance().emit(type, data);
};
