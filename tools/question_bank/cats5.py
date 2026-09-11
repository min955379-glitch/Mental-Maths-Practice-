"""Question families: Age Problems, Time Calculation, Relative Speed."""
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt, dec, clock


# ================================================================ Age Problems
def age_families():
    out = []

    def _multiple(k, diff, reason):
        def gen(rng):
            child = pick(rng, (6, 7, 8, 9, 10, 11, 12))
            return {"k": k, "child": child}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["ratio-ages"],
            question="A father is {k} times as old as his son. If the son is {child}, how old is the father?",
            answer=lambda p: F(p["k"] * p["child"]),
            hint="Multiply the son's age by {k}.",
            shortcut="{k} x {child} = {ans}.",
            explanation="Father = {k} x son = {k} x {child} = {ans} years old.",
            mentalPattern="A ratio of ages is a multiplier on the known age.",
            commonMistake="Adding the multiple instead of multiplying.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["k"] * p["child"],
        )

    out.append(_multiple(2, "Easy", "simple doubling"))
    out.append(_multiple(3, "Easy", "simple tripling"))
    out.append(_multiple(4, "Medium", "larger multiplier"))

    def _sum_ratio(pairs, diff, reason):
        def gen(rng):
            a, b = pick(rng, pairs)
            unit = pick(rng, (4, 5, 6, 7, 8))
            return {"a": a, "b": b, "sum": (a + b) * unit}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["sum-and-ratio"],
            question="The ages of two brothers are in the ratio {a} : {b} and add up to {sum} years. How old is the elder brother?",
            answer=lambda p: F(p["b"] * p["sum"], p["a"] + p["b"]),
            hint="Add the ratio parts to find how many parts the total is, work out one part, then multiply by the elder brother's parts.",
            shortcut="One part = {sum} " + DIV + " ({a} + {b}); elder = {b} parts.",
            explanation="Total parts = {a} + {b}, so one part is {sum} divided by that; the elder brother is {ans}.",
            mentalPattern="Ratio plus total: value of one part = total / (sum of parts).",
            commonMistake="Dividing by the wrong number of parts or reporting the younger brother's age.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * (p["a"] + p["b"]) == p["b"] * p["sum"],
        )

    out.append(_sum_ratio(((2, 3), (3, 5), (1, 2), (4, 5)), "Easy", "friendly ratio and total"))
    out.append(_sum_ratio(((5, 7), (4, 7), (5, 9), (7, 8)), "Medium", "less friendly division per part"))
    out.append(_sum_ratio(((7, 11), (9, 13), (11, 15), (13, 17)), "Hard", "large parts and an awkward total"))

    def _sum_diff(diff, reason):
        def gen(rng):
            total = pick(rng, (40, 50, 60, 70, 80, 90))
            gap = pick(rng, (6, 8, 10, 12, 14, 20))
            if (total + gap) % 2:                 # keep both ages whole numbers
                gap += 1
            return {"sum": total, "gap": gap, "elder": F(total + gap, 2)}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["sum-and-difference"],
            question="The sum of two ages is {sum} years and their difference is {gap} years. How old is the elder person?",
            answer=lambda p: F(p["sum"] + p["gap"], 2),
            hint="Elder = (sum + difference) / 2 - adding the two equations cancels the younger age.",
            shortcut="({sum} + {gap}) " + DIV + " 2.",
            explanation="Sum + difference = twice the elder age, so the elder is ({sum} + {gap})/2 = {ans}.",
            mentalPattern="Sum and difference: elder = (S + D)/2, younger = (S - D)/2.",
            commonMistake="Halving only the sum.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 2 == p["sum"] + p["gap"],
        )

    out.append(_sum_diff("Easy", "standard sum-difference pair"))
    out.append(_sum_diff("Medium", "larger numbers"))
    out.append(_sum_diff("Hard", "odd totals that give half-years"))

    def _when_multiple(diff, reason):
        def gen(rng):
            k = pick(rng, (2, 3))
            now_s = pick(rng, (6, 8, 10, 12, 15))
            years = pick(rng, (2, 3, 4, 5, 6, 8, 10))
            # choose the father's age so that "in `years` years" is exactly the answer
            now_f = k * (now_s + years) - years
            return {"k": k, "now_f": now_f, "now_s": now_s, "gap": now_f - now_s}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["future-ratio"],
            question="A father is {now_f} and his son is {now_s}. In how many years will the father be {k} times as old as the son?",
            answer=lambda p: F(p["now_f"] - p["k"] * p["now_s"], p["k"] - 1),
            hint="The AGE GAP never changes, so work it out from the two ages given. Then find the son's future age at which the gap is one fewer than {k} son-ages, and subtract his present age.",
            shortcut="Gap = {now_f} " + MINUS + " {now_s}; at that future date the gap is (k " + MINUS + " 1) times the son's age, so son = gap/({k} " + MINUS + " 1); years = that " + MINUS + " {now_s}.",
            explanation="The gap is constant. When the father is {k} times the son, the gap equals ({k} " + MINUS + " 1) son-ages, so the son will be a certain age then; subtracting the son's present age gives {ans} years.",
            mentalPattern="Age gaps are constant: (k - 1) x future son's age = the fixed gap.",
            commonMistake="Scaling the gap instead of keeping it fixed.",
            reason=reason, gen=gen,
            verify=lambda p, a: p["now_f"] + a == p["k"] * (p["now_s"] + a),
        )

    out.append(_when_multiple("Medium", "constant-gap reasoning"))
    out.append(_when_multiple("Hard", "constant gap with an awkward division"))

    def _ratio_change(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((5, 7), (3, 5), (7, 9), (2, 3)))
            t = pick(rng, (4, 5, 6, 8, 10))
            c, d = a + 1, b + 1
            g = _gcd(c, d)
            return {"a": a, "b": b, "t": t, "c": c // g, "d": d // g, "age": a * t}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["ratio-change"],
            question="Two people are now aged in the ratio {a} : {b}. After {t} years the ratio will be {c} : {d}. How old is the younger one now?",
            answer=lambda p: F(p["a"] * p["t"]),
            hint="Call the ages {a}k and {b}k. Add {t} to each: ({a}k + {t}) : ({b}k + {t}) = {c} : {d}. Cross-multiply and solve for k.",
            shortcut="Cross-multiply ({a}k + {t})/{c} = ({b}k + {t})/{d} and solve for k, then the younger age is {a}k.",
            explanation="Taking the ages as {a}k and {b}k and setting the future ratio to {c} : {d} gives k, so the younger person is {ans} now.",
            mentalPattern="Ratio change: set up {a}k + t over {b}k + t and cross-multiply - the k terms collect neatly.",
            commonMistake="Adding the years to the ratio instead of to both ages.",
            reason=reason, gen=gen,
            verify=lambda p, a: (p["b"] * a / p["a"] + p["t"]) * p["c"] == (a + p["t"]) * p["d"],
        )

    def _gcd(x, y):
        while y:
            x, y = y, x % y
        return x

    out.append(_ratio_change("Medium", "set up k and cross-multiply"))
    out.append(_ratio_change("Hard", "cross-multiply with larger numbers"))

    def _past(diff, reason):
        def gen(rng):
            now = pick(rng, (24, 28, 30, 32, 36, 40))
            years = pick(rng, (4, 5, 6, 8, 10))
            return {"now": now, "years": years, "then": now - years}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["past-ages"],
            question="Ali is {now} years old. How old was he {years} years ago?",
            answer=lambda p: F(p["now"] - p["years"]),
            hint="Subtract the number of years from the present age.",
            shortcut="{now} " + MINUS + " {years} = {ans}.",
            explanation="{now} " + MINUS + " {years} = {ans} years old.",
            mentalPattern="Every year moves every age by one - the gap between two people never changes.",
            commonMistake="Adding instead of subtracting when going back in time.",
            reason=reason, gen=gen,
            verify=lambda p, a: a + p["years"] == p["now"],
        )

    out.append(_past("Easy", "simple subtraction"))

    def _three_people(diff, reason):
        def gen(rng):
            a, b, c = pick(rng, ((1, 2, 3), (2, 3, 4), (3, 4, 5), (2, 5, 7)))
            unit = pick(rng, (3, 4, 5, 6))
            return {"a": a, "b": b, "c": c, "sum": (a + b + c) * unit}

        return Fam(
            category="Age Problems", difficulty=diff, tags=["three-ages"],
            question="The ages of three siblings are in the ratio {a} : {b} : {c} and add up to {sum} years. How old is the eldest?",
            answer=lambda p: F(p["c"] * p["sum"], p["a"] + p["b"] + p["c"]),
            hint="Add all three ratio parts, find the value of one part from the total, then multiply by the eldest sibling's parts.",
            shortcut="One part = {sum} " + DIV + " ({a} + {b} + {c}); eldest = {c} parts.",
            explanation="Total parts = {a} + {b} + {c}; one part times {c} gives the eldest at {ans} years.",
            mentalPattern="Three-way ratio sharing: one part = total / (sum of parts).",
            commonMistake="Missing one part when adding the ratio.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * (p["a"] + p["b"] + p["c"]) == p["c"] * p["sum"],
        )

    out.append(_three_people("Medium", "three parts to add"))
    out.append(_three_people("Hard", "three parts with a larger total"))
    return out


