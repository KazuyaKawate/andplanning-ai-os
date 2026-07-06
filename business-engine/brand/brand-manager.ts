export interface BrandDescription {
  ja: string;
  en: string;
}

export interface BrandLogo {
  horizontal: string;
  symbol: string;
}

export interface SnsLink {
  platform: string;
  url: string;
  active: boolean;
}

export interface BrandProfile {
  name: string;
  fullName: string;
  organization: string;
  url: string;
  description: BrandDescription;
  logo: BrandLogo;
  sns: SnsLink[];
}

export class BrandManager {
  private profile: BrandProfile;

  constructor(profile: BrandProfile) {
    this.profile = profile;
  }

  getProfile(): BrandProfile {
    return this.profile;
  }

  getSnsLinks(onlyActive: boolean = true): SnsLink[] {
    if (onlyActive) {
      return this.profile.sns.filter(s => s.active);
    }
    return this.profile.sns;
  }

  getDisplayName(): string {
    return `${this.profile.name} (${this.profile.fullName})`;
  }
}
