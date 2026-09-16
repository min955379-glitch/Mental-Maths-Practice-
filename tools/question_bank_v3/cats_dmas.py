"""DMAS (Brackets / Orders / Division / Multiplication / Addition / Subtraction) builder.

Master prompt section 11: 'Evaluate' questions where the order of
operations is the whole point.
"""

from fractions import Fraction


def _expected_dmas_answer(expr):
    """Evaluate a DMAS expression to its integer answer using Fraction.

    Safe enough for our builder: the expression contains only digits and
    + - * / and parens. We use Python eval with a sandboxed namespace.
    """
    # Reject anything unexpected
    allowed = set("0123456789+-*/().  ")
    if any(c not in allowed for c in expr):
        raise ValueError(f"unexpected character in DMAS expression: {expr!r}")
    result = Fraction(eval(expr, {"__builtins__": {}}, {}))
    if result.denominator != 1:
        raise ValueError(f"non-integer DMAS result for {expr!r}: {result}")
    return int(result)


def _brackets_q(a, b, c, difficulty):
    ans = _expected_dmas_answer(f"({a} + {b}) * {c}")
    return {
        "question": f"Evaluate: ({a} + {b}) × {c}",
        "correctAnswer": str(ans),
        "acceptedAnswers": [str(ans)],
        "unit": "",
        "category": "DMAS Rule",
        "difficulty": difficulty,
        "explanation": (
            f"Brackets first: {a} + {b} = {a + b}; then {a + b} x {c} = {ans}."
        ),
        "shortcut": f"({a} + {b}) x {c} = {a + b} x {c} = {ans}.",
        "mentalPattern": "Brackets first, then x and /, then + and -.",
        "commonMistake": "Forgetting the brackets and doing a + b x c.",
    }


def _mul_then_add_q(a, b, c, difficulty):
    ans = _expected_dmas_answer(f"{a} + {b} * {c}")
    return {
        "question": f"Evaluate: {a} + {b} × {c}",
        "correctAnswer": str(ans),
        "acceptedAnswers": [str(ans)],
        "unit": "",
        "category": "DMAS Rule",
        "difficulty": difficulty,
        "explanation": f"Apply DMAS: first multiply {b} x {c} = {b * c}, then add {a} = {ans}.",
        "shortcut": f"{b} x {c} = {b * c}; {a} + {b * c} = {ans}.",
        "mentalPattern": "Do x and / before + and -.",
        "commonMistake": "Doing (a + b) x c = left-to-right.",
    }


def _div_then_sub_q(a, b, c, difficulty):
    if b % c != 0:
        return None
    q = _expected_dmas_answer(f"{a} - {b} / {c}")
    expr_str = f"{a} - {b} / {c}"
    return {
        "question": f"Evaluate: {a} − {b} ÷ {c}",
        "correctAnswer": str(q),
        "acceptedAnswers": [str(q)],
        "unit": "",
        "category": "DMAS Rule",
        "difficulty": difficulty,
        "explanation": f"Apply DMAS: first divide {b}/{c} = {b // c}, then {a} - {b // c} = {q}.",
        "shortcut": f"{b} / {c} = {b // c}; {a} - {b // c} = {q}.",
        "mentalPattern": "Do / before -, even when - is on the left.",
        "commonMistake": "Doing (a - b) / c = left-to-right.",
    }


def _two_step_q(a, b, c, d, difficulty):
    """E.g. (a + b) * c - d with clean integer result."""
    expr = f"({a} + {b}) * {c} - {d}"
    try:
        ans = _expected_dmas_answer(expr)
    except ValueError:
        return None
    return {
        "question": f"Evaluate: ({a} + {b}) × {c} − {d}",
        "correctAnswer": str(ans),
        "acceptedAnswers": [str(ans)],
        "unit": "",
        "category": "DMAS Rule",
        "difficulty": difficulty,
        "explanation": (
            f"Brackets first: {a} + {b} = {a + b}; multiply by {c} = {(a + b) * c}; "
            f"subtract {d} = {ans}."
        ),
        "shortcut": f"({a} + {b}) x {c} = {(a + b) * c}; minus {d} = {ans}.",
        "mentalPattern": "Brackets -> x and / -> + and - (left-to-right).",
        "commonMistake": "Skipping the bracket step.",
    }


def build():
    seen = set()
    out = []

    # Easy: simple x-then-+ / /-then--
    EASY_MUL_ADD = [(2, 3, 4), (5, 4, 3), (8, 6, 2), (7, 5, 3), (9, 4, 2), (12, 6, 3), (15, 4, 2), (10, 3, 5), (11, 5, 4), (14, 7, 2), (20, 4, 3), (25, 5, 2), (16, 3, 4), (24, 5, 3)]
    for a, b, c in EASY_MUL_ADD:
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 11:
            break
        q = _mul_then_add_q(a, b, c, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    EASY_DIV_SUB = [(50, 10, 2), (60, 12, 3), (80, 16, 4), (90, 18, 3), (40, 12, 4), (100, 25, 5), (72, 18, 3), (84, 21, 7), (90, 30, 5), (96, 24, 8), (120, 40, 8), (140, 28, 7), (160, 32, 4)]
    for a, b, c in EASY_DIV_SUB:
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break
        q = _div_then_sub_q(a, b, c, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: bracketed
    MOD_BRACKETS = [(3, 5, 4), (7, 8, 6), (9, 6, 5), (4, 8, 7), (5, 9, 6), (12, 8, 5), (15, 10, 4), (20, 13, 5)]
    for a, b, c in MOD_BRACKETS:
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 12:
            break
        q = _brackets_q(a, b, c, "Moderate")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: more /-then--
    MOD_DIV_SUB = [(120, 24, 4), (150, 30, 5), (180, 36, 6), (200, 40, 8), (250, 50, 5), (210, 30, 5), (240, 48, 6), (280, 56, 7), (300, 60, 5), (320, 64, 8), (360, 60, 5), (400, 80, 8), (420, 84, 7), (450, 90, 9), (480, 96, 8), (500, 100, 4), (560, 70, 5), (640, 80, 5), (720, 90, 6), (800, 100, 5)]
    for a, b, c in MOD_DIV_SUB:
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
            break
        q = _div_then_sub_q(a, b, c, "Moderate")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Hard: two-step
    HARD_TWO = [(5, 9, 6, 20), (12, 8, 5, 30), (15, 10, 4, 25), (8, 12, 6, 35), (10, 14, 5, 40), (7, 11, 4, 25), (9, 13, 5, 35), (11, 7, 6, 30), (6, 10, 7, 40), (13, 9, 4, 30)]
    for a, b, c, d in HARD_TWO:
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
            break
        q = _two_step_q(a, b, c, d, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    return out
