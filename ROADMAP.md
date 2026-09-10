# Mental Maths Practice — Project Roadmap

**App:** Mental Maths Practice (ISCSP exam preparation)
**Repo:** `min955379-glitch/Mental-Maths-Practice-`
**Package:** `com.iscsp.mentalmatharena` · **PWA cache:** `iscsp-mm-v6`
**Roadmap status:** updated 2026-09-10 · last commit reviewed `5f17586`

---

## 0. How the repository is organised

| Path | Status | What it is |
|---|---|---|
| `pwa/` | **ACTIVE / shipping** | Self-contained progressive web app — no build step, no backend, works offline, installable, and bundled into the Android APK. **All new work happens here.** |
| `apk/` | ACTIVE (packaging) | Native Android WebView wrapper + Gradle project + release keystore + signed APKs. `build.sh` copies `pwa/` → `app/src/main/assets/` and builds. |
| `backend/` | PRESERVED (legacy) | Node + Express + Prisma (SQLite) API from the earlier full-stack iteration. Kept for a future server-side / multi-user deployment. |
| `frontend/` | PRESERVED (legacy) | React 18 + Vite + TypeScript SPA from the earlier iteration. Needs the backend running; not used by the shipping app. |

---

## 1. Done — shipped and working

### 1.1 Foundation
- [x] Repo initialised, remote access via PAT, full-stack work preserved under `backend/` and `frontend/`
- [x] Design system: navy/indigo palette, light + dark + auto themes, CSS variables, mobile-first responsive layout
- [x] Inline SVG icon library (`icons.js`) — zero emoji anywhere in the UI
- [x] Accessibility: skip link, focus-visible rings, semantic landmarks, `aria-live` regions, reduced-motion support

### 1.2 Question engine
- [x] 50 ISCSP-style seed questions (`data.js`), every answer independently verified
- [x] 18 categories: Percentages, Speed/Distance/Time, Fractions, Ratios, Profit/Loss, Averages, Work/Time, Pipes/Tanks, Unit Conversion, Basic Arithmetic, Decimals, Mental Multiplication, Mental Division, Age Problems, Time Calculation, Relative Speed, Number Patterns, Mixed Mental Math
- [x] 4 difficulty levels: Easy / Medium / Hard / Expert
- [x] Deterministic generators for 14 categories (`generator.js`) — answers computed by formula, never guessed
- [x] Answer normalisation (`normalize.js`): whitespace/case, numeric equivalence, fractions, units, percent, time (12:00 PM = 12 PM = noon)

### 1.3 Quiz experience
- [x] 6 practice modes: Quick (10), Timed (20 / 10 min), Full Test (50), Category, Weak Areas, Mistake Review
- [x] Free-text answer input only — no multiple choice, no autocomplete, no calculator
- [x] Per-question millisecond timer, Enter-to-submit, countdown with warning state
- [x] Rich feedback: correct/incorrect, fast mental trick, why it works, mental pattern, common mistake, "try similar question"

### 1.4 Progress, insight and coaching
- [x] localStorage persistence (`state.js`) — user, sessions, attempts, settings, unfinished sessions
- [x] Dashboard: streak, accuracy, questions solved, average time, best score, category bars, recent activity
- [x] Results screen: score, accuracy, avg time, fastest answer, category breakdown, questions to review
- [x] AI Coach (`coach.js`) — data-driven advice: weakest category, slowest category, strengths, streak, daily goal, last-10 dip
- [x] Mental-pattern library (`patterns.js`) — 12 searchable pattern cards
- [x] History screen with per-session delete
- [x] Settings: theme, sound, timer in practice, hints, default difficulty, question count, daily goal, reduced motion, data reset
- [x] Local auth: SHA-256 + per-user salt via Web Crypto, no plaintext passwords

### 1.5 Distribution
- [x] PWA: manifest, 192/512/maskable icons, service worker, offline-first cache
- [x] Android APK: WebView wrapper loading `file:///android_asset/index.html`, signed (v1+v2+v3), installs offline
- [x] App renamed to "Mental Maths Practice" everywhere user-visible; custom launcher icon at all densities
- [x] Math typography cleaned up (`×`, `−`) in all user-facing strings

