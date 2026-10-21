# GreenKid TV — Smart TV & Mobile Implementation Plan

A safe, restricted YouTube video player engineered for Android TV, Google TV, and Android mobile devices, delivering curated educational and Islamic cartoons from the official Omar & Hana Arabic channel without ads, unapproved recommendations, or external app escapes.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The current system has successfully integrated the official **Omar & Hana Arabic** (`@Omarandhanaarabic`) catalog, sandboxed YouTube player, parental controls, title search, and Continue Watching history. Review the following roadmap decisions before next-phase execution:

*   **Primary Next Phase**: Enhancing Smart TV usability with an in-app Bedtime / Screen Time curfew timer that gently locks the player when daily limits are reached.
*   **Video Source Flexibility**: Maintaining the remote JSON feed architecture while adding a visual in-app Playlist Editor so parents can paste any YouTube URL or channel playlist without editing code.
*   **Playback Isolation Policy**: Continuing strict sandbox enforcement (`sandbox="allow-scripts allow-same-origin allow-presentation"`), ensuring no YouTube links or external popups can trigger the native YouTube app on TVs or tablets.

---

## 1. Overview & Core Concept

*   **What It Does**: Provides a dedicated, 10-foot "leanback" television and touch-friendly mobile interface that streams only approved, whitelisted YouTube videos loaded from remote JSON configurations.
*   **Target Audience / Persona**:
    *   **Children & Toddlers**: Seeking an engaging, distraction-free television experience featuring favorite educational cartoons (Omar & Hana).
    *   **Parents & Educators**: Requiring strict walled-garden controls to prevent children from stumbling into algorithmic YouTube rabbit holes, commercial ads, or age-inappropriate content.
*   **Key Value**: Gives parents total peace of mind by converting open YouTube content into a closed, curated TV channel experience with PIN locks, keyword filters, and Smart TV remote support.

---

## 2. User Experience & Visual Design

### Key User Flows

1.  **TV Leanback Browsing**:
    *   On launch, the user is greeted by the **Cinematic Hero Spotlight** showing the active video with 10-foot typography.
    *   Using D-Pad directional arrows (Up/Down/Left/Right), the user scrolls through horizontal category rails:
        *   *Continue Watching* (top row, automatically tracked in localStorage)
        *   *الأناشيد والأذكار اليومية* (Daily Songs & Du'as)
        *   *قصص الأخلاق والتعاون* (Moral Stories)
        *   *عمر وهنا في البيت والمدرسة* (Family & School)
        *   *حلقات مجمعة للأطفال* (Full Cartoons)
2.  **Isolated Single-Video Playback**:
    *   Pressing **Enter / OK** launches the fullscreen sandboxed player.
    *   All external links, comments, and recommendations are stripped.
    *   Controls offer **Replay Video** and **Back to Selection**; auto-playing next unapproved videos is strictly blocked.
3.  **Parental Control Gate**:
    *   Parents click or select the **Parental Control** button.
    *   Prompted for the 4-digit master PIN (default `0000`).
    *   Parents can hide specific videos, ban title keywords (e.g. *scary*, *fight*), or review and restore previously hidden videos.

### Visual Identity & Theme

*   **Aesthetic Direction**: High-contrast, friendly, dark-slate living room aesthetic (`#070a11` background) with vibrant emerald (`#10b981`) and sky blue (`#38bdf8`) accents.
*   **Typography**:
    *   Display font: **Plus Jakarta Sans** (headings, titles, badges).
    *   Data & Numeric font: **JetBrains Mono** (durations, episode counters, time stamps).
*   **10-Foot Spatial Math**:
    *   Focused video cards expand smoothly (`scale(1.05)`) with an emerald/sky glow ring (`ring-4 ring-sky-400`).
    *   Content auto-scrolls horizontally and vertically to keep the active card centered in the TV screen safe zone.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: IFrame Sandbox vs Custom Streaming
*   **Chosen Approach**: Official YouTube IFrame Embed with restrictive sandbox attributes (`allow-scripts allow-same-origin allow-presentation`).
*   **Why**: Fully complies with YouTube Terms of Service while mathematically blocking top-level navigation, external popups, and native Android app intent hijacking.
*   **Alternatives Considered**: Custom video scrapers were rejected because they breach YouTube TOS and frequently break when YouTube updates internal APIs.

### Decision 2: Client-Side Local Storage vs Cloud Database
*   **Chosen Approach**: Browser `localStorage` for watch history, blocked videos list, and parental PIN.
*   **Why**: Zero latency on low-powered Smart TV chips (Xiaomi Mi Box, Chromecast, Fire TV), works 100% offline for cached feeds, and eliminates cloud server costs or account logins.
*   **Alternatives Considered**: Firebase/Cloud SQL was evaluated, but is unnecessary for a private household Smart TV kiosk.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             GreenKid TV Web App                             │
├──────────────────────────────────────┬──────────────────────────────────────┤
│             Presentation             │                State                 │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │   TopNavigation (Search/PIN)   │  │  │   FeedLoader (Remote JSON)     │  │
│  └───────────────┬────────────────┘  │  └───────────────┬────────────────┘  │
│                  │                   │                  │                   │
│  ┌───────────────▼────────────────┐  │  ┌───────────────▼────────────────┐  │
│  │   HeroSpotlight (10-ft TV)     │  │  │   HistoryStorage (Watched)     │  │
│  └───────────────┬────────────────┘  │  └───────────────┬────────────────┘  │
│                  │                   │                  │                   │
│  ┌───────────────▼────────────────┐  │  ┌───────────────▼────────────────┐  │
│  │   CategoryRails & Shelves      │  │  │   ParentalStorage (Blocked)    │  │
│  └───────────────┬────────────────┘  │  └───────────────┬────────────────┘  │
│                  │                   │                  │                   │
│  ┌───────────────▼────────────────┐  │  ┌───────────────▼────────────────┐  │
│  │   YouTubeLeanbackPlayer (OSD)  │  │  │   TVNavigation (D-Pad Grid)    │  │
│  └────────────────────────────────┘  │  └────────────────────────────────┘  │
└──────────────────────────────────────┴──────────────────────────────────────┘
                                       │
                         ┌─────────────▼─────────────┐
                         │   Hardware / Deployment   │
                         ├───────────────────────────┤
                         │  • PWA Standalone Manifest│
                         │  • Android TV Native APK  │
                         │  • Remote D-Pad / Keyboard│
                         └───────────────────────────┘
```

### Data Models

```typescript
interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  duration?: string;
  description?: string;
  thumbnail?: string;
  badge?: string;
}

interface CategorySection {
  id: string;
  title: string;
  description?: string;
  videos: VideoItem[];
}

interface BlockedVideoRecord {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  blockedAt: number;
  reason?: string;
}
```

### Interactive Component & State Mapping

*   **D-Pad Grid Navigator**: Maps directional inputs to `(selectedRow, selectedCol)`, calculating dynamic row lengths so moving down from a 3-item rail to a 10-item rail preserves index stability.
*   **Search Engine**: Real-time substring filter on `video.title` across all categories, dynamically hiding empty shelves and displaying match counts.
*   **Parental Filter Pipeline**: Pure filter step `cat.videos.filter(v => !isVideoBlocked(v))` executed before rendering any rail, ensuring blocked videos are eradicated from DOM and memory.
