"""Dozen mental-math builder.

Master prompt section 9: 1 dozen = 12 items.

The '12 eggs cost 9 rupees' question is excluded per the prompt's own
instruction (master prompt section 14).
"""

ITEMS = ['eggs', 'pencils', 'pens', 'apples', 'bottles', 'books', 'packs']


def _dozen_to_items(n, item, difficulty):
    total = n * 12
    return {
        "question": f"How many {item} are in {n} dozen?",
        "correctAnswer": str(total),
        "acceptedAnswers": [str(total), f"{total} {item}"],
        "unit": "",
        "category": "Dozen",
        "difficulty": difficulty,
        "explanation": f"1 dozen = 12 {item}. So {n} dozen = {n} x 12 = {total} {item}.",
        "shortcut": f"Multiply the dozens by 12: {n} x 12 = {total}.",
        "mentalPattern": "1 dozen = 12 items. Multiply dozens by 12 to count items.",
        "commonMistake": "Multiplying by 10 instead of by 12.",
    }


def _per_dozen_price(n, price_per_dozen, item, difficulty):
    total_cost = price_per_dozen * n
    return {
        "question": f"If 1 dozen {item} costs {price_per_dozen} rupees, what is the cost of {n} dozen {item}?",
        "correctAnswer": str(total_cost),
        "acceptedAnswers": [str(total_cost), f"{total_cost} rupees", f"Rs {total_cost}"],
        "unit": "rupees",
        "category": "Dozen",
        "difficulty": difficulty,
        "explanation": f"{n} dozen x {price_per_dozen} rupees/dozen = {total_cost} rupees.",
        "shortcut": f"Multiply dozens by the per-dozen price: {n} x {price_per_dozen} = {total_cost}.",
        "mentalPattern": "Cost of N dozen at P per dozen = N x P. Mental: P tens + P twos + P ones.",
        "commonMistake": "Multiplying rupees by per-dozen instead of dividing.",
    }


def _items_to_dozen(total, item, difficulty):
    dozens = total // 12
    remainder = total % 12
    if remainder == 0:
        question = f"How many dozen {item} are in {total} {item}?"
        answer = str(dozens)
        explanation = f"{total} / 12 = {dozens} dozen (exactly)."
    else:
        question = f"How many WHOLE dozen {item} are in {total} {item}?"
        answer = str(dozens)
        explanation = f"{total} / 12 = {dozens} dozen and {remainder} extra. The whole-dozen count is {dozens}."
    return {
        "question": question,
        "correctAnswer": answer,
        "acceptedAnswers": [answer, f"{answer} dozen", f"{answer} doz"],
        "unit": "dozen",
        "category": "Dozen",
        "difficulty": difficulty,
        "explanation": explanation,
        "shortcut": f"Divide the items by 12. {total} / 12 = {dozens} (rem {remainder}).",
        "mentalPattern": "Items to dozen: divide by 12. The remainder is the leftover.",
        "commonMistake": "Multiplying by 12 instead of dividing.",
    }


def _dozens_and_extras(dozens, extra, item, difficulty):
    total = dozens * 12 + extra
    return {
        "question": f"A box contains {dozens} dozen {item} and {extra} extra {item}. How many {item} are in the box?",
        "correctAnswer": str(total),
        "acceptedAnswers": [str(total), f"{total} {item}"],
        "unit": "",
        "category": "Dozen",
        "difficulty": difficulty,
        "explanation": f"{dozens} dozen = {dozens * 12} {item}. Plus {extra} extras = {total} {item}.",
        "shortcut": f"{dozens * 12} + {extra} = {total}.",
        "mentalPattern": "Convert dozens to items first, then add the extras.",
        "commonMistake": "Adding dozens + extras as if both were counts of items.",
    }


def build():
    seen = set()
    out = []

    # Easy: dozens -> items (1..12 dozen)
    for n in range(2, 14):
        for item in ITEMS[:3]:
            if len([q for q in out if q["difficulty"] == "Easy"]) >= 12:
                break
            q = _dozen_to_items(n, item, "Easy")
            if q["question"] not in seen:
                seen.add(q["question"])
                out.append(q)
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 12:
            break

    # Easy: items -> whole dozens (24, 48, 60, 72, 84, 96, 120, 144)
    for total in [24, 36, 48, 60, 72, 84, 96, 120, 144]:
        for item in ITEMS[:2]:
            if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
                break
            q = _items_to_dozen(total, item, "Easy")
            if q["question"] not in seen:
                seen.add(q["question"])
                out.append(q)
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break

    # Moderate: per-dozen price
    PRICES = [(60, 2), (84, 3), (96, 4), (120, 2), (144, 3), (72, 5), (60, 6)]
    for price, n in PRICES:
        for item in ITEMS[:3]:
            if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
                break
            q = _per_dozen_price(n, price, item, "Moderate")
            if q["question"] not in seen:
                seen.add(q["question"])
                out.append(q)
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
            break

    # Hard: dozens + extras (extra != 0)
    COMBOS = [(3, 4), (5, 6), (7, 8), (4, 9), (6, 10), (8, 11), (9, 5), (10, 7)]
    for dozens, extra in COMBOS:
        for item in ITEMS[:1]:
            if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
                break
            q = _dozens_and_extras(dozens, extra, item, "Hard")
            if q["question"] not in seen:
                seen.add(q["question"])
                out.append(q)
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
            break

    return out
