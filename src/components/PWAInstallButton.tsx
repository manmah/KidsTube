import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Tv, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running standalone, do not show
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium shadow-lg shadow-sky-500/20 active:scale-95 transition-all ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
        }`}
        title="Install to Android TV / Phone Home Screen"
      >
        <Download className="w-4 h-4" />
        <span className="whitespace-nowrap">Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium active:scale-95 transition-all ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Tv className="w-5 h-5 text-sky-400" />
                  <h3 className="font-semibold text-white">Install CurateTV</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400">1</span>
                  <span>Tap the <strong>Share</strong> button in Safari's bottom toolbar.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400">3</span>
                  <span>Launch CurateTV for leanback video playback without browser chrome.</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
