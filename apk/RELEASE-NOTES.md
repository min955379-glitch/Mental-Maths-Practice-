# Release Notes

## v1.1.0 — Hint button fixed + Continue Quiz (resumable sessions)

**Release date:** 2026-09-10
**File:** `apk/Mental-Maths-Practice.apk` (515 KB, versionCode 2, versionName 1.1.0)
**Signed with the original release key** (SHA-256 `2d7470c4a523…`), so it installs
as an in-place update of the previous build and keeps all your stats and progress.
Verified with v1, v2 and v3 signature schemes.

### Fixed: the Hint button did nothing

The hint engine (`pwa/js/hints.js`) was never reaching the installed app — the
bundled `assets/` folder was listed in `.gitignore`, so new PWA files were
silently left out of the APK. Fixed, and the hint feature itself is now real:

- Hints are generated from the actual question (numbers, units and wording) for
  all 18 categories, e.g. *"What is 15% of 240?"* → *"Try splitting 15% into
  10% + 5% pieces…"*, never the answer.
- Every hint passes an answer-safety guard, so a hint can never reveal the
  result (verified across 1,550 questions).
- Smooth fade-in, then the button turns green with a tick — **"Hint shown"** —
  disables itself, and extra clicks never duplicate or re-roll the hint.
- Off during Full Test and when "Allow hints" is disabled in Settings.

### New: Continue Quiz

- Leaving a quiz any way (Back button, side nav, or **Quit Quiz** with the
  confirmation *"Are you sure you want to leave? Your progress will be saved."*)
  now saves the session instead of losing it.
- The dashboard shows a **Continue Quiz** card: mode, `7 / 20 completed`,
  progress %, remaining questions, time left on timed quizzes, and a Continue
  button with an SVG play icon.
- Resuming restores the exact question, the original order, prior answers,
  correct/incorrect flags, timings, mode, category, difficulty, question count
  and the countdown. Nothing is regenerated or reset.
- Several unfinished quizzes coexist (newest first, older ones in a collapsible
  list with Discard). Finishing one removes it from Continue Quiz and keeps it
  in History and Results.

### Also fixed

- The History screen never listed any sessions (rows were built but never added
  to the page).
- Deleting a session bypassed the state store and rewrote storage directly.
- A resumed session was erased from storage before it was re-saved, so leaving
  straight after a resume could lose it.
- The countdown kept running after navigating away from a quiz.

### Building

Gradle (needs JDK 17 + Android SDK platform-34 / build-tools 34.0.0):

```bash
cd apk && bash build.sh
```

Or without Gradle at all — the app is a plain WebView wrapper with no
third-party dependencies, so `bash apk/build-offline.sh` produces the same
signed APK straight from the SDK tools. That is how this release was built.

## v1.0.0 — Initial release

**Release date:** 2026-09-09

### What's in the box

- **`apk/ISCSP-Mental-Math-Arena.apk`** (4.6 MB) — production-signed
  Android APK. Installable on Android 5.0+ (SDK 21+).
- **`apk/app/`** — Android Studio project (Java + WebView wrapper).
- **`apk/release.keystore`** — the signing keystore. **Back this up** —
  you'll need it to publish updates.
- **`apk/build.sh`** — one-command rebuild script.
- **`pwa/`** — the source PWA. The APK bundles this in its `assets/`
  folder so it works fully offline.

### How to install the APK

1. Copy `ISCSP-Mental-Math-Arena.apk` to your Android phone (USB, email,
   cloud drive — any method).
2. On the phone: open the file and tap "Install". If prompted, allow
   "Install from unknown sources" in Settings.
3. The app appears in your launcher as **ISCSP Mental Math** with the
   ISCSP icon.

### What's new in this version (vs. the earlier broken APK)

The earlier build was a Trusted Web Activity (TWA) that pointed the APK
at a hosted PWA on `raw.githubusercontent.com`. That URL does not serve
HTML pages (it only serves raw files), so opening the app showed a
"404 Not Found" error.

**This build is a native Android WebView wrapper that bundles the PWA
inside the APK itself.** The PWA loads from
`file:///android_asset/index.html`, so the app:

- Works **fully offline** — no internet or external host needed
- Loads **instantly** — no DNS, no TLS, no CDN
- Is **self-contained** — the entire app is in the 4.6 MB APK
- Has the **same features** as the PWA (every question, mode, pattern,
  coach, stats, settings, dark mode, etc.)

### Architecture

```
Android app (WebView wrapper, MainActivity.java)
  └── loads file:///android_asset/index.html
        └── full PWA from ../pwa/
              ├── index.html, css/, js/, icons/
              ├── manifest.webmanifest
              └── sw.js (service worker for offline cache)
```

Everything is in the APK. After install, no network is ever required.

### How to rebuild after editing the PWA

```bash
cd apk
echo "sdk.dir=$ANDROID_HOME" > local.properties
bash build.sh
```

This re-syncs `../pwa/` into `app/src/main/assets/`, rebuilds with
Gradle, signs with the release keystore, and produces a fresh
`ISCSP-Mental-Math-Arena.apk`.

### Verification (this build)

- `aapt dump badging` confirms:
  - Package: `com.iscsp.mentalmatharena`
  - Version: 1.0.0 (versionCode 1)
  - Min SDK: 21 (Android 5.0)
  - Target SDK: 34 (Android 14)
  - App label: "ISCSP Mental Math"
- `apksigner verify` passes (the APK is properly signed with a
  release key)
- `unzip -l` shows all PWA files are bundled in `assets/`:
  - `assets/index.html` (22 KB)
  - `assets/css/styles.css`
  - `assets/js/` (12 files)
  - `assets/icons/` (3 PNGs + 1 SVG)
  - `assets/manifest.webmanifest`
  - `assets/sw.js`

### What's in the PWA (and therefore the APK)

- 50 verified ISCSP mental-math questions, all answers re-verified
- 6 practice modes: Quick / Timed / Full Test / Category / Weak Areas /
  Mistake Review
- Deterministic question generator (mathematically correct by construction)
- Robust answer normalization (units, fractions, percentages, time, decimals)
- No multiple-choice — answer input only with instant feedback
- Mental shortcut, why-it-works, mental pattern, common mistake for
  every question
- Per-question millisecond timer
- Local persistence (localStorage) — works fully offline
- Authentication (SHA-256 + per-user salt)
- Dashboard, test reports, mistake review, AI coach, mental-pattern library
- Dark mode, reduced motion, full keyboard + screen-reader support
- Zero emoji — professional SVG icons throughout
