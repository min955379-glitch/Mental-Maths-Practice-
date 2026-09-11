# Release Notes

## v1.3.0 — Quiz control layout + Contact Us with WhatsApp

**Release date:** 2026-09-11
**File:** `apk/Mental-Maths-Practice.apk` (612 KB / 625,641 bytes, versionCode 7, versionName 1.3.0)
**MD5:** `ab52e2f937356704bbc140dc8d4632d2`
**SHA-256:** `c8e7eb5b27df26a92dff7434b1c2bbae6fa42f618e2283f67554fbf3eb98f9b9`
**Signed with the original release key** (SHA-256 `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`), verified v1 + v2 + v3 →
installs as an in-place update over every earlier build and keeps your progress.

### Fixed: the answer input was hanging out of the quiz card

The field was 34px wider than the card's content box and poked through its
right-hand edge. The cause was one stray `}` at the end of the dark-theme token
block added in v1.2.2: CSS parsers fold a stray closing brace into the *next*
rule's selector, so the browser silently discarded
`* { box-sizing: border-box; }`. Every `width: 100%` control in the app grew by
its own padding + border — the answer input, the sign-in fields, the dialog
buttons and the Continue Quiz buttons.

- The brace is gone and the form controls re-assert
  `box-sizing: border-box; max-width: 100%`.
- The quiz input now matches the card's content box exactly, with equal
  left/right margins, at 320px through to desktop.
- A new test parses the stylesheet with a real CSS parser and fails if that
  universal rule ever disappears again.

### Fixed: Submit Answer was oversized and wrapped onto two lines

It shared the top row of a two-column grid, so on a phone it was squeezed to
half the card (116px at 320px wide) and the label broke into "Submit /
Answer" — a 68px-tall button. The controls are now three clean rows:

```
[ Answer input .................... ]
          [ Submit Answer ]
[   Hint   ]         [   Quit   ]
```

Submit Answer is centred under the field, sized by its label and never wrapped
(168 × 46px at every width — still a comfortable touch target). Hint and Quit
share the row below at identical widths, pinned to the card's edges. Verified
at 320, 360, 393, 412, 480, 768, 1024 and 1280 pixels: no overflow, no
overlap, no clipped text.

### New: Contact Us

A `#/contact` route with a side-nav entry, built from the app's own cards,
type scale and tokens:

- **Welcome & Support** — your message to users, word for word.
- **Developer** — the photo you supplied (circular, never distorted, fluid
  sizing), **Muhammad Ibrahim**, *Developer of Mental Maths Practice*, and
  "Developed by Muhammad Ibrahim".
- **WhatsApp** — a real link to
  `https://wa.me/03485581969?text=Hey!%20We%20want%20you%20to%20improve%20these%20things%20in%20the%20Mental%20Maths%20Practice%20application......`

The button is a genuine `<a>` — no JavaScript standing in for it. On Android
the app now hands outbound links to the platform, so tapping it opens
**WhatsApp** with the number `03485581969` and the message ready to send; if
WhatsApp is not installed your browser opens WhatsApp Web instead. Verified in
a real browser: the tap navigates, the number and the exact message survive
the redirect, and nothing intercepts the click.

Both themes were measured — the white label on the WhatsApp button is 5.4:1 in
light mode and 4.9:1 in dark mode, and every heading, body line, icon and
border on the page clears its WCAG target.

### Verification

148/148 automated tests across eight suites, plus three headless-Chromium
harnesses: 8/8 viewport geometry checks, every contrast pair in both themes,
and a 30-step end-to-end journey (start → answer → submit → feedback → hint →
quit → continue → discard → reload). All re-run against the assets extracted
from this signed APK.

---

## v1.2.2 — Discard Quiz root cause + dark-theme accessibility

