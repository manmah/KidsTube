import React from 'react';
import { VideoItem } from '../types/tvFeed';
import { Play, EyeOff } from 'lucide-react';

interface VideoCardProps {
  video: VideoItem;
  isFocused: boolean;
  onSelect: () => void;
  onFocus: () => void;
  categoryTitle?: string;
  onHideVideo?: (video: VideoItem, e: React.MouseEvent) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isFocused,
  onSelect,
  onFocus,
  categoryTitle,
  onHideVideo,
}) => {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Play ${video.title} by ${video.channel}`}
      onClick={onSelect}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      className={`group relative flex flex-col text-left rounded-xl transition-all duration-200 cursor-pointer outline-none select-none tv-focusable shrink-0 w-64 md:w-72 lg:w-80 ${
        isFocused
          ? 'scale-[1.05] ring-4 ring-sky-400 bg-slate-800 shadow-2xl shadow-sky-500/20 z-20'
          : 'hover:scale-[1.02] bg-slate-900/60 border border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* Thumbnail Aspect 16:9 */}
      <div className="relative aspect-video w-full rounded-t-xl overflow-hidden bg-slate-950">
        <img
          src={video.thumbnail || `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
          alt={video.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.includes('hqdefault')) {
              target.src = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
            }
          }}
        />

        {/* Play Icon Overlay on Hover/Focus */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transform transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 ml-1 fill-white" />
          </div>
        </div>

        {/* Parental Control Quick Hide Button */}
        {onHideVideo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHideVideo(video, e);
            }}
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition shadow-lg border border-slate-700 hover:border-rose-500"
            title="Parental Control: Hide this unwanted video"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        )}

        {/* Duration Chip (Tabular numeric) */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-xs text-slate-100 text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded font-medium">
            {video.duration}
          </div>
        )}

        {/* Content Badge if defined */}
        {video.badge && (
          <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-sky-300 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border border-sky-500/30">
            {video.badge}
          </div>
        )}
      </div>

      {/* Video Metadata (Clean, Anti-slop, unboxed metadata) */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h3
            className={`font-semibold text-sm line-clamp-2 leading-snug transition-colors ${
              isFocused ? 'text-white' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {video.title}
          </h3>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="truncate max-w-[150px] font-medium text-slate-300">
              {video.channel}
            </span>
            {categoryTitle && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="truncate text-slate-400">{categoryTitle}</span>
              </>
            )}
          </div>
        </div>

        {video.description && (
          <p className="mt-2 text-xs text-slate-400 line-clamp-1">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
};
