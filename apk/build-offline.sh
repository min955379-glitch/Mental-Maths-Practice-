#!/usr/bin/env bash
# Build the Mental Maths Practice APK WITHOUT Gradle.
#
# The app is a plain WebView wrapper: MainActivity.java only imports
# android.* / android.webkit.* classes, so it has no third-party
# dependencies. That means the APK can be produced directly with the
# Android SDK tools (aapt2 + javac + d8 + zipalign + apksigner), which is
# useful on machines where Gradle cannot download its plugins.
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
set -euo pipefail

cd "$(dirname "$0")"

: "${JAVA_HOME:?JAVA_HOME must point at a JDK 17 installation}"
: "${ANDROID_HOME:?ANDROID_HOME must point at the Android SDK}"

BT="$ANDROID_HOME/build-tools/34.0.0"
PLATFORM="$ANDROID_HOME/platforms/android-34/android.jar"
AAPT2="$BT/aapt2"
D8="$BT/d8"
ZIPALIGN="$BT/zipalign"
APKSIGNER="$BT/apksigner"
JAVAC="$JAVA_HOME/bin/javac"

SRC="app/src/main"
OUT="build-offline"
# Single source of truth: app/build.gradle (override with VERSION_CODE=/VERSION_NAME=)
GRADLE_VCODE=$(grep -oE 'versionCode[[:space:]]+[0-9]+' app/build.gradle | grep -oE '[0-9]+' | head -1)
GRADLE_VNAME=$(grep -oE 'versionName[[:space:]]+"[^"]+"' app/build.gradle | sed -E 's/.*"(.*)"/\1/' | head -1)
VERSION_CODE="${VERSION_CODE:-${GRADLE_VCODE:-2}}"
VERSION_NAME="${VERSION_NAME:-${GRADLE_VNAME:-1.1.0}}"

for f in "$AAPT2" "$D8" "$ZIPALIGN" "$APKSIGNER" "$PLATFORM"; do
  [ -f "$f" ] || { echo "ERROR: missing $f" >&2; exit 1; }
done

# 1. Re-sync the PWA into the APK assets so the bundle can never drift.
echo "Syncing ../pwa/ into $SRC/assets ..."
rm -rf "$SRC/assets"
mkdir -p "$SRC/assets"
rm -rf "$SRC/assets"
mkdir -p "$SRC/assets"
tar -C ../pwa --exclude=node_modules --exclude=.DS_Store --exclude="*.swp" -cf - . | tar -xf - -C "$SRC/assets"
echo "  $(du -sh "$SRC/assets" | cut -f1) of assets"

rm -rf "$OUT"
mkdir -p "$OUT/obj" "$OUT/gen"

# 2. Compile resources
echo "Compiling resources ..."
"$AAPT2" compile --dir "$SRC/res" -o "$OUT/res.zip"

# 3. Link into an APK (unsigned, unaligned)
#    The project uses the AGP-style `namespace` in build.gradle instead of a
#    `package` attribute on <manifest>; standalone aapt2 still wants one, so
#    inject it into a throw-away copy (the real manifest is left untouched).
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

# 4. Compile Java -> class files
echo "Compiling Java ..."
find "$SRC/java" -name '*.java' > "$OUT/sources.txt"
# shellcheck disable=SC2046
"$JAVAC" -source 8 -target 8 -nowarn \
  -bootclasspath "$PLATFORM" \
  -classpath "$PLATFORM" \
  -d "$OUT/obj" \
  @"$OUT/sources.txt"

# 5. Dex
echo "Dexing ..."
"$D8" --lib "$PLATFORM" --output "$OUT" $(find "$OUT/obj" -name '*.class')

# 6. Add classes.dex to the APK
echo "Packaging classes.dex ..."
( cd "$OUT" && zip -q -j app-unaligned.apk classes.dex )

# 7. Align
echo "Aligning ..."
"$ZIPALIGN" -f -p 4 "$OUT/app-unaligned.apk" "$OUT/app-unsigned.apk"

# Signing credentials are read from the environment:
#   KS_PASS   keystore + key password   (default: the project's public demo password)
#   KS_ALIAS  key alias                 (default: iscspmatharena)
# Override them for a real release build, e.g.
#   KS_PASS='********' bash build-offline.sh
export KS_PASS="${KS_PASS:-mentalmath}"
export KS_ALIAS="${KS_ALIAS:-iscspmatharena}"

# 8. Sign with the existing release key (same key => installs as an update)
echo "Signing ..."
rm -f Mental-Maths-Practice.apk
"$APKSIGNER" sign \
  --ks release.keystore \
  --ks-pass env:KS_PASS \
  --key-pass env:KS_PASS \
  --ks-key-alias "${KS_ALIAS:-iscspmatharena}" \
  --out Mental-Maths-Practice.apk \
  "$OUT/app-unsigned.apk"

# 9. Verify
"$APKSIGNER" verify --print-certs Mental-Maths-Practice.apk | head -6
echo ""
echo "Done: apk/Mental-Maths-Practice.apk ($(du -h Mental-Maths-Practice.apk | cut -f1))"
echo "Install with:  adb install -r Mental-Maths-Practice.apk"
