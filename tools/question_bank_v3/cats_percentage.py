"""Percentage mental-math builder.

Master prompt section 7:
    'What is X% of N?' with clean integer answers.

Reference questions to preserve verbatim (master prompt section 13):
    1. What is 35% of 450?
    2. What is 22% of 90?
    3. What is 5% of 350?
    4. What is 15% of 350?
    5. What is 70% of 80?
    6. What is 80% of 70?
    7. What is 19% of 50?
"""

from fractions import Fraction

REFERENCE_PERCENTAGES = [
    (35, 450), (22, 90), (5, 350), (15, 350),
    (70, 80), (80, 70), (19, 50),
]

# Percentages used for plain 'X% of N' questions
EASY_PCTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90]
EASY_NS = [40, 60, 80, 100, 120, 150, 200, 240, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]


def _pct_q(pct, n, difficulty):
    ans = Fraction(pct * n, 100)
    if ans.denominator != 1:
        return None
    return {
        "question": f"What is {pct}% of {n}?",
        "correctAnswer": str(int(ans)),
        "acceptedAnswers": [str(int(ans)), f"{int(ans)} percent", f"{int(ans)}%"],
        "unit": "",
        "category": "Percentage",
        "difficulty": difficulty,
        "explanation": f"{pct}% of {n} = ({pct} x {n}) / 100 = {int(ans)}.",
        "shortcut": f"Find 10% of {n}, then scale to {pct}%.",
        "mentalPattern": "10% chunks (10% + 5% + 1%) or special fractions.",
        "commonMistake": "Multiplying n x 0.0p with long arithmetic.",
    }


def _find_pct_q(part, whole, difficulty):
    """'What percentage is PART of WHOLE?' -> PART/WHOLE x 100."""
    if (part * 100) % whole != 0:
        return None
    pct = (part * 100) // whole
    return {
        "question": f"What percentage is {part} of {whole}?",
        "correctAnswer": f"{pct}%",
        "acceptedAnswers": [f"{pct}%", str(pct), f"{pct} percent", f"{pct} %"],
        "unit": "%",
        "category": "Percentage",
        "difficulty": difficulty,
        "explanation": f"Pct = (Part / Whole) x 100 = ({part}/{whole}) x 100 = {pct}%.",
        "shortcut": f"{part}/{whole} = {Fraction(part, whole)}, x 100 = {pct}%.",
        "mentalPattern": "Pct = (Part / Whole) x 100. Simplify the fraction first.",
        "commonMistake": "Dividing whole by part instead of part by whole.",
    }


def build():
    seen = set()
    out = []

    # 7 reference questions (section 13) -- Easy
    for pct, n in REFERENCE_PERCENTAGES:
        q = _pct_q(pct, n, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Easy: more 'X% of N' for breadth
    for pct in EASY_PCTS:
        for n in EASY_NS:
            if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
                break
            q = _pct_q(pct, n, "Easy")
            if q and q["question"] not in seen:
                seen.add(q["question"])
                out.append(q)
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break

    # Moderate: 'What percentage is X of Y?'
    FIND_PCT = [
        (10, 100), (25, 100), (50, 100), (75, 100),
        (12, 100), (15, 100), (20, 100), (40, 100),
        (1, 4), (3, 4), (1, 5), (2, 5), (3, 5), (4, 5),
        (1, 8), (3, 8), (5, 8), (7, 8),
        (3, 50), (7, 50), (9, 50), (11, 50),
        (1, 25), (3, 25), (7, 25), (9, 25), (13, 25), (14, 25), (18, 25), (24, 25),
    ]
    for part, whole in FIND_PCT:
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
            break
        q = _find_pct_q(part, whole, "Moderate")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Hard: larger numbers, multi-step reasoning
    HARD_PAIRS = [
        (12, 150), (16, 200), (24, 250), (32, 400), (48, 600),
        (60, 750), (72, 900), (84, 1000), (88, 800), (96, 1200),
    ]
    for part, whole in HARD_PAIRS:
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
            break
        q = _find_pct_q(part, whole, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Top up Easy with extra X% of N if short
    EXTRA_EASY_PCTS = [5, 12, 16, 24, 32, 36, 48, 64, 72, 88]
    for pct in EXTRA_EASY_PCTS:
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break
        for n in EASY_NS:
            if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
                break
            q = _pct_q(pct, n, "Easy")
            if q and q["question"] not in seen:
                seen.add(q["question"])
                out.append(q)

    return out
