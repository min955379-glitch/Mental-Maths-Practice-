"""Profit and Loss builder.

Master prompt section 13 reference questions:
    1. Buy 400 / sell 500 -> 25% profit
    2. Buy 80  / sell 100 -> 25% profit
    3. CP 600, 15% loss -> SP 510
"""

from fractions import Fraction


def _profit_pct_q(cp, sp, difficulty):
    if sp <= cp:
        return None
    profit = sp - cp
    if (profit * 100) % cp != 0:
        return None
    pct = (profit * 100) // cp
    return {
        "question": f"Buy an item for {cp} rupees and sell it for {sp} rupees. What is the profit percentage?",
        "correctAnswer": f"{pct}%",
        "acceptedAnswers": [f"{pct}%", str(pct), f"{pct} percent", f"{pct} %"],
        "unit": "%",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": (
            f"Profit = SP - CP = {sp} - {cp} = {profit}. "
            f"Profit % = (Profit / CP) x 100 = ({profit}/{cp}) x 100 = {pct}%."
        ),
        "shortcut": f"Profit = {sp} - {cp} = {profit}. {profit}/{cp} = {Fraction(profit, cp)} x 100 = {pct}%.",
        "mentalPattern": "Always express profit percentage on cost price, not selling price.",
        "commonMistake": "Dividing profit by selling price (smaller wrong percentage).",
    }


def _loss_pct_q(cp, sp, difficulty):
    if sp >= cp:
        return None
    loss = cp - sp
    if (loss * 100) % cp != 0:
        return None
    pct = (loss * 100) // cp
    return {
        "question": f"Buy an item for {cp} rupees and sell it for {sp} rupees. What is the loss percentage?",
        "correctAnswer": f"{pct}%",
        "acceptedAnswers": [f"{pct}%", str(pct), f"{pct} percent", f"{pct} %"],
        "unit": "%",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": (
            f"Loss = CP - SP = {cp} - {sp} = {loss}. "
            f"Loss % = (Loss / CP) x 100 = ({loss}/{cp}) x 100 = {pct}%."
        ),
        "shortcut": f"Loss = {cp} - {sp} = {loss}. {loss}/{cp} = {Fraction(loss, cp)} x 100 = {pct}%.",
        "mentalPattern": "Loss percentage is on cost price too.",
        "commonMistake": "Dividing loss by selling price.",
    }


def _profit_amount_q(cp, sp, difficulty):
    if sp <= cp:
        return None
    profit = sp - cp
    return {
        "question": f"Buy an item for {cp} rupees and sell it for {sp} rupees. What is the profit?",
        "correctAnswer": str(profit),
        "acceptedAnswers": [str(profit), f"{profit} rupees", f"Rs {profit}"],
        "unit": "rupees",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": f"Profit = SP - CP = {sp} - {cp} = {profit} rupees.",
        "shortcut": f"{sp} - {cp} = {profit}.",
        "mentalPattern": "Profit = SP - CP. If SP > CP, profit; if SP < CP, loss.",
        "commonMistake": "Subtracting CP - SP instead of SP - CP.",
    }


def _loss_amount_q(cp, sp, difficulty):
    if sp >= cp:
        return None
    loss = cp - sp
    return {
        "question": f"Buy an item for {cp} rupees and sell it for {sp} rupees. What is the loss?",
        "correctAnswer": str(loss),
        "acceptedAnswers": [str(loss), f"{loss} rupees", f"Rs {loss}"],
        "unit": "rupees",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": f"Loss = CP - SP = {cp} - {sp} = {loss} rupees.",
        "shortcut": f"{cp} - {sp} = {loss}.",
        "mentalPattern": "Loss = CP - SP. If SP > CP, profit; if SP < CP, loss.",
        "commonMistake": "Subtracting SP - CP instead of CP - SP.",
    }


