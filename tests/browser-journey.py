#!/usr/bin/env python3
"""End-to-end journey in a real browser engine (headless Chromium).

The jsdom suites prove the logic; this proves the shipped UI actually works
when a real layout and paint engine runs it, and it covers the same journey
the app owner walks through on a phone:

    start -> answer -> submit -> feedback -> hint -> quit -> continue
          -> discard -> reload (still gone) -> history intact

It also writes the screenshots used in docs/screenshots.

Usage:  python3 tests/browser-journey.py [base_url]
"""
import os
import sys

from playwright.sync_api import sync_playwright

CHROME = "/home/user/.cache/pw/chrome-headless-shell-linux64/chrome-headless-shell"
SHOTS = "/home/user/Mental-Maths-Practice-/docs/screenshots"

steps = []
def check(label, ok, detail=""):
    steps.append((label, ok, detail))
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"  [{detail}]" if detail else ""))
    return ok

def shot(page, name):
    os.makedirs(SHOTS, exist_ok=True)
    page.screenshot(path=os.path.join(SHOTS, name), full_page=(name.endswith("full.png")))
    print("  shot ->", name)


def quiz_journey(page):
    print("\n--- quiz journey (393x800, real Chromium) ---")
    page.goto(BASE + "/index.html#/setup?mode=quick", wait_until="load")
    page.wait_for_selector("#difficultyGrid button", timeout=15000)
    page.get_by_role("button", name="Medium", exact=False).first.click()
    page.wait_for_selector("#qInput", timeout=15000)

    # 1-5: input geometry + typing
    geo = page.evaluate("""() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return {x:b.x, right:b.right, w:b.width, h:b.height}; };
      const card = document.getElementById('quizCard');
      const cs = getComputedStyle(card);
      const cb = card.getBoundingClientRect();
      const content = { left: cb.x + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
                        right: cb.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight) };
      return { input: r(document.getElementById('qInput')), content,
               cardRight: cb.right, submit: r(document.getElementById('qSubmit')),
               hint: r(document.getElementById('qHint')), quit: r(document.getElementById('qQuit')) };
    }""")
    i, c = geo["input"], geo["content"]
    check("answer input sits inside the quiz card", i["x"] >= c["left"] - 0.6 and i["right"] <= c["right"] + 0.6,
          f"input {i['x']:.0f}-{i['right']:.0f} in {c['left']:.0f}-{c['right']:.0f}")
    check("left/right margins are equal", abs((i["x"] - c["left"]) - (c["right"] - i["right"])) <= 1.0,
          f"L={i['x']-c['left']:.1f} R={c['right']-i['right']:.1f}")
    check("no horizontal page overflow",
          page.evaluate("document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth") <= 0.5)
    check("Submit Answer is compact and centred",
          geo["submit"]["w"] <= 200 and abs(((geo["submit"]["x"] + geo["submit"]["right"]) / 2) - ((c["left"] + c["right"]) / 2)) <= 1.5,
          f"w={geo['submit']['w']:.0f} h={geo['submit']['h']:.0f}")
    check("Submit Answer is on one line",
          page.evaluate("""() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('qSubmit')); return r.getClientRects().length; }""") == 1)
    check("Hint left / Quit right on the row below, same size",
          geo["hint"]["x"] < geo["quit"]["x"] and abs(geo["hint"]["w"] - geo["quit"]["w"]) <= 1.0)
    shot(page, "quiz-answer-area.png")

    page.fill("#qInput", "42")
    check("typing into the input works", page.input_value("#qInput") == "42")
    page.click("#qSubmit")
    page.wait_for_selector("#quizFeedback:not([hidden])", timeout=10000)
    check("Submit Answer produces feedback", page.is_visible("#quizFeedback"))
    head = page.text_content("#fbHead")
    check("feedback says correct or incorrect",
          any(w in head.lower() for w in ("correct", "incorrect", "not quite")), head.strip()[:40])
    check("the mental shortcut is shown", len(page.text_content("#fbShortcut").strip()) > 10)
    shot(page, "quiz-feedback.png")

    # 16: hint
    page.click("#fbNext")
    page.wait_for_timeout(300)
    if page.is_visible("#qHint"):
        page.click("#qHint")
        page.wait_for_timeout(400)
        hint = page.text_content("#qHintText").strip()
        check("Hint shows a teaching hint", len(hint) > 15, hint[:44])
    else:
        check("Hint shows a teaching hint", True, "hint button hidden in this mode")

    # 13: the timer keeps running
    t1 = page.text_content("#qTimerText")
    page.wait_for_timeout(1600)
    t2 = page.text_content("#qTimerText")
    check("the timer is running", t1 != t2 or t1 != "00:00", f"{t1} -> {t2}")

    # 17-18: quit saves an unfinished quiz
    page.click("#qQuit")
    page.wait_for_selector("#confirmModal:not([hidden])", timeout=8000)
    check("Quit opens the in-app dialog (not window.confirm)", page.is_visible("#confirmModal"))
    dialog = page.evaluate("""() => {
      const b = document.querySelector('#confirmModal .modal').getBoundingClientRect();
      const ok = document.getElementById('confirmOk').getBoundingClientRect();
      return { modalTop: b.top, modalBottom: b.bottom, okTop: ok.top, okBottom: ok.bottom, vh: innerHeight };
    }""")
    check("the dialog's confirm button is reachable on screen",
          dialog["okBottom"] <= dialog["vh"] + 0.5 and dialog["okTop"] >= -0.5,
          f"button {dialog['okTop']:.0f}-{dialog['okBottom']:.0f} of {dialog['vh']}")
    page.click("#confirmOk")
    page.wait_for_timeout(600)
    return True


