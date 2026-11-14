import React, { useState } from 'react';
import {
  FEED_PRESETS,
  DEFAULT_FEED_URL,
  DEFAULT_GITHUB_FEED_URL,
  DEFAULT_GITHUB_WEB_URL,
  normalizeFeedData,
  formatGithubRawUrl,
  fetchRemoteFeedData,
  getSavedGithubUrl,
  saveGithubUrl,
  isAutoCheckGithubEnabled,
  setAutoCheckGithubEnabled,
  exportFeedAsJsonFile,
} from '../services/feedLoader';
import { TVFeed, FeedSourceType, FeedSyncResult } from '../types/tvFeed';
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
  Github,
  RefreshCw,
  Download,
  Check,
  Radio,
  ExternalLink,
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
  activeSource?: FeedSourceType;
  lastSyncTime?: number | null;
  onTriggerGithubSync?: (githubUrl?: string) => Promise<FeedSyncResult>;
  currentFeed?: TVFeed | null;
  onRestoreLocal?: () => void;
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
  activeSource = 'local',
  lastSyncTime,
  onTriggerGithubSync,
  currentFeed,
  onRestoreLocal,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [githubUrlInput, setGithubUrlInput] = useState(getSavedGithubUrl());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(isAutoCheckGithubEnabled());
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [isUnlockedForSession, setIsUnlockedForSession] = useState(!isKioskLocked);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    success: boolean;
    text: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    success?: boolean;
    message?: string;
    videoCount?: number;
    categoryCount?: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'github' | 'url' | 'raw' | 'security'>('github');
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

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSyncEnabled(checked);
    setAutoCheckGithubEnabled(checked);
  };

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const formatted = formatGithubRawUrl(githubUrlInput);
      saveGithubUrl(formatted);
      setGithubUrlInput(formatted);

      if (onTriggerGithubSync) {
        const result = await onTriggerGithubSync(formatted);
        if (result.source === 'github') {
          setSyncStatusMsg({
            success: true,
            text: result.message || 'GitHub list synced successfully!',
          });
        } else {
          setSyncStatusMsg({
            success: false,
            text: result.message || 'GitHub unreachable. Safely using local video list.',
          });
        }
      }
    } catch (err: any) {
      setSyncStatusMsg({
        success: false,
        text: `Error during sync: ${err.message}. Safely loaded local list.`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleValidateUrl = async () => {
    setIsValidating(true);
    setValidationStatus(null);
    try {
      const feed = await fetchRemoteFeedData(urlInput.trim());
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

  const handleExportFeed = () => {
    if (currentFeed) {
      exportFeedAsJsonFile(currentFeed, 'omar-and-hana-tv-feed.json');
    }
  };

  const isRestricted = isKioskLocked && !isUnlockedForSession;

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Never';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Video Feed Source &amp; GitHub Sync</span>
                {activeSource === 'github' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-semibold">
                    GitHub Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-semibold">
                    Local Offline List
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Automatic startup synchronization with local fallback
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition"
              >
                Unlock Settings
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-950/30 overflow-x-auto">
              <button
                onClick={() => setActiveTab('github')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                  activeTab === 'github'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Auto-Sync</span>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                  activeTab === 'url'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Custom URL &amp; Presets
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                  activeTab === 'raw'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Direct JSON Paste
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                  activeTab === 'security'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Kiosk &amp; PIN Lock
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {activeTab === 'github' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        activeSource === 'github'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {activeSource === 'github' ? <Radio className="w-5 h-5 animate-pulse" /> : <RotateCcw className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Current Feed: {activeSource === 'github' ? 'Live GitHub Sync' : 'Local Offline Whitelist'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Last checked: <span className="font-mono text-slate-300">{formattedLastSync}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleManualSyncNow}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Checking GitHub...' : 'Check Updates Now'}</span>
                    </button>
                  </div>

                  {/* Sync Status Feedback Toast if present */}
                  {syncStatusMsg && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                        syncStatusMsg.success
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {syncStatusMsg.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <span>{syncStatusMsg.text}</span>
                    </div>
                  )}

                  {/* GitHub Repository / Raw JSON URL Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        GitHub Feed URL
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setGithubUrlInput(DEFAULT_GITHUB_WEB_URL);
                          saveGithubUrl(DEFAULT_GITHUB_WEB_URL);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                      >
                        <span>Set to KidsTube Default</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Github className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="url"
                        value={githubUrlInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGithubUrlInput(val);
                          saveGithubUrl(val);
                        }}
                        placeholder="https://github.com/manmah/KidsTube/blob/main/public/sample-tv-feed.json"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                      <p className="flex items-center gap-1 flex-wrap">
                        <span>Connected to:</span>
                        <code className="text-emerald-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[10px] break-all">
                          https://github.com/manmah/KidsTube/blob/main/public/sample-tv-feed.json
                        </code>
                      </p>
                      <p className="text-slate-400">
                        GitHub web URLs (<code className="text-slate-300 font-mono">github.com/.../blob/...</code>) are automatically converted into CORS-safe direct raw feeds with redundant mirror fallback.
                      </p>
                    </div>
                  </div>

                  {/* Auto-check on Startup Toggle */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">
                        Check for Updates Automatically on App Start
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Checks GitHub for new videos whenever GreenKid TV opens, updating the local list. In case of network errors, the local list is loaded automatically.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={(e) => handleToggleAutoSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Export Current Feed to JSON */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-sky-400" />
                        <span>Export Feed JSON for GitHub</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Download current approved playlist to commit directly to your GitHub repository.
                      </div>
                    </div>
                    <button
                      onClick={handleExportFeed}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition"
                    >
                      Download JSON
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'url' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Custom Feed URL
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/playlist.json"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
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
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      <span>Supported JSON Schema</span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto p-2 bg-slate-900 rounded-lg">
{`{
  "appTitle": "Omar & Hana Arabic",
  "categories": [
    {
      "id": "islamic-songs",
      "title": "الأناشيد والأذكار",
      "videos": [
        {
          "youtubeId": "bE2jqFbwnpA",
          "title": "ابدأ ببسم الله",
          "channel": "Omar & Hana Arabic",
          "duration": "03:45"
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
                    placeholder='{"categories": [{"title": "My Section", "videos": [{"youtubeId": "bE2jqFbwnpA", "title": "Bismillah"}]}]}'
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleApplyRawJson}
                    disabled={!rawJsonText.trim()}
                    className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
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
                      <KeyRound className="w-4 h-4 text-emerald-400" />
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
                  if (onRestoreLocal) onRestoreLocal();
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Local Bundled List</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Close
                </button>
                {activeTab === 'url' && (
                  <button
                    onClick={handleSaveAndLoad}
                    disabled={!urlInput}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                  >
                    Load &amp; Apply Feed
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
