# Mental Maths Practice — Project Roadmap

**App:** Mental Maths Practice (ISCSP exam preparation)
**Repo:** [min955379-glitch/Mental-Maths-Practice-](https://github.com/min955379-glitch/Mental-Maths-Practice-)
**Latest release:** **v1.4.0** (2026-09-11) — `apk/Mental-Maths-Practice.apk`, 227 KB, signed v1+v2+v3
**Package:** `com.iscsp.mentalmatharena` (versionCode 8) · **PWA cache:** `iscsp-mm-v11`
**Last reviewed:** v1.4.0 — the Settings dropdowns are now drawn by the app in the active theme (no more device picker) and the logo is a flat, text-free SVG

---

## 0. How the repository is organised

| Path | Status | What it is |
|---|---|---|
| `pwa/` | **ACTIVE / shipping** | The app itself: self-contained progressive web app — no build step, no backend, works offline, installable, and bundled into the Android APK. **All new features land here.** |
| `apk/` | ACTIVE (packaging) | `Mental-Maths-Practice.apk` (v1.4.0, the file you install) + Android WebView project + release keystore + both build scripts + release notes. |
| `apk/build.sh` | ACTIVE | Gradle rebuild: syncs `pwa/` → assets, `gradle assembleRelease`, signs with `release.keystore`. |
| `apk/build-offline.sh` | ACTIVE | Gradle-free rebuild straight from the SDK tools (aapt2 → javac → d8 → zipalign → apksigner). This is how v1.1.0 was produced. |
| `tools/question_bank/` | ACTIVE | Deterministic Python bank generator: 345 question families → 1,080 machine-verified questions across 18 categories (see `VALIDATION.md`). |
| `tests/` | ACTIVE | JSDOM suites driving the real app: `pwa.test.mjs` (14 end-to-end scenarios) + `regressions.test.mjs` (15 regression scenarios) + `quiz-actions.test.mjs` (6 action-bar scenarios) + `content-difficulty.test.mjs` (15 bank/chooser scenarios) + `timer-discard.test.mjs` (19 timer/discard scenarios) + `theme-contrast.test.mjs` (52 WCAG contrast + light-theme checks) + `css-layout.test.mjs` (13 stylesheet-integrity/layout checks) + `contact-us.test.mjs` (14 Contact Us/WhatsApp checks). Three headless-Chromium harnesses measure the real rendered result: `layout_check.py`, `contrast_check.py`, `browser-journey.py`. + a 1,555-question hint sweep. |
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
- [x] Deterministic generators for **all 18 categories** — answers computed by formula, never guessed
- [x] **1,130 questions**: 1,080 from the verified bank (`pwa/js/question-bank.js`) + the 50 original seeds — 60 per category, 20 Easy / 20 Medium / 20 Hard (see §1.9)
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

### 1.9 v1.2.0 — Content + difficulty chooser + quiz action bar (2026-09-11)

**Content (`tools/question_bank/`)**
- [x] Deterministic Python bank: 345 original question families → **1,080 questions**, 60 per category × 18 categories, **20 Easy / 20 Medium / 20 Hard** each (requirement: ≥50 per category, ~17/17/16)
- [x] Difficulty by **reasoning depth**, not digit size: Easy = one visible step; Medium = two steps or simplify-then-solve; Hard = multi-step reasoning, reverse problems, chained percentage changes
- [x] Every family ships `gen` + `answer` + `verify` with exact `Fraction` arithmetic, so no answer key can be wrong; answers constrained to whole numbers or terminating decimals
- [x] Generated hints ≥25 chars and never contain a number that is not already in the question (no answer leakage)
- [x] Typography: `× ÷ − + =` everywhere, never `*`; no emoji
- [x] The 50 original seeds are preserved unchanged (bank total 1,130)
- [x] Runtime generators added for **Mental Division, Number Patterns and Mixed Mental Math** — previously they fell through and produced nothing
- [x] Pool building is now **fresh seeds → generator → repeat reuse**, with a served-question memory (`StateStore.markServed`) so consecutive sessions rotate even when nothing is answered

**Difficulty chooser**
- [x] New pre-quiz screen: **mode → category → EASY / MEDIUM / HARD → start** (`#/setup?mode=…`)
- [x] Cards show what the tier means, how many questions are ready, and your accuracy at that tier; adaptive recommendation badge + explanation; **Mixed difficulty** button preserves old behaviour
- [x] Accuracy tracked **per difficulty** (and per category); tier shown as a pill during the quiz
- [x] Expert stays generator-only and is pinned to the categories that have Expert generators (no more silent tier degradation)

**Quiz action bar**
- [x] Row 1 **Submit Answer** (primary, right) · Row 2 **Hint** (left) | **Quit** (right), on one two-column grid from 320 px to desktop
- [x] **Quit uses an in-app modal** — never `confirm()`; Cancel stays in the quiz, Quit saves progress and Continue Quiz resumes it

**Verification** — 50/50 across `pwa` (14), `regressions` (15), `quiz-actions` (6) and
`content-difficulty` (15); **50/50 again against the `assets/` extracted from the
finished APK**.

### 1.10 v1.2.1 — Discard Quiz + quiz timer (2026-09-11)

**Discard Quiz**
- [x] The confirmation modal rebinds its OK/Cancel buttons on every call, so a
  lost listener can no longer leave the button dead
- [x] Deletion is id-safe and always persisted; the dashboard re-renders into
  the live Continue Quiz host (a captured, detached node made it look inert)
- [x] Discarding the quiz that is currently open stops the engine first, so a
  stray tick cannot re-save it
- [x] Only the selected quiz is removed — other unfinished quizzes, completed
  history, attempts and all statistics are untouched, and it stays gone after
  a reload

**Quiz timer**
- [x] Ran only in countdown modes; it now runs in **every** mode (`_startTimer`
  used to bail out unless a time limit existed)
- [x] Rewritten on monotonic timestamp deltas — no drift when the WebView
  throttles timers, the device lags or a render is slow
- [x] Countdowns use an absolute deadline; elapsed modes bank time into the
  snapshot, so a resume continues instead of resetting to `00:00`
- [x] Per-question time banked on submit and on every transition; time while
  the quiz is closed is not counted
- [x] Persistence still throttled to one write per 5 seconds; `Stats.formatClock`
  handles durations over an hour

**Verification** — 65/65 across five suites (adds `timer-discard`, 15), re-run
against the assets extracted from the finished APK. Two older tests that were
passing vacuously (`0 === 0`) were strengthened.

### 1.11 v1.2.2 — Discard root cause + dark-theme accessibility (2026-09-11)

**Discard Quiz**
- [x] The offline service worker was serving a **stale `ui.js`** (cache-first,
      `iscsp-mm-v8`, no revalidation), so a fixed APK kept running the old
      code. Cache bumped to **v9**; the worker already purges old caches,
      `skipWaiting()`s and `clients.claim()`s.
- [x] The delete is now verified: if the id no longer matches the stored copy,
      it falls back to matching the quiz by mode + startedAt + question list,
      so a tap can never be a silent no-op.
- [x] Re-renders into the live `#continueQuizHost` and tells the user what
      happened (including how many unfinished quizzes remain).
- [x] The confirmation dialog uses `margin: auto` so its buttons are always
      reachable on a short viewport.

**Dark theme**
- [x] Rebuilt from measured WCAG contrast: icons on indigo chips **1.40:1 →
      9.16:1**, accent text 2.63:1 → 9.60:1, outlined controls 1.62:1 →
      3.43:1, muted text 3.96:1 → 7.44:1, status text 3.2–4.4:1 → 7.6–10.6:1.
- [x] Clear page → card → elevated surface hierarchy; visible card borders,
      placeholders, focus rings and selection colour.
- [x] Implemented with new semantic tokens whose light values are the old
      colours, so the **light theme is unchanged** (pinned by tests).

**Verification** — 118/118 across six suites, re-run against the assets
extracted from the finished APK.

### 1.12 v1.3.0 — quiz control layout, Contact Us + WhatsApp (2026-09-11)

**The answer input hanging out of the card — root cause**
- [x] A stray `}` at the end of the `[data-theme="dark"]` token block was
      absorbed into the next rule's selector, so Chromium discarded
      `* { box-sizing: border-box; }`. Every `width: 100%` control grew by its
      own padding + border (the answer input by 34px, out through the card's
      right edge). Brace removed; the stylesheet is now parsed by a real CSS
      parser in the test suite, which fails if that rule ever disappears again.
- [x] Form controls re-assert `box-sizing: border-box; max-width: 100%`, the
      quiz form and input set `min-width: 0` / `margin: 0`, so the field always
      matches the card's content box with equal left/right gaps.

**Quiz control hierarchy**
- [x] Submit Answer moved onto its own row, centred under the input, sized by
      its label with `white-space: nowrap`: 168 × 46px at every width (was
      116 × 68px with the label wrapped in two at 320px).
- [x] Hint (left) and Quit (right) share the row below at identical widths,
      pinned to the card's padding box. No hard-coded pixel widths anywhere.

**Contact Us**
- [x] New `#/contact` route + side-nav entry; three cards on the existing
      design system (welcome/support, developer, WhatsApp).
- [x] Developer card with the supplied photo (circular, 1:1, `object-fit:
      cover`, fluid `clamp()` sizing), "Muhammad Ibrahim", "Developer of Mental
      Maths Practice" and "Developed by Muhammad Ibrahim".
- [x] WhatsApp button: a real `<a>` to the exact
      `https://wa.me/03485581969?text=...` URL, with an accessible label, the
      shared WhatsApp glyph, and no `target` (which would break inside the
      app's WebView).
- [x] `MainActivity` now hands outbound http(s) links to the platform
      (`ACTION_VIEW`), so WhatsApp opens the chat with the pre-filled message
      and the browser/WhatsApp Web is the fallback; local `file://` pages still
      load in the WebView exactly as before.
- [x] New `--c-wa*` tokens: the white label measures 5.4:1 (light) and 4.9:1
      (dark); every element on the page was measured in both themes.
- [x] Service worker bumped to `iscsp-mm-v10` and the developer photo is
      precached.

**Verification** — 148/148 across eight suites plus three headless-Chromium
harnesses (8/8 viewport geometry, every contrast pair in both themes, 30/30
end-to-end journey), all re-run against the `assets/` extracted from the
finished APK.

---

### 1.13 v1.4.0 — custom Settings dropdown + flat logo (2026-09-11)

**Settings dropdown — the device picker is gone**
- [x] New reusable component `pwa/js/select.js` (`window.AppSelect`): wraps any
      `<select>` in a combobox button + listbox. The native select stays in the
      form, keeps its id/value and stays the single source of truth, so
      `renderSettings()`, the submit handler and `StateStore` are untouched.
- [x] Device picker unreachable: the native select is `opacity: 0`,
      `pointer-events: none`, `tabindex="-1"`, `aria-hidden="true"`.
- [x] Accessibility: `role="combobox"` + `aria-haspopup` / `aria-expanded` /
      `aria-controls`, `role="listbox"`, `role="option"` with `aria-selected`,
      `aria-activedescendant` while moving, accessible name taken from the
      row's own `<label>`; Escape, outside tap and Tab all close it.
- [x] Keyboard: Enter/Space/arrows open, arrows move, Home/End jump,
      Enter/Space select. Enter no longer re-opens the menu it just closed.
- [x] Selecting saves that one setting through `StateStore` and re-applies the
      theme immediately (Light/Dark/Auto switch at once; all five difficulties
      round-trip); the quiz still honours the saved default difficulty.
- [x] Styled with the existing tokens only — 44px touch targets, the app's
      radii/border/shadow, a ticked + tinted selected row instead of the
      device's radio circles, no emoji, no new dependency.
- [x] Menu flips above the field when there is no room below and shrinks to
      fit; nothing overflows from 320px to 1280px.
- [x] Contrast measured in both themes: value 13.90:1 / 16.24:1, arrow
      9.52:1 / 5.53:1, selected row 9.16:1 / 7.90:1 (dark / light).

**Logo**
- [x] `pwa/icons/icon.svg` rebuilt as a flat, minimalist, text-free mark: one
      indigo tile + one continuous check stroke, two colours, no gradient.
- [x] `tools/render-icons.py` regenerates every PNG from that SVG: PWA
      `icon-192` / `icon-512` / `icon-maskable` (artwork inside the 80% safe
      zone) and the Android launcher set (check inside the 66dp safe circle,
      adaptive background now indigo).
- [x] Header brand mark flattened to match; service worker bumped to
      `iscsp-mm-v11` with `js/select.js` precached.

**Verification** — 174/174 across nine suites (new `select-component`, 26)
plus four headless-Chromium harnesses (new `dropdown_check.py`, 45/45) —
every one re-run against the assets extracted from the signed APK.

## 2. In progress / next up

| # | Item | Why it matters | Where |
|---|---|---|---|
| 0 | **Password hashing** | Local accounts use salted SHA-256, which is brute-force friendly. With no server the risk is limited (a lost device), but PBKDF2/scrypt via WebCrypto is the right primitive when sync lands | `pwa/js/auth.js` |
| 1 | **Stale naming sweep** | Mostly **done in v1.2.0**: `apk/build.sh` now writes `Mental-Maths-Practice.apk`, the Gradle project is `MentalMathsPractice`, and the superseded 4.8 MB `ISCSP-Mental-Math-Arena.apk` is deleted. Remaining: the preserved legacy `frontend/` and `backend/` trees and backend log strings | `frontend/`, `backend/` |
| 2 | ~~**GitHub Pages deploy**~~ | **Done in v1.2.0** — `.github/workflows/pages.yml` deploys `pwa/` on every push to `main` using `GITHUB_TOKEN` (no secrets); enable Pages → Source: *GitHub Actions* once to activate | `.github/` |
| 3 | ~~**CI**~~ | **Done in v1.2.0** — `.github/workflows/ci.yml` runs `node --check` on every app script, a question-bank census, all four JSDOM suites and a bank-reproducibility check on every push/PR, and builds + signs the APK on `v*` tags. Remaining gap: no linter/typecheck is configured (vanilla JS, no toolchain chosen yet) | `.github/workflows/` |
| 4 | **Keep the two build paths in step** | `build-offline.sh` now reads `versionCode` / `versionName` from `app/build.gradle`, so there is one source of truth; `build.sh` (Gradle) still needs the same treatment plus a CI check that both agree | `apk/` |

---

## 3. Planned — feature backlog (not started)

### Learning & content
- [x] ~~Expand the seed bank from 50 to ~200 questions~~ — **done in v1.2.0**: 1,130 questions (1,080 verified bank + 50 seeds), 60 per category
- [x] ~~Generators for the categories that lack one~~ — **done in v1.2.0**: all 18 categories generate, including Mental Division, Number Patterns and Mixed Mental Math
- [x] ~~Adaptive difficulty ramp~~ — **done in v1.2.0** as the pre-quiz difficulty chooser with per-tier accuracy and a recommended tier
- [ ] Expert-difficulty content (Expert questions exist only as generator output for Percentages/Averages; no Expert seed bank yet)
- [ ] Extend the verified bank with Expert-tier content
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
- [ ] Semantic versioning discipline across `manifest.webmanifest`, `build.gradle` and the service worker cache (`build.gradle` is now the single source of truth read by `build-offline.sh`)
- [x] ~~Linter / typecheck step in CI~~ — **done in v1.2.0** as the dependency-free policy gate `tools/check-policy.mjs` (emoji, native dialogs, remote resources, maths typography, hint safety, service-worker precache) plus `node --check`
- [ ] A real linter/type checker (ESLint / TypeScript) if the app ever grows past vanilla JS
- [ ] Lighthouse audit (performance + a11y) on the PWA
- [ ] Automated APK smoke test (install on an emulator and walk one quiz)

---

## 4. Releases

| Version | Date | Highlights | File |
|---|---|---|---|
| **v1.4.0** | 2026-09-11 | Settings dropdowns are now drawn by the app (reusable `AppSelect` combobox + listbox, keyboard/Escape/outside-tap, 44px rows, ticked selected row, flips up when space is tight) instead of the device's own picker, saving through the existing store; logo rebuilt as a flat text-free SVG with all launcher art regenerated (APK 612 KB → 227 KB); 26 new unit tests + a 45-check browser harness | `apk/Mental-Maths-Practice.apk` |
| **v1.3.0** | 2026-09-11 | Quiz answer input back inside the card (a stray brace had silently deleted the universal `box-sizing: border-box` rule); Submit Answer compact, centred and on one line; Hint/Quit on one aligned row; new Contact Us page with the developer profile and a real WhatsApp button (03485581969, exact pre-filled message, opens WhatsApp with browser fallback); 30 new tests + 3 real-browser harnesses | `apk/Mental-Maths-Practice.apk` |
| **v1.2.2** | 2026-09-11 | Discard Quiz root cause: the offline service worker was serving stale JS (cache bumped to v9) and the delete is now verified with a fallback match, live re-render and user feedback; dark theme rebuilt on measured WCAG contrast (icons 1.4:1 → 9.2:1) with the light theme untouched; 68 new tests | `apk/Mental-Maths-Practice.apk` |
| **v1.2.1** | 2026-09-11 | Discard Quiz really deletes the selected unfinished quiz (id-safe, persisted, live dashboard refresh, gone after reload) and the quiz timer works in every mode on a monotonic timestamp clock (runs across questions, resumes correctly, countdowns still finish the quiz); 15 new timer/discard tests | `apk/Mental-Maths-Practice.apk` |
| **v1.2.0** | 2026-09-11 | Content + difficulty release: **1,130 verified questions** (60 per category × 18, 20/20/20 Easy/Medium/Hard), **EASY · MEDIUM · HARD chooser before every quiz** with per-difficulty accuracy + adaptive recommendation, generators for every category, rotation without repeats, reworked quiz action bar (Submit primary right, Hint \| Quit below) and an **in-app Quit modal** replacing `confirm()`; 50/50 tests | `apk/Mental-Maths-Practice.apk` |
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
node tests/quiz-actions.test.mjs   # 6 quiz action-bar + Quit dialog scenarios
node tests/content-difficulty.test.mjs  # 15 question-bank + difficulty chooser scenarios
node tests/timer-discard.test.mjs      # 19 quiz timer + discard scenarios (uses real wall-clock time)
node tests/theme-contrast.test.mjs     # 52 WCAG contrast + light-theme regression checks
node tests/css-layout.test.mjs         # 13 stylesheet integrity + quiz control layout checks
node tests/contact-us.test.mjs         # 14 Contact Us + WhatsApp end-to-end checks
python3 tests/layout_check.py          # real-Chromium geometry at 8 viewport sizes
python3 tests/contrast_check.py        # real-Chromium contrast, both themes
python3 tests/browser-journey.py       # real-Chromium end-to-end journey (30 steps)

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
