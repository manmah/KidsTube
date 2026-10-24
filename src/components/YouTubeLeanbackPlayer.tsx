import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoItem, CategorySection } from '../types/tvFeed';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ListVideo,
  CheckCircle2,
  Lock,
  SkipForward,
  SkipBack,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Shield,
  Tv,
} from 'lucide-react';

interface YouTubeLeanbackPlayerProps {
  currentCategory: CategorySection;
  videoIndex: number;
  onClose: () => void;
  onSelectVideo: (videoIndex: number) => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  nextVideo?: VideoItem | null;
  previousVideo?: VideoItem | null;
  isKioskLocked?: boolean;
}

export const YouTubeLeanbackPlayer: React.FC<YouTubeLeanbackPlayerProps> = ({
  currentCategory,
  videoIndex,
  onClose,
  onSelectVideo,
  onPlayNext,
  onPlayPrevious,
  nextVideo,
  previousVideo,
  isKioskLocked = true,
}) => {
  const currentVideo: VideoItem = currentCategory.videos[videoIndex] || currentCategory.videos[0];
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Strict Kid Shield: removes YouTube chrome & hides "More videos" icon completely
  const [isStrictShield, setIsStrictShield] = useState<boolean>(() => {
    return localStorage.getItem('greenkid_strict_shield') !== 'false';
  });

  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    return localStorage.getItem('greenkid_autoplay_next') !== 'false';
  });

  // End of video auto-advance countdown state
  const [isEndedModalOpen, setIsEndedModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalVideos = currentCategory.videos.length;

  // Resolve upcoming video if not explicitly supplied
  const effectiveNextVideo =
    nextVideo !== undefined
      ? nextVideo
      : videoIndex + 1 < totalVideos
      ? currentCategory.videos[videoIndex + 1]
      : currentCategory.videos[0];

  // Resolve previous video
  const effectivePrevVideo =
    previousVideo !== undefined
      ? previousVideo
      : videoIndex > 0
      ? currentCategory.videos[videoIndex - 1]
      : currentCategory.videos[totalVideos - 1];

  // Auto-hide OSD controls after inactivity
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4500);
  }, []);

  // PostMessage helper to control YouTube iframe
  const sendYouTubeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args,
          }),
          '*'
        );
      }
    } catch (err) {
      console.warn('YouTube postMessage error:', err);
    }
  }, []);

  // Send listening handshake to activate postMessage events from YouTube embed
  const initListening = useCallback(() => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      }
    } catch {
      // Cross-origin restriction fallback
    }
  }, []);

  // Periodic handshake initialization for the first 3 seconds after load
  useEffect(() => {
    initListening();
    const interval = setInterval(initListening, 600);
    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [iframeKey, currentVideo.youtubeId, initListening]);

  // Video reset when target video changes
  useEffect(() => {
    bumpControls();
    setIsEndedModalOpen(false);
    setIsPaused(false);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [currentVideo.id, bumpControls]);

  // Fallback playback timer to advance scrubber smoothly when playing
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = setInterval(() => {
      setCurrentTime((t) => {
        if (duration > 0 && t >= duration) return t;
        return t + 0.5;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused, duration]);

  // Play / Pause Handlers
  const handlePlay = useCallback(() => {
    setIsPaused(false);
    setIsPlaying(true);
    sendYouTubeCommand('playVideo');
    bumpControls();
  }, [sendYouTubeCommand, bumpControls]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    setIsPlaying(false);
    sendYouTubeCommand('pauseVideo');
    bumpControls();
  }, [sendYouTubeCommand, bumpControls]);

  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying && !isPaused) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, isPaused, handlePause, handlePlay]);

  // Seeking Handlers
  const handleSeek = useCallback(
    (seconds: number) => {
      const target = Math.max(0, Math.min(duration || 3600, seconds));
      setCurrentTime(target);
      sendYouTubeCommand('seekTo', [target, true]);
      bumpControls();
    },
    [duration, sendYouTubeCommand, bumpControls]
  );

  const handleSkipForward = useCallback(() => {
    handleSeek(currentTime + 10);
  }, [currentTime, handleSeek]);

  const handleSkipBackward = useCallback(() => {
    handleSeek(currentTime - 10);
  }, [currentTime, handleSeek]);

  // Mute Handler
  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      sendYouTubeCommand('unMute');
      setIsMuted(false);
    } else {
      sendYouTubeCommand('mute');
      setIsMuted(true);
    }
    bumpControls();
  }, [isMuted, sendYouTubeCommand, bumpControls]);

  // Replay current video from start
  const handleReplay = useCallback(() => {
    setIsEndedModalOpen(false);
    setIsPaused(false);
    setIsPlaying(true);
    setCurrentTime(0);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    sendYouTubeCommand('seekTo', [0, true]);
    sendYouTubeCommand('playVideo');
    setIframeKey((prev) => prev + 1);
    bumpControls();
  }, [sendYouTubeCommand, bumpControls]);

  // Action to play next video from user's list
  const handleNextFromList = useCallback(() => {
    setIsEndedModalOpen(false);
    setIsPaused(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (onPlayNext) {
      onPlayNext();
    } else if (videoIndex + 1 < totalVideos) {
      onSelectVideo(videoIndex + 1);
    } else {
      onSelectVideo(0); // loop within list
    }
  }, [onPlayNext, onSelectVideo, videoIndex, totalVideos]);

  // Action to play previous video from list
  const handlePrevFromList = useCallback(() => {
    setIsEndedModalOpen(false);
    setIsPaused(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (onPlayPrevious) {
      onPlayPrevious();
    } else if (videoIndex > 0) {
      onSelectVideo(videoIndex - 1);
    } else {
      onSelectVideo(totalVideos - 1);
    }
  }, [onPlayPrevious, onSelectVideo, videoIndex, totalVideos]);

  // Toggle autoplay setting
  const toggleAutoPlay = () => {
    setAutoPlayNext((prev) => {
      const next = !prev;
      localStorage.setItem('greenkid_autoplay_next', String(next));
      return next;
    });
  };

  // Toggle Strict Kid Shield Mode
  const toggleStrictShield = () => {
    setIsStrictShield((prev) => {
      const next = !prev;
      localStorage.setItem('greenkid_strict_shield', String(next));
      return next;
    });
  };

  // Trigger auto-advance modal when a video ends
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);

    if (!autoPlayNext) {
      setIsEndedModalOpen(true);
      setShowControls(true);
      return;
    }

    // Start countdown for next approved video
    setCountdown(5);
    setIsEndedModalOpen(true);
    setShowControls(true);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          handleNextFromList();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [autoPlayNext, handleNextFromList]);

  // Listen to YouTube postMessage events for playback state and time updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        // 1. Progress time & duration from infoDelivery
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.muted === 'boolean') {
            setIsMuted(data.info.muted);
          }

          const infoState = data.info.playerState;
          if (typeof infoState === 'number') {
            if (infoState === 0) {
              handleVideoEnded();
            } else if (infoState === 1) {
              setIsPlaying(true);
              setIsPaused(false);
              setIsEndedModalOpen(false);
            } else if (infoState === 2) {
              setIsPlaying(false);
              setIsPaused(true);
            }
          }
        }

        // 2. State change events
        if (data.event === 'onStateChange') {
          const state = data.info;
          if (state === 0) {
            handleVideoEnded();
          } else if (state === 1) {
            setIsPlaying(true);
            setIsPaused(false);
            setIsEndedModalOpen(false);
          } else if (state === 2) {
            setIsPlaying(false);
            setIsPaused(true);
          }
        }
      } catch {
        // Non-JSON message from other extensions or iframes, safely ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleVideoEnded]);

  // Keyboard shortcuts during video playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      bumpControls();

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkipBackward();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkipForward();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNextFromList();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrevFromList();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReplay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (isEndedModalOpen) {
          setIsEndedModalOpen(false);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        } else if (showDrawer) {
          setShowDrawer(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    bumpControls,
    handleTogglePlayPause,
    handleSkipBackward,
    handleSkipForward,
    handleNextFromList,
    handlePrevFromList,
    handleReplay,
    handleToggleMute,
    isEndedModalOpen,
    showDrawer,
    onClose,
  ]);

  // Toggle native Fullscreen
  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await playerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // YouTube embed URL configuration:
  // - controls=0 (when Strict Shield active): COMPLETELY HIDES the "More videos" icon and top chrome!
  // - controls=1 (fallback standard): still guarded by top shield & pause overlay
  // - rel=0: restricts related videos exclusively to current channel
  // - modestbranding=1: minimizes YouTube chrome
  // - iv_load_policy=3: suppresses external annotation cards and popups
  // - disablekb=1: gives our React app complete control over keyboard events
  // - enablejsapi=1: emits postMessage events so we can auto-advance when finished
  const controlsSetting = isStrictShield ? 0 : 1;
  const embedUrl = `https://www.youtube.com/embed/${currentVideo.youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&controls=${controlsSetting}&iv_load_policy=3&fs=1&playsinline=1&disablekb=1&origin=${encodeURIComponent(
    origin
  )}`;

  // Time formatter helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={bumpControls}
      onClick={bumpControls}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* 
        YouTube IFrame with STRICT SHIELD PROTECTION:
        - When Strict Shield is ON: pointer-events-none prevents any hover or click into YouTube,
          which ensures YouTube's "More videos" icon and chrome NEVER appear!
        - Clicks on the screen toggle Play/Pause through our custom KidsTube player.
        - Sandbox restricts popups and top navigation.
      */}
      <div
        className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
        onClick={(e) => {
          // If clicking background video container, toggle play/pause
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV') {
            handleTogglePlayPause();
          }
        }}
      >
        <iframe
          ref={iframeRef}
          key={`${currentVideo.youtubeId}-${iframeKey}-${controlsSetting}`}
          src={embedUrl}
          title={currentVideo.title}
          onLoad={initListening}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allowFullScreen
          className={`w-full h-full border-0 ${
            isStrictShield ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        />

        {/* 
          Permanent Top Click & Hover Shield:
          Covers the top 72px of the player so YouTube's header chrome (title, share, and "More videos" icon)
          can NEVER be clicked by a child to navigate outside the approved list.
        */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            bumpControls();
          }}
          className="absolute top-0 inset-x-0 h-18 z-20 pointer-events-auto cursor-pointer"
          title="Safe Kids Stream: External videos blocked"
        />

        {/* 
          Permanent Bottom-Right Click Shield:
          Intercepts clicks on the YouTube watermark or external link button
        */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            bumpControls();
          }}
          className="absolute bottom-0 right-0 w-36 h-14 z-20 pointer-events-auto cursor-pointer"
          title="Safe Kids Stream: External links blocked"
        />
      </div>

      {/* 
        ========================================================================
        SAFE PAUSE OVERLAY:
        Completely conceals YouTube's "More videos" pause screen shelf and prevents
        unrelated video recommendations from ever being shown or clicked!
        ========================================================================
      */}
      {isPaused && !isEndedModalOpen && (
        <div
          className="absolute inset-0 z-35 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200 pointer-events-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handlePlay();
            }
          }}
        >
          <div className="bg-slate-900/95 border border-slate-700/90 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center space-y-5">
            {/* Safe Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Safe Kids Stream · External Videos Blocked</span>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Playback Paused
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 truncate">
                {currentVideo.title}
              </p>
              <p className="text-xs text-sky-400 font-medium mt-0.5">
                {currentVideo.channel}
              </p>
            </div>

            {/* Big Resume Play Button */}
            <div className="flex justify-center py-2">
              <button
                onClick={handlePlay}
                className="group relative flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-sky-500/30 active:scale-95 transition"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Resume Playing</span>
              </button>
            </div>

            {/* Up Next Preview Card from Current Approved Feed */}
            {effectiveNextVideo && (
              <div className="pt-2 border-t border-slate-800 text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>Up Next from your list</span>
                  <span className="text-sky-400 font-mono text-[11px]">
                    {videoIndex + 2 <= totalVideos ? `${videoIndex + 2} of ${totalVideos}` : `1 of ${totalVideos}`}
                  </span>
                </div>

                <div
                  onClick={handleNextFromList}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 cursor-pointer transition group"
                >
                  <div className="relative w-20 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-950">
                    <img
                      src={effectiveNextVideo.thumbnail}
                      alt={effectiveNextVideo.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                      {effectiveNextVideo.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {effectiveNextVideo.channel} {effectiveNextVideo.duration ? `· ${effectiveNextVideo.duration}` : ''}
                    </p>
                  </div>
                  <SkipForward className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0" />
                </div>
              </div>
            )}

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                onClick={handlePrevFromList}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 active:scale-95 transition"
                title="Previous video from list"
              >
                <SkipBack className="w-3.5 h-3.5 text-sky-400" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleReplay}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 active:scale-95 transition"
                title="Replay video from start"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                <span>Replay</span>
              </button>

              <button
                onClick={() => setShowDrawer(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 active:scale-95 transition"
                title="Browse approved videos"
              >
                <ListVideo className="w-3.5 h-3.5 text-sky-400" />
                <span>Browse List</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        SAFE END OVERLAY:
        Completely conceals YouTube's end-screen recommendation grid!
        ========================================================================
      */}
      {isEndedModalOpen && effectiveNextVideo && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Next Up From Your Approved List</span>
            </div>

            {/* Thumbnail Preview */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-700/80 shadow-md">
              <img
                src={effectiveNextVideo.thumbnail}
                alt={effectiveNextVideo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs font-semibold text-white truncate text-left w-full">
                  {effectiveNextVideo.title}
                </span>
              </div>
            </div>

            {/* Countdown info */}
            <div>
              <p className="text-sm text-slate-300">
                Playing next video in <span className="font-bold text-sky-400 font-mono text-base">{countdown}s</span>
              </p>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleNextFromList}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Now</span>
              </button>

              <button
                onClick={() => {
                  setIsEndedModalOpen(false);
                  if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm border border-slate-700 active:scale-95 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleReplay}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
                title="Replay video"
              >
                <RotateCcw className="w-4 h-4 text-sky-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        KIDSTUBE LEANBACK ON-SCREEN DISPLAY (OSD)
        Provides child-friendly, uncluttered controls with no YouTube "More videos"
        ========================================================================
      */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-between p-4 md:p-6 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top OSD Bar */}
        <div className="flex items-center justify-between gap-4 pointer-events-auto bg-gradient-to-b from-black/95 via-black/80 to-transparent p-4 rounded-2xl backdrop-blur-xs border border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-medium border border-slate-700 shadow-lg active:scale-95 transition"
              title="Return to Channel Guide (Esc / Back)"
            >
              <ArrowLeft className="w-5 h-5 text-sky-400" />
              <span className="hidden sm:inline text-sm">Guide</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 truncate max-w-[140px] sm:max-w-none">
                  {currentCategory.title}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {videoIndex + 1} / {totalVideos}
                </span>
              </div>
              <h1 className="text-sm md:text-base lg:text-lg font-bold text-white max-w-md lg:max-w-xl truncate">
                {currentVideo.title}
              </h1>
            </div>
          </div>

          {/* Whitelist Guard, Shield Mode Toggle, & Fullscreen */}
          <div className="flex items-center gap-2.5">
            {/* Strict Shield Toggle Button */}
            <button
              onClick={toggleStrictShield}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isStrictShield
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
              title={
                isStrictShield
                  ? 'Strict Shield ON: YouTube More Videos and external suggestions are strictly hidden'
                  : 'Standard Mode: Click to activate Strict Shield'
              }
            >
              <ShieldCheck className={`w-4 h-4 ${isStrictShield ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline">
                {isStrictShield ? 'Kid Shield Active' : 'Standard Mode'}
              </span>
            </button>

            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium border border-slate-700 shadow-md transition"
              title="Show Approved Channel Videos"
            >
              <ListVideo className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Approved ({totalVideos})</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-md transition"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Custom Playback Bar (Timeline Scrubber, Controls, Next/Prev) */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/95 via-black/85 to-transparent p-4 md:p-6 rounded-2xl backdrop-blur-xs border border-white/5 space-y-3">
          {/* Interactive Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 w-11 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>

            <div
              className="relative flex-1 h-3 bg-slate-800/90 hover:h-4 rounded-full cursor-pointer group flex items-center transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleSeek(percent * (duration || 300));
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full relative transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>

            <span className="text-xs font-mono text-slate-400 w-11 tabular-nums">
              {duration > 0 ? formatTime(duration) : '--:--'}
            </span>
          </div>

          {/* Bottom Button Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              {/* Play / Pause Toggle Button */}
              <button
                onClick={handleTogglePlayPause}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 active:scale-95 transition"
                title={isPlaying && !isPaused ? 'Pause (Space / K)' : 'Play (Space / K)'}
              >
                {isPlaying && !isPaused ? (
                  <Pause className="w-5 h-5 fill-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                )}
              </button>

              {/* Skip Backward 10s */}
              <button
                onClick={handleSkipBackward}
                className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-md active:scale-95 transition"
                title="Rewind 10 seconds (Left Arrow)"
              >
                <RotateCcw className="w-4 h-4 text-sky-400" />
              </button>

              {/* Skip Forward 10s */}
              <button
                onClick={handleSkipForward}
                className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-md active:scale-95 transition"
                title="Forward 10 seconds (Right Arrow)"
              >
                <RotateCw className="w-4 h-4 text-sky-400" />
              </button>

              {/* Previous Video from List */}
              <button
                onClick={handlePrevFromList}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium border border-slate-700 shadow-lg active:scale-95 transition"
                title={effectivePrevVideo ? `Previous: ${effectivePrevVideo.title} (Press P)` : 'Previous Video'}
              >
                <SkipBack className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Next Video from List */}
              <button
                onClick={handleNextFromList}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 active:scale-95 transition group"
                title={effectiveNextVideo ? `Next: ${effectiveNextVideo.title} (Press N)` : 'Next Video from List'}
              >
                <span>Next</span>
                <SkipForward className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Replay Current Video */}
              <button
                onClick={handleReplay}
                className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-md active:scale-95 transition"
                title="Replay video from start (Press R)"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Mute / Unmute */}
              <button
                onClick={handleToggleMute}
                className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-md active:scale-95 transition"
                title={isMuted ? 'Unmute (Press M)' : 'Mute (Press M)'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-400" />
                )}
              </button>

              {/* Autoplay Next Toggle */}
              <button
                onClick={toggleAutoPlay}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  autoPlayNext
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400'
                }`}
                title="Toggle automatic playback of the next video from your list"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoPlayNext ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="hidden sm:inline">Autoplay Next:</span>
                <span>{autoPlayNext ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-xs text-slate-300 flex items-center gap-1.5 font-medium bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden md:inline">
                  Restricted to your approved list
                </span>
                <span className="md:hidden">
                  Safe List Only
                </span>
              </div>

              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 active:scale-95 transition"
                title="Back to channel guide"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        APPROVED VIDEOS DRAWER (STRICT FEED LIST)
        ========================================================================
      */}
      {showDrawer && (
        <div className="absolute inset-y-0 right-0 z-50 w-80 md:w-96 bg-slate-950/95 border-l border-slate-800 p-6 flex flex-col shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Approved Selection
              </h2>
              <p className="text-xs text-slate-400">
                {currentCategory.title}
              </p>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-2">
            {currentCategory.videos.map((vid, idx) => {
              const isSelected = idx === videoIndex;
              return (
                <div
                  key={vid.id}
                  onClick={() => {
                    onSelectVideo(idx);
                    setShowDrawer(false);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-sky-500/20 border border-sky-500/50 text-white'
                      : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                  }`}
                >
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-10 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {vid.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {vid.channel} {vid.duration ? `· ${vid.duration}` : ''}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
            Playback is restricted exclusively to this approved list.
          </div>
        </div>
      )}
    </div>
  );
};
