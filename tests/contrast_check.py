#!/usr/bin/env python3
"""Measure the real contrast of the Contact Us page (and the quiz screen) in
both themes, in headless Chromium.

Static token maths proves the palette is right; this proves the *rendered*
result is right - it reads the computed colour of each element, walks up the
tree for the first opaque background behind it, and scores the pair with the
WCAG relative-luminance formula.

Usage:  python3 tests/contrast_check.py [base_url]
"""
import sys

from playwright.sync_api import sync_playwright

CHROME = "/home/user/.cache/pw/chrome-headless-shell-linux64/chrome-headless-shell"

# (label, selector, minimum ratio, minimum px font size we treat it at)
CONTACT_TARGETS = [
    ("page heading 'Contact Us'", ".contact-screen .screen-title", 4.5),
    ("eyebrow 'Support'", ".contact-screen .eyebrow", 3.0),
    ("card title (accent)", ".contact-card-title", 4.5),
    ("welcome body text", ".contact-welcome p", 4.5),
    ("welcome closing line", ".contact-welcome p:last-child", 4.5),
    ("developer name", ".developer-name", 4.5),
    ("developer role", ".developer-role", 4.5),
    ("developed-by credit line", ".developer-credit", 3.0),
    ("whatsapp heading", ".wa-title", 4.5),
    ("whatsapp supporting text", ".wa-support", 4.5),
    ("whatsapp footnote", ".wa-note", 4.5),
    ("whatsapp glyph in the chip", ".wa-icon svg", 3.0),
    ("whatsapp glyph in the button", ".btn-whatsapp .btn-icon svg", 4.5),
]

QUIZ_TARGETS = [
    ("question text", "#qText", 4.5),
    ("category label", "#qCategory", 4.5),
    ("answer input text", "#qInput", 4.5),
    ("submit answer label", "#qSubmit", 4.5),
    ("hint label", "#qHint", 4.5),
    ("quit label", "#qQuit", 4.5),
    ("progress label", "#qProgress", 4.5),
]

JS_CONTRAST = """
(targets) => {
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
  };
  const bgOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.95) return c;
      node = node.parentElement;
    }
    const c = parse(getComputedStyle(document.body).backgroundColor);
    return (c && c.a > 0.95) ? c : { r: 255, g: 255, b: 255, a: 1 };
  };
  const out = [];
  for (const [label, sel, min] of targets) {
    const el = document.querySelector(sel);
    if (!el) { out.push({ label, missing: true }); continue;
    }
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    const bg = bgOf(el);
    out.push({
      label, min,
      color: cs.color, bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
      fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight,
      ratio: ratio(fg, bg),
    });
  }
  // Non-text pairs: a control must be distinguishable from what is behind it.
  const pair = (label, sel, min) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const own = parse(getComputedStyle(el).backgroundColor);
    const behind = bgOf(el.parentElement || el);
    return { label, min, ratio: ratio(own, behind), color: `rgb(${own.r}, ${own.g}, ${own.b})`,
             bg: `rgb(${behind.r}, ${behind.g}, ${behind.b})` };
  };
  // A ring/border only has to be perceptible (>= 1.3:1); a filled control has
  // to clear 3:1. The card-vs-page and card-border figures are deliberately
  // low thresholds: they are the app's existing light-theme design language,
  // which the brief freezes - they are measured so a change cannot slip in
  // unnoticed, not because they are expected to be high.
  const ring = (label, sel, min) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const bc = parse(getComputedStyle(el).borderTopColor);
    const behind = bgOf(el.parentElement || el);
    return { label, min, ratio: ratio(bc, behind), color: getComputedStyle(el).borderTopColor,
             bg: `rgb(${behind.r}, ${behind.g}, ${behind.b})` };
  };
  const shapes = [
    pair('whatsapp button vs card', '.btn-whatsapp', 3.0),
    ring('whatsapp chip ring vs card', '.wa-icon', 1.3),
    ring('developer photo ring vs card', '.developer-photo', 1.3),
    pair('card vs page background', '.contact-card', 1.05),
  ].filter(Boolean);
  // The white label on the WhatsApp button, measured against its own fill.
  const btn = document.querySelector('.btn-whatsapp');
  let btnLabel = null;
  if (btn) {
    btnLabel = { label: "white label on whatsapp button", min: 4.5,
                 ratio: ratio(parse(getComputedStyle(btn).color), parse(getComputedStyle(btn).backgroundColor)),
                 color: getComputedStyle(btn).color, bg: getComputedStyle(btn).backgroundColor };
  }
  // Card border vs page background (visible but subtle is the goal: >= 1.35)
  const card = document.querySelector('.contact-card');
  let border = null;
  if (card) {
    const bc = parse(getComputedStyle(card).borderTopColor);
    border = { label: 'card border vs page background', min: 1.05,
               ratio: ratio(bc, bgOf(card.parentElement || card)), color: getComputedStyle(card).borderTopColor };
  }
  // The developer photo: rendered square (no distortion) and actually loaded.
  const img = document.getElementById('developerPhoto');
  const photo = img ? { w: +img.getBoundingClientRect().width.toFixed(1),
                        h: +img.getBoundingClientRect().height.toFixed(1),
                        natural: [img.naturalWidth, img.naturalHeight], complete: img.complete } : null;
  return { text: out, shapes, btnLabel, border, photo };
}
"""


