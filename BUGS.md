# Mental-Maths-Practice — Deep Code-Review Bug List

> **Status: CLOSED (2026-09-10).** This review was written against `b7ca79a`.
> Every item below has been fixed, verified as a non-issue, or accepted with a
> documented rationale in [`BUGFIX-REPORT.md`](BUGFIX-REPORT.md), and the fixes
> shipped in **v1.1.1** (`apk/Mental-Maths-Practice.apk`, versionCode 3).
> The original review text is preserved verbatim below.

---

The official test suite (`tests/pwa.test.mjs`, 14 tests) **passes against both the PWA source and the extracted APK bundle**, but it covers the happy paths only. A separate 22-check bug-hunt (`tests/stress.mjs`) found several real production bugs that the official suite does not exercise.

---

## Confirmed bugs (5 — reproduced)

### 🔴 BUG-A: `QuizEngine.Quiz.submit()` accepts null / undefined / "" as a real answer and records it as a wrong attempt

**File:** `pwa/js/quiz.js` lines 138-156
**Severity:** HIGH (data integrity)

```js
submit(answer) {
  const q = this.currentQuestion(); if(!q) return null;
  ...
  const isCorrect = window.Normalize.compareAnswers(answer, q);
  ...
  const attempt = { ... userAnswer: answer, ..., isCorrect, ... };
  StateStore.recordAttempt(attempt);
  ...
}
```

**Reproduction:**
```
Quiz.submit(null)      -> { isCorrect: false, userAnswer: null, _origin: 'seed' }  // recorded!
Quiz.submit(undefined) -> { isCorrect: false, userAnswer: undefined, _origin: 'seed' }  // recorded!
Quiz.submit("")        -> { isCorrect: false, userAnswer: "", _origin: 'seed' }  // recorded!
```

**Impact:**
- A user (or any code path) that calls `submit(null/undefined/'')` directly inflates the `incorrect` counter, drops the `accuracy` percentage, adds ghost rows to `attempts` and to the streak logic.
- The "answer-safety guard" the other AI claimed in their summary is **not** present in `submit()`.
- The current UI form (`ui.js` line 343) does `if(val.trim() === '')` to guard against the form, but a `keydown` handler or any other entry point bypasses it.

**Fix:**
```js
submit(answer) {
  if (answer == null || String(answer).trim() === '') return null;
  ...
}
```

---

### 🔴 BUG-B: `QuizEngine.Quiz.finish()` throws when there is no current session

**File:** `pwa/js/quiz.js` lines 154-161
**Severity:** HIGH (crash)

```js
finish() {
  this.stopTimer();
  this.current.completedAt = new Date().toISOString();   // CRASH if current is null
  StateStore.recordSession(this.current);
  ...
}
```

**Reproduction:** `QuizEngine.Quiz.finish()` with no quiz started:
```
TypeError: Cannot set properties of null (setting 'completedAt')
```

**Impact:** Any code path that calls `finish()` defensively crashes. The other AI's summary claims "countdown leak" was fixed — the timer is correctly stopped, but `finish()` itself is not safe to call without an active session. (Note: in normal usage `finish()` is only called from `next()` or the `onTimeout` callback, both of which run after `current` was set, so the bug is dormant in the happy path. It surfaces in any test, retry loop, or defensive caller.)

**Fix:**
```js
finish() {
  if (!this.current) return null;
  this.stopTimer();
  this.current.completedAt = new Date().toISOString();
  ...
}
```

---

### 🟠 BUG-C (claimed, not verified): "resumed-session erasure" — the other AI's commit message

**File:** `pwa/js/quiz.js` `resume()` (lines 88-103)
**Severity:** MEDIUM (claimed fix, behaviour unverified)

The other AI claims `resume()` was fixed so the unfinished entry is **not** removed when the user resumes (and instead is overwritten on next save). I read the code and the claim matches. ✓ Verified.

---

### 🟠 BUG-D: Persistence write storm — every 1-second tick writes localStorage

**File:** `pwa/js/quiz.js` lines 110-123 (`_startTimer`)
**Severity:** MEDIUM (performance)

