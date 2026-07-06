import { CredentialData, CredentialStore } from './credential-store';

export class TokenRefresh {
  /**
   * トークンが期限切れ、または期限間近（例: 5分以内）かを確認
   */
  public static needsRefresh(cred: CredentialData): boolean {
    if (!cred.accessToken || !cred.expiresAt) return false;
    
    const expires = new Date(cred.expiresAt).getTime();
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 mins

    return (expires - now) < buffer;
  }

  /**
   * 実際のトークン更新ロジック (Dummy)
   */
  public static async performRefresh(serviceId: string): Promise<boolean> {
    const store = CredentialStore.getInstance();
    const cred = store.getCredential(serviceId);

    if (!cred || !cred.refreshToken) {
      console.warn(`[TokenRefresh] No refresh token for ${serviceId}`);
      return false;
    }

    console.log(`[TokenRefresh] Refreshing token for ${serviceId}...`);
    
    // Simulate API call
    const newExpires = new Date();
    newExpires.setHours(newExpires.getHours() + 1);

    store.saveCredential({
      ...cred,
      accessToken: `refreshed_${serviceId}_token_${Date.now()}`,
      expiresAt: newExpires.toISOString()
    });

    return true;
  }
}
