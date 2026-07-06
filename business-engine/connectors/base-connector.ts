import { IConnector, ConnectorProfile, PostContent } from './connector-types';
import { AuthManager } from '../auth/auth-manager';

export abstract class BaseConnector implements IConnector {
  abstract serviceId: string;
  protected authManager = AuthManager.getInstance();

  async ensureAuthenticated(): Promise<string> {
    const token = await this.authManager.getAccessToken(this.serviceId);
    if (!token) {
      throw new Error(`Authentication failed for ${this.serviceId}. Please reconnect.`);
    }
    return token;
  }

  async connect(): Promise<boolean> {
    console.log(`[${this.serviceId} Connector] Connecting...`);
    // In a real implementation, this might trigger OAuth flow
    return (await this.authManager.getConnectionStatus(this.serviceId)) === 'connected';
  }

  async disconnect(): Promise<boolean> {
    console.log(`[${this.serviceId} Connector] Disconnecting...`);
    // Placeholder for actual logout/token revocation
    return true;
  }

  abstract getProfile(): Promise<ConnectorProfile | undefined>;
  abstract updateProfile(profile: Partial<ConnectorProfile>): Promise<boolean>;
  abstract createPost(content: PostContent): Promise<string | undefined>;
}
