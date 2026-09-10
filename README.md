# Mental Maths Practice

A complete, polished, production-quality mental-math training platform for
ISCSP exam preparation.

> **Latest release — v1.1.1 (2026-09-10).** Signed Android APK:
> [`apk/Mental-Maths-Practice.apk`](apk/Mental-Maths-Practice.apk) — 507 KB,
> versionCode 3, signed with the release key (v1 + v2 + v3 verified). It
> installs as an in-place update over earlier builds and keeps your progress.
> v1.1.0 fixed the dead **Hint button** and added **Continue Quiz**
> (save / resume unfinished sessions); **v1.1.1 is the bug-review release** —
> it fixes 5 confirmed bugs (blank answers counted as wrong, a crash in
> `finish()`, a per-second localStorage write storm, and UTC-based streaks)
> and hardens the app (CSP, no credential leakage, keystore passwords from the
> environment). Every item of the review is answered in
> [`BUGFIX-REPORT.md`](BUGFIX-REPORT.md). Details:
> [`apk/RELEASE-NOTES.md`](apk/RELEASE-NOTES.md) · plan: [`ROADMAP.md`](ROADMAP.md).

## What's in this repository

```
.
├── apk/
│   ├── Mental-Maths-Practice.apk     # ★ Signed, installable Android APK — v1.1.1 (507 KB)
│   ├── app/                          # Android project (Java + WebView wrapper)
│   │   └── src/main/assets/          # PWA bundled inside the APK (file:///android_asset/)
│   ├── gradle/wrapper/               # Gradle wrapper
│   ├── release.keystore              # Signing key — back this up
│   ├── build.sh                      # One-command Gradle rebuild
│   ├── build-offline.sh              # Rebuild without Gradle, straight from the SDK tools
│   ├── README.md                     # Full build + install instructions
│   └── RELEASE-NOTES.md              # Release notes
├── pwa/                              # ★ The app itself: self-contained PWA (offline, installable)
├── backend/                          # Optional Node + Prisma backend (earlier full-stack iteration)
├── frontend/                         # Optional React + Vite frontend (earlier full-stack iteration)
├── tests/                            # JSDOM e2e + regression suites for the PWA
├── BUGFIX-REPORT.md                  # Answer to the deep code review (BUGS.md), item by item
├── ROADMAP.md                        # What is done, what is next, what is planned
└── README.md                         # This file
```

**The recommended way to use the app is `pwa/`.** It's a complete,
self-contained, installable web app with no build step, no backend
required, and no environment variables. It works fully offline and
installs as a real Android app via Chrome's "Add to Home Screen".

The `backend/` and `frontend/` directories contain an earlier full-stack
iteration (Node/Express/Prisma + React/TypeScript). They are preserved
and may be useful if you want a server-side multi-user deployment.

## Install the Android app

1. Download [`Mental-Maths-Practice.apk`](apk/Mental-Maths-Practice.apk)
   (507 KB, v1.1.1) onto your phone — email it to yourself, use a USB cable,
   a cloud drive, or download it straight from GitHub on the device.
2. Tap the file. If Android asks, allow "Install from unknown sources" for
   this file only.
3. Tap **Install**. The app appears in your launcher as **Mental Maths Practice**.
4. Open it — it runs fully offline. No account, no internet, no sign-in needed.

Updating from an older build? Just install over it. The APK is signed with the
same release key and has a higher `versionCode`, so it installs as an update
and **keeps all of your stats, history and unfinished quizzes**.

With a computer and USB debugging enabled: `adb install -r Mental-Maths-Practice.apk`

| What | Value |
|---|---|
| Package | `com.iscsp.mentalmatharena` |
| Version | versionCode 3 · versionName 1.1.1 |
| Size | 507 KB (519,003 bytes) |
| Min / target SDK | 21 (Android 5.0) / 34 (Android 14) |
| Signature | v1 + v2 + v3, release key SHA-256 `2d7470c4a5239d5d…` |
| MD5 | `6605300584c4777f3305ce90bde6a0d9` |

## Live progress log

This README is updated continuously as the project is built. Every commit
reflects the exact state of the work.

### Step 0 — Project initialization
- Verified GitHub access via Personal Access Token
- Pulled existing full-stack work from the remote (preserved as `backend/`
  and `frontend/` per the project rules)

