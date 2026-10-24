import { TVFeed, VideoItem, CategorySection, FeedSourcePreset, FeedSyncResult, FeedSourceType } from '../types/tvFeed';

const CACHE_KEY = 'curatetv_feed_cache';
const FEED_URL_KEY = 'curatetv_feed_url';
const GITHUB_URL_KEY = 'curatetv_github_feed_url';
const AUTO_CHECK_GITHUB_KEY = 'curatetv_auto_check_github';
const LAST_SYNC_TIMESTAMP_KEY = 'curatetv_last_sync_timestamp';
const LAST_SYNC_STATUS_KEY = 'curatetv_last_sync_status';
const KIOSK_LOCK_KEY = 'curatetv_kiosk_locked';
const PIN_KEY = 'curatetv_admin_pin';

export const DEFAULT_FEED_URL = '/sample-tv-feed.json';
export const DEFAULT_GITHUB_WEB_URL = 'https://github.com/manmah/KidsTube/blob/main/public/sample-tv-feed.json';
export const DEFAULT_GITHUB_FEED_URL = 'https://raw.githubusercontent.com/manmah/KidsTube/main/public/sample-tv-feed.json';

export const FEED_PRESETS: FeedSourcePreset[] = [
  {
    id: 'github-kidstube-feed',
    name: 'KidsTube GitHub Feed (manmah/KidsTube)',
    description: 'Auto-syncs live updates from GitHub (https://github.com/manmah/KidsTube/blob/main/public/sample-tv-feed.json)',
    url: DEFAULT_GITHUB_FEED_URL,
    isLocal: false,
  },
  {
    id: 'omar-and-hana-arabic',
    name: 'عمر وهنا بالعربية (Local Offline Bundled)',
    description: 'القائمة المحلية المدمجة المعتمدة لقناة عمر وهنا بدون الحاجة لإنترنت',
    url: '/sample-tv-feed.json',
    isLocal: true,
  },
  {
    id: 'kids-safe',
    name: 'Kids & Family Animation Lounge',
    description: 'Wholesome open-source animated cinema, nature wildlife & educational cartoons',
    url: 'https://raw.githubusercontent.com/datasets/sample-feeds/main/kids.json',
    isLocal: false,
  },
  {
    id: 'nature-cinema',
    name: 'Cinematic Nature & Planet Earth',
    description: 'Ultra-HD visual landscapes and wildlife expeditions for leanback viewing',
    url: 'https://raw.githubusercontent.com/datasets/sample-feeds/main/nature.json',
    isLocal: false,
  },
];

/**
 * Automatically converts normal GitHub repository URLs (e.g. https://github.com/manmah/KidsTube/blob/main/public/sample-tv-feed.json)
 * into direct raw downloadable URLs (https://raw.githubusercontent.com/manmah/KidsTube/main/public/sample-tv-feed.json).
 */
export function formatGithubRawUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  let url = inputUrl.trim();

  // Strip query string and hashes
  const cleanUrl = url.split('#')[0].split('?')[0].trim();
  let working = cleanUrl;

  // If missing protocol but starts with github.com or raw.githubusercontent.com
  if (working.startsWith('github.com/')) {
    working = `https://${working}`;
  } else if (working.startsWith('raw.githubusercontent.com/')) {
    working = `https://${working}`;
  }

  // Handle standard GitHub blob view: https://github.com/:owner/:repo/blob/:branch/:filepath
  const blobRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i;
  const blobMatch = working.match(blobRegex);
  if (blobMatch) {
    const [, owner, repo, branch, filepath] = blobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;
  }

  // Handle standard GitHub raw view: https://github.com/:owner/:repo/raw/:branch/:filepath
  const rawRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/i;
  const rawMatch = working.match(rawRegex);
  if (rawMatch) {
    const [, owner, repo, branch, filepath] = rawMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;
  }

  // Handle refs/heads: https://github.com/:owner/:repo/(blob|raw)/refs/heads/:branch/:filepath
  const refsRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/refs\/heads\/([^/]+)\/(.+)$/i;
  const refsMatch = working.match(refsRegex);
  if (refsMatch) {
    const [, owner, repo, branch, filepath] = refsMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;
  }

  // If already raw.githubusercontent.com
  if (working.startsWith('https://raw.githubusercontent.com/')) {
    return working;
  }

  return cleanUrl || url;
}

/**
 * Generates an alternative jsDelivr CDN mirror URL for any GitHub raw file
 * as a high-reliability fallback if raw.githubusercontent.com is blocked or throttled.
 */
