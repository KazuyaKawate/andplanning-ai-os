import { ContentEntry, ContentProfileData, SocialOptimization } from './content-types';
import { BrandService } from '../brand/brand-service';
import { SocialService } from '../social/social-service';
import { SnsPlatform } from '../social/social-types';

export class ContentManager {
  private data: ContentProfileData;

  constructor(data: ContentProfileData) {
    this.data = data;
  }

  getEntries(): ContentEntry[] {
    return this.data.entries;
  }

  getEntryById(id: string): ContentEntry | undefined {
    return this.data.entries.find(e => e.id === id);
  }

  /**
   * コンテンツを指定されたSNSプラットフォーム向けに最適化する
   */
  optimizeForPlatforms(entryId: string): void {
    const entry = this.getEntryById(entryId);
    if (!entry) return;

    const brand = BrandService.getInstance().getBrandInfo();
    const socialService = SocialService.getInstance();

    entry.optimizations = entry.targetPlatforms.map(platform => {
      let optimizedBody = entry.body;
      
      // ブランドURLの付与
      if (!optimizedBody.includes(brand.url)) {
        optimizedBody += `\n\n${brand.url}`;
      }

      // SNS固有の制限適用 (簡易実装)
      if (platform === 'X') {
        const hashtags = entry.hashtags.map(t => `#${t}`).join(' ');
        optimizedBody = `${entry.title}\n\n${optimizedBody}\n\n${hashtags}`;
        if (optimizedBody.length > 280) {
          optimizedBody = optimizedBody.substring(0, 277) + '...';
        }
      } else if (platform === 'note') {
        optimizedBody = `# ${entry.title}\n\n${optimizedBody}\n\n---\n運営: ${brand.organization}`;
      }

      return {
        platform,
        optimizedBody,
        charCount: optimizedBody.length,
        status: 'ready'
      };
    });

    entry.updatedAt = new Date().toISOString();
  }

  addEntry(entry: ContentEntry): void {
    this.data.entries.push(entry);
  }
}
