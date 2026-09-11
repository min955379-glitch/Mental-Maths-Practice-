#!/usr/bin/env python3
"""Measure the real rendered geometry of the quiz screen and the Contact Us
page in headless Chromium, at the viewport sizes the app has to support.

Usage:
    python3 tests/layout_check.py [base_url] [quiz|contact|all]

Prints one block per viewport with the bounding boxes of the quiz card, the
answer input, Submit Answer, Hint and Quit, plus hard pass/fail flags for the
things the user asked for: no horizontal overflow, the input inside the card
with equal margins, Submit Answer on one line, Hint/Quit aligned and not
overlapping.
"""
import json
import sys
import pathlib

from playwright.sync_api import sync_playwright

CHROME = "/home/user/.cache/pw/chrome-headless-shell-linux64/chrome-headless-shell"

SIZES = [
    ("small mobile", 320, 640, 2.0),
    ("mobile", 360, 740, 3.0),
    ("large mobile", 393, 800, 2.75),
    ("large mobile+", 412, 900, 2.6),
    ("phablet", 480, 900, 2.0),
    ("tablet", 768, 1024, 2.0),
    ("desktop", 1024, 800, 1.0),
    ("wide desktop", 1280, 800, 1.0),
]

MEASURE_QUIZ = """() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
             right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const card = document.getElementById('quizCard');
  const input = document.getElementById('qInput');
  const submit = document.getElementById('qSubmit');
  const hint = document.getElementById('qHint');
  const quit = document.getElementById('qQuit');
  const form = document.getElementById('quizForm');
  const cs = (el) => el ? getComputedStyle(el) : null;
  const cardCS = cs(card), inputCS = cs(input), subCS = cs(submit);
  const doc = document.scrollingElement;
  const padL = cardCS ? parseFloat(cardCS.paddingLeft) : 0;
  const padR = cardCS ? parseFloat(cardCS.paddingRight) : 0;
  const bL = cardCS ? parseFloat(cardCS.borderLeftWidth) : 0;
  const bR = cardCS ? parseFloat(cardCS.borderRightWidth) : 0;
  const cardBox = r(card);
  const content = cardBox ? { left: cardBox.x + bL + padL, right: cardBox.right - bR - padR } : null;
  // Count real line boxes: a min-height must not be mistaken for a wrap.
  const lineBoxes = (el) => {
    if (!el) return 0;
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getClientRects().length;
  };
  return {
    viewport: { w: innerWidth, h: innerHeight },
    docOverflow: +(doc.scrollWidth - doc.clientWidth).toFixed(1),
    bodyOverflow: +(document.body.scrollWidth - document.body.clientWidth).toFixed(1),
    card: cardBox, cardPad: { l: padL, r: padR }, content,
    form: r(form),
    input: r(input), inputCS: inputCS ? { boxSizing: inputCS.boxSizing, width: inputCS.width,
      marginL: inputCS.marginLeft, marginR: inputCS.marginRight, padding: inputCS.padding,
      border: inputCS.borderTopWidth + ' ' + inputCS.borderLeftWidth, fontSize: inputCS.fontSize } : null,
    submit: r(submit), submitLines: lineBoxes(submit),
    submitText: submit ? submit.textContent.trim() : null,
    submitScrollW: submit ? submit.scrollWidth : null, submitClientW: submit ? submit.clientWidth : null,
    hint: r(hint), hintHidden: hint ? hint.hidden : null,
    quit: r(quit),
    hintText: hint ? hint.textContent.trim() : null,
    quitText: quit ? quit.textContent.trim() : null,
  };
}"""

MEASURE_CONTACT = """() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
             right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const doc = document.scrollingElement;
  const wa = document.getElementById('whatsappBtn');
  const img = document.getElementById('developerPhoto');
  const overflowing = [];
  document.querySelectorAll('.contact-screen *').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width && (b.right > innerWidth + 0.6 || b.left < -0.6)) {
      overflowing.push(el.className || el.id || el.tagName);
    }
  });
  return {
    viewport: { w: innerWidth, h: innerHeight },
    docOverflow: +(doc.scrollWidth - doc.clientWidth).toFixed(1),
    title: (document.querySelector('.contact-screen h1') || {}).textContent,
    welcome: (document.getElementById('contactWelcome') || {}).textContent,
    devName: (document.getElementById('devName') || {}).textContent,
    devRole: (document.getElementById('devRole') || {}).textContent,
    photo: r(img), photoNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
    photoComplete: img ? img.complete : null,
    photoSrc: img ? img.getAttribute('src') : null,
    waBtn: r(wa), waHref: wa ? wa.getAttribute('href') : null,
    waTarget: wa ? wa.getAttribute('target') : null,
    waRel: wa ? wa.getAttribute('rel') : null,
    waLabel: wa ? (wa.textContent || '').trim().replace(/\\s+/g, ' ') : null,
    navContact: !!document.querySelector('.nav-item[data-route="contact"]'),
    overflowing,
  };
}"""


