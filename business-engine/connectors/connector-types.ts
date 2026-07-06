export interface ConnectorProfile {
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface PostContent {
  title?: string;
  body: string;
  mediaUrls?: string[];
  tags?: string[];
}

export interface IConnector {
  serviceId: string;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  getProfile(): Promise<ConnectorProfile | undefined>;
  updateProfile(profile: Partial<ConnectorProfile>): Promise<boolean>;
  createPost(content: PostContent): Promise<string | undefined>; // Returns post ID
}
