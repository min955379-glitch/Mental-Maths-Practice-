#!/usr/bin/env bash
# Build the Mental Maths Practice Android APK.
# Prerequisites: JDK 17, Android SDK with platform-34 + build-tools 34.0.0.
#
# Before running this script:
# 1. Make sure the PWA in ../pwa/ is up to date.
# 2. If you don't have a local.properties file, create one with:
#      echo "sdk.dir=/path/to/android-sdk" > local.properties
# 3. Run this script.

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d "app/src/main/assets" ]; then
  echo "ERROR: app/src/main/assets/ is missing. Re-clone the repo or restore the pwa/ folder." >&2
  exit 1
fi

if [ ! -f "local.properties" ]; then
  if [ -z "${ANDROID_HOME:-}" ]; then
    echo "ERROR: Neither local.properties nor ANDROID_HOME is set." >&2
    echo "Either create local.properties with 'sdk.dir=/path/to/android-sdk'" >&2
    echo "or set ANDROID_HOME=/path/to/android-sdk in your environment." >&2
    exit 1
  fi
  echo "sdk.dir=$ANDROID_HOME" > local.properties
fi

# Sync pwa/ -> app/src/main/assets/
echo "Syncing pwa/ into app/src/main/assets/ ..."
rm -rf app/src/main/assets
mkdir -p app/src/main/assets
cp -r ../pwa/. app/src/main/assets/
echo "PWA synced: $(du -sh app/src/main/assets | cut -f1) of assets"

# Build
echo "Building APK..."
if [ -f "./gradlew" ]; then
  ./gradlew assembleRelease
else
  if command -v gradle >/dev/null 2>&1; then
    gradle assembleRelease
  else
    echo "ERROR: No gradlew or gradle in PATH. Install Gradle 8.9+ or use the wrapper." >&2
    exit 1
  fi
fi

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: Build did not produce $APK_PATH" >&2
  exit 1
fi

# Sign with release key (if available)
if [ -f "release.keystore" ]; then
  if ! command -v apksigner >/dev/null 2>&1; then
    if [ -n "${ANDROID_HOME:-}" ]; then
      export PATH="$ANDROID_HOME/build-tools/34.0.0:$PATH"
    fi
  fi
  if command -v apksigner >/dev/null 2>&1; then
    echo "Signing APK..."
    export KS_PASS="${KS_PASS:-mentalmath}"
    export KS_ALIAS="${KS_ALIAS:-iscspmatharena}"
    apksigner sign --ks release.keystore --ks-pass env:KS_PASS --key-pass env:KS_PASS \
      --ks-key-alias "$KS_ALIAS" \
      --out "$APK_PATH.signed.apk" "$APK_PATH"
    cp "$APK_PATH.signed.apk" Mental-Maths-Practice.apk
    echo "Signed APK: Mental-Maths-Practice.apk ($(du -sh Mental-Maths-Practice.apk | cut -f1))"
  else
    cp "$APK_PATH" Mental-Maths-Practice.apk
    echo "Built (unsigned, apksigner not found): Mental-Maths-Practice.apk"
  fi
else
  cp "$APK_PATH" Mental-Maths-Practice.apk
  echo "Built (unsigned, no keystore): Mental-Maths-Practice.apk"
fi

echo ""
echo "Done. Install on your phone with:"
echo "  adb install Mental-Maths-Practice.apk"
