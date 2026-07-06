import { ContentManager } from './content-manager';
import { ContentProfileData } from './content-types';
import contentData from './content-profile.json';

export class ContentService {
  private static instance: ContentService;
  private manager: ContentManager;

  private constructor() {
    this.manager = new ContentManager(contentData as ContentProfileData);
  }

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  public getEntries() {
    return this.manager.getEntries();
  }

  public getManager(): ContentManager {
    return this.manager;
  }
}
