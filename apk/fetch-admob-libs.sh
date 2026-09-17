#!/usr/bin/env bash
# One-time fetch of the Google Mobile Ads SDK + its transitively
# resolved runtime dependency closure as standalone jars.
#
# The closure is computed from the play-services-ads 24.3.0 POMs
# resolved against the Google Maven repo, plus the public Maven
# Central for the few non-Androidx Kotlin / Guava deps. Caches are
# stored under build-offline-libs/{aars,classes}/ so subsequent
# builds are fully offline.
#
# Update the dependency list below when Google bumps the SDK
# version. The deps listed here are the precise runtime closure
# that ships in a production APK using
# `com.google.android.gms:play-services-ads:24.3.0`.
set -euo pipefail

cd "$(dirname "$0")"

VERSION="${PLAY_ADS_VERSION:-24.3.0}"
MAVEN_GOOGLE="https://dl.google.com/android/maven2"
MAVEN_PUBLIC="https://repo1.maven.org/maven2"

OUT_BASE="build-offline-libs"
AARS="$OUT_BASE/aars"
JARS="$OUT_BASE/classes"
mkdir -p "$AARS" "$JARS"

# Coordinated list (aar + jar mixed). `entry` is:
#   <group>:<artifact>:<version>:[aar|jar]:<maven>
# where <maven> = google | public
# ---- AndroidX multidex (NOT needed for minSdk >= 21; ART supports
  # multidex natively without the library or MultiDexApplication).
  # ---- AndroidX (aars) ----
  ENTRIES=(
  # ---- Play Services Ads root ----
  "com.google.android.gms:play-services-ads:${VERSION}:aar:google"
  "com.google.android.gms:play-services-ads-api:${VERSION}:aar:google"
  "com.google.android.gms:play-services-ads-identifier:18.0.0:aar:google"
  "com.google.android.gms:play-services-appset:16.0.1:aar:google"
  "com.google.android.gms:play-services-base:18.0.0:aar:google"
  "com.google.android.gms:play-services-basement:18.0.0:aar:google"
  "com.google.android.gms:play-services-tasks:18.0.0:aar:google"
  "com.google.android.gms:play-services-measurement-base:20.1.2:aar:google"
  "com.google.android.gms:play-services-measurement-sdk-api:20.1.2:aar:google"
  "com.google.android.material:material:1.12.0:aar:google"
  "com.google.android.ump:user-messaging-platform:3.2.0:aar:google"
  # ---- AndroidX multidex (needed because minSdk < 24 in some
  # configurations). For minSdk >= 21 we still need to name the
  # AndroidX multidex Application so the system's Multidex.install
  # path actually gets wired up; minSdk >= 21 is natively supported
  # by ART but the API < 21 fallback path needs the library class).
  "androidx.multidex:multidex:2.0.1:aar:google"
  # ---- AndroidX (aars) ----
  "androidx.activity:activity:1.0.0:aar:google"
  "androidx.annotation:annotation-experimental:1.1.0:aar:google"
  "androidx.arch.core:core-runtime:2.0.0:aar:google"
  "androidx.asynclayoutinflater:asynclayoutinflater:1.0.0:aar:google"
  "androidx.browser:browser:1.8.0:aar:google"
  "androidx.coordinatorlayout:coordinatorlayout:1.0.0:aar:google"
  "androidx.core:core:1.6.0:aar:google"
  "androidx.core:core-ktx:1.8.0:aar:google"
  "androidx.cursoradapter:cursoradapter:1.0.0:aar:google"
  "androidx.customview:customview:1.0.0:aar:google"
  "androidx.documentfile:documentfile:1.0.0:aar:google"
  "androidx.drawerlayout:drawerlayout:1.0.0:aar:google"
  "androidx.fragment:fragment:1.0.0:aar:google"
  "androidx.interpolator:interpolator:1.0.0:aar:google"
  "androidx.legacy:legacy-support-core-ui:1.0.0:aar:google"
  "androidx.legacy:legacy-support-core-utils:1.0.0:aar:google"
  "androidx.lifecycle:lifecycle-livedata:2.0.0:aar:google"
  "androidx.lifecycle:lifecycle-livedata-core:2.0.0:aar:google"
  "androidx.lifecycle:lifecycle-runtime:2.1.0:aar:google"
  "androidx.lifecycle:lifecycle-service:2.1.0:aar:google"
  "androidx.lifecycle:lifecycle-viewmodel:2.1.0:aar:google"
  "androidx.loader:loader:1.0.0:aar:google"
  "androidx.localbroadcastmanager:localbroadcastmanager:1.0.0:aar:google"
  "androidx.print:print:1.0.0:aar:google"
  "androidx.room:room-runtime:2.2.5:aar:google"
  "androidx.savedstate:savedstate:1.0.0:aar:google"
  "androidx.slidingpanelayout:slidingpanelayout:1.0.0:aar:google"
  "androidx.sqlite:sqlite:2.0.1:aar:google"
  "androidx.sqlite:sqlite-framework:2.0.1:aar:google"
  "androidx.startup:startup-runtime:1.0.0:aar:google"
  "androidx.swiperefreshlayout:swiperefreshlayout:1.0.0:aar:google"
  "androidx.tracing:tracing:1.0.0:aar:google"
  "androidx.versionedparcelable:versionedparcelable:1.1.1:aar:google"
  "androidx.viewpager:viewpager:1.0.0:aar:google"
  "androidx.webkit:webkit:1.11.0-alpha02:aar:google"
  # ---- AndroidX (jars) ----
  "androidx.annotation:annotation:1.0.2:jar:google"
  "androidx.arch.core:core-common:2.0.1:jar:google"
  "androidx.collection:collection:1.1.0:jar:google"
  "androidx.concurrent:concurrent-futures:1.1.0:jar:google"
  "androidx.lifecycle:lifecycle-common:2.1.0:jar:google"
  "androidx.privacysandbox.ads:ads-adservices:1.0.0-beta05:aar:google"
  "androidx.privacysandbox.ads:ads-adservices-java:1.0.0-beta05:aar:google"
  "androidx.room:room-common:2.2.5:jar:google"
  "androidx.work:work-runtime:2.7.0:aar:google"
  # ---- Guava + Kotlin runtime (jars) ----
  "com.google.guava:guava:31.1-android:jar:public"
  "com.google.guava:failureaccess:1.0.1:jar:public"
  "com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava:jar:public"
  "org.jetbrains:annotations:23.0.0:jar:public"
  "org.jetbrains.kotlin:kotlin-stdlib:1.8.20:jar:public"
  "org.jetbrains.kotlin:kotlin-stdlib-common:1.8.20:jar:public"
  "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.20:jar:public"
  "org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.20:jar:public"
  "org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.1:jar:public"
  "org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.7.1:jar:public"
)

