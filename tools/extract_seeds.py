#!/usr/bin/env python3
"""Emit pwa/js/data.js from the v2 question bank."""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
BANK = os.path.join(ROOT, "pwa", "js", "question-bank.js")
DATA = os.path.join(ROOT, "pwa", "js", "data.js")

CATEGORIES = [
    "Percentage Calculation",
    "Percentage Increase / Decrease",
    "Discount & Sale Price",
    "Decimal Multiplication",
    "Decimal Division",
    "BODMAS / Order of Operations",
    "Speed, Distance & Time",
    "Ratio & Proportion",
    "Fractions",
    "Mental Arithmetic / Fast Calculation",
    "Geometry - Area",
    "Geometry - Volume",
]


def load_bank(path):
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"window\.QUESTION_BANK\s*=\s*(\[.*\]);", src, re.DOTALL)
    return json.loads(m.group(1))


def to_seed_js(questions):
    lines = []
    for q in questions:
        seed = {
            "id": q["id"] - 1000,
            "question": q["question"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "correctAnswer": q["correctAnswer"],
            "acceptedAnswers": q.get("acceptedAnswers") or [q["correctAnswer"]],
            "explanation": q.get("explanation", ""),
            "shortcut": q.get("explanation", ""),
            "mentalPattern": q.get("explanation", ""),
            "commonMistake": "",
            "unit": "",
            "type": "core",
        }
        lines.append("  " + json.dumps(seed, ensure_ascii=False) + ",")
    body = "\n".join(lines)
    return (
        "/* Mental Maths Practice — data.js (v2) */\n"
        "/* Contains all 600 validated questions across the 12 core categories.\n"
        " * Category names MUST stay in sync with:\n"
        " *   - tools/question_bank_v2/common.py  (CATEGORY_LIST)\n"
        " *   - pwa/js/hints.js                  (CATEGORY_HINTS, BUILDERS)\n"
        " *   - pwa/js/generator.js              (VALID_CATEGORIES)\n"
        " */\n"
        "window.QUESTIONS = [\n" + body + "\n];\n\n"
        "window.CATEGORIES = " + json.dumps(CATEGORIES, ensure_ascii=False) + ";\n\n"
        "window.DIFFICULTIES = " + json.dumps(["Easy", "Medium", "Hard"], ensure_ascii=False) + ";\n"
    )


def main():
    bank = load_bank(BANK)
    print(f"loaded {len(bank)} bank questions across {len(CATEGORIES)} categories")
    out = to_seed_js(bank)
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {DATA} ({len(out)} bytes)")


if __name__ == "__main__":
    main()