**Release date:** 2026-09-11
**File:** `apk/Mental-Maths-Practice.apk` (583 KB / 596,899 bytes, versionCode 6, versionName 1.2.2)
**MD5:** `826106bb9e222fcdd13057023f20477f`
**SHA-256:** `bd2231cb3559d36550766869e0506a7508fdb5eb09b7bc360f69054e9ca52e60`
**Signed with the original release key** (SHA-256 `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`), verified v1 + v2 + v3 →
installs as an in-place update over every earlier build and keeps your progress.

### Discard Quiz — why it kept failing, and the fix

1. **A stale service worker.** The app is precached offline under
   `iscsp-mm-v8` with a cache-first strategy and no revalidation, so an
   updated install kept running the *old* `ui.js`. The cache is now
   `iscsp-mm-v9`; the worker already deletes superseded caches, calls
   `skipWaiting()` and `clients.claim()`, so the fixed assets take effect on
   the first launch after the update.
2. **The delete was never verified.** `discardUnfinished()` now removes the
   session from the same store Continue Quiz reads from, checks that something
   was actually removed, and if the stored copy has drifted from the card's
   snapshot it falls back to matching the quiz itself (mode + start time +
   question list). It re-renders into the live Continue Quiz container and
   reports the outcome — "Quiz discarded. 2 unfinished quizzes left." — so a
   tap can never again look like nothing happened.
3. **The dialog could be unreachable.** A centred dialog that is taller than
   the viewport pushes its buttons below the fold; it now uses `margin: auto`
   and scrolls, with 44px tap targets.

Verified: three unfinished quizzes, discard the middle one → only that one
goes; Keep It deletes nothing; a discarded quiz does not come back after the
app is closed and reopened; history, attempts and statistics are untouched.

### Dark theme — readable, not just dark

Every dark-mode pair was scored with the WCAG relative-luminance formula and
corrected:

| | before | after |
|---|---|---|
| Icons on the indigo chips (mode, continue, difficulty, nav, pills) | 1.40:1 | **9.16:1** |
| Accent text on a card (Start Easy/Medium/Hard, category label) | 2.63:1 | **9.60:1** |
| Outlined controls (Hint, Quit, Keep It, Discard) | 1.62:1 | **3.43:1** |
| Muted / secondary text | 3.96:1 | **7.44:1** |
| Error, warning and success text | 3.2–4.4:1 | **7.6–10.6:1** |
| White label on the success button | 3.57:1 | **5.01:1** |

Surfaces now step visibly page → card → elevated, and placeholders, focus
rings, selection colour and the difficulty pills were made readable too. The
work is done with new semantic tokens whose light values are exactly the
colours those rules already used, so **the light theme is unchanged** — the
test suite pins all 15 light values.

### Verification

118/118 automated tests — `pwa` 14/14, `regressions` 15/15, `quiz-actions`
6/6, `content-difficulty` 15/15, `timer-discard` 19/19, `theme-contrast`
49/49 — all re-run against the assets extracted from this signed APK.

---

## v1.2.1 — Discard Quiz + quiz timer fixes

**Release date:** 2026-09-11
**File:** `apk/Mental-Maths-Practice.apk` (583 KB / 596,899 bytes, versionCode 5, versionName 1.2.1)
**MD5:** `6f226f5acdcdd2dab7fbb55b906c3d4a`
**SHA-256:** `6cfe1a1011693713b571327c611ff7d72b78465323aa38bbf59c87ff678c0633`
**Signed with the original release key** (SHA-256 `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`), verified v1 + v2 + v3 →
installs as an in-place update over v1.2.0 / v1.1.1 and keeps every stat, session and unfinished quiz.

### Discard Quiz now actually deletes

- The confirmation dialog rebinds its buttons on every call, so a lost click
  handler can no longer leave "Discard Quiz" dead.
- The deletion is id-safe and always persisted, and the dashboard refreshes
  into the live Continue Quiz container, so the quiz disappears immediately.
- Discarding the quiz that is currently open stops its timer first, so it
  cannot be re-saved a moment later.
- Only the selected quiz goes: other unfinished quizzes, completed history,
  attempts and all of your statistics are untouched, and the discarded quiz
  does not come back after closing and reopening the app.