export function getGithubMirrorUrl(rawUrl: string): string | null {
  const match = rawUrl.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if (match) {
    const [, owner, repo, branch, filepath] = match;
    return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${filepath}`;
  }
  return null;
}

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

  const appTitle = data.appTitle || data.title || 'GreenKid TV - عمر وهنا بالعربية';
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
          channel: v.channel || v.author || v.creator || 'Omar & Hana Arabic',
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
      version: data.version || '2.0',
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
          channel: v.channel || v.author || 'Omar & Hana Arabic',
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
      version: '2.0',
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
 * Directly fetches and parses local bundled `/sample-tv-feed.json`
 */
export async function loadLocalBundledFeed(): Promise<TVFeed> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const response = await fetch(DEFAULT_FEED_URL, {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' },
    cache: 'no-cache',
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Failed to load local bundled feed (HTTP ${response.status})`);
  }

  const json = await response.json();
  return normalizeFeedData(json);
}

/**
 * Loads the feed from local cache or local bundled file as a fail-safe fallback
 */
export async function loadLocalFallbackFeed(): Promise<TVFeed> {
  const cached = getCachedFeed();
  if (cached && cached.categories && cached.categories.length > 0) {
    return cached;
  }
  return loadLocalBundledFeed();
}

/**
 * Fetches feed data from remote GitHub raw URL or jsDelivr mirror.
 * Avoids browser CORS preflight (OPTIONS 403) by not sending custom headers
 * and using timestamp query parameters for cache-busting instead of cache: 'no-cache'.
 */
export async function fetchRemoteFeedData(url: string): Promise<TVFeed> {
  const primaryUrl = formatGithubRawUrl(url);
  const mirrorUrl = getGithubMirrorUrl(primaryUrl);

  const candidateUrls: string[] = [primaryUrl];
  if (mirrorUrl && mirrorUrl !== primaryUrl) {
    candidateUrls.push(mirrorUrl);
  }

  let lastError: Error | null = null;

  for (const candidate of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Append timestamp query parameter to bypass cache cleanly without triggering CORS preflights
      const separator = candidate.includes('?') ? '&' : '?';
      const targetWithBuster = `${candidate}${separator}_t=${Date.now()}`;

      // Notice: Do NOT pass custom headers (like Accept: application/json) or cache: 'no-cache',
      // because GitHub raw server returns 403 Forbidden to CORS preflight OPTIONS requests.
      const response = await fetch(targetWithBuster, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText || 'Error'}) from ${new URL(candidate).hostname}`);
      }

      const text = await response.text();
      let jsonData: any;
      try {
        jsonData = JSON.parse(text);
      } catch (parseErr: any) {
        throw new Error(`Failed to parse JSON response: ${parseErr.message}`);
      }

      const normalized = normalizeFeedData(jsonData);
      return normalized;
    } catch (err: any) {
      console.warn(`Feed fetch failed from candidate ${candidate}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error(`Unable to fetch feed from ${url}`);
}

/**
 * Loads the feed from a remote URL with local storage fallback
 */
export async function loadFeedFromUrl(url: string): Promise<TVFeed> {
  try {
    const normalized = await fetchRemoteFeedData(url);

    // Save successful feed to cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      localStorage.setItem(FEED_URL_KEY, url);
    } catch {
      // Ignore quota error
    }

    return normalized;
  } catch (err: any) {
    console.warn(`Remote feed fetch failed for ${url}:`, err);

    // Try localStorage cached copy
    const cached = getCachedFeed();
    if (cached) {
      return cached;
    }

    // If fetching custom remote URL failed, fallback to bundled sample
    if (url !== DEFAULT_FEED_URL) {
      console.log('Falling back to bundled sample feed...');
      return loadLocalBundledFeed();
    }

    throw new Error(`Failed to load feed: ${err.message}`);
  }
}

/**
 * GitHub First, Local Fallback Synchronization Pipeline:
 * 1. Checks if auto-sync is enabled and online.
 * 2. Fetches latest JSON from GitHub raw repository (or CDN mirror).
 * 3. Updates local cache and timestamp if new data is found.
 * 4. In case of any error (offline, 404, CORS, timeout, invalid JSON), smoothly loads the local list.
 */
