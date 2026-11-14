import React, { useRef, useEffect } from 'react';
import { CategorySection, VideoItem } from '../types/tvFeed';
import { VideoCard } from './VideoCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryShelfProps {
  category: CategorySection;
  rowIndex: number;
  selectedRow: number;
  selectedCol: number;
  onSelectVideo: (rowIndex: number, colIndex: number) => void;
  onFocusVideo: (rowIndex: number, colIndex: number) => void;
  onHideVideo?: (video: VideoItem, e: React.MouseEvent) => void;
}

export const CategoryShelf: React.FC<CategoryShelfProps> = ({
  category,
  rowIndex,
  selectedRow,
  selectedCol,
  onSelectVideo,
  onFocusVideo,
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

  return (
    <section className="relative my-6 first:mt-2 last:mb-12">
      {/* Category Header */}
      <div className="flex items-baseline justify-between px-6 md:px-12 mb-3">
        <div className="flex items-baseline gap-3">
          <h2
            className={`text-lg md:text-xl font-bold tracking-tight transition-colors ${
              isCurrentRow ? 'text-sky-400' : 'text-slate-200'
            }`}
          >
            {category.title}
          </h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {category.videos.length} videos
          </span>
        </div>

        {category.description && (
          <p className="hidden md:block text-xs text-slate-400 max-w-md truncate">
            {category.description}
          </p>
        )}
      </div>

      {/* Horizontal Video Rail */}
      <div className="relative group/rail">
        {/* Left Arrow Button for Mouse / Touch Users */}
        <button
          onClick={() => scrollBy(-360)}
          aria-label="Scroll category left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-opacity border border-slate-700 shadow-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-4 md:gap-6 overflow-x-auto no-scrollbar px-6 md:px-12 py-3 scroll-smooth"
        >
          {category.videos.map((video, colIndex) => {
            const isFocused = isCurrentRow && selectedCol === colIndex;
            return (
              <VideoCard
                key={video.id}
                video={video}
                isFocused={isFocused}
                onSelect={() => onSelectVideo(rowIndex, colIndex)}
                onFocus={() => onFocusVideo(rowIndex, colIndex)}
                categoryTitle={category.title}
                onHideVideo={onHideVideo}
              />
            );
          })}
        </div>

        {/* Right Arrow Button for Mouse / Touch Users */}
        <button
          onClick={() => scrollBy(360)}
          aria-label="Scroll category right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-opacity border border-slate-700 shadow-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