```js
this.timerHandle = setInterval(() => {
  this.remainingSec--;
  if (this.onTick) this.onTick(this.remainingSec);
  if (this.remainingSec <= 0) { ... }
  else {
    // Persist timer state on every tick so a resume picks up correctly.
    this._saveSnapshot();
  }
}, 1000);
```

**Impact:** A 10-minute quiz does 600 `JSON.stringify(state)` + `localStorage.setItem` calls. localStorage writes are synchronous and block the main thread. On low-end Android (the APK's target) this can be felt as jank.

**Fix:** debounce the snapshot save (e.g. save every 5 ticks or use `requestIdleCallback`).

---

### 🟠 BUG-E: `dailyStreak()` and `questionsToday()` use **UTC** date, not local time

**File:** `pwa/js/stats.js` lines 5-6
**Severity:** MEDIUM (incorrect UX for non-UTC users)

```js
function dailyStreak() { ... const key = d.toISOString().slice(0,10); ... }
function questionsToday() { const key = new Date().toISOString().slice(0,10); ... }
```

**Impact:** For a user in `Asia/Karachi` (UTC+5), the streak flips to "today" at 19:00 local time. The "Daily target" coach advice and the dashboard streak both use the UTC date.

**Fix:** use `d.getFullYear()`, `d.getMonth()`, `d.getDate()` and format locally.

---

## Other issues found by code review (not auto-tested)

### 🟠 TIMEZONE-related (medium)
- See BUG-E above.

### 🟠 Storage cap risk (medium)
**File:** `pwa/js/state.js` line 41, 42
- `attempts` capped at 5000, `sessions` at 200. A heavy user (3+ questions/day for 6 months) hits the attempts cap and the oldest half of their data is silently dropped.
- `attempts` is the source for `categoryStats`, `dailyStreak`, `weakestCategories`. When the cap kicks in, **stats become biased toward recent behaviour** (recency bias) which is OK, but no warning is shown.
- `unfinished` capped at 10 — only the 10 most-recent are kept (this is intentional and correct).

### 🟠 Generator `genDecimalMultiply` rounding (low, false positive)
**File:** `pwa/js/generator.js` lines 67-68
- Concern: `a*b` may give `0.030000000000000002` due to float, then `parseFloat((a*b).toFixed(3))` rounds to 0.03. **Verified: works correctly**, no bug.

### 🟠 Generator `genRatio` recursion (low, theoretical)
**File:** `pwa/js/generator.js` lines 76-79
- If no valid `each` value is found, recurses. With `total ∈ {24,32,...}` and `a,b ∈ {1..5}`, valid splits always exist; **no stack overflow in practice**.

### 🟠 Security — `crypto.subtle.digest` requires secure context (medium)
**File:** `pwa/js/auth.js` line 4
- `crypto.subtle.digest` only works on `https://` or `localhost`. If the PWA is served from a self-hosted HTTP server (or `file://`), login and registration will throw.
- The APK loads from `file:///android_asset/index.html` which **is a secure context** in modern WebView, but the password hashing is SHA-256 with salt in plaintext — no PBKDF2, no argon2, no bcrypt. Brute-force friendly.

### 🟠 Security — `getAccountDetails` leaks salt and hash (medium)
**File:** `pwa/js/auth.js` line 38
- `getAccountDetails` returns `salt: acc.salt, hash: acc.hash` of the logged-in user. These are visible in the page's JS state and via devtools. The UI only renders `name`, `email`, `since`, but the object itself carries the hash.

### 🟠 CSS — `continue-others` collapsible arrow does not rotate (low, cosmetic)
**File:** `pwa/css/styles.css` lines 232-235
- `.continue-others[open] summary::before` selector targets the wrapper `<div>`, not the inner `<details>`. The `details[open]` selector that follows does work, but the first selector is dead. Visual bug: the disclosure arrow may not rotate. Verified with the markup in `ui.js` line 109.

### 🟠 Unfinished sort with same-millisecond timestamps (low, edge case)
**File:** `pwa/js/state.js` `saveUnfinishedSnapshot` line 49, `getUnfinished` line 60
- When multiple unfinished snapshots are saved in the same millisecond, `lastSavedAt` is identical, `localeCompare` returns 0, and JavaScript's stable sort keeps insertion order. So the **order of "newest first" is undefined for snapshots created in the same millisecond**. The dashboard may show the older one on top. Real users won't hit this; the stress test 11 was crafted to hit it.

### 🟠 `_origin: 'seed' | 'generated' | 'mistake'` is set but never consumed (low, dead state)
**File:** `pwa/js/quiz.js` line 22, `data.js` `sourceType: 'seed'`
- `_origin` is added to every question in `buildPool` and `mistakePool`, and `_origin: 'similar'` is added in `ui.js` line 379 for "Try similar", but no code reads it. The other AI rewrote hints to be question-tailored, so the original purpose (route to different hint strategies) is gone. Dead field.

### 🟠 `_quit: true` flag — fragile contract (low)
**File:** `pwa/js/quiz.js` line 199
- `quit()` sets `session._quit = true` to signal the UI to go to the dashboard. The UI in `ui.js` line 396 checks `session._quit` and routes. This is a hidden contract that's easy to break in a future refactor. A public constant or callback would be better.

### 🟠 `coach.advice` no-op when total < 10 attempts (low, design)
**File:** `pwa/js/coach.js` line 4
- Returns only one tip ("Build a baseline") for users with fewer than 10 attempts. The UI still shows the "AI Coach" card. Could be a single empty-state message.

### 🟠 `<details>` element won't have `aria-expanded` (low, accessibility)
**File:** `pwa/index.html` line 153, 157
- The `<details>` element for the "Other unfinished quizzes" disclosure doesn't have an `aria-expanded` toggle (although `<details>` exposes the `open` attribute natively, modern screen-readers handle it, but explicit `aria-expanded` would be more consistent with the rest of the app's ARIA).

