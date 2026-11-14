import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TVFeed, VideoItem, CategorySection, DeviceMode, WatchedVideoItem, FeedSourceType, FeedSyncResult } from './types/tvFeed';
import {
  loadFeedFromUrl,
  getSavedFeedUrl,
  saveFeedUrl,
  isKioskLocked as getInitialKioskLocked,
  setKioskLockState,
  DEFAULT_FEED_URL,
  syncFeedFromGithubOrLocal,
  loadLocalFallbackFeed,
  loadLocalBundledFeed,
  getLastSyncTimestamp,
} from './services/feedLoader';
import {
  getWatchedVideos,
  saveWatchedVideo,
  removeWatchedVideo,
  clearWatchedVideos,
} from './services/historyStorage';
import {
  isVideoBlocked,
  blockVideo,
  getBlockedVideos,
  verifyParentalPin,
} from './services/parentalControlStorage';
import { TopNavigation } from './components/TopNavigation';
import { HeroSpotlight } from './components/HeroSpotlight';
import { CategoryShelf } from './components/CategoryShelf';
import { RecentlyWatchedShelf } from './components/RecentlyWatchedShelf';
import { YouTubeLeanbackPlayer } from './components/YouTubeLeanbackPlayer';
import { TVRemoteHUD } from './components/TVRemoteHUD';
import { FeedConfigModal } from './components/FeedConfigModal';
import { ParentalControlModal } from './components/ParentalControlModal';
import { SmartTvApkModal } from './components/SmartTvApkModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { CurfewCurtain } from './components/CurfewCurtain';
import { getTimerStatus, TimerStatus } from './services/timerStorage';
import { MobileBottomBar } from './components/MobileBottomBar';
import { WifiOff, AlertTriangle, Tv, RefreshCw, SearchX, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [feed, setFeed] = useState<TVFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedUrl, setFeedUrl] = useState<string>(getSavedFeedUrl());
  
  // GitHub Sync & Feed source status
  const [activeSource, setActiveSource] = useState<FeedSourceType>('local');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => getLastSyncTimestamp());
  const [syncToast, setSyncToast] = useState<{ message: string; isError?: boolean } | null>(null);

  // Search query state for filtering by video title
  const [searchQuery, setSearchQuery] = useState('');

  // Watched history state loaded from localStorage
  const [watchedVideos, setWatchedVideos] = useState<WatchedVideoItem[]>(() => getWatchedVideos());

  // Parental Control version trigger to recompute blocked items
  const [parentalVersion, setParentalVersion] = useState(0);
  const [isParentalModalOpen, setIsParentalModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // Bedtime screen limit & sleep timer state
  const [timerStatus, setTimerStatus] = useState<TimerStatus>(() => getTimerStatus());
  const [isSleepTimerModalOpen, setIsSleepTimerModalOpen] = useState(false);

  // Live timer tick listener
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getTimerStatus();
      setTimerStatus(current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Navigation & Selection state (2D grid for TV leanback)
  const [selectedRow, setSelectedRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);

  // Playback state (active video & its category)
  const [playingTarget, setPlayingTarget] = useState<{
    video: VideoItem;
    category: CategorySection;
    videoIndex: number;
  } | null>(null);

  // Device & UI Mode
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('tv');
  const [isKioskLocked, setIsKioskLocked] = useState(getInitialKioskLocked());
  const [adminPin, setAdminPinState] = useState('0000');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Number of blocked videos
  const blockedVideosCount = useMemo(() => {
    return getBlockedVideos().length;
  }, [parentalVersion]);

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show transient sync toast helper
  const showToast = useCallback((message: string, isError = false) => {
    setSyncToast({ message, isError });
    setTimeout(() => {
      setSyncToast(null);
    }, 4500);
  }, []);

  // Manual or triggered sync from GitHub
  const handleTriggerGithubSync = useCallback(async (customGithubUrl?: string): Promise<FeedSyncResult> => {
    setIsRefreshing(true);
    try {
      const result = await syncFeedFromGithubOrLocal({
        githubUrl: customGithubUrl,
        forceRefresh: true,
      });

      setFeed(result.feed);
      setActiveSource(result.source);
      if (result.lastSyncTime) setLastSyncTime(result.lastSyncTime);

      showToast(result.message, result.source !== 'github');
      return result;
    } catch (err: any) {
      const fallback = await loadLocalFallbackFeed();
      setFeed(fallback);
      setActiveSource('local');
      showToast(`Error syncing: ${err.message}. Using local list.`, true);
      return {
        feed: fallback,
        source: 'local',
        isUpdated: false,
        error: err.message,
        message: 'Loaded local list after error',
      };
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Restore bundled local feed
  const handleRestoreLocal = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const local = await loadLocalBundledFeed();
      setFeed(local);
      setActiveSource('local');
      showToast('Restored local bundled video feed.');
    } catch (err: any) {
      showToast(`Failed to restore local feed: ${err.message}`, true);
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Initial startup flow:
  // 1. Immediately render local list so app opens instantly with zero latency
  // 2. Automatically check GitHub for updates on app start
  // 3. Update local list on success; on error smoothly keep local list
  useEffect(() => {
    let isMounted = true;

    const startupSync = async () => {
      setIsLoading(true);
      // Fast path: load local/cached feed first
      try {
        const local = await loadLocalFallbackFeed();
        if (isMounted) {
          setFeed(local);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Fast local load failed:', err);
      }

      // Check GitHub for updates
      try {
        const syncResult = await syncFeedFromGithubOrLocal();
        if (isMounted) {
          setFeed(syncResult.feed);
          setActiveSource(syncResult.source);
          if (syncResult.lastSyncTime) setLastSyncTime(syncResult.lastSyncTime);

          if (syncResult.isUpdated) {
            showToast(syncResult.message);
          }
        }
      } catch (err: any) {
        console.warn('Startup GitHub check failed, falling back to local list:', err);
        if (isMounted) {
          const fallback = await loadLocalFallbackFeed();
          setFeed(fallback);
          setActiveSource('local');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    startupSync();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Generic feed URL loader for custom URLs
  const fetchFeed = useCallback(async (url: string, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const data = await loadFeedFromUrl(url);
      setFeed(data);
      setActiveSource(url.includes('github') ? 'github' : 'local');
      setSelectedRow(0);
      setSelectedCol(0);
    } catch (err: any) {
      // In case of error, load local list
      console.warn('Feed error, falling back to local list:', err);
      const fallback = await loadLocalFallbackFeed();
      setFeed(fallback);
      setActiveSource('local');
      showToast(`Error loading ${url}. Loaded local list.`, true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setSelectedRow(0);
    setSelectedCol(0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedRow(0);
    setSelectedCol(0);
  };

  // Filtered categories based on Parental Control Blocklist, Search Query, and Active Tab
  const displayedCategories = useMemo(() => {
    if (!feed?.categories) return [];
    const query = searchQuery.trim().toLowerCase();

    // Base categories depending on active tab
    const baseList =
      activeTab === 'all'
        ? feed.categories
        : feed.categories.filter((c) => c.id === activeTab);

    return baseList
      .map((cat) => ({
        ...cat,
        // STRICT PARENTAL CONTROL: strip any unwanted/blocked video
        videos: cat.videos.filter((v) => {
          if (isVideoBlocked(v)) return false;
          if (query && !v.title.toLowerCase().includes(query)) return false;
          return true;
        }),
      }))
      .filter((cat) => cat.videos.length > 0);
  }, [feed, activeTab, searchQuery, parentalVersion]);

  // Filtered watched videos (excluding blocked videos and matching search)
  const displayedWatchedVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return watchedVideos.filter((item) => {
      // Exclude blocked videos
      if (isVideoBlocked(item.video)) return false;
      if (query && !item.video.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [watchedVideos, searchQuery, parentalVersion]);

  // Total matching video count
  const totalMatchingCount = useMemo(() => {
    return displayedCategories.reduce((acc, cat) => acc + cat.videos.length, 0);
  }, [displayedCategories]);

  // Flag indicating whether Continue Watching is visible at row 0
  const hasWatchedRow = displayedWatchedVideos.length > 0 && activeTab === 'all' && !searchQuery.trim();
  const totalRows = (hasWatchedRow ? 1 : 0) + displayedCategories.length;

  // Derive focused video based on selected row & col
  let focusedVideo: VideoItem | null = null;
  let focusedCategoryTitle = '';

  if (hasWatchedRow && selectedRow === 0) {
    const item = displayedWatchedVideos[selectedCol] || displayedWatchedVideos[0];
    focusedVideo = item ? item.video : null;
    focusedCategoryTitle = 'Continue Watching';
  } else {
    const catIdx = hasWatchedRow ? selectedRow - 1 : selectedRow;
    const cat = displayedCategories[catIdx];
    if (cat) {
      focusedVideo = cat.videos[selectedCol] || cat.videos[0] || null;
      focusedCategoryTitle = cat.title;
    }
  }

  const getVideoCountForRow = useCallback(
    (row: number) => {
      if (hasWatchedRow && row === 0) {
        return displayedWatchedVideos.length;
      }
      const catIdx = hasWatchedRow ? row - 1 : row;
      return displayedCategories[catIdx]?.videos.length || 0;
    },
    [hasWatchedRow, displayedWatchedVideos.length, displayedCategories]
  );

  // Play video and persist to localStorage watched history
  const playVideoItem = useCallback(
    (video: VideoItem, category: CategorySection, videoIndex: number) => {
      // Ensure video is not blocked
      if (isVideoBlocked(video)) return;

      const updated = saveWatchedVideo(video, category.title);
      setWatchedVideos(updated);

      setPlayingTarget({
        video,
        category,
        videoIndex,
      });
    },
    []
  );

  // Parental Control: Hide unwanted video directly
  const handleHideVideo = useCallback((video: VideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const pin = window.prompt(
      `Parental Control: Enter 4-digit PIN to hide and remove "${video.title}" (default: 0000):`
    );
    if (pin === null) return;

    if (verifyParentalPin(pin)) {
      blockVideo(video, 'Removed via card');
      setParentalVersion((v) => v + 1);
      // Also remove from playing if currently playing
      if (playingTarget?.video.id === video.id || playingTarget?.video.youtubeId === video.youtubeId) {
        setPlayingTarget(null);
      }
    } else {
      alert('Incorrect Parental Control PIN. Action cancelled.');
    }
  }, [playingTarget]);

  // Handlers for selection
  const handleSelectWatchedVideo = useCallback(
    (colIndex: number) => {
      const item = displayedWatchedVideos[colIndex];
      if (!item) return;

      setSelectedRow(0);
      setSelectedCol(colIndex);

      const virtualCategory: CategorySection = {
        id: 'continue-watching',
        title: 'Continue Watching',
        videos: displayedWatchedVideos.map((w) => w.video),
      };

      playVideoItem(item.video, virtualCategory, colIndex);
    },
    [displayedWatchedVideos, playVideoItem]
  );

  const handleSelectCategoryVideo = useCallback(
    (rawRowIndex: number, colIndex: number) => {
      const actualRow = hasWatchedRow ? rawRowIndex + 1 : rawRowIndex;
      setSelectedRow(actualRow);
      setSelectedCol(colIndex);

      const cat = displayedCategories[rawRowIndex];
      if (cat && cat.videos[colIndex]) {
        playVideoItem(cat.videos[colIndex], cat, colIndex);
      }
    },
    [hasWatchedRow, displayedCategories, playVideoItem]
  );

  const handlePlayCurrent = useCallback(() => {
    if (hasWatchedRow && selectedRow === 0) {
      handleSelectWatchedVideo(selectedCol);
    } else {
      const catIdx = hasWatchedRow ? selectedRow - 1 : selectedRow;
      const cat = displayedCategories[catIdx];
      if (cat && cat.videos[selectedCol]) {
        playVideoItem(cat.videos[selectedCol], cat, selectedCol);
      }
    }
  }, [hasWatchedRow, selectedRow, selectedCol, handleSelectWatchedVideo, displayedCategories, playVideoItem]);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Clear your Continue Watching history?')) {
      clearWatchedVideos();
      setWatchedVideos([]);
      setSelectedRow(0);
      setSelectedCol(0);
    }
  }, []);

  const handleRemoveHistoryItem = useCallback((videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeWatchedVideo(videoId);
    setWatchedVideos(updated);
  }, []);

  const handleBack = useCallback(() => {
    if (playingTarget) {
      setPlayingTarget(null);
    } else if (searchQuery) {
      handleClearSearch();
    } else if (selectedRow > 0 || selectedCol > 0) {
      setSelectedRow(0);
      setSelectedCol(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [playingTarget, searchQuery, selectedRow, selectedCol]);

  // Advance to the next unblocked video strictly from the approved list
  const handlePlayNextVideo = useCallback(() => {
    if (!playingTarget) return;

    const { category, videoIndex } = playingTarget;
    const vids = category.videos;

    // 1. Search next unblocked video in current category
    for (let i = videoIndex + 1; i < vids.length; i++) {
      if (!isVideoBlocked(vids[i])) {
        playVideoItem(vids[i], category, i);
        return;
      }
    }

    // 2. Search next unblocked video in subsequent categories
    const currentCatIdx = displayedCategories.findIndex((c) => c.id === category.id);
    if (currentCatIdx !== -1) {
      for (let cIdx = currentCatIdx + 1; cIdx < displayedCategories.length; cIdx++) {
        const nextCat = displayedCategories[cIdx];
        const foundIdx = nextCat.videos.findIndex((v) => !isVideoBlocked(v));
        if (foundIdx !== -1) {
          playVideoItem(nextCat.videos[foundIdx], nextCat, foundIdx);
          return;
        }
      }
    }

    // 3. Loop back to first unblocked video in the first category
    if (displayedCategories.length > 0) {
      for (const firstCat of displayedCategories) {
        const firstIdx = firstCat.videos.findIndex((v) => !isVideoBlocked(v));
        if (firstIdx !== -1) {
          playVideoItem(firstCat.videos[firstIdx], firstCat, firstIdx);
          return;
        }
      }
    }

    // Fallback: loop to index 0 of current category
    if (vids.length > 0) {
      playVideoItem(vids[0], category, 0);
    }
  }, [playingTarget, displayedCategories, playVideoItem]);

  // Play previous unblocked video strictly from the approved list
  const handlePlayPrevVideo = useCallback(() => {
    if (!playingTarget) return;

    const { category, videoIndex } = playingTarget;
    const vids = category.videos;

    // 1. Search previous unblocked video in current category
    for (let i = videoIndex - 1; i >= 0; i--) {
      if (!isVideoBlocked(vids[i])) {
        playVideoItem(vids[i], category, i);
        return;
      }
    }

    // 2. Search backward in preceding categories
    const currentCatIdx = displayedCategories.findIndex((c) => c.id === category.id);
    if (currentCatIdx > 0) {
      for (let cIdx = currentCatIdx - 1; cIdx >= 0; cIdx--) {
        const prevCat = displayedCategories[cIdx];
        for (let i = prevCat.videos.length - 1; i >= 0; i--) {
          if (!isVideoBlocked(prevCat.videos[i])) {
            playVideoItem(prevCat.videos[i], prevCat, i);
            return;
          }
        }
      }
    }

    // Fallback: loop to last unblocked video in current category
    for (let i = vids.length - 1; i >= 0; i--) {
      if (!isVideoBlocked(vids[i])) {
        playVideoItem(vids[i], category, i);
        return;
      }
    }
  }, [playingTarget, displayedCategories, playVideoItem]);

  // Preview next video from approved list
  const upNextVideo = useMemo<VideoItem | null>(() => {
    if (!playingTarget) return null;
    const { category, videoIndex } = playingTarget;
    const vids = category.videos;

    for (let i = videoIndex + 1; i < vids.length; i++) {
      if (!isVideoBlocked(vids[i])) {
        return vids[i];
      }
    }

    const currentCatIdx = displayedCategories.findIndex((c) => c.id === category.id);
    if (currentCatIdx !== -1) {
      for (let cIdx = currentCatIdx + 1; cIdx < displayedCategories.length; cIdx++) {
        const nextCat = displayedCategories[cIdx];
        const found = nextCat.videos.find((v) => !isVideoBlocked(v));
        if (found) return found;
      }
    }

    if (displayedCategories.length > 0) {
      for (const firstCat of displayedCategories) {
        const found = firstCat.videos.find((v) => !isVideoBlocked(v));
        if (found) return found;
      }
    }

    return vids[0] || null;
  }, [playingTarget, displayedCategories]);

  // Preview previous video from approved list
  const prevVideo = useMemo<VideoItem | null>(() => {
    if (!playingTarget) return null;
    const { category, videoIndex } = playingTarget;
    const vids = category.videos;

    for (let i = videoIndex - 1; i >= 0; i--) {
      if (!isVideoBlocked(vids[i])) {
        return vids[i];
      }
    }

    const currentCatIdx = displayedCategories.findIndex((c) => c.id === category.id);
    if (currentCatIdx > 0) {
      for (let cIdx = currentCatIdx - 1; cIdx >= 0; cIdx--) {
        const prevCat = displayedCategories[cIdx];
        for (let i = prevCat.videos.length - 1; i >= 0; i--) {
          if (!isVideoBlocked(prevCat.videos[i])) {
            return prevCat.videos[i];
          }
        }
      }
    }

    return vids[vids.length - 1] || null;
  }, [playingTarget, displayedCategories]);

  // Save new URL from modal
  const handleSaveUrl = (newUrl: string) => {
    setFeedUrl(newUrl);
    saveFeedUrl(newUrl);
    fetchFeed(newUrl);
  };

  const handleApplyRawJson = (newFeed: TVFeed) => {
    setFeed(newFeed);
    setSelectedRow(0);
    setSelectedCol(0);
  };

  const handleToggleLock = () => {
    const newState = !isKioskLocked;
    setIsKioskLocked(newState);
    setKioskLockState(newState);
  };

  // Keyboard / D-Pad navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (playingTarget) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          setPlayingTarget(null);
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handlePlayNextVideo();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePlayPrevVideo();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (selectedRow > 0) {
            const nextRow = selectedRow - 1;
            const maxCol = getVideoCountForRow(nextRow) - 1;
            setSelectedRow(nextRow);
            setSelectedCol((c) => Math.min(c, Math.max(0, maxCol)));
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (selectedRow < totalRows - 1) {
            const nextRow = selectedRow + 1;
            const maxCol = getVideoCountForRow(nextRow) - 1;
            setSelectedRow(nextRow);
            setSelectedCol((c) => Math.min(c, Math.max(0, maxCol)));
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (selectedCol > 0) {
            setSelectedCol((c) => c - 1);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          {
            const maxCol = getVideoCountForRow(selectedRow) - 1;
            if (selectedCol < maxCol) {
              setSelectedCol((c) => c + 1);
            }
          }
          break;

        case 'Enter':
        case 'NumpadEnter':
          e.preventDefault();
          handlePlayCurrent();
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          handleBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    playingTarget,
    selectedRow,
    selectedCol,
    totalRows,
    getVideoCountForRow,
    handlePlayCurrent,
    handleBack,
  ]);

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col antialiased selection:bg-rose-500 selection:text-white pb-20 md:pb-8">
      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode: Playing from local cached whitelist</span>
        </div>
      )}

      {/* Top Bar Header with Integrated Search Input & Parental Controls */}
      <TopNavigation
        appTitle={feed?.appTitle || 'GreenKid TV'}
        deviceMode={deviceMode}
        onSetDeviceMode={setDeviceMode}
        isKioskLocked={isKioskLocked}
        onOpenFeedConfig={() => setIsConfigModalOpen(true)}
        onToggleLock={handleToggleLock}
        onRefreshFeed={() => handleTriggerGithubSync()}
        isRefreshing={isRefreshing}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        categoryNames={feed?.categories.map((c) => c.title) || []}
        onSelectCategoryIndex={(idx) => {
          const targetRow = hasWatchedRow ? idx + 1 : idx;
          setSelectedRow(targetRow);
          setSelectedCol(0);
          setActiveTab('all');
        }}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onOpenParentalControls={() => setIsParentalModalOpen(true)}
        blockedCount={blockedVideosCount}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        onOpenSleepTimer={() => setIsSleepTimerModalOpen(true)}
        isTimerActive={timerStatus.isActive && !timerStatus.isExpired}
        timerSecondsRemaining={timerStatus.remainingSeconds}
        activeSource={activeSource}
        lastSyncTime={lastSyncTime}
      />

      {/* Sync Update Floating Toast */}
      {syncToast && (
        <div className="fixed top-16 right-4 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`px-4 py-2.5 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
            syncToast.isError
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-900/30'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${syncToast.isError ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <RefreshCw className="w-10 h-10 text-sky-400 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-white">Loading Remote Feed...</h2>
            <p className="text-xs text-slate-400 max-w-sm mt-1 font-mono truncate">
              {feedUrl}
            </p>
          </div>
        ) : errorMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Feed Load Error</h2>
            <p className="text-sm text-slate-400 max-w-md mt-1">{errorMessage}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => fetchFeed(DEFAULT_FEED_URL)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl transition"
              >
                Load Default Feed
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                Change JSON URL
              </button>
            </div>
          </div>
        ) : searchQuery.trim() && totalMatchingCount === 0 ? (
          /* Empty Search Results State */
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <SearchX className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-white">No videos found</h2>
            <p className="text-sm text-slate-400 max-w-md mt-1">
              No approved videos match title &quot;<span className="text-sky-400">{searchQuery}</span>&quot;
            </p>
            <button
              onClick={handleClearSearch}
              className="mt-5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              Clear Search
            </button>
          </div>
        ) : displayedCategories.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <Tv className="w-12 h-12 text-slate-600 mb-3" />
            <h2 className="text-base font-semibold text-slate-300">
              {blockedVideosCount > 0 ? 'All videos hidden by Parental Controls' : 'No approved categories found'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {blockedVideosCount > 0
                ? 'Check Parental Controls to restore hidden videos'
                : 'Check your JSON source or reset to default feed'}
            </p>
            {blockedVideosCount > 0 && (
              <button
                onClick={() => setIsParentalModalOpen(true)}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Manage Parental Controls
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Search Filter Header Banner if active */}
            {searchQuery.trim() && (
              <div className="px-6 md:px-12 pt-4 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                  <span>
                    Found <strong className="text-sky-400 font-mono">{totalMatchingCount}</strong>{' '}
                    {totalMatchingCount === 1 ? 'video' : 'videos'} matching title &quot;
                    <span className="text-white font-medium">{searchQuery}</span>&quot;
                  </span>
                </div>
                <button
                  onClick={handleClearSearch}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              </div>
            )}

            {/* Cinematic Hero Spotlight for focused video */}
            <HeroSpotlight
              focusedVideo={focusedVideo}
              categoryTitle={focusedCategoryTitle}
              onPlay={handlePlayCurrent}
              isKioskLocked={isKioskLocked}
            />

            {/* Category Rails with Continue Watching at the top */}
            <div className="space-y-4 pt-4">
              {/* Continue Watching Shelf (Row 0 when present & not searching) */}
              {hasWatchedRow && (
                <RecentlyWatchedShelf
                  watchedItems={displayedWatchedVideos}
                  rowIndex={0}
                  selectedRow={selectedRow}
                  selectedCol={selectedCol}
                  onSelectVideo={handleSelectWatchedVideo}
                  onFocusVideo={(r, c) => {
                    setSelectedRow(r);
                    setSelectedCol(c);
                  }}
                  onClearHistory={handleClearHistory}
                  onRemoveItem={handleRemoveHistoryItem}
                  onHideVideo={handleHideVideo}
                />
              )}

              {/* Filtered Category Rails */}
              {displayedCategories.map((category, rowIdx) => {
                const effectiveRow = hasWatchedRow ? rowIdx + 1 : rowIdx;
                return (
                  <CategoryShelf
                    key={category.id}
                    category={category}
                    rowIndex={effectiveRow}
                    selectedRow={selectedRow}
                    selectedCol={selectedCol}
                    onSelectVideo={(r, c) => handleSelectCategoryVideo(rowIdx, c)}
                    onFocusVideo={(r, c) => {
                      setSelectedRow(r);
                      setSelectedCol(c);
                    }}
                    onHideVideo={handleHideVideo}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Restricted In-App YouTube Player (Isolated & Sandboxed) */}
      {playingTarget && (
        <YouTubeLeanbackPlayer
          currentCategory={playingTarget.category}
          videoIndex={playingTarget.videoIndex}
          onClose={() => setPlayingTarget(null)}
          onSelectVideo={(newVidIdx) => {
            const nextVid = playingTarget.category.videos[newVidIdx];
            if (nextVid && !isVideoBlocked(nextVid)) {
              playVideoItem(nextVid, playingTarget.category, newVidIdx);
            }
          }}
          onPlayNext={handlePlayNextVideo}
          onPlayPrevious={handlePlayPrevVideo}
          nextVideo={upNextVideo}
          previousVideo={prevVideo}
          isKioskLocked={isKioskLocked}
        />
      )}

      {/* Floating Smart TV Remote Simulator HUD */}
      <TVRemoteHUD
        onUp={() => {
          if (selectedRow > 0) {
            const nextRow = selectedRow - 1;
            const maxCol = getVideoCountForRow(nextRow) - 1;
            setSelectedRow(nextRow);
            setSelectedCol((c) => Math.min(c, Math.max(0, maxCol)));
          }
        }}
        onDown={() => {
          if (selectedRow < totalRows - 1) {
            const nextRow = selectedRow + 1;
            const maxCol = getVideoCountForRow(nextRow) - 1;
            setSelectedRow(nextRow);
            setSelectedCol((c) => Math.min(c, Math.max(0, maxCol)));
          }
        }}
        onLeft={() => {
          if (selectedCol > 0) {
            setSelectedCol((c) => c - 1);
          }
        }}
        onRight={() => {
          const maxCol = getVideoCountForRow(selectedRow) - 1;
          if (selectedCol < maxCol) {
            setSelectedCol((c) => c + 1);
          }
        }}
        onSelect={handlePlayCurrent}
        onBack={handleBack}
        onHome={() => {
          setSelectedRow(0);
          setSelectedCol(0);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onTogglePlay={handlePlayCurrent}
        onReplay={handlePlayCurrent}
        onNext={handlePlayNextVideo}
        onPrev={handlePlayPrevVideo}
        onFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }}
        isPlaying={!!playingTarget}
      />

      {/* Mobile Touch Bottom Bar */}
      <MobileBottomBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenFeedConfig={() => setIsConfigModalOpen(true)}
        onPlayCurrent={handlePlayCurrent}
        hasSelection={!!focusedVideo}
      />

      {/* Feed Source & Kiosk Configuration Modal */}
      <FeedConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentUrl={feedUrl}
        onSaveUrl={handleSaveUrl}
        isKioskLocked={isKioskLocked}
        onSetKioskLocked={setIsKioskLocked}
        onApplyRawJson={handleApplyRawJson}
        adminPin={adminPin}
        onUpdateAdminPin={setAdminPinState}
        activeSource={activeSource}
        lastSyncTime={lastSyncTime}
        onTriggerGithubSync={handleTriggerGithubSync}
        currentFeed={feed}
        onRestoreLocal={handleRestoreLocal}
      />

      {/* Parental Controls & Content Filter Modal */}
      <ParentalControlModal
        isOpen={isParentalModalOpen}
        onClose={() => setIsParentalModalOpen(false)}
        onStateChanged={() => {
          setParentalVersion((v) => v + 1);
        }}
      />

      {/* Smart TV APK & Sideload Guide Modal */}
      <SmartTvApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        appUrl={
          typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
            ? window.location.origin
            : 'https://ais-pre-eb3zgm5puel3wpubvj5hdu-599766215321.europe-west3.run.app'
        }
      />

      {/* Sleep Timer & Screen Time Limit Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerModalOpen}
        onClose={() => setIsSleepTimerModalOpen(false)}
        onTimerUpdated={() => setTimerStatus(getTimerStatus())}
      />

      {/* Curfew & Bedtime Screen Lock Curtain */}
      {timerStatus.isExpired && (
        <CurfewCurtain onDismiss={() => setTimerStatus(getTimerStatus())} />
      )}
    </div>
  );
}
