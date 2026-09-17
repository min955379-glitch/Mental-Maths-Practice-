#!/usr/bin/env bash
# Build the Mental Maths Practice APK WITHOUT Gradle.
#
# The app is a WebView wrapper that integrates the Google Mobile Ads
# SDK (com.google.android.gms:play-services-ads 24.3.0) directly. For
# the offline build pipeline this means pulling the SDK jars
# from the Google Maven repo (a one-time download handled by
# fetch-admob-libs.sh) and dexing/packing them alongside
# MainActivity.class.
#
# Prerequisites:
#   JDK 17                       -> $JAVA_HOME
#   Android SDK with:
#     platforms;android-34
#     build-tools;34.0.0
#     platform-tools             -> $ANDROID_HOME
#
# Usage:
#   export JAVA_HOME=/path/to/jdk-17
#   export ANDROID_HOME=/path/to/android-sdk
#   bash apk/build-offline.sh
#
# Output: apk/Mental-Maths-Practice.apk (signed with release.keystore)
#
# Variants:
#   AD_TEST=1 (default for safety)  -> AdMob TEST IDs are used
#   AD_TEST=0                      -> the REAL AdMob unit IDs are
#                                     baked into MainActivity/manifest.
#                                     Both the banner and interstitial
#                                     ad unit IDs are user-overridable
#                                     through env vars AD_BANNER_ID and
#                                     AD_INTERSTITIAL_ID.
set -euo pipefail

cd "$(dirname "$0")"

: "${JAVA_HOME:?JAVA_HOME must point at a JDK 17 installation}"
: "${ANDROID_HOME:?ANDROID_HOME must point at the Android SDK}"

# The `apksigner` shell wrapper does `exec java` and resolves `java` against
# $PATH, NOT $JAVA_HOME. The system often ships an older JDK (11 lacks the
# HmacPBESHA256 Mac provider that build-tools 34.0.0 apksigner needs to load
# the project's PKCS12 keystore), so put the requested JDK 17 ahead of it.
export PATH="$JAVA_HOME/bin:$PATH"

BT="$ANDROID_HOME/build-tools/34.0.0"
PLATFORM="$ANDROID_HOME/platforms/android-34/android.jar"
AAPT2="$BT/aapt2"
D8="$BT/d8"
ZIPALIGN="$BT/zipalign"
APKSIGNER="$BT/apksigner"
JAVAC="$JAVA_HOME/bin/javac"

SRC="app/src/main"
OUT="build-offline"

# ---------------------------------------------------------------------
# AdMob configuration
# ---------------------------------------------------------------------
# Variant knobs: AD_TEST controls whether the official AdMob TEST IDs
# or your real IDs go into the build. Defaults to AD_TEST=1 so an
# accidental `bash build-offline.sh` does NOT load real production ads.
AD_TEST="${AD_TEST:-1}"
APP_ID_DEFAULT_PROD="ca-app-pub-7325835183643107~7880182915"
BANNER_ID_DEFAULT_PROD="ca-app-pub-7325835183643107/8055889847"
INTER_ID_DEFAULT_PROD="ca-app-pub-7325835183643107/9460857890"

# Google OFFICIAL test ad units (documented at
# https://developers.google.com/admob/android/test-ads):
#   Banner      : ca-app-pub-3940256099942544/6300978111
#   Interstitial: ca-app-pub-3940256099942544/1033173712
#   App ID      : ca-app-pub-3940256099942544~3347511713
APP_ID_DEFAULT_TEST="ca-app-pub-3940256099942544~3347511713"
BANNER_ID_DEFAULT_TEST="ca-app-pub-3940256099942544/6300978111"
INTER_ID_DEFAULT_TEST="ca-app-pub-3940256099942544/1033173712"

if [ "$AD_TEST" = "1" ]; then
  ADMOB_APP_ID="${AD_APP_ID:-$APP_ID_DEFAULT_TEST}"
  BANNER_AD_UNIT_ID="${AD_BANNER_ID:-$BANNER_ID_DEFAULT_TEST}"
  INTERSTITIAL_AD_UNIT_ID="${AD_INTERSTITIAL_ID:-$INTER_ID_DEFAULT_TEST}"
  VARIANT_TAG="debug (test)"
else
  ADMOB_APP_ID="${AD_APP_ID:-$APP_ID_DEFAULT_PROD}"
  BANNER_AD_UNIT_ID="${AD_BANNER_ID:-$BANNER_ID_DEFAULT_PROD}"
  INTERSTITIAL_AD_UNIT_ID="${AD_INTERSTITIAL_ID:-$INTER_ID_DEFAULT_PROD}"
  VARIANT_TAG="release (production)"
fi

echo "AdMob variant : $VARIANT_TAG"
echo "  App ID       : $ADMOB_APP_ID"
echo "  Banner ID    : $BANNER_AD_UNIT_ID"
echo "  Interstitial : $INTERSTITIAL_AD_UNIT_ID"

