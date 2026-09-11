"""Question families: Work Time, Pipes Tanks, Unit Conversion, Basic Arithmetic."""
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt


# ================================================================= Work Time
def work_families():
    out = []

    # ---- rate x time --------------------------------------------------------
    def _rate(units, hours, diff, reason):
        def gen(rng):
            return {"r": pick(rng, units), "h": pick(rng, hours),
                    "job": pick(rng, ("shirts", "bricks", "pages", "boxes", "chairs"))}

        return Fam(
            category="Work Time", difficulty=diff, tags=["rate"],
            question="A worker makes {r} {job} per hour. How many {job} does he make in {h} hours?",
            answer=lambda p: F(p["r"] * p["h"]),
            hint="Multiply the hourly rate by the number of hours.",
            shortcut="{r} x {h}.",
            explanation="Output = rate x time = {r} x {h} = {ans} {job}.",
            mentalPattern="Units check: items/hour x hours leaves items.",
            commonMistake="Dividing instead of multiplying.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["r"] * p["h"],
        )

    out.append(_rate((5, 8, 10, 12, 15), (2, 3, 4, 5, 6), "Easy", "single multiplication"))
    out.append(_rate((14, 16, 18, 24, 25), (5, 6, 7, 8, 9), "Medium", "two-digit multiplication"))
    out.append(_rate((23, 27, 34, 46), (4, 6, 8, 12), "Hard", "awkward two-digit multiplication"))

    # ---- man-days --------------------------------------------------------------
    def _mandays(men, days, new_men, diff, reason):
        def gen(rng):
            m = pick(rng, men)
            d = pick(rng, days)
            work = m * d
            # only offer a team size that divides the work into whole days
            options = [n for n in new_men if work % n == 0]
            n = pick(rng, options or new_men)
            if work % n:
                work = n * (work // n)
            return {"m": m, "d": d, "n": n, "work": work}

        return Fam(
            category="Work Time", difficulty=diff, tags=["man-days"],
            question="{m} men can finish a job in {d} days. How many days will {n} men take?",
            answer=lambda p: F(p["m"] * p["d"], p["n"]),
            hint="The total work (men x days) never changes: work it out first, then divide by the new number of men.",
            shortcut="Total work = {m} x {d}; days = total " + DIV + " {n}.",
            explanation="Work = {m} x {d} = {work} man-days, so {n} men need {work}/{n} = {ans} days.",
            mentalPattern="Men and days are inversely proportional: their product is constant.",
            commonMistake="Treating it as direct proportion.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["n"] == p["m"] * p["d"],
        )

    out.append(_mandays((4, 5, 6, 8), (6, 8, 10, 12), (2, 4, 8, 12, 16), "Easy", "the new number of men divides the work exactly"))
    out.append(_mandays((6, 9, 12, 15), (8, 10, 12, 16), (4, 5, 10, 18, 20), "Medium", "larger work total to divide"))
    out.append(_mandays((7, 11, 13), (9, 12, 15), (3, 6, 7, 14, 21), "Hard", "the division leaves a fraction of a day"))

    # ---- two workers together ----------------------------------------------------
    def _together(pairs, diff, reason):
        def gen(rng):
            a, b = pick(rng, pairs)
            return {"a": a, "b": b}

        return Fam(
            category="Work Time", difficulty=diff, tags=["combined-work"],
            question="Ali can finish a job in {a} days and Bilal can finish it in {b} days. Working together, how many days do they take?",
            answer=lambda p: F(p["a"] * p["b"], p["a"] + p["b"]),
            hint="Add their RATES, not their times: in one day they finish 1/{a} + 1/{b} of the job, then invert that.",
            shortcut="Together = ({a} x {b}) / ({a} + {b}) days.",
            explanation="Combined rate = 1/{a} + 1/{b} = ({a} + {b})/({a} x {b}), so the time is {a} x {b} / ({a} + {b}) = {ans} days.",
            mentalPattern="Two workers: (a x b)/(a + b). It is never the average of the two times.",
            commonMistake="Adding or averaging the times instead of adding the rates.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * (p["a"] + p["b"]) == p["a"] * p["b"],
        )

    out.append(_together(((6, 12), (4, 12), (10, 15), (6, 3)), "Easy", "one time is a multiple of the other"))
    out.append(_together(((8, 24), (9, 18), (12, 24), (10, 40)), "Medium", "the product over sum needs care"))
    out.append(_together(((14, 35), (21, 28), (12, 36), (16, 48)), "Hard", "awkward product-over-sum division"))

    # ---- three workers ------------------------------------------------------------
    def _three(diff, reason):
        def gen(rng):
            k = pick(rng, (1, 2, 3, 4, 5, 6)) if diff == "Medium" else pick(rng, (4, 6, 8, 10, 12))
            # (6k, 3k, 2k) has rates 1/6k + 1/3k + 1/2k = 1/k, so the answer is k days
            return {"a": 6 * k, "b": 3 * k, "c": 2 * k}

        return Fam(
            category="Work Time", difficulty=diff, tags=["combined-work", "three-workers"],
            question="Three workers can each finish a job alone in {a}, {b} and {c} days. Working together, how many days do they take?",
            answer=lambda p: F(1, 1) / (F(1, p["a"]) + F(1, p["b"]) + F(1, p["c"])),
            hint="Add all three one-day rates (one divided by each worker's time), then invert the total to get the time.",
            shortcut="Add the three unit fractions, then flip the result.",
            explanation="Combined rate = 1/{a} + 1/{b} + 1/{c}; inverting that gives {ans} days.",
            mentalPattern="Rates add; times never do. Invert the summed rate for the time.",
            commonMistake="Adding the three times together.",
            reason=reason, gen=gen,
            verify=lambda p, a: (F(1, a) == F(1, p["a"]) + F(1, p["b"]) + F(1, p["c"])),
        )

    out.append(_three("Medium", "three rates must be added with a common denominator"))
    out.append(_three("Hard", "three awkward unit fractions to add, then invert"))

    # ---- efficiency ratio ----------------------------------------------------------
    def _efficiency(diff, reason):
        def gen(rng):
            k = pick(rng, (2, 3, 4))
            base = k * pick(rng, (4, 5, 6, 8, 10, 12))     # keeps the answer a whole number of days
            return {"base": base, "k": k, "fast": F(base, k)}

        return Fam(
            category="Work Time", difficulty=diff, tags=["efficiency"],
            question="A finishes a job in {base} days. B is {k} times as efficient as A. How many days does B take alone?",
            answer=lambda p: F(p["base"], p["k"]),
            hint="Efficiency and time are inversely proportional: {k} times the efficiency means the time is divided by {k}.",
            shortcut="B's time = {base} " + DIV + " {k}.",
            explanation="B works {k} times faster, so B needs {base} / {k} = {ans} days.",
            mentalPattern="Efficiency ratio k : 1 means time ratio 1 : k.",
            commonMistake="Multiplying the time by {k} instead of dividing.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["k"] == p["base"],
        )

    out.append(_efficiency("Easy", "simple inverse of a small factor"))
    out.append(_efficiency("Medium", "larger base time to divide"))
    out.append(_efficiency("Hard", "the division leaves a fraction of a day"))

    # ---- one worker leaves -----------------------------------------------------------
    def _leaves(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((6, 12), (8, 24), (10, 15), (12, 24)))
            days = pick(rng, (2, 3, 4))
            return {"a": a, "b": b, "days": days}

        return Fam(
            category="Work Time", difficulty=diff, tags=["partial-work"],
            question="A can do a job in {a} days and B in {b} days. They work together for {days} days, then A leaves. How many more days does B need?",
            answer=lambda p: (F(1, 1) - (F(1, p["a"]) + F(1, p["b"])) * p["days"]) * p["b"],
            hint="Work out how much of the job the pair finished in {days} days, subtract that from one whole, then see how long B needs for the rest at 1/{b} per day.",
            shortcut="Done = {days} x (1/{a} + 1/{b}); remaining x {b} = B's extra days.",
            explanation="Together they finish {days} x (1/{a} + 1/{b}) of the job; the remainder takes B {ans} more days at 1/{b} per day.",
            mentalPattern="Think in fractions of the whole job: 1 minus what is done, divided by the remaining worker's rate.",
            commonMistake="Forgetting to subtract the work already completed.",
            reason=reason, gen=gen,
            verify=lambda p, a: F(a, p["b"]) + (F(1, p["a"]) + F(1, p["b"])) * p["days"] == 1,
        )

    out.append(_leaves("Medium", "two stages: work done, then work left"))
    out.append(_leaves("Hard", "two stages with an awkward remainder"))

    # ---- A and B together, find B ----------------------------------------------------
    def _find_b(diff, reason):
        def gen(rng):
            a, t = pick(rng, ((6, 4), (12, 8), (10, 6), (15, 10), (20, 12)))
            return {"a": a, "t": t}

        return Fam(
            category="Work Time", difficulty=diff, tags=["combined-work", "reverse"],
            question="A alone takes {a} days; A and B together take {t} days. How many days would B take alone?",
            answer=lambda p: F(1, 1) / (F(1, p["t"]) - F(1, p["a"])),
            hint="Subtract A's one-day rate from the combined one-day rate to get B's rate, then invert it.",
            shortcut="B's rate = 1/{t} " + MINUS + " 1/{a}; B's time = 1 " + DIV + " that.",
            explanation="1/{t} " + MINUS + " 1/{a} is B's one-day rate, so B alone takes {ans} days.",
            mentalPattern="Combined rate minus known rate gives the unknown rate; invert for the time.",
            commonMistake="Subtracting the times instead of the rates.",
            reason=reason, gen=gen,
            verify=lambda p, a: F(1, a) + F(1, p["a"]) == F(1, p["t"]),
        )

    out.append(_find_b("Medium", "subtract rates, then invert"))
    out.append(_find_b("Hard", "the subtraction of unit fractions is fiddly"))
    return out


# ================================================================= Pipes Tanks
def pipe_families():
    out = []

    def _two_fill(pairs, diff, reason):
        def gen(rng):
            a, b = pick(rng, pairs)
            return {"a": a, "b": b}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["filling"],
            question="Pipe A fills a tank in {a} hours and pipe B fills it in {b} hours. How long do they take together?",
            answer=lambda p: F(p["a"] * p["b"], p["a"] + p["b"]),
            hint="Add the RATES (1/{a} + 1/{b} of the tank per hour), then invert the total - never average the times.",
            shortcut="Together = ({a} x {b}) / ({a} + {b}) hours.",
            explanation="Combined rate = 1/{a} + 1/{b} = ({a} + {b})/({a} x {b}), so the time is {ans} hours.",
            mentalPattern="Two pipes: (a x b)/(a + b), exactly like two workers.",
            commonMistake="Averaging the two times.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * (p["a"] + p["b"]) == p["a"] * p["b"],
        )

    out.append(_two_fill(((3, 6), (4, 12), (5, 20), (6, 12)), "Easy", "one time is a multiple of the other"))
    out.append(_two_fill(((8, 24), (9, 18), (12, 24), (10, 40)), "Medium", "product over sum with bigger numbers"))
    out.append(_two_fill(((14, 35), (21, 28), (12, 36), (16, 48)), "Hard", "awkward product-over-sum"))

    def _fill_empty(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((3, 6), (4, 6), (6, 8), (4, 12), (6, 12),
                              (10, 15), (9, 12), (12, 18), (8, 24), (15, 20)))
            return {"a": a, "b": b}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["filling", "emptying"],
            question="A pipe fills a tank in {a} hours, but a leak empties it in {b} hours. With both open, how long does it take to fill?",
            answer=lambda p: F(1, 1) / (F(1, p["a"]) - F(1, p["b"])),
            hint="A filling pipe adds a positive rate and a leak subtracts. Take 1/{a} " + MINUS + " 1/{b} and invert the NET rate.",
            shortcut="Net rate = 1/{a} " + MINUS + " 1/{b}; time = 1 " + DIV + " net rate.",
            explanation="Net rate = 1/{a} " + MINUS + " 1/{b}, so filling takes {ans} hours.",
            mentalPattern="Opposite rates subtract; the net rate is slower than either pipe alone.",
            commonMistake="Adding the rates even though one empties the tank.",
            reason=reason, gen=gen,
            verify=lambda p, a: F(1, a) == F(1, p["a"]) - F(1, p["b"]),
        )

    out.append(_fill_empty("Easy", "the net rate is a simple difference"))
    out.append(_fill_empty("Medium", "the difference of unit fractions needs a common denominator"))
    out.append(_fill_empty("Hard", "awkward unit fractions and a slow net rate"))

    def _partial(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((6, 12), (4, 12), (8, 24), (10, 20)))
            # stop well before the tank would be full with both pipes running
            limit = int(F(a * b, a + b))
            hours = pick(rng, tuple(h for h in (1, 2, 3, 4) if h < limit) or (1,))
            return {"a": a, "b": b, "h": hours}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["filling", "two-stage"],
            question="Pipes A ({a} hours) and B ({b} hours) fill a tank together for {h} hours, then A is closed. How many more hours does B need?",
            answer=lambda p: (F(1, 1) - (F(1, p["a"]) + F(1, p["b"])) * p["h"]) * p["b"],
            hint="Find the fraction filled in the first {h} hours, subtract it from one whole tank, then divide the remainder by B's rate (1/{b} per hour).",
            shortcut="Filled = {h} x (1/{a} + 1/{b}); remaining x {b} = extra hours.",
            explanation="After {h} hours the pair have filled part of the tank; the rest takes B {ans} more hours at 1/{b} per hour.",
            mentalPattern="Work in fractions of the tank: 1 minus what is filled, divided by the remaining rate.",
            commonMistake="Forgetting the part already filled.",
            reason=reason, gen=gen,
            verify=lambda p, a: F(a, p["b"]) + (F(1, p["a"]) + F(1, p["b"])) * p["h"] == 1,
        )

    out.append(_partial("Medium", "two-stage filling problem"))
    out.append(_partial("Hard", "two stages with an awkward remainder"))

    def _three_pipes(diff, reason):
        def gen(rng):
            k = pick(rng, (1, 2, 3, 4)) if diff == "Medium" else pick(rng, (4, 5, 6, 8))
            return {"a": 6 * k, "b": 3 * k, "c": 2 * k}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["filling", "three-pipes"],
            question="Three pipes fill a tank in {a}, {b} and {c} hours. With all three open, how long does it take?",
            answer=lambda p: F(1, 1) / (F(1, p["a"]) + F(1, p["b"]) + F(1, p["c"])),
            hint="Add all three hourly rates (one divided by each pipe's time) and invert the total.",
            shortcut="Add the three unit fractions, then flip the answer.",
            explanation="Total rate = 1/{a} + 1/{b} + 1/{c}; inverting gives {ans} hours.",
            mentalPattern="Rates add; the combined time is always less than the fastest pipe alone.",
            commonMistake="Adding the times.",
            reason=reason, gen=gen,
            verify=lambda p, a: F(1, a) == F(1, p["a"]) + F(1, p["b"]) + F(1, p["c"]),
        )

    out.append(_three_pipes("Medium", "three rates to add"))
    out.append(_three_pipes("Hard", "three awkward unit fractions"))
    return out