### Step 1 — PWA: design system + icons
- Professional navy/indigo palette with full dark mode
- CSS variables for theme switching
- Inline SVG icon library (Check, X, Clock, Target, Chart, Brain, Lightning,
  Arrow, Book, Trophy, Settings, Flame, Refresh, Play, User, Logout,
  Warning, Hint, Menu, Home, List) — zero emoji
- Card / button / input / progress-bar primitives
- Reduced-motion support, high-contrast focus states
- Mobile-first responsive layout

### Step 2 — PWA: question database
- 50 ISCSP-style questions seeded, every answer independently re-verified
- 16 categories covered: Percentages, Speed Distance Time, Fractions,
  Ratios Proportions, Profit Loss, Averages, Work Time, Pipes Tanks,
  Unit Conversion, Basic Arithmetic, Decimals, Mental Multiplication,
  Mental Division, Age Problems, Time Calculation, Relative Speed,
  Number Patterns, Mixed Mental Math
- Four difficulty levels: Easy, Medium, Hard, Expert

### Step 3 — PWA: question generator
- Deterministic generators for every category
- Answer is computed by formula, never guessed — always correct
- Unlimited new questions for endless practice

### Step 4 — PWA: answer normalization
- Whitespace + case tolerant
- Numeric equivalence (0.5 == 0.50)
- Fraction equivalence (1/2 == 2/4)
- Unit tolerance (30 == 30 km when expected)
- Percent tolerance (75 == 75%)
- Time tolerance (12:00 PM == 12 PM == noon)
- Verified: 50/50 seed + 300/300 generated + 0 false positives

### Step 5 — PWA: state + persistence
- localStorage acts as the local "database"
- User, QuizSession, QuestionAttempt, settings all persisted
- Schema matches the spec

### Step 6 — PWA: quiz engine + 6 modes
- Quick Practice (10 questions, no pressure)
- Timed Quiz (20 questions, 10-minute countdown)
- Full Test (50 questions, exam-style, no hints)
- Category Practice (user-selected)
- Weak Area Practice (auto-targeted from stats)
- Mistake Review (questions previously answered wrong + similar generated)
- Per-question millisecond timer
- Enter-to-submit, no multiple choice, no autocomplete, no calculator

### Step 7 — PWA: feedback UI
- Green check or red X (SVG, never emoji) + plain-language status
- "Your answer is correct / incorrect"
- "Correct answer" (with unit)
- "Fast mental trick"
- "Why it works"
- "Mental pattern"
- "Common mistake"
- "Try similar question" button (auto-queues a related question)

### Step 8 — PWA: dashboard + analytics
- Streak, accuracy, questions solved, average time, best score
- Six mode cards (Quick / Timed / Full / Weak / Mistake / Categories)
- Category performance bars
- Recent activity list
- Performance labels: Needs Practice / Improving / Good / Strong / Elite

### Step 9 — PWA: test report
- Score, accuracy, average time, fastest answer
- Per-category breakdown bars
- "Questions to review" with the user's wrong answer, correct answer,
  shortcut, and pattern for each

### Step 10 — PWA: AI Coach
- Data-driven advice (no motivational fluff)
- "Your accuracy on Fractions is 61% — 11 points below your overall average.
  Practice 10 fraction questions today."
- Detects weakest category, slowest category, strong category, streak,
  daily target, last-10 accuracy dip

### Step 11 — PWA: mental-pattern library
- 12 searchable pattern cards
- Each pattern lists the rule and example
- Patterns cover all 16 categories

### Step 12 — PWA: settings + dark mode
- Theme: Light / Dark / Auto (system)
- Sound effects on/off
- Show timer in practice
- Allow hints in practice mode
- Default difficulty, default question count, daily goal
- Reduced motion

### Step 13 — PWA: authentication
- Local registration / login / logout
- Passwords hashed with SHA-256 + per-user salt (Web Crypto API)
- No plaintext passwords stored anywhere
- Account screen with personal stats

### Step 14 — PWA: offline + install
- Full PWA manifest with proper icons (192, 512, maskable)
- Service worker with cache-first strategy
- All assets precached → works offline
- Installable on Android via Chrome → "Add to Home Screen" with one tap

### Step 15 — APK packaging
- **APK successfully built in this environment.** The v1.0.0 build was
  `apk/ISCSP-Mental-Math-Arena.apk` (4.6 MB) — **superseded** by
  `apk/Mental-Maths-Practice.apk` (v1.1.0, 515 KB), which carries the same
  signing key. The old file is kept only for reference; always ship the
  v1.1.0 APK.
