import React, { useState } from 'react';
import {
  X,
  Tv,
  Download,
  Copy,
  Check,
  ExternalLink,
  Code2,
  FolderArchive,
  ShieldCheck,
  FileCode,
  Layers,
  Sparkles,
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
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kotlin' | 'instant' | 'sideload'>('kotlin');
  const [activeKotlinFile, setActiveKotlinFile] = useState<
    'main' | 'player' | 'repo' | 'parental' | 'models' | 'gradle'
  >('main');

  if (!isOpen) return null;

  // PWABuilder direct link pre-configured with the live hosted web app
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = (filename: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const kotlinFiles = {
    main: {
      name: 'MainActivity.kt',
      path: 'android/app/src/main/java/com/curatetv/app/MainActivity.kt',
      desc: 'Android TV Leanback Home Screen with TV Remote D-Pad focus indicators, Hero Spotlight preview, and horizontal category rails.',
      code: `package com.curatetv.app

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.curatetv.app.data.FeedRepository
import com.curatetv.app.data.ParentalControlManager
import com.curatetv.app.model.TvFeed
import com.curatetv.app.model.VideoItem
import com.curatetv.app.player.PlayerActivity
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var repository: FeedRepository
    private lateinit var parentalManager: ParentalControlManager
    private var currentFeed: TvFeed? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Keep screen on for TV leanback playback
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        repository = FeedRepository(this)
        parentalManager = ParentalControlManager(this)

        setupUI()
        loadFeed(forceNetwork = true)
    }

    private fun loadFeed(forceNetwork: Boolean) {
        lifecycleScope.launch {
            // Automatically checks for updates on startup from GitHub
            // Falls back to local cached or bundled list if network fails
            val result = repository.getFeed(forceNetwork)
            if (result.isSuccess) {
                currentFeed = result.getOrNull()
                renderFeed(currentFeed)
            }
        }
    }
}`,
    },
    player: {
      name: 'PlayerActivity.kt',
      path: 'android/app/src/main/java/com/curatetv/app/player/PlayerActivity.kt',
      desc: 'Strict Kid Shield Player: Enforces approved playlist auto-advance, custom TV HUD, and masks YouTube recommendations and "(More Videos)" icon with Safe Pause overlay.',
      code: `package com.curatetv.app.player

import android.app.Activity
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import com.curatetv.app.model.VideoItem

class PlayerActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var safePauseOverlay: View
    private lateinit var upNextOverlay: View
    private var playlist: ArrayList<VideoItem> = arrayListOf()
    private var currentIndex: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupViews()
        loadCurrentVideo()
    }

    // Play next video strictly from the approved curated list
    fun playNextApprovedVideo() {
        if (playlist.isEmpty()) return
        currentIndex = (currentIndex + 1) % playlist.size
        loadCurrentVideo()
    }

    // D-Pad Remote & Media Keys Handler
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                togglePlayPause()
                return true
            }
            KeyEvent.KEYCODE_MEDIA_NEXT, KeyEvent.KEYCODE_CHANNEL_UP -> {
                playNextApprovedVideo()
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PREVIOUS, KeyEvent.KEYCODE_CHANNEL_DOWN -> {
                playPreviousApprovedVideo()
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                finish()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }
}`,
    },
    repo: {
      name: 'FeedRepository.kt',
      path: 'android/app/src/main/java/com/curatetv/app/data/FeedRepository.kt',
      desc: 'Automatic GitHub Sync with internal storage cache persistence and bundled assets offline fallback.',
      code: `package com.curatetv.app.data

import android.content.Context
import com.curatetv.app.model.TvFeed
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class FeedRepository(private val context: Context) {

    suspend fun getFeed(forceNetwork: Boolean = true): Result<TvFeed> = withContext(Dispatchers.IO) {
        // 1. Convert GitHub /blob/ URL to raw.githubusercontent.com
        // 2. Fetch remote JSON with connection timeout
        // 3. Cache to context.filesDir/cached_feed.json
        // 4. In case error happened, seamlessly load local list / assets
        // 5. Filter out videos blacklisted by Parental Control
    }
}`,
    },
    parental: {
      name: 'ParentalControlManager.kt',
      path: 'android/app/src/main/java/com/curatetv/app/data/ParentalControlManager.kt',
      desc: 'Manages parent PIN authentication, math gate challenges, custom feed URL, and blacklisted/hidden video IDs in SharedPreferences.',
      code: `package com.curatetv.app.data

import android.content.Context
import android.content.SharedPreferences

class ParentalControlManager(context: Context) {
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("greenkid_parental_prefs", Context.MODE_PRIVATE)

    fun getBlockedVideoIds(): Set<String> { ... }
    fun blockVideo(videoId: String) { ... }
    fun unblockVideo(videoId: String) { ... }
    fun isVideoBlocked(videoId: String): Boolean { ... }
    fun getFeedUrl(): String { ... }
    fun setFeedUrl(url: String) { ... }
}`,
    },
    models: {
      name: 'Data Models (Kotlin)',
      path: 'android/app/src/main/java/com/curatetv/app/model/TvFeed.kt',
      desc: 'Type-safe data classes: TvFeed, CategorySection, and VideoItem matching the GitHub feed schema.',
      code: `package com.curatetv.app.model

import java.io.Serializable

data class TvFeed(
    val version: String? = "2.0",
    val appTitle: String? = "GreenKid TV",
    val description: String? = null,
    val kioskModeRestricted: Boolean? = true,
    val categories: List<CategorySection> = emptyList()
) : Serializable

data class CategorySection(
    val id: String,
    val title: String,
    val description: String? = null,
    val videos: List<VideoItem> = emptyList()
) : Serializable

data class VideoItem(
    val id: String,
    val youtubeId: String,
    val title: String,
    val channel: String = "",
    val duration: String = "00:00",
    val description: String = "",
    val thumbnail: String = "",
    val badge: String = ""
) : Serializable`,
    },
    gradle: {
      name: 'build.gradle',
      path: 'android/app/build.gradle',
      desc: 'Android Gradle plugin configuration with Android TV Leanback SDK and Coroutines.',
      code: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.curatetv.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.curatetv.app"
        minSdk 21
        targetSdk 34
        versionCode 2
        versionName "2.0"
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.leanback:leanback:1.0.0'
    implementation 'androidx.webkit:webkit:1.10.0'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.7.0'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}`,
    },
  };

  const currentFile = kotlinFiles[activeKotlinFile];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">GreenKid TV — Native Kotlin Project</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  100% Kotlin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Native Android TV &amp; Mobile source code, Gradle project, and APK installation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'kotlin'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Kotlin Source Code &amp; Project</span>
          </button>
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'instant'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1-Click Cloud APK Builder</span>
          </button>
          <button
            onClick={() => setActiveTab('sideload')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'sideload'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Smart TV Sideload Guide</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs">
          {activeTab === 'kotlin' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="text-white block mb-0.5">Project Written Completely in Kotlin:</strong>
                  The entire application logic is implemented in native Kotlin under{' '}
                  <code className="text-emerald-300 font-mono bg-emerald-950/80 px-1 py-0.5 rounded">
                    android/app/src/main/java/com/curatetv/app/
                  </code>
                  . It includes automatic GitHub feed synchronization, offline local caching, strict Kid Shield YouTube player, D-Pad remote navigation, and parental controls.
                </div>
              </div>

              {/* Kotlin File Switcher */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  [
                    ['main', 'MainActivity.kt'],
                    ['player', 'PlayerActivity.kt'],
                    ['repo', 'FeedRepository.kt'],
                    ['parental', 'ParentalControlManager.kt'],
                    ['models', 'Data Models'],
                    ['gradle', 'build.gradle'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveKotlinFile(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                      activeKotlinFile === key
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Active File Header */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white">{currentFile.path}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(currentFile.name, currentFile.code)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-medium border border-slate-700 transition"
                  >
                    {copiedFile === currentFile.name ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 text-[11px] text-slate-400">
                  {currentFile.desc}
                </div>
                <pre className="p-4 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto max-h-[300px]">
                  <code>{currentFile.code}</code>
                </pre>
              </div>

              {/* Instructions to build in Android Studio */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <strong className="text-white block mb-1 text-xs">How to compile with Gradle or Android Studio:</strong>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400 text-[11px]">
                  <li>
                    Open the <code className="text-emerald-300 font-mono">android/</code> directory in Android Studio.
                  </li>
                  <li>
                    Run command:{' '}
                    <code className="text-emerald-300 font-mono bg-slate-900 px-1 py-0.5 rounded">
                      ./gradlew assembleDebug
                    </code>
                  </li>
                  <li>
                    Your compiled APK is located at:{' '}
                    <code className="text-emerald-300 font-mono bg-slate-900 px-1 py-0.5 rounded">
                      android/app/build/outputs/apk/debug/app-debug.apk
                    </code>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="text-white block mb-0.5">Google &amp; Microsoft Cloud APK Builder</strong>
                  CurateTV is fully compliant with the Android TV Web App Manifest and Service Worker standards. You can generate a signed, installable Android APK directly in your browser.
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
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Build &amp; Download Android APK (Cloud Builder)</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Pre-fills your app URL &rarr; Click &quot;Package for Android&quot; &rarr; Download `.apk`.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'sideload' && (
            <div className="space-y-3.5 leading-relaxed">
              <h3 className="font-semibold text-white text-sm">How to install the APK on your Smart TV:</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <strong className="text-white block">Compile or Download the APK file</strong>
                    Build the APK using Android Studio or download using the Cloud APK Builder tab.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <strong className="text-white block">Transfer to your Smart TV</strong>
                    Copy to a USB flash drive and plug it into the TV, OR use the free app{' '}
                    <span className="text-emerald-300 font-medium">&quot;Send files to TV&quot;</span> from the Google Play Store on your TV and phone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <strong className="text-white block">Install on TV</strong>
                    Open <span className="text-emerald-300 font-medium">File Commander</span> or{' '}
                    <span className="text-emerald-300 font-medium">Downloader</span> on your TV, click the `.apk` file, and tap <strong>Install</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                    4
                  </div>
                  <div>
                    <strong className="text-white block">Launch on TV Home Screen</strong>
                    GreenKid TV will appear in your Android TV / Google TV app drawer with full remote control navigation support.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="text-[11px] text-slate-500">
            Native Kotlin code compatible with Android TV 8.0+ and Google TV
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
