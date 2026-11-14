import { VideoItem, WatchedVideoItem } from '../types/tvFeed';

const WATCHED_STORAGE_KEY = 'curatetv_watched_history';
const MAX_HISTORY_ITEMS = 25;

export function getWatchedVideos(): WatchedVideoItem[] {
  try {
    const raw = localStorage.getItem(WATCHED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && item.video && item.video.youtubeId);
    }
  } catch (err) {
    console.warn('Failed to read watched history from localStorage:', err);
  }
  return [];
}

export function saveWatchedVideo(video: VideoItem, categoryTitle?: string): WatchedVideoItem[] {
  try {
    const currentList = getWatchedVideos();
    // Filter out existing occurrence of this video
    const filtered = currentList.filter(
      (item) => item.video.id !== video.id && item.video.youtubeId !== video.youtubeId
    );

    const newItem: WatchedVideoItem = {
      video,
      watchedAt: Date.now(),
      categoryTitle: categoryTitle || 'Curated Stream',
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save watched video to localStorage:', err);
    return getWatchedVideos();
  }
}

export function removeWatchedVideo(videoId: string): WatchedVideoItem[] {
  try {
    const currentList = getWatchedVideos();
    const updated = currentList.filter(
      (item) => item.video.id !== videoId && item.video.youtubeId !== videoId
    );
    localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getWatchedVideos();
  }
}

export function clearWatchedVideos(): void {
  try {
    localStorage.removeItem(WATCHED_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function formatWatchedTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
}
