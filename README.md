# GreenKid TV - Native Kotlin Android TV & Smart TV App

A restricted, sandboxed Kids TV launcher written in **Kotlin** for Android TV, Google TV, Fire TV, and mobile devices. It streams only curated YouTube videos from a remote GitHub JSON feed with strict navigational sandboxing and parental security.

---

## 🚀 Key Features

1. **Automatic GitHub Feed Sync & Offline Fallback**
   - Automatically synchronizes with the remote GitHub repository feed (`https://raw.githubusercontent.com/manmah/KidsTube/main/public/sample-tv-feed.json`) on app launch.
   - Saves feed updates to internal storage cache.
   - If an internet error or offline state occurs, seamlessly falls back to the locally cached feed or bundled APK assets (`assets/sample-tv-feed.json`).

2. **Strict YouTube Kid Shield (No External Recommendations)**
   - YouTube embedded player is configured with `controls=0`, `rel=0`, and strict CSS injection to hide YouTube's watermark, external channel links, and the "(More videos)" shelf.
   - **Safe Pause Overlay**: When playback is paused or ended, GreenKid TV displays a full custom overlay preventing YouTube's recommendation thumbnails from appearing.

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
├── gradlew, gradlew.bat                       # Gradle Wrapper scripts
├── gradle/wrapper/                            # Gradle 8.5 distribution wrapper
├── build.gradle                               # Root Gradle build script
├── settings.gradle                            # Project name and module inclusion
├── local.properties                           # Local Android SDK directory
└── app/
    ├── build.gradle                           # App module config, dependencies & signingConfigs
    ├── proguard-rules.pro                     # R8 rules keeping JS interface & models
    ├── release.jks                            # Production release keystore
    └── src/
        └── main/
            ├── AndroidManifest.xml            # TV Leanback & Launcher intents, permissions
            ├── assets/
            │   └── sample-tv-feed.json        # Bundled offline fallback video feed
            ├── java/com/greenkidtv/app/
            │   ├── MainActivity.kt            # TV catalog screen, D-Pad focus & hero spotlight
            │   ├── model/
            │   │   ├── TvFeed.kt              # TvFeed data class
            │   │   ├── CategorySection.kt     # CategorySection data class
            │   │   └── VideoItem.kt           # VideoItem data class with resolved thumbnails
            │   ├── data/
            │   │   ├── FeedRepository.kt      # GitHub sync, disk cache, and asset loader
            │   │   └── ParentalControlManager.kt # SharedPreferences storage for PIN & blocked IDs
            │   └── player/
            │       └── PlayerActivity.kt      # Sandboxed YouTube player & Safe Pause shield
            └── res/
                ├── drawable/                  # Vector drawables & TV Leanback 16:9 banner
                ├── mipmap/                    # Launcher icons & adaptive icons
                ├── values/                    # colors.xml, strings.xml, styles.xml
                └── xml/                       # network_security_config.xml
```

---

## 🛠️ How to Build & Publish APK / AAB

### 1. Build Signed Release APK (For Direct Download, Sideloading, Fire TV):
```bash
cd android
./gradlew assembleRelease
# On Windows PowerShell:
# .\gradlew.bat assembleRelease
```
The compiled signed APK is saved at:
`android/app/build/outputs/apk/release/app-release.apk`

### 2. Build Android App Bundle (For Google Play Store):
```bash
cd android
./gradlew bundleRelease
```
The compiled bundle is saved at:
`android/app/build/outputs/bundle/release/app-release.aab`

### 3. Build Debug APK (For Local Testing):
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on Android TV / Smart TV / Emulator:
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔐 Keystore Signing Credentials
The project includes an auto-configured `release.jks` keystore. To provide custom credentials via environment variables or properties:
* `RELEASE_STORE_FILE` (default: `release.jks`)
* `RELEASE_STORE_PASSWORD` (default: `greenkidtv123`)
* `RELEASE_KEY_ALIAS` (default: `greenkidtv`)
* `RELEASE_KEY_PASSWORD` (default: `greenkidtv123`)

---

## 🤖 Automated CI/CD (GitHub Actions)
Pushing a git tag (e.g. `v2.0.0`) automatically builds both the signed Release APK and the Google Play Bundle (`.aab`), and publishes them as downloadable GitHub Release assets.
