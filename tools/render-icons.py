#!/usr/bin/env python3
"""Rasterise the app logo for every place that needs a PNG.

The SVG in pwa/icons/icon.svg is the only hand-written artwork; everything else
(the PWA icons, the Android adaptive-icon foreground and the legacy mipmaps) is
rendered from it with headless Chromium so the shapes are pixel-identical.

Usage:  python3 tools/render-icons.py
"""
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

CHROME = "/home/user/.cache/pw/chrome-headless-shell-linux64/chrome-headless-shell"
ROOT = pathlib.Path(__file__).resolve().parent.parent
PWA_ICONS = ROOT / "pwa" / "icons"
RES = ROOT / "apk" / "app" / "src" / "main" / "res"

INDIGO = "#3a4dc4"
# One continuous check stroke - the whole mark. No gradient, no text, no 3D.
CHECK = ('<path d="M142 262l76 76 152-166" fill="none" stroke="#ffffff" '
         'stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>')


def svg(size, rx_frac=112 / 512, check_scale=1.0, tile=True, circle=False):
    """Build a standalone SVG document for one icon variant."""
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 512 512">' % (size, size)]
    if tile:
        if circle:
            parts.append('<circle cx="256" cy="256" r="256" fill="%s"/>' % INDIGO)
        else:
            parts.append('<rect width="512" height="512" rx="%g" fill="%s"/>' % (rx_frac * 512, INDIGO))
    if check_scale != 1.0:
        parts.append('<g transform="translate(256 256) scale(%g) translate(-256 -256)">' % check_scale)
    parts.append(CHECK)
    if check_scale != 1.0:
        parts.append('</g>')
    parts.append('</svg>')
    return "".join(parts)


PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent;}
  #box{width:%dpx;height:%dpx;}
</style></head><body><div id="box">%s</div></body></html>"""


def render(page, size, markup, out):
    page.set_content(PAGE % (size, size, markup))
    page.wait_for_timeout(60)
    el = page.query_selector("#box")
    el.screenshot(path=str(out), omit_background=True)
    print("  wrote", out.relative_to(ROOT), out.stat().st_size, "bytes")


def main():
    jobs = []
    # --- PWA -----------------------------------------------------------------
    for size in (192, 512):
        jobs.append((size, svg(size), PWA_ICONS / ("icon-%d.png" % size)))
    # Maskable: full-bleed tile, artwork inside the central 80%% safe zone.
    jobs.append((512, svg(512, rx_frac=0.0, check_scale=0.62), PWA_ICONS / "icon-maskable.png"))
    # --- Android adaptive icon (API 26+) -------------------------------------
    jobs.append((432, svg(432, check_scale=0.9, tile=False), RES / "drawable" / "ic_launcher_foreground.png"))
    # --- Android legacy launcher icons ---------------------------------------
    for size, folder in ((48, "mdpi"), (72, "hdpi"), (96, "xhdpi"), (144, "xxhdpi"), (192, "xxxhdpi")):
        jobs.append((size, svg(size, rx_frac=0.0), RES / ("mipmap-" + folder) / "ic_launcher.png"))
        jobs.append((size, svg(size, rx_frac=0.0, circle=True), RES / ("mipmap-" + folder) / "ic_launcher_round.png"))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=1)
        for size, markup, out in jobs:
            out.parent.mkdir(parents=True, exist_ok=True)
            render(page, size, markup, out)
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
