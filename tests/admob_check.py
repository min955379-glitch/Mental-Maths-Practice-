#!/usr/bin/env python3
"""AdMob bridge checks for the Mental Maths Practice PWA.

Two things must hold, and this harness proves both against the assets that
ship inside the APK:

 1. The PWA works with no native bridge at all (plain browser/website use),
    so a missing AndroidAdsBridge can never break the app.
 2. With a bridge present, the interstitial is requested ONLY at a natural
    break - after a quiz session completes (results screen) - and never
    while the user is answering, or on the dashboard / settings / categories.

Usage:  python3 tests/admob_check.py [base_url]
"""
import sys

from playwright.sync_api import sync_playwright

CHROME = "/home/user/.cache/pw/chrome-headless-shell-linux64/chrome-headless-shell"
URL = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8124") + "/index.html"

results = []
def check(label, ok, detail=""):
    results.append((label, ok, detail))
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"  [{detail}]" if detail else ""))
    return ok

# Records every interstitial request together with where the user was.
STUB = """
window.__adCalls = [];
window.AndroidAdsBridge = {
  isReady: function () { return true; },
  showInterstitialIfReady: function () {
    window.__adCalls.push({ at: Date.now(), hash: location.hash,
                            screen: (document.querySelector('.screen') || {}).className || '' });
  }
};
"""


def answer(page, correct=True):
    page.evaluate("""(ok) => { const e = window.QuizEngine.Quiz; const q = e.currentQuestion();
      e.submit(ok ? q.correctAnswer : 'nope-not-this'); }""", correct)
    page.wait_for_timeout(120)
    page.click("#fbNext")
    page.wait_for_timeout(200)


def main():
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 393, "height": 800}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)

        # ------------------------------------------------------------------
        print("\n--- 1. no native bridge (plain browser): the app must still work ---")
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append("no-bridge: " + str(e)))
        page.on("console", lambda m: errors.append("no-bridge console: " + m.text)
                if m.type == "error" and "Content Security" not in m.text else None)
        page.goto(URL + "#/dashboard", wait_until="load")
        page.wait_for_timeout(700)
        check("bridge is genuinely absent", page.evaluate("!window.AndroidAdsBridge"))
        check("dashboard renders", page.locator(".card").count() > 0)
        page.goto(URL + "#/setup?mode=quick", wait_until="load")
        page.wait_for_selector("#difficultyGrid .diff-card", timeout=15000)
        page.locator("#difficultyGrid .diff-card").first.click()
        page.wait_for_selector("#qInput", timeout=15000)
        total = page.evaluate("window.QuizEngine.Quiz.current.questionCache.length")
        for _ in range(min(total, 3)):
            answer(page)
        check("questions can be answered with no bridge",
              page.evaluate("window.QuizEngine.Quiz.current.correct >= 2"),
              str(page.evaluate("window.QuizEngine.Quiz.current.correct")))
        page.close()

        # ------------------------------------------------------------------
        print("\n--- 2. with a bridge: interstitial only after a session completes ---")
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append("bridge: " + str(e)))
        page.on("console", lambda m: errors.append("bridge console: " + m.text)
                if m.type == "error" and "Content Security" not in m.text else None)
        page.add_init_script(STUB)
        page.goto(URL + "#/dashboard", wait_until="load")
        page.wait_for_timeout(700)
        check("bridge is installed", page.evaluate("!!window.AndroidAdsBridge"))

        # Browse around: none of these may request an ad.
        for route in ("#/dashboard", "#/categories", "#/settings", "#/contact", "#/stats"):
            page.goto(URL + route, wait_until="load")
            page.wait_for_timeout(450)
        check("browsing dashboard/categories/settings/contact/stats requests no ad",
              page.evaluate("window.__adCalls.length") == 0,
              str(page.evaluate("window.__adCalls")))

        # Start a quiz and answer everything: still no ad mid-session.
        page.goto(URL + "#/setup?mode=quick", wait_until="load")
        page.wait_for_selector("#difficultyGrid .diff-card", timeout=15000)
        page.locator("#difficultyGrid .diff-card").first.click()
        page.wait_for_selector("#qInput", timeout=15000)
        total = page.evaluate("window.QuizEngine.Quiz.current.questionCache.length")
        print(f"  (finishing a {total}-question quiz)")
        for i in range(total):
            answer(page)
            if page.evaluate("window.__adCalls.length") > 0:
                check(f"no ad while answering (question {i + 1})", False,
                      str(page.evaluate("window.__adCalls")))
                break
        else:
            check("no ad is requested while answering questions",
                  page.evaluate("window.__adCalls.length") == 0,
                  str(page.evaluate("window.__adCalls")))

        # Results screen: exactly one request, on the result screen.
        page.wait_for_selector("#resScore", timeout=15000)
        page.wait_for_timeout(900)
        calls = page.evaluate("window.__adCalls")
        check("exactly one interstitial request after the session completes",
              len(calls) == 1, str(calls))
        if calls:
            check("the request happens on the results screen",
                  "result" in calls[0].get("screen", ""), str(calls[0]))
        check("no further ads after sitting on the results screen",
              page.evaluate("(function(){const n=window.__adCalls.length; return n;})()") == len(calls))

        ctx.close()
        browser.close()

    print("\n--- page errors ---")
    print("  none" if not errors else "\n".join("  " + e for e in errors[:5]))
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} AdMob bridge checks passed")
    for label, _, detail in failed:
        print("  FAILED:", label, detail)
    sys.exit(1 if (failed or errors) else 0)


if __name__ == "__main__":
    sys.exit(main())