fetch() {
    local group="$1" artifact="$2" version="$3" type="$4" maven="$5"
    local gp group_path
    gp=$(echo "$group" | tr '.' '/')
    local fname="${artifact}-${version}.${type}"
    local outdir="$AARS"
    [ "$type" = "jar" ] && outdir="$JARS"
    local out_path="$outdir/$fname"
    local maven_base="$MAVEN_PUBLIC"
    [ "$maven" = "google" ] && maven_base="$MAVEN_GOOGLE"
    if [ ! -f "$out_path" ]; then
        if ! curl -fsSL -o "$out_path" "$maven_base/$gp/$artifact/$version/$fname"; then
            echo "  !  MISS $fname"
            return 1
        fi
        echo "  + $fname ($(du -h "$out_path" | cut -f1))"
    fi
}

# For an aar we keep the aar itself (resources are merged by aapt2
# during the link step) and ALSO extract classes.jar into our
# lib-for-dex staging directory. The build script passes these
# jars through d8. The .aars exist so the asset compiler has the
# right resources.
extract_aar_classes() {
    local fname="$1"
    local aar="$AARS/$fname"
    # Strip trailing `.aar` first; this gives the base+version
    # (e.g. `play-services-ads-24.3.0`).
    local stripped="${fname%.aar}"
    # Now split at the LAST `-` to peel off the version. For an
    # artifact that already contains dashes in its name (e.g.
    # `play-services-ads`) the LAST dash is the boundary.
    local base="${stripped%-*}"
    local jar_name="${base}.jar"
    local jar="$JARS/$jar_name"
    if [ -f "$jar" ] && [ "$aar" -nt "$jar" ]; then
        return 0
    fi
    if ! unzip -p "$aar" classes.jar >/tmp/.classes.jar 2>/dev/null; then
        return 0
    fi
    rm -f "$jar"
    (umask 022 && cp /tmp/.classes.jar "$jar")
}

echo "Fetching AdMob SDK v${VERSION} + runtime closure ..."
for entry in "${ENTRIES[@]}"; do
    IFS=":" read -r g a v t m <<< "$entry"
    if fetch "$g" "$a" "$v" "$t" "$m"; then
        if [ "$t" = "aar" ]; then
            extract_aar_classes "${a}-${v}.aar"
        fi
    fi
done

echo ""
echo "Aars   : $(ls "$AARS" 2>/dev/null | wc -l)"
echo "Jars   : $(ls "$JARS" 2>/dev/null | wc -l)"
echo "Done."