def _sp_from_profit_pct_q(cp, pct, difficulty):
    sp = cp + Fraction(cp * pct, 100)
    if sp.denominator != 1:
        return None
    sp = int(sp)
    return {
        "question": f"Buy for {cp} rupees and sell at a {pct}% profit. What is the selling price?",
        "correctAnswer": str(sp),
        "acceptedAnswers": [str(sp), f"{sp} rupees", f"Rs {sp}"],
        "unit": "rupees",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": (
            f"Profit amount = CP x {pct}% = {cp} x {pct}/100 = {cp * pct // 100 if (cp * pct) % 100 == 0 else Fraction(cp * pct, 100)}. "
            f"SP = CP + Profit = {cp} + {cp * pct // 100} = {sp}."
        ),
        "shortcut": f"SP = CP x (100 + {pct})/100 = {sp}.",
        "mentalPattern": "SP = CP x (1 + percent/100) for a profit.",
        "commonMistake": "Subtracting the profit percent instead of adding.",
    }


def _sp_from_loss_pct_q(cp, pct, difficulty):
    sp = cp - Fraction(cp * pct, 100)
    if sp.denominator != 1:
        return None
    sp = int(sp)
    return {
        "question": f"Buy for {cp} rupees and sell at a {pct}% loss. What is the selling price?",
        "correctAnswer": str(sp),
        "acceptedAnswers": [str(sp), f"{sp} rupees", f"Rs {sp}"],
        "unit": "rupees",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": (
            f"Loss amount = CP x {pct}% = {cp} x {pct}/100 = {cp * pct // 100}. "
            f"SP = CP - Loss = {cp} - {cp * pct // 100} = {sp}."
        ),
        "shortcut": f"SP = CP x (100 - {pct})/100 = {sp}.",
        "mentalPattern": "SP = CP x (1 - percent/100) for a loss.",
        "commonMistake": "Adding the loss percent instead of subtracting.",
    }


def _cp_from_profit_pct_q(sp, pct, difficulty):
    cp = Fraction(sp * 100, 100 + pct)
    if cp.denominator != 1:
        return None
    cp = int(cp)
    return {
        "question": f"Sell an item for {sp} rupees at a {pct}% profit. What was the cost price?",
        "correctAnswer": str(cp),
        "acceptedAnswers": [str(cp), f"{cp} rupees", f"Rs {cp}"],
        "unit": "rupees",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": (
            f"SP = CP x (100 + {pct})/100. So CP = SP x 100 / (100 + {pct}) = {sp} x 100 / {100 + pct} = {cp}."
        ),
        "shortcut": f"CP = SP x 100 / (100 + {pct}) = {cp}.",
        "mentalPattern": "Cost price = selling price x 100 / (100 + profit %) for a profit.",
        "commonMistake": "Dividing SP by (1 + percent) directly.",
    }


def _cp_from_loss_pct_q(sp, pct, difficulty):
    cp = Fraction(sp * 100, 100 - pct)
    if cp.denominator != 1:
        return None
    cp = int(cp)
    return {
        "question": f"Sell an item for {sp} rupees at a {pct}% loss. What was the cost price?",
        "correctAnswer": str(cp),
        "acceptedAnswers": [str(cp), f"{cp} rupees", f"Rs {cp}"],
        "unit": "rupees",
        "category": "Profit and Loss",
        "difficulty": difficulty,
        "explanation": (
            f"SP = CP x (100 - {pct})/100. So CP = SP x 100 / (100 - {pct}) = {sp} x 100 / {100 - pct} = {cp}."
        ),
        "shortcut": f"CP = SP x 100 / (100 - {pct}) = {cp}.",
        "mentalPattern": "Cost price = selling price x 100 / (100 - loss %) for a loss.",
        "commonMistake": "Dividing SP by (1 - percent) directly.",
    }


