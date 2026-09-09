#!/usr/bin/env bash
# Build the ISCSP Mental Math AI Arena Android APK from the PWA.
# Prerequisites: Node 18+, JDK 17+, a publicly hosted HTTPS PWA URL.
#
# Before running this script:
# 1. Host the pwa/ folder somewhere (e.g. GitHub Pages).
# 2. Edit twa-manifest.json with your real host + startUrl.
# 3. Run this script.

set -euo pipefail

cd "$(dirname "$0")"

echo "=== ISCSP Mental Math AI Arena — APK builder ==="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required. Install from https://nodejs.org/" >&2; exit 1
fi
if ! command -v java >/dev/null 2>&1; then
  echo "ERROR: Java 17+ is required. Install JDK 17 or newer." >&2; exit 1
fi

echo "Node: $(node --version)"
echo "Java: $(java -version 2>&1 | head -1)"
echo ""

if [ ! -d node_modules ]; then
  echo "Initializing npm project..."
  npm init -y >/dev/null
fi

echo "Initializing Bubblewrap project (only on first run)..."
if [ ! -f twa-manifest.json ]; then
  echo "ERROR: twa-manifest.json not found. Create it first." >&2; exit 1
fi

npx --yes @bubblewrap/cli@latest init --manifest=twa-manifest.json || true

echo ""
echo "Building signed APK..."
npx --yes @bubblewrap/cli@latest build

echo ""
echo "Done. Look for app-release-signed.apk (or app-release-bundle.apk) in this directory."
echo "Install it with:  adb install app-release-signed.apk"
