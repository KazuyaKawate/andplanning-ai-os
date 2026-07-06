export type SnsPlatform = 
  | 'GitHub' 
  | 'LinkedIn' 
  | 'X' 
  | 'Threads' 
  | 'Instagram' 
  | 'Facebook' 
  | 'YouTube' 
  | 'note' 
  | 'TikTok' 
  | 'Discord';

export interface SocialProfileDescription {
  ja: string;
  en: string;
}

export interface SocialProfileAssets {
  icon: string;
  banner: string;
}

export interface SocialSyncStatus {
  lastSyncAt: string;
  status: 'synced' | 'pending' | 'error' | 'manual_only';
}

export interface SocialHubAccount {
  platform: SnsPlatform;
  profileUrl: string;
  username: string;
  displayName: string;
  description: SocialProfileDescription;
  website: string;
  assets: SocialProfileAssets;
  capabilities: {
    apiEnabled: boolean;
    browserAutomationEnabled: boolean;
  };
  syncStatus: SocialSyncStatus;
}

export interface SocialProfileData {
  accounts: SocialHubAccount[];
}
