# ISCSP Mental Math AI Arena — Android APK

The Android APK at `ISCSP-Mental-Math-Arena.apk` is a **fully self-contained
native Android app** that bundles the PWA in its `assets/` folder. The PWA
loads from `file:///android_asset/index.html`, which means:

- **No internet is required** to run the app
- **No external host** is required
- **GitHub Pages is not required**
- The app works the moment you install it

## What's in the box

| File | Description |
|---|---|
| `ISCSP-Mental-Math-Arena.apk` | **The signed, installable Android APK (~4.6 MB)** |
| `app/` | Android Studio project (Java + WebView) |
| `app/src/main/assets/` | The bundled PWA (mirror of `../pwa/`) |
| `app/src/main/java/.../MainActivity.java` | WebView wrapper that loads the PWA |
| `build.gradle`, `settings.gradle`, etc. | Gradle build files |
| `gradle/wrapper/` | Gradle wrapper |
| `release.keystore` | Signing key — **back this up!** |
| `build.sh` | One-command rebuild script |

## How to install the APK

1. Copy `ISCSP-Mental-Math-Arena.apk` to your Android phone (USB, email,
   cloud drive, AirDroid, etc.).
2. Open the file. Android will prompt you to allow installation from
   "unknown sources" — allow it for this file.
3. Tap "Install". The app appears in your launcher as **ISCSP Mental Math**
   with the ISCSP icon.
4. Open the app — it launches into the Mental Math Arena immediately,
   no network required.

## How the app works (architecture)

```
Android (WebView) → file:///android_asset/index.html → PWA loads fully
```

The Android app is a minimal `WebView` wrapper:
- A single Java activity (`MainActivity.java`) that creates a `WebView`
- The `WebView` loads `file:///android_asset/index.html` (the PWA entry)
- The PWA's HTML, CSS, JS, icons, service worker, etc. all live in
  `app/src/main/assets/` — bundled inside the APK
- JavaScript and DOM storage are enabled so the PWA can run normally
- `localStorage` works as usual — your progress and stats persist across
  app launches
- The service worker registers and caches the rest of the assets
- No network is needed after install

## How to rebuild

### Prerequisites

- JDK 17 (or newer 11+)
- Android SDK with:
  - `platforms;android-34`
  - `build-tools;34.0.0`
  - `platform-tools`
- `apksigner` (part of build-tools) — only needed to re-sign

### One-command build

```bash
cd apk
echo "sdk.dir=$ANDROID_HOME" > local.properties   # or your SDK path
bash build.sh
```

This produces a fresh `ISCSP-Mental-Math-Arena.apk`.

### Manual build

```bash
# Sync the PWA
rm -rf app/src/main/assets
mkdir -p app/src/main/assets
cp -r ../pwa/. app/src/main/assets/

# Build
gradle assembleRelease    # or: ./gradlew assembleRelease

# Sign
apksigner sign \
  --ks release.keystore --ks-pass pass:mentalmath --key-pass pass:mentalmath \
  --ks-key-alias iscspmatharena \
  --out app/build/outputs/apk/release/app-release-signed.apk \
  app/build/outputs/apk/release/app-release.apk

cp app/build/outputs/apk/release/app-release-signed.apk ISCSP-Mental-Math-Arena.apk
```

## Customizing

To update the PWA content:
1. Edit files in `../pwa/`
2. Run `bash build.sh` — it auto-syncs the PWA into the APK assets

To rebrand:
- Edit `app/src/main/res/values/strings.xml` (app name)
- Replace `app/src/main/res/mipmap-*/ic_launcher.png` (icons)
- Edit `app/src/main/java/.../MainActivity.java` (status bar color)

To re-sign with a new key:
```bash
keytool -genkey -v -keystore release.keystore -alias iscspmatharena \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_PASS -keypass YOUR_PASS \
  -dname "CN=Your Name, O=Your Org, C=PK"
# Then rebuild + re-sign
```

## Why a WebView wrapper, not a TWA?

The earlier version of this project used a **Trusted Web Activity (TWA)**
to point the APK at a hosted PWA. That approach broke when the host
(`raw.githubusercontent.com`) didn't serve the PWA as a navigable website —
the app would open to a "404 Not Found" page.

A native WebView wrapper is more reliable:
- No external host dependency
- Works fully offline
- Loads instantly (no DNS, no TLS handshake)
- Smaller attack surface
- Simpler to ship and debug
- Standard Android components, easy to understand

The PWA inside is unchanged — it still has every feature, every question,
every pattern, every mode.
