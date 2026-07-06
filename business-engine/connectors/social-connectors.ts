import { BaseConnector } from './base-connector';
import { ConnectorProfile, PostContent } from './connector-types';

export class GitHubConnector extends BaseConnector {
  serviceId = 'GitHub';

  async getProfile(): Promise<ConnectorProfile | undefined> {
    const token = await this.ensureAuthenticated();
    console.log(`[GitHub] Fetching profile with token: ${token.substring(0, 8)}...`);
    return { username: 'andplanning', displayName: 'And Planning' };
  }

  async updateProfile(profile: Partial<ConnectorProfile>): Promise<boolean> {
    await this.ensureAuthenticated();
    console.log(`[GitHub] Updating profile: ${JSON.stringify(profile)}`);
    return true;
  }

  async createPost(content: PostContent): Promise<string | undefined> {
    await this.ensureAuthenticated();
    console.log(`[GitHub] Creating Issue/Gist: ${content.title}`);
    return `gh-issue-${Date.now()}`;
  }
}

export class XConnector extends BaseConnector {
  serviceId = 'X';

  async getProfile(): Promise<ConnectorProfile | undefined> {
    const token = await this.ensureAuthenticated();
    console.log(`[X] Fetching profile with token: ${token.substring(0, 8)}...`);
    return { username: 'andplanning', displayName: 'And Planning AIOS' };
  }

  async updateProfile(profile: Partial<ConnectorProfile>): Promise<boolean> {
    await this.ensureAuthenticated();
    console.log(`[X] Updating profile: ${JSON.stringify(profile)}`);
    return true;
  }

  async createPost(content: PostContent): Promise<string | undefined> {
    await this.ensureAuthenticated();
    console.log(`[X] Tweeting: ${content.body.substring(0, 50)}...`);
    return `x-tweet-${Date.now()}`;
  }
}

export class NoteConnector extends BaseConnector {
  serviceId = 'note';

  async getProfile(): Promise<ConnectorProfile | undefined> {
    const token = await this.ensureAuthenticated();
    console.log(`[note] Fetching profile with token: ${token.substring(0, 8)}...`);
    return { username: 'andplanning', displayName: 'And Planning' };
  }

  async updateProfile(profile: Partial<ConnectorProfile>): Promise<boolean> {
    await this.ensureAuthenticated();
    console.log(`[note] Updating profile: ${JSON.stringify(profile)}`);
    return true;
  }

  async createPost(content: PostContent): Promise<string | undefined> {
    await this.ensureAuthenticated();
    console.log(`[note] Publishing article: ${content.title}`);
    return `note-article-${Date.now()}`;
  }
}
