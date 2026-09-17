# Mental Maths Practice — Google AdMob Integration (v1.8.1)

> **Build with Gradle: `bash apk/build.sh`.**
> `apk/build-offline.sh` can no longer build this app — see
> [Why the v1.8.0 APK crashed on launch](#why-the-v180-apk-crashed-on-launch).

## Why the v1.8.0 APK crashed on launch

v1.8.0 was packaged by `build-offline.sh`, which downloads the Google
Mobile Ads AARs, extracts **only** `classes.jar` from each one and dexes
them. Three things an AAR needs were therefore never produced:

| Missing step | Consequence in the shipped APK |
|---|---|
| AAR **resources** never merged | `resources.arsc` was 2.6 KB — the app's own resources only. `integer/google_play_services_version`, `layout/admob_empty_layout`, `drawable/admob_close_button_*` were all absent |
| Library **R classes** never generated | **46 R classes missing**, including `com.google.android.gms.ads.R$layout`, `androidx.core.R$string`, `androidx.browser.R$string`, `androidx.work.R$bool` |
| AAR **manifests** never merged | no `com.google.android.gms.version` meta-data, no `com.google.android.gms.permission.AD_ID`, no `androidx.startup` providers |

Static analysis of the shipped `classes.dex` found **146 referenced
types that were not defined anywhere in the APK**. The first AAR class
that touched its own R class threw
`NoClassDefFoundError: Failed resolution of: Landroidx/core/R$string;`
during `MainActivity.onCreate()` — so the process died before the first
frame. The dependency list was also incomplete (appcompat, recyclerview,
transition, paging, `androidx.activity.result` were referenced but never
fetched).

**Fix:** build with Gradle and let it resolve
`com.google.android.gms:play-services-ads` from Google's Maven
repository. Gradle merges the resources, generates every R class and
merges the manifests. Re-running the same analysis on the v1.8.1 APK
gives **0 missing R classes** and **13 missing types, all of them
benign** (framework `org.xmlpull.v1` / `libcore.io`, source-retention
annotations, and Room's optional `androidx.paging` integration).

Two related problems were found and fixed at the same time:

* **minSdk** — `play-services-ads` 24.x declares `minSdk 23`. The app
  supports 21, so the pinned version is **23.6.0**, the newest line that
  still supports 21. (Moving to 24.x means dropping Android 5.0/5.1.)
* **Unused dependencies** — appcompat, material and androidx.webkit were
  declared but nothing in the app uses them (the theme is the platform
  `android:Theme.Material.Light.NoActionBar`). They were removed, which
  took tens of thousands of dead classes out of the build.

This document describes the AdMob banner + interstitial integration
that ships in the Mental Maths Practice Android app (fixed in v1.8.1).

## Ad Unit IDs

| Slot           | AdMob ID (production)                       |
|----------------|---------------------------------------------|
| **App ID**     | `ca-app-pub-7325835183643107~7880182915`    |
| **Banner**     | `ca-app-pub-7325835183643107/8055889847`    |
| **Interstitial** | `ca-app-pub-7325835183643107/9460857890` |

> The IDs are switched in **one place**: `apk/app/build.gradle`. A
> default build uses Google's official **test** IDs, so a developer's
> local APK never burns real inventory or counts as invalid traffic
> against the production account. Build the production variant with
> `-PAD_TEST=0` (see [Building](#building) below).

## Where they are configured

### App ID — `apk/app/src/main/AndroidManifest.xml`
Inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="${ADMOB_APP_ID}" />
```

Gradle substitutes the placeholder from `app/build.gradle`
(`manifestPlaceholders`), so the App ID and the ad unit IDs can never
drift apart.

### Banner / Interstitial Unit IDs — `apk/app/src/main/java/com/iscsp/mentalmatharena/AdMobConfig.java`
A real source file in the app (it used to be generated into the offline
build directory, which meant a Gradle build could not compile it). It
reads the values Gradle writes into `BuildConfig`:

```java
public static final String BANNER_AD_UNIT_ID = BuildConfig.AD_BANNER_ID;
public static final String INTERSTITIAL_AD_UNIT_ID = BuildConfig.AD_INTERSTITIAL_ID;
```

`MainActivity` reads them at class-init.

### JS bridge — `pwa/js/ads.js`
The PWA-side script watches for the **results screen** to appear and
then calls `window.AndroidAdsBridge.showInterstitialIfReady()`, so the
interstitial fires only after a real session ends (a natural break).

> It used to wrap `QuizEngine.Quiz.onFinish`, but `renderQuizScreen()`
> re-assigns that callback on every question, which silently threw the
> wrapper away — the interstitial never fired at all. Watching for the
> results screen is stable and independent of engine internals.
> `tests/admob_check.py` proves it: exactly one request, on the results
> screen, and none while answering.

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
apk/app/src/main/AndroidManifest.xml                  # AdMob App ID (Gradle placeholder) + ACCESS_NETWORK_STATE
apk/app/src/main/java/com/iscsp/mentalmatharena/MainActivity.java
                                                      # LinearLayout + AdView banner + interstitial load/show + JS bridge
apk/app/src/main/java/com/iscsp/mentalmatharena/AdMobConfig.java
                                                      # real source file, reads BuildConfig
apk/app/build.gradle                                  # play-services-ads 23.6.0, AdMob variant switch, v13 / 1.8.1
apk/build-offline.sh                                  # now refuses to run (cannot merge AAR resources)
pwa/index.html                                        # includes pwa/js/ads.js
pwa/js/ads.js                                         # JS bridge, fires on the results screen
tests/admob_check.py                                  # proves when the interstitial is (and is not) requested
```

## Building

Gradle (AGP 8.5.2 / Gradle wrapper 8.7) resolves `play-services-ads`
from Google's Maven repository, merges every AAR resource, generates
every library R class and merges the manifests.

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk

cd apk

# Test APK — Google's official TEST ad units (default, safe to install)
bash build.sh

# Production APK — your real ad units
bash build.sh -PAD_TEST=0     # or: ./gradlew assembleRelease -PAD_TEST=0
```

Output: `apk/Mental-Maths-Practice.apk`, signed with the release key
(v1 + v2 + v3).

`apk/build-offline.sh` now refuses to run: dexing the AARs' `classes.jar`
without merging their resources and generating their R classes is
exactly what produced the v1.8.0 APK that crashed on launch.

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
