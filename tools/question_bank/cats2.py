"""Question families: Ratios Proportions, Profit Loss, Averages."""
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt, money


# ======================================================= Ratios Proportions
def ratio_families():
    out = []

    # ---- simplify a ratio ----------------------------------------------------
    def _simplify(diff, reason):
        def gen(rng):
            k = pick(rng, (2, 3, 4, 5, 6, 7))
            a = pick(rng, (2, 3, 4, 5, 6, 8, 9))
            b = pick(rng, (2, 4, 5, 6, 8, 10, 12))
            return {"a": a * k, "b": b * k, "sa": a, "sb": b}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["simplify"],
            question="Simplify the ratio {a} : {b}. Write it as two numbers separated by a colon.",
            answer=lambda p: "{sa}:{sb}",
            hint="Find the biggest number that divides both sides, then divide each side by it.",
            shortcut="Divide both sides by their highest common factor.",
            explanation="{a} : {b} - dividing both sides by the common factor gives {ans} (read the colon back from the fraction).",
            mentalPattern="A ratio behaves exactly like a fraction: cancel the common factor.",
            commonMistake="Dividing only one side, or cancelling a factor that divides just one side.",
            reason=reason, gen=gen, accepted=["{sa}/{sb}", "{sa} : {sb}"],
            verify=lambda p, a: a == "%d:%d" % (p["sa"], p["sb"]),
        )

    out.append(_simplify("Easy", "single common factor, small numbers"))
    out.append(_simplify("Medium", "larger common factor to spot"))
    out.append(_simplify("Hard", "the common factor is not obvious at a glance"))

    # ---- share a quantity -----------------------------------------------------
    def _share(parts, diff, reason):
        def gen(rng):
            a, b = pick(rng, parts)
            unit = pick(rng, (2, 3, 4, 5, 6, 8, 10))
            total = (a + b) * unit
            return {"a": a, "b": b, "total": total, "share": b * unit,
                    "thing": pick(rng, ("rupees", "marbles", "acres", "students", "litres"))}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["sharing"],
            question="Divide {total} {thing} between Ali and Sana in the ratio {a} : {b}. What is Sana's share?",
            answer=lambda p: F(p["share"]),
            hint="Add the ratio parts to get the total number of parts, work out what ONE part is worth, then multiply by the share you need.",
            shortcut="One part = {total} " + DIV + " ({a} + {b}); Sana gets {b} of those parts.",
            explanation="Total parts = {a} + {b}, so one part = {total} divided by that; Sana's {b} parts give {ans}.",
            mentalPattern="Ratio sharing: value of one part = total / (sum of parts).",
            commonMistake="Dividing by the wrong number of parts, or giving the first person's share.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["share"],
        )

    out.append(_share(((1, 2), (2, 3), (1, 4), (3, 5)), "Easy", "simple two-way split with a friendly total"))
    out.append(_share(((4, 5), (5, 7), (7, 9), (3, 7)), "Medium", "the value per part is a less obvious division"))
    out.append(_share(((5, 8), (7, 11), (9, 13), (11, 14)), "Hard", "large parts and an awkward division per part"))

    # ---- three-way share --------------------------------------------------------
    def _share3(diff, reason):
        def gen(rng):
            a, b, c = pick(rng, ((1, 2, 3), (2, 3, 5), (1, 3, 4), (2, 5, 7), (3, 4, 5)))
            unit = pick(rng, (3, 4, 5, 6, 8))
            total = (a + b + c) * unit
            return {"a": a, "b": b, "c": c, "total": total, "share": c * unit}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["sharing", "three-way"],
            question="Split {total} rupees among three workers in the ratio {a} : {b} : {c}. How much does the third worker get?",
            answer=lambda p: F(p["share"]),
            hint="Add all three ratio parts first, find the value of one part, then multiply by the third worker's parts.",
            shortcut="One part = {total} " + DIV + " ({a} + {b} + {c}); third worker = {c} parts.",
            explanation="Total parts = {a} + {b} + {c}; one part is {total} divided by that, so {c} parts give {ans} rupees.",
            mentalPattern="Three-way sharing works exactly like two-way: find one part, then scale.",
            commonMistake="Forgetting one of the three parts when adding.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["share"],
        )

    out.append(_share3("Medium", "three parts to add before dividing"))
    out.append(_share3("Hard", "three parts plus an awkward per-part value"))

    # ---- missing term -----------------------------------------------------------
    def _missing(diff, reason):
        def gen(rng):
            a = pick(rng, (2, 3, 4, 5, 6))
            b = pick(rng, (3, 5, 7, 9, 11))
            k = pick(rng, (2, 3, 4, 5, 6))
            return {"a": a, "b": b, "c": a * k}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["proportion"],
            question="{a} : {b} = {c} : x. Find x.",
            answer=lambda p: F(p["b"] * p["c"], p["a"]),
            hint="Write it as two equal fractions and cross-multiply: the missing term times {a} equals {b} times {c}.",
            shortcut="{a} x x = {b} x {c}, so x = ({b} x {c}) " + DIV + " {a}.",
            explanation="Cross-multiplying: {a} x x = {b} x {c}, so x = {ans}.",
            mentalPattern="Proportion: product of the means equals product of the extremes.",
            commonMistake="Multiplying the two numbers on the same side instead of cross-multiplying.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["a"] == p["b"] * p["c"],
        )

    out.append(_missing("Easy", "the scale factor between the ratios is obvious"))
    out.append(_missing("Medium", "cross-multiplication needed with bigger numbers"))
    out.append(_missing("Hard", "the division at the end is awkward"))

    # ---- ratio from a difference --------------------------------------------------
    def _difference(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((2, 3), (3, 5), (4, 7), (5, 8), (3, 7)))
            k = pick(rng, (2, 3, 4, 5, 6, 8))
            return {"a": a, "b": b, "diff": (b - a) * k}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["ratio-difference"],
            question="Two numbers are in the ratio {a} : {b} and their difference is {diff}. What is the larger number?",
            answer=lambda p: F(p["b"] * p["diff"], p["b"] - p["a"]),
            hint="The difference between the ratio parts is {diff_parts} parts, and that equals {diff} - so find one part first.",
            shortcut="One part = {diff} " + DIV + " {diff_parts}; larger number = {b} parts.",
            explanation="The gap of {diff_parts} parts equals {diff}, so one part is that divided by {diff_parts}; the larger number ({b} parts) is {ans}.",
            mentalPattern="With a difference, divide the gap by the difference in parts.",
            commonMistake="Dividing the difference by the sum of the parts instead of the difference of the parts.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, diff_parts=p["b"] - p["a"]))(_difference_gen(rng, ((2, 3), (3, 5), (4, 7), (5, 8), (3, 7)))),
            verify=lambda p, a: a * (p["b"] - p["a"]) == p["b"] * p["diff"],
        )

    def _difference_gen(rng, pairs):
        a, b = pick(rng, pairs)
        k = pick(rng, (2, 3, 4, 5, 6, 8))
        return {"a": a, "b": b, "diff": (b - a) * k}

    out.append(_difference("Medium", "the difference must be translated into ratio parts"))
    out.append(_difference("Hard", "difference plus a division that does not come out round"))

    # ---- direct proportion ----------------------------------------------------------
    def _direct(diff, reason):
        def gen(rng):
            qty = pick(rng, (3, 4, 5, 6, 8, 10, 12))
            unit = pick(rng, (7, 8, 12, 15, 20, 25, 30))
            new_qty = pick(rng, (5, 7, 9, 11, 15, 18, 24))
            return {"qty": qty, "unit": unit, "total": qty * unit, "new_qty": new_qty}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["direct-proportion"],
            question="If {qty} notebooks cost {total} rupees, what do {new_qty} notebooks cost?",
            answer=lambda p: F(p["unit"] * p["new_qty"]),
            hint="Find the price of ONE notebook first, then multiply by the number you need.",
            shortcut="One notebook = {total} " + DIV + " {qty} = {unit}; then " + MULT + " {new_qty}.",
            explanation="Unit cost = {total} / {qty} = {unit} rupees, so {new_qty} notebooks cost {ans} rupees.",
            mentalPattern="Direct proportion: find the unit value, then scale up.",
            commonMistake="Scaling the cost by the difference in quantities instead of the ratio.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["unit"] * p["new_qty"],
        )

    out.append(_direct("Easy", "unit cost is a clean division"))
    out.append(_direct("Medium", "larger quantities and a less friendly unit price"))
    out.append(_direct("Hard", "awkward unit cost multiplied by an awkward quantity"))

    # ---- inverse proportion ---------------------------------------------------------
    def _inverse(diff, reason):
        def gen(rng):
            men = pick(rng, (4, 5, 6, 8, 10, 12))
            days = pick(rng, (6, 8, 10, 12, 15, 20))
            new_men = pick(rng, (3, 4, 5, 6, 10, 15))
            return {"men": men, "days": days, "work": men * days, "new_men": new_men}

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["inverse-proportion"],
            question="{men} workers finish a job in {days} days. How many days would {new_men} workers take?",
            answer=lambda p: F(p["men"] * p["days"], p["new_men"]),
            hint="The total amount of work (workers x days) stays the same, so work out that total first and divide by the new number of workers.",
            shortcut="Total work = {men} x {days} = {work} worker-days; days = {work} " + DIV + " {new_men}.",
            explanation="Work is constant: {men} x {days} = {work} worker-days, so {new_men} workers need {work}/{new_men} = {ans} days.",
            mentalPattern="Inverse proportion: the PRODUCT of the two quantities stays constant.",
            commonMistake="Treating it as direct proportion and multiplying instead of dividing.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["new_men"] == p["men"] * p["days"],
        )

    out.append(_inverse("Easy", "constant product with round numbers"))
    out.append(_inverse("Medium", "the constant product is larger"))
    out.append(_inverse("Hard", "the final division does not come out whole"))

    # ---- combined ratio ------------------------------------------------------------
    def _combined(diff, reason):
        def gen(rng):
            return pick(rng, ({"a": 2, "b": 3, "c": 4, "d": 5},
                              {"a": 3, "b": 4, "c": 5, "d": 6},
                              {"a": 1, "b": 2, "c": 3, "d": 4},
                              {"a": 4, "b": 5, "c": 6, "d": 7}))

        return Fam(
            category="Ratios Proportions", difficulty=diff, tags=["combined-ratio"],
            question="If A : B = {a} : {b} and B : C = {b} : {c}, what is A : C? Give the answer as a fraction A/C in simplest form.",
            answer=lambda p: F(p["a"] * p["b"], p["b"] * p["c"]),
            hint="B appears in both ratios - make the two B values the same by scaling one ratio, then read off A to C.",
            shortcut="A/C = (A/B) x (B/C) = {a}/{b} x {b}/{c}.",
            explanation="Multiply the two ratios: A/C = {a}/{b} x {b}/{c} = {ans}.",
            mentalPattern="Chained ratios multiply: A/C = (A/B) x (B/C).",
            commonMistake="Adding the ratios instead of multiplying the fractions.",
            reason=reason, gen=gen, accepted=["{a}:{c}"],
            verify=lambda p, a: a == F(p["a"], p["c"]),
        )

    out.append(_combined("Medium", "two ratios must be linked through the shared term"))
    out.append(_combined("Hard", "the linking term differs and must be scaled first"))
    return out


