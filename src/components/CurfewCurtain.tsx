import React, { useState } from 'react';
import { Moon, Star, Lock, Clock, Plus, AlertCircle, Check } from 'lucide-react';
import { verifyParentalPin } from '../services/parentalControlStorage';
import { startScreenTimer, clearScreenTimer } from '../services/timerStorage';

interface CurfewCurtainProps {
  onDismiss: () => void;
}

export const CurfewCurtain: React.FC<CurfewCurtainProps> = ({ onDismiss }) => {
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleUnlockAndAdd = (extraMins: number) => {
    if (verifyParentalPin(pinInput)) {
      if (extraMins > 0) {
        startScreenTimer(extraMins);
      } else {
        clearScreenTimer();
      }
      onDismiss();
    } else {
      setPinError('Incorrect Parental PIN (default: 0000)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      {/* Night Sky Atmosphere */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center shadow-2xl shadow-amber-500/20">
          <Moon className="w-12 h-12 text-amber-300 fill-amber-300/30" />
        </div>
        <Star className="absolute -top-1 -right-2 w-5 h-5 text-amber-200 fill-amber-200 animate-pulse" />
        <Star className="absolute bottom-1 -left-2 w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
      </div>

      <div className="max-w-md space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Bedtime &amp; Screen Limit · وقت الراحة والنوم
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          انتهى وقت المشاهدة لهذا اليوم
        </h1>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          Screen time limit reached for today. Time to turn off the TV, rest your eyes, and get ready for bed!
        </p>
      </div>

      {/* Parental Extension Controls */}
      {!showPinDialog ? (
        <div className="mt-8">
          <button
            onClick={() => setShowPinDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold shadow-lg transition"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Parent Options (PIN)</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-xs p-5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl space-y-3.5">
          <div className="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Enter Parental PIN</span>
          </div>

          <input
            type="password"
            maxLength={8}
            placeholder="PIN (default: 0000)"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-mono text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />

          {pinError && (
            <div className="text-xs text-rose-400 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{pinError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleUnlockAndAdd(15)}
              className="py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition"
            >
              +15 Mins
            </button>
            <button
              onClick={() => handleUnlockAndAdd(0)}
              className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition"
            >
              Turn Off Timer
            </button>
          </div>

          <button
            onClick={() => {
              setShowPinDialog(false);
              setPinError('');
            }}
            className="text-[11px] text-slate-400 hover:text-white block w-full text-center"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
