import { CredentialStore, CredentialData } from './credential-store';
import { TokenRefresh } from './token-refresh';
import { DashboardEventEmitter } from '../dashboard/dashboard-event';

export class AuthManager {
  private static instance: AuthManager;
  private store = CredentialStore.getInstance();
  private emitter = DashboardEventEmitter.getInstance();

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * 各サービスの接続状態を取得する
   */
  public async getConnectionStatus(serviceId: string): Promise<'connected' | 'expired' | 'disconnected'> {
    const cred = this.store.getCredential(serviceId);
    if (!cred) return 'disconnected';

    if (TokenRefresh.needsRefresh(cred)) {
      const success = await TokenRefresh.performRefresh(serviceId);
      if (success) {
        this.emitter.emit('social_synced', { serviceId, status: 'synced' });
        return 'connected';
      }
      return 'expired';
    }

    return 'connected';
  }

  /**
   * 有効期限をバックグラウンドで監視し、必要なら更新して通知する
   */
  private startMonitoring() {
    setInterval(async () => {
      const services = this.store.listServices();
      for (const service of services) {
        const status = await this.getConnectionStatus(service);
        console.log(`[AuthManager] Status for ${service}: ${status}`);
      }
    }, 60000); // 1分毎
  }

  public async getAccessToken(serviceId: string): Promise<string | undefined> {
    const status = await this.getConnectionStatus(serviceId);
    if (status !== 'connected') return undefined;
    return this.store.getCredential(serviceId)?.accessToken;
  }
}
