# GreenKid TV (CurateTV) - Native Kotlin Android TV & Smart TV App

A restricted, sandboxed Kids TV launcher written in **Kotlin** for Android TV, Google TV, Fire TV, and mobile devices. It streams only curated YouTube videos from a remote GitHub JSON feed with strict navigational sandboxing and parental security.

---

## 🚀 Key Features

1. **Automatic GitHub Feed Sync & Offline Fallback**
   - Automatically synchronizes with the remote GitHub repository feed (`https://raw.githubusercontent.com/manmah/KidsTube/main/public/sample-tv-feed.json`) on app launch.
   - Saves feed updates to internal storage cache.
   - If an internet error or offline state occurs, seamlessly falls back to the locally cached feed or bundled APK assets (`assets/sample-tv-feed.json`).

2. **Strict YouTube Kid Shield (No External Recommendations)**
   - YouTube embedded player is configured with `controls=0`, `rel=0`, and strict CSS injection to hide YouTube's watermark, external channel links, and the "(More videos)" shelf.
   - **Safe Pause Overlay**: When playback is paused or ended, CurateTV displays a full custom overlay preventing YouTube's recommendation thumbnails from appearing.

3. **Curated Next-Video Playback (Approved List Only)**
   - "Play Next" strictly advances through the current category's approved video list.
   - Automatic 5-second countdown to the next curated video when a video finishes.

4. **Android TV Leanback Navigation**
   - Full D-Pad remote control support (`DPAD_CENTER`, `DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`).
   - Dynamic Hero Spotlight: Displays focused video thumbnail, title, channel, and "Watch Now" action.
   - Focus ring highlight and scaling animation on selected cards.

5. **Parental Controls & Content Whitelist**
   - Math challenge gate (`8 × 7 = ?`) or PIN verification preventing accidental child alterations.
   - Ability to blacklist/hide specific video IDs and update remote feed source URL.

---

## 📂 Project Architecture (Native Kotlin)

```text
android/
├── build.gradle                               # Root Gradle build script
├── settings.gradle                            # Project name and module inclusion
└── app/
    ├── build.gradle                           # App module dependencies (Coroutines, Leanback, Lifecycle)
    └── src/
        └── main/
            ├── AndroidManifest.xml            # TV Leanback & Launcher intents, permissions
            ├── assets/
                └── sample-tv-feed.json        # Bundled offline fallback video feed
            ├── java/com/curatetv/app/
                ├── MainActivity.kt            # TV catalog screen, D-Pad focus & hero spotlight
                ├── model/
                │   ├── TvFeed.kt              # TvFeed data class
                │   ├── CategorySection.kt     # CategorySection data class
                │   └── VideoItem.kt           # VideoItem data class with resolved thumbnails
                ├── data/
                │   ├── FeedRepository.kt      # GitHub sync, disk cache, and asset loader
                │   └── ParentalControlManager.kt # SharedPreferences storage for PIN & blocked IDs
                └── player/
                    └── PlayerActivity.kt      # Sandboxed YouTube player & Safe Pause shield
            └── res/
                ├── values/
                │   ├── colors.xml             # Emerald & Dark slate theme
                │   ├── strings.xml            # UI labels and RTL Arabic strings
                │   └── styles.xml             # Theme.CurateTV
```

---

## 🛠️ How to Build & Run with Gradle / Android Studio

1. **Open in Android Studio:**
   - Launch Android Studio and choose **Open an Existing Project**.
   - Select the `android/` directory.

2. **Build Debug APK via Command Line:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. **Locate APK:**
   - The compiled APK is saved at:
     `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Install on Smart TV / Emulator:**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
