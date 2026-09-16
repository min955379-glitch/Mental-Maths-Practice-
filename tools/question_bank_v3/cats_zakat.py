"""Zakat (2.5%) builder.

Master prompt section 12: 2.5% = 1/40. Pure arithmetic, no fiqh rulings.
"""

from fractions import Fraction


def _q(amount, difficulty, formulation="of"):
    if amount % 40 != 0:
        return None
    zakat = amount // 40
    if formulation == "of":
        question = f"What is 2.5% of {amount}?"
    else:
        question = f"What is the Zakat on {amount} rupees?"
    return {
        "question": question,
        "correctAnswer": str(zakat),
        "acceptedAnswers": [str(zakat), f"{zakat} rupees", f"Rs {zakat}", f"Rs. {zakat}"],
        "unit": "rupees",
        "category": "Zakat (2.5%)",
        "difficulty": difficulty,
        "explanation": f"Zakat = 2.5% = 1/40 of the eligible amount. {amount} / 40 = {zakat} rupees.",
        "shortcut": f"{amount} / 40 = {zakat}.",
        "mentalPattern": "Zakat = amount / 40 for any amount.",
        "commonMistake": "Dividing by 25 (which is 4%) instead of 40 (which is 2.5%).",
    }


def build():
    seen = set()
    out = []

    # Easy: round amounts that divide cleanly by 40
    EASY_AMOUNTS = [40, 80, 120, 200, 400, 800, 1000, 1200, 2000, 2400, 4000, 8000, 10000, 20000, 40000, 80000, 100000, 200000, 400000, 1000000, 60000, 160000]
    for amount in EASY_AMOUNTS:
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break
        # alternate formulation
        formulation = "of" if amount % 80 == 0 else "zakat"
        q = _q(amount, "Easy", formulation)
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: awkward numbers that still divide by 40
    MODERATE_AMOUNTS = [160, 320, 480, 560, 720, 840, 960, 1200, 1440, 1680, 2400, 2800, 3200, 3600, 4400, 5200, 6000, 6800, 7600, 8800]
    for amount in MODERATE_AMOUNTS:
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
            break
        formulation = "zakat" if amount % 100 == 0 else "of"
        q = _q(amount, "Moderate", formulation)
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Hard: very large amounts (4+ digit rupees)
    HARD_AMOUNTS = [12000, 16000, 20000, 32000, 40000, 48000, 60000, 80000, 100000, 120000, 160000, 200000, 400000, 800000, 240000, 560000]
    for amount in HARD_AMOUNTS:
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
            break
        formulation = "of" if amount % 200 == 0 else "zakat"
        q = _q(amount, "Hard", formulation)
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    return out
