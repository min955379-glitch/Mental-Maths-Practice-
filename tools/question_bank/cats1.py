"""Question families: Percentages, Speed Distance Time, Fractions."""
import math
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt, money, clock

BENCH = {10: "1/10", 20: "1/5", 25: "1/4", 50: "1/2", 75: "3/4", 5: "1/20", 40: "2/5"}


# =============================================================== Percentages
def percent_families():
    out = []

    def _of(pcts, nums, diff, reason):
        def gen(rng):
            p = pick(rng, pcts)
            n = pick(rng, nums)
            return {"p": p, "n": n, "pf": BENCH.get(p, str(p) + "/100")}

        return Fam(
            category="Percentages", difficulty=diff, tags=["percent-of-number"],
            question="What is {p}% of {n}?",
            answer=lambda p: F(p["p"] * p["n"], 100),
            hint="Rewrite the percentage as a simple fraction first (halves, quarters and eighths are the useful ones), then take that fraction of the number.",
            shortcut="{p}% = {pf}, so {pf} of {n} = {ans}.",
            explanation="Percent means 'per hundred': {p}% = {p}/100 = {pf}. Multiply that by {n} to get {ans}.",
            mentalPattern="Benchmark percentages: 10% = 1/10, 25% = 1/4, 50% = 1/2, 75% = 3/4.",
            commonMistake="Multiplying by {p} instead of by {pf} (or by {p}/100).",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 100 == p["p"] * p["n"],
        )

    out.append(_of((10, 20, 25, 50), (40, 60, 80, 120, 160, 200, 240), "Easy",
                   "one step with a benchmark percentage of a round number"))
    out.append(_of((5, 15, 30, 60, 75), (40, 80, 120, 200, 300, 400), "Medium",
                   "needs chunking: build the percentage from 10% and 5% pieces"))
    out.append(_of((12.5, 7.5, 17.5, 22.5, 37.5), (80, 160, 240, 320, 400, 800), "Hard",
                   "awkward percentage that rewards fraction conversion"))

    # ---- what percent is A of B -------------------------------------------
    def _what_pct(pairs, diff, reason):
        def gen(rng):
            a, b = pick(rng, pairs)
            return {"a": a, "b": b}

        return Fam(
            category="Percentages", difficulty=diff, tags=["find-percentage"],
            question="What percent of {b} is {a}?",
            answer=lambda p: F(p["a"] * 100, p["b"]),
            hint="Write it as the fraction {a} over {b}, simplify it, then convert that fraction to a percent.",
            shortcut="{a}/{b} simplifies first; the simplified fraction converts straight to a percent.",
            explanation="Percent = part / whole x 100 = {a}/{b} x 100 = {ans}%.",
            mentalPattern="Cancel common factors before multiplying by 100 - it turns the division into mental arithmetic.",
            commonMistake="Dividing {b} by {a} instead of {a} by {b}.",
            reason=reason, gen=gen, unit="%",
            verify=lambda p, a: a * p["b"] == p["a"] * 100,
        )

    out.append(_what_pct([(15, 60), (12, 48), (20, 80), (30, 120), (25, 100), (9, 36)], "Easy",
                         "the fraction cancels to a benchmark percent"))
    out.append(_what_pct([(18, 72), (35, 140), (24, 96), (45, 180), (28, 112), (65, 260)], "Medium",
                         "cancellation is less obvious and the numbers are larger"))
    out.append(_what_pct([(13, 52), (27, 108), (7, 28), (19, 76), (23, 92), (31, 124)], "Hard",
                         "no obvious common factor at first glance"))

    # ---- fraction <-> percent ---------------------------------------------
    def gen_frac_pct(rng):
        num, den = pick(rng, [(1, 4), (3, 4), (1, 5), (2, 5), (3, 5), (1, 2), (1, 10), (3, 10)])
        return {"num": num, "den": den}

    out.append(Fam(
        category="Percentages", difficulty="Easy", tags=["fraction-percent"],
        question="Express {num}/{den} as a percent.",
        answer=lambda p: F(p["num"] * 100, p["den"]),
        hint="Scale the denominator to 100: work out what {den} must be multiplied by, then multiply the numerator by the same number.",
        shortcut="{num}/{den} x 100 = {ans}%.",
        explanation="A percent is a fraction out of 100, so multiply the fraction by 100: {num}/{den} x 100 = {ans}%.",
        mentalPattern="Multiply by 100 and simplify: the denominator usually cancels into 100.",
        commonMistake="Moving the decimal the wrong way after converting to a decimal.",
        reason="direct fraction-to-percent conversion", gen=gen_frac_pct, unit="%",
        verify=lambda p, a: a * p["den"] == p["num"] * 100,
    ))

    # ---- percentage increase / decrease ------------------------------------
    def _change(ups, nums, diff, reason):
        def gen(rng):
            up = pick(rng, ups)
            n = pick(rng, nums)
            return {"p": up, "n": n, "verb": pick(rng, ("increased", "decreased")),
                    "noun": pick(rng, ("price", "salary", "score", "population", "rent"))}

        return Fam(
            category="Percentages", difficulty=diff, tags=["percentage-change"],
            question="A {noun} of {n} is {verb} by {p}%. What is the new {noun}?",
            answer=lambda p: F(p["n"] * (100 + p["p"]), 100) if p["verb"] == "increased" else F(p["n"] * (100 - p["p"]), 100),
            hint="Work out {p}% of {n} first, then add it to (or subtract it from) the ORIGINAL {n}.",
            shortcut="Change = {p}% of {n}; new value = {n} plus or minus that change.",
            explanation="The change is always taken on the original value: {p}% of {n}, then {n} {verb} by that amount gives {ans}.",
            mentalPattern="New value = old value x (100 plus or minus p)/100.",
            commonMistake="Taking the percentage of the wrong base (the new value instead of the original).",
            reason=reason, gen=gen,
            verify=lambda p, a: (a - p["n"]) * 100 == p["n"] * p["p"] if p["verb"] == "increased" else (p["n"] - a) * 100 == p["n"] * p["p"],
        )

    out.append(_change((10, 20, 50), (200, 300, 400, 500, 600, 800), "Easy",
                       "one step with a benchmark percentage"))
    out.append(_change((15, 25, 30, 40), (120, 180, 240, 320, 450, 720), "Medium",
                       "requires chunking the percentage and then adding or subtracting"))
    out.append(_change((12.5, 7.5, 17.5, 22.5), (160, 240, 320, 480, 640, 800), "Hard",
                       "awkward percentage combined with an increase or decrease"))

    # ---- reverse percentage ------------------------------------------------
    def _reverse(pcts, diff, reason):
        def gen(rng):
            p = pick(rng, pcts)
            base = pick(rng, (60, 80, 120, 160, 200, 240, 320, 400, 500))
            pf = F(str(p))
            # choose a base that makes the part a whole number (no trial loop)
            need = 100 * pf.denominator
            step = need // math.gcd(pf.numerator, need)
            base = step * pick(rng, (1, 2, 3, 4, 5, 6))
            part = pf * base / 100
            return {"p": p, "part": fmt(part), "base": base}

        return Fam(
            category="Percentages", difficulty=diff, tags=["reverse-percentage"],
            question="{p}% of a number is {part}. What is the number?",
            answer=lambda p: F(p["base"]),
            hint="Call the number x and write the percentage as a fraction. Then divide the given part by that fraction - which is the same as multiplying by its reciprocal.",
            shortcut="x = {part} x 100/{p} = {part} divided by the fraction {p}/100.",
            explanation="{p}% of x = {part}, so x = {part} x 100/{p} = {ans}.",
            mentalPattern="Reverse percent: divide the part by the percentage written as a fraction.",
            commonMistake="Multiplying by {p}% instead of dividing by it.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * F(str(p["p"])) == F(p["part"]) * 100,
        )

    out.append(_reverse((10, 20, 25, 50), "Easy", "divide by a benchmark fraction"))
    out.append(_reverse((15, 30, 40, 60, 75), "Medium", "the divisor is no longer a friendly fraction"))
    out.append(_reverse((12.5, 37.5, 62.5, 87.5), "Hard", "awkward percentage inversion"))

    # ---- successive change (net loss) --------------------------------------
    def gen_successive(rng):
        p = pick(rng, (10, 20, 25, 40, 50))
        up = rng.random() < 0.5
        return {"p": p, "up": "increased" if up else "decreased",
                "down": "decreased" if up else "increased"}

    out.append(Fam(
        category="Percentages", difficulty="Hard", tags=["successive-change"],
        question="A price is {up} by {p}% and then {down} by {p}%. What is the net percentage decrease?",
        answer=lambda p: F(p["p"] * p["p"], 100),
        hint="Take 100 as the starting price. Apply the first change, then apply the second change to the NEW value - never to the original. Equal successive changes never cancel.",
        shortcut="Net change = p squared / 100 = {p} squared / 100 percent, always a decrease.",
        explanation="Starting from 100: the first change gives 100 plus or minus {p}, and the second change is taken on that new number, so the finish is below 100 by p squared / 100 = {ans}%.",
        mentalPattern="Successive changes multiply: (1 + r)(1 - r) = 1 - r squared, so the net effect is a loss of p squared / 100 percent.",
        commonMistake="Assuming the two equal changes cancel out to zero.",
        reason="multiplicative reasoning: the second change acts on a different base",
        gen=gen_successive, unit="%",
        verify=lambda p, a: a * 100 == p["p"] ** 2,
    ))

    # ---- percent comparison trap -------------------------------------------
    def _compare(more, diff, reason):
        def gen(rng):
            options = [m for m in more if (m * 100) % (100 + m) == 0]
            m = pick(rng, options or more)
            return {"m": m, "less": F(m * 100, 100 + m)}

        return Fam(
            category="Percentages", difficulty=diff, tags=["percentage-comparison"],
            question="If A is {m}% more than B, then B is what percent less than A?",
            answer=lambda p: p["less"],
            hint="Pick a concrete value for B so A becomes a real number, then express the gap as a percent of A - never of B.",
            shortcut="less percent = {m}/(100 + {m}) x 100, because the base is now the larger number.",
            explanation="Take B = 100, so A = 100 + {m}. The gap {m} is now measured against A: {m}/(100 + {m}) x 100 = {ans}%.",
            mentalPattern="A percent is always relative to its base: swapping the base changes the percentage even though the gap is the same.",
            commonMistake="Answering {m}% - the same percentage works on a different base.",
            reason=reason, gen=gen, unit="%",
            verify=lambda p, a: a * (100 + p["m"]) == p["m"] * 100,
        )

    out.append(_compare((25, 100, 300), "Easy", "classic base-swap with friendly numbers"))
    out.append(_compare((60, 150, 400), "Medium", "the base is larger and the fraction needs care"))
    out.append(_compare((700, 900, 1500, 2400), "Hard", "awkward ratio that must be simplified under time pressure"))

    # ---- percentage of a percentage ----------------------------------------
    def gen_pct_of_pct(rng):
        p1 = pick(rng, (10, 20, 25, 50))
        p2 = pick(rng, (10, 20, 25, 40, 50))
        n = pick(rng, (200, 400, 600, 800, 1000, 1200))
        return {"p1": p1, "p2": p2, "n": n}

    out.append(Fam(
        category="Percentages", difficulty="Hard", tags=["percent-of-percent"],
        question="What is {p1}% of {p2}% of {n}?",
        answer=lambda p: F(p["p1"] * p["p2"] * p["n"], 10000),
        hint="Take the percentages one at a time: first {p2}% of {n}, then {p1}% of that result.",
        shortcut="Chain the two fractions: ({p1}/100) x ({p2}/100) x {n}.",
        explanation="{p2}% of {n} comes first, then {p1}% of that value, giving {ans}.",
        mentalPattern="Percent of a percent: multiply the two fractions, then apply once.",
        commonMistake="Adding the percentages instead of applying them one after the other.",
        reason="two chained multiplicative steps", gen=gen_pct_of_pct,
        verify=lambda p, a: a * 10000 == p["p1"] * p["p2"] * p["n"],
    ))

    # ---- real-world percent -------------------------------------------------
    def _world(pcts, diff, reason):
        def gen(rng):
            total = pick(rng, (40, 60, 80, 120, 200, 250, 400))
            p = pick(rng, pcts)
            return {"total": total, "p": p,
                    "group": pick(rng, ("students", "workers", "villagers", "applicants")),
                    "kind": pick(rng, ("girls", "men", "absent", "passed"))}

        return Fam(
            category="Percentages", difficulty=diff, tags=["word-problem"],
            question="In a group of {total} {group}, {p}% are {kind}. How many {kind} are there?",
            answer=lambda p: F(p["total"] * p["p"], 100),
            hint="Take ten percent (or one percent) of the group first, then scale that up to the percentage asked for.",
            shortcut="1% of {total} is easy to see, so {p}% is {p} times that.",
            explanation="{p}% of {total} = {p}/100 x {total} = {ans}.",
            mentalPattern="Build unfamiliar percentages out of 10% and 1% building blocks.",
            commonMistake="Dividing by the percentage instead of multiplying by the fraction.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 100 == p["total"] * p["p"],
        )

    out.append(_world((10, 20, 25, 50), "Easy", "benchmark percentage of a round total"))
    out.append(_world((15, 35, 45, 60), "Medium", "chunking needed on a realistic total"))
    out.append(_world((12.5, 22.5, 37.5, 65), "Hard", "awkward percentage in a word problem"))
    return out


