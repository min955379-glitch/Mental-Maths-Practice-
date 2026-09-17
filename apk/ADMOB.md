# Mental Maths Practice — Google AdMob Integration (v1.8.0)

This document describes the AdMob banner + interstitial integration
that ships in v1.8.0 of the Mental Maths Practice Android app.

## Ad Unit IDs

| Slot           | AdMob ID (production)                       |
|----------------|---------------------------------------------|
| **App ID**     | `ca-app-pub-7325835183643107~7880182915`    |
| **Banner**     | `ca-app-pub-7325835183643107/8055889847`    |
| **Interstitial** | `ca-app-pub-7325835183643107/9460857890` |

> The IDs above are baked into `AndroidManifest.xml` (App ID) and
> `com.iscsp.mentalmatharena.AdMobConfig` (unit IDs) by the build
> pipeline, **only when built with `AD_TEST=0`**. The default build
> (`AD_TEST=1`) substitutes Google's official test IDs, so a
> developer's local APK never burns real inventory or counts as
> invalid traffic against the production account.

## Where they are configured

### App ID — `apk/app/src/main/AndroidManifest.xml`
Inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-7325835183643107~7880182915" />
```

(The string is generated from the `ADMOB_APP_ID` shell variable in
`build-offline.sh` at build time — when `AD_TEST=1` it becomes
`ca-app-pub-3940256099942544~3347511713`.)

### Banner / Interstitial Unit IDs — `apk/app/src/main/java/com/iscsp/mentalmatharena/AdMobConfig.java`
This file is **generated** by the build script at build time. It
holds three `public static final String` constants:
`BANNER_AD_UNIT_ID`, `INTERSTITIAL_AD_UNIT_ID`, and `APPLICATION_ID`.
`MainActivity` reads them at class-init.

### JS bridge — `pwa/js/ads.js`
The PWA-side script wires `QuizEngine.Quiz.onFinish` to call
`window.AndroidAdsBridge.showInterstitialIfReady()` so the
interstitial fires only after a real session ends (a natural break).

### Native bridge — `MainActivity$AndroidAdsBridge`
A `JavascriptInterface` that the PWA reaches as
`window.AndroidAdsBridge.showInterstitialIfReady()`. It forwards
to `MainActivity.showInterstitialFromJs()` which runs the
`InterstitialAd.show(...)` call on the UI thread.

## Where the ads appear

| Ad         | Location                                  | Touch policy |
|------------|--------------------------------------------|--------------|
| **Banner** | At the very top of the screen, ABOVE the WebView. Anchored to a small smart-banner sized row in a vertical `LinearLayout`. | Always visible — never covers questions, answers, submit / skip / hint / quit controls, or the WebView's own navigation. |
| **Interstitial** | Full-screen, takes over the window. Fired **only** from `QuizEngine.Quiz.onFinish` — i.e. just after the user reaches the session-completed screen. | Never appears during a question, never appears during navigation between screens the user is actively looking at. |

## Files changed in this integration

```
apk/app/src/main/AndroidManifest.xml                  # AdMob App ID + ACCESS_NETWORK_STATE
apk/app/src/main/java/com/iscsp/mentalmatharena/MainActivity.java
                                                      # LinearLayout + AdView banner + interstitial load/show + JS bridge
apk/app/build.gradle                                  # versionCode 11 -> 12, versionName 1.7.0 -> 1.8.0
apk/build-offline.sh                                  # AdMob jar fetch, AdMobConfig codegen, multidex, signing
apk/fetch-admob-libs.sh                               # standalone Maven jar downloads (no Gradle required)
pwa/index.html                                        # includes pwa/js/ads.js
pwa/js/ads.js                                         # new file — JS bridge hook on quiz.onFinish
```

## Build pipeline (no Gradle required)

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk

# 1. One-time: download the Google Mobile Ads SDK and its transitive
#    closure into build-offline-libs/.
bash apk/fetch-admob-libs.sh

# 2. Build:
#    AD_TEST=1 (default)  -> uses official AdMob TEST IDs
#    AD_TEST=0            -> bakes in your REAL IDs (what is shipped to Uptodown)
bash apk/build-offline.sh          # development/test APK (default)
AD_TEST=0 bash apk/build-offline.sh   # final release/production APK
```

The build also pulls in `pwa/` and embeds it as `assets/` in the
APK. The release APK uses the same `release.keystore` and the same
signing config as v1.7.0 — it will install as an update.

## Multidex

The Google Mobile Ads SDK + its AndroidX / Kotlin runtime closure is
well over the 65,536 single-dex method limit (≈ 103,000 methods). The
build uses `d8 --main-dex-rules` to keep `MainActivity` /
`AdMobConfig` in `classes.dex` and put the rest in `classes2.dex`
+ `classes3.dex`. minSdk = 21 means multidex works natively (no
`androidx.multidex` library install needed at runtime).

## Failure mode policy

| What can go wrong                             | What the app does                                                                      |
|-----------------------------------------------|----------------------------------------------------------------------------------------|
| No internet at app start                       | Banner / interstitial never load; the rest of the app works normally.                 |
| Ad server returns "no fill"                    | `loadAd` callback logs the error; banner row just stays empty. No retry loop.         |
| `InterstitialAd.show()` throws                 | Caught in a `try { ... } catch (Throwable)` block, the slot is freed and reloaded silently. |
| Network disconnects mid-ad                     | SDK handles it; the user can tap the ad's close button to dismiss and continue.        |
| Manifest / metadata corrupted                  | Build pipeline asserts on missing fields via aapt2 link step; APK refuses to build.    |