# ============================================================== Unit Conversion
def unit_families():
    out = []

    def _simple(pairs, unit_in, unit_out, factor, diff, reason):
        def gen(rng):
            return {"v": pick(rng, pairs), "ui": unit_in, "uo": unit_out, "factor": factor}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["metric"],
            question="Convert {v} {ui} into {uo}.",
            answer=lambda p: F(p["v"] * factor),
            hint="Multiply by the conversion factor ({factor}), or shift the digits if the factor is a power of ten.",
            shortcut="{v} x {factor} = {ans} {uo}.",
            explanation="1 {ui} = {factor} {uo}, so {v} {ui} = {v} x {factor} = {ans} {uo}.",
            mentalPattern="Metric conversions are powers of ten: move the digits, do not do long multiplication.",
            commonMistake="Dividing when the unit is getting smaller (or the reverse).",
            reason=reason, gen=gen, unit=unit_out,
            verify=lambda p, a: a == p["v"] * factor,
        )

    out.append(_simple((2, 3, 5, 7, 10, 12), "km", "m", 1000, "Easy", "single step with a power of ten"))
    out.append(_simple((3, 4, 6, 8, 15, 25), "kg", "g", 1000, "Easy", "single step with a power of ten"))
    out.append(_simple((2, 4, 5, 8, 10), "hours", "minutes", 60, "Easy", "multiply by 60"))
    out.append(_simple((4, 6, 9, 12, 20, 30), "m", "cm", 100, "Medium", "two-step powers of ten"))
    out.append(_simple((2, 3, 5, 6, 8, 10), "litres", "ml", 1000, "Medium", "larger numbers after conversion"))
    out.append(_simple((120, 180, 240, 300, 600), "minutes", "hours", 0, "Medium", "divide by 60", ))

    # the last one needs a division - rebuild it properly
    out.pop()

    def _divconv(pairs, unit_in, unit_out, divisor, diff, reason):
        def gen(rng):
            v = pick(rng, pairs)
            return {"v": v, "divisor": divisor, "ui": unit_in, "uo": unit_out}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["metric", "division"],
            question="Convert {v} {ui} into {uo}.",
            answer=lambda p: F(p["v"], p["divisor"]),
            hint="The new unit is LARGER, so divide by {divisor}.",
            shortcut="{v} " + DIV + " {divisor} = {ans} {uo}.",
            explanation="There are {divisor} {ui} in 1 {uo}, so {v} {ui} = {v} " + DIV + " {divisor} = {ans} {uo}.",
            mentalPattern="Small unit to big unit: divide. Big unit to small unit: multiply.",
            commonMistake="Multiplying when the target unit is larger.",
            reason=reason, gen=gen, unit=unit_out,
            verify=lambda p, a: a * p["divisor"] == p["v"],
        )

    out.append(_divconv((60, 90, 120, 180, 240, 300), "minutes", "hours", 60, "Medium", "divide by 60"))
    out.append(_divconv((250, 500, 750, 1250, 1500, 2500), "g", "kg", 1000, "Hard", "divide by 1000 and keep the decimal"))
    out.append(_divconv((25, 75, 125, 250, 375, 625), "cm", "m", 100, "Hard", "divide by 100 with a decimal answer"))

    def _speed(diff, reason):
        def gen(rng):
            return {"v": pick(rng, (18, 27, 36, 45, 54, 63, 72, 81, 90, 108))}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["speed-conversion"],
            question="Convert {v} km/h into metres per second.",
            answer=lambda p: F(p["v"] * 5, 18),
            hint="Multiply by five eighteenths: divide by eighteen first when that goes evenly, then multiply by five.",
            shortcut="{v} x 5/18 = {ans} m/s.",
            explanation="1 km/h = 5/18 m/s, so {v} km/h = {v} x 5/18 = {ans} m/s.",
            mentalPattern="km/h to m/s is x 5/18; m/s to km/h is x 3.6.",
            commonMistake="Using 18/5 by mistake.",
            reason=reason, gen=gen, unit="m/s",
            verify=lambda p, a: a * 18 == p["v"] * 5,
        )

    out.append(_speed("Easy", "standard conversion with a speed divisible by 18"))
    out.append(_speed("Medium", "the division by 18 is less obvious"))

    def _speed_back(diff, reason):
        def gen(rng):
            return {"v": pick(rng, (5, 10, 15, 20, 25, 30, 35, 40))}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["speed-conversion"],
            question="Convert {v} m/s into km/h.",
            answer=lambda p: F(p["v"] * 18, 5),
            hint="Multiply by eighteen fifths (three point six): multiply by eighteen first, then divide by five.",
            shortcut="{v} x 3.6 = {ans} km/h.",
            explanation="1 m/s = 3.6 km/h, so {v} m/s = {ans} km/h.",
            mentalPattern="m/s to km/h: multiply by 18 and divide by 5.",
            commonMistake="Multiplying by 5/18 instead of 18/5.",
            reason=reason, gen=gen, unit="km/h",
            verify=lambda p, a: a * 5 == p["v"] * 18,
        )

    out.append(_speed_back("Easy", "multiply by 3.6 with a round value"))
    out.append(_speed_back("Medium", "larger value to convert back"))

    def _area(diff, reason):
        def gen(rng):
            return {"v": pick(rng, (2, 3, 4, 5, 6, 8, 10))}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["area"],
            question="How many square centimetres are there in {v} square metres?",
            answer=lambda p: F(p["v"] * 10000),
            hint="A square metre is 100 cm by 100 cm, so the AREA factor is 100 x 100 - not 100.",
            shortcut="{v} x 100 x 100 = {ans} cm squared.",
            explanation="1 m = 100 cm, so 1 square m = 100 x 100 = 10,000 square cm; {v} square m = {ans} square cm.",
            mentalPattern="Square the length factor when converting areas.",
            commonMistake="Using the length factor (100) instead of the area factor (10,000).",
            reason=reason, gen=gen, unit="cm2",
            verify=lambda p, a: a == p["v"] * 10000,
        )

    out.append(_area("Medium", "squared conversion factor"))
    out.append(_area("Hard", "squared factor with larger numbers"))
    return out