# ================================================================ Profit Loss
def profit_families():
    out = []

    def _sp(pcts, diff, reason):
        def gen(rng):
            cp = pick(rng, (200, 300, 400, 500, 600, 800, 1000, 1200, 1500))
            p = pick(rng, pcts)
            kind = pick(rng, ("profit", "loss"))
            return {"cp": cp, "p": p, "kind": kind}

        return Fam(
            category="Profit Loss", difficulty=diff, tags=["selling-price"],
            question="An item costing {cp} rupees is sold at a {p}% {kind}. What is the selling price?",
            answer=lambda p: (F(p["cp"] * (100 + p["p"]), 100) if p["kind"] == "profit"
                              else F(p["cp"] * (100 - p["p"]), 100)),
            hint="Work out {p}% of the COST price first, then add it for a profit or subtract it for a loss.",
            shortcut="{p}% of {cp}, then {cp} plus (or minus) that amount.",
            explanation="The percentage is always taken on the cost price: {p}% of {cp}, then applied to {cp}, giving {ans} rupees.",
            mentalPattern="SP = CP x (100 plus or minus p)/100.",
            commonMistake="Taking the percentage of the selling price instead of the cost price.",
            reason=reason, gen=gen,
            verify=lambda p, a: ((a - p["cp"]) * 100 == p["cp"] * p["p"]) if p["kind"] == "profit"
                                else ((p["cp"] - a) * 100 == p["cp"] * p["p"]),
        )

    out.append(_sp((10, 20, 25, 50), "Easy", "benchmark percentage of a round cost price"))
    out.append(_sp((15, 30, 40, 60), "Medium", "chunking needed on the cost price"))
    out.append(_sp((12.5, 7.5, 17.5, 22.5), "Hard", "awkward percentage on the cost price"))

    def _profit_pct(diff, reason):
        def gen(rng):
            cp = pick(rng, (200, 250, 400, 500, 600, 800, 1000))
            p = pick(rng, (10, 15, 20, 25, 30, 40, 50)) if diff != "Hard" else pick(rng, (12, 16, 24, 35, 45))
            kind = pick(rng, ("profit", "loss"))
            sp = F(cp * (100 + p), 100) if kind == "profit" else F(cp * (100 - p), 100)
            return {"cp": cp, "sp": fmt(sp), "kind": kind}

        return Fam(
            category="Profit Loss", difficulty=diff, tags=["profit-percent"],
            question="An item is bought for {cp} rupees and sold for {sp} rupees. What is the {kind} percentage?",
            answer=lambda p: (F((F(p["sp"]) - p["cp"]) * 100, p["cp"]) if p["kind"] == "profit"
                              else F((p["cp"] - F(p["sp"])) * 100, p["cp"])),
            hint="Find the actual {kind} (the difference between the two prices) first, then express it as a percentage of the COST price.",
            shortcut="{kind} % = (difference / cost price) x 100.",
            explanation="Difference = the gap between {sp} and {cp}; as a percentage of the cost price {cp} that is {ans}%.",
            mentalPattern="Profit and loss percentages always divide by the COST price, never the selling price.",
            commonMistake="Dividing by the selling price.",
            reason=reason, gen=gen, unit="%",
            verify=lambda p, a: (a * p["cp"] == (F(p["sp"]) - p["cp"]) * 100) if p["kind"] == "profit"
                                else (a * p["cp"] == (p["cp"] - F(p["sp"])) * 100),
        )

    out.append(_profit_pct("Easy", "the gap divides into the cost price cleanly"))
    out.append(_profit_pct("Medium", "larger numbers; simplify the fraction before converting"))
    out.append(_profit_pct("Hard", "the percentage does not come out as a round benchmark"))

    def _cp_from_sp(diff, reason):
        def gen(rng):
            base = pick(rng, (200, 300, 400, 500, 600, 800, 900))
            p = pick(rng, (10, 20, 25, 50)) if diff == "Easy" else pick(rng, (15, 30, 40, 60, 75))
            kind = pick(rng, ("profit", "loss"))
            sp = F(base * (100 + p), 100) if kind == "profit" else F(base * (100 - p), 100)
            return {"sp": fmt(sp), "p": p, "kind": kind}

        return Fam(
            category="Profit Loss", difficulty=diff, tags=["cost-price"],
            question="After selling an item at a {p}% {kind}, the selling price is {sp} rupees. What was the cost price?",
            answer=lambda p: (F(F(p["sp"]) * 100, 100 + p["p"]) if p["kind"] == "profit"
                              else F(F(p["sp"]) * 100, 100 - p["p"])),
            hint="Call the cost price x. The selling price is x with {p}% added (or taken away), so divide {sp} by that multiplier.",
            shortcut="CP = {sp} " + DIV + " (100 plus or minus {p})/100.",
            explanation="SP = CP x (100 plus or minus {p})/100, so CP = {sp} x 100 / (100 plus or minus {p}) = {ans} rupees.",
            mentalPattern="Undo a percentage change by dividing by the multiplier, never by subtracting the same percentage.",
            commonMistake="Subtracting {p}% of the selling price to get back to the cost price.",
            reason=reason, gen=gen,
            verify=lambda p, a: (a * (100 + p["p"]) == F(p["sp"]) * 100) if p["kind"] == "profit"
                                else (a * (100 - p["p"]) == F(p["sp"]) * 100),
        )

    out.append(_cp_from_sp("Easy", "undoing a benchmark percentage"))
    out.append(_cp_from_sp("Medium", "undoing a non-benchmark percentage"))
    out.append(_cp_from_sp("Hard", "the reverse division is awkward"))

    # ---- discount --------------------------------------------------------------
    def _discount(pcts, diff, reason):
        def gen(rng):
            marked = pick(rng, (200, 400, 500, 600, 800, 1000, 1200))
            p = pick(rng, pcts)
            return {"marked": marked, "p": p}

        return Fam(
            category="Profit Loss", difficulty=diff, tags=["discount"],
            question="A shirt is marked at {marked} rupees and is sold at a {p}% discount. What is the selling price?",
            answer=lambda p: F(p["marked"] * (100 - p["p"]), 100),
            hint="Work out the discount AMOUNT first ({p}% of the marked price), then subtract it from the marked price.",
            shortcut="Discount = {p}% of {marked}; selling price = {marked} " + MINUS + " discount.",
            explanation="{p}% of {marked} is taken off, leaving {ans} rupees.",
            mentalPattern="Discount is always on the MARKED price, and the customer pays (100 minus p)%.",
            commonMistake="Subtracting the percentage from the price as if it were rupees.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 100 == p["marked"] * (100 - p["p"]),
        )

    out.append(_discount((10, 20, 25, 50), "Easy", "benchmark discount of a round marked price"))
    out.append(_discount((15, 30, 40, 60), "Medium", "chunking needed for the discount amount"))
    out.append(_discount((12.5, 7.5, 17.5, 22.5), "Hard", "awkward discount percentage"))

    # ---- successive discount ------------------------------------------------------
    def _successive_disc(diff, reason):
        def gen(rng):
            marked = pick(rng, (400, 600, 800, 1000, 1200))
            p1, p2 = pick(rng, ((10, 20), (20, 10), (20, 25), (10, 10), (25, 20)))
            return {"marked": marked, "p1": p1, "p2": p2}

        return Fam(
            category="Profit Loss", difficulty=diff, tags=["successive-discount"],
            question="A shop gives two successive discounts of {p1}% and {p2}% on a marked price of {marked} rupees. What is the final price?",
            answer=lambda p: F(p["marked"] * (100 - p["p1"]) * (100 - p["p2"]), 10000),
            hint="Apply the discounts one after the other: the second percentage is taken on the price AFTER the first discount, not on the original.",
            shortcut="Multiply by (100 " + MINUS + " {p1})/100 then by (100 " + MINUS + " {p2})/100.",
            explanation="First discount leaves {marked} x (100 - {p1})/100; the second is taken on that, giving {ans} rupees.",
            mentalPattern="Successive discounts multiply - they never add up to a single bigger percentage.",
            commonMistake="Adding the two percentages and taking them off once.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 10000 == p["marked"] * (100 - p["p1"]) * (100 - p["p2"]),
        )

    out.append(_successive_disc("Medium", "two chained percentage steps"))
    out.append(_successive_disc("Hard", "two chained steps that do not come out round"))

    # ---- overall profit on two items -----------------------------------------------
    def _two_items(diff, reason):
        def gen(rng):
            cp = pick(rng, (100, 200, 300, 400, 500))
            p1 = pick(rng, (10, 20, 25, 50))
            p2 = pick(rng, (10, 20, 25, 50))
            return {"cp": cp, "p1": p1, "p2": p2}

        return Fam(
            category="Profit Loss", difficulty=diff, tags=["overall"],
            question="Two items each cost {cp} rupees. One is sold at {p1}% profit and the other at {p2}% profit. What is the total profit in rupees?",
            answer=lambda p: F(p["cp"] * (p["p1"] + p["p2"]), 100),
            hint="Work out each profit separately (percentage of that item's cost price) and add the two rupee amounts - do not average the percentages.",
            shortcut="Profit = {cp} x {p1}/100 + {cp} x {p2}/100.",
            explanation="{p1}% of {cp} plus {p2}% of {cp} gives a total profit of {ans} rupees.",
            mentalPattern="Equal cost prices: the overall percentage is the plain average; unequal costs need a weighted average.",
            commonMistake="Averaging the percentages and applying once (that only works when the cost prices are equal).",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 100 == p["cp"] * (p["p1"] + p["p2"]),
        )

    out.append(_two_items("Easy", "two benchmark percentages of the same cost"))
    out.append(_two_items("Medium", "two steps with larger amounts"))
    out.append(_two_items("Hard", "the two profits must be combined carefully"))
    return out


