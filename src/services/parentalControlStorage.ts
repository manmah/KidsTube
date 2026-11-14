import { VideoItem } from '../types/tvFeed';

const BLOCKED_VIDEOS_KEY = 'curatetv_blocked_videos';
const BLOCKED_KEYWORDS_KEY = 'curatetv_blocked_keywords';
const PARENTAL_PIN_KEY = 'curatetv_admin_pin';

export interface BlockedVideoRecord {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail?: string;
  blockedAt: number;
  reason?: string;
}

export function getBlockedVideos(): BlockedVideoRecord[] {
  try {
    const raw = localStorage.getItem(BLOCKED_VIDEOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse blocked videos:', err);
  }
  return [];
}

export function getBlockedKeywords(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_KEYWORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export function isVideoBlocked(video: VideoItem): boolean {
  if (!video) return false;
  const blocked = getBlockedVideos();
  const isDirectlyBlocked = blocked.some(
    (b) => b.id === video.id || b.youtubeId === video.youtubeId
  );
  if (isDirectlyBlocked) return true;

  // Check blocked keywords against title
  const keywords = getBlockedKeywords();
  if (keywords.length > 0) {
    const lowerTitle = video.title.toLowerCase();
    const hasBlockedWord = keywords.some((kw) =>
      lowerTitle.includes(kw.toLowerCase().trim())
    );
    if (hasBlockedWord) return true;
  }

  return false;
}

export function blockVideo(video: VideoItem, reason: string = 'Hidden by parent'): BlockedVideoRecord[] {
  try {
    const current = getBlockedVideos();
    const exists = current.some(
      (b) => b.id === video.id || b.youtubeId === video.youtubeId
    );
    if (!exists) {
      const record: BlockedVideoRecord = {
        id: video.id,
        youtubeId: video.youtubeId,
        title: video.title,
        channel: video.channel,
        thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`,
        blockedAt: Date.now(),
        reason,
      };
      const updated = [record, ...current];
      localStorage.setItem(BLOCKED_VIDEOS_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch (err) {
    console.warn('Failed to block video:', err);
    return getBlockedVideos();
  }
}

export function unblockVideo(videoIdOrYoutubeId: string): BlockedVideoRecord[] {
  try {
    const current = getBlockedVideos();
    const updated = current.filter(
      (b) => b.id !== videoIdOrYoutubeId && b.youtubeId !== videoIdOrYoutubeId
    );
    localStorage.setItem(BLOCKED_VIDEOS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getBlockedVideos();
  }
}

export function unblockAllVideos(): void {
  try {
    localStorage.removeItem(BLOCKED_VIDEOS_KEY);
  } catch {
    // Ignore
  }
}

export function addBlockedKeyword(keyword: string): string[] {
  try {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return getBlockedKeywords();
    const current = getBlockedKeywords();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      localStorage.setItem(BLOCKED_KEYWORDS_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch {
    return getBlockedKeywords();
  }
}

export function removeBlockedKeyword(keyword: string): string[] {
  try {
    const current = getBlockedKeywords();
    const updated = current.filter((k) => k !== keyword.toLowerCase().trim());
    localStorage.setItem(BLOCKED_KEYWORDS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getBlockedKeywords();
  }
}

export function verifyParentalPin(pin: string): boolean {
  try {
    const stored = localStorage.getItem(PARENTAL_PIN_KEY) || '0000';
    return pin === stored;
  } catch {
    return pin === '0000';
  }
}

export function updateParentalPin(newPin: string): boolean {
  try {
    localStorage.setItem(PARENTAL_PIN_KEY, newPin);
    return true;
  } catch {
    return false;
  }
}
