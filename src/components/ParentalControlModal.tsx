import React, { useState } from 'react';
import {
  BlockedVideoRecord,
  getBlockedVideos,
  unblockVideo,
  unblockAllVideos,
  getBlockedKeywords,
  addBlockedKeyword,
  removeBlockedKeyword,
  verifyParentalPin,
  updateParentalPin,
} from '../services/parentalControlStorage';
import {
  X,
  Shield,
  ShieldAlert,
  Lock,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Film,
} from 'lucide-react';

interface ParentalControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateChanged: () => void;
}

export const ParentalControlModal: React.FC<ParentalControlModalProps> = ({
  isOpen,
  onClose,
  onStateChanged,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'blocked' | 'keywords' | 'pin'>('blocked');

  // Blocked items state
  const [blockedList, setBlockedList] = useState<BlockedVideoRecord[]>(() => getBlockedVideos());
  const [keywords, setKeywords] = useState<string[]>(() => getBlockedKeywords());
  const [newKeyword, setNewKeyword] = useState('');

  // PIN change state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyParentalPin(pinInput)) {
      setIsUnlocked(true);
      setPinError('');
      setBlockedList(getBlockedVideos());
      setKeywords(getBlockedKeywords());
    } else {
      setPinError('Incorrect PIN. Default is 0000.');
    }
  };

  const handleUnblock = (id: string) => {
    const updated = unblockVideo(id);
    setBlockedList(updated);
    onStateChanged();
  };

  const handleUnblockAll = () => {
    if (window.confirm('Restore all hidden videos back to the playlist?')) {
      unblockAllVideos();
      setBlockedList([]);
      onStateChanged();
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    const updated = addBlockedKeyword(newKeyword.trim());
    setKeywords(updated);
    setNewKeyword('');
    onStateChanged();
  };

  const handleRemoveKeyword = (kw: string) => {
    const updated = removeBlockedKeyword(kw);
    setKeywords(updated);
    onStateChanged();
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccessMsg('');

    if (!verifyParentalPin(currentPinInput)) {
      setPinError('Current PIN is incorrect');
      return;
    }
    if (newPinInput.length < 4) {
      setPinError('New PIN must be at least 4 digits');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError('New PINs do not match');
      return;
    }

    updateParentalPin(newPinInput);
    setPinSuccessMsg('Parental PIN successfully updated!');
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setTimeout(() => setPinSuccessMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Parental Controls</h2>
              <p className="text-xs text-slate-400">
                Filter unwanted content, manage hidden videos and restrict access
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

        {/* PIN Verification Screen if Locked */}
        {!isUnlocked ? (
          <div className="p-8 text-center flex flex-col items-center justify-center flex-1">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Parental Verification Required</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Enter your 4-digit master PIN to access restricted content settings and hidden videos.
            </p>

            <form onSubmit={handleUnlock} className="mt-6 w-full max-w-xs space-y-3">
              <input
                type="password"
                maxLength={8}
                placeholder="Enter 4-digit PIN (default: 0000)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                autoFocus
              />

              {pinError && (
                <div className="text-xs text-rose-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-rose-600/20"
              >
                Unlock Parental Controls
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Parental Dashboard */
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
              <button
                onClick={() => setActiveTab('blocked')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'blocked'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Hidden Videos ({blockedList.length})
              </button>
              <button
                onClick={() => setActiveTab('keywords')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'keywords'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Title Word Filters ({keywords.length})
              </button>
              <button
                onClick={() => setActiveTab('pin')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'pin'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Change PIN
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeTab === 'blocked' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-slate-400">
                      Videos hidden here will not appear anywhere in the app or search results.
                    </div>
                    {blockedList.length > 0 && (
                      <button
                        onClick={handleUnblockAll}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore All</span>
                      </button>
                    )}
                  </div>

                  {blockedList.length === 0 ? (
                    <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800">
                      <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <div className="text-sm font-semibold text-slate-300">
                        No videos currently hidden
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        To remove an unwanted video, click the &quot;Hide&quot; icon on any video card while browsing.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {blockedList.map((item) => (
                        <div
                          key={item.id || item.youtubeId}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-16 h-10 object-cover rounded-md flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-white truncate">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {item.channel} · <span className="text-rose-400/90">{item.reason || 'Hidden'}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUnblock(item.id || item.youtubeId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex-shrink-0 transition"
                            title="Unhide and restore this video"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>Restore</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'keywords' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-400">
                    Automatically hides any video whose title contains specified words or phrases.
                  </div>

                  <form onSubmit={handleAddKeyword} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. violent, scary, accident..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={!newKeyword.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Block Word</span>
                    </button>
                  </form>

                  {/* Active Keywords */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Active Title Blocklists
                    </label>
                    {keywords.length === 0 ? (
                      <div className="text-xs text-slate-500 py-3 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                        No keyword filters active. Add words above to automatically block matching video titles.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((kw) => (
                          <div
                            key={kw}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono"
                          >
                            <span>{kw}</span>
                            <button
                              onClick={() => handleRemoveKeyword(kw)}
                              className="p-0.5 rounded text-rose-400 hover:text-white hover:bg-rose-900/60"
                              title="Remove keyword filter"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pin' && (
                <form onSubmit={handleChangePin} className="space-y-3.5 max-w-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Current Parental PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="Enter current PIN"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="Enter new 4-digit PIN"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="Confirm new PIN"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {pinError && (
                    <div className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  {pinSuccessMsg && (
                    <div className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{pinSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition"
                  >
                    Save New PIN
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/70">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
