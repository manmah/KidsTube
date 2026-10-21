import { TVFeed, VideoItem, CategorySection, FeedSourcePreset } from '../types/tvFeed';

const CACHE_KEY = 'curatetv_feed_cache';
const FEED_URL_KEY = 'curatetv_feed_url';
const KIOSK_LOCK_KEY = 'curatetv_kiosk_locked';
const PIN_KEY = 'curatetv_admin_pin';

export const DEFAULT_FEED_URL = '/sample-tv-feed.json';

export const FEED_PRESETS: FeedSourcePreset[] = [
  {
    id: 'default-curated',
    name: 'CurateTV Master Showcase (Default)',
    description: 'Documentaries, NASA 4K, Kurzgesagt science, Blender animations & Lo-Fi music',
    url: '/sample-tv-feed.json',
    isLocal: true,
  },
  {
    id: 'science-discovery',
    name: 'Veritasium & Scientific Inquiry',
    description: 'Deep science phenomena, Collatz conjecture, space exploration & physics',
    url: 'https://raw.githubusercontent.com/datasets/sample-feeds/main/science.json', // preset fallback to local structured
    isLocal: false,
  },
  {
    id: 'kids-safe',
    name: 'Kids & Family Animation Lounge',
    description: 'Wholesome open-source animated cinema, nature wildlife & educational cartoons',
    url: 'https://raw.githubusercontent.com/datasets/sample-feeds/main/kids.json',
    isLocal: false,
  },
  {
    id: 'ambient-music',
    name: 'Living Room Lo-Fi & Symphonies',
    description: 'Hans Zimmer concerts, live study beats & ambient relaxation loops',
    url: 'https://raw.githubusercontent.com/datasets/sample-feeds/main/ambient.json',
    isLocal: false,
  },
];

/**
 * Extracts a clean 11-character YouTube video ID from various URL formats or raw IDs
 */
export function extractYouTubeId(input: string | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // If already standard 11 alphanumeric/dash/underscore
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle youtube.com/watch?v=...
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Handle youtu.be/...
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle embed or shorts
  const embedMatch = trimmed.match(/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return trimmed;
}

/**
 * Normalizes raw parsed JSON into the standard TVFeed format
 */
export function normalizeFeedData(data: any): TVFeed {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON structure: Root must be an object or array');
  }

  const appTitle = data.appTitle || data.title || 'Curated TV Channels';
  const description = data.description || 'Restricted playlist video feed';

  // Format 1: Root contains `categories` array
  if (Array.isArray(data.categories)) {
    const categories: CategorySection[] = data.categories.map((cat: any, idx: number) => {
      const rawVideos = Array.isArray(cat.videos) ? cat.videos : (Array.isArray(cat.items) ? cat.items : []);
      const videos: VideoItem[] = rawVideos.map((v: any, vIdx: number) => {
        const ytId = extractYouTubeId(v.youtubeId || v.youtube_id || v.id || v.url || v.videoUrl);
        return {
          id: String(v.id || `v-${idx}-${vIdx}`),
          youtubeId: ytId,
          title: v.title || `Video ${vIdx + 1}`,
          channel: v.channel || v.author || v.creator || 'Curated Stream',
          duration: v.duration || 'Curated',
          description: v.description || '',
          thumbnail: v.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
          badge: v.badge || v.category || '',
        };
      }).filter((v: VideoItem) => Boolean(v.youtubeId));

      return {
        id: String(cat.id || `cat-${idx}`),
        title: cat.title || cat.name || `Section ${idx + 1}`,
        description: cat.description || '',
        videos,
      };
    }).filter((c: CategorySection) => c.videos.length > 0);

    return {
      version: data.version || '1.0',
      appTitle,
      description,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      kioskModeRestricted: data.kioskModeRestricted ?? true,
      categories,
    };
  }

  // Format 2: Root contains `sections` array
  if (Array.isArray(data.sections)) {
    return normalizeFeedData({ ...data, categories: data.sections });
  }

  // Format 3: Flat array of videos with `category` field
  const rawList = Array.isArray(data) ? data : (Array.isArray(data.videos) ? data.videos : (Array.isArray(data.items) ? data.items : null));
  if (rawList) {
    const groupMap: { [catName: string]: VideoItem[] } = {};
    rawList.forEach((v: any, idx: number) => {
      const catName = v.category || v.section || 'General Selection';
      if (!groupMap[catName]) groupMap[catName] = [];
      const ytId = extractYouTubeId(v.youtubeId || v.youtube_id || v.id || v.url);
      if (ytId) {
        groupMap[catName].push({
          id: String(v.id || `vid-${idx}`),
          youtubeId: ytId,
          title: v.title || `Video ${idx + 1}`,
          channel: v.channel || v.author || 'Curated Channel',
          duration: v.duration || 'Curated',
          description: v.description || '',
          thumbnail: v.thumbnail || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          badge: v.badge || '',
        });
      }
    });

    const categories: CategorySection[] = Object.entries(groupMap).map(([title, videos], idx) => ({
      id: `cat-${idx}-${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      videos,
    }));

    return {
      version: '1.0',
      appTitle,
      description,
      lastUpdated: new Date().toISOString(),
      kioskModeRestricted: true,
      categories,
    };
  }

  throw new Error('Unrecognized feed JSON format: Expected "categories", "sections", or an array of videos.');
}

/**
 * Loads the feed from a remote URL or local storage fallback
 */
export async function loadFeedFromUrl(url: string): Promise<TVFeed> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const jsonData = await response.json();
    const normalized = normalizeFeedData(jsonData);

    // Save successful feed to cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      localStorage.setItem(FEED_URL_KEY, url);
    } catch {
      // Ignore quota error
    }

    return normalized;
  } catch (err: any) {
    console.warn(`Feed fetch failed for ${url}:`, err);

    // Try localStorage cached copy
    const cached = getCachedFeed();
    if (cached) {
      return cached;
    }

    // If fetching custom remote URL failed, fallback to bundled sample
    if (url !== DEFAULT_FEED_URL) {
      console.log('Falling back to bundled sample feed...');
      return loadFeedFromUrl(DEFAULT_FEED_URL);
    }

    throw new Error(`Failed to load feed: ${err.message}`);
  }
}

export function getCachedFeed(): TVFeed | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore error
  }
  return null;
}

export function getSavedFeedUrl(): string {
  try {
    return localStorage.getItem(FEED_URL_KEY) || DEFAULT_FEED_URL;
  } catch {
    return DEFAULT_FEED_URL;
  }
}

export function saveFeedUrl(url: string): void {
  try {
    localStorage.setItem(FEED_URL_KEY, url);
  } catch {
    // Ignore
  }
}

export function isKioskLocked(): boolean {
  try {
    return localStorage.getItem(KIOSK_LOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setKioskLockState(locked: boolean): void {
  try {
    localStorage.setItem(KIOSK_LOCK_KEY, locked ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

export function verifyAdminPin(enteredPin: string): boolean {
  try {
    const stored = localStorage.getItem(PIN_KEY) || '0000';
    return enteredPin === stored;
  } catch {
    return enteredPin === '0000';
  }
}

export function setAdminPin(newPin: string): void {
  try {
    localStorage.setItem(PIN_KEY, newPin);
  } catch {
    // Ignore
  }
}