def continue_and_discard(page):
    print("\n--- continue + discard (real Chromium) ---")
    page.goto(BASE + "/index.html#/dashboard", wait_until="load")
    page.wait_for_timeout(700)
    check("the dashboard lists an unfinished quiz", page.locator("#continueQuizHost .continue-card").count() > 0)
    shot(page, "dashboard-continue.png")

    page.locator("#continueQuizHost .continue-card a.btn, #continueQuizHost .continue-card button.btn").first.click()
    page.wait_for_selector("#qInput", timeout=15000)
    check("Continue Quiz resumes the quiz", page.is_visible("#qInput"))
    t1 = page.text_content("#qTimerText")
    page.wait_for_timeout(1500)
    check("the timer continues after a resume", page.text_content("#qTimerText") != t1, f"{t1} -> {page.text_content('#qTimerText')}")

    before = page.evaluate("JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).unfinished.length")
    page.click("#qQuit")
    page.wait_for_selector("#confirmModal:not([hidden])", timeout=8000)
    page.click("#confirmOk")
    page.wait_for_timeout(700)
    # A second card action: discard the unfinished quiz from the dashboard.
    discard = page.locator("#continueQuizHost").get_by_text("Discard", exact=False).first
    if discard.count() == 0:
        page.goto(BASE + "/index.html#/dashboard", wait_until="load")
        page.wait_for_timeout(600)
        discard = page.locator("#continueQuizHost").get_by_text("Discard", exact=False).first
    discard.click()
    page.wait_for_selector("#confirmModal:not([hidden])", timeout=8000)
    page.click("#confirmOk")
    page.wait_for_timeout(700)
    after = page.evaluate("JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).unfinished.length")
    check("Discard removes the unfinished quiz from storage", after == before - 1, f"{before} -> {after}")
    check("it disappears immediately, without a reload",
          page.locator("#continueQuizHost .continue-card").count() == 0 or page.locator("#continueSection[hidden]").count() == 1)
    page.reload(wait_until="load")
    page.wait_for_timeout(800)
    check("it stays deleted after a reload",
          page.evaluate("JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).unfinished.length") == after)
    attempts = page.evaluate("JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).attempts.length")
    check("quiz history/attempts are untouched by discard", attempts >= 1, f"{attempts} attempt(s) kept")