# ==================================================================== Averages
def average_families():
    out = []

    def _basic(counts, ranges, diff, reason):
        def gen(rng):
            n = pick(rng, counts)
            nums = [rand_int(rng, ranges[0], ranges[1]) for _ in range(n)]
            # nudge the last term so the average comes out as a whole number
            nums[-1] += (-sum(nums)) % n
            return {"nums": ", ".join(str(x) for x in nums), "n": n, "total": sum(nums)}

        return Fam(
            category="Averages", difficulty=diff, tags=["basic-average"],
            question="Find the average of these {n} numbers: {nums}.",
            answer=lambda p: F(p["total"], p["n"]),
            hint="Add all the numbers (pair a big one with a small one to make it easy), then divide by how many there are.",
            shortcut="Average = total " + DIV + " {n}.",
            explanation="Total = sum of the values, and dividing by {n} gives {ans}.",
            mentalPattern="Average = total / count, so total = average x count.",
            commonMistake="Dividing by the wrong count, or mis-adding the list.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["n"] == p["total"],
        )

    out.append(_basic((3, 4, 5), (2, 20), "Easy", "short list of small numbers"))
    out.append(_basic((5, 6, 7), (11, 60), "Medium", "longer list of two-digit numbers"))
    out.append(_basic((6, 7, 8), (13, 99), "Hard", "long list of larger numbers to add mentally"))

    def _consecutive(diff, reason):
        def gen(rng):
            n = pick(rng, (5, 7, 9)) if diff != "Hard" else pick(rng, (11, 15, 21, 25))
            start = pick(rng, (2, 3, 5, 10, 12, 20))
            return {"start": start, "n": n, "end": start + n - 1}

        return Fam(
            category="Averages", difficulty=diff, tags=["consecutive"],
            question="What is the average of the whole numbers from {start} to {end}?",
            answer=lambda p: F(2 * p["start"] + p["n"] - 1, 2),
            hint="In an evenly spaced list the average is simply the middle number - or add the first and last and halve.",
            shortcut="Average = (first + last) " + DIV + " 2.",
            explanation="The list is evenly spaced, so the average is ({start} + {end}) / 2 = {ans}.",
            mentalPattern="Evenly spaced list: average = (first + last)/2 = the middle term.",
            commonMistake="Adding every term instead of using the first-plus-last shortcut.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 2 == 2 * p["start"] + p["n"] - 1,
        )

    out.append(_consecutive("Easy", "short evenly spaced list"))
    out.append(_consecutive("Medium", "longer evenly spaced list"))
    out.append(_consecutive("Hard", "long list where only the shortcut is realistic"))

    def _missing(diff, reason):
        def gen(rng):
            n = pick(rng, (4, 5, 6))
            avg = pick(rng, (10, 12, 15, 18, 20, 25))
            known = [rand_int(rng, avg - 8, avg + 8) for _ in range(n - 1)]
            total = avg * n
            missing = total - sum(known)
            return {"n": n, "avg": avg, "nums": ", ".join(str(x) for x in known), "missing": missing}

        return Fam(
            category="Averages", difficulty=diff, tags=["missing-value"],
            question="The average of {n} numbers is {avg}. {n_minus} of them are: {nums}. What is the missing number?",
            answer=lambda p: F(p["missing"]),
            hint="Total = average x count. Work out the total the list must add to, then subtract the numbers you already have.",
            shortcut="Total = {avg} x {n}; subtract the known values.",
            explanation="The complete total is {avg} x {n}; taking away the known numbers leaves {ans}.",
            mentalPattern="Reverse the average: total = average x count, then compare with what you have.",
            commonMistake="Averaging the known numbers instead of using the given average.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, n_minus=p["n"] - 1))(_missing_gen(rng)),
            verify=lambda p, a: a + sum(int(x) for x in p["nums"].split(", ")) == p["avg"] * p["n"],
        )

    def _missing_gen(rng):
        n = pick(rng, (4, 5, 6))
        avg = pick(rng, (10, 12, 15, 18, 20, 25))
        known = [rand_int(rng, avg - 8, avg + 8) for _ in range(n - 1)]
        return {"n": n, "avg": avg, "nums": ", ".join(str(x) for x in known),
                "missing": avg * n - sum(known), "n_minus": n - 1}

    out.append(_missing("Easy", "reverse the average with small numbers"))
    out.append(_missing("Medium", "reverse the average with a longer list"))
    out.append(_missing("Hard", "reverse the average where the missing value is negative or large"))

    def _new_average(diff, reason):
        def gen(rng):
            n = pick(rng, (4, 5, 6, 8, 10))
            avg = pick(rng, (20, 25, 30, 40, 50))
            new_avg = avg + pick(rng, (2, 4, 5, 10))
            return {"n": n, "avg": avg, "new_avg": new_avg, "extra": (new_avg - avg) * (n + 1) + avg}

        return Fam(
            category="Averages", difficulty=diff, tags=["new-average"],
            question="The average of {n} scores is {avg}. What must the next score be to raise the average to {new_avg}?",
            answer=lambda p: F(p["extra"]),
            hint="Work out the total needed for the new average over (n + 1) scores, then subtract the total you already have.",
            shortcut="Needed total = {new_avg} x ({n} + 1); subtract {avg} x {n}.",
            explanation="The new total must be {new_avg} x ({n} + 1), and the current total is {avg} x {n}, so the next score is {ans}.",
            mentalPattern="Average change: extra = (new average - old average) x new count + old average.",
            commonMistake="Using the old count instead of the new count when working out the needed total.",
            reason=reason, gen=gen,
            verify=lambda p, a: (p["avg"] * p["n"] + a) == p["new_avg"] * (p["n"] + 1),
        )

    out.append(_new_average("Medium", "two-step: new total minus old total"))
    out.append(_new_average("Hard", "larger counts and a bigger jump in the average"))

    def _replacement(diff, reason):
        def gen(rng):
            n = pick(rng, (4, 5, 6, 10))
            avg = pick(rng, (20, 30, 40, 50))
            rise = pick(rng, (1, 2, 3, 5))
            removed = pick(rng, (10, 15, 20, 25, 30))
            return {"n": n, "avg": avg, "rise": rise, "removed": removed,
                    "new_avg": avg + rise, "added": removed + rise * n}

        return Fam(
            category="Averages", difficulty=diff, tags=["replacement"],
            question="The average of {n} numbers is {avg}. One number, {removed}, is replaced and the average rises by {rise}. What is the new number?",
            answer=lambda p: F(p["added"]),
            hint="A rise in the average means the TOTAL went up by (rise x count). Add that increase to the number that was removed.",
            shortcut="New number = {removed} + {rise} x {n}.",
            explanation="The total rises by {rise} x {n}, so the replacement number is {removed} plus that = {ans}.",
            mentalPattern="Replacement: change in total = change in average x count.",
            commonMistake="Setting the new number equal to the new average.",
            reason=reason, gen=gen,
            verify=lambda p, a: a - p["removed"] == p["rise"] * p["n"],
        )

    out.append(_replacement("Medium", "connect the change in average to the change in total"))
    out.append(_replacement("Hard", "larger count and a bigger shift"))

    def _weighted(diff, reason):
        def gen(rng):
            n1 = pick(rng, (2, 3, 4, 5))
            n2 = pick(rng, (2, 3, 4, 6))
            a1 = pick(rng, (10, 20, 30, 40))
            a2 = pick(rng, (50, 60, 70, 80))
            # choose a2 so (n1*a1 + n2*a2) divides evenly by the class size
            for cand in range(a2, a2 + (n1 + n2) + 1):
                if (n1 * a1 + n2 * cand) % (n1 + n2) == 0:
                    a2 = cand
                    break
            return {"n1": n1, "n2": n2, "a1": a1, "a2": a2}

        return Fam(
            category="Averages", difficulty=diff, tags=["weighted-average"],
            question="A class has {n1} students averaging {a1} marks and {n2} students averaging {a2} marks. What is the class average?",
            answer=lambda p: F(p["n1"] * p["a1"] + p["n2"] * p["a2"], p["n1"] + p["n2"]),
            hint="A weighted average is not the mean of the two averages: work out each group's TOTAL marks, add them, and divide by the total number of students.",
            shortcut="Total marks = {n1} x {a1} + {n2} x {a2}; divide by ({n1} + {n2}) students.",
            explanation="Group totals are {n1} x {a1} and {n2} x {a2}; over {n1} + {n2} students the average is {ans}.",
            mentalPattern="Weighted average = sum of (weight x value) / sum of weights.",
            commonMistake="Averaging the two averages as if the groups were the same size.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * (p["n1"] + p["n2"]) == p["n1"] * p["a1"] + p["n2"] * p["a2"],
        )

    out.append(_weighted("Easy", "small equal-ish groups with round averages"))
    out.append(_weighted("Medium", "uneven group sizes"))
    out.append(_weighted("Hard", "uneven groups and a division that does not come out whole"))
    return out


def families():
    return ratio_families() + profit_families() + average_families()