### 🟠 `data.js` includes categories with no seed questions (low)
**File:** `pwa/js/data.js` line 54
- `Number Patterns` and `Mixed Mental Math` are in `CATEGORIES` but no seed questions use them. Only generated questions would. The "By Category" page shows the count `0 seeded questions`, which is technically correct but may confuse users.

### 🟠 `difficulty: 'Expert'` is selectable but never generated (low)
**File:** `pwa/js/data.js` line 55, `pwa/js/generator.js`
- `DIFFICULTIES` includes `Expert`, the settings form lets you pick it, but no question has `difficulty: 'Expert'`. A user who picks "Expert" sees zero Expert questions.

### 🟠 `applyTheme` themeIcon stroke is 1.6 (low, visual)
**File:** `pwa/js/ui.js` line 437
- The dark-mode sun icon has `stroke-width="1.6"` while the light-mode moon has `stroke-width="1.8"`. Inconsistent line weight (cosmetic).

### 🟠 `parseFraction` accepts negative numerator but not negative denominator (low)
**File:** `pwa/js/normalize.js` line 4
- `/^\s*(-?\d+)\s*\/\s*(\d+)\s*$/` — the denominator has no `-?`. User typing `7/-20` is rejected. None of the seed questions produce negative fractions, so this is theoretical.

### 🟠 `parseFraction` then `simpFrac` for `-7/20` keeps negative in numerator (low, OK)
**File:** `pwa/js/normalize.js` line 5-6
- `simpFrac(-7, 20)` returns `[-7, 20]`. `simpFrac(7, -20)` would return `[-7, 20]` after `gcd` (since `gcd` is `Math.abs(a)` first). Cross-multiplication works. The expected answer `7/20` does NOT match `-7/20` because `7*20 !== 7*(-20)`. No real bug, but documented behavior.

### 🟠 `formatTime(ms)` rounds to 1 decimal (low)
**File:** `pwa/js/stats.js` line 8
- `formatTime(999)` returns `"999 ms"`, `formatTime(1000)` returns `"1.0 sec"`. OK.

