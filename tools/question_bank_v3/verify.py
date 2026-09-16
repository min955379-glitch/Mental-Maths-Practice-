"""Independent verifier for the v3 bank.

Loads pwa/js/question-bank.js (the runtime source the PWA actually
reads), parses the JSON array WITHOUT importing any of the builders,
and re-derives every question's answer from the question text alone.

Run from the repo root:
    python3 tools/question_bank_v3/verify.py

The verifier understands every category and shape the v3 builders emit.
For unsupported shapes (a generator that slipped past verification at
build time), the verifier fails fast and points at the offending
question.
"""

import json
import os
import re
import sys
from fractions import Fraction


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))

ALLOWED_CATEGORIES = {
    "Speed",
    "Percentage",
    "Dozen",
    "Area",
    "DMAS Rule",
    "Zakat (2.5%)",
    "Profit and Loss",
}

ALLOWED_DIFFICULTIES = {"Easy", "Moderate", "Hard"}

BANK_PATH = os.path.join(ROOT, "pwa", "js", "question-bank.js")


def _load_bank():
    src = open(BANK_PATH, "r", encoding="utf-8").read()
    m = re.search(r"window\.QUESTION_BANK\s*=\s*(\[.*\]);", src, re.DOTALL)
    if not m:
        raise SystemExit("ERROR: cannot find the question-bank array")
    return json.loads(m.group(1))


def _normalise_answer(s):
    """Strip an optional unit suffix from a stored answer string."""
    s = str(s).strip()
    for suffix in (" rupees", "%", " percent", " km", " km/h", " hours",
                   " days", " dozen", " m2", " sq m"):
        if s.endswith(suffix):
            s = s[:-len(suffix)].strip()
    return s


def _format_number(n):
    """Match the bank's answer formatter exactly."""
    n = Fraction(n)
    if n.denominator == 1:
        return str(int(n))
    f = float(n)
    s = f"{f:.4f}".rstrip("0").rstrip(".")
    return s


def _expected_dmas_answer(expr):
    allowed = set("0123456789+-*/().  ")
    if any(c not in allowed for c in expr):
        raise RuntimeError(f"unexpected character in DMAS expression: {expr!r}")
    result = Fraction(eval(expr, {"__builtins__": {}}, {}))
    if result.denominator != 1:
        raise RuntimeError(f"non-integer DMAS result for {expr!r}: {result}")
    return int(result)