def build():
    seen = set()
    out = []

    # Reference questions (master prompt section 13)
    ref = [
        _profit_pct_q(400, 500, "Easy"),
        _profit_pct_q(80, 100, "Easy"),
        _sp_from_loss_pct_q(600, 15, "Easy"),
    ]
    for q in ref:
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Easy: profit%/loss%/amount
    EASY_PAIRS_PROFIT_PCT = [
        (100, 110), (100, 120), (100, 125), (100, 130), (100, 150),
        (200, 220), (200, 240), (200, 250), (200, 280), (300, 330),
        (400, 440), (400, 460), (500, 550), (500, 600), (1000, 1100),
    ]
    for cp, sp in EASY_PAIRS_PROFIT_PCT:
        if len([q for q in out if q["difficulty"] == "Easy" and "profit percentage" in q["question"]]) >= 11:
            break
        q = _profit_pct_q(cp, sp, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    EASY_PAIRS_LOSS_PCT = [
        (100, 90), (100, 75), (100, 80), (100, 60), (100, 50),
        (200, 150), (200, 180), (200, 160), (300, 240), (500, 400),
    ]
    for cp, sp in EASY_PAIRS_LOSS_PCT:
        if len([q for q in out if q["difficulty"] == "Easy" and "loss percentage" in q["question"]]) >= 9:
            break
        q = _loss_pct_q(cp, sp, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Easy: profit/loss amount
    EASY_PAIRS_PROFIT_AMT = [
        (100, 120), (100, 125), (100, 130), (200, 240), (200, 250),
    ]
    for cp, sp in EASY_PAIRS_PROFIT_AMT:
        if len([q for q in out if q["difficulty"] == "Easy" and "What is the profit" in q["question"]]) >= 4:
            break
        q = _profit_amount_q(cp, sp, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: SP from percent (profit)
    MOD_PROFIT_SP = [
        (100, 10), (200, 20), (300, 25), (400, 25), (500, 20),
        (200, 50), (400, 10), (250, 25), (500, 25), (300, 20),
        (1000, 25), (2000, 10),
    ]
    for cp, pct in MOD_PROFIT_SP:
        if len([q for q in out if q["difficulty"] == "Moderate" and "profit" in q["question"]]) >= 9:
            break
        q = _sp_from_profit_pct_q(cp, pct, "Moderate")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: SP from percent (loss)
    MOD_LOSS_SP = [
        (100, 10), (200, 10), (300, 20), (400, 25), (500, 10),
        (200, 50), (400, 50), (300, 25), (500, 25), (300, 30),
        (1000, 25), (2000, 10),
    ]
    for cp, pct in MOD_LOSS_SP:
        if len([q for q in out if q["difficulty"] == "Moderate" and "loss" in q["question"]]) >= 11:
            break
        q = _sp_from_loss_pct_q(cp, pct, "Moderate")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Hard: CP from percent
    HARD_CP_PROFIT = [
        (110, 10), (120, 20), (150, 50), (200, 25), (240, 20),
    ]
    for sp, pct in HARD_CP_PROFIT:
        if len([q for q in out if q["difficulty"] == "Hard" and "profit" in q["question"]]) >= 4:
            break
        q = _cp_from_profit_pct_q(sp, pct, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    HARD_CP_LOSS = [
        (90, 10), (75, 25), (80, 20), (60, 25), (200, 20),
    ]
    for sp, pct in HARD_CP_LOSS:
        if len([q for q in out if q["difficulty"] == "Hard" and "loss" in q["question"]]) >= 4:
            break
        q = _cp_from_loss_pct_q(sp, pct, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Top up with loss amount
    LOSS_AMT = [(100, 90), (100, 75), (200, 150), (200, 180)]
    for cp, sp in LOSS_AMT:
        if len([q for q in out if q["difficulty"] == "Easy" and "What is the loss" in q["question"]]) >= 2:
            break
        q = _loss_amount_q(cp, sp, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Ensure Easy is at 22 by adding more profit amounts
    PROFIT_AMT = [(100, 140), (100, 160), (200, 260), (200, 280), (250, 300), (250, 325), (300, 360)]
    for cp, sp in PROFIT_AMT:
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break
        q = _profit_amount_q(cp, sp, "Easy")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    return out