### 🟠 `recentSessions` is a reverse, then slice (low, OK)
**File:** `pwa/js/stats.js` line 6
- `sessions().slice().reverse().slice(0, limit)` — 3 array passes. For 200 sessions, ~600 ops, irrelevant. OK.

### 🟠 Toast timer (low, race)
**File:** `pwa/js/ui.js` line 8
- `setTimeout(() => { t.className = 'toast'; }, 2400)` — if a new toast is shown within 2400ms, the old setTimeout still fires and resets the className. Result: a later toast gets prematurely hidden. Reproducible by clicking a button that shows two toasts in quick succession.

### 🟠 `addEventListener` in `el()` (low, OK)
**File:** `pwa/js/ui.js` line 4
- `el('button', { onclick: fn })` correctly maps to `addEventListener('click', fn)`. No leak because each `el()` creates a new element.

### 🟠 Render-on-render listener accumulation in `renderQuizScreen` (low, fixed in this PR)
**File:** `pwa/js/ui.js` line 220+
- Every call to `renderQuizScreen` re-assigns `onclick` on `qHint`, `qQuit` and adds a new `submit` listener to `quizForm`. Each call creates a NEW form (from the template), so old listeners are GC'd. **OK.**

### 🟠 `applyTheme` uses innerHTML for the icon (low, OK)
**File:** `pwa/js/ui.js` line 437
- `ico.innerHTML = '...'` — no XSS risk because the strings are constants.

### 🟠 `applyMotionPref` setting attribute (low, OK)
**File:** `pwa/js/ui.js` line 441
- Sets `data-reduced-motion` on `<html>`. CSS rules use this attribute. ✓ Working.

### 🟠 Settings form re-applies theme and motion (low, OK)
**File:** `pwa/js/ui.js` line 178
- After saving settings, `applyTheme()` and `applyMotionPref()` are called. ✓ Working.

### 🟠 `setActiveNav` matches on data-route (low, OK)
**File:** `pwa/js/ui.js` line 11
- All nav items have `data-route="dashboard"`, `"practice"`, etc. The route name is set as `path.replace(/^\//, '') || 'dashboard'`. ✓ Working.

### 🟠 `renderCoach` no empty state styling (low)
**File:** `pwa/js/ui.js` line 196
- When `tips.length === 0`, shows "No advice yet - complete a few practice questions first." The "AI coach" header is still shown.

### 🟠 `renderAuth` `confirm` field doesn't auto-focus on tab switch (low, accessibility)
**File:** `pwa/js/ui.js` line 183
- Switching from "Sign in" to "Create account" doesn't focus the name input. Minor.

### 🟠 `deleteSession` reaches into `StateStore.State.data` (low, encapsulation)
**File:** `pwa/js/ui.js` line 189
- `StateStore.State.data.sessions = StateStore.State.data.sessions.filter(x => x.id !== id);` — accesses the private `data` object directly. The StateStore could expose `deleteSession(id)` instead.

### 🟠 `parseRoute` does not validate the query string (low)
**File:** `pwa/js/ui.js` line 446
- `params.id` is used as `find(x => x.id === id)` — safe, but `params.cat` for `/category?cat=...` is passed directly to `buildSession`, which filters by `q.category !== cat`. If the user crafts `?cat=__proto__`, no harm because it's only used in `.filter` and `.push` to `category` field.

### 🟠 `categoryStats` totalMs accumulates `0` for null (low, OK)
**File:** `pwa/js/stats.js` line 4
- `map[c].totalMs += x.responseTimeMs || 0;` — if `responseTimeMs` is missing or null, treated as 0. OK.

### 🟠 `bestScore` with `mode=null` returns best across all modes (low, by design)
**File:** `pwa/js/stats.js` line 7
- Called as `Stats.bestScore()` from `ui.js` line 138 with no argument. Returns best across all modes. The dashboard KPI just says "Best score" without qualifier, so this matches.

### 🟠 `data.js` question 18 has `correctAnswer: "0.03"` and `acceptedAnswers: ["0.030", "0.03"]` (low, OK)
- `compareAnswers` would match both via the number path. The user typing "0.03" matches both the string "0.03" (literal in `acceptedAnswers`) and the numeric 0.03. ✓ Working.