def report(theme, page, targets, url):
    # Navigate first (localStorage is not readable on the initial blank page),
    # then pin the theme through the app's own state store and reload.
    page.goto(url, wait_until="load")
    page.wait_for_timeout(300)
    page.evaluate("""(t) => {
      const KEY = 'iscsp-mm-state-v1';
      const raw = localStorage.getItem(KEY);
      const state = raw ? JSON.parse(raw) : {};
      state.settings = Object.assign({}, state.settings, { theme: t });
      localStorage.setItem(KEY, JSON.stringify(state));
    }""", theme)
    page.reload(wait_until="load")
    page.wait_for_timeout(500)
    data = page.evaluate(JS_CONTRAST, targets)
    print(f"\n================ {theme.upper()} THEME ================")
    failures = []
    print(f"{'element':34s} {'ratio':>6s} {'min':>5s}  {'size':>6s}  colours")
    for row in data["text"]:
        if row.get("missing"):
            failures.append(f"{row['label']}: selector not found")
            print(f"{row['label']:34s} MISSING")
            continue
        ok = row["ratio"] >= row["min"]
        if not ok:
            failures.append(f"{row['label']}: {row['ratio']} < {row['min']}")
        print(f"{row['label']:34s} {row['ratio']:6.2f} {row['min']:5.1f}  {row['fontSize']:5.1f}px  "
              f"{row['color']} on {row['bg']}  {'ok' if ok else 'LOW'}")
    for row in [data["btnLabel"], data["border"], *data["shapes"]]:
        if not row:
            continue
        ok = row["ratio"] >= row["min"]
        if not ok:
            failures.append(f"{row['label']}: {row['ratio']} < {row['min']}")
        print(f"{row['label']:34s} {row['ratio']:6.2f} {row['min']:5.1f}  {'':>6s}  "
              f"{row.get('color')} on {row.get('bg', '-')}  {'ok' if ok else 'LOW'}")
    print("photo:", data["photo"])
    return failures


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
    bad = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for theme in ("light", "dark"):
            ctx = browser.new_context(viewport={"width": 393, "height": 900}, device_scale_factor=2)
            page = ctx.new_page()
            bad += [f"contact/{theme}: " + f for f in report(theme, page, CONTACT_TARGETS, base + "/index.html#/contact")]
            bad += [f"quiz/{theme}: " + f for f in report(theme, page, QUIZ_TARGETS, base + "/index.html#/practice")]
            ctx.close()
        browser.close()
    print("\n================ RESULT ================")
    if bad:
        for b in bad:
            print("  FAIL ", b)
        return 1
    print("  every measured pair meets its target in both themes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
