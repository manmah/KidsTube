import React, { useState } from 'react';
import {
  X,
  Clock,
  Moon,
  CheckCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  startScreenTimer,
  clearScreenTimer,
  getTimerStatus,
  formatRemainingTime,
} from '../services/timerStorage';
import { verifyParentalPin } from '../services/parentalControlStorage';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimerUpdated: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  onTimerUpdated,
}) => {
  const status = getTimerStatus();
  const [selectedMins, setSelectedMins] = useState<number>(30);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const presets = [15, 30, 45, 60, 90];

  const handleSetTimer = (mins: number) => {
    startScreenTimer(mins);
    setSuccessMsg(`Screen time limit set to ${mins} minutes!`);
    onTimerUpdated();
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleClearTimer = () => {
    if (status.isActive) {
      if (!verifyParentalPin(pinInput)) {
        setPinError('Enter parental PIN to turn off timer (default: 0000)');
        return;
      }
    }
    clearScreenTimer();
    setSuccessMsg('Timer cleared');
    onTimerUpdated();
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bedtime &amp; Screen Timer</h2>
              <p className="text-xs text-slate-400">
                Automatically pause TV playback when time limit is reached
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Active Status Banner */}
          {status.isActive && !status.isExpired && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-200">Active Timer:</span>
              </div>
              <span className="text-sm font-mono font-bold text-amber-300">
                {formatRemainingTime(status.remainingSeconds)} left
              </span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
              <CheckCircle className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Viewing Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSetTimer(mins)}
                  className={`py-3 rounded-xl border text-center transition font-semibold text-xs ${
                    status.isActive && status.totalMinutes === mins
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="text-sm font-bold font-mono">{mins}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">minutes</div>
                </button>
              ))}
            </div>
          </div>

          {/* Turn Off Timer with PIN */}
          {status.isActive && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-medium text-slate-400">
                To turn off active timer, enter PIN:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="PIN (0000)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleClearTimer}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Turn Off Timer
                </button>
              </div>
              {pinError && (
                <div className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/70">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
