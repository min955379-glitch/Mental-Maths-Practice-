# Release Notes

## v1.0.0 — Initial release

**Release date:** 2026-09-09

### What's in the box

- **`apk/ISCSP-Mental-Math-Arena.apk`** (932 KB) — production-signed Android
  APK. Installable on Android 5.0+ (SDK 21+). Built with Bubblewrap / TWA.
- **`pwa/`** — the source PWA that powers the APK.
- **`apk/app-project/`** — the generated TWA project (edit and rebuild
  with `./gradlew assembleRelease`).
- **`apk/release.keystore`** — the signing keystore. **Back this up** —
  you'll need it to publish updates.
- **`apk/build.sh`** — the one-command build script.

### How to install the APK

1. Transfer `ISCSP-Mental-Math-Arena.apk` to your Android phone
   (USB, email, cloud drive — any method).
2. On the phone: open the file and tap "Install". If prompted, allow
   "Install from unknown sources" in Settings.
3. The app appears in your launcher as **Mental Math** with the
   ISCSP icon.

### How to update to a real domain

The default APK points to the PWA hosted on this repository's `main`
branch on GitHub. To point it at your own domain:

1. Host the `pwa/` folder on any HTTPS host (GitHub Pages, Netlify, etc.)
2. Edit `apk/twa-manifest.json`:
   - `host` → your domain
   - `iconUrl` → absolute URL to your 512x512 icon
   - `startUrl` / `scope` → the path where the PWA is served
   - `webManifestUrl` → absolute URL to `manifest.webmanifest`
3. Edit `apk/app-project/app/build.gradle` to update the embedded
   `twaManifest` block with the same values.
4. Run `bash apk/build.sh` to rebuild.

### What's in the PWA (and therefore the APK)

- 50 verified ISCSP mental-math questions, all answers re-verified
- 6 practice modes: Quick / Timed / Full Test / Category / Weak Areas /
  Mistake Review
- Deterministic question generator (mathematically correct by construction)
- Robust answer normalization (units, fractions, percentages, time, decimals)
- No multiple-choice — answer input only with instant feedback
- Mental shortcut, why-it-works, mental pattern, common mistake for
  every question
- Per-question millisecond timer
- Local persistence (localStorage) — works fully offline
- Authentication (SHA-256 + per-user salt)
- Dashboard, test reports, mistake review, AI coach, mental-pattern library
- Dark mode, reduced motion, full keyboard + screen-reader support
- Zero emoji — professional SVG icons throughout

### Verification

Automated test results (run from the command line):

- 50 / 50 seeded questions accept their own correct answer
- 300 / 300 generated questions accept their own correct answer
- 0 false-positive acceptances across 24 plausible-wrong inputs
- All 12 JS files pass `node --check` syntax verification
- All PWA assets serve over HTTP without 404/500 errors

### Known limitations

- The default APK uses the PWA hosted on `raw.githubusercontent.com`,
  which is fine for testing but is not the recommended hosting location
  for a production app. For real deployment, host the PWA on your
  own HTTPS domain (see "How to update to a real domain" above).
- The first launch requires internet (to fetch the PWA from the
  configured URL). After that, the service worker caches everything
  and the app works offline.
- Digital Asset Links verification (the file at
  `/.well-known/assetlinks.json` on the host) is not configured for
  the default `raw.githubusercontent.com` URL because GitHub doesn't
  support arbitrary files at that path. Without DAL, the app still
  installs and works perfectly, but the address bar is shown briefly
  on launch. To get a fully clean fullscreen experience, host on your
  own domain and add the asset links file (see the Bubblewrap docs).