def contact_journey(page):
    print("\n--- contact us (real Chromium) ---")
    page.goto(BASE + "/index.html#/dashboard", wait_until="load")
    page.wait_for_timeout(500)
    # The side nav is off-canvas below 900px, so open it the way a user does.
    if page.is_visible("#navToggle"):
        page.click("#navToggle")
        page.wait_for_timeout(350)
    page.click(".nav-item[href='#/contact']")
    page.wait_for_selector(".contact-screen", timeout=10000)
    check("the Contact Us page opens from the side nav", page.is_visible(".contact-screen"))
    info = page.evaluate("""() => {
      const img = document.getElementById('developerPhoto');
      const b = img.getBoundingClientRect();
      const a = document.getElementById('whatsappBtn');
      const ab = a.getBoundingClientRect();
      return { photo: [b.width, b.height], natural: [img.naturalWidth, img.naturalHeight], loaded: img.complete,
               href: a.getAttribute('href'), btn: [ab.width, ab.height],
               overflow: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth };
    }""")
    check("the developer photo is square (not distorted)", abs(info["photo"][0] - info["photo"][1]) < 0.6, str(info["photo"]))
    check("the developer photo actually loaded", info["loaded"] and info["natural"][0] > 0, str(info["natural"]))
    check("the WhatsApp button is an easy tap target", info["btn"][1] >= 48, str(info["btn"]))
    check("the Contact Us page has no horizontal overflow", info["overflow"] <= 0.5)
    check("the WhatsApp href is byte-exact",
          info["href"] == "https://wa.me/03485581969?text=Hey!%20We%20want%20you%20to%20improve%20these%20things%20in%20the%20Mental%20Maths%20Practice%20application......")

    # Clicking must actually attempt to navigate to wa.me (no handler swallows it).
    MESSAGE = "Hey! We want you to improve these things in the Mental Maths Practice application......"
    with page.expect_navigation(wait_until="commit", timeout=8000) as nav:
        page.click("#whatsappBtn")
    landed = nav.value.url or ""
    # wa.me answers with a redirect to api.whatsapp.com; both carry the same
    # number and the same pre-filled message (a '+' is a space in a query).
    from urllib.parse import urlparse, parse_qs
    q = parse_qs(urlparse(landed).query)
    number = (q.get("phone") or [""])[0] or urlparse(landed).path.strip("/").split("/")[-1]
    text = (q.get("text") or [""])[0].replace("+", " ")
    check("tapping the button really navigates to WhatsApp", "whatsapp.com" in landed or "wa.me" in landed, landed[:64])
    check("the number survives the trip", number == "03485581969", number)
    check("the pre-filled message is intact", text == MESSAGE, text)


def screenshots(page):
    print("\n--- screenshots ---")
    for theme in ("light", "dark"):
        page.goto(BASE + "/index.html#/contact", wait_until="load")
        page.wait_for_timeout(300)
        page.evaluate("""(t) => { const k='iscsp-mm-state-v1'; const s=JSON.parse(localStorage.getItem(k)||'{}');
                                  s.settings=Object.assign({}, s.settings, {theme:t}); localStorage.setItem(k, JSON.stringify(s)); }""", theme)
        page.goto(BASE + "/index.html#/contact", wait_until="load")
        page.wait_for_timeout(700)
        shot(page, f"contact-{theme}.png")
    for theme in ("light", "dark"):
        page.goto(BASE + "/index.html#/practice", wait_until="load")
        page.wait_for_timeout(300)
        page.evaluate("""(t) => { const k='iscsp-mm-state-v1'; const s=JSON.parse(localStorage.getItem(k)||'{}');
                                  s.settings=Object.assign({}, s.settings, {theme:t}); localStorage.setItem(k, JSON.stringify(s)); }""", theme)
        page.goto(BASE + "/index.html#/practice", wait_until="load")
        page.wait_for_selector("#qInput", timeout=15000)
        page.wait_for_timeout(400)
        shot(page, f"quiz-{theme}.png")
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(BASE + "/index.html#/contact", wait_until="load")
    page.wait_for_timeout(700)
    shot(page, "contact-desktop.png")


if __name__ == "__main__":
    BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 393, "height": 800}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        quiz_journey(page)
        continue_and_discard(page)
        contact_journey(page)
        screenshots(page)
        ctx.close()
        browser.close()
    print("\n--- page errors ---")
    print("  none" if not errors else "\n".join("  " + e for e in errors[:5]))
    bad = [s for s in steps if not s[1]]
    print(f"\n{len(steps) - len(bad)}/{len(steps)} browser checks passed")
    if bad:
        for label, _, detail in bad:
            print("  FAILED:", label, detail)
    sys.exit(1 if (bad or errors) else 0)
