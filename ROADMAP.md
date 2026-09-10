# Mental Maths Practice — Project Roadmap

**App:** Mental Maths Practice (ISCSP exam preparation)
**Repo:** [min955379-glitch/Mental-Maths-Practice-](https://github.com/min955379-glitch/Mental-Maths-Practice-)
**Latest release:** **v1.1.1** (2026-09-10) — `apk/Mental-Maths-Practice.apk`, 507 KB, signed v1+v2+v3
**Package:** `com.iscsp.mentalmatharena` (versionCode 3) · **PWA cache:** `iscsp-mm-v7`
**Last reviewed:** v1.1.1 bug-review release — every item of `BUGS.md` answered in `BUGFIX-REPORT.md`

---

## 0. How the repository is organised

| Path | Status | What it is |
|---|---|---|
| `pwa/` | **ACTIVE / shipping** | The app itself: self-contained progressive web app — no build step, no backend, works offline, installable, and bundled into the Android APK. **All new features land here.** |
| `apk/` | ACTIVE (packaging) | `Mental-Maths-Practice.apk` (v1.1.1, the file you install) + Android WebView project + release keystore + both build scripts + release notes. |
| `apk/build.sh` | ACTIVE | Gradle rebuild: syncs `pwa/` → assets, `gradle assembleRelease`, signs with `release.keystore`. |
| `apk/build-offline.sh` | ACTIVE | Gradle-free rebuild straight from the SDK tools (aapt2 → javac → d8 → zipalign → apksigner). This is how v1.1.0 was produced. |
| `tests/` | ACTIVE | JSDOM suites driving the real app: `pwa.test.mjs` (14 end-to-end scenarios) + `regressions.test.mjs` (15 regression scenarios) + a 1,555-question hint sweep. |
| `backend/` | PRESERVED (legacy) | Node + Express + Prisma (SQLite) API from the earlier full-stack iteration — the starting point if cloud sync ever lands. |
| `frontend/` | PRESERVED (legacy) | React 18 + Vite + TypeScript SPA from the earlier iteration; needs the backend running, not used by the shipping app. |

---

## 1. Done — shipped and working

### 1.1 Foundation
- [x] Repo initialised, remote access via PAT, full-stack work preserved under `backend/` and `frontend/`
- [x] Design system: navy/indigo palette, light + dark + auto themes, CSS variables, mobile-first responsive layout
- [x] Inline SVG icon library (`icons.js`) — zero emoji anywhere in the UI
- [x] Accessibility: skip link, focus-visible rings, semantic landmarks, `aria-live` regions, reduced-motion support

### 1.2 Question engine
- [x] 50 ISCSP-style seed questions (`data.js`), every answer independently verified
- [x] 18 categories (Percentages, Speed/Distance/Time, Fractions, Ratios, Profit/Loss, Averages, Work/Time, Pipes/Tanks, Unit Conversion, Basic Arithmetic, Decimals, Mental Multiplication, Mental Division, Age Problems, Time Calculation, Relative Speed, Number Patterns, Mixed Mental Math)
- [x] 4 difficulty levels: Easy / Medium / Hard / Expert
- [x] Deterministic generators for 14 categories — answers computed by formula, never guessed
- [x] Answer normalisation: whitespace/case, numeric equivalence, fractions, units, percent, time (`12:00 PM` = `12 PM` = `noon`)

### 1.3 Quiz experience
- [x] 6 practice modes: Quick (10), Timed (20 / 10 min), Full Test (50), Category, Weak Areas, Mistake Review
- [x] Free-text answer input only — no multiple choice, no autocomplete, no calculator
- [x] Per-question millisecond timer, Enter-to-submit, countdown with warning state
- [x] Rich feedback: correct/incorrect, fast mental trick, why it works, mental pattern, common mistake, "try similar question"

### 1.4 Progress, insight and coaching
- [x] localStorage persistence — user, sessions, attempts, settings, unfinished sessions
- [x] Dashboard: streak, accuracy, questions solved, average time, best score, category bars, recent activity
- [x] Results screen: score, accuracy, avg time, fastest answer, category breakdown, questions to review
- [x] AI Coach — data-driven advice: weakest category, slowest category, strengths, streak, daily goal, last-10 dip
- [x] Mental-pattern library — 12 searchable pattern cards
- [x] History screen with per-session delete
- [x] Settings: theme, sound, timer in practice, hints, default difficulty, question count, daily goal, reduced motion, data reset
- [x] Local auth: SHA-256 + per-user salt via Web Crypto, no plaintext passwords

### 1.5 Distribution
- [x] PWA: manifest, 192/512/maskable icons, service worker, offline-first cache (`iscsp-mm-v6`)
- [x] Android APK v1.1.0: WebView wrapper loading `file:///android_asset/index.html`, signed v1+v2+v3, installs offline, **515 KB**
- [x] APK signed with the original release key → installs as an in-place update and keeps user data
- [x] App named "Mental Maths Practice" everywhere user-visible; custom launcher icon at all densities
- [x] Math typography cleaned up (`×`, `−`) in all user-facing strings
- [x] **Gradle-free build** (`apk/build-offline.sh`) — dropped the APK from 4.4 MB to 515 KB by not bundling unused AndroidX

### 1.6 v1.1.0 — Hint button + Continue Quiz (2026-09-10)
- [x] **Hint button fixed.** `pwa/js/hints.js` now ships inside the app (it had been silently excluded from the APK by a `.gitignore` rule)
- [x] **Question-specific hints** generated from the actual question: its numbers, units and wording, for all 18 categories
- [x] **Answer-safety guard** — a hint can never contain the correct answer; verified over 1,550 questions
- [x] **Activated state + idempotency** — green "Hint shown" with a tick, button disables itself, repeat clicks never duplicate
- [x] **Continue Quiz card** on the dashboard — mode, `7 / 20 completed`, progress bar, %, remaining, time left, SVG play icon
- [x] **Auto-save** on every answer, timer tick, question advance, and on leaving the quiz (Back button included)
- [x] **Resume** restores index, order, prior answers, correctness, timings, mode, category, difficulty, count and remaining timer
- [x] **Multiple unfinished quizzes** coexist (cap 10, newest prominent, older ones collapsible with Discard)
- [x] **Quit Quiz** with confirmation; **completion cleanup** (removed from Continue, kept in History/Results)
- [x] **End-to-end suite** — 14 JSDOM scenarios covering the full user journey

### 1.7 Engineering quality (this cycle)
- [x] APK asset drift fixed: `apk/app/src/main/assets/` removed from `.gitignore` and re-synced from `pwa/` (this was the root cause of the dead Hint button)
- [x] Both build scripts re-sync `pwa/` → assets on every run
- [x] Bug: the History page never rendered any rows (rows were built but never appended)
- [x] Bug: deleting a session bypassed the state store and rewrote storage directly
- [x] Bug: a resumed session was erased from storage before being re-saved
- [x] Bug: the countdown kept running after navigating away from a quiz
- [x] Bug: `isQuestionAnswered()` operator-precedence error
- [x] Tests committed to the repo (`tests/`) and runnable with `cd tests && npm install && npm test`
- [x] `ROADMAP.md` + `README.md` + `apk/RELEASE-NOTES.md` updated for v1.1.0

### 1.8 v1.1.1 — Bug-review release (2026-09-10)

Triggered by `BUGS.md`, an independent line-by-line review. Full item-by-item
answer: [`BUGFIX-REPORT.md`](BUGFIX-REPORT.md).

**Confirmed bugs fixed**
- [x] `submit(null / undefined / "")` no longer records a blank answer as a wrong attempt (**BUG-A**)
- [x] `finish()` no longer crashes when no session is active (**BUG-B**); `pause()` / `quit()` null-safety pinned by tests
- [x] Countdown persistence throttled to 1 write per 5 ticks — 600 → ~120 writes per 10-minute quiz (**BUG-D**)
- [x] `dailyStreak()` / `questionsToday()` use the **local** calendar day, not UTC (**BUG-E**)
- [x] Expert difficulty now generates Expert questions (successive %, reverse %, harmonic average speed)

**Hardening**
- [x] Content-Security-Policy meta tag; no remote resource is loaded anywhere
- [x] `getAccountDetails()` no longer returns the password salt or hash
- [x] Keystore credentials from `KS_PASS` / `KS_ALIAS` (build scripts + `build.gradle`)
- [x] WebView cross-file scripting explicitly disabled
- [x] `crypto.subtle` missing → clear message instead of an unhandled rejection
- [x] Unknown `?cat=` route falls back to mixed practice
- [x] `genRatio()` recursion bounded; `StateStore.deleteSession()` added; negative fraction denominators accepted
- [x] Service worker cache `iscsp-mm-v6` → `v7`; `build-offline.sh` reads the version from `build.gradle`; asset sync excludes `node_modules` / junk

**Polish**
- [x] Toast timers no longer race · same-millisecond snapshots sort deterministically · "Generator only" category label · rotating disclosure arrow · matching icon stroke weights · auth tab focus · `aria-expanded` on `<details>`

**Verification** — 14/14 e2e + 15/15 regression; both suites also run against the
`assets/` extracted from the finished APK (29/29), and those assets are
byte-identical to `pwa/`.

---

## 2. In progress / next up

| # | Item | Why it matters | Where |
|---|---|---|---|
| 0 | **Password hashing** | Local accounts use salted SHA-256, which is brute-force friendly. With no server the risk is limited (a lost device), but PBKDF2/scrypt via WebCrypto is the right primitive when sync lands | `pwa/js/auth.js` |
| 1 | **Stale naming sweep** | "ISCSP Mental Math AI Arena" still lives in `frontend/index.html`, backend log strings, the Gradle project name and the old `ISCSP-Mental-Math-Arena.apk` | `frontend/`, `backend/`, `apk/` |
| 2 | **GitHub Pages deploy** | The Pages workflow was added in `de071b7`, then removed in `0c3e1bf`. Without a hosted URL there is no "Add to Home Screen" install path for people who don't want the APK | `.github/` |
| 3 | **CI** | Run the JSDOM suite and a typecheck/lint on every push; build the APK on tags | `.github/workflows/` |
| 4 | **Keep the two build paths in step** | `build-offline.sh` now reads `versionCode` / `versionName` from `app/build.gradle`, so there is one source of truth; `build.sh` (Gradle) still needs the same treatment plus a CI check that both agree | `apk/` |

---

## 3. Planned — feature backlog (not started)

### Learning & content
- [ ] Expand the seed bank from 50 to ~200 questions, balanced across all 18 categories and 4 difficulties
- [ ] Generators for the categories that still lack one (Mental Division, Time Calculation, Number Patterns, Mixed Mental Math, same-direction Relative Speed, decimal division)
- [ ] Expert-difficulty content and an adaptive difficulty ramp
- [ ] Spaced repetition: re-surface a missed question after 1 / 3 / 7 days
- [ ] Worked-example mode ("show me"), kept clearly separate from the Hint nudge

### Practice & UX
- [ ] On-screen number pad / unit chips for faster mobile entry
- [ ] Session streaks, weekly goals and a practice calendar
- [ ] Wire the existing "Sound effects" setting to subtle correct/incorrect cues
- [ ] Landscape / tablet layout polish
- [ ] Export progress as JSON and import it on another device

### Platform & data
- [ ] Optional cloud sync: revive `backend/` (Prisma + SQLite/Postgres) behind the PWA as an optional account
- [ ] Server auth when sync lands, keeping offline-first as the default
- [ ] Local-only insights export (no third-party analytics, ever)

### Engineering quality
- [ ] Semantic versioning discipline across `manifest.webmanifest`, `build.gradle` and the service worker cache
- [ ] Lighthouse audit (performance + a11y) on the PWA
- [ ] Automated APK smoke test (install on an emulator and walk one quiz)

---

## 4. Releases

| Version | Date | Highlights | File |
|---|---|---|---|
| **v1.1.1** | 2026-09-10 | Bug-review release: blank answers no longer graded wrong, null-safe `finish()`, throttled countdown persistence, local-time streaks, Expert question generation, CSP + credential/keystore hardening, 15 new regression tests | `apk/Mental-Maths-Practice.apk` |
| **v1.1.0** | 2026-09-10 | Hint button fixed (question-specific hints, answer-safety guard); Continue Quiz with full save/resume; History and state bugs fixed; APK rebuilt at 515 KB with the Gradle-free pipeline | `apk/Mental-Maths-Practice.apk` |
| v1.0.0 | 2026-09-09 | First WebView-wrapper APK bundling the PWA; renamed to "Mental Maths Practice"; custom launcher icon; math typography cleanup | `apk/ISCSP-Mental-Math-Arena.apk` (superseded) |
| — | 2026-09-09 | Earlier TWA build pointed at `raw.githubusercontent.com`, which does not serve HTML → app opened on a 404. Replaced by the WebView wrapper. | — |

---

## 5. Known issues

| Issue | Impact | Status |
|---|---|---|
| Bundled APK assets were stale (missing `hints.js`) | Hint button dead, no Continue Quiz in the installed app | **Fixed** — `.gitignore` rule removed, assets re-synced, APK rebuilt (v1.1.0) |
| Timed quiz kept ticking after navigating away with Back | Countdown fired into a screen that was no longer the quiz | **Fixed** — router pauses and saves the in-flight session |
| A resumed session was deleted before it was re-saved | Leaving straight after a resume could lose the session | **Fixed** — snapshot refreshed on resume, cleared only on completion or discard |
| History screen never listed sessions | Looked like progress was lost | **Fixed** — rows are appended to the list |
| Password hashing is salted SHA-256, not a slow KDF | Local-only accounts; brute-force friendly if the device is lost | **Accepted for now** — tracked as §2.0 |
| No GitHub Pages workflow | No hosted URL for install/share | **Open** — see §2.2 |
| Legacy "AI Arena" naming in `frontend/`, `backend/`, Gradle project | Cosmetic inconsistency | **Open** — see §2.1 |

---

## 6. How to verify a change

```bash
# 0. jsdom lives outside the repo; recreate the symlink once per fresh clone
ln -sfn /home/user/tests/node_modules tests/node_modules

# 1. Run both suites against the PWA
node tests/pwa.test.mjs            # 14 end-to-end scenarios
node tests/regressions.test.mjs    # 15 regression scenarios (BUGS.md fixes)

# 2. Point the same suites at any built bundle (e.g. assets extracted from an APK)
APP_DIR=/path/to/extracted/assets node tests/pwa.test.mjs
APP_DIR=/path/to/extracted/assets node tests/regressions.test.mjs

# 3. Rebuild and re-sign the APK
cd apk && bash build-offline.sh     # or: bash build.sh  (Gradle)

# 4. Inspect the shipped file
aapt dump badging Mental-Maths-Practice.apk
apksigner verify --verbose Mental-Maths-Practice.apk
```

The end-to-end suite covers: hint generation, the hint button, auto-save on
Back, the Continue card, surviving a refresh, resume fidelity, timer
preservation, multiple unfinished quizzes, discard, quit confirmation,
completion/cleanup and regressions on the existing screens.

The regression suite covers every bug fixed in v1.1.1 (blank-answer rejection,
null-safe `finish()` / `pause()` / `quit()`, throttled countdown persistence,
local-time streaks, deterministic snapshot ordering, Expert generation, CSP,
no salt/hash exposure, the attempts cap, route validation and more). Each of
those tests fails against the pre-fix source, so they cannot silently rot.