- Architecture: native Android **WebView wrapper** that loads the PWA
  from `file:///android_asset/index.html`. The entire PWA is bundled
  inside the APK — **no internet required**, no external host required.
- Build pipeline: `apk/app/` is a standard Android Gradle project.
  Rebuild with `bash apk/build.sh`.
- See `apk/RELEASE-NOTES.md` for installation + update instructions.

### Step 16 — Math notation cleanup + app rename + new launcher icon
- **Proper math typography** in every user-facing string. `*` → `×`,
  `-` between digits → `−` (with proper spacing). All `*` between
  operands in `data.js`, `generator.js` converted to `×`. Unit notation
  (`km/h`, `m/s`), fraction notation (`1/3`, `7/20`), and the actual
  `*` JS operators in code are preserved unchanged. SVG path data in
  `icons.js` and `ui.js` (e.g. `1.41-1.41`) is preserved unchanged.
- The exact example from the review card now reads:
  `"Cross multiply: 3 × 5 − 2 × 4 = 15 − 8 = 7. Denominator = 20. -> 7/20."`
  instead of `3*5 - 2*4 = 15 - 8 = 7`.
- **App renamed** to **"Mental Maths Practice"** everywhere user-visible:
  Android app label, PWA `<title>`, manifest `name` + `short_name`,
  in-app brand, footer, eyebrow text, dashboard heading. Repo name
  remains the same on GitHub.
- **New launcher icon** generated from the user-uploaded artwork
  (brain + abacus + "Mental Maths Practice" text on navy). All Android
  densities produced: 48/72/96/144/192 px PNGs for `mipmap-*dpi/`,
  plus a 432×432 adaptive foreground (RGBA, with the icon inset into
  the safe zone). The previous procedural checkmark icons are fully
  replaced. AndroidManifest.xml now references both `ic_launcher` and
  `ic_launcher_round`.
- **APK rebuilt from clean state.** `apk/Mental-Maths-Practice.apk`
  (~5.2 MB), signed with the existing release key
  (v1 + v2 + v3 schemes). Same package name and signing key as
  previous build, so it installs as an upgrade.
- **Verified the actual installed APK** (not just source):
  - `aapt dump badging` → `application-label:'Mental Maths Practice'`
  - `assets/sw.js` → `const CACHE = 'iscsp-mm-v4';`
  - `assets/manifest.webmanifest` → `"name": "Mental Maths Practice"`
  - `assets/index.html` → `<title>Mental Maths Practice</title>`
  - 37 `×` and 15 `−` instances in `data.js`; 0 `*` in user-facing math
  - `km/h` and `1/3` preserved as unit/fraction notation

### Step 17 — Hint button + Continue Quiz (resumable sessions)

**Hint button (fixed).** The Hint button on the quiz screen was wired to a hint
library that was never shipped inside the installed app, so clicking it did
nothing. The hint engine now lives in `pwa/js/hints.js` and is part of every
build:

- Hints are generated from the **actual question** — its numbers, units and
  wording — so a percentage question gets a percentage hint, a speed/time
  question gets a speed/time hint, and so on for all 18 categories.
- A hint explains the **method**, never the result. Every hint passes through
  an answer-safety guard: if it would contain (or numerically match) the
  correct answer, it is replaced with a safe methodology nudge.
  Example — *"What is 15% of 240?"* gives
  *"Try splitting 15% into 10% + 5% pieces..."*, never *"24 + 12 = 36"*.
- The hint fades in smoothly (no page reload), the button switches to a green
  **"Hint shown"** state with a tick icon, disables itself, and repeat clicks
  never duplicate or re-roll the hint.
- Hints respect settings: off in Full Test, off when "Allow hints" is disabled.
- Works on mobile and desktop (verified at 360px and desktop widths).

**Continue Quiz (new).** Unfinished quizzes are now saved automatically and
can be resumed from the dashboard:

- The session is snapshotted on **every answer, every timer tick, every
  question advance, and whenever the user leaves the quiz** — including the
  Android Back button and any navigation away from the quiz screen.
- The dashboard shows a **Continue Quiz** card with the mode, `7 / 20
  completed`, a progress bar, the percentage, the remaining questions, the
  countdown left (timed quizzes) and a **Continue Quiz** button with an SVG
  play icon.
