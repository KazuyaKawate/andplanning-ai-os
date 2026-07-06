import { BaseConnector } from '../base-connector';
import { ConnectorProfile, PostContent } from '../connector-types';
import { GitHubRepo, GitHubIssue, GitHubProfile } from './github-types';

export class GitHubConnector extends BaseConnector {
  serviceId = 'GitHub';
  private baseUrl = 'https://api.github.com';

  private async request<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
    const token = await this.ensureAuthenticated();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`GitHub API Error: ${err.message || res.statusText}`);
    }

    return await res.json() as T;
  }

  async getProfile(): Promise<ConnectorProfile | undefined> {
    const profile = await this.request<GitHubProfile>('/user');
    return {
      username: profile.login,
      displayName: profile.name || profile.login,
      avatarUrl: profile.avatar_url,
      bio: profile.bio || undefined
    };
  }

  async updateProfile(profile: Partial<ConnectorProfile>): Promise<boolean> {
    const data: any = {};
    if (profile.displayName) data.name = profile.displayName;
    if (profile.bio) data.bio = profile.bio;
    
    await this.request<GitHubProfile>('/user', 'PATCH', data);
    return true;
  }

  async listRepositories(): Promise<GitHubRepo[]> {
    return await this.request<GitHubRepo[]>('/user/repos?sort=updated');
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitHubRepo> {
    return await this.request<GitHubRepo>('/user/repos', 'POST', {
      name,
      description,
      private: isPrivate
    });
  }

  async createIssue(repoOwner: string, repoName: string, title: string, body: string): Promise<GitHubIssue> {
    return await this.request<GitHubIssue>(`/repos/${repoOwner}/${repoName}/issues`, 'POST', {
      title,
      body
    });
  }

  // Implementation of IConnector.createPost using createIssue as a default
  async createPost(content: PostContent): Promise<string | undefined> {
    // In GitHub context, we create a Gist or a Repository Issue.
    // For simplicity, let's assume we create a Gist as a "post"
    const result = await this.request<any>('/gists', 'POST', {
      description: content.title || 'AIOS Generated Content',
      public: true,
      files: {
        'content.md': {
          content: content.body
        }
      }
    });
    return result.id;
  }
}
