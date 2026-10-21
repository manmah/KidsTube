import React, { useState } from 'react';
import {
  X,
  Tv,
  Download,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface SmartTvApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const SmartTvApkModal: React.FC<SmartTvApkModalProps> = ({
  isOpen,
  onClose,
  appUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'sideload' | 'studio'>('instant');

  if (!isOpen) return null;

  // PWABuilder direct link pre-configured with the live hosted web app
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Smart TV APK &amp; Installation</h2>
              <p className="text-xs text-slate-400">
                Install CurateTV on Android TV, Google TV, or Fire TV devices
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'instant'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            1-Click Cloud APK Builder
          </button>
          <button
            onClick={() => setActiveTab('sideload')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sideload'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            TV Sideload Guide
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'studio'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Android Studio Source
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs">
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="text-white block mb-0.5">Google / Microsoft PWABuilder</strong>
                  CurateTV is already compliant with the Android TV Web App Manifest and Service Worker standards. You can generate a signed, installable Android APK directly in your browser.
                </div>
              </div>

              {/* Step 1: App URL */}
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  Your Hosted App URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-white text-xs select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Direct Generator Button */}
              <div className="pt-2">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-500/20 active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Build &amp; Download Android APK (PWABuilder)</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Opens PWABuilder with your app URL pre-filled &rarr; Click &quot;Package for Android&quot; &rarr; Download `.apk`.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'sideload' && (
            <div className="space-y-3.5 leading-relaxed">
              <h3 className="font-semibold text-white text-sm">How to install the APK on your Smart TV:</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <strong className="text-white block">Download the APK file</strong>
                    Generate the `.apk` using the 1-Click Builder tab and save it to your computer or phone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <strong className="text-white block">Transfer to your Smart TV</strong>
                    Copy to a USB flash drive and plug it into the TV, OR use the free app <span className="text-sky-300 font-medium">&quot;Send files to TV&quot;</span> from the Google Play Store on your TV and phone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <strong className="text-white block">Install with File Commander</strong>
                    Open <span className="text-sky-300 font-medium">File Commander</span> or <span className="text-sky-300 font-medium">Downloader</span> on your TV, click the `.apk` file, and tap <strong>Install</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    4
                  </div>
                  <div>
                    <strong className="text-white block">Launch on TV Home Screen</strong>
                    CurateTV will appear in your Android TV / Google TV app drawer with full remote control navigation support.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-3">
              <p>
                The complete native Android TV project files have been created in the repository under <code className="bg-slate-950 px-1.5 py-0.5 rounded text-sky-400 font-mono">/android</code>:
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 text-slate-400">
                <div>├── /android/settings.gradle</div>
                <div>├── /android/build.gradle</div>
                <div>├── /android/app/build.gradle</div>
                <div>├── /android/app/src/main/AndroidManifest.xml</div>
                <div>└── /android/app/src/main/java/com/curatetv/app/MainActivity.kt</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <strong className="text-white block mb-1">To compile locally with Gradle or Android Studio:</strong>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Open the <code className="font-mono text-sky-400">/android</code> folder in Android Studio.</li>
                  <li>Select <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</li>
                  <li>Locate the compiled file at <code className="font-mono text-sky-400">app/build/outputs/apk/release/app-release-unsigned.apk</code>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-[11px] text-slate-500">
            Compatible with Android TV 8.0+ and Google TV
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