- Resuming restores the exact question index, the original question order,
  every previous answer, the correct/incorrect flags and timings, the mode,
  category, difficulty, question count and the remaining timer. Nothing is
  regenerated and nothing resets.
- Multiple unfinished quizzes coexist (capped at 10, newest first); older ones
  sit in a collapsible "Other unfinished quizzes" list with a **Discard**
  action. One quiz never overwrites another.
- **Quit Quiz** asks *"Are you sure you want to leave? Your progress will be
  saved."* — confirming saves and returns to the dashboard, cancelling keeps
  you in the quiz.
- Finishing a quiz removes it from Continue Quiz and keeps it in History and
  Results. A finished session can never reappear as unfinished.

**Bug fixed along the way:** `apk/app/src/main/assets/` was listed in
`.gitignore`, so new PWA files (notably `hints.js`) were silently never
committed to the copy bundled inside the APK. The rule has been removed and
the assets are re-synced from `pwa/`.

### Tests

A JSDOM end-to-end suite drives the real app (real HTML, real modules, real
router, real localStorage):

```bash
cd tests && npm install && npm test
```

```bash
node tests/pwa.test.mjs          # 14 end-to-end scenarios
node tests/regressions.test.mjs  # 13 regression scenarios for the bugs in BUGS.md
APP_DIR=/path/to/assets node tests/pwa.test.mjs   # test a built bundle (e.g. an APK's assets/)
```

The 14 end-to-end scenarios cover the full journey: hint generation, the hint
button, auto-save on Back, the Continue card, surviving a refresh, resume
fidelity, timer preservation, multiple unfinished quizzes, discard, quit
confirmation, completion/cleanup, and regressions on existing screens. They
also stress-test the hint engine over 1,555 questions (every seed question
plus generated ones) to guarantee no hint ever reveals its answer.

The 13 regression scenarios (`R1`–`R13`) lock in each bug fixed in v1.1.1:
blank-answer rejection, null-safe `finish()/pause()/quit()`, throttled
countdown persistence, local-time streaks, deterministic snapshot ordering,
Expert question generation, toast races, no salt/hash exposure,
`deleteSession()`, negative fraction denominators, the CSP, and the
category empty state. Each one fails against the pre-fix source.

### Step 18 — v1.1.0 released: APK built, signed and verified

- **Built in this environment** with JDK 17 + Android SDK
  (`platforms;android-34`, `build-tools;34.0.0`, `platform-tools`), using the
  Gradle-free pipeline in `apk/build-offline.sh`.
- **`apk/Mental-Maths-Practice.apk`** — 515 KB, `versionCode 2`,
  `versionName 1.1.0`, package `com.iscsp.mentalmatharena`, minSdk 21 /
  targetSdk 34.
- **Signed with the original release key** (certificate SHA-256
  `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`) and
  verified with **v1 + v2 + v3** signature schemes, so it installs as an
  in-place update of earlier builds and keeps existing progress.
- **Verified from the shipped file, not just the source:** the `assets/` folder
  was extracted from the finished APK and the full end-to-end suite was run
  against that exact copy — **14/14 passed** (`aapt dump badging` confirms the
  label, `dexdump` confirms `MainActivity` is in `classes.dex`).
- The APK shrank from 4.4 MB to 515 KB: the Gradle build was bundling
  AndroidX (appcompat / material / webkit) that `MainActivity` never imports.
- `apk/app/build.gradle` bumped to `versionCode 2` / `versionName "1.1.0"` so
  future Gradle builds stay in step with the released APK.

### Step 19 — v1.1.1: deep code-review bug sweep (BUGS.md)

An independent line-by-line review of every file (see `BUGS.md`) reported
5 confirmed bugs plus ~40 observations. All of them are now resolved or
answered item by item in [`BUGFIX-REPORT.md`](BUGFIX-REPORT.md).

**Confirmed bugs — fixed**