def _derive_expected(question):
    """Re-derive the expected answer for a single question."""
    text = question.get("question", "")
    cat = question.get("category")
    if not cat:
        raise RuntimeError(f"missing category")

    if cat == "Speed":
        # Patterns we recognise:
        #   'A vehicle travels at S km/h. ... how many km in M minutes?'
        #   'At S km/h, how many hours does it take to travel D km?'
        #   'A vehicle covers D km in H hours. What is its speed in km/h?'
        m = re.search(r"at (\d+) km/h.*?(\d+) minutes?", text)
        if m:
            s, mins = int(m.group(1)), int(m.group(2))
            return Fraction(s * mins, 60)
        m = re.search(r"At (\d+) km/h.*?travel (\d+) km", text)
        if m:
            s, d = int(m.group(1)), int(m.group(2))
            if d % s != 0:
                raise RuntimeError(f"non-integer hours for {text!r}")
            return Fraction(d // s)
        m = re.search(r"covers (\d+) km in (\d+) hours", text)
        if m:
            d, h = int(m.group(1)), int(m.group(2))
            if h == 0:
                raise RuntimeError(f"zero time for {text!r}")
            if d % h != 0:
                raise RuntimeError(f"non-integer speed for {text!r}")
            return Fraction(d // h)
        raise RuntimeError(f"unrecognised Speed shape: {text!r}")

    if cat == "Percentage":
        # 'What is X% of N?' -> X*N/100
        m = re.search(r"What is (\d+)% of (\d+)", text)
        if m:
            pct, n = int(m.group(1)), int(m.group(2))
            return Fraction(pct * n, 100)
        # 'What percentage is X of Y?' -> X/Y * 100
        m = re.search(r"What percentage is (\d+) of (\d+)", text)
        if m:
            part, whole = int(m.group(1)), int(m.group(2))
            return Fraction(part * 100, whole)
        raise RuntimeError(f"unrecognised Percentage shape: {text!r}")

    if cat == "Dozen":
        # 'How many ITEMS are in N dozen?' -> N*12
        m = re.search(r"How many \w+ are in (\d+) dozen", text)
        if m:
            return Fraction(int(m.group(1)) * 12)
        # 'If 1 dozen ITEMS costs P rupees, what is the cost of N dozen ITEMS?' -> N*P
        m = re.search(r"1 dozen \w+ costs (\d+) rupees.*?cost of (\d+) dozen", text)
        if m:
            return Fraction(int(m.group(2)) * int(m.group(1)))
        # 'How many dozen ITEMS are in N ITEMS?' or 'How many WHOLE dozen ...' -> N//12
        m = re.search(r"How many (?:WHOLE )?dozen \w+ are in (\d+)", text)
        if m:
            return Fraction(int(m.group(1)) // 12)
        # 'A box contains N dozen ITEMS and E extra ITEMS. How many ITEMS are in the box?' -> N*12+E
        m = re.search(r"contains (\d+) dozen \w+ and (\d+) extra \w+", text)
        if m:
            return Fraction(int(m.group(1)) * 12 + int(m.group(2)))
        raise RuntimeError(f"unrecognised Dozen shape: {text!r}")

    if cat == "Area":
        # '... square with side N m' -> N*N
        m = re.search(r"square with side (\d+)", text)
        if m:
            s = int(m.group(1))
            return Fraction(s * s)
        # '... rectangle L m x W m ...' -> L*W
        m = re.search(r"rectangle (\d+) (?:m )?x (\d+)", text)
        if m:
            l, w = int(m.group(1)), int(m.group(2))
            return Fraction(l * w)
        # '... triangle with base B m and height H m ...' -> B*H/2
        m = re.search(r"triangle with base (\d+) .*?height (\d+)", text)
        if m:
            b, h = int(m.group(1)), int(m.group(2))
            if (b * h) % 2 != 0:
                raise RuntimeError(f"non-integer triangle area for {text!r}")
            return Fraction(b * h, 2)
        # '... semicircle with radius R m ... pi = 22/7' -> 11*R^2/7
        m = re.search(r"semicircle with radius (\d+)", text)
        if m:
            r = int(m.group(1))
            if (r * r) % 7 != 0:
                raise RuntimeError(f"non-integer semicircle area for {text!r}")
            return Fraction(11 * r * r, 7)
        raise RuntimeError(f"unrecognised Area shape: {text!r}")

    if cat == "DMAS Rule":
        # 'Evaluate: <expr>' -> _expected_dmas_answer(expr)
        # Accept both ASCII (x, *) and Unicode (×) for multiplication.
        m = re.search(r"Evaluate:\s*(.+?)$", text)
        if m:
            expr = m.group(1)
            expr = expr.replace("×", "*").replace("x", "*").replace("X", "*")
            expr = expr.replace("÷", "/").replace("−", "-")
            return _expected_dmas_answer(expr)
        raise RuntimeError(f"unrecognised DMAS shape: {text!r}")

    if cat == "Zakat (2.5%)":
        # 'What is 2.5% of N?' or 'What is the Zakat on N rupees?' -> N/40
        m = re.search(r"of\s*(\d+)", text)
        if m:
            n = int(m.group(1))
            if n % 40 != 0:
                raise RuntimeError(f"non-integer zakat for {text!r}")
            return Fraction(n // 40)
        m = re.search(r"on\s*(\d+)\s*rupees", text)
        if m:
            n = int(m.group(1))
            if n % 40 != 0:
                raise RuntimeError(f"non-integer zakat for {text!r}")
            return Fraction(n // 40)
        raise RuntimeError(f"unrecognised Zakat shape: {text!r}")

    if cat == "Profit and Loss":
        # Patterns (8):
        m = re.search(r"Buy (?:an item )?for (\d+) rupees and sell (?:it )?for (\d+) rupees.*?profit percentage", text)
        if m:
            cp, sp = int(m.group(1)), int(m.group(2))
            if sp <= cp:
                raise RuntimeError(f"profit <loss for {text!r}")
            profit = sp - cp
            if (profit * 100) % cp != 0:
                raise RuntimeError(f"non-integer profit % for {text!r}")
            return Fraction(profit * 100, cp)
        m = re.search(r"Buy (?:an item )?for (\d+) rupees and sell (?:it )?for (\d+) rupees.*?loss percentage", text)
        if m:
            cp, sp = int(m.group(1)), int(m.group(2))
            if sp >= cp:
                raise RuntimeError(f"loss <profit for {text!r}")
            loss = cp - sp
            if (loss * 100) % cp != 0:
                raise RuntimeError(f"non-integer loss % for {text!r}")
            return Fraction(loss * 100, cp)
        m = re.search(r"Buy (?:an item )?for (\d+) rupees and sell (?:it )?for (\d+) rupees.*?profit\?", text)
        if m:
            cp, sp = int(m.group(1)), int(m.group(2))
            if sp <= cp:
                raise RuntimeError(f"profit <loss for {text!r}")
            return Fraction(sp - cp)
        m = re.search(r"Buy (?:an item )?for (\d+) rupees and sell (?:it )?for (\d+) rupees.*?loss\?", text)
        if m:
            cp, sp = int(m.group(1)), int(m.group(2))
            if sp >= cp:
                raise RuntimeError(f"loss <profit for {text!r}")
            return Fraction(cp - sp)
        m = re.search(r"Buy (?:an item )?for (\d+) rupees and sell at a (\d+)% profit.*?selling price", text)
        if m:
            cp, pct = int(m.group(1)), int(m.group(2))
            return Fraction(cp * (100 + pct), 100)
        m = re.search(r"Buy (?:an item )?for (\d+) rupees and sell at a (\d+)% loss.*?selling price", text)
        if m:
            cp, pct = int(m.group(1)), int(m.group(2))
            return Fraction(cp * (100 - pct), 100)
        m = re.search(r"Sell an item for (\d+) rupees at a (\d+)% profit.*?cost price", text)
        if m:
            sp, pct = int(m.group(1)), int(m.group(2))
            return Fraction(sp * 100, 100 + pct)
        m = re.search(r"Sell an item for (\d+) rupees at a (\d+)% loss.*?cost price", text)
        if m:
            sp, pct = int(m.group(1)), int(m.group(2))
            return Fraction(sp * 100, 100 - pct)
        raise RuntimeError(f"unrecognised Profit and Loss shape: {text!r}")

    raise RuntimeError(f"unknown category {cat!r}")


def main():
    bank = _load_bank()
    n = len(bank)
    print(f"verifying {n} questions...")

    failures = []
    seen = set()
    by_cat = {}

    for q in bank:
        qid = q.get("id")
        cat = q.get("category", "")
        diff = q.get("difficulty", "")
        if qid in seen:
            failures.append(f"#{qid}: duplicate id")
        seen.add(qid)
        if cat not in ALLOWED_CATEGORIES:
            failures.append(f"#{qid}: unknown category {cat!r}")
        if diff not in ALLOWED_DIFFICULTIES:
            failures.append(f"#{qid}: bad difficulty {diff!r}")

        try:
            expected = _derive_expected(q)
        except Exception as e:
            failures.append(f"#{qid}: {q.get('question','')[:60]}  --  could not re-derive answer: {e}")
            continue

        # Compare against correctAnswer (with optional unit suffix stripped)
        stored = _normalise_answer(q.get("correctAnswer", ""))
        expected_str = _format_number(expected)
        if stored != expected_str:
            failures.append(f"#{qid}: {q.get('question','')[:60]}  --  expected {expected_str!r}, got {stored!r}")
            continue

        by_cat[cat] = by_cat.get(cat, 0) + 1

    print("\nper-category counts:")
    for c in sorted(ALLOWED_CATEGORIES):
        print(f"  {c:24s} {by_cat.get(c, 0)}")

    if failures:
        print(f"\n{len(failures)} failures:")
        for line in failures[:25]:
            print(f"  {line}")
        if len(failures) > 25:
            print(f"  ... {len(failures) - 25} more")
        sys.exit(1)
    else:
        print(f"\nverified {n} questions; 0 failures")


if __name__ == "__main__":
    main()
