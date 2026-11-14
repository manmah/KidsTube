export interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  duration?: string;
  description?: string;
  thumbnail?: string;
  badge?: string;
}

export interface CategorySection {
  id: string;
  title: string;
  description?: string;
  videos: VideoItem[];
}

export interface TVFeed {
  version?: string;
  appTitle?: string;
  description?: string;
  lastUpdated?: string;
  kioskModeRestricted?: boolean;
  categories: CategorySection[];
}

export type DeviceMode = 'tv' | 'mobile' | 'auto';

export interface FeedSourcePreset {
  id: string;
  name: string;
  description: string;
  url: string;
  isLocal?: boolean;
}

export interface WatchedVideoItem {
  video: VideoItem;
  watchedAt: number;
  categoryTitle?: string;
}

export type FeedSourceType = 'github' | 'local' | 'cache' | 'custom';

export interface FeedSyncResult {
  feed: TVFeed;
  source: FeedSourceType;
  isUpdated: boolean;
  message: string;
  error?: string;
  lastSyncTime?: number;
}
