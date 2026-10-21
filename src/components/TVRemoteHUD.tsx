import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Home,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Tv,
  X,
} from 'lucide-react';

interface TVRemoteHUDProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onSelect: () => void;
  onBack: () => void;
  onHome: () => void;
  onTogglePlay: () => void;
  onReplay: () => void;
  onFullscreen: () => void;
  isPlaying: boolean;
}

export const TVRemoteHUD: React.FC<TVRemoteHUDProps> = ({
  onUp,
  onDown,
  onLeft,
  onRight,
  onSelect,
  onBack,
  onHome,
  onTogglePlay,
  onReplay,
  onFullscreen,
  isPlaying,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Trigger tactile vibration on Android touch if supported
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // Ignore
      }
    }
  };

  const press = (action: () => void) => {
    triggerHaptic();
    action();
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-sky-400 border border-sky-500/30 shadow-2xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
          title="Open Smart TV Remote Simulator"
        >
          <Tv className="w-5 h-5 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">TV Remote</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center p-4 rounded-3xl bg-slate-950/95 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-md w-64 select-none">
      {/* Remote Header */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Android TV Remote
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          title="Minimize Remote"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* D-Pad Directional Wheel */}
      <div className="relative w-44 h-44 rounded-full bg-slate-900 border-2 border-slate-700/80 shadow-inner flex items-center justify-center my-2">
        {/* Up */}
        <button
          onClick={() => press(onUp)}
          aria-label="Remote Up"
          className="absolute top-2 w-12 h-10 rounded-t-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        {/* Down */}
        <button
          onClick={() => press(onDown)}
          aria-label="Remote Down"
          className="absolute bottom-2 w-12 h-10 rounded-b-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Left */}
        <button
          onClick={() => press(onLeft)}
          aria-label="Remote Left"
          className="absolute left-2 w-10 h-12 rounded-l-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right */}
        <button
          onClick={() => press(onRight)}
          aria-label="Remote Right"
          className="absolute right-2 w-10 h-12 rounded-r-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Center OK Button */}
        <button
          onClick={() => press(onSelect)}
          aria-label="Remote OK / Select"
          className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs tracking-wider border border-slate-600 shadow-md flex items-center justify-center active:scale-90 transition"
        >
          OK
        </button>
      </div>

      {/* Primary Functional Buttons */}
      <div className="w-full grid grid-cols-3 gap-2 mt-2">
        <button
          onClick={() => press(onBack)}
          className="flex flex-col items-center justify-center py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 active:scale-95 transition"
          title="Back (Esc)"
        >
          <Undo2 className="w-4 h-4 text-slate-300" />
          <span className="text-[10px] mt-1 font-medium">Back</span>
        </button>

        <button
          onClick={() => press(onHome)}
          className="flex flex-col items-center justify-center py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 active:scale-95 transition"
          title="Home"
        >
          <Home className="w-4 h-4 text-slate-300" />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>

        <button
          onClick={() => press(onFullscreen)}
          className="flex flex-col items-center justify-center py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 active:scale-95 transition"
          title="Fullscreen (F)"
        >
          <Maximize2 className="w-4 h-4 text-slate-300" />
          <span className="text-[10px] mt-1 font-medium">Full</span>
        </button>
      </div>

      {/* Playback Controls: Replay, Play/Pause (No next video) */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={() => press(onReplay)}
          className="py-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 active:scale-95 transition"
          title="Replay Chosen Video"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span className="text-[11px] font-medium">Replay</span>
        </button>

        <button
          onClick={() => press(onTogglePlay)}
          className="py-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold active:scale-95 transition"
          title="Play / Pause (Space)"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          <span className="text-[11px] font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      <div className="mt-3 text-[10px] text-slate-500 text-center font-mono">
        D-Pad · Arrow Keys · Enter · Esc
      </div>
    </div>
  );
};
