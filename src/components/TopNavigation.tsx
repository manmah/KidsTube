import React, { useRef, useEffect } from 'react';
import { DeviceMode } from '../types/tvFeed';
import { Tv, Smartphone, Lock, Unlock, Settings, RefreshCw, Search, X, Shield } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface TopNavigationProps {
  appTitle: string;
  deviceMode: DeviceMode;
  onSetDeviceMode: (mode: DeviceMode) => void;
  isKioskLocked: boolean;
  onOpenFeedConfig: () => void;
  onToggleLock: () => void;
  onRefreshFeed: () => void;
  isRefreshing: boolean;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  categoryNames: string[];
  onSelectCategoryIndex: (index: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onOpenParentalControls: () => void;
  blockedCount: number;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  appTitle,
  deviceMode,
  onSetDeviceMode,
  isKioskLocked,
  onOpenFeedConfig,
  onToggleLock,
  onRefreshFeed,
  isRefreshing,
  activeTab,
  onSelectTab,
  categoryNames,
  onSelectCategoryIndex,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onOpenParentalControls,
  blockedCount,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global hotkey '/' to quickly focus search input (standard web & smart TV convention)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#070a11]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-10 py-3 flex items-center justify-between gap-4 md:gap-8">
      {/* Zone 1: Wordmark / Brand element */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClearSearch();
          onSelectCategoryIndex(0);
        }}
        className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 group"
      >
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
          <Tv className="w-4 h-4" />
        </div>
        <span className="font-extrabold text-white group-hover:text-sky-300 transition-colors">
          Curate<span className="text-sky-400">TV</span>
        </span>
      </a>

      {/* Zone 2: Search Input Field & Nav Links */}
      <div className="flex-1 max-w-lg flex items-center gap-4">
        {/* Search Input Field */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchQuery) onClearSearch();
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Search videos by title... (Press /)"
            className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-sky-500 rounded-xl pl-9 pr-8 py-2 text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onClearSearch();
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Clear search (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick nav tabs (visible when not actively searching) */}
        {!searchQuery && (
          <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-slate-400">
            <button
              onClick={() => onSelectTab('all')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'all' ? 'text-sky-400 font-semibold' : ''
              }`}
            >
              All Channels
            </button>
            {categoryNames.slice(0, 2).map((name, idx) => (
              <button
                key={name}
                onClick={() => onSelectCategoryIndex(idx)}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 max-w-[120px] truncate"
              >
                {name}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Refresh Feed */}
        <button
          onClick={onRefreshFeed}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 transition disabled:opacity-50"
          title="Reload Remote JSON Feed"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
        </button>

        {/* Device Mode Toggle (Smart TV vs Mobile) */}
        <div className="hidden sm:flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => onSetDeviceMode('tv')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              deviceMode === 'tv'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Smart TV 10-foot Leanback mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV UI</span>
          </button>
          <button
            onClick={() => onSetDeviceMode('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              deviceMode === 'mobile'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile Touch mode"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Parental Controls Button */}
        <button
          onClick={onOpenParentalControls}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-lg border border-rose-500/30 whitespace-nowrap shrink-0 transition"
          title="Parental Controls: Remove unwanted videos and manage content filters"
        >
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">Parental Control</span>
          {blockedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
              {blockedCount}
            </span>
          )}
        </button>

        {/* Kiosk Lock State Button */}
        <button
          onClick={onToggleLock}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            isKioskLocked
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-950/70'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
          title={isKioskLocked ? 'Kiosk Mode Locked (Click to enter PIN)' : 'Kiosk Mode Unlocked'}
        >
          {isKioskLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Locked</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Unlocked</span>
            </>
          )}
        </button>

        {/* Feed Config Dialog */}
        <button
          onClick={onOpenFeedConfig}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap shrink-0 transition"
        >
          <Settings className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">JSON Feed</span>
        </button>

        {/* PWA In-App Install */}
        <PWAInstallButton compact />
      </div>
    </header>
  );
};
