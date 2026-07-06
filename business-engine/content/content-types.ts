import { SnsPlatform } from '../social/social-types';

export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface ContentMedia {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

export interface SocialOptimization {
  platform: SnsPlatform;
  optimizedBody: string;
  charCount: number;
  status: 'pending' | 'ready' | 'error';
}

export interface ContentEntry {
  id: string;
  title: string;
  body: string;
  summary: string;
  hashtags: string[];
  media: ContentMedia[];
  category: string;
  targetPlatforms: SnsPlatform[];
  optimizations: SocialOptimization[];
  status: ContentStatus;
  isAiGenerated: boolean;
  isHumanApproved: boolean;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  postedAt?: string;
}

export interface ContentProfileData {
  entries: ContentEntry[];
}
