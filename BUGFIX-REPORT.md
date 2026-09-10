# Bug-review response — v1.1.1

**Trigger:** `BUGS.md` — a deep, file-by-file review of `min955379-glitch/Mental-Maths-Practice-`
at `b7ca79a` (5 confirmed bugs + ~40 observations).
**Resolved in:** v1.1.1 (`versionCode 3`), commit series ending the v1.1.1 release.
**Verification:** 14/14 end-to-end + 15/15 regression tests, run against **both** the PWA
source and the `assets/` extracted from the finished APK.

Every item below is answered. Statuses: **FIXED** · **VERIFIED (no bug)** · **BY DESIGN** · **ACCEPTED (documented)**.

---

## 1. The 5 confirmed bugs

### 🔴 BUG-A — `submit(null / undefined / "")` recorded a blank answer as a wrong attempt — **FIXED**

`pwa/js/quiz.js` → `submit()` now refuses blank input before anything is persisted:

```js
if (answer == null || String(answer).trim() === '') return null;
```

Blank, whitespace-only, `null` and `undefined` are no longer graded, recorded in
`attempts`, or counted in `correct` / `incorrect` / streaks.
**Test:** `R1` (submits `null`, `undefined`, `""`, `"   "`, `"\n\t"`; asserts 0 attempts
recorded, score untouched, and that the next valid answer still grades normally).

### 🔴 BUG-B — `finish()` threw with no active session — **FIXED**

```js
finish() { if (!this.current) return null; /* … */ }
```

`pause()` / `quit()` were already null-safe; all three are now covered by tests so a
future refactor cannot silently regress them.
**Test:** `R2` (calls `finish()`, `pause()`, `quit()`, `currentQuestion()` and
`isQuitSession()` with no session; expects `null` and no throw).

### 🟠 BUG-C — resumed-session erasure — **VERIFIED (claim correct, no code change needed)**

`resume()` keeps the unfinished entry in place and overwrites it on the next save.
Covered by existing e2e tests 7, 8 and 9.

### 🟠 BUG-D — every countdown tick wrote `localStorage` — **FIXED**

`_startTimer()` persists at most once every **5 ticks** (`SAVE_EVERY_TICKS`), so a
10-minute quiz does ~120 writes instead of ~600. Nothing is lost: `pause()`,
`quit()`, `submit()` and `next()` still flush the **exact** remaining time before it
can be needed, so pause/resume fidelity is unchanged.
**Test:** `R3` (counts `localStorage.setItem` calls over ~6 ticks — 6 before, ≤2 now —
and asserts the saved `remainingSec` equals the live one after leaving).

### 🟠 BUG-E — streaks and the daily goal used the **UTC** date — **FIXED**

`pwa/js/stats.js` now formats a **local** day key:

```js
function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
```

`dailyStreak()` and `questionsToday()` use `dayKey(new Date(attempt.attemptedAt))`.
For Asia/Karachi (UTC+5) the day now rolls over at local midnight instead of 19:00.
`dayKey` / `attemptDay` are exported for testing. A `while` guard (400 iterations)
makes the streak loop provably terminating.
**Test:** `R4` runs in `TZ=Asia/Karachi` with three attempts that fall on the previous
UTC day but span two local days — 2 expected locally, 1 under the old UTC logic.

---

## 2. Security items

| Item | Status | What changed |
|---|---|---|
| No `Content-Security-Policy` | **FIXED** | `index.html` declares a CSP: `script-src 'self' file:`, `style-src … 'unsafe-inline'`, `img-src/font-src … data:`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`. `file:` is included so the APK (`file:///android_asset/`) keeps working; **no** `http(s)` source is allowed, so injected code cannot phone home. Test `R12` re-scans every shipped file for remote URLs (none found). |
| `getAccountDetails()` leaked `salt` + `hash` | **FIXED** | It now returns only user fields plus `since`. Test `R9`. |
| Keystore password hardcoded in `build-offline.sh` | **FIXED** | Credentials come from `KS_PASS` / `KS_ALIAS` (`apksigner --ks-pass env:KS_PASS`), and `app/build.gradle` reads `System.getenv("KS_PASS")`. The old value remains the documented default so existing scripts keep working. |
| `setAllowFileAccess(true)` in `MainActivity` | **HARDENED** | Still required to load `file:///android_asset/index.html`, but `setAllowFileAccessFromFileURLs(false)` and `setAllowUniversalAccessFromFileURLs(false)` are now set explicitly. Switching to `WebViewAssetLoader` was rejected: it needs `androidx.webkit`, which is exactly the dependency the Gradle-free build removed to go from 4.4 MB → 507 KB. |
| `crypto.subtle` needs a secure context | **FIXED (graceful)** | `register()` / `login()` now check `cryptoReady()` and return `"Password security is unavailable here. Open the app over https:// or use the Android app."` instead of throwing an unhandled rejection. |
| `?cat=` route parameter | **FIXED** | An unknown `?cat=` is rejected, shows a toast and starts mixed practice; only real categories are ever stored on a session. Test `R15`. |
| SHA-256 password hashing (not PBKDF2/argon2) | **ACCEPTED** | Noted. Credentials are local-only (no server, no sync), so the threat model is a lost device. Tracked on the roadmap as a future hardening item. |
| `setDatabaseEnabled(true)` deprecated | **BY DESIGN** | Kept for DOM-storage behaviour on old API levels (API 21 is the minSdk). Commented in the source. |
| No `onReceivedSslError` / client-cert handling | **VERIFIED** | Asset-only WebView, no network requests; the default (cancel) is correct. |
| No SRI, no minification, no code splitting | **BY DESIGN** | Local, offline-first assets (264 KB total). |

---

## 3. Correctness / robustness

