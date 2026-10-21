import React from 'react';
import { VideoItem } from '../types/tvFeed';
import { Play, ShieldCheck, Tv } from 'lucide-react';

interface HeroSpotlightProps {
  focusedVideo: VideoItem | null;
  categoryTitle?: string;
  onPlay: () => void;
  isKioskLocked: boolean;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  focusedVideo,
  categoryTitle,
  onPlay,
  isKioskLocked,
}) => {
  if (!focusedVideo) return null;

  return (
    <div className="relative w-full h-[360px] md:h-[420px] lg:h-[480px] overflow-hidden select-none">
      {/* Cinematic Backdrop Image with Scrim Gradients */}
      <div className="absolute inset-0">
        <img
          key={focusedVideo.youtubeId}
          src={
            focusedVideo.thumbnail ||
            `https://img.youtube.com/vi/${focusedVideo.youtubeId}/maxresdefault.jpg`
          }
          alt={focusedVideo.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-60 transition-all duration-700 scale-105"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('hqdefault')) {
              target.src = `https://img.youtube.com/vi/${focusedVideo.youtubeId}/hqdefault.jpg`;
            }
          }}
        />

        {/* Ambient Gradient Overlays for high contrast readable text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a11] via-[#070a11]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a11] via-[#070a11]/80 to-transparent max-w-4xl" />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex flex-col justify-end px-6 md:px-12 pb-10 max-w-3xl z-10">
        {/* Subtle Category & Restriction Marker */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2">
          <Tv className="w-3.5 h-3.5" />
          <span>{categoryTitle || 'Featured Selection'}</span>
          {isKioskLocked && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 flex items-center gap-1 normal-case tracking-normal font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Approved Whitelist
              </span>
            </>
          )}
        </div>

        {/* Video Title */}
        <h1
          className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight"
          style={{ textWrap: 'balance' }}
        >
          {focusedVideo.title}
        </h1>

        {/* Metadata: Channel & Duration */}
        <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-slate-300 font-medium">
          <span className="text-white font-semibold">{focusedVideo.channel}</span>
          {focusedVideo.duration && (
            <>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="font-mono tabular-nums text-slate-400">
                {focusedVideo.duration}
              </span>
            </>
          )}
          {focusedVideo.badge && (
            <>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-sky-300 font-mono text-xs">{focusedVideo.badge}</span>
            </>
          )}
        </div>

        {/* Description */}
        {focusedVideo.description && (
          <p className="mt-2.5 text-xs md:text-sm text-slate-300 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl">
            {focusedVideo.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onPlay}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-xl shadow-sky-500/25 active:scale-95 transition-all group"
          >
            <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
            <span>Play Video (OK / Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