# Single source of truth: app/build.gradle (override with VERSION_CODE=/VERSION_NAME=)
GRADLE_VCODE=$(grep -oE 'versionCode[[:space:]]+[0-9]+' app/build.gradle | grep -oE '[0-9]+' | head -1)
GRADLE_VNAME=$(grep -oE 'versionName[[:space:]]+"[^"]+"' app/build.gradle | sed -E 's/.*"(.*)"/\1/' | head -1)
VERSION_CODE="${VERSION_CODE:-${GRADLE_VCODE:-2}}"
VERSION_NAME="${VERSION_NAME:-${GRADLE_VNAME:-1.1.0}}"

for f in "$AAPT2" "$D8" "$ZIPALIGN" "$APKSIGNER" "$PLATFORM"; do
  [ -f "$f" ] || { echo "ERROR: missing $f" >&2; exit 1; }
done

# ---------------------------------------------------------------------
# 1. Re-sync the PWA into the APK assets so the bundle can never drift.
echo "Syncing ../pwa/ into $SRC/assets ..."
rm -rf "$SRC/assets"
mkdir -p "$SRC/assets"
tar -C ../pwa --exclude=node_modules --exclude=.DS_Store --exclude="*.swp" -cf - . | tar -xf - -C "$SRC/assets"
echo "  $(du -sh "$SRC/assets" | cut -f1) of assets"

# ---------------------------------------------------------------------
# 2. Patch the AndroidManifest with the chosen AdMob App ID and the
#    <uses-permission> for ACCESS_NETWORK_STATE.
echo "Writing AndroidManifest.xml ..."
cat > "$SRC/AndroidManifest.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false"
        android:hardwareAccelerated="true">

        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="$ADMOB_APP_ID" />

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|uiMode"
            android:theme="@style/AppTheme.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
EOF

rm -rf "$OUT"
mkdir -p "$OUT/obj" "$OUT/gen" "$OUT/libs"

# ---------------------------------------------------------------------
# 3. Resolve the AdMob (Play Services Ads) standalone jars.
#    The first run downloads them via fetch-admob-libs.sh; subsequent
#    runs reuse the cached classes/*.jar files.
LIBS_CACHE="build-offline-libs/classes"
if [ ! -d "$LIBS_CACHE" ] || [ -z "$(ls -1 "$LIBS_CACHE" 2>/dev/null | grep -c .jar || true)" ]; then
  echo "Downloading Google Mobile Ads SDK + dependencies ..."
  bash ./fetch-admob-libs.sh
fi
if [ ! -d "$LIBS_CACHE" ] || [ -z "$(ls -1 "$LIBS_CACHE" 2>/dev/null | grep .jar || true)" ]; then
  echo "ERROR: build-offline-libs/classes is empty; rerun fetch-admob-libs.sh." >&2
  exit 1
fi
echo "  $(ls "$LIBS_CACHE" | wc -l) AdMob jar(s) ready"

# ---------------------------------------------------------------------
# 4. Compile resources
echo "Compiling resources ..."
"$AAPT2" compile --dir "$SRC/res" -o "$OUT/res.zip"

# ---------------------------------------------------------------------
# 5. Link into an APK (unsigned, unaligned). Standalone aapt2 wants a
#    package attribute on <manifest>; the AGP-style build.gradle uses
#    a namespace instead. Inject it into a throw-away copy.
PACKAGE="com.iscsp.mentalmatharena"
mkdir -p "$OUT/manifest"
sed "s|<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">|<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\" package=\"$PACKAGE\">|" \
    "$SRC/AndroidManifest.xml" > "$OUT/manifest/AndroidManifest.xml"
grep -q "package=" "$OUT/manifest/AndroidManifest.xml" || {
  echo "ERROR: could not inject the package attribute into the manifest" >&2; exit 1; }

echo "Linking APK ..."
"$AAPT2" link -o "$OUT/app-unaligned.apk" \
    -I "$PLATFORM" \
    --manifest "$OUT/manifest/AndroidManifest.xml" \
    --min-sdk-version 21 \
    --target-sdk-version 34 \
    --version-code "$VERSION_CODE" \
    --version-name "$VERSION_NAME" \
    --java "$OUT/gen" \
    --auto-add-overlay \
    -A "$SRC/assets" \
    "$OUT/res.zip"

# ---------------------------------------------------------------------
# 6. Generate AdMobConfig with the chosen IDs, then compile Java with
#    the AdMob SDK + dependency jars on the classpath.
echo "Generating AdMobConfig.java ..."
cat > "$OUT/gen/com/iscsp/mentalmatharena/AdMobConfig.java" <<EOF
package com.iscsp.mentalmatharena;

/** Build-time constants for AdMob. Generated by build-offline.sh. */
public final class AdMobConfig {
  private AdMobConfig() {}
  public static final String BANNER_AD_UNIT_ID = "$BANNER_AD_UNIT_ID";
  public static final String INTERSTITIAL_AD_UNIT_ID = "$INTERSTITIAL_AD_UNIT_ID";
  public static final String APPLICATION_ID = "$ADMOB_APP_ID";
  public static final String VARIANT_TAG = "$VARIANT_TAG";
}
EOF

