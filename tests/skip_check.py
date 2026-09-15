#!/usr/bin/env python3
"""Skip question - end-to-end checks in a real browser engine.

Taps the Skip button the way a person would: the question has to move to the
back of the queue, come back at the end, cost nothing (no attempt, no wrong
answer), survive a quit + resume, and show up on the results screen. Also
checks the three-button action row from 320px to 1280px.

Usage:  python3 tests/skip_check.py [base_url]
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

def on_console(m):
    if m.type == "error" and "Content Security Policy directive" not in m.text:
        errors.append("console." + m.type + ": " + m.text)


def start_quiz(page, mode="quick"):
    page.goto(URL + "#/setup?mode=" + mode, wait_until="load")
    page.wait_for_selector("#difficultyGrid .diff-card", timeout=15000)
    page.locator("#difficultyGrid .diff-card").first.click()
    page.wait_for_selector("#qInput", timeout=15000)
    return page.evaluate("window.QuizEngine.Quiz.current.questionCache.length")

def current(page):
    return page.evaluate("""() => { const e = window.QuizEngine.Quiz; const q = e.currentQuestion();
      return { id: q.id, text: q.question, index: e.index, total: e.current.questionCache.length,
               skipped: e.current.skipped || 0, correct: e.current.correct, incorrect: e.current.incorrect,
               progress: document.getElementById('qProgress').textContent,
               tag: !document.getElementById('qSkipTag').hidden }; }""")

def answer_current(page, correct=True):
    page.evaluate("""(ok) => { const e = window.QuizEngine.Quiz; const q = e.currentQuestion();
      e.submit(ok ? q.correctAnswer : 'definitely-not-the-answer'); }""", correct)
    page.wait_for_timeout(120)
    page.click("#fbNext")
    page.wait_for_timeout(220)


def main():
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 393, "height": 800}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", on_console)

        print("\n--- the button ---")
        page.goto(URL + "#/dashboard", wait_until="load")
        total = start_quiz(page)
        print(f"  (quiz of {total} questions)")
        box = page.evaluate("""() => ['qSubmit','qHint','qSkip','qQuit'].map((id) => {
          const b = document.getElementById(id); const r = b.getBoundingClientRect();
          return { id, w: Math.round(r.width), h: Math.round(r.height), hidden: b.hidden,
                   clipped: b.scrollWidth > b.clientWidth + 1, label: b.textContent.trim() };
        })""")
        for b in box:
            print(f"    {b['id']:8s} {b['w']:4d}x{b['h']:3d}  {'hidden' if b['hidden'] else b['label']}")
        check("Skip is on screen next to Hint and Quit", all(b["w"] > 0 for b in box))
        check("the three secondary buttons are all comfortable to tap",
              all(b["h"] >= 44 for b in box if b["id"] != "qSubmit"), str([b["h"] for b in box]))
        check("no label is clipped", not any(b["clipped"] for b in box))

        print("\n--- skipping ---")
        first = current(page)
        page.click("#qSkip")
        page.wait_for_timeout(300)
        after = current(page)
        check("Skip shows the next question", after["id"] != first["id"], f"{first['id']} -> {after['id']}")
        check("the position does not jump about", after["progress"] == first["progress"], after["progress"])
        check("the app says what happened", "Skipped" in page.text_content("#toast"), page.text_content("#toast"))
        check("one skip counted, nothing scored",
              after["skipped"] == 1 and after["correct"] == 0 and after["incorrect"] == 0, str(after))
        check("no attempt was recorded",
              page.evaluate("JSON.parse(localStorage.getItem('iscsp-mm-state-v1')).attempts.length") == 0)
        order = page.evaluate("window.QuizEngine.Quiz.current.questionCache.map(q => q.id)")
        check("the skipped question went to the back of the queue", order[-1] == first["id"], str(order[-2:]))

        print("\n--- walk to the end: the skipped question comes back ---")
        for i in range(total - 1):          # walk to the last slot in the queue
            answer_current(page)
        back = current(page)
        check("the last question is the one that was skipped", back["id"] == first["id"], f"{back['id']}")
        check("the screen says it was skipped earlier", back["tag"] is True)
        # Already skipped once: Skip must refuse instead of cycling forever.
        page.click("#qSkip")
        page.wait_for_timeout(250)
        check("a question cannot be skipped twice",
              "already skipped" in page.text_content("#toast").lower() and current(page)["id"] == first["id"],
              page.text_content("#toast")[:60])
        check("the skip counter did not move", current(page)["skipped"] == 1)

        print("\n--- finish ---")
        answer_current(page)
        page.wait_for_selector("#resScore", timeout=15000)
        res = page.evaluate("""() => ({
          score: document.getElementById('resScore').textContent,
          correct: document.getElementById('resCorrect').textContent,
          wrong: document.getElementById('resWrong').textContent,
          skippedWrap: !document.getElementById('resSkippedWrap').hidden,
          skipped: document.getElementById('resSkipped').textContent,
          accuracy: document.getElementById('resAccuracy').textContent,
        })""")
        print("   ", res)
        check("every question was answered", res["score"] == f"{total} / {total}", res["score"])
        check("the results report the skip", res["skippedWrap"] and res["skipped"] == "1", str(res["skipped"]))
        check("skipping never cost a correct answer", res["wrong"] == "0" and res["accuracy"] == "100%", str(res))
        ctx.close()

        print("\n--- skip, quit, resume ---")
        ctx2 = browser.new_context(viewport={"width": 393, "height": 800}, device_scale_factor=2,
                                   is_mobile=True, has_touch=True)
        p2 = ctx2.new_page()
        p2.on("pageerror", lambda e: errors.append(str(e)))
        p2.on("console", on_console)
        start_quiz(p2)
        skipped_id = current(p2)["id"]
        p2.click("#qSkip")
        p2.wait_for_timeout(250)
        order_before = p2.evaluate("window.QuizEngine.Quiz.current.questionCache.map(q => q.id)")
        p2.click("#qQuit")
        p2.wait_for_selector("#confirmModal:not([hidden])", timeout=8000)
        p2.click("#confirmOk")
        p2.wait_for_timeout(400)
        p2.goto(URL + "#/dashboard", wait_until="load")
        p2.wait_for_timeout(300)
        # The dashboard card's own Continue Quiz button.
        resumed = p2.evaluate("""() => {
          const btn = [...document.querySelectorAll('#continueQuizHost button')]
            .find((b) => /continue|resume/i.test(b.textContent));
          if (btn) { btn.click(); return 'clicked'; }
          return 'none';
        }""")
        p2.wait_for_timeout(600)
        if resumed == "clicked":
            p2.wait_for_selector("#qInput", timeout=15000)
            after_resume = p2.evaluate("""() => { const e = window.QuizEngine.Quiz;
              return { order: e.current.questionCache.map(q => q.id), skipped: e.current.skipped || 0,
                       flagged: e.progress.entries.filter(x => x.skipped).length }; }""")
            check("the rotated queue survives a quit + resume", after_resume["order"] == order_before)
            check("the skipped question is still flagged after resuming",
                  after_resume["skipped"] == 1 and after_resume["flagged"] == 1 and after_resume["order"][-1] == skipped_id,
                  str(after_resume["skipped"]))
        else:
            check("the unfinished quiz is offered on the dashboard", False, "no continue card found")
        ctx2.close()

        print("\n--- skip with the keyboard ---")
        ctx3 = browser.new_context(viewport={"width": 768, "height": 900})
        p3 = ctx3.new_page()
        p3.on("pageerror", lambda e: errors.append(str(e)))
        p3.on("console", on_console)
        start_quiz(p3)
        before = current(p3)
        p3.focus("#qSkip")
        p3.keyboard.press("Enter")
        p3.wait_for_timeout(300)
        check("Skip works from the keyboard", current(p3)["id"] != before["id"])
        ctx3.close()

        print("\n--- responsive: three buttons, no overflow ---")
        for name, w, h in (("small mobile", 320, 640), ("mobile", 360, 740), ("large mobile", 393, 800),
                           ("large mobile+", 412, 900), ("tablet", 768, 1024), ("desktop", 1280, 800)):
            c = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2,
                                    is_mobile=(w < 700), has_touch=(w < 700))
            pg = c.new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.on("console", on_console)
            start_quiz(pg)
            m = pg.evaluate("""() => {
              const row = document.getElementById('quizActions').getBoundingClientRect();
              const btns = ['qHint','qSkip','qQuit'].map((id) => {
                const b = document.getElementById(id); const r = b.getBoundingClientRect();
                const label = b.querySelector('svg').nextSibling;
                return { id, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right),
                         clipped: b.scrollWidth > b.clientWidth + 1, bottom: Math.round(r.bottom) };
              });
              return { rowRight: Math.round(row.right), rowLeft: Math.round(row.left),
                       card: Math.round(document.getElementById('quizCard').getBoundingClientRect().right),
                       overflow: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
                       btns };
            }""")
            ok = (m["overflow"] <= 0.5 and all(b["clipped"] is False for b in m["btns"])
                  and all(b["h"] >= 44 for b in m["btns"])
                  and all(b["right"] <= m["card"] + 0.5 for b in m["btns"]))
            check(f"{name} {w}x{h}: Hint / Skip / Quit fit and stay inside the card", ok,
                  " ".join(f"{b['id']}={b['w']}x{b['h']}" for b in m["btns"]) + f" overflow={m['overflow']}")
            if w == 393:
                os.makedirs(SHOTS, exist_ok=True)
                pg.screenshot(path=os.path.join(SHOTS, "quiz-skip-button.png"))
                print("  shot -> quiz-skip-button.png")
            c.close()
        browser.close()

    print("\n--- page errors ---")
    print("  none" if not errors else "\n".join("  " + e for e in errors[:5]))
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} skip checks passed")
    for label, _, detail in failed:
        print("  FAILED:", label, detail)
    sys.exit(1 if (failed or errors) else 0)


if __name__ == "__main__":
    sys.exit(main())
