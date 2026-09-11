#!/usr/bin/env python3
"""Custom Settings dropdown - end-to-end checks in a real browser engine.

Covers the QA list for the redesign: every option of both dropdowns, that the
device's own picker can no longer be reached, keyboard support, the selected
indicator, contrast in both themes, no overflow from 320px to desktop, and
flipping upwards when there is no room below.

Usage:  python3 tests/dropdown_check.py [base_url]
"""
import os
import sys

from playwright.sync_api import sync_playwright

CHROME = "/home/user/.cache/pw/chrome-headless-shell-linux64/chrome-headless-shell"
SHOTS = "/home/user/Mental-Maths-Practice-/docs/screenshots"
URL = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123") + "/index.html"

results = []
def check(label, ok, detail=""):
    results.append((label, ok, detail))
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"  [{detail}]" if detail else ""))
    return ok

def stored(page, key):
    return page.evaluate("(k) => JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).settings[k]", key)

def set_pref(page, key, value):
    """Write a setting into the app's own store, then reload so it is picked up."""
    page.evaluate("""([k, v]) => { const key = 'iscsp-mm-state-v1';
                                   const s = JSON.parse(localStorage.getItem(key) || '{}');
                                   s.settings = Object.assign({}, s.settings || {}, { [k]: v });
                                   localStorage.setItem(key, JSON.stringify(s)); }""", [key, value])
    page.reload(wait_until="load")
    page.wait_for_selector(".select-trigger", timeout=10000)
    return page.evaluate("document.documentElement.dataset.theme")

def open_menu(page, index=0):
    """Open one dropdown, closing whichever one happens to be open already."""
    if page.locator(".select.is-open").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
    page.locator(".select-trigger").nth(index).click()
    page.wait_for_timeout(240)
    return page.locator(".select.is-open .select-menu")

def pick(page, label, index=0):
    menu = open_menu(page, index)
    try:
        menu.locator(".select-option", has_text=label).first.click(timeout=5000)
    except Exception as exc:                       # noqa: BLE001 - report, do not crash the suite
        print(f"  (could not click {label}: {type(exc).__name__})")
    page.wait_for_timeout(260)

CONTRAST_JS = """
(sels) => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const p = m[1].split(',').map(parseFloat); return { r:p[0], g:p[1], b:p[2], a:p.length>3?p[3]:1 }; };
  const lum = ({r,g,b}) => { const f=(v)=>{v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);};
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const ratio = (a,b) => { const l1=lum(a), l2=lum(b);
    return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2); };
  const bgOf = (el) => { let n = el;
    while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.95) return c; n = n.parentElement; }
    return parse(getComputedStyle(document.body).backgroundColor) || {r:255,g:255,b:255,a:1}; };
  const out = [];
  for (const [label, sel, min] of sels) {
    const el = document.querySelector(sel);
    if (!el) { out.push({label, missing:true}); continue; }
    const cs = getComputedStyle(el);
    const bg = bgOf(el);
    out.push({ label, min, ratio: ratio(parse(cs.color), bg), fontSize: parseFloat(cs.fontSize),
               color: cs.color, bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})` });
  }
  const borders = [];
  const menu = document.querySelector('.select-menu');
  if (menu) {
    const bc = parse(getComputedStyle(menu).borderTopColor);
    borders.push({ label:'menu border against the card', min:1.3, ratio: ratio(bc, bgOf(menu.parentElement || menu)) });
    borders.push({ label:'menu panel against the card', min:1.05,
                   ratio: ratio(parse(getComputedStyle(menu).backgroundColor), bgOf(menu.parentElement || menu)) });
  }
  const trig = document.querySelector('.select-trigger');
  if (trig) {
    const bc = parse(getComputedStyle(trig).borderTopColor);
    borders.push({ label:'closed field border against the card', min:1.3, ratio: ratio(bc, bgOf(trig.parentElement || trig)) });
  }
  return { text: out, borders };
}
"""

CONTRAST_TARGETS = [
    ("closed field value", ".select-trigger .select-value", 4.5),
    ("dropdown arrow", ".select-arrow", 3.0),
    ("option label", ".select-option:not(.is-selected) .select-option-text", 4.5),
    ("selected option label", ".select-option.is-selected .select-option-text", 4.5),
    ("selected option tick", ".select-option.is-selected .select-check", 3.0),
]


