import React, { useState, useEffect, useRef } from 'react';
import { VideoItem, CategorySection } from '../types/tvFeed';
import {
  ArrowLeft,
  RotateCcw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ListVideo,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface YouTubeLeanbackPlayerProps {
  currentCategory: CategorySection;
  videoIndex: number;
  onClose: () => void;
  onSelectVideo: (videoIndex: number) => void;
  isKioskLocked?: boolean;
}

export const YouTubeLeanbackPlayer: React.FC<YouTubeLeanbackPlayerProps> = ({
  currentCategory,
  videoIndex,
  onClose,
  onSelectVideo,
  isKioskLocked = true,
}) => {
  const currentVideo: VideoItem = currentCategory.videos[videoIndex] || currentCategory.videos[0];
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalVideos = currentCategory.videos.length;

  // Auto-hide OSD controls after inactivity
  const bumpControls = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4500);
  };

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [currentVideo.id]);

  // Replay the current chosen video from the start (No next video)
  const handleReplay = () => {
    setIframeKey((prev) => prev + 1);
  };

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
  // - autoplay=1: immediately plays the chosen video
  // - rel=0: strictly suppresses related videos from other channels
  // - modestbranding=1: minimizes YouTube branding
  // - playsinline=1: prevents external video player pop-out on mobile
  // - iv_load_policy=3: suppresses external annotation cards and links
  // - controls=1: allows in-app seeking/volume without opening YouTube
  const embedUrl = `https://www.youtube.com/embed/${currentVideo.youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&controls=1&iv_load_policy=3&fs=1&playsinline=1&origin=${encodeURIComponent(
    origin
  )}`;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={bumpControls}
      onClick={bumpControls}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* 
        YouTube IFrame with STRICT SANDBOX PROTECTION:
        By using sandbox="allow-scripts allow-same-origin allow-presentation",
        we intentionally OMIT:
        - allow-top-navigation (prevents hijacking the main window to open YouTube)
        - allow-popups (prevents opening new tabs/windows to YouTube)
        - allow-popups-to-escape-sandbox
        This ensures clicking logos, external links, or "Watch on YouTube" CANNOT
        open the external YouTube app or navigate away from this kiosk.
      */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <iframe
          key={`${currentVideo.youtubeId}-${iframeKey}`}
          src={embedUrl}
          title={currentVideo.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      </div>

      {/* Leanback On-Screen Display (OSD) Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-between p-4 md:p-8 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top OSD Bar */}
        <div className="flex items-center justify-between gap-4 pointer-events-auto bg-gradient-to-b from-black/95 via-black/70 to-transparent p-4 rounded-b-2xl backdrop-blur-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-medium border border-slate-700 shadow-lg active:scale-95 transition"
              title="Return to Channel Guide (Esc / Back)"
            >
              <ArrowLeft className="w-5 h-5 text-sky-400" />
              <span className="hidden sm:inline text-sm">Channel Guide</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  {currentCategory.title}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {videoIndex + 1} / {totalVideos}
                </span>
              </div>
              <h1 className="text-sm md:text-lg font-bold text-white max-w-xl truncate">
                {currentVideo.title}
              </h1>
            </div>
          </div>

          {/* Sandboxed Protection & Fullscreen */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Isolated Player · YouTube App Blocked</span>
            </div>

            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-medium border border-slate-700 shadow-md transition"
              title="Show Approved Channel Videos"
            >
              <ListVideo className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Approved Videos ({totalVideos})</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-md transition"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Leanback Control Bar (Strictly Single-Video Replay / Back) */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 md:p-6 rounded-t-2xl backdrop-blur-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReplay}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-sm font-medium border border-slate-700 shadow-lg active:scale-95 transition"
              title="Replay this video from start"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
              <span>Replay Video</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 active:scale-95 transition"
              title="Back to category rails"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Selection</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Next videos disabled · Playback confined to chosen video</span>
          </div>
        </div>
      </div>

      {/* Approved Videos Drawer (Strict Whitelist from Current Feed) */}
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
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              Close
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

          <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-500">
            Next videos and external YouTube links are blocked.
          </div>
        </div>
      )}
    </div>
  );
};