# ============================================================ Time Calculation
def time_families():
    out = []

    def _duration(diff, reason):
        def gen(rng):
            h1 = pick(rng, (2, 3, 5, 7, 8, 9, 10, 11))
            m1 = pick(rng, (0, 10, 15, 20, 30, 40, 45))
            dh = pick(rng, (1, 2, 3, 4))
            dm = pick(rng, (5, 10, 15, 20, 25, 30, 40))
            h2, m2 = h1 + dh, m1 + dm
            if m2 >= 60:
                m2 -= 60
                h2 += 1
            return {"t1": clock(h1, m1), "t2": clock(h2, m2), "mins": dh * 60 + dm}

        return Fam(
            category="Time Calculation", difficulty=diff, tags=["elapsed-time"],
            question="How many minutes are there between {t1} and {t2}?",
            answer=lambda p: F(p["mins"]),
            hint="Count the whole hours first (x 60), then add the leftover minutes - or count up to the next hour and then to the end time.",
            shortcut="Full hours x 60, plus the extra minutes.",
            explanation="From {t1} to {t2} is {ans} minutes.",
            mentalPattern="Elapsed time: count on to the next o'clock, then add the rest.",
            commonMistake="Treating time as a decimal (e.g. reading 1 h 30 min as 1.3 hours).",
            reason=reason, gen=gen, unit="minutes",
            verify=lambda p, a: a == p["mins"],
        )

    out.append(_duration("Easy", "short interval within a few hours"))
    out.append(_duration("Medium", "longer interval crossing an hour boundary"))
    out.append(_duration("Hard", "interval with awkward minutes"))

    def _add_on(diff, reason):
        def gen(rng):
            h = pick(rng, (7, 8, 9, 10, 11, 14, 15, 16))
            m = pick(rng, (5, 10, 15, 20, 25, 35, 45, 50))
            add_h = pick(rng, (1, 2, 3))
            add_m = pick(rng, (15, 20, 25, 30, 40, 45))
            end_m = m + add_m
            end_h = h + add_h
            if end_m >= 60:
                end_m -= 60
                end_h += 1
            if end_h >= 24:
                end_h -= 24
            return {"start": clock(h, m), "add_h": add_h, "add_m": add_m,
                    "end": clock(end_h, end_m), "end24": "%02d:%02d" % (end_h, end_m)}

        return Fam(
            category="Time Calculation", difficulty=diff, tags=["add-duration"],
            question="A meeting starts at {start} and lasts {add_h} hours {add_m} minutes. At what time does it end?",
            answer=lambda p: p["end"],
            hint="Add the hours and the minutes separately; if the minutes reach 60, carry one hour.",
            shortcut="Minutes first (carry if 60 or more), then hours.",
            explanation="{start} plus {add_h} h {add_m} min = {ans}.",
            mentalPattern="Add minutes first; every 60 minutes carries one hour.",
            commonMistake="Writing something like 9:75 instead of carrying the hour.",
            reason=reason, gen=gen, accepted=["{end24}", "{end24} "],
            verify=lambda p, a: a == p["end"],
        )

    out.append(_add_on("Easy", "add a short duration"))
    out.append(_add_on("Medium", "carry an hour"))
    out.append(_add_on("Hard", "carry across midday or midnight"))

    def _to_12h(diff, reason):
        def gen(rng):
            h = pick(rng, (13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23))
            m = pick(rng, (5, 10, 15, 20, 25, 30, 40, 45, 55))
            hh = h - 12
            return {"h24": "%02d:%02d" % (h, m), "h12": "%d:%02d PM" % (hh, m),
                    "hh": hh, "mm": "%02d" % m}

        return Fam(
            category="Time Calculation", difficulty=diff, tags=["clock-formats"],
            question="Write {h24} (24-hour clock) using the 12-hour clock with AM/PM.",
            answer=lambda p: p["h12"],
            hint="For any hour after 12, subtract 12 and label it PM.",
            shortcut="Hour minus 12, then PM.",
            explanation="{h24} is {ans} on the 12-hour clock.",
            mentalPattern="After midday: subtract 12 and write PM; before midday the hour is unchanged (12 AM is midnight).",
            commonMistake="Keeping 24-hour numbers above 12 in a 12-hour answer.",
            reason=reason, gen=gen, accepted=["{hh}:{mm} PM", "{hh}:{mm}PM", "{hh} {mm} PM"],
        )

    out.append(_to_12h("Easy", "afternoon hours"))
    out.append(_to_12h("Medium", "evening hours"))
    out.append(_to_12h("Hard", "late-night hours"))

    def _seconds(diff, reason):
        def gen(rng):
            hours = F(pick(rng, (1, 2, 3)), pick(rng, (1, 2, 4)))
            return {"hours": dec(hours), "secs": int(hours * 3600)}

        return Fam(
            category="Time Calculation", difficulty=diff, tags=["conversion"],
            question="How many seconds are there in {hours} hours?",
            answer=lambda p: F(p["secs"]),
            hint="Convert the hours to minutes first (x 60), then minutes to seconds (x 60 again).",
            shortcut="Hours x 60 x 60 = seconds.",
            explanation="{hours} hours x 60 x 60 = {ans} seconds.",
            mentalPattern="Two chained conversions: hours to minutes, then minutes to seconds.",
            commonMistake="Multiplying by 60 only once.",
            reason=reason, gen=gen, unit="seconds",
            verify=lambda p, a: a == p["secs"],
        )

    out.append(_seconds("Easy", "whole hours to seconds"))
    out.append(_seconds("Medium", "fractional hours to seconds"))
    out.append(_seconds("Hard", "quarter hours and larger"))

    def _days(diff, reason):
        def gen(rng):
            days = pick(rng, (2, 3, 5, 7, 10))
            extra_h = pick(rng, (3, 6, 8, 9, 12))
            return {"d": days, "h": extra_h, "total": days * 24 + extra_h}

        return Fam(
            category="Time Calculation", difficulty=diff, tags=["conversion"],
            question="How many hours are there in {d} days and {h} hours?",
            answer=lambda p: F(p["total"]),
            hint="Convert the days to hours (x 24), then add the extra hours.",
            shortcut="{d} x 24 + {h}.",
            explanation="{d} days = {d} x 24 hours, plus {h} more gives {ans} hours.",
            mentalPattern="Days to hours: multiply by 24 (double, double, double, times 3 works too).",
            commonMistake="Using 12 hours per day.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a == p["total"],
        )

    out.append(_days("Easy", "small number of days"))
    out.append(_days("Medium", "more days plus extra hours"))
    out.append(_days("Hard", "a week or more"))

    def _overnight(diff, reason):
        def gen(rng):
            start_h = pick(rng, (21, 22, 23))
            start_m = pick(rng, (10, 20, 30, 40, 50))
            dur_h = pick(rng, (6, 7, 8))
            dur_m = pick(rng, (10, 20, 30, 40))
            total = (start_h * 60 + start_m) + (dur_h * 60 + dur_m)
            end = total % (24 * 60)
            return {"start": clock(start_h, start_m), "dur_h": dur_h, "dur_m": dur_m,
                    "end": clock(end // 60, end % 60), "end24": "%02d:%02d" % (end // 60, end % 60)}

        return Fam(
            category="Time Calculation", difficulty=diff, tags=["overnight"],
            question="A train leaves at {start} and travels for {dur_h} hours {dur_m} minutes. What time does it arrive?",
            answer=lambda p: p["end"],
            hint="Convert the start time to minutes past midnight, add the journey, then convert back - subtract 24 hours if you pass midnight.",
            shortcut="Add the minutes; if the total passes 24:00, subtract 24 hours and it is the next day.",
            explanation="{start} plus {dur_h} h {dur_m} min crosses midnight, giving {ans}.",
            mentalPattern="Work in minutes past midnight, then take the remainder after dividing by 24 x 60.",
            commonMistake="Forgetting that the clock wraps round at midnight.",
            reason=reason, gen=gen, accepted=["{end24}"],
            verify=lambda p, a: a == p["end"],
        )

    out.append(_overnight("Medium", "journey crossing midnight"))
    out.append(_overnight("Hard", "long overnight journey"))
    return out


# ============================================================== Relative Speed
def relative_speed_families():
    out = []

    def _opposite(diff, reason):
        def gen(rng):
            v1 = pick(rng, (20, 30, 40, 50, 60))
            v2 = pick(rng, (20, 30, 40, 50, 60))
            dist = (v1 + v2) * pick(rng, (1, 2, 3, 4))
            return {"v1": v1, "v2": v2, "dist": dist}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["opposite-direction"],
            question="Two towns are {dist} km apart. A car leaves one at {v1} km/h and another leaves the other at {v2} km/h, travelling towards each other. How many hours until they meet?",
            answer=lambda p: F(p["dist"], p["v1"] + p["v2"]),
            hint="When two objects move towards each other, their speeds ADD: the gap closes at ({v1} + {v2}) km/h.",
            shortcut="Closing speed = {v1} + {v2} km/h; time = {dist} " + DIV + " that.",
            explanation="The gap closes at {v1} + {v2} km/h, so they meet after {dist} / ({v1} + {v2}) = {ans} hours.",
            mentalPattern="Opposite directions: relative speed = v1 + v2.",
            commonMistake="Subtracting the speeds when the objects move towards each other.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a * (p["v1"] + p["v2"]) == p["dist"],
        )

    out.append(_opposite("Easy", "closing speed with round numbers"))
    out.append(_opposite("Medium", "larger distance and speeds"))
    out.append(_opposite("Hard", "the division does not come out whole"))

    def _same_direction(diff, reason):
        def gen(rng):
            fast = pick(rng, (50, 60, 70, 80, 90))
            slow = pick(rng, (20, 30, 40, 50))
            if fast <= slow:
                slow = fast - 20
            hours = pick(rng, (2, 3, 4, 5))
            return {"fast": fast, "slow": slow, "gap": (fast - slow) * hours}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["same-direction"],
            question="A car at {slow} km/h has a {gap} km head start. A faster car at {fast} km/h sets off after it. How many hours does the faster car take to catch up?",
            answer=lambda p: F(p["gap"], p["fast"] - p["slow"]),
            hint="Moving the same way, only the DIFFERENCE in speed closes the gap: ({fast} " + MINUS + " {slow}) km/h.",
            shortcut="Gain per hour = {fast} " + MINUS + " {slow} km; time = {gap} " + DIV + " that gain.",
            explanation="The faster car gains {fast} " + MINUS + " {slow} km every hour, so a {gap} km gap takes {ans} hours to close.",
            mentalPattern="Same direction: relative speed = |v1 - v2|.",
            commonMistake="Adding the speeds when both move the same way.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a * (p["fast"] - p["slow"]) == p["gap"],
        )

    out.append(_same_direction("Easy", "simple speed difference"))
    out.append(_same_direction("Medium", "bigger gap to close"))
    out.append(_same_direction("Hard", "awkward speed difference"))

    def _crossing(diff, reason):
        def gen(rng):
            rel_ms = pick(rng, (15, 20, 25, 30)) if diff != "Hard" else pick(rng, (10, 20, 35, 40))
            secs = pick(rng, (8, 10, 12, 14, 16, 20))
            length = rel_ms * secs // 2          # each train is this long
            rel_kmh = rel_ms * 18 // 5           # (v1 + v2), a whole number of km/h
            v1 = rel_kmh // pick(rng, (3, 4, 5))
            if v1 <= 0:
                v1 = rel_kmh // 3
            v2 = rel_kmh - v1
            return {"length": length, "v1": v1, "v2": v2, "secs": secs, "total": 2 * length}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["trains", "opposite-direction"],
            question="Two trains, each {length} m long, run towards each other at {v1} km/h and {v2} km/h. How many seconds do they take to cross each other completely?",
            answer=lambda p: F(2 * p["length"] * 18, (p["v1"] + p["v2"]) * 5),
            hint="While crossing, together they cover the SUM of both lengths. Convert the combined speed to m/s (x 5/18) and divide the total length by it.",
            shortcut="Total distance = 2 x {length} m; combined speed x 5/18 = m/s; time = distance " + DIV + " speed.",
            explanation="Combined speed = {v1} + {v2} km/h; in m/s that is x 5/18. Dividing {total} m by it gives {ans} seconds.",
            mentalPattern="Crossing trains: distance = sum of lengths, speed = sum of speeds (opposite directions).",
            commonMistake="Using only one train's length, or forgetting the km/h to m/s conversion.",
            reason=reason, gen=gen, unit="seconds",
            verify=lambda p, a: a * (p["v1"] + p["v2"]) * 5 == 2 * p["length"] * 18,
        )

    out.append(_crossing("Medium", "sum of lengths plus unit conversion"))
    out.append(_crossing("Hard", "awkward conversion in both directions"))

    def _pole(diff, reason):
        def gen(rng):
            length = pick(rng, (100, 120, 150, 180, 200, 240, 300))
            secs = pick(rng, (5, 6, 8, 9, 10, 12, 15))
            return {"length": length, "secs": secs}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["trains", "conversion"],
            question="A train {length} m long passes a pole in {secs} seconds. What is its speed in km/h?",
            answer=lambda p: F(p["length"] * 18, p["secs"] * 5),
            hint="Passing a pole means the train travels exactly its own length. Speed is length over time in metres per second, then multiply by eighteen fifths for km/h.",
            shortcut="{length} " + DIV + " {secs} m/s, then x 3.6.",
            explanation="Speed = {length} m in {secs} s; that is m/s, and multiplying by 18/5 gives {ans} km/h.",
            mentalPattern="m/s to km/h is x 18/5; a train passing a point covers exactly its own length.",
            commonMistake="Forgetting to convert m/s into km/h.",
            reason=reason, gen=gen, unit="km/h",
            verify=lambda p, a: a * F(5, 18) * p["secs"] == p["length"],
        )

    out.append(_pole("Easy", "clean conversion"))
    out.append(_pole("Medium", "larger numbers"))
    out.append(_pole("Hard", "awkward division then conversion"))

    def _bridge(diff, reason):
        def gen(rng):
            speed_ms = pick(rng, (10, 15, 20, 25, 30))
            train = pick(rng, (100, 120, 150, 180, 200))
            secs = pick(rng, (12, 15, 18, 20, 24, 30)) if diff != "Hard" else pick(rng, (14, 21, 22, 26, 30))
            bridge = speed_ms * secs - train          # exact by construction
            return {"train": train, "bridge": bridge, "v": speed_ms,
                    "total": F(train + bridge, speed_ms)}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["trains", "platform"],
            question="A {train} m train crosses a {bridge} m bridge at {v} m/s. How many seconds does it take?",
            answer=lambda p: F(p["train"] + p["bridge"], p["v"]),
            hint="The train has fully crossed only when its END clears the far side, so the distance is train length + bridge length.",
            shortcut="Distance = {train} + {bridge} m; time = distance " + DIV + " {v} m/s.",
            explanation="Total distance = {train} + {bridge} = {sum} m, so at {v} m/s the crossing takes {ans} seconds.",
            mentalPattern="Crossing a platform or bridge: distance = train length + structure length.",
            commonMistake="Using only the bridge length.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, sum=p["train"] + p["bridge"]))(_bridge_gen(rng)),
            verify=lambda p, a: a * p["v"] == p["train"] + p["bridge"],
        )

    def _bridge_gen(rng):
        speed_ms = pick(rng, (10, 15, 20, 25, 30))
        train = pick(rng, (100, 120, 150, 180, 200))
        secs = pick(rng, (12, 15, 18, 20, 24, 30))
        bridge = speed_ms * secs - train
        return {"train": train, "bridge": bridge, "v": speed_ms, "sum": train + bridge}

    out.append(_bridge("Easy", "add the two lengths"))
    out.append(_bridge("Medium", "larger lengths"))
    out.append(_bridge("Hard", "awkward division"))
    return out


def families():
    return age_families() + time_families() + relative_speed_families()