# ======================================================= Speed Distance Time
def speed_families():
    out = []

    def _distance(speeds, times, diff, reason):
        def gen(rng):
            return {"v": pick(rng, speeds), "t": pick(rng, times),
                    "who": pick(rng, ("car", "bus", "train", "cyclist", "truck"))}

        return Fam(
            category="Speed Distance Time", difficulty=diff, tags=["distance"],
            question="A {who} travels at {v} km/h for {t} hours. How far does it go?",
            answer=lambda p: F(p["v"] * p["t"]),
            hint="Distance = speed x time, so multiply the km travelled in one hour by the number of hours.",
            shortcut="{v} km each hour, for {t} hours = {v} x {t}.",
            explanation="Distance = speed x time = {v} x {t} = {ans} km.",
            mentalPattern="Units are your check: km/h x h cancels the hours and leaves km.",
            commonMistake="Dividing instead of multiplying.",
            reason=reason, gen=gen, unit="km",
            verify=lambda p, a: a == p["v"] * p["t"],
        )

    out.append(_distance((40, 50, 60, 80), (2, 3, 4, 5), "Easy", "single multiplication with round numbers"))
    out.append(_distance((45, 55, 65, 75, 85), (3, 4, 5, 6, 8), "Medium", "two-digit multiplication"))
    out.append(_distance((48, 72, 96, 108), (2.5, 3.5, 4.5, 5.5), "Hard", "half-hours force fractional reasoning"))

    def _time(dists, speeds, diff, reason):
        def gen(rng):
            v = pick(rng, speeds)
            d = pick(rng, [x for x in dists if x % v == 0])
            return {"v": v, "d": d}

        return Fam(
            category="Speed Distance Time", difficulty=diff, tags=["time"],
            question="How long does it take to cover {d} km at a steady {v} km/h?",
            answer=lambda p: F(p["d"], p["v"]),
            hint="Time = distance / speed. Divide the distance by how much is covered in one hour.",
            shortcut="{d} / {v} - cancel first if you can.",
            explanation="Time = distance / speed = {d} / {v} = {ans} hours.",
            mentalPattern="Rearrange the triangle: distance on top, speed and time underneath.",
            commonMistake="Dividing speed by distance.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a * p["v"] == p["d"],
        )

    out.append(_time((60, 120, 180, 240, 300), (30, 40, 60), "Easy", "the division is exact and friendly"))
    out.append(_time((210, 280, 360, 420, 540), (35, 45, 70, 90), "Medium", "division needs a little more care"))
    out.append(_time((125, 175, 225, 375), (12.5, 25, 75), "Hard", "decimal or fractional speeds"))

    def _speed(dists, times, diff, reason):
        def gen(rng):
            t = pick(rng, times)
            d = pick(rng, [x for x in dists if x % t == 0])
            return {"d": d, "t": t}

        return Fam(
            category="Speed Distance Time", difficulty=diff, tags=["speed"],
            question="A journey of {d} km takes {t} hours. What is the average speed?",
            answer=lambda p: F(p["d"], p["t"]),
            hint="Average speed = total distance / total time. Divide the kilometres by the hours.",
            shortcut="{d} / {t} - try cancelling zeros first.",
            explanation="Speed = distance / time = {d} / {t} = {ans} km/h.",
            mentalPattern="Average speed uses the WHOLE journey distance and the WHOLE time, including stops.",
            commonMistake="Using only part of the distance or part of the time.",
            reason=reason, gen=gen, unit="km/h",
            verify=lambda p, a: a * p["t"] == p["d"],
        )

    out.append(_speed((60, 100, 120, 150, 200), (2, 3, 5), "Easy", "exact division with round numbers"))
    out.append(_speed((260, 340, 450, 520), (4, 5, 6, 9), "Medium", "larger numbers to divide"))
    out.append(_speed((175, 225, 315, 405), (2.5, 3.5, 4.5), "Hard", "fractional hours"))

    # ---- minutes ------------------------------------------------------------
    def gen_minutes(rng):
        v = pick(rng, (30, 40, 45, 60, 72, 90, 120))
        m = pick(rng, (15, 20, 30, 45))
        return {"v": v, "m": m}

    out.append(Fam(
        category="Speed Distance Time", difficulty="Medium", tags=["minutes", "unit-conversion"],
        question="How far does a vehicle travel in {m} minutes at {v} km/h?",
        answer=lambda p: F(p["v"] * p["m"], 60),
        hint="Turn the minutes into a fraction of an hour first (minutes over sixty), then multiply by the speed.",
        shortcut="{m} minutes = {m}/60 hour, so distance = {v} x {m}/60.",
        explanation="Distance = speed x time = {v} x {m}/60 = {ans} km.",
        mentalPattern="Minutes to hours: 15 = 1/4, 20 = 1/3, 30 = 1/2, 45 = 3/4.",
        commonMistake="Multiplying by {m} as if it were hours.",
        reason="requires a unit conversion before the multiplication", gen=gen_minutes, unit="km",
        verify=lambda p, a: a * 60 == p["v"] * p["m"],
    ))

    # ---- km/h to m/s ---------------------------------------------------------
    def gen_kmh_ms(rng):
        v = pick(rng, (18, 36, 54, 72, 90, 108, 126, 144))
        return {"v": v}

    out.append(Fam(
        category="Speed Distance Time", difficulty="Easy", tags=["unit-conversion"],
        question="Convert {v} km/h into metres per second.",
        answer=lambda p: F(p["v"] * 5, 18),
        hint="Multiply by five eighteenths: divide by eighteen first when that goes evenly, then multiply by five.",
        shortcut="{v} x 5/18 = {ans} m/s.",
        explanation="1 km/h = 1000 m / 3600 s = 5/18 m/s, so {v} km/h = {v} x 5/18 = {ans} m/s.",
        mentalPattern="km/h to m/s: multiply by 5/18. m/s to km/h: multiply by 3.6.",
        commonMistake="Multiplying by 18/5 (that converts the other way).",
        reason="standard conversion, made easy by choosing speeds divisible by 18", gen=gen_kmh_ms,
        unit="m/s", verify=lambda p, a: a * 18 == p["v"] * 5,
    ))

    # ---- average speed, equal times ------------------------------------------
    def gen_avg_equal_time(rng):
        a = pick(rng, (30, 40, 50, 60, 70))
        b = pick(rng, (30, 40, 50, 60, 70))
        if a == b:
            b = a + 20
        return {"a": a, "b": b}

    out.append(Fam(
        category="Speed Distance Time", difficulty="Medium", tags=["average-speed", "equal-time"],
        question="A car drives for 1 hour at {a} km/h and then for 1 hour at {b} km/h. What is the average speed for the two hours?",
        answer=lambda p: F(p["a"] + p["b"], 2),
        hint="Over EQUAL TIMES the average speed is just the mean of the two speeds - add them and halve.",
        shortcut="({a} + {b}) / 2.",
        explanation="Each hour contributes that hour's distance, so the mean of the two speeds gives {ans} km/h.",
        mentalPattern="Equal TIME intervals: plain average. Equal DISTANCES: harmonic mean 2ab/(a+b).",
        commonMistake="Using the harmonic mean when the times (not the distances) are equal.",
        reason="the student must recognise which mean applies", gen=gen_avg_equal_time, unit="km/h",
        verify=lambda p, a: a * 2 == p["a"] + p["b"],
    ))

    # ---- average speed, equal distances --------------------------------------
    def gen_avg_equal_dist(rng):
        a, b = pick(rng, ((40, 60), (30, 60), (20, 30), (50, 75), (60, 90), (24, 48), (36, 45), (25, 100)))
        return {"a": a, "b": b}

    out.append(Fam(
        category="Speed Distance Time", difficulty="Hard", tags=["average-speed", "equal-distance"],
        question="A car goes from town A to town B at {a} km/h and returns at {b} km/h. What is the average speed for the whole journey?",
        answer=lambda p: F(2 * p["a"] * p["b"], p["a"] + p["b"]),
        hint="The distances are EQUAL, so the plain mean is wrong: use total distance / total time, which simplifies to 2ab/(a+b).",
        shortcut="2 x {a} x {b} / ({a} + {b}) = {ans} km/h.",
        explanation="With distance d each way, total distance is 2d and total time is d/{a} + d/{b}, so the average is 2d / (d/{a} + d/{b}) = 2ab/(a+b) = {ans} km/h.",
        mentalPattern="Equal distances: harmonic mean 2ab/(a+b) - never the arithmetic mean.",
        commonMistake="Averaging the speeds to ({a} + {b})/2.",
        reason="the trap is real and the algebra must be set up from scratch", gen=gen_avg_equal_dist,
        unit="km/h", verify=lambda p, a: a * (p["a"] + p["b"]) == 2 * p["a"] * p["b"],
    ))

    # ---- two legs, different times -------------------------------------------
    def gen_two_legs(rng):
        v1 = pick(rng, (30, 40, 50, 60))
        t1 = pick(rng, (2, 3, 4))
        v2 = pick(rng, (40, 60, 80, 90))
        t2 = pick(rng, (1, 2, 3))
        # keep the weighted average a whole number of km/h
        for cand in range(v2, v2 + t1 + t2 + 1):
            if (v1 * t1 + cand * t2) % (t1 + t2) == 0:
                v2 = cand
                break
        return {"v1": v1, "t1": t1, "v2": v2, "t2": t2}

    out.append(Fam(
        category="Speed Distance Time", difficulty="Hard", tags=["average-speed", "multi-leg"],
        question="A driver covers {v1} km/h for {t1} hours, then {v2} km/h for {t2} hours. What is the average speed for the whole trip?",
        answer=lambda p: F(p["v1"] * p["t1"] + p["v2"] * p["t2"], p["t1"] + p["t2"]),
        hint="Average speed = TOTAL distance / TOTAL time. Find each leg's distance separately, add them, then divide by the total hours.",
        shortcut="({v1} x {t1} + {v2} x {t2}) / ({t1} + {t2}).",
        explanation="Leg one is {v1} x {t1} km and leg two is {v2} x {t2} km; dividing their sum by {t1} + {t2} hours gives {ans} km/h.",
        mentalPattern="Weighted by time, not by distance: the longer-lasting speed pulls the average more.",
        commonMistake="Averaging the two speeds without weighting by time.",
        reason="multi-step: two products, a sum and a weighted divide", gen=gen_two_legs, unit="km/h",
        verify=lambda p, a: a * (p["t1"] + p["t2"]) == p["v1"] * p["t1"] + p["v2"] * p["t2"],
    ))

    # ---- train crossing --------------------------------------------------------
    def gen_train(rng):
        v = pick(rng, (36, 45, 54, 72, 90))
        train = pick(rng, (100, 120, 150, 180, 200))
        secs = pick(rng, (12, 15, 18, 20, 24, 30))
        plat = F(v * 5, 18) * secs - train          # exact by construction
        if plat <= 0 or plat.denominator != 1:
            plat = F(v * 5, 18) * 30 - train
        return {"v": v, "train": train, "plat": int(plat)}

    out.append(Fam(
        category="Speed Distance Time", difficulty="Hard", tags=["train", "unit-conversion"],
        question="A {train} m long train crosses a {plat} m platform at {v} km/h. How many seconds does it take?",
        answer=lambda p: F((p["train"] + p["plat"]) * 18, p["v"] * 5),
        hint="The train must cover its OWN length plus the platform. Convert the speed to m/s first, then divide.",
        shortcut="Distance = {train} + {plat} m; speed = {v} x 5/18 m/s; time = distance / speed.",
        explanation="Total distance = {train} + {plat} m and speed = {v} x 5/18 m/s, so time = distance / speed = {ans} s.",
        mentalPattern="Crossing a POLE needs only the train length; crossing a PLATFORM or BRIDGE needs train + object.",
        commonMistake="Forgetting to add the train's own length.",
        reason="three steps: add lengths, convert units, divide", gen=gen_train, unit="seconds",
        verify=lambda p, a: a * p["v"] * 5 == (p["train"] + p["plat"]) * 18,
    ))
    return out