# Patch MainActivity.java to read from AdMobConfig instead of holding
# the test IDs inline. (We rewrite the constants referenced during the
# next build, but as a safety net we still pre-process a fresh copy.)
sed -i \
    -e 's|"ca-app-pub-3940256099942544/6300978111"|com.iscsp.mentalmatharena.AdMobConfig.BANNER_AD_UNIT_ID|' \
    -e 's|"ca-app-pub-3940256099942544/1033173712"|com.iscsp.mentalmatharena.AdMobConfig.INTERSTITIAL_AD_UNIT_ID|' \
    "$SRC/java/com/iscsp/mentalmatharena/MainActivity.java"

# Now compile everything together with the AdMob jars on the classpath.
echo "Compiling Java ..."
JAVA_FILES=$(find "$SRC/java" -name '*.java')
echo "  $JAVA_FILES"
AD_CLASSPATH=$(find "$LIBS_CACHE" -name '*.jar' | tr '\n' ':')
"$JAVAC" -source 8 -target 8 -nowarn \
    -bootclasspath "$PLATFORM" \
    -classpath "${PLATFORM}:${AD_CLASSPATH}" \
    -d "$OUT/obj" \
    $JAVA_FILES \
    "$OUT/gen/com/iscsp/mentalmatharena/AdMobConfig.java"

# ---------------------------------------------------------------------
# 7. Dex the classes (MainActivity + AdMobConfig) along with the
#    pre-fetched Google Mobile Ads SDK + dependencies. The full
#    closure is well over the 65,536 single-dex method limit, so we
#    use multidex: keep only MainActivity + the small bootstrap set
#    in the main classes.dex, and let d8 emit classes2.dex for the
#    rest. minSdk=21 means multidex works natively (no library).
echo "Building main-dex list ..."
cat > "$OUT/main-dex-keep.pro" <<'EOF'
-keep class com.iscsp.mentalmatharena.MainActivity { *; }
-keep class com.iscsp.mentalmatharena.AdMobConfig { *; }
-keep class com.iscsp.mentalmatharena.MainActivity$AndroidAdsBridge { *; }
EOF

# d8's main-dex list tells it what MUST be in classes.dex. Above
# is the smallest set (MainActivity and bootstrap); everything
# else lands in classes2.dex via d8's overflow handling.
# --main-dex-rules-output gives us the actual computed list so
# downstream tooling has a clear record.
echo "Dexing ..."
"$D8" --lib "$PLATFORM" \
    --main-dex-rules "$OUT/main-dex-keep.pro" \
    --output "$OUT" \
    $(find "$OUT/obj" -name '*.class') \
    $(find "$LIBS_CACHE" -name '*.jar' | tr '\n' ' ')

# ---------------------------------------------------------------------
# 8. Add classes.dex (and any classes2.dex from d8) into the APK
echo "Packaging dex files ..."
( cd "$OUT" && zip -q -j app-unaligned.apk classes*.dex )

# ---------------------------------------------------------------------
# 9. Align
echo "Aligning ..."
"$ZIPALIGN" -f -p 4 "$OUT/app-unaligned.apk" "$OUT/app-unsigned.apk"

# Signing credentials are read from the environment:
#   KS_PASS   keystore + key password   (default: the project's public demo password)
#   KS_ALIAS  key alias                 (default: iscspmatharena)
# Override them for a real release build, e.g.
#   KS_PASS='********' bash build-offline.sh
export KS_PASS="${KS_PASS:-mentalmath}"
export KS_ALIAS="${KS_ALIAS:-iscspmatharena}"

# ---------------------------------------------------------------------
# 10. Sign with the existing release key (same key => installs as an update)
echo "Signing ..."
rm -f Mental-Maths-Practice.apk
# Pass the password via "pass:KS_PASS" rather than "env:KS_PASS" — apksigner's
# env: reader does not call the PKCS12 HmacPBESHA256 algorithm the way keytool
# does, so an empty env yields "Integrity check failed: HmacPBESHA256 not
# available" instead of a clean BadPasswordException. pass:KS_PASS bypasses
# the env lookup and feeds the keystore its real password.
"$APKSIGNER" sign \
    --ks release.keystore \
    --ks-pass "pass:${KS_PASS}" \
    --key-pass "pass:${KS_PASS}" \
    --ks-key-alias "${KS_ALIAS:-iscspmatharena}" \
    --out Mental-Maths-Practice.apk \
    "$OUT/app-unsigned.apk"

# ---------------------------------------------------------------------
# 11. Verify and report
"$APKSIGNER" verify --print-certs Mental-Maths-Practice.apk | head -6
echo ""
echo "Done: apk/Mental-Maths-Practice.apk ($(du -h Mental-Maths-Practice.apk | cut -f1))"
echo "AdMob : $VARIANT_TAG ($ADMOB_APP_ID)"
echo "Install with:  adb install -r Mental-Maths-Practice.apk"