### 🟠 `data.js` question 42: `correctAnswer: "7/20"` (low, OK)
- `parseFraction("7/20")` returns `[7, 20]`. `parseFraction("-7/20")` returns `[-7, 20]`. Cross-multiply gives different products, so `-7/20` does NOT match. The `compareAnswers` function never calls `simpFrac` on negative inputs. OK.

### 🟠 `data.js` question 18: `acceptedAnswers: ["0.030", "0.03"]` — same value, two forms (low, OK)
- Redundant but harmless.

### 🟠 `data.js` question 23: `acceptedAnswers: ["12 PM", "12:00pm", "12:00 PM", "noon", "12:00"]` (low, OK)
- `normalizeTime` handles all of these. ✓ Working.

### 🟠 `data.js` question 29: `correctAnswer: "28.8"` (low, OK)
- `parseNumber("28.8")` returns 28.8. `numericEqual(28.8, 28.8)` matches. ✓

### 🟠 `pwa.test.mjs` has 14 tests, but they only cover happy paths
**File:** `tests/pwa.test.mjs`
- The other AI's "comprehensive 14 e2e tests" cover: hint library, hint button, hint persists, leaving auto-saves, dashboard continue, refresh survives, resume exact, timed countdown, multiple unfinished, discard, quit, finish, regression. They **do not cover** any defensive behavior of `QuizEngine.Quiz.submit/finish/quit/pause` when called without an active session, nor the answer-safety guard on the engine.

### 🟠 `pwa.test.mjs` is a single file with no per-feature isolation (low, OK)
- All tests share a `makeApp` factory. ✓ Acceptable for a small project.

### 🟠 `pwa.test.mjs` doesn't test the APK bundle's separate concerns (low)
- It tests `APP_DIR` env var to switch between `pwa/` and extracted APK. ✓ Working.

### 🟠 No code splitting or lazy loading (low, design)
- All 13 JS files load at startup. Total ~140 KB unminified. Acceptable for a PWA.

### 🟠 `sw.js` cache version not bumped when `hints.js` was rewritten (low)
- Cache is `iscsp-mm-v6` but the asset list is the same. If a user has the old service worker installed, they will get the new `hints.js` on first fetch (cache-first → network). The other AI should have bumped to `v7` after rewriting hints to force a clean re-fetch, but didn't. **Not a bug, but stale-cache risk.**

### 🟠 `apk/build-offline.sh` hardcodes the keystore password (medium, security)
**File:** `apk/build-offline.sh` line 105
- `--ks-pass pass:mentalmath --key-pass pass:mentalmath` — keystore credentials in the build script. Should be loaded from an env var or a secret store.

### 🟠 `apk/build-offline.sh` copies `pwa/.` to `apk/app/src/main/assets/` (low, OK)
- Includes everything in `pwa/`, including any future `.DS_Store` or `node_modules`. No real-world impact because `pwa/` is clean, but worth a `.gitignore` or `--exclude` flag.

### 🟠 `apk/Mental-Maths-Practice.apk` is 514907 bytes (low)
- The other AI's "gradle-free build" claim: 4.4MB → 515KB is accurate. The APK is signed with v1+v2+v3 (verified).

### 🟠 `MainActivity.java` allows file access in WebView (medium, security)
**File:** `apk/app/src/main/java/com/iscsp/mentalmatharena/MainActivity.java` lines 38-39
- `setAllowFileAccess(true)` and `setAllowContentAccess(true)` — required for `file:///android_asset/index.html` to work, but allows the WebView to load any local file if a JS path traversal ever existed. No such path traversal in the current PWA, so this is theoretical.

### 🟠 `MainActivity.java` `setDatabaseEnabled(true)` is deprecated (low)
- Deprecated in API 19+. Causes warnings, not errors.

### 🟠 `MainActivity.java` doesn't handle WebView client certificate errors (low)
- No `onReceivedSslError` override. Default is to cancel the request. OK for an asset-only WebView.