# ================================================================= Fractions
def fraction_families():
    out = []

    def _add(pairs, diff, reason):
        def gen(rng):
            d = pick(rng, pairs)
            a = rand_int(rng, 1, d - 1)
            b = rand_int(rng, 1, d - 1, exclude={a})
            return {"a": a, "b": b, "d": d}

        return Fam(
            category="Fractions", difficulty=diff, tags=["addition"],
            question="Add {a}/{d} and {b}/{d}. Give the answer in simplest form.",
            answer=lambda p: F(p["a"] + p["b"], p["d"]),
            hint="The denominators already match, so add the numerators and keep {d}; then simplify if you can.",
            shortcut="{a}/{d} + {b}/{d} = ({a} + {b})/{d}.",
            explanation="With a common denominator: {a}/{d} + {b}/{d} = ({a} + {b})/{d} = {ans}.",
            mentalPattern="Same denominator: add the tops only; simplify at the end.",
            commonMistake="Adding the denominators as well.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == F(p["a"] + p["b"], p["d"]),
        )

    out.append(_add((4, 5, 8, 10), "Easy", "common denominator is already given"))

    def _add_unlike(denoms, diff, reason):
        def gen(rng):
            d1, d2 = pick(rng, denoms)
            a = rand_int(rng, 1, d1 - 1)
            b = rand_int(rng, 1, d2 - 1)
            return {"a": a, "d1": d1, "b": b, "d2": d2}

        return Fam(
            category="Fractions", difficulty=diff, tags=["addition", "common-denominator"],
            question="What is {a}/{d1} + {b}/{d2}? Give the answer in simplest form.",
            answer=lambda p: F(p["a"], p["d1"]) + F(p["b"], p["d2"]),
            hint="Find a common denominator first (the smaller denominator often divides the larger one), convert both fractions, then add.",
            shortcut="Convert both fractions to the same denominator, add, then simplify.",
            explanation="{a}/{d1} + {b}/{d2} with a common denominator gives {ans}.",
            mentalPattern="Scale each fraction up to a common denominator, then work with the numerators only.",
            commonMistake="Adding numerators and denominators straight across.",
            reason=reason, gen=gen,
        )

    out.append(_add_unlike(((2, 4), (3, 6), (4, 8), (2, 8), (5, 10)), "Medium",
                           "one denominator is a multiple of the other"))
    out.append(_add_unlike(((3, 4), (2, 5), (5, 6), (3, 8), (4, 7)), "Hard",
                           "the common denominator must be found, not spotted"))

    def _sub(pairs, diff, reason):
        def gen(rng):
            d = pick(rng, pairs)
            a = rand_int(rng, 2, d - 1)
            b = rand_int(rng, 1, a - 1)
            return {"a": a, "b": b, "d": d}

        return Fam(
            category="Fractions", difficulty=diff, tags=["subtraction"],
            question="Subtract {b}/{d} from {a}/{d}. Give the answer in simplest form.",
            answer=lambda p: F(p["a"] - p["b"], p["d"]),
            hint="Same denominator, so subtract the second numerator from the first and keep {d}; simplify if possible.",
            shortcut="{a}/{d} " + MINUS + " {b}/{d} = ({a} " + MINUS + " {b})/{d}.",
            explanation="{a}/{d} " + MINUS + " {b}/{d} = ({a} " + MINUS + " {b})/{d} = {ans}.",
            mentalPattern="Subtract the tops, keep the bottom, then reduce.",
            commonMistake="Subtracting the denominators too.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == F(p["a"] - p["b"], p["d"]),
        )

    out.append(_sub((4, 5, 6, 8), "Easy", "straightforward subtraction with a common denominator"))
    out.append(_sub((9, 10, 12, 15), "Hard", "larger denominators and the result needs simplifying"))

    def _of(nums, dens, diff, reason):
        def gen(rng):
            n = pick(rng, nums)
            num, den = pick(rng, dens)
            return {"n": n, "num": num, "den": den,
                    "thing": pick(rng, ("students", "apples", "rupees", "books", "litres"))}

        return Fam(
            category="Fractions", difficulty=diff, tags=["fraction-of-quantity"],
            question="What is {num}/{den} of {n} {thing}?",
            answer=lambda p: F(p["n"] * p["num"], p["den"]),
            hint="Divide the quantity by the denominator first (if it cancels cleanly), then multiply by the numerator.",
            shortcut="{n} " + DIV + " {den}, then " + MULT + " {num}.",
            explanation="{num}/{den} of {n} = {n} x {num}/{den} = {ans}.",
            mentalPattern="'Of' means multiply: divide by the bottom, multiply by the top.",
            commonMistake="Multiplying by the denominator instead of dividing by it.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["den"] == p["n"] * p["num"],
        )

    out.append(_of((20, 40, 60, 80, 100), ((1, 2), (1, 4), (3, 4), (1, 5)), "Easy",
                   "the quantity divides cleanly by the denominator"))
    out.append(_of((36, 48, 72, 90, 120), ((2, 3), (3, 8), (5, 6), (5, 8)), "Medium",
                   "two-step: divide then multiply"))
    out.append(_of((105, 126, 154, 198), ((3, 7), (4, 9), (5, 11), (7, 9)), "Hard",
                   "awkward cancellation before multiplying"))

    def _mul(diff, reason):
        def gen(rng):
            if diff == "Easy":
                a = F(pick(rng, (1, 2, 3)), pick(rng, (4, 5)))
                b = F(pick(rng, (1, 2, 3)), pick(rng, (4, 5)))
            elif diff == "Medium":
                a = F(pick(rng, (2, 3, 4, 5)), pick(rng, (6, 7, 8)))
                b = F(pick(rng, (2, 3, 4, 5)), pick(rng, (6, 7, 8)))
            else:
                a = F(pick(rng, (5, 7, 8, 9, 11)), pick(rng, (9, 12, 15)))
                b = F(pick(rng, (4, 5, 7, 10)), pick(rng, (9, 12, 15)))
            return {"a1": a.numerator, "a2": a.denominator, "b1": b.numerator, "b2": b.denominator}

        return Fam(
            category="Fractions", difficulty=diff, tags=["multiplication"],
            question="Multiply {a1}/{a2} by {b1}/{b2}. Give the answer in simplest form.",
            answer=lambda p: F(p["a1"] * p["b1"], p["a2"] * p["b2"]),
            hint="Multiply the tops together and the bottoms together - but cancel any diagonal common factor BEFORE multiplying to keep the numbers small.",
            shortcut="Cancel first, then multiply straight across.",
            explanation="{a1}/{a2} x {b1}/{b2} = ({a1} x {b1}) / ({a2} x {b2}) = {ans}.",
            mentalPattern="Cross-cancel before multiplying; it turns big numbers into small ones.",
            commonMistake="Cross-multiplying (that is for comparing or dividing, not multiplying).",
            reason=reason, gen=gen,
            verify=lambda p, a: a == F(p["a1"] * p["b1"], p["a2"] * p["b2"]),
        )

    out.append(_mul("Easy", "small fractions that cancel easily"))
    out.append(_mul("Medium", "bigger numerators that still reward cancelling"))
    out.append(_mul("Hard", "large products that are painful without cross-cancelling"))

    def _div(diff, reason):
        def gen(rng):
            if diff == "Easy":
                a = F(pick(rng, (1, 2, 3)), pick(rng, (2, 4)))
                b = F(pick(rng, (1, 2, 3)), pick(rng, (4, 8)))
            elif diff == "Medium":
                a = F(pick(rng, (2, 3, 4, 5)), pick(rng, (3, 6)))
                b = F(pick(rng, (1, 2, 3, 5)), pick(rng, (4, 8)))
            else:
                a = F(pick(rng, (5, 7, 8, 9)), pick(rng, (4, 9, 12)))
                b = F(pick(rng, (3, 5, 7)), pick(rng, (8, 10, 15)))
            return {"a1": a.numerator, "a2": a.denominator, "b1": b.numerator, "b2": b.denominator}

        return Fam(
            category="Fractions", difficulty=diff, tags=["division"],
            question="Divide {a1}/{a2} by {b1}/{b2}. Give the answer in simplest form.",
            answer=lambda p: F(p["a1"] * p["b2"], p["a2"] * p["b1"]),
            hint="Dividing by a fraction is multiplying by its reciprocal - flip the second fraction, then multiply.",
            shortcut="{a1}/{a2} " + DIV + " {b1}/{b2} = {a1}/{a2} x {b2}/{b1}.",
            explanation="Invert and multiply: {a1}/{a2} x {b2}/{b1} = {ans}.",
            mentalPattern="'Keep, change, flip': keep the first, change to multiply, flip the second.",
            commonMistake="Flipping the first fraction instead of the second.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * F(p["b1"], p["b2"]) == F(p["a1"], p["a2"]),
        )

    out.append(_div("Easy", "unit-fraction divisor with small numbers"))
    out.append(_div("Medium", "two-step with a reciprocal that needs care"))
    out.append(_div("Hard", "larger fractions where the reciprocal is easy to get wrong"))

    # ---- fraction remainder word problem -------------------------------------
    def _remainder(diff, reason):
        def gen(rng):
            total = pick(rng, (240, 360, 480, 600))
            den = pick(rng, (3, 4, 5, 6))
            num = rand_int(rng, 1, den - 1)
            return {"total": total, "num": num, "den": den}

        return Fam(
            category="Fractions", difficulty=diff, tags=["word-problem", "remainder"],
            question="A shopkeeper had {total} kg of sugar. He sold {num}/{den} of it in the morning. How many kg are left?",
            answer=lambda p: F(p["total"] * (p["den"] - p["num"]), p["den"]),
            hint="Work out the fraction that is LEFT first (1 minus the fraction sold), then take that fraction of the quantity.",
            shortcut="Fraction left = 1 " + MINUS + " {num}/{den}; then multiply by {total}.",
            explanation="Sold {num}/{den}, so {den} " + MINUS + " {num} over {den} remains: {total} x that fraction = {ans} kg.",
            mentalPattern="Subtract from one whole first - it avoids a subtraction with big numbers.",
            commonMistake="Subtracting the sold amount from the total without converting the fraction first.",
            reason=reason, gen=gen, unit="kg",
            verify=lambda p, a: a * p["den"] == p["total"] * (p["den"] - p["num"]),
        )

    out.append(_remainder("Medium", "two-step word problem using the complement"))
    out.append(_remainder("Hard", "larger total and an awkward complement fraction"))

    # ---- reverse fraction ------------------------------------------------------
    def _reverse_gen(rng):
        num, den = pick(rng, ((2, 3), (3, 4), (4, 5), (5, 6)))
        base = den * pick(rng, (6, 8, 10, 12, 15, 20, 25))
        part = F(base * num, den)          # always a whole number by construction
        return {"base": base, "num": num, "den": den, "part": part.numerator}

    def _reverse(diff, reason):
        return Fam(
            category="Fractions", difficulty=diff, tags=["reverse-fraction"],
            question="{num}/{den} of a number is {part}. What is the number?",
            answer=lambda p: F(p["base"]),
            hint="Call the number x, write the fraction equation, then divide the given part by the fraction - which means multiplying by its reciprocal.",
            shortcut="x = {part} " + DIV + " ({num}/{den}) = {part} x {den}/{num}.",
            explanation="{num}/{den} of x = {part}, so x = {part} x {den}/{num} = {ans}.",
            mentalPattern="Reverse fraction: divide by the fraction, i.e. multiply by its reciprocal.",
            commonMistake="Multiplying by the fraction instead of dividing by it.",
            reason=reason, gen=_reverse_gen,
            verify=lambda p, a: a * p["num"] == p["part"] * p["den"],
        )

    out.append(_reverse("Hard", "inverting a fraction inside a word problem"))

    # ---- comparison --------------------------------------------------------------
    def _compare(diff, reason):
        def gen(rng):
            pool = [F(1, 2), F(2, 3), F(3, 4), F(3, 5), F(4, 5), F(5, 6), F(5, 8), F(7, 8), F(2, 5), F(7, 10)]
            a = pick(rng, pool)
            b = pick(rng, pool)
            if a == b:
                b = F(1, 3)
            lo, hi = (a, b) if a < b else (b, a)
            return {"a1": a.numerator, "a2": a.denominator, "b1": b.numerator, "b2": b.denominator,
                    "big1": hi.numerator, "big2": hi.denominator}

        return Fam(
            category="Fractions", difficulty=diff, tags=["comparison"],
            question="Which is larger: {a1}/{a2} or {b1}/{b2}? Give the larger fraction in simplest form.",
            answer=lambda p: F(p["big1"], p["big2"]),
            hint="Cross-multiply to compare: multiply each numerator by the OTHER denominator and see which product is bigger.",
            shortcut="Compare {a1} x {b2} with {b1} x {a2}.",
            explanation="Cross-multiplying compares the two without a common denominator, and the larger one is {ans}.",
            mentalPattern="Cross-multiplication (the butterfly) compares fractions instantly.",
            commonMistake="Comparing numerators only, or assuming a bigger denominator means a bigger fraction.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == F(p["big1"], p["big2"]),
        )

    out.append(_compare("Medium", "cross-multiplication with friendly fractions"))
    out.append(_compare("Hard", "close fractions where the products must be worked out"))

    # ---- fraction to percent ----------------------------------------------------
    def gen_frac_pct(rng):
        num, den = pick(rng, ((1, 4), (3, 4), (1, 5), (2, 5), (1, 8), (3, 8), (1, 3), (7, 20)))
        return {"num": num, "den": den}

    out.append(Fam(
        category="Fractions", difficulty="Medium", tags=["fraction-percent"],
        question="Write {num}/{den} as a percent.",
        answer=lambda p: F(p["num"] * 100, p["den"]),
        hint="Scale the fraction up so the denominator is a hundred if you can; the numerator is then the percent. Otherwise convert to a decimal and shift it two places.",
        shortcut="{num}/{den} x 100 = {ans}%.",
        explanation="{num}/{den} x 100 = {ans}%.",
        mentalPattern="Percent is just a fraction with denominator 100 - scale up to it.",
        commonMistake="Moving the decimal point the wrong way.",
        reason="links fractions to percents", gen=gen_frac_pct, unit="%",
        verify=lambda p, a: a * p["den"] == p["num"] * 100,
    ))
    return out


def families():
    return percent_families() + speed_families() + fraction_families()