| Item | Status | Detail |
|---|---|---|
| Toast timer race | **FIXED** | A pending hide is cleared before a new toast is shown. Test `R8`. |
| Same-millisecond snapshot ordering | **FIXED** | Snapshots carry a monotonic `savedSeq`; `newestFirst()` sorts by `lastSavedAt` then `savedSeq`. Test `R5`. |
| `genRatio()` recursion | **FIXED** | Bounded (`depth >= 8` gives up) and `generateOne()` already tolerates a `null` generator result. |
| `deleteSession()` reached into `State.data` | **FIXED** | `StateStore.deleteSession(id)` added and used by the history screen. Test `R10`. |
| `parseFraction` rejected a negative denominator | **FIXED** | `/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/`; `7/-20` now matches `-7/20`. Test `R11`. |
| `_quit` flag was a fragile hidden contract | **IMPROVED** | `QuizEngine.QUIT_FLAG` + `QuizEngine.isQuitSession(session)`; `ui.js` uses the helper. |
| `attempts` cap 5000 / `sessions` cap 200 | **ACCEPTED (documented)** | Caps are intentional (localStorage quota). Stats are deliberately recency-biased. Test `R14` pins the behaviour: newest kept, oldest dropped. |
| `unfinished` cap 10 | **BY DESIGN** | Documented in the source; newest-first with the deterministic tie-break above. |
| Expert difficulty never generated Expert questions | **FIXED** | Three Expert/Hard generators added — successive percentage change, reverse percentage, and average speed over equal distances (harmonic mean) — plus hints for each and a smarter seed fallback (Expert → Hard → Medium). Tests `R6`, `R7`. |
| Categories with no seed questions | **FIXED** | The Categories screen now shows "Generator only — unlimited questions" instead of "0 seeded questions". Test `R13`. |
| Service worker cache not bumped after the hints rewrite | **FIXED** | `iscsp-mm-v6` → `iscsp-mm-v7`. |
| `build-offline.sh` copied all of `pwa/` | **FIXED** | Sync now excludes `node_modules`, `.DS_Store`, `*.swp`, and `build.gradle` is the single source of truth for `versionCode` / `versionName`. |
| Toast/focus/a11y polish | **FIXED** | Auth tabs focus the first field; `<details>` keeps `aria-expanded` in sync. |
| Theme icon stroke 1.6 vs 1.8 | **FIXED** | Both `1.8`. |
| Disclosure arrow never rotated (dead CSS selector) | **FIXED** | `.continue-others[open] summary::before` targeted the wrapper `div`; now `details[open] > summary::before`. |

---

## 4. Items reviewed and found correct (no change)

Generator decimal rounding (`parseFloat((a*b).toFixed(3))`) · `genDecimalMultiply` ·
`el()` listener handling · `renderQuizScreen` re-binding · constant-string `innerHTML` ·
settings re-applying theme/motion · `setActiveNav` · `applyMotionPref` ·
`categoryStats` null handling · `bestScore()` across modes · `recentSessions()` ·
`formatTime()` · all 50 seed answers (`60 km`, `28.8`, `31`, `25%`, `12 PM`, `0.03`,
`7/20`, `50 rupees`, …) · `configChanges` orientation handling · no JS→native
`@JavascriptInterface` bridge · APK signature v1+v2+v3 · `setJavaScriptEnabled` /
`setDomStorageEnabled` (required) · `usesCleartextTraffic="false"` · `_origin` field
(harmless, recorded on attempts for future analytics — intentionally kept) ·
`coach.advice` empty state · `frontend/` + `backend/` legacy directories ·
no `package.json` in `pwa/` (buildless by design) · `tests/node_modules` (gitignored).

---

## 5. Test-coverage gaps that the review listed

`tests/pwa.test.mjs` (14 scenarios) covered the happy paths only. A new suite,
**`tests/regressions.test.mjs` (15 scenarios)**, closes every gap that was a real defect:

| Gap | Now covered by |
|---|---|
| 1–2. `submit()` guard, `finish()` guard | `R1`, `R2` |
| 3–5. `pause()`/`quit()` null-safety, timer after `finish()` | `R2`, `R3`, plus e2e 5 & 9 |
| 6. `_origin` never consumed | intentionally retained (documented above) |
| 7–8. `resetAll()`, history cap | `R14`, plus e2e 13 |
| 9. attempts cap | `R14` (seeded, so it does not OOM jsdom) |
| 10–11. unfinished cap, settings defaults | `R5`, plus e2e 10 |
| 12–25. theme cycle, hints per category, SW cache list, manifest icons, SVG-only Continue button, timer stop on navigation, `isActive()`, resume via hash, unknown route fallback, resume with no id, hint stability | existing e2e suite + `R6`, `R7`, `R12`, `R15` |

Run them with:

```bash
cd /home/user/Mental-Maths-Practice-
ln -sfn /home/user/tests/node_modules tests/node_modules   # jsdom lives outside the repo
node tests/pwa.test.mjs            # 14
node tests/regressions.test.mjs    # 15
APP_DIR=/path/to/assets node tests/pwa.test.mjs            # e.g. the APK's extracted assets/
```

---

## 6. Release produced

| Field | Value |
|---|---|
| File | `apk/Mental-Maths-Practice.apk` |
| Size | 519,003 bytes (507 KB) |
| Version | `versionCode 3` · `versionName 1.1.1` |
| Package / SDK | `com.iscsp.mentalmatharena` · minSdk 21 / targetSdk 34 |
| Signature | v1 + v2 + v3, release key SHA-256 `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43` |
| MD5 | `6605300584c4777f3305ce90bde6a0d9` |
| Update behaviour | same key + higher `versionCode` → in-place update, progress kept |
