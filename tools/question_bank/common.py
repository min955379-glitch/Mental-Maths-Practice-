"""Shared helpers for building the Mental Maths question bank.

Design rules (from the MASTER PROMPT):
  * every question's answer is COMPUTED, never typed by hand;
  * families may assert an independent relationship to catch algebra slips;
  * user-facing maths uses x, / and -, never "*";
  * a hint teaches the method and never contains the answer;
  * ids and question text are globally unique.
"""
import json
import random
import re
from fractions import Fraction as F

MULT = "\u00d7"   # x
DIV = "\u00f7"    # /
MINUS = "\u2212"  # -

CATEGORY_LIST = [
    "Percentages", "Speed Distance Time", "Fractions", "Ratios Proportions",
    "Profit Loss", "Averages", "Work Time", "Pipes Tanks", "Unit Conversion",
    "Basic Arithmetic", "Decimals", "Mental Multiplication", "Mental Division",
    "Age Problems", "Time Calculation", "Relative Speed", "Number Patterns",
    "Mixed Mental Math",
]


# --------------------------------------------------------------- formatting
def fmt(value):
    """Render a number the way a student would type it."""
    if isinstance(value, F):
        if value.denominator == 1:
            return str(value.numerator)
        return "%d/%d" % (value.numerator, value.denominator)
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        if abs(value - round(value)) < 1e-9:
            return str(int(round(value)))
        s = ("%.4f" % value).rstrip("0").rstrip(".")
        return s
    return str(value)


def dec(value, places=3):
    """Render as a decimal when the value terminates, else as a fraction."""
    fr = value if isinstance(value, F) else F(str(value))
    d = fr.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d == 1:
        val = float(fr)
        if abs(val - round(val)) < 1e-9:
            return str(int(round(val)))
        return ("%.*f" % (places, val)).rstrip("0").rstrip(".")
    return fmt(fr)


def frac_str(fr):
    return "%d/%d" % (fr.numerator, fr.denominator)


def money(value):
    """Money always shows two decimals only when it needs them."""
    if isinstance(value, F):
        value = float(value)
    if abs(value - round(value)) < 1e-9:
        return str(int(round(value)))
    return ("%.2f" % value).rstrip("0").rstrip(".")


def clock(hour24, minute=0):
    """12-hour clock string, e.g. 13 -> '1:00 PM'."""
    suffix = "AM" if hour24 < 12 else "PM"
    h = hour24 % 12
    if h == 0:
        h = 12
    return "%d:%02d %s" % (h, minute, suffix)


def pick(rng, seq):
    return rng.choice(list(seq))


