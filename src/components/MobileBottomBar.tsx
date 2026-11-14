import React from 'react';
import { Tv, FolderGit2, Settings, Play } from 'lucide-react';

interface MobileBottomBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenFeedConfig: () => void;
  onPlayCurrent: () => void;
  hasSelection: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenFeedConfig,
  onPlayCurrent,
  hasSelection,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 pb-safe">
      <div className="grid grid-cols-3 items-center h-12 max-w-sm mx-auto">
        <button
          onClick={() => onSelectTab('all')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition ${
            activeTab === 'all' ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Channels</span>
        </button>

        <button
          onClick={onPlayCurrent}
          disabled={!hasSelection}
          className="flex flex-col items-center justify-center min-h-[44px] text-white"
        >
          <div className="w-10 h-10 -mt-4 rounded-full bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30 active:scale-95 transition">
            <Play className="w-5 h-5 ml-0.5 fill-white" />
          </div>
          <span className="text-[10px] mt-1 font-semibold text-slate-200">Play</span>
        </button>

        <button
          onClick={onOpenFeedConfig}
          className="flex flex-col items-center justify-center min-h-[44px] text-slate-400 hover:text-white transition"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Feed URL</span>
        </button>
      </div>
    </div>
  );
};