### The quiz timer runs in every mode

- It used to start only for countdown quizzes, so Quick / Full Test /
  Category / Weak Areas / Mistake Review sat frozen at `00:00`. It now starts
  the moment a quiz does and keeps running through every question and answer.
- Timing is derived from monotonic clock deltas rather than counting timer
  ticks, so it stays accurate when the WebView throttles timers, the device
  lags, or a render is slow.
- Per-question time is recorded on submit and on each transition; resuming
  from Continue Quiz carries on from the saved time instead of resetting;
  time while the quiz is closed is not counted.
- Countdown modes keep their rules: they count down from the configured
  limit, never go negative, and finish the quiz (and save the result) at zero.

### Verification

65/65 automated tests — `pwa` 14/14, `regressions` 15/15, `quiz-actions` 6/6,
`content-difficulty` 15/15, `timer-discard` 15/15 — re-run against the assets
extracted from this signed APK. Two older tests were found to be passing
vacuously (comparing `0 === 0`) and were strengthened.

---

## v1.2.0 — Content + difficulty release

**Release date:** 2026-09-11
**File:** `apk/Mental-Maths-Practice.apk` (579 KB / 592,803 bytes, versionCode 4, versionName 1.2.0)
**MD5:** `10f74510567122be80501c6aca04ae5e`
**Signed with the original release key** (SHA-256 `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`), verified v1 + v2 + v3 →
installs as an in-place update over v1.1.1 and keeps every stat, session and unfinished quiz.

### 1,130 original, machine-verified questions

- **1,080 new questions** generated from 345 original question families, plus the 50
  original seeds (kept unchanged) → **1,130 total**.
- **60 questions in every one of the 18 categories** (requirement: 50+), split
  **20 Easy / 20 Medium / 20 Hard** — 360 of each tier.
- Difficulty is set by **reasoning depth, not digit size**: Easy is one visible step,
  Medium is two steps or a pattern you must simplify first, Hard is multi-step
  reasoning, reverse problems or chained percentage changes.
- Every answer is proved with exact rational arithmetic and an independent
  cross-check, so there are **no wrong answer keys**. Design and checks:
  [`tools/question_bank/VALIDATION.md`](../tools/question_bank/VALIDATION.md).
- FPSC / PPSC / NTS-style originals, no copied text, no emoji, `× ÷ − + =` only
  (never `*`). Hints are ≥25 characters and never reveal the answer.

### Difficulty chooser before every quiz

- New pre-quiz screen: **mode → category → EASY / MEDIUM / HARD → start**.
- Each card shows what the tier means, how many questions are ready and **your
  accuracy at that tier**; the recommended tier is badge-marked with a one-line
  reason. A **Mixed difficulty** button keeps the old behaviour.
- Accuracy is now tracked **per difficulty** as well as per category, and the tier
  you picked is shown as a pill during the quiz.

### Generators for every category

- **Mental Division, Number Patterns and Mixed Mental Math** now generate unlimited
  questions (they previously fell through and produced nothing once their seeds ran
  out).
- Pool building is **fresh seeds → generator → repeat reuse**, with a
  served-question memory so consecutive sessions keep rotating even when you answer
  nothing.

### Reworked quiz action bar

- Row 1: **Submit Answer** (primary, right). Row 2: **Hint** (left) | **Quit**
  (right). One grid, consistent heights / radii / icon sizes, no horizontal scroll
  from 320 px up.
- **Quit now uses an in-app modal** instead of the browser `confirm()`. Cancel keeps
  you in the quiz; Quit saves progress and **Continue Quiz** resumes it.

### Engineering

- New dependency-free **policy gate** (`tools/check-policy.mjs`) in CI: no emoji,
  no native `confirm()` / `alert()` / `prompt()` (the app now declines instead of
  falling back to a native dialog), no remote resources, `× ÷ −` typography,
  hints that teach without revealing the answer.
