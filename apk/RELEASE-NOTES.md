# Mental Maths Practice — release notes

## v1.8.2 — Production AdMob release (2026-09-17)

**File:** `apk/Mental-Maths-Practice.apk` (5.2 MB / 5,413,740 bytes, versionCode 14, versionName 1.8.2)
**MD5:** `c489436bc48e0069253578529a7d2479`
**SHA-256:** `126c34344be316d71119ef650b387919c456d2b1bdfb6afc1aac60cbddb482a4`
**Signed:** v1 + v2 + v3 with the same release key (signer MD5 `efaba7267a95c337ecfaa8b4cb2241c0`,
SHA-256 `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`). Installs as an
in-place update over v1.8.1.
**Requires:** Android 5.0 (API 21)+

### What changed from v1.8.1
- The default Gradle build (`bash apk/build.sh` / `./gradlew assembleRelease`) still
  uses Google's official test ad units (`ca-app-pub-3940256099942544~3347511713`)
  so that any in-place re-build is safe to use for development.
- The production APK shipped in this release was produced with
  `./gradlew assembleRelease -PAD_TEST=0`. That single flag swaps:
  - **App ID** &nbsp; `~`  &nbsp; `ca-app-pub-7325835183643107~7880182915`
  - **Banner ID**  &nbsp; `/`  &nbsp; `ca-app-pub-7325835183643107/8055889847`
  - **Interstitial ID** &nbsp; `/`  &nbsp; `ca-app-pub-7325835183643107/9460857890`
- `versionCode` 13 → **14**; `versionName` "1.8.1" → **"1.8.2"** so the
  package manager installs this over the test build.
- Nothing else changed: same `MainActivity.java`, same `assets/js/ads.js`,
  same Gradle wrapper, same Gradle plugin (AGP 8.5.2), same
  `play-services-ads:23.6.0`, same Gradle build script. The PWA is byte-for-byte
  the same set of files that v1.8.1 ships.

### Ad format count
Source / Java imports used by the app:
```
com.google.android.gms.ads.AdRequest
com.google.android.gms.ads.AdView
com.google.android.gms.ads.AdSize.SMART_BANNER
com.google.android.gms.ads.FullScreenContentCallback
com.google.android.gms.ads.LoadAdError
com.google.android.gms.ads.MobileAds
com.google.android.gms.ads.initialization.InitializationStatus
com.google.android.gms.ads.initialization.OnInitializationCompleteListener
com.google.android.gms.ads.interstitial.InterstitialAd
com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
```
**Only Banner + Interstitial.** No `RewardedAd`, no `NativeAd` /
`NativeAdView`, no `AppOpenAd`, no `AdManager*` (Ad Exchange) classes
imported. The PWA bridge exposes one method, `showInterstitialIfReady()`,
which the engine guards by watching for the results screen element
(see `pwa/js/ads.js`).

### Static verification of THIS APK
- `aapt2 dump xmltree AndroidManifest.xml`:
  - `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
                android:value="ca-app-pub-7325835183643107~7880182915"/>`
  - `<provider android:name="com.google.android.gms.ads.MobileAdsInitProvider"/>`
  - `<activity android:name="com.google.android.gms.ads.AdActivity"/>`
  - `<provider android:name="androidx.startup.InitializationProvider"/>`
  - meta-data `com.google.android.gms.version`
  - `<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>`
- `dexdump | grep ca-app-pub-3940256099942544` → **0 matches in any
  classes*.dex** (test banner / interstitial / app id absent).
- `dexdump | grep ca-app-pub-7325835183643107` → exactly the two
  expected values: `…/8055889847` (banner) and `…/9460857890` (interstitial).
- `apksigner verify`: v1, v2 and v3 all `true`; one signer, cert SHA-256
  `2d7470c4a5239d5df72090f5b0329b99efd394a305c54464b2800cb1ae129d43`.

### Functional verification of the PWA that ships inside this APK
- 9/9 PASS in `tests/admob_check.py`:
  1. PWA works with no `AndroidAdsBridge` present.
  2. Browsing dashboard / categories / settings / contact / stats requests **no** ad.
  3. A full 10-question quiz answers correctly.
  4. **No** ad requested during answering.
  5. Exactly **one** interstitial request fires.
  6. That request fires only on the `result-screen`.
  7. No further requests while the user stays on the results screen.
  8. No page errors anywhere.
  9. Bridge installs in the bridge-present configuration.
- 188/189 PASS in the jsdom suite (the single failing test is the
  pre-existing `css-layout` "WhatsApp button is a full-width,
  easy-to-tap control on phones" assertion that has been broken on
  every release since v1.6.0 and is unrelated to AdMob).

### Not verified in this sandbox
- **Real device launch.** This environment has no `/dev/kvm` and no
  attached Android device, so `adb install` + `logcat` was not run.
  The launch path is the same Gradle output as v1.8.1, which the user
  confirmed launches and reaches the main screen. The static
  verification above is the strongest evidence available here.

---

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
