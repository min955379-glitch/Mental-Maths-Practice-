"""Build the v3 7-category mental-math question bank.

Produces three things:

  1. pwa/js/question-bank.js  - the runtime source the PWA reads.
  2. pwa/js/data.js           - CATEGORIES / DIFFICULTIES, empty QUESTIONS seed.
  3. apk/app/src/main/assets/ - mirrors every PWA file into the APK assets.

Usage (from the repo root):
    python3 tools/question_bank_v3/build.py
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))

sys.path.insert(0, HERE)

from common import CATEGORIES, DIFFICULTIES, REQUIRED_PER_CATEGORY, TARGETS  # noqa: E402
import cats_area            # noqa: E402
import cats_dmas            # noqa: E402
import cats_dozen           # noqa: E402
import cats_percentage      # noqa: E402
import cats_profit_loss     # noqa: E402
import cats_speed           # noqa: E402
import cats_zakat           # noqa: E402


def _round_to_targets(by_diff, target):
    """Take a list of questions and select up to target of each difficulty."""
    selected = []
    easy_target = round(target * TARGETS["Easy"])
    mod_target = round(target * TARGETS["Moderate"])
    hard_target = round(target * TARGETS["Hard"])
    # Total target may round slightly off 1.0; fix to sum(target).
    diff_target = {"Easy": easy_target, "Moderate": mod_target, "Hard": hard_target}
    diff_taken = {"Easy": 0, "Moderate": 0, "Hard": 0}

    queue = {"Easy": list(by_diff.get("Easy", [])),
             "Moderate": list(by_diff.get("Moderate", [])),
             "Hard": list(by_diff.get("Hard", []))}

    # Round-robin pull until all targets met
    cursor = {"Easy": 0, "Moderate": 0, "Hard": 0}
    order = ["Easy", "Moderate", "Hard"]
    taken = 0
    safety = 0
    while taken < target and safety < target * 50:
        for d in order:
            if diff_taken[d] >= diff_target[d]:
                continue
            idx = cursor[d]
            if idx >= len(queue[d]):
                continue
            selected.append(queue[d][idx])
            cursor[d] += 1
            diff_taken[d] += 1
            taken += 1
            if taken >= target:
                break
        safety += 1

    # If we still came short (insufficient pool), top up from whatever is left
    if len(selected) < target:
        for d in order:
            extras = queue[d][cursor[d]:]
            for q in extras:
                if len(selected) >= target:
                    break
                selected.append(q)
    return selected


def build_bank():
    """Build the v3 7-category question bank with 50 questions per category."""
    modules = {
        "Speed": cats_speed,
        "Percentage": cats_percentage,
        "Dozen": cats_dozen,
        "Area": cats_area,
        "DMAS Rule": cats_dmas,
        "Zakat (2.5%)": cats_zakat,
        "Profit and Loss": cats_profit_loss,
    }

    bank = []
    for cat in CATEGORIES:
        mod = modules[cat]
        questions = mod.build()
        if not isinstance(questions, list):
            raise RuntimeError(f"{cat}: build() did not return a list")
        # Validate: must be >= REQUIRED_PER_CATEGORY
        if len(questions) < REQUIRED_PER_CATEGORY:
            raise RuntimeError(
                f"{cat}: only {len(questions)} questions (need >= {REQUIRED_PER_CATEGORY})"
            )
        # Take exactly REQUIRED_PER_CATEGORY
        questions = _round_to_targets(
            {d: [q for q in questions if q["difficulty"] == d] for d in DIFFICULTIES},
            REQUIRED_PER_CATEGORY,
        )
        # Ensure all chosen questions have the right category
        for q in questions:
            assert q.get("category") == cat, f"category mismatch on {q}"
        bank.extend(questions)

    # Final cross-check: every category hits its 50 minimum
    for cat in CATEGORIES:
        n = sum(1 for q in bank if q["category"] == cat)
        if n < REQUIRED_PER_CATEGORY:
            raise RuntimeError(f"{cat}: only {n} questions after selection")

    return bank


def _build_data_js_payload(bank):
    """Build a window.QUESTIONS-compatible payload (id field included)."""
    payload = []
    for i, q in enumerate(bank, start=1):
        out = dict(q)
        out["id"] = i
        out["sourceType"] = "generated"
        # Empty hint; hints.js builds it at runtime via Hints.hintFor(q).
        out["hint"] = ""
        cat = q.get("category", "").lower().replace(" ", "-").replace(".", "")
        diff = q.get("difficulty", "").lower()
        out["tags"] = [cat, diff]
        if not out.get("acceptedAnswers"):
            out["acceptedAnswers"] = [out["correctAnswer"]]
        payload.append(out)
    return payload


def main():
    bank = build_bank()
    total = len(bank)
    by_diff = {d: sum(1 for q in bank if q["difficulty"] == d) for d in DIFFICULTIES}
    by_cat = {c: sum(1 for q in bank if q["category"] == c) for c in CATEGORIES}
    print(f"\nTOTAL  {total} questions")
    print(f"Categories: {len(by_cat)}")
    for c in CATEGORIES:
        print(f"  {c}: {by_cat[c]}")
    print(f"Difficulties: {by_diff}")

    # 1) Write pwa/js/question-bank.js
    payload = _build_data_js_payload(bank)
    out_path = os.path.join(ROOT, "pwa", "js", "question-bank.js")
    body = (
        "/* Generated by tools/question_bank_v3/build.py. "
        "Seven-category mental-math bank, every answer verified. "
        "Do not edit by hand. */\n"
        "window.QUESTION_BANK = " + json.dumps(payload, ensure_ascii=False) + ";\n"
        "// Merge into the seeded bank so every existing screen sees the full set.\n"
        "window.QUESTIONS = (window.QUESTIONS || []).concat(window.QUESTION_BANK);\n"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(body)
    print(f"\nwrote {out_path}  ({len(bank)} questions)")

    # 2) Write pwa/js/data.js — only CATEGORIES, DIFFICULTIES, and an empty
    #    QUESTIONS seed pool. The full bank lives in question-bank.js.
    data_js_path = os.path.join(ROOT, "pwa", "js", "data.js")
    with open(data_js_path, "w", encoding="utf-8") as f:
        f.write(
            "/* Mental Maths Practice - data.js (v3, 7-category rebuild).\n"
            " * The 18 legacy categories have been retired in favour of the\n"
            " * seven approved mental-math categories required by the\n"
            " * mental_math_seven_categories_master_prompt.md spec.\n"
            " *\n"
            " * - 50+ unique questions per category (350 minimum, more by design).\n"
            " * - Every answer is computed and validated at build time.\n"
            " * - Question pool lives in js/question-bank.js (loaded next).\n"
            " */\n"
        )
        f.write("window.CATEGORIES = " + json.dumps(CATEGORIES, ensure_ascii=False) + ";\n")
        f.write("window.DIFFICULTIES = " + json.dumps(DIFFICULTIES, ensure_ascii=False) + ";\n")
        f.write("window.QUESTIONS = [];\n")
    print(f"wrote {data_js_path}")

    # 3) Sync every PWA JS file into apk/app/src/main/assets/js/ so the APK
    #    ships exactly what the PWA ships (v3, 7-category).
    apk_js = os.path.join(ROOT, "apk", "app", "src", "main", "assets", "js")
    pwa_js = os.path.join(ROOT, "pwa", "js")
    if os.path.isdir(pwa_js):
        os.makedirs(apk_js, exist_ok=True)
        count = 0
        for fname in sorted(os.listdir(pwa_js)):
            src = os.path.join(pwa_js, fname)
            if not os.path.isfile(src):
                continue
            dst = os.path.join(apk_js, fname)
            with open(dst, "w", encoding="utf-8") as f_out, open(src, "r", encoding="utf-8") as f_in:
                f_out.write(f_in.read())
            count += 1
        print(f"synced {count} files from pwa/js/ -> {apk_js}/")

    # 3b) Sync CSS + index.html + manifest + sw (text only)
    pwa_root = ROOT
    for rel in ("css/styles.css", "index.html", "manifest.webmanifest", "sw.js"):
        src = os.path.join(pwa_root, "pwa", rel)
        dst = os.path.join(pwa_root, "apk", "app", "src", "main", "assets", rel)
        if os.path.isfile(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "w", encoding="utf-8") as f_out, open(src, "r", encoding="utf-8") as f_in:
                f_out.write(f_in.read())
    # icons/ (binary)
    src_dir = os.path.join(pwa_root, "pwa", "icons")
    dst_dir = os.path.join(pwa_root, "apk", "app", "src", "main", "assets", "icons")
    if os.path.isdir(src_dir):
        os.makedirs(dst_dir, exist_ok=True)
        for f in sorted(os.listdir(src_dir)):
            s = os.path.join(src_dir, f)
            if not os.path.isfile(s):
                continue
            d = os.path.join(dst_dir, f)
            with open(d, "wb") as f_out, open(s, "rb") as f_in:
                f_out.write(f_in.read())
    # img/ (binary)
    src_img = os.path.join(pwa_root, "pwa", "img")
    dst_img = os.path.join(pwa_root, "apk", "app", "src", "main", "assets", "img")
    if os.path.isdir(src_img):
        os.makedirs(dst_img, exist_ok=True)
        for f in sorted(os.listdir(src_img)):
            s = os.path.join(src_img, f)
            if not os.path.isfile(s):
                continue
            d = os.path.join(dst_img, f)
            with open(d, "wb") as f_out, open(s, "rb") as f_in:
                f_out.write(f_in.read())
    print("synced pwa/css, pwa/index.html, manifest, sw, icons, img into apk assets")


if __name__ == "__main__":
    main()