- `.github/workflows/ci.yml` runs all four suites, the bank census and a
  bank-reproducibility check on every push; `.github/workflows/pages.yml`
  publishes the PWA to GitHub Pages.
- The Gradle path (`apk/build.sh`) now writes `Mental-Maths-Practice.apk` like
  the Gradle-free path, and the superseded 4.8 MB `ISCSP-Mental-Math-Arena.apk`
  has been deleted.

### Verification

50/50 automated tests — `pwa` 14/14, `regressions` 15/15, `quiz-actions` 6/6,
`content-difficulty` 15/15 — and **50/50 again against the `assets/` extracted from
this signed APK**.

---

## v1.1.1 — Bug-review release (5 confirmed bugs fixed + hardening)

**Release date:** 2026-09-10
**File:** `apk/Mental-Maths-Practice.apk` (507 KB / 519,003 bytes, versionCode 3, versionName 1.1.1)
**MD5:** `6605300584c4777f3305ce90bde6a0d9`
**Signed with the original release key** (SHA-256 `2d7470c4a523…`), verified v1 + v2 + v3 →
installs as an in-place update over v1.1.0 and keeps every stat, session and unfinished quiz.

Triggered by an independent line-by-line review (`BUGS.md`). Every item is answered in
[`BUGFIX-REPORT.md`](../BUGFIX-REPORT.md) at the repository root.

### Bugs fixed

- **Blank answers were graded as wrong.** `submit(null)`, `submit(undefined)` and
  `submit("")` used to be recorded as incorrect attempts, silently dragging down
  accuracy, streaks and history. They are now refused before anything is persisted.
- **`finish()` crashed without an active session** (`TypeError: Cannot set properties
  of null`). It now returns `null`; `pause()` / `quit()` are covered by tests too.
- **The countdown wrote `localStorage` every second** (~600 synchronous writes in a
  10-minute quiz). Persistence is throttled to one write per 5 ticks; leaving,
  submitting and advancing still flush the exact remaining time, so resume fidelity
  is unchanged.
- **Streaks and the daily goal used the UTC date.** In Asia/Karachi (UTC+5) the day
  rolled over at 19:00 local time. Both now use a local calendar day.
- **"Expert" difficulty never produced Expert questions.** Added successive-percentage
  change, reverse percentage and average-speed-over-equal-distances (harmonic mean),
  each with a method-teaching hint, plus a smarter seed fallback (Expert → Hard →
  Medium).

### Hardening

- Content-Security-Policy added (no remote resource is loaded anywhere in the app).
- `getAccountDetails()` no longer returns the password salt or hash.
- Keystore password is read from `KS_PASS` / `KS_ALIAS` instead of being hardcoded in
  `build-offline.sh`, `build.sh` and `app/build.gradle`.
- WebView: cross-file scripting explicitly disabled
  (`setAllowFileAccessFromFileURLs(false)`, `setAllowUniversalAccessFromFileURLs(false)`).
- `crypto.subtle` unavailable (plain-HTTP hosting) now returns a clear message instead
  of throwing; unknown `?cat=` routes fall back to mixed practice.
- `genRatio()` recursion bounded; `StateStore.deleteSession()` added;
  `parseFraction` accepts a negative denominator; service worker cache → `iscsp-mm-v7`.

### Polish

- Toast timers no longer race (a newer toast is no longer hidden early).
- Snapshots saved in the same millisecond still sort newest-first.
- Categories with no seed questions say "Generator only — unlimited questions".
- Disclosure arrow now rotates; theme icon stroke weights match; auth tabs focus the
  first field; `<details>` keeps `aria-expanded` in sync.

### Verification

- `node tests/pwa.test.mjs` → **14/14**
- `node tests/regressions.test.mjs` → **15/15** (new suite; each test fails against the pre-fix source)
- Hint sweep over 1,555 questions → 0 missing hints, 0 answer-revealing hints
- Both suites re-run against the `assets/` extracted from the finished APK → **29/29**,
  and those assets are byte-identical to `pwa/`.

---

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