def rand_int(rng, lo, hi, exclude=None, step=1):
    for _ in range(400):
        n = rng.randint(lo, hi)
        if step > 1:
            n = lo + step * ((n - lo) // step)
        if exclude is None or n not in exclude:
            return n
    return rng.randint(lo, hi)


# --------------------------------------------------------------- the family
class Fam:
    """One question pattern. `gen` returns parameters, `answer` computes the
    result, `verify` (optional) re-checks it from a different direction."""

    def __init__(self, category, difficulty, tags, question, answer, hint,
                 shortcut, explanation, mentalPattern, commonMistake, reason, gen,
                 unit="", accepted=None, verify=None, style=None):
        self.category = category
        self.difficulty = difficulty
        self.tags = list(tags)
        self.question = question
        self.answer = answer
        self.hint = hint
        self.shortcut = shortcut
        self.explanation = explanation
        self.pattern = mentalPattern
        self.mistake = commonMistake
        self.reason = reason
        self.gen = gen
        self.unit = unit
        self.accepted = accepted
        self.verify = verify
        # "fraction" keeps answers like 3/4; "decimal" renders 0.75 or 12.5
        self.style = style or ("fraction" if category == "Fractions" else "decimal")

    def make(self, rng):
        params = self.gen(rng) or {}
        # Arithmetic gets exact rationals (so 12.5% never produces float noise),
        # while the templates keep the human-friendly originals.
        calc = {k: (F(str(v)) if isinstance(v, float) else v) for k, v in params.items()}
        result = self.answer(calc)
        extra = {}
        if isinstance(result, tuple):
            result, extra = result

        ctx = dict(params)
        ctx.update(extra)

        if isinstance(result, str):
            # Families may return a display template as the answer (e.g. "3:4").
            ans = sanitise(result.format(**ctx))
            ctx["ans"] = ans
        else:
            if isinstance(result, float):
                result = F(str(result))
            elif not isinstance(result, F):
                result = F(result)
            ans = fmt(result) if self.style == "fraction" else dec(result)
            ctx["ans"] = ans

        if self.verify:
            assert self.verify(calc, ans if isinstance(result, str) else result), "verification failed: " + self.question

        def text(tpl):
            return sanitise(tpl.format(**ctx)) if tpl else ""

        unit = text(self.unit) if self.unit else ""
        accepted = []
        if self.accepted:
            accepted = [text(x) for x in self.accepted]
        if unit:
            accepted = accepted + [ans + " " + unit]
        # de-duplicate but keep order
        seen = set()
        accepted = [x for x in accepted if not (x in seen or seen.add(x))]

        return {
            "category": self.category,
            "difficulty": self.difficulty,
            "question": text(self.question),
            "correctAnswer": ans,
            "acceptedAnswers": accepted,
            "unit": unit,
            "hint": text(self.hint),
            "shortcut": text(self.shortcut),
            "explanation": text(self.explanation),
            "mentalPattern": text(self.pattern),
            "commonMistake": text(self.mistake),
            "difficultyReason": self.reason,
            "tags": list(self.tags),
            "sourceType": "seed",
        }


# --------------------------------------------------------------- validation
STAR_RE = re.compile(r"\*")
ANS_TOKEN_RE = re.compile(r"-?\d+(?:\.\d+)?")


ASCII_X_RE = re.compile(r"(?<=[\d)])\s*x\s*(?=[\d(])")
ASCII_SLASH_RE = re.compile(r"(?<=\d)\s*/\s+(?=\d)")
ASCII_DASH_RE = re.compile(r"(?<=\d)\s+-\s+(?=\d)")


def sanitise(text):
    """Presentation maths must use x, / and -, never '*' (master prompt).

    Only standalone operators are rewritten, so fractions like 3/4 and the
    variable 'x' in 'Find x.' are left untouched.
    """
    if not text:
        return text
    text = text.replace("*", MULT)
    text = ASCII_X_RE.sub(" " + MULT + " ", text)
    text = ASCII_SLASH_RE.sub(" " + DIV + " ", text)
    text = ASCII_DASH_RE.sub(" " + MINUS + " ", text)
    return text


def validate(questions):
    """Hard checks. Any failure raises, so a bad bank can never be emitted."""
    errors = []
    seen_ids = set()
    seen_text = {}

    for q in questions:
        where = q.get("id") or q["question"][:50]
        if q["id"] in seen_ids:
            errors.append("duplicate id: " + q["id"])
        seen_ids.add(q["id"])

        norm = re.sub(r"\s+", " ", q["question"]).strip().lower()
        if norm in seen_text:
            errors.append("duplicate question: %s (also %s)" % (where, seen_text[norm]))
        seen_text[norm] = q["id"]

        for field in ("question", "hint", "shortcut", "explanation",
                      "mentalPattern", "commonMistake", "correctAnswer"):
            value = q.get(field) or ""
            if field != "commonMistake" and not value.strip():
                errors.append("%s: empty %s" % (where, field))
            if STAR_RE.search(value):
                errors.append("%s: '*' in %s" % (where, field))

        if q["difficulty"] not in ("Easy", "Medium", "Hard"):
            errors.append("%s: bad difficulty %s" % (where, q["difficulty"]))
        if q["category"] not in CATEGORY_LIST:
            errors.append("%s: unknown category %s" % (where, q["category"]))

        answer = q["correctAnswer"].strip()
        if not answer:
            errors.append("%s: no answer" % where)
        hint = q["hint"]
        question_text = q["question"]
        if len(hint) < 25:
            errors.append("%s: hint too short" % where)

        def appears(text, token):
            return re.search(r"(?<![\d.])%s(?![\d.])" % re.escape(token), text)

        # A hint may quote numbers the question already gave away; it must never
        # quote a number that only shows up in the answer.
        given = lambda token: appears(question_text, token)
        if appears(hint, answer) and not given(answer):
            errors.append("%s: hint contains the answer (%s)" % (where, answer))
        for token in ANS_TOKEN_RE.findall(answer):
            if appears(hint, token) and not given(token):
                errors.append("%s: hint leaks answer token %s" % (where, token))

    if errors:
        raise AssertionError("\n".join(errors[:40]))
    return True


def assign_ids(questions, prefix="bank"):
    """Stable, readable, unique ids: bank-percentages-e-01."""
    counters = {}
    for q in questions:
        slug = re.sub(r"[^a-z0-9]+", "-", q["category"].lower()).strip("-")
        key = slug + "-" + q["difficulty"][0].lower()
        counters[key] = counters.get(key, 0) + 1
        q["id"] = "%s-%s-%s-%02d" % (prefix, slug, q["difficulty"][0].lower(), counters[key])
    return questions


def to_js(questions, path, var_name="QUESTION_BANK"):
    body = json.dumps(questions, ensure_ascii=False, indent=None, separators=(", ", ": "))
    header = (
        "/* Generated by tools/question_bank/build.py - do not edit by hand.\n"
        "   %d questions across %d categories. Every answer is computed and\n"
        "   validated at build time (see tools/question_bank/VALIDATION.md). */\n"
        "window.%s = %s;\n"
        "// Merge into the seeded bank so every existing screen sees the full set.\n"
        "window.QUESTIONS = (window.QUESTIONS || []).concat(window.%s);\n"
    )
    cats = len({q["category"] for q in questions})
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(header % (len(questions), cats, var_name, body, var_name))
    return len(questions)
