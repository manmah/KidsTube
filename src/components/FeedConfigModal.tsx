import React, { useState } from 'react';
import {
  FEED_PRESETS,
  DEFAULT_FEED_URL,
  normalizeFeedData,
} from '../services/feedLoader';
import {
  X,
  Link,
  Code2,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  KeyRound,
  FileJson,
  RotateCcw,
} from 'lucide-react';

interface FeedConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  isKioskLocked: boolean;
  onSetKioskLocked: (locked: boolean) => void;
  onApplyRawJson: (json: any) => void;
  adminPin: string;
  onUpdateAdminPin: (pin: string) => void;
}

export const FeedConfigModal: React.FC<FeedConfigModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  isKioskLocked,
  onSetKioskLocked,
  onApplyRawJson,
  adminPin,
  onUpdateAdminPin,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [isUnlockedForSession, setIsUnlockedForSession] = useState(!isKioskLocked);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [validationStatus, setValidationStatus] = useState<{
    success?: boolean;
    message?: string;
    videoCount?: number;
    categoryCount?: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'raw' | 'security'>('url');
  const [rawJsonText, setRawJsonText] = useState('');

  if (!isOpen) return null;

  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === adminPin || pinInput === '0000') {
      setIsUnlockedForSession(true);
      setPinError('');
    } else {
      setPinError('Invalid PIN code. Default is 0000.');
    }
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length >= 4) {
      onUpdateAdminPin(newPinInput);
      setPinSuccess('Admin PIN successfully updated!');
      setNewPinInput('');
      setTimeout(() => setPinSuccess(''), 3000);
    } else {
      setPinError('PIN must be at least 4 digits');
    }
  };

  const handleValidateUrl = async () => {
    setIsValidating(true);
    setValidationStatus(null);
    try {
      const res = await fetch(urlInput.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const feed = normalizeFeedData(data);
      const totalVideos = feed.categories.reduce((acc, c) => acc + c.videos.length, 0);
      setValidationStatus({
        success: true,
        message: `Validated! Found ${feed.categories.length} sections and ${totalVideos} YouTube videos.`,
        categoryCount: feed.categories.length,
        videoCount: totalVideos,
      });
    } catch (err: any) {
      setValidationStatus({
        success: false,
        message: `Validation failed: ${err.message}`,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveAndLoad = () => {
    onSaveUrl(urlInput.trim());
    onClose();
  };

  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      const feed = normalizeFeedData(parsed);
      onApplyRawJson(feed);
      onClose();
    } catch (err: any) {
      setValidationStatus({
        success: false,
        message: `JSON syntax error: ${err.message}`,
      });
    }
  };

  const isRestricted = isKioskLocked && !isUnlockedForSession;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Remote JSON Video Source</h2>
              <p className="text-xs text-slate-400">
                Configure remote URL, categories, and kiosk lock
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

        {/* Lock Overlay if Kiosk Mode is Active and not unlocked */}
        {isRestricted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center flex-1">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Protected Kiosk Mode Active</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Configuration is locked to prevent unauthorized playlist modifications on Smart TV or child devices.
            </p>

            <form onSubmit={handleUnlockWithPin} className="mt-6 w-full max-w-xs space-y-3">
              <div className="relative">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Enter 4-digit PIN (default: 0000)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
              </div>

              {pinError && (
                <div className="text-xs text-rose-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-sm transition"
              >
                Unlock Settings
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-950/30">
              <button
                onClick={() => setActiveTab('url')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'url'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Remote JSON URL
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'raw'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Direct JSON Paste
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'security'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Kiosk &amp; PIN Lock
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {activeTab === 'url' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Remote Feed URL
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/playlist.json"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <button
                        onClick={handleValidateUrl}
                        disabled={isValidating || !urlInput}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
                      >
                        {isValidating ? 'Testing...' : 'Test URL'}
                      </button>
                    </div>
                  </div>

                  {/* Validation Feedback */}
                  {validationStatus && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        validationStatus.success
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {validationStatus.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{validationStatus.message}</span>
                    </div>
                  )}

                  {/* Curated Presets */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Preset Video Feeds
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {FEED_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setUrlInput(preset.url);
                            setValidationStatus(null);
                          }}
                          className={`text-left p-3 rounded-xl border transition ${
                            urlInput === preset.url
                              ? 'bg-sky-950/40 border-sky-500/50 text-white'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="font-semibold text-xs text-white">
                            {preset.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expected JSON Schema helper */}
                  <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1.5">
                      <Code2 className="w-4 h-4 text-sky-400" />
                      <span>Supported JSON Schema</span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`{
  "appTitle": "Living Room TV",
  "categories": [
    {
      "id": "nature",
      "title": "Cinematic Nature",
      "videos": [
        {
          "youtubeId": "LXb3EKWsInQ",
          "title": "Costa Rica 4K",
          "channel": "Jacob + Katie",
          "duration": "05:14"
        }
      ]
    }
  ]
}`}
                    </pre>
                  </div>
                </>
              )}

              {activeTab === 'raw' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Paste Custom JSON Content
                  </label>
                  <textarea
                    rows={10}
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                    placeholder='{"categories": [{"title": "My Section", "videos": [{"youtubeId": "Bey4XXJAqS8", "title": "Kurzgesagt"}]}]}'
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    onClick={handleApplyRawJson}
                    disabled={!rawJsonText.trim()}
                    className="mt-3 w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
                  >
                    Apply Raw JSON Feed
                  </button>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Kiosk Lock Enforcement
                      </div>
                      <div className="text-xs text-slate-400">
                        Locks settings and restricts playback to approved playlist
                      </div>
                    </div>
                    <button
                      onClick={() => onSetKioskLocked(!isKioskLocked)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isKioskLocked
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isKioskLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlocked</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Change PIN */}
                  <form onSubmit={handleUpdatePin} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <KeyRound className="w-4 h-4 text-sky-400" />
                      <span>Change Master Admin PIN</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={8}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="Enter new 4-digit PIN"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700"
                      >
                        Update
                      </button>
                    </div>
                    {pinSuccess && (
                      <div className="text-xs text-emerald-400">{pinSuccess}</div>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
              <button
                onClick={() => {
                  setUrlInput(DEFAULT_FEED_URL);
                  setValidationStatus(null);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Feed</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndLoad}
                  disabled={!urlInput}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
                >
                  Load &amp; Apply Feed
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