# ============================================================ Basic Arithmetic
def arithmetic_families():
    out = []

    def _bodmas(diff, reason):
        def gen(rng):
            if diff == "Easy":
                a, b, c = rand_int(rng, 2, 9), rand_int(rng, 2, 9), rand_int(rng, 2, 9)
                return {"expr": "%d + %d x %d" % (a, b, c), "a": a, "b": b, "c": c,
                        "total": a + b * c}
            if diff == "Medium":
                a, b, c, d = (rand_int(rng, 2, 12), rand_int(rng, 2, 9),
                               rand_int(rng, 2, 9), rand_int(rng, 2, 9))
                return {"expr": "(%d + %d) x %d %s %d" % (a, b, c, MINUS, d),
                        "a": a, "b": b, "c": c, "d": d, "total": (a + b) * c - d}
            a, b, c, d, e = (rand_int(rng, 2, 12), rand_int(rng, 2, 9), rand_int(rng, 2, 9),
                             rand_int(rng, 2, 9), rand_int(rng, 2, 9))
            if a * b < c * d:                        # keep the result positive
                a, b, c, d = c, d, a, b
            return {"expr": "%d x %d %s %d x %d + %d" % (a, b, MINUS, c, d, e),
                    "a": a, "b": b, "c": c, "d": d, "e": e, "total": a * b - c * d + e}

        return Fam(
            category="Basic Arithmetic", difficulty=diff, tags=["bodmas"],
            question="Work out {expr}.",
            answer=lambda p: F(p["total"]),
            hint="Follow the order of operations: brackets first, then multiplication and division, then addition and subtraction.",
            shortcut="Do the multiplications before the additions and subtractions.",
            explanation="Applying the order of operations to {expr} gives {ans}.",
            mentalPattern="BODMAS: Brackets, Orders, Division/Multiplication, Addition/Subtraction.",
            commonMistake="Working strictly left to right and ignoring the order of operations.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["total"],
        )

    out.append(_bodmas("Easy", "one multiplication and one addition"))
    out.append(_bodmas("Medium", "brackets then multiply then subtract"))
    out.append(_bodmas("Hard", "several operations in order"))

    def _square(diff, reason):
        def gen(rng):
            n = pick(rng, (11, 12, 13, 14, 15, 16, 18, 20, 25)) if diff != "Hard" else pick(rng, (21, 22, 23, 24, 26, 27, 28, 32, 35))
            return {"n": n}

        return Fam(
            category="Basic Arithmetic", difficulty=diff, tags=["squares"],
            question="What is {n} squared?",
            answer=lambda p: F(p["n"] ** 2),
            hint="Multiply the number by itself. For numbers ending in 5 there is a shortcut; otherwise round to a nearby ten and adjust.",
            shortcut="{n} x {n} = {ans}.",
            explanation="{n} squared = {n} x {n} = {ans}.",
            mentalPattern="Squares near a round number: (a plus or minus b) squared = a squared plus or minus 2ab plus b squared - use a nearby ten as the base.",
            commonMistake="Doubling the number instead of squaring it.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["n"] ** 2,
        )

    out.append(_square("Easy", "a square most students know"))
    out.append(_square("Medium", "two-digit square"))
    out.append(_square("Hard", "larger square that rewards the algebraic shortcut"))

    def _sqrt(diff, reason):
        def gen(rng):
            root = pick(rng, (5, 6, 7, 8, 9, 10, 11, 12)) if diff != "Hard" else pick(rng, (13, 14, 15, 16, 17, 18, 19, 21))
            return {"n": root * root}

        return Fam(
            category="Basic Arithmetic", difficulty=diff, tags=["square-roots"],
            question="What is the square root of {n}?",
            answer=lambda p: F(int(p["n"] ** 0.5)),
            hint="Think of the number as a product of two equal factors: which number multiplied by itself gives {n}?",
            shortcut="Find the number that squares to {n}; the last digit of the square usually narrows it to one candidate.",
            explanation="The square root of {n} is {ans}, because {ans} x {ans} = {n}.",
            mentalPattern="Learn the squares up to 25; roots are then instant recognition.",
            commonMistake="Halving the number instead of taking the root.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * a == p["n"],
        )

    out.append(_sqrt("Easy", "a perfect square most students recognise"))
    out.append(_sqrt("Medium", "larger perfect square"))
    out.append(_sqrt("Hard", "perfect square above 144"))

    def _chain(diff, reason):
        def gen(rng):
            if diff == "Easy":
                nums = [rand_int(rng, 5, 40) for _ in range(3)]
            elif diff == "Medium":
                nums = [rand_int(rng, 15, 90) for _ in range(4)]
            else:
                nums = [rand_int(rng, 25, 150) for _ in range(5)]
            if sum(nums[:-1]) < nums[-1]:             # no negative answers
                nums[-1] = rand_int(rng, 5, max(6, sum(nums[:-1])))
            return {"nums": " + ".join(str(n) for n in nums[:-1]) + " " + MINUS + " " + str(nums[-1]),
                    "total": sum(nums[:-1]) - nums[-1]}

        return Fam(
            category="Basic Arithmetic", difficulty=diff, tags=["addition", "subtraction"],
            question="Work out {nums}.",
            answer=lambda p: F(p["total"]),
            hint="Look for pairs that make round numbers (ones whose last digits add up to a clean ten) before you start adding.",
            shortcut="Pair up complementary numbers first, then adjust.",
            explanation="Adding the positives and subtracting the last term gives {ans}.",
            mentalPattern="Group into tens: it is faster and far less error-prone than a running total.",
            commonMistake="Losing track of a carry in a long chain.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["total"],
        )

    out.append(_chain("Easy", "short chain of small numbers"))
    out.append(_chain("Medium", "four terms to combine"))
    out.append(_chain("Hard", "five larger terms"))

    def _estimation(diff, reason):
        def gen(rng):
            a = pick(rng, (19, 21, 29, 31, 39, 41, 49, 51, 98, 99, 102))
            b = pick(rng, (3, 4, 5, 6, 7, 8, 9))
            return {"a": a, "b": b}

        return Fam(
            category="Basic Arithmetic", difficulty=diff, tags=["estimation", "near-base"],
            question="Multiply {a} by {b} mentally.",
            answer=lambda p: F(p["a"] * p["b"]),
            hint="Round {a} to the nearest ten, multiply, then correct by the difference - e.g. {a} is {delta} away from {near}.",
            shortcut="{near} x {b}, then adjust by {delta} x {b}.",
            explanation="{a} = {near} plus or minus {delta}, so {a} x {b} = {near} x {b} plus or minus {delta} x {b} = {ans}.",
            mentalPattern="Round, multiply, correct: (n plus or minus d) x m = nm plus or minus dm.",
            commonMistake="Rounding but forgetting to add the correction back.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, near=round(p["a"] / 10) * 10, delta=abs(p["a"] - round(p["a"] / 10) * 10)))(_est_gen(rng)),
            verify=lambda p, a: a == p["a"] * p["b"],
        )

    def _est_gen(rng):
        a = pick(rng, (19, 21, 29, 31, 39, 41, 49, 51, 98, 99, 102))
        b = pick(rng, (3, 4, 5, 6, 7, 8, 9))
        return {"a": a, "b": b}

    out.append(_estimation("Easy", "round-and-correct with a small correction"))
    out.append(_estimation("Medium", "round-and-correct with a bigger correction"))
    out.append(_estimation("Hard", "round-and-correct near 100"))
    return out


def families():
    return work_families() + pipe_families() + unit_families() + arithmetic_families()