| # | Bug | Fix |
|---|---|---|
| A | `Quiz.submit(null / undefined / "")` recorded a blank answer as a **wrong attempt**, corrupting accuracy, streaks and history | `submit()` now refuses blank answers and returns `null` without persisting anything |
| B | `Quiz.finish()` threw `TypeError` when no session was active | guarded: `finish()` returns `null`; `pause()`/`quit()` were already safe and are now covered by tests |
| D | The countdown wrote `localStorage` **every second** (~600 synchronous writes in a 10-minute quiz) | persistence throttled to 1 write per 5 ticks; `pause()`, `quit()`, `submit()` and `next()` still flush the exact remaining time |
| E | `dailyStreak()` and `questionsToday()` used the **UTC** date, so in Asia/Karachi (UTC+5) the day rolled over at 19:00 | both now use a local-time `dayKey()`; a regression test pins the behaviour in a UTC+5 timezone |

**Hardening / cleanup shipped in the same release**

- Content-Security-Policy meta tag (no remote resource is loaded anywhere).
- `getAccountDetails()` no longer returns the password salt or hash.
- Keystore passwords are read from `KS_PASS` / `KS_ALIAS` instead of being
  hardcoded in `build-offline.sh`, `build.sh` and `app/build.gradle`.
- WebView: `setAllowFileAccessFromFileURLs(false)` and
  `setAllowUniversalAccessFromFileURLs(false)` are now explicit.
- Toast timers no longer race (a second toast is no longer hidden early).
- `StateStore.deleteSession()` replaces direct manipulation of `State.data`.
- Snapshots saved in the same millisecond now sort deterministically.
- The **Expert** difficulty finally generates Expert questions (successive
  percentage change, reverse percentage, harmonic average speed), each with a
  method-teaching hint; categories with no seed questions now say
  "Generator only" instead of "0 seeded questions".
- Service worker cache bumped to `iscsp-mm-v7`; `parseFraction` accepts a
  negative denominator; `<details>` keeps `aria-expanded` in sync; the theme
  icon stroke weights match.

**Verification** — `node tests/pwa.test.mjs` → 14/14 ·
`node tests/regressions.test.mjs` → 13/13 · hint sweep over 1,555 questions →
0 missing hints, 0 answer-revealing hints. Both suites were also run against
the `assets/` extracted from the finished APK → 27/27.

**Rebuilt APK** — `apk/Mental-Maths-Practice.apk`, 519,003 bytes (507 KB),
`versionCode 3`, `versionName 1.1.1`, minSdk 21 / targetSdk 34, signed
v1 + v2 + v3 with the same release key, MD5 `6605300584c4777f3305ce90bde6a0d9`.
`apk/build-offline.sh` now reads `versionCode` / `versionName` from
`app/build.gradle`, so there is a single source of truth for the version.


## How to run the PWA locally

```bash
cd pwa
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Node:

```bash
cd pwa
npx serve .
```

## How to install as an Android app (no APK build needed)

1. Host the `pwa/` folder on any HTTPS URL (e.g. push to GitHub Pages).
2. Visit that URL in Chrome on Android.
3. Chrome menu → "Add to Home Screen" → "Install".
4. The app appears on the home screen with its own icon, runs fullscreen,
   and works offline.

## How to build a real APK

Two supported routes — both produce the same signed APK in `apk/`. Full
details live in [`apk/README.md`](apk/README.md).

**With Gradle** (JDK 17 + Android SDK `platforms;android-34`,
`build-tools;34.0.0`, `platform-tools`):

```bash
cd apk
echo "sdk.dir=$ANDROID_HOME" > local.properties   # or your SDK path
bash build.sh
```

**Without Gradle** — `MainActivity` only uses framework APIs, so the app has
no third-party dependencies and can be built straight from the SDK tools
(aapt2 → javac → d8 → zipalign → apksigner). This is how v1.1.0 was produced,
and it is why the APK dropped from 4.4 MB to 515 KB (no AndroidX payload):

```bash
cd apk
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
bash build-offline.sh
```

Both scripts re-sync `pwa/` into `app/src/main/assets/` first, so the APK can
never ship a stale copy of the app again.

## Tech stack

- Vanilla HTML / CSS / JS (no framework bloat — loads instantly)
- Web Crypto API for password hashing
- localStorage for persistence
- Service Worker for offline
- SVG icons (zero emoji)
- Native Android WebView wrapper for packaging (the PWA is bundled in `assets/`,
  so the app needs no network and no hosted URL — no Bubblewrap / TWA required)
- JDK 17 + Android SDK (aapt2, d8, zipalign, apksigner) or Gradle for the APK
- JSDOM end-to-end + regression tests (`tests/`) driving the real app