def check_quiz(m, name):
    """Turn the measured quiz geometry into pass/fail lines."""
    out = []
    card, inp = m["card"], m["input"]
    content = m["content"]
    ok = True

    def add(flag, msg):
        nonlocal ok
        out.append(("  PASS  " if flag else "  FAIL  ") + msg)
        if not flag:
            ok = False

    add(m["docOverflow"] <= 0.5, f"no horizontal page overflow (scrollWidth-clientWidth={m['docOverflow']})")
    if card and inp and content:
        add(inp["x"] >= content["left"] - 0.6, f"input left edge inside card content (in={inp['x']} min={content['left']:.1f})")
        add(inp["right"] <= content["right"] + 0.6, f"input right edge inside card content (in={inp['right']} max={content['right']:.1f})")
        add(inp["right"] <= card["right"] + 0.6, f"input does not cross the card border (in={inp['right']} card={card['right']})")
        gl = inp["x"] - content["left"]
        gr = content["right"] - inp["right"]
        add(abs(gl - gr) <= 1.0, f"equal left/right margins (left={gl:.1f} right={gr:.1f})")
        add(abs(inp["w"] - (content["right"] - content["left"])) <= 1.0,
            f"input width == card content width ({inp['w']} vs {content['right'] - content['left']:.1f})")
    s = m["submit"]
    if s:
        add(m["submitLines"] == 1, f"'Submit Answer' on one line ({m['submitLines']} line box(es))")
        add(s["h"] <= 52, f"Submit height not excessive ({s['h']}px)")
        add(s["h"] >= 44, f"Submit keeps a 44px touch target ({s['h']}px)")
        add(s["w"] <= 260, f"Submit width compact ({s['w']}px)")
        add(m["submitScrollW"] <= m["submitClientW"] + 1, "Submit label not clipped")
        if card and content:
            cx = (content["left"] + content["right"]) / 2
            add(abs((s["x"] + s["right"]) / 2 - cx) <= 1.5, f"Submit horizontally centred under the input (btn={((s['x']+s['right'])/2):.1f} card={cx:.1f})")
            add(s["y"] > inp["bottom"] - 0.6, "Submit sits below the input")
    h, q = m["hint"], m["quit"]
    if h and q and not m["hintHidden"]:
        add(h["y"] >= s["bottom"] - 0.6, "Hint/Quit row sits below Submit Answer")
        add(h["right"] <= q["x"] + 0.6, f"Hint and Quit do not overlap (hint.right={h['right']} quit.x={q['x']})")
        add(abs(h["w"] - q["w"]) <= 1.0, f"Hint and Quit have consistent width ({h['w']} vs {q['w']})")
        add(abs(h["y"] - q["y"]) <= 0.6, f"Hint and Quit vertically aligned (dy={abs(h['y']-q['y']):.1f})")
        add(h["x"] >= content["left"] - 0.6, "Hint does not touch the card edge")
        add(q["right"] <= content["right"] + 0.6, "Quit does not touch the card edge")
        add(h["h"] >= 40 and q["h"] >= 40, f"Hint/Quit touch targets >= 40px ({h['h']} / {q['h']})")
        add(s["h"] >= h["h"], "Submit is at least as tall as Hint/Quit (visual prominence)")
    return ok, out


def run(base, which):
    results = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for name, w, h, dpr in SIZES:
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr,
                                      is_mobile=(w < 700), has_touch=(w < 700))
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda msg: errors.append("console." + msg.type + ": " + msg.text)
                    if msg.type == "error" else None)
            if which in ("quiz", "all"):
                page.goto(base + "/index.html#/practice", wait_until="load")
                page.wait_for_selector("#qInput", timeout=15000)
                page.wait_for_timeout(250)
                m = page.evaluate(MEASURE_QUIZ)
                ok, lines = check_quiz(m, name)
                print(f"\n=== quiz @ {name} {w}x{h} dpr={dpr} -> {'OK' if ok else 'PROBLEMS'} ===")
                print("  card", m["card"], "content", {k: round(v, 1) for k, v in m["content"].items()})
                print("  input", m["input"], m["inputCS"])
                print("  submit", m["submit"], "lines", m["submitLines"], "scrollW", m["submitScrollW"], "clientW", m["submitClientW"])
                print("  hint", m["hint"], "quit", m["quit"])
                for ln in lines:
                    print(ln)
                results[f"quiz/{w}"] = ok
                if errors:
                    print("  JS ERRORS:", errors[:5])
            if which in ("contact", "all"):
                page.goto(base + "/index.html#/contact", wait_until="load")
                page.wait_for_selector(".contact-screen", timeout=15000)
                page.wait_for_timeout(350)
                m = page.evaluate(MEASURE_CONTACT)
                print(f"\n=== contact @ {name} {w}x{h} dpr={dpr} ===")
                print(json.dumps(m, indent=2)[:2200])
                if errors:
                    print("  JS ERRORS:", errors[:5])
            ctx.close()
        browser.close()
    print("\n==== SUMMARY ====")
    bad = [k for k, v in results.items() if not v]
    print(f"{len(results) - len(bad)}/{len(results)} viewport checks passed")
    if bad:
        print("problems at:", bad)
    return 1 if bad else 0


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
    which = sys.argv[2] if len(sys.argv) > 2 else "all"
    sys.exit(run(base, which))