### 1.6 This release — Hint button + Continue Quiz (2026-09-10)
- [x] **Hint button fixed.** `pwa/js/hints.js` now ships inside the app; hint button wired to a real hint library
- [x] **Question-specific hints.** Hints are generated from the actual question (its numbers, units and wording), not a generic string
- [x] **Answer-safety guard.** A hint can never contain the correct answer — if it would, it is swapped for a safe methodology nudge
- [x] **Activated state + idempotency.** Button turns green with a tick ("Hint shown"), disables itself, repeat clicks never duplicate
- [x] **Continue Quiz card** on the dashboard — mode, X/Y completed, percentage bar, remaining count, SVG play icon
- [x] **Multiple unfinished quizzes** coexist (capped at 10, most recent first, older ones in a collapsible list with Discard)
- [x] **Auto-save on every action** — each answer, each timer tick, each question advance, and on leaving the quiz (Back button included)
- [x] **Resume (`#/resume?id=…`)** restores index, order, prior answers, correctness, timings, mode, category, difficulty, count and remaining timer
- [x] **Quit Quiz** with confirmation ("Are you sure you want to leave? Your progress will be saved.")
- [x] **Cleanup on completion** — finished quizzes are removed from Continue Quiz and kept in History/Results
- [x] **End-to-end test suite** (`tests/`) — 13 JSDOM scenarios covering the full 10-step user journey

---

## 2. In progress / next up

| # | Item | Why it matters | Where |
|---|---|---|---|
| 1 | **Rebuild the APK** with the synced assets | The checked-in `apk/Mental-Maths-Practice.apk` predates the Hint + Continue Quiz work; assets are now synced but the binary needs a machine with JDK 17 + Android SDK (`bash apk/build.sh`) | `apk/` |
| 2 | **Stale naming sweep** | Legacy "ISCSP Mental Math AI Arena" still lives in `frontend/index.html`, backend log strings, Gradle project name and the old `ISCSP-Mental-Math-Arena.apk` | `frontend/`, `backend/`, `apk/` |
| 3 | **GitHub Pages deploy** | The Pages workflow (`.github/workflows/deploy-pwa.yml`) was added in `de071b7` then removed in `0c3e1bf`; the PWA currently has no hosted URL for "Add to Home Screen" | `.github/` |
| 4 | **APK asset drift guard** | `apk/app/src/main/assets/` is generated, but is checked into git and had drifted; add a `sync-assets.sh` step / CI check so it can never fall behind `pwa/` again | `apk/build.sh` |
| 5 | **Test harness in-repo** | Move the JSDOM suite into `tests/` in the repo and wire `npm test` so regressions are caught on every change | `tests/` |

---

## 3. Planned — feature backlog (not started)

### Learning & content
- [ ] Expand the seed bank from 50 to ~200 questions, balanced across all 18 categories and 4 difficulties
- [ ] Generators for the categories that still lack one (Mental Division, Time Calculation, Number Patterns, Mixed Mental Math, Relative Speed same-direction, Decimals division)
- [ ] Expert-difficulty content and an adaptive difficulty ramp
- [ ] Spaced repetition: re-surface a missed question after 1 / 3 / 7 days
- [ ] Worked-example mode ("show me") that is explicitly separate from the Hint nudge

### Practice & UX
- [ ] On-screen number pad / unit chips for faster mobile entry
- [ ] Session summary streaks and weekly goals
- [ ] Sound effects toggle actually wired to subtle correct/incorrect cues
- [ ] Landscape / tablet layout polish
- [ ] Export progress as JSON; import on another device

### Platform & data
- [ ] Optional cloud sync: revive `backend/` (Prisma + SQLite/Postgres) behind the PWA as an optional account
- [ ] Replace local SHA-256 auth with server auth when sync lands (keep offline-first as the default)
- [ ] Crash/telemetry-free analytics: purely local "insights" export

### Engineering quality
- [ ] CI: typecheck/lint the PWA JS, run the JSDOM suite, build the APK on tags
- [ ] Versioning + changelog discipline, semantic version in the manifest and `build.gradle`
- [ ] Performance budget and a11y audit (Lighthouse) on the PWA

---

## 4. Known issues at a glance

| Issue | Impact | Status |
|---|---|---|
| Bundled APK assets were stale (missing `hints.js`) | Hint button dead, no Continue Quiz in installed app | **Fixed** — assets synced with `pwa/`; APK binary still needs a rebuild on a machine with the Android SDK |
| Timed quiz kept ticking after navigating away with the Back button | Timer fired into a screen that was no longer the quiz | **Fixed** — the router now pauses and saves the in-flight session before rendering any other route |
| A resumed session was deleted from storage before it was re-saved | Leaving immediately after resuming could lose the session | **Fixed** — the snapshot is refreshed on resume and only cleared on completion or explicit discard |
| No GitHub Pages workflow | No hosted URL for install/share | Open — see roadmap §2.3 |
