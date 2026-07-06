import { SocialHubAccount, SocialProfileData, SnsPlatform } from './social-types';
import { BrandProfile } from '../brand/brand-manager';

export class SocialManager {
  private data: SocialProfileData;

  constructor(data: SocialProfileData) {
    this.data = data;
  }

  getAccounts(): SocialHubAccount[] {
    return this.data.accounts;
  }

  getAccountByPlatform(platform: SnsPlatform): SocialHubAccount | undefined {
    return this.data.accounts.find(a => a.platform === platform);
  }

  /**
   * Brand Manager からの通知を受け取り、全 SNS プロフィールを同期する設計
   */
  syncWithBrandProfile(brand: BrandProfile): void {
    this.data.accounts = this.data.accounts.map(account => {
      // 基本情報の同期
      const updatedAccount: SocialHubAccount = {
        ...account,
        website: brand.url,
        // 必要に応じてブランド情報を各SNSの形式に加工して反映
        syncStatus: {
          ...account.syncStatus,
          status: 'pending',
          lastSyncAt: new Date().toISOString()
        }
      };
      
      console.log(`[SocialHub] Synced ${account.platform} with brand: ${brand.name}`);
      return updatedAccount;
    });
  }

  addAccount(account: SocialHubAccount): void {
    this.data.accounts.push(account);
  }
}
