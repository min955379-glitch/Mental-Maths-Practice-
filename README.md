# Mental Maths Practice

A complete, polished, production-quality mental-math training platform for
ISCSP exam preparation.

## What's in this repository

```
.
├── pwa/                              # Self-contained Progressive Web App (works offline, installable on Android)
├── apk/
│   ├── Mental-Maths-Practice.apk     # ★ Signed, installable Android APK (~5.2 MB)
│   ├── app/                          # Android Studio project (Java + WebView wrapper)
│   │   └── src/main/assets/          # PWA bundled inside the APK (file:///android_asset/)
│   ├── gradle/wrapper/               # Gradle wrapper
│   ├── release.keystore              # Signing key — back this up
│   ├── build.sh                      # One-command rebuild script
│   ├── README.md                     # Full build + install instructions
│   └── RELEASE-NOTES.md              # Release notes
├── backend/                          # Optional Node + Prisma backend (from a previous iteration)
├── frontend/                         # Optional React + Vite frontend (from a previous iteration)
└── README.md                         # This file
```

**The recommended way to use the app is `pwa/`.** It's a complete,
self-contained, installable web app with no build step, no backend
required, and no environment variables. It works fully offline and
installs as a real Android app via Chrome's "Add to Home Screen".

The `backend/` and `frontend/` directories contain an earlier full-stack
iteration (Node/Express/Prisma + React/TypeScript). They are preserved
and may be useful if you want a server-side multi-user deployment.

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
- **APK successfully built in this environment:**
  `apk/ISCSP-Mental-Math-Arena.apk` (4.6 MB, signed, installable on
  Android 5.0+).
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

14 scenarios cover the full journey: hint generation, the hint button,
auto-save on Back, the Continue card, surviving a refresh, resume fidelity,
timer preservation, multiple unfinished quizzes, discard, quit confirmation,
completion/cleanup, and regressions on existing screens. It also stress-tests
the hint engine over 1,550 questions (every seed question plus generated ones)
to guarantee no hint ever reveals its answer.

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

See [`apk/README.md`](apk/README.md). Short version: edit
`apk/twa-manifest.json` with your hosted PWA URL, then run
`bash apk/build.sh`. A signed APK is produced in `apk/`.

## Tech stack

- Vanilla HTML / CSS / JS (no framework bloat — loads instantly)
- Web Crypto API for password hashing
- localStorage for persistence
- Service Worker for offline
- SVG icons (zero emoji)
- Bubblewrap / TWA for Android packaging
