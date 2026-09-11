#!/usr/bin/env python3
"""Build the Mental Maths question bank.

Every question is generated from a family: `gen` picks the numbers, `answer`
computes the result with exact rational arithmetic, and `verify` re-derives the
same value from a different direction. Nothing is typed by hand, and the whole
bank is rejected by `validate()` if any check fails, so a wrong answer key can
never reach the app.

Usage:  python3 tools/question_bank/build.py [--target 20]
"""
import argparse
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import cats1, cats2, cats3, cats4, cats5, cats6, cats7          # noqa: E402
from common import (CATEGORY_LIST, assign_ids, sanitise, to_js,   # noqa: E402
                    validate)

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "pwa", "js", "question-bank.js")

SEED = 20240517
DIFFS = ["Easy", "Medium", "Hard"]
START_ID = 1000          # the hand-written seeds in data.js are 1..50
MIN_PER_CELL = 17        # the bank must never fall below ~17/17/16 per category


def all_families():
    return (cats1.families() + cats2.families() + cats3.families()
            + cats4.families() + cats5.families() + cats6.families()
            + cats7.families())


def norm(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def build_cell(families, target, rng, seen=None):
    """Round-robin over the families until `target` unique questions exist.

    `seen` is shared across every cell, so the SAME question can never appear
    twice in the bank even when two difficulties draw from one pattern.
    """
    order = list(families)
    rng.shuffle(order)
    out = []
    seen = set() if seen is None else seen

    stall = 0
    while len(out) < target and stall < 8:
        added = 0
        for fam in order:
            if len(out) >= target:
                break
            for _ in range(6):                      # a few draws per family
                q = fam.make(rng)
                key = norm(q["question"])
                if key in seen:
                    continue
                seen.add(key)
                out.append(q)
                added += 1
                break
        if added == 0:
            stall += 1                              # the family space is spent
        else:
            stall = 0
    return out


def build(target):
    rng = random.Random(SEED)
    families = all_families()
    by_cell = {}
    for fam in families:
        by_cell.setdefault((fam.category, fam.difficulty), []).append(fam)

    bank, report, seen = [], {}, set()
    for cat in CATEGORY_LIST:
        for diff in DIFFS:
            cell = build_cell(by_cell.get((cat, diff), []), target, rng, seen)
            report[(cat, diff)] = len(cell)
            bank.extend(cell)

    # stable ordering: category order, then easy -> hard
    diff_rank = {d: i for i, d in enumerate(DIFFS)}
    cat_rank = {c: i for i, c in enumerate(CATEGORY_LIST)}
    bank.sort(key=lambda q: (cat_rank.get(q["category"], 99),
                             diff_rank.get(q["difficulty"], 9)))

    assign_ids(bank)                        # readable bank-... ids first
    for i, q in enumerate(bank):            # then the numeric id the app uses
        q["id"] = START_ID + i
        q["sourceType"] = "seed"
        accepted = [sanitise(a) for a in q.get("acceptedAnswers", [])]
        if q["unit"] == "%" and not q["correctAnswer"].endswith("%"):
            # percentages read better as "25%" than "25" with a unit label
            bare = q["correctAnswer"]
            q["correctAnswer"] = bare + "%"
            accepted = [bare, bare + " percent"] + accepted
        q["acceptedAnswers"] = [a for a in accepted if a != q["correctAnswer"]]
    return bank, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=20,
                    help="questions per (category, difficulty) cell")
    args = ap.parse_args()

    bank, report = build(args.target)
    validate(bank)                          # raises on any inconsistency

    short = [(c, d, n) for (c, d), n in sorted(report.items()) if n < MIN_PER_CELL]
    if short:
        print("WARNING cells below the minimum (%d):" % MIN_PER_CELL)
        for c, d, n in short:
            print("   %-24s %-7s %d" % (c, d, n))

    count = to_js(bank, OUT)
    size_kb = os.path.getsize(OUT) / 1024.0

    print("\n%-24s %6s %6s %6s %6s" % ("Category", "Easy", "Medium", "Hard", "Total"))
    print("-" * 54)
    totals = {"Easy": 0, "Medium": 0, "Hard": 0}
    for cat in CATEGORY_LIST:
        row = [report.get((cat, d), 0) for d in DIFFS]
        for d, n in zip(DIFFS, row):
            totals[d] += n
        print("%-24s %6d %6d %6d %6d" % (cat, row[0], row[1], row[2], sum(row)))
    print("-" * 54)
    print("%-24s %6d %6d %6d %6d" % ("TOTAL", totals["Easy"], totals["Medium"],
                                     totals["Hard"], len(bank)))
    print("\nwrote %s  (%d questions, %.1f KB)" % (OUT, count, size_kb))
    return 0


if __name__ == "__main__":
    sys.exit(main())
