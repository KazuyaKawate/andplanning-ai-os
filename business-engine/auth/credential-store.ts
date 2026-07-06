export type AuthMethod = 'OAuth2' | 'ApiKey' | 'Basic';

export interface CredentialData {
  serviceId: string;
  method: AuthMethod;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string; // ISO format
}

export class CredentialStore {
  private static instance: CredentialStore;
  private store: Map<string, CredentialData> = new Map();

  private constructor() {
    // Initial dummy data for demonstration
    this.saveCredential({
      serviceId: 'GitHub',
      method: 'OAuth2',
      accessToken: 'gh_dummy_token',
      expiresAt: '2026-12-31T23:59:59Z'
    });
    this.saveCredential({
      serviceId: 'X',
      method: 'ApiKey',
      apiKey: 'x_dummy_api_key'
    });
  }

  public static getInstance(): CredentialStore {
    if (!CredentialStore.instance) {
      CredentialStore.instance = new CredentialStore();
    }
    return CredentialStore.instance;
  }

  saveCredential(cred: CredentialData): void {
    console.log(`[CredentialStore] Saving credentials for ${cred.serviceId}`);
    this.store.set(cred.serviceId, cred);
  }

  getCredential(serviceId: string): CredentialData | undefined {
    return this.store.get(serviceId);
  }

  listServices(): string[] {
    return Array.from(this.store.keys());
  }
}