export async function syncFeedFromGithubOrLocal(options?: {
  githubUrl?: string;
  forceRefresh?: boolean;
}): Promise<FeedSyncResult> {
  const rawTargetUrl = formatGithubRawUrl(options?.githubUrl || getSavedGithubUrl());
  const isAutoEnabled = isAutoCheckGithubEnabled();

  // If user disabled auto-sync and this isn't a forced manual check, load local
  if (!isAutoEnabled && !options?.forceRefresh) {
    const local = await loadLocalFallbackFeed();
    return {
      feed: local,
      source: 'local',
      isUpdated: false,
      message: 'GitHub auto-check is disabled; loaded local list.',
      lastSyncTime: getLastSyncTimestamp() || undefined,
    };
  }

  // If browser reports completely offline, load local list immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine && !options?.forceRefresh) {
    const local = await loadLocalFallbackFeed();
    return {
      feed: local,
      source: 'local',
      isUpdated: false,
      message: 'Offline mode: Using local offline video list.',
      lastSyncTime: getLastSyncTimestamp() || undefined,
    };
  }

  try {
    const remoteFeed = await fetchRemoteFeedData(rawTargetUrl);

    // Detect if content changed compared to current local cache
    const currentCached = getCachedFeed();
    let isUpdated = false;

    if (!currentCached) {
      isUpdated = true;
    } else {
      const currentCount = currentCached.categories.reduce((a, c) => a + c.videos.length, 0);
      const remoteCount = remoteFeed.categories.reduce((a, c) => a + c.videos.length, 0);
      if (currentCount !== remoteCount || currentCached.lastUpdated !== remoteFeed.lastUpdated) {
        isUpdated = true;
      }
    }

    // Persist newly synced feed to local storage
    const now = Date.now();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(remoteFeed));
      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, String(now));
      localStorage.setItem(LAST_SYNC_STATUS_KEY, 'synced');
    } catch {
      // Storage full
    }

    return {
      feed: remoteFeed,
      source: 'github',
      isUpdated,
      message: isUpdated
        ? `Synced latest videos from GitHub! (${remoteFeed.categories.reduce((a, c) => a + c.videos.length, 0)} videos ready)`
        : 'Up to date with GitHub.',
      lastSyncTime: now,
    };
  } catch (err: any) {
    console.warn('GitHub synchronization failed, falling back to local list:', err);
    
    // Smooth fallback to local list
    try {
      const localFeed = await loadLocalFallbackFeed();
      const statusMessage = `GitHub unreachable (${err.message || 'Error'}). Safely loaded local list.`;
      
      try {
        localStorage.setItem(LAST_SYNC_STATUS_KEY, 'local_fallback');
      } catch {
        // Ignore
      }

      return {
        feed: localFeed,
        source: 'local',
        isUpdated: false,
        error: err.message || 'Unknown network error',
        message: statusMessage,
        lastSyncTime: getLastSyncTimestamp() || undefined,
      };
    } catch (fallbackErr: any) {
      throw new Error(`Failed to load both GitHub and local feeds: ${fallbackErr.message}`);
    }
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
    const saved = localStorage.getItem(FEED_URL_KEY);
    if (!saved || saved.includes('datasets/sample-feeds')) {
      return DEFAULT_GITHUB_FEED_URL;
    }
    return saved;
  } catch {
    return DEFAULT_GITHUB_FEED_URL;
  }
}

export function saveFeedUrl(url: string): void {
  try {
    localStorage.setItem(FEED_URL_KEY, url);
  } catch {
    // Ignore
  }
}

export function getSavedGithubUrl(): string {
  try {
    const saved = localStorage.getItem(GITHUB_URL_KEY);
    if (!saved || saved.includes('datasets/sample-feeds') || saved.trim() === '') {
      return DEFAULT_GITHUB_FEED_URL;
    }
    return formatGithubRawUrl(saved);
  } catch {
    return DEFAULT_GITHUB_FEED_URL;
  }
}

export function saveGithubUrl(url: string): void {
  try {
    const formatted = formatGithubRawUrl(url);
    localStorage.setItem(GITHUB_URL_KEY, formatted);
  } catch {
    // Ignore
  }
}

export function isAutoCheckGithubEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTO_CHECK_GITHUB_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setAutoCheckGithubEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_CHECK_GITHUB_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

export function getLastSyncTimestamp(): number | null {
  try {
    const val = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export function getLastSyncStatus(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_STATUS_KEY);
  } catch {
    return null;
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

/**
 * Downloads the current feed as a formatted JSON file so the user can easily commit it to GitHub
 */
export function exportFeedAsJsonFile(feed: TVFeed, filename = 'omar-and-hana-tv-feed.json'): void {
  try {
    const jsonStr = JSON.stringify(feed, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export JSON file:', err);
  }
}