def theme_contrast(page, theme):
    applied = set_pref(page, "theme", theme)
    check(f"the {theme} theme is active for the contrast check", applied == theme, str(applied))
    open_menu(page, 0)
    data = page.evaluate(CONTRAST_JS, CONTRAST_TARGETS)
    print(f"\n  --- {theme} theme ---")
    bad = []
    for row in data["text"]:
        if row.get("missing"):
            bad.append(f"{row['label']}: not found"); print(f"    {row['label']:28s} MISSING"); continue
        ok = row["ratio"] >= row["min"]
        if not ok: bad.append(f"{row['label']}: {row['ratio']} < {row['min']}")
        print(f"    {row['label']:28s} {row['ratio']:6.2f}  (min {row['min']})  {row['color']} on {row['bg']}  {'ok' if ok else 'LOW'}")
    for row in data["borders"]:
        ok = row["ratio"] >= row["min"]
        if not ok: bad.append(f"{row['label']}: {row['ratio']} < {row['min']}")
        print(f"    {row['label']:28s} {row['ratio']:6.2f}  (min {row['min']})  {'ok' if ok else 'LOW'}")
    return bad


def main():
    problems = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 393, "height": 800}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        def on_console(m):
            # A <meta> CSP cannot express frame-ancestors; the browser says so.
            # It is not an app error, so it must not fail the suite.
            if m.type == "error" and "Content Security Policy directive" not in m.text:
                errors.append("console." + m.type + ": " + m.text)
        page.on("console", on_console)

        print("\n--- the device picker is replaced ---")
        page.goto(URL + "#/settings", wait_until="load")
        page.wait_for_selector(".select-trigger", timeout=10000)
        native = page.evaluate("""() => ['setTheme','setDifficulty'].map((id) => {
          const s = document.getElementById(id); const cs = getComputedStyle(s);
          return { id, opacity: cs.opacity, pointerEvents: cs.pointerEvents, appearance: cs.appearance || cs.webkitAppearance,
                   ariaHidden: s.getAttribute('aria-hidden'), tabIndex: s.tabIndex, inForm: !!s.form, value: s.value };
        })""")
        check("both native selects are kept for their value", len(native) == 2 and all(n["inForm"] for n in native))
        check("no native picker can be opened by tapping", all(n["pointerEvents"] == "none" and n["opacity"] == "0" for n in native),
              str([(n["id"], n["pointerEvents"], n["opacity"]) for n in native]))
        check("the native select is out of the tab order and hidden from screen readers",
              all(n["tabIndex"] == -1 and n["ariaHidden"] == "true" for n in native))
        check("the visible control is a combobox button, not a native select",
              page.locator(".select-trigger").count() == 2 and
              page.get_by_role("combobox").count() == 2)

        print("\n--- theme dropdown ---")
        menu = open_menu(page, 0)
        check("the theme dropdown opens", page.locator(".select.is-open").count() == 1)
        check("it lists Light / Dark / Auto (system)",
              [t.strip() for t in menu.locator(".select-option").all_text_contents()] == ["Light", "Dark", "Auto (system)"])
        check("the trigger reports aria-expanded=true",
              page.locator(".select-trigger").first.get_attribute("aria-expanded") == "true")
        rot = page.evaluate("getComputedStyle(document.querySelector('.select.is-open .select-arrow')).transform")
        check("the arrow rotates while open", rot not in ("none", "", None), rot[:28])
        check("the menu is a listbox with options",
              page.locator(".select.is-open .select-menu[role=listbox]").count() == 1 and
              page.locator(".select.is-open [role=option]").count() == 3)

        print("\n--- every theme option applies and persists ---")
        for label, expected in (("Light", "light"), ("Dark", "dark"), ("Auto (system)", "auto")):
            pick(page, label, 0)
            got = page.evaluate("""() => ({ theme: document.documentElement.dataset.theme,
                                            select: document.getElementById('setTheme').value,
                                            shown: document.querySelector('.select-trigger .select-value').textContent,
                                            open: !!document.querySelector('.select.is-open') })""")
            check(f"choosing {label} applies and saves it",
                  got["select"] == expected and got["shown"] == label and not got["open"] and stored(page, "theme") == expected,
                  f"dataset.theme={got['theme']} select={got['select']} shown={got['shown']}")
            if expected != "auto":
                check(f"{label} really switches the app theme", got["theme"] == expected, got["theme"])

        print("\n--- closing behaviour ---")
        open_menu(page, 0)
        page.keyboard.press("Escape")
        page.wait_for_timeout(220)
        check("Escape closes the menu", page.locator(".select.is-open").count() == 0)
        check("Escape leaves the value untouched", stored(page, "theme") == "auto")
        open_menu(page, 0)
        page.mouse.click(5, 5)
        page.wait_for_timeout(220)
        check("tapping outside closes the menu", page.locator(".select.is-open").count() == 0)

        print("\n--- keyboard ---")
        page.locator(".select-trigger").first.focus()
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(220)
        check("ArrowDown opens the menu", page.locator(".select.is-open").count() == 1)
        page.keyboard.press("ArrowUp")
        page.keyboard.press("ArrowUp")
        page.wait_for_timeout(120)
        active = page.evaluate("document.querySelector('.select.is-open .select-option.is-active').textContent.trim()")
        check("arrow keys move the highlighted option", active == "Light", active)
        page.keyboard.press("Enter")
        page.wait_for_timeout(260)
        shown = page.evaluate("document.querySelector('.select-trigger .select-value').textContent")
        check("Enter selects the highlighted option",
              page.locator(".select.is-open").count() == 0 and shown == "Light" and stored(page, "theme") == "light", shown)

        print("\n--- selected indicator ---")
        check("the dark theme is active for the indicator check", set_pref(page, "theme", "dark") == "dark")
        open_menu(page, 0)
        ind = page.evaluate("""() => {
          const rows = [...document.querySelectorAll('.select.is-open .select-option')];
          return rows.map((r) => ({ text: r.textContent.trim(), selected: r.getAttribute('aria-selected'),
                                    tickOpacity: getComputedStyle(r.querySelector('.select-check')).opacity,
                                    weight: getComputedStyle(r).fontWeight }));
        }""")
        sel = [r for r in ind if r["selected"] == "true"]
        check("exactly one option is marked selected", len(sel) == 1, str([(r["text"], r["selected"]) for r in ind]))
        check("the selected row shows its tick", sel and sel[0]["tickOpacity"] == "1", str(sel))
        check("unselected rows hide their tick",
              all(r["tickOpacity"] == "0" for r in ind if r["selected"] != "true"))
        check("the selected row is emphasised", sel and int(sel[0]["weight"]) >= 600, sel[0]["weight"] if sel else "-")

        print("\n--- default difficulty ---")
        open_menu(page, 1)
        opts = [t.strip() for t in page.locator(".select.is-open .select-option").all_text_contents()]
        check("it lists Easy / Medium / Hard / Expert / Mixed",
              opts == ["Easy", "Medium", "Hard", "Expert", "Mixed"], str(opts))
        for label in ("Easy", "Medium", "Hard", "Expert", "Mixed"):
            pick(page, label, 1)
            check(f"choosing {label} saves it",
                  stored(page, "difficulty") == label and
                  page.evaluate("document.getElementById('setDifficulty').value") == label)

        # The quiz has to honour the saved default.
        pick(page, "Hard", 1)
        page.goto(URL + "#/practice", wait_until="load")
        page.wait_for_selector("#qInput", timeout=15000)
        check("a new quiz uses the saved default difficulty",
              page.evaluate("window.QuizEngine.Quiz.current.difficulty") == "Hard",
              str(page.evaluate("window.QuizEngine.Quiz.current.difficulty")))

        print("\n--- persistence + the rest of the form ---")
        page.goto(URL + "#/settings", wait_until="load")
        page.wait_for_selector(".select-trigger", timeout=10000)
        page.locator("#setSound").check()
        page.locator("#settingsForm button[type=submit]").click()
        page.wait_for_timeout(300)
        page.reload(wait_until="load")
        page.wait_for_selector(".select-trigger", timeout=10000)
        after = page.evaluate("""() => ({ theme: JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).settings.theme,
                                          difficulty: JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).settings.difficulty,
                                          sound: JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).settings.sound,
                                          shown: document.querySelector('.select-trigger .select-value').textContent })""")
        check("settings survive a reload", after["theme"] == "dark" and after["difficulty"] == "Hard" and after["sound"] is True, str(after))
        check("the dropdown shows the restored value", after["shown"] == "Dark", after["shown"])

        print("\n--- contrast in both themes ---")
        problems += theme_contrast(page, "dark")
        problems += theme_contrast(page, "light")

        print("\n--- screenshots ---")
        for theme in ("dark", "light"):
            set_pref(page, "theme", theme)
            open_menu(page, 0)
            os.makedirs(SHOTS, exist_ok=True)
            page.screenshot(path=os.path.join(SHOTS, f"settings-dropdown-{theme}.png"))
            print("  shot ->", f"settings-dropdown-{theme}.png")
        ctx.close()

        print("\n--- responsive: no overflow, menu stays on screen ---")
        for name, w, h in (("small mobile", 320, 640), ("mobile", 360, 740), ("large mobile", 393, 800),
                           ("large mobile+", 412, 900), ("phablet", 480, 900), ("tablet", 768, 1024),
                           ("desktop", 1024, 800), ("wide desktop", 1280, 800)):
            c = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2,
                                    is_mobile=(w < 700), has_touch=(w < 700))
            pg = c.new_page()
            pg.goto(URL + "#/settings", wait_until="load")
            pg.wait_for_selector(".select-trigger", timeout=10000)
            pg.locator(".select-trigger").first.click()
            pg.wait_for_timeout(240)
            m = pg.evaluate("""() => {
              const menu = document.querySelector('.select.is-open .select-menu');
              const b = menu.getBoundingClientRect();
              const rows = [...menu.querySelectorAll('.select-option')].map(r => {
                const rb = r.getBoundingClientRect(); return { clipped: r.scrollWidth > r.clientWidth + 1, w: rb.width }; });
              return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, vw: innerWidth, vh: innerHeight,
                       docOverflow: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
                       fieldW: document.querySelector('.select-trigger').getBoundingClientRect().width,
                       cardW: document.querySelector('.settings-form').getBoundingClientRect().width,
                       clipped: rows.some(r => r.clipped) };
            }""")
            ok = (m["docOverflow"] <= 0.5 and m["left"] >= -0.5 and m["right"] <= m["vw"] + 0.5
                  and not m["clipped"] and m["top"] >= -0.5 and m["bottom"] <= m["vh"] + 0.5)
            check(f"{name} {w}x{h}: menu on screen, nothing clipped", ok,
                  f"menu {m['left']:.0f}-{m['right']:.0f}x{m['top']:.0f}-{m['bottom']:.0f} in {m['vw']}x{m['vh']}, field {m['fieldW']:.0f}px, overflow {m['docOverflow']}")
            c.close()

        print("\n--- flip upwards when there is no room below ---")
        c = browser.new_context(viewport={"width": 393, "height": 330}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = c.new_page()
        pg.goto(URL + "#/settings", wait_until="load")
        pg.wait_for_selector(".select-trigger", timeout=10000)
        pg.evaluate("document.querySelector('.select-trigger').scrollIntoView({block:'end'})")
        pg.wait_for_timeout(200)
        pg.locator(".select-trigger").first.click()
        pg.wait_for_timeout(260)
        flip = pg.evaluate("""() => {
          const wrap = document.querySelector('.select.is-open');
          const b = wrap.querySelector('.select-menu').getBoundingClientRect();
          const t = wrap.querySelector('.select-trigger').getBoundingClientRect();
          return { up: wrap.classList.contains('select--up'), menuBottom: b.bottom, triggerTop: t.top,
                   bottom: b.bottom, vh: innerHeight, top: b.top };
        }""")
        check("the menu flips above the field when space is tight",
              flip["up"] and flip["bottom"] <= flip["vh"] + 0.5 and flip["top"] >= -0.5
              and flip["menuBottom"] <= flip["triggerTop"] + 0.5,
              f"up={flip['up']} menu {flip['top']:.0f}-{flip['bottom']:.0f} of {flip['vh']}, above the field"
              if flip["up"] else f"up={flip['up']} menu {flip['top']:.0f}-{flip['bottom']:.0f} of {flip['vh']}")
        c.close()
        browser.close()

    print("\n--- page errors ---")
    print("  none" if not errors else "\n".join("  " + e for e in errors[:5]))
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} dropdown checks passed")
    for label, _, detail in failed:
        print("  FAILED:", label, detail)
    for p in problems:
        print("  CONTRAST:", p)
    sys.exit(1 if (failed or problems or errors) else 0)


if __name__ == "__main__":
    sys.exit(main())
