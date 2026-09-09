# ISCSP Mental Math AI Arena — Android APK

The app at `../pwa/` is a complete Progressive Web App (PWA). It installs
on Android with one tap from Chrome's "Add to Home Screen" menu and works
fully offline. This directory gives you everything needed to also build
a **native APK** that distributes through sideloading, your website, or
alternative Android app stores.

There are **two production-grade paths** to a real APK:

| Path | Tooling | Output | Time to first APK |
|---|---|---|---|
| **Path A (recommended): Bubblewrap / TWA** | Node + JDK | Signed APK (Play Store compatible) | 10-20 min |
| **Path B: Capacitor** | Node + Android Studio | Native wrapper | 30-60 min |

Both are described below. Pick the one that matches your environment.

---

## Path A — Bubblewrap (Trusted Web Activity) ⭐ recommended

Bubblewrap is Google's official CLI for turning any PWA into a TWA APK.
No Android Studio required.

### Prerequisites

- Node.js 18+ (`node -v`)
- JDK 17+ (`java -version`)
- A publicly reachable HTTPS URL where the PWA will be hosted
  (GitHub Pages, Netlify, Vercel, your own server, etc.)

### Step 1 — Host the PWA

Upload the entire `pwa/` folder to any static host. Examples:

- **GitHub Pages:** push `pwa/` to a `gh-pages` branch, enable Pages.
- **Netlify:** drag-and-drop the `pwa/` folder at https://app.netlify.com/drop
- **Vercel:** `vercel deploy pwa --prod`

You'll end up with a URL like `https://yourname.github.io/Mental-Maths-Practice-/pwa/`
or `https://iscsp-math-arena.netlify.app/`. **The whole PWA must be served
at that URL** and the manifest + service worker must be reachable (you can
verify by visiting `https://your-url/manifest.webmanifest`).

### Step 2 — Configure TWA metadata

Edit `twa-manifest.json` and replace the placeholder values:

```json
{
  "packageId": "com.yourname.iscspmatharena",
  "host": "yourname.github.io",
  "name": "ISCSP Mental Math AI Arena",
  "launcherName": "Mental Math",
  "display": "standalone",
  "themeColor": "#0b1437",
  "backgroundColor": "#0b1437",
  "iconUrl": "https://yourname.github.io/Mental-Maths-Practice-/pwa/icons/icon-512.png",
  "splashColor": "#0b1437",
  "startUrl": "/Mental-Maths-Practice-/pwa/",
  "scope": "/Mental-Maths-Practice-/pwa/"
}
```

### Step 3 — Build the APK

```bash
cd apk
npm init -y
npx @bubblewrap/cli@latest init --manifest=twa-manifest.json
npx @bubblewrap/cli@latest build
```

The signed APK will be at `app-release-bundle.apk` (or `app-release-signed.apk`).
Bubblewrap will generate a keystore for you on first build; **back it up** —
you'll need it for all future updates.

### Step 4 — Install on Android

```bash
adb install app-release-signed.apk
```

Or transfer the APK to the phone and tap it (enable "Install from unknown
sources" in Settings → Security).

### Step 5 (optional) — Set up Digital Asset Links

For the APK to feel like a "real" installed app (full-screen, no browser
bar, works after the app is closed), you need a Digital Asset Links
verification file served from your domain. Bubblewrap can generate it:

```bash
npx @bubblewrap/cli@latest update
```

Then upload the produced `assetlinks.json` to
`https://your-domain/.well-known/assetlinks.json`.

---

## Path B — Capacitor

Capacitor wraps a web app in a native Android shell. It's heavier than
TWA but gives you access to native APIs if you ever need them.

```bash
npm install -g @ionic/cli
ionic start MentalMath blank --type=vanilla --capacitor
# Replace www/ contents with the contents of ../pwa/
npx cap add android
npx cap open android
# In Android Studio: Build → Generate Signed Bundle / APK
```

---

## What's in this directory

- `twa-manifest.json` — Bubblewrap configuration template.
- `assetlinks.json` — sample Digital Asset Links file (regenerate with
  your own signing key fingerprint after `bubblewrap update`).
- `build.sh` — one-command build script (edit and run).
- `README.md` — this file.

## Notes

- The TWA APK is **production-grade**: it uses Chrome Custom Tabs, is
  signed with a release keystore, and is suitable for distribution via
  the Play Store (after the standard review).
- The PWA inside the APK works **fully offline** thanks to the service
  worker shipped at `../pwa/sw.js`.
- The first install is ~3-4 MB.
- No emulator, no Android SDK, no Gradle daemon required for the build
  itself — Bubblewrap handles everything.

## Quick verification

After installing the APK:

1. Open the app — it should look identical to the PWA in Chrome.
2. Tap "Start Practice" — you should be able to submit answers and see
   instant feedback with the mental shortcut.
3. Turn on airplane mode and try again — the app should still work
   completely (everything is cached after first load).
4. Tap the system back button — the app should minimize cleanly without
   losing your quiz progress.
