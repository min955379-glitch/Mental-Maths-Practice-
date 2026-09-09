# ISCSP Mental Math AI Arena

A complete, polished, production-quality mental-math training platform for
ISCSP exam preparation.

## What's in this repository

```
.
├── pwa/                              # Self-contained Progressive Web App (works offline, installable on Android)
├── apk/
│   ├── ISCSP-Mental-Math-Arena.apk   # ★ Signed, installable Android APK (932 KB)
│   ├── app-project/                  # Generated TWA project (rebuild with ./gradlew assembleRelease)
│   ├── twa-manifest.json             # TWA configuration
│   ├── build.sh                      # One-command rebuild script
│   ├── README.md                     # Full build + install instructions
│   ├── RELEASE-NOTES.md              # Release notes + verification report
│   └── assetlinks.json               # Digital Asset Links template
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
- `apk/README.md` — full step-by-step build instructions
- `apk/twa-manifest.json` — Bubblewrap configuration (edit and build)
- `apk/assetlinks.json` — Digital Asset Links template
- `apk/build.sh` — one-command build script
- **APK successfully built in this environment:**
  `apk/ISCSP-Mental-Math-Arena.apk` (932 KB, signed, installable on
  Android 5.0+). The full TWA project is at `apk/app-project/` — run
  `./gradlew assembleRelease` from there to rebuild.
- See `apk/RELEASE-NOTES.md` for installation + update instructions.

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
