import React, { useRef, useEffect } from 'react';
import { WatchedVideoItem, VideoItem } from '../types/tvFeed';
import { VideoCard } from './VideoCard';
import { History, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWatchedTime } from '../services/historyStorage';

interface RecentlyWatchedShelfProps {
  watchedItems: WatchedVideoItem[];
  rowIndex: number;
  selectedRow: number;
  selectedCol: number;
  onSelectVideo: (colIndex: number) => void;
  onFocusVideo: (rowIndex: number, colIndex: number) => void;
  onClearHistory: () => void;
  onRemoveItem: (videoId: string, e: React.MouseEvent) => void;
  onHideVideo?: (video: VideoItem, e: React.MouseEvent) => void;
}

export const RecentlyWatchedShelf: React.FC<RecentlyWatchedShelfProps> = ({
  watchedItems,
  rowIndex,
  selectedRow,
  selectedCol,
  onSelectVideo,
  onFocusVideo,
  onClearHistory,
  onRemoveItem,
  onHideVideo,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isCurrentRow = rowIndex === selectedRow;

  // Auto-scroll the focused item into view
  useEffect(() => {
    if (isCurrentRow && scrollContainerRef.current) {
      const activeCard = scrollContainerRef.current.children[selectedCol] as HTMLElement | undefined;
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [isCurrentRow, selectedCol]);

  const scrollBy = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!watchedItems || watchedItems.length === 0) return null;

  return (
    <section className="relative my-6 first:mt-2 last:mb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between px-6 md:px-12 mb-3">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <History className={`w-5 h-5 ${isCurrentRow ? 'text-rose-400' : 'text-slate-400'}`} />
            <h2
              className={`text-lg md:text-xl font-bold tracking-tight transition-colors ${
                isCurrentRow ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              Continue Watching
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {watchedItems.length} {watchedItems.length === 1 ? 'video' : 'videos'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <p className="hidden md:block text-xs text-slate-400">
            Resumes from your local watch history
          </p>

          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-400 transition-colors p-1"
            title="Clear watched history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Horizontal Rail */}
      <div className="relative group/rail">
        {/* Left Arrow Button for Mouse / Touch Users */}
        <button
          onClick={() => scrollBy(-360)}
          aria-label="Scroll history left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-opacity border border-slate-700 shadow-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-4 md:gap-6 overflow-x-auto no-scrollbar px-6 md:px-12 py-3 scroll-smooth"
        >
          {watchedItems.map((item, colIndex) => {
            const isFocused = isCurrentRow && selectedCol === colIndex;
            return (
              <div key={item.video.id || item.video.youtubeId} className="relative group/item flex-shrink-0">
                <VideoCard
                  video={{
                    ...item.video,
                    badge: formatWatchedTime(item.watchedAt),
                  }}
                  isFocused={isFocused}
                  onSelect={() => onSelectVideo(colIndex)}
                  onFocus={() => onFocusVideo(rowIndex, colIndex)}
                  categoryTitle={item.categoryTitle || 'Watched'}
                  onHideVideo={onHideVideo}
                />

                {/* Quick remove button */}
                <button
                  onClick={(e) => onRemoveItem(item.video.id || item.video.youtubeId, e)}
                  aria-label="Remove from history"
                  className="absolute top-2 right-12 z-20 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition shadow-md"
                  title="Remove from Continue Watching"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button for Mouse / Touch Users */}
        <button
          onClick={() => scrollBy(360)}
          aria-label="Scroll history right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-opacity border border-slate-700 shadow-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
