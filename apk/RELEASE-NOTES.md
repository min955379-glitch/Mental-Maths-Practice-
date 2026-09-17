# Mental Maths Practice — release notes

## v1.8.1 — Launch-crash fix (2026-09-17)

**File:** `apk/Mental-Maths-Practice.apk` (5.2 MB / 5,413,740 bytes, versionCode 13, versionName 1.8.1)
**MD5:** `090335ae1dc9f63505caf8a7a64d4c3a`
**SHA-256:** `25ed768c8d3b4d6565fb384ec3b6d85f41a66ba34f24706059c88db8cad114ec`
**Signed:** v1 + v2 + v3 with the same release key (signer MD5 `efaba7267a95c337ecfaa8b4cb2241c0`) — installs as an in-place update and keeps your data.
**Requires:** Android 5.0 (API 21)+

### The bug
v1.8.0 compiled and installed, but died before the first frame. Root cause:
it was packaged by `build-offline.sh`, which unzips the Google Mobile Ads and
AndroidX AARs and dexes **only** `classes.jar`. Three things an AAR needs were
never produced:

| Missing | Evidence in the shipped 6.1 MB APK |
|---|---|
| AAR resources | `resources.arsc` was 2.6 KB (app resources only); `integer/google_play_services_version`, `layout/admob_empty_layout` absent |
| Library R classes | **46 missing**, e.g. `com.google.android.gms.ads.R$layout`, `androidx.core.R$string`, `androidx.browser.R$string` |
| AAR manifests | no `com.google.android.gms.version`, no `AD_ID` permission |

A static scan of the shipped dex files found **146 referenced types that were
not defined anywhere in the APK**. The first AAR class to touch its own R
class threw `NoClassDefFoundError` inside `MainActivity.onCreate()`.

### The fix
Build with the project's existing Gradle build (`bash apk/build.sh`), which
resolves `com.google.android.gms:play-services-ads` from Google's Maven
repository and merges resources, generates every R class, and merges
manifests. Same scan on v1.8.1: **0 missing R classes**, and the only
unresolved types are framework/annotation ones (`org.xmlpull.v1`,
`libcore.io`, source-retention annotations, Room's optional paging).

Also fixed along the way:
- **minSdk** — `play-services-ads` 24.x requires API 23; the app supports 21,
  so the SDK is pinned to **23.6.0** (newest line that supports 21).
- **Unused dependencies** — appcompat / material / androidx.webkit were
  declared but unused (the theme is the platform
  `android:Theme.Material.Light.NoActionBar`); removing them took tens of
  thousands of dead classes out of the build.
- **`androidx.activity`** pinned to 1.9.3 — the ads SDK pins 1.0.0, which
  predates `androidx.activity.result` (referenced by code in the closure).
- **The interstitial never fired.** `pwa/js/ads.js` wrapped
  `QuizEngine.Quiz.onFinish`, but `renderQuizScreen()` re-assigns that
  callback on every question, discarding the wrapper. It now watches for the
  results screen instead.
- **`build-offline.sh`** now refuses to run, so a broken ads APK cannot be
  produced again.

### Default build uses TEST ads
`bash build.sh` bakes in Google's official test ad units
(`ca-app-pub-3940256099942544~3347511713`). Build production with
`bash build.sh -PAD_TEST=0`.

### Verified
- 189/189 jsdom tests (ten suites) — unchanged.
- New `tests/admob_check.py` **9/9** against the assets extracted from this
  APK: the PWA works with no native bridge, browsing requests no ad, no ad
  while answering, and exactly one interstitial request on the results
  screen.
- `apksigner verify` passes (v1 + v2 + v3, same release key).
- Banner is a row **above** the WebView in a vertical `LinearLayout`, so it
  cannot overlap questions or controls.

---


## v1.7.0 — Seven Approved Categories Only (2026-09-16)

The question bank has been narrowed to the seven categories the project
approves for syllabus-aligned arithmetic practice:

1. **Speed** — speed / distance / time, km/h math
2. **Percentage** — percent of a number, reverse percentages, % discount
3. **Dozen** — convert dozens to items, per-dozen pricing, mixed counts
4. **Area** — squares, rectangles, triangles, semicircles (π = 22/7)
5. **DMAS Rule** — division / multiplication / addition / subtraction, brackets
6. **Zakat (2.5%)** — dividing the eligible amount by 40
7. **Profit and Loss** — percentages of the cost price

**Bank spec**
- 350 questions (50 per category)
- Difficulty: **Easy / Moderate / Hard** (the v1.6.0 ``Medium`` and
  ``Expert`` tiers have been merged into Easy / Moderate / Hard)
- All shipped math uses the proper Unicode symbols ``+ − × ÷`` (no
  ASCII ``*``)
- Independent verifier (`tools/question_bank_v3/verify.py`) reports
  ``350 verified, 0 failures``

**Other changes**
- New generator (`pwa/js/generator.js`) covers all seven categories,
  unlimited replenishment at runtime.
- Hint library (`pwa/js/hints.js`) extended with question-specific
  guidance for every approved category.
- UI chooser now offers **Easy / Moderate / Hard**, with **Mixed** still
  one tap away.
- Builder pipeline (`tools/question_bank_v3/build.py`) emits the bank
  file and syncs the runtime assets into the APK.

**APK**
- File: `apk/Mental-Maths-Practice.apk`
- Size: 167 KB (166,954 bytes)
- MD5:  ``71816c86653fef07d83449de12e1a014``
- versionCode: 11
- versionName: 1.7.0
- Signed v1+v2+v3 with the project release key (SHA-256
  ``2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43``).

**Tests**
- 176 / 176 PASS across the 9 JS suites
  (regressions 15 / pwa 14 / quiz-actions 6 / skip-question 15 /
   select-component 26 / theme-contrast 52 / timer-discard 19 /
   contact-us 14 / content-difficulty 15).

**Install**
```
adb install -r Mental-Maths-Practice.apk
```
or sideload by copying the APK to the device and tapping it.

## v1.6.0 — build + test reliability, the APK ships the verified bank (2026-09-15)

- Fixed offline build path so apksigner is on PATH.
- PWA test suite rewritten to drive the real application; 9 suites green.
- The v1.5.0 release button fix (Skip costs nothing, comes back at the end)
  is preserved.

## v1.5.0 — Skip question

- The Skip button is now free; the question comes back at the end of the
  session so the user can pick it up if they want.

## v1.4.0 and earlier

See the git history.