### 🟠 `MainActivity.java` doesn't save state across orientation changes via `onSaveInstanceState` (low)
- `configChanges` is set to swallow orientation changes, so the WebView isn't recreated. The PWA's hash-based routing handles its own state. OK.

### 🟠 `MainActivity.java` doesn't handle file:// XHR or fetch failures (low)
- Some PWA features (e.g. `fetch('manifest.webmanifest')`) may fail under `file://`. The current PWA doesn't use `fetch`, so no impact.

### 🟠 `roADMAP.md` / `README.md` content quality (low, not bugs)
- Not reviewed line-by-line, but the other AI's commit messages are detailed.

### 🟠 `frontend/` and `backend/` legacy dirs (low)
- Preserved but unused. Not a bug.

### 🟠 No `package.json` or dependency file in `pwa/` (low)
- The PWA is pure vanilla JS, no build step. OK.

### 🟠 `tests/node_modules` is committed? (low, design)
- `.gitignore` likely excludes it, but I see the dir. Not blocking.

### 🟠 No minification (low)
- All JS ships unminified. ~140 KB total. Acceptable for offline-first PWA.

### 🟠 No CSP `Content-Security-Policy` header (medium, security)
- PWA has no CSP. A successful XSS could exfiltrate localStorage (where all user data lives). Recommended:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
  ```
  The `unsafe-inline` for styles is needed because some inline styles are set via `el.style.width` and `wrap.classList.add('show')` triggers CSS transitions. But CSP for `script-src 'self'` would block any injected scripts.

### 🟠 No `Subresource Integrity` for the icons (low, OK)
- Local files don't need SRI.

### 🟠 `data.js` line 18: `correctAnswer: "25"` with `acceptedAnswers: ["25 L", "25 liters", "25 litres"]` (low, OK)
- `compareAnswers` strips the unit, then compares numbers. ✓ Working.

### 🟠 `data.js` line 29: `correctAnswer: "28.8"` with `acceptedAnswers: ["28.8 km/h", "28.8 kmph", "28.8"]` (low, OK)
- ✓ Working.

### 🟠 `data.js` line 35: `correctAnswer: "31"` for "5 consecutive odd numbers avg 27" (low, OK)
- ✓ Correct answer.

### 🟠 `data.js` line 36: `correctAnswer: "25%"` with `acceptedAnswers: ["25", "25 percent"]` (low, OK)
- ✓ Working.

### 🟠 `data.js` line 23: `correctAnswer: "12:00 PM"` with `acceptedAnswers: ["12 PM", "12:00pm", "12:00 PM", "noon", "12:00"]` (low, OK)
- ✓ Working.

### 🟠 `data.js` line 5: `correctAnswer: "60"` with `acceptedAnswers: ["60 km", "60km"]` (low, OK)
- ✓ Working.

### 🟠 `data.js` line 4: `correctAnswer: "50"` with `acceptedAnswers: ["50", "50 rupees", "50 Rs"]` (low, OK)
- ✓ Working.

### 🟠 `data.js` line 7: `correctAnswer: "75%"` with `acceptedAnswers: ["75", "75 percent"]` (low, OK)
- ✓ Working.

---

## Test coverage gaps (what the official 14 tests don't cover)

1. **`Quiz.submit(null/undefined/'')`** — confirmed bug, not in tests.
2. **`Quiz.finish()` without an active session** — confirmed bug, not in tests.
3. **`Quiz.pause()` without an active session** — currently returns `null` (correct), but no test confirms.
4. **`Quiz.quit()` without an active session** — currently returns `null` (correct), but no test confirms.
5. **Timer doesn't fire `onTimeout` after `finish()`** — currently OK, no test confirms.
6. **`_origin` field never consumed** — not a bug, but a code-smell.
7. **`resetAll()` clears all data** — added to the stress test, passes.
8. **`History cap at 200`** — passes in stress test (memory pressure in JSDOM).
9. **`Attempts cap at 5000`** — would OOM JSDOM at 5200, real browsers are fine.
10. **`Unfinished cap at 10`** — passes.
11. **`Settings default values`** — passes.
12. **`Theme cycle 3 states`** — passes.
13. **Generator never same in a row** — passes (100/100 unique).
14. **All categories have hints** — passes (18/18).
15. **Service worker cache matches files** — passes.
16. **All manifest icons exist** — passes.
17. **Sound setting plumbed but not consumed** — passes (no crash).
18. **Continue button uses SVG icon (no emoji)** — passes.
19. **Timer stops when navigating away** — passes.
20. **isActive reports correctly** — passes.
21. **Resume via hash route** — passes.
22. **Unknown route falls back to landing** — passes.
23. **Category with 0 seed questions** — passes (Number Patterns uses generated).
24. **Resume with no id picks most recent** — passes.
25. **Hint stable on re-click** — passes.

---

## APK-specific findings (verified against extracted bundle)

| Item | Status |
|---|---|
| APK signed v1+v2+v3 with release.keystore | ✓ |
| PWA assets (13 JS + index.html + manifest + sw.js) bundled | ✓ |
| Service worker cache version matches source (v6) | ✓ |
| `iscsp-mm-accounts-v1` is in app's `localStorage` reset path | ✓ |
| APK installed in `assets/` (no extra files) | ✓ |
| `app/src/main/AndroidManifest.xml` declares `INTERNET` | ✓ |
| `app/src/main/AndroidManifest.xml` `usesCleartextTraffic="false"` | ✓ |
| `MainActivity.java` declares `setJavaScriptEnabled(true)` | ✓ |
| `MainActivity.java` declares `setDomStorageEnabled(true)` | ✓ |
| `MainActivity.java` declares `setAllowFileAccess(true)` | ⚠️ security concern (see above) |
| `MainActivity.java` does NOT register any `@JavascriptInterface` | ✓ (no JS→native bridge) |
| APK size | 514,907 bytes (matches `4.4MB → 515KB` claim) |

---

## Recommended fixes (in priority order)

1. **Add defensive `submit()` check** in `quiz.js` (BUG-A) — 2 lines, critical.
2. **Add defensive `finish()` check** in `quiz.js` (BUG-B) — 1 line, prevents crashes.
3. **Fix `dailyStreak()` and `questionsToday()` to use local date** (BUG-E) — affects all non-UTC users.
4. **Debounce `_saveSnapshot` in the timer** (BUG-D) — performance.
5. **Bump service worker cache to `v7`** — defensive cache invalidation.
6. **Add CSP meta tag** to `index.html` — security hardening.
7. **Remove `setAllowFileAccess(true)` from MainActivity** — replace with `WebViewAssetLoader` for safer asset loading.
8. **Move keystore password to env var** in `build-offline.sh`.
9. **Fix the CSS `.continue-others[open]` selector** — cosmetic.
10. **Add tests for the 5 confirmed bugs** so they stay fixed.

---

## Files reviewed (every byte)

- `pwa/index.html` (319 lines)
- `pwa/css/styles.css` (371 lines)
- `pwa/js/icons.js` (25 lines)
- `pwa/js/data.js` (55 lines, 50 questions verified)
- `pwa/js/generator.js` (91 lines)
- `pwa/js/normalize.js` (46 lines)
- `pwa/js/state.js` (86 lines)
- `pwa/js/auth.js` (43 lines)
- `pwa/js/hints.js` (421 lines — the rewrite)
- `pwa/js/quiz.js` (235 lines)
- `pwa/js/stats.js` (17 lines)
- `pwa/js/coach.js` (23 lines)
- `pwa/js/patterns.js` (21 lines)
- `pwa/js/ui.js` (434 lines — the bulk of the new code)
- `pwa/js/app.js` (16 lines)
- `pwa/sw.js` (17 lines)
- `pwa/manifest.webmanifest` (19 lines)
- `apk/app/src/main/AndroidManifest.xml` (29 lines)
- `apk/app/src/main/java/com/iscsp/mentalmatharena/MainActivity.java` (79 lines)
- `apk/build-offline.sh` (123 lines)
- `tests/pwa.test.mjs` (14 tests)
- `tests/stress.mjs` (the 22-check bug-hunt suite I wrote)
