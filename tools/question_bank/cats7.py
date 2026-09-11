"""Extra families to deepen the thinner (category, difficulty) cells."""
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt, dec


def extra_families():
    out = []

    # ---------------------------------------------------------------- Pipes Tanks
    def _unit_rate(diff, reason):
        def gen(rng):
            h = pick(rng, (3, 4, 5, 6, 8, 10))
            return {"h": h}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["rate"],
            question="A pipe fills 1/{h} of a tank every hour. How many hours does it need to fill the whole tank?",
            answer=lambda p: F(p["h"]),
            hint="If one hour fills one part out of {h}, you simply need {h} such hours to make one whole tank.",
            shortcut="1 whole tank needs {h} hours at 1/{h} per hour.",
            explanation="At 1/{h} of the tank each hour, the tank is full after {ans} hours.",
            mentalPattern="Work in fractions of the whole: 1 divided by the hourly rate gives the hours.",
            commonMistake="Answering with the fraction 1/{h} instead of the number of hours.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a == p["h"],
        )

    out.append(_unit_rate("Easy", "direct reading of the unit rate"))

    def _litres(diff, reason):
        def gen(rng):
            litres = pick(rng, (120, 180, 240, 300, 360, 480))
            hours = pick(rng, (2, 3, 4, 5, 6))
            return {"litres": litres, "hours": hours}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["rate"],
            question="A pump delivers {litres} litres in {hours} hours. How many litres per hour does it deliver?",
            answer=lambda p: F(p["litres"], p["hours"]),
            hint="Divide the total litres by the number of hours to get the rate per single hour.",
            shortcut="{litres} " + DIV + " {hours} = litres per hour.",
            explanation="{litres} litres over {hours} hours is {ans} litres per hour.",
            mentalPattern="Rate = amount / time; check the units you are asked for.",
            commonMistake="Multiplying instead of dividing.",
            reason=reason, gen=gen, unit="litres/hour",
            verify=lambda p, a: a * p["hours"] == p["litres"],
        )

    out.append(_litres("Easy", "simple rate division"))
    out.append(_litres("Medium", "larger numbers"))

    def _half_full(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((3, 6), (4, 6), (6, 12), (8, 24), (4, 12), (6, 8)))
            return {"a": a, "b": b}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["filling", "emptying", "two-stage"],
            question="A pipe fills a tank in {a} hours and a leak empties it in {b} hours. If the tank is already half full, how many hours does it take to fill with both open?",
            answer=lambda p: F(1, 2) / (F(1, p["a"]) - F(1, p["b"])),
            hint="Find the NET rate (1/{a} " + MINUS + " 1/{b}) and remember only HALF a tank is left to fill.",
            shortcut="Time = (1/2) " + DIV + " (1/{a} " + MINUS + " 1/{b}).",
            explanation="The net rate is 1/{a} " + MINUS + " 1/{b} per hour, and only half a tank is needed, so the time is {ans} hours.",
            mentalPattern="Fraction remaining divided by the net rate - do not forget the 'half full' part.",
            commonMistake="Filling a whole tank instead of the half that is missing.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a * (F(1, p["a"]) - F(1, p["b"])) == F(1, 2),
        )

    out.append(_half_full("Hard", "net rate plus a partially full tank"))

    def _two_fill_one_empty(diff, reason):
        def gen(rng):
            a, b, c = pick(rng, ((2, 3, 3), (2, 4, 4), (3, 6, 4), (3, 6, 6),
                                 (4, 4, 4), (4, 8, 8), (2, 4, 2), (6, 12, 6)))
            return {"a": a, "b": b, "c": c}

        return Fam(
            category="Pipes Tanks", difficulty=diff, tags=["filling", "emptying", "three-pipes"],
            question="Two pipes fill a tank in {a} and {b} hours, while a third empties it in {c} hours. With all three open, how many hours to fill the tank?",
            answer=lambda p: F(1, 1) / (F(1, p["a"]) + F(1, p["b"]) - F(1, p["c"])),
            hint="Add the two filling rates and SUBTRACT the emptying rate, then invert the net rate.",
            shortcut="Net = 1/{a} + 1/{b} " + MINUS + " 1/{c}; time = 1 " + DIV + " net.",
            explanation="Net rate = 1/{a} + 1/{b} " + MINUS + " 1/{c}, so the tank fills in {ans} hours.",
            mentalPattern="Fillers add, emptiers subtract; invert the net rate for the time.",
            commonMistake="Adding the emptying pipe's rate as if it filled the tank.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: F(1, a) == F(1, p["a"]) + F(1, p["b"]) - F(1, p["c"]),
        )

    out.append(_two_fill_one_empty("Hard", "three rates with one working against the others"))

    # ------------------------------------------------------------ Unit Conversion
    def _km_to_cm(diff, reason):
        def gen(rng):
            return {"v": pick(rng, (2, 3, 4, 5, 6, 8, 10))}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["metric", "two-step"],
            question="Convert {v} km into centimetres.",
            answer=lambda p: F(p["v"] * 100000),
            hint="Do it in two steps: km to metres (x 1000), then metres to cm (x 100).",
            shortcut="{v} x 1000 x 100 = {ans} cm.",
            explanation="{v} km = {v} x 1000 m, and each metre is 100 cm, giving {ans} cm.",
            mentalPattern="Chain the conversions: multiply by 1000, then by 100.",
            commonMistake="Using a single factor (1000 or 100) instead of both.",
            reason=reason, gen=gen, unit="cm",
            verify=lambda p, a: a == p["v"] * 100000,
        )

    out.append(_km_to_cm("Hard", "two chained metric steps"))

    def _days_to_seconds(diff, reason):
        def gen(rng):
            return {"d": pick(rng, (2, 3, 4, 5))}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["time", "two-step"],
            question="How many seconds are there in {d} days?",
            answer=lambda p: F(p["d"] * 86400),
            hint="Days to hours (x 24), then hours to minutes (x 60), then minutes to seconds (x 60).",
            shortcut="{d} x 24 x 60 x 60 = {ans} seconds.",
            explanation="{d} days x 24 hours x 60 minutes x 60 seconds = {ans} seconds.",
            mentalPattern="Chain the time conversions one step at a time rather than memorising 86,400.",
            commonMistake="Dropping one of the three conversions.",
            reason=reason, gen=gen, unit="seconds",
            verify=lambda p, a: a == p["d"] * 86400,
        )

    out.append(_days_to_seconds("Hard", "three chained conversions"))

    def _litres_decimal(diff, reason):
        def gen(rng):
            v = F(pick(rng, (1, 3, 5, 7, 9)), 2)
            return {"v": dec(v), "ml": int(v * 1000)}

        return Fam(
            category="Unit Conversion", difficulty=diff, tags=["metric", "decimals"],
            question="Convert {v} litres into millilitres.",
            answer=lambda p: F(p["ml"]),
            hint="A litre is a thousand millilitres, so scale up by a thousand - half a litre is five hundred millilitres.",
            shortcut="{v} x 1000 = {ans} ml.",
            explanation="{v} litres x 1000 = {ans} millilitres.",
            mentalPattern="Litres to millilitres: multiply by 1000 (move the digits three places).",
            commonMistake="Dividing, or moving the point the wrong number of places.",
            reason=reason, gen=gen, unit="ml",
            verify=lambda p, a: a == p["ml"],
        )

    out.append(_litres_decimal("Hard", "decimal volume conversion"))

    # --------------------------------------------------------- Speed Distance Time
    def _basic_distance(diff, reason):
        def gen(rng):
            v = pick(rng, (20, 30, 40, 50, 60))
            t = pick(rng, (2, 3, 4, 5, 6))
            return {"v": v, "t": t}

        return Fam(
            category="Speed Distance Time", difficulty=diff, tags=["distance"],
            question="A car travels at {v} km/h for {t} hours. How far does it travel?",
            answer=lambda p: F(p["v"] * p["t"]),
            hint="Distance = speed × time: for every hour of travelling, add the speed once more.",
            shortcut="{v} x {t} = {ans} km.",
            explanation="Distance = {v} x {t} = {ans} km.",
            mentalPattern="The three formulas are one triangle: distance = speed x time.",
            commonMistake="Dividing instead of multiplying.",
            reason=reason, gen=gen, unit="km",
            verify=lambda p, a: a == p["v"] * p["t"],
        )

    out.append(_basic_distance("Easy", "single multiplication"))

    def _basic_time(diff, reason):
        def gen(rng):
            v = pick(rng, (20, 25, 30, 40, 50, 60))
            t = pick(rng, (2, 3, 4, 5))
            return {"v": v, "t": t, "d": v * t}

        return Fam(
            category="Speed Distance Time", difficulty=diff, tags=["time"],
            question="How long does it take to travel {d} km at {v} km/h?",
            answer=lambda p: F(p["d"], p["v"]),
            hint="Time = distance ÷ speed: work out how many times the speed fits into the distance.",
            shortcut="{d} " + DIV + " {v} = {ans} hours.",
            explanation="Time = distance " + DIV + " speed = {d} " + DIV + " {v} = {ans} hours.",
            mentalPattern="Cover the quantity you want in the speed/distance/time triangle.",
            commonMistake="Multiplying distance by speed.",
            reason=reason, gen=gen, unit="hours",
            verify=lambda p, a: a * p["v"] == p["d"],
        )

    out.append(_basic_time("Easy", "single division"))

    def _basic_speed(diff, reason):
        def gen(rng):
            v = pick(rng, (30, 40, 45, 50, 60, 80))
            t = pick(rng, (2, 3, 4, 5))
            return {"v": v, "t": t, "d": v * t}

        return Fam(
            category="Speed Distance Time", difficulty=diff, tags=["speed"],
            question="A journey of {d} km takes {t} hours. What is the average speed?",
            answer=lambda p: F(p["d"], p["t"]),
            hint="Speed = distance ÷ time: spread the distance evenly over the hours the journey took.",
            shortcut="{d} " + DIV + " {t} = {ans} km/h.",
            explanation="Speed = distance " + DIV + " time = {ans} km/h.",
            mentalPattern="Average speed uses the TOTAL distance over the TOTAL time, never the average of speeds.",
            commonMistake="Averaging different speeds instead of dividing distance by time.",
            reason=reason, gen=gen, unit="km/h",
            verify=lambda p, a: a * p["t"] == p["d"],
        )

    out.append(_basic_speed("Easy", "single division for speed"))
    out.append(_basic_speed("Medium", "larger journey"))

    # -------------------------------------------------------------- Relative Speed
    def _metres_towards(diff, reason):
        def gen(rng):
            a = pick(rng, (20, 25, 30, 40))
            b = pick(rng, (20, 30, 40, 50))
            mins = pick(rng, (2, 3, 4, 5))
            return {"a": a, "b": b, "d": (a + b) * mins}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["opposite-direction"],
            question="Two people are {d} m apart and walk towards each other at {a} m/min and {b} m/min. How many minutes until they meet?",
            answer=lambda p: F(p["d"], p["a"] + p["b"]),
            hint="Approaching each other, the speeds ADD: the gap shrinks by ({a} + {b}) metres every minute.",
            shortcut="Closing speed = {a} + {b} m/min; time = {d} " + DIV + " that.",
            explanation="The gap closes at {a} + {b} m/min, so {d} m takes {ans} minutes.",
            mentalPattern="Opposite directions: add the speeds to get the closing speed.",
            commonMistake="Subtracting the speeds.",
            reason=reason, gen=gen, unit="minutes",
            verify=lambda p, a: a * (p["a"] + p["b"]) == p["d"],
        )

    out.append(_metres_towards("Easy", "closing speed in metres per minute"))

    def _boat(diff, reason):
        def gen(rng):
            still = pick(rng, (12, 15, 18, 20, 24))
            current = pick(rng, (2, 3, 4, 5, 6))
            return {"still": still, "current": current}

        return Fam(
            category="Relative Speed", difficulty=diff, tags=["upstream-downstream"],
            question="A boat moves at {still} km/h in still water and the current flows at {current} km/h. What is its speed going UPSTREAM?",
            answer=lambda p: F(p["still"] - p["current"]),
            hint="Downstream the current HELPS (add it); upstream it works against the boat, so subtract it.",
            shortcut="Upstream = still water speed " + MINUS + " current.",
            explanation="Against the current the boat loses {current} km/h, so upstream speed = {still} " + MINUS + " {current} = {ans} km/h.",
            mentalPattern="Upstream = boat minus stream; downstream = boat plus stream.",
            commonMistake="Adding the current when going upstream.",
            reason=reason, gen=gen, unit="km/h",
            verify=lambda p, a: a + p["current"] == p["still"],
        )

    out.append(_boat("Easy", "subtract the current"))
    out.append(_boat("Medium", "larger speeds and current"))

    # -------------------------------------------------------------------- Averages
    def _two_number(diff, reason):
        def gen(rng):
            a = pick(rng, (10, 12, 14, 16, 20, 24))
            b = pick(rng, (20, 26, 30, 32, 36, 40))
            return {"a": a, "b": b}

        return Fam(
            category="Averages", difficulty=diff, tags=["basic-average"],
            question="What is the average of {a} and {b}?",
            answer=lambda p: F(p["a"] + p["b"], 2),
            hint="The average of two numbers is the number exactly halfway between them: add them and halve.",
            shortcut="({a} + {b}) " + DIV + " 2.",
            explanation="Halfway between {a} and {b} is ({a} + {b})/2 = {ans}.",
            mentalPattern="Average of two = their midpoint = (a + b)/2.",
            commonMistake="Subtracting instead of adding before halving.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 2 == p["a"] + p["b"],
        )

    out.append(_two_number("Easy", "midpoint of two numbers"))

    def _first_multiples(diff, reason):
        def gen(rng):
            k = pick(rng, (3, 4, 5, 6, 8, 10))
            n = pick(rng, (3, 5, 7)) if diff == "Easy" else pick(rng, (5, 7, 9))
            # k*(n+1) even keeps the average a whole number
            if (k * (n + 1)) % 2:
                n += 1
            return {"k": k, "n": n, "avg": F(k * (n + 1), 2)}

        return Fam(
            category="Averages", difficulty=diff, tags=["consecutive"],
            question="What is the average of the first {n} positive multiples of {k}?",
            answer=lambda p: F(p["k"] * (p["n"] + 1), 2),
            hint="The multiples are evenly spaced, so the average is simply the middle one - or use (first + last) " + DIV + " 2.",
            shortcut="First = {k}, last = {k} x {n}; average = (first + last) " + DIV + " 2.",
            explanation="The multiples run from {k} to {k} x {n} evenly, so the average is ({k} + {k} x {n})/2 = {ans}.",
            mentalPattern="Evenly spaced list: average = (first + last)/2.",
            commonMistake="Averaging the whole list term by term.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 2 == p["k"] * (p["n"] + 1),
        )

    out.append(_first_multiples("Easy", "evenly spaced multiples"))
    out.append(_first_multiples("Medium", "more multiples to average"))

    # ------------------------------------------------------------------- Work Time
    def _fraction_per_day(diff, reason):
        def gen(rng):
            d = pick(rng, (4, 5, 6, 8, 10))
            return {"d": d}

        return Fam(
            category="Work Time", difficulty=diff, tags=["rate"],
            question="A worker completes 1/{d} of a job each day. How many days does the whole job take?",
            answer=lambda p: F(p["d"]),
            hint="If one day finishes one part out of {d}, you need {d} of those days to make one whole job.",
            shortcut="1 " + DIV + " (1/{d}) = {d} days.",
            explanation="At 1/{d} of the job per day, the job takes {ans} days.",
            mentalPattern="Time = 1 / daily rate. Rates add; times never do.",
            commonMistake="Answering 1/{d} instead of the number of days.",
            reason=reason, gen=gen, unit="days",
            verify=lambda p, a: a == p["d"],
        )

    out.append(_fraction_per_day("Easy", "read the unit rate directly"))

    def _one_worker(diff, reason):
        def gen(rng):
            men = pick(rng, (2, 3, 4, 5, 6))
            days = pick(rng, (4, 6, 8, 10, 12))
            return {"men": men, "days": days}

        return Fam(
            category="Work Time", difficulty=diff, tags=["man-days"],
            question="{men} men finish a job in {days} days. How long would ONE man take?",
            answer=lambda p: F(p["men"] * p["days"]),
            hint="One man works at one share of the speed, so the time is multiplied by the number of men: total work is men x days.",
            shortcut="{men} x {days} = {ans} days for one man.",
            explanation="Total work = {men} x {days} man-days, so a single man needs {ans} days.",
            mentalPattern="Fewer workers means proportionally more days: the product stays constant.",
            commonMistake="Dividing instead of multiplying.",
            reason=reason, gen=gen, unit="days",
            verify=lambda p, a: a == p["men"] * p["days"],
        )

    out.append(_one_worker("Easy", "multiply out the man-days"))

    # ------------------------------------------------------- Mental Multiplication
    def _twenty(diff, reason):
        def gen(rng):
            return {"n": pick(rng, (13, 17, 19, 23, 27, 31, 34, 38, 42, 46))}

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=["twenty"],
            question="Multiply {n} by 20 mentally.",
            answer=lambda p: F(p["n"] * 20),
            hint="Times 20 is times 2, then times 10: double the number and append a zero.",
            shortcut="{n} x 2 = {dbl}, then add a zero.",
            explanation="{n} x 20 = {n} x 2 x 10 = {ans}.",
            mentalPattern="Times 20: double it, then shift the digits one place.",
            commonMistake="Appending two zeros as if multiplying by 100.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, dbl=p["n"] * 2))(_twenty_gen(rng)),
            verify=lambda p, a: a == p["n"] * 20,
        )

    def _twenty_gen(rng):
        return {"n": pick(rng, (13, 17, 19, 23, 27, 31, 34, 38, 42, 46))}

    out.append(_twenty("Easy", "double then append a zero"))

    def _treble(diff, reason):
        def gen(rng):
            return {"n": pick(rng, (14, 16, 18, 22, 24, 26, 28, 32, 36, 42))}

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=["three"],
            question="Multiply {n} by 3 mentally.",
            answer=lambda p: F(p["n"] * 3),
            hint="Treble it: work left to right, multiplying the tens and then the units, and carry as you go.",
            shortcut="{n} x 3 = {ans}.",
            explanation="{n} x 3 = {ans}.",
            mentalPattern="Multiply the tens, then the units, and add - it keeps the intermediate numbers small.",
            commonMistake="Losing a carry from the units column.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["n"] * 3,
        )

    out.append(_treble("Easy", "simple trebling"))

    # ------------------------------------------------------------ Mental Division
    def _by_point_two(diff, reason):
        def gen(rng):
            return {"n": pick(rng, (12, 18, 24, 30, 36, 42, 48, 54))}

        return Fam(
            category="Mental Division", difficulty=diff, tags=["decimal-divisor"],
            question="Divide {n} by 0.2 mentally.",
            answer=lambda p: F(p["n"] * 5),
            hint="0.2 is one fifth, so dividing by it is the same as multiplying by 5.",
            shortcut="{n} " + DIV + " 0.2 = {n} x 5 = {ans}.",
            explanation="Dividing by 0.2 (a fifth) multiplies by 5, so {n} becomes {ans}.",
            mentalPattern="Dividing by a fraction flips it: dividing by 1/5 means multiplying by 5.",
            commonMistake="Multiplying by 0.2 instead of dividing.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * F(1, 5) == p["n"],
        )

    out.append(_by_point_two("Hard", "dividing by a decimal fraction"))

    def _by_twelve(diff, reason):
        def gen(rng):
            q = pick(rng, (6, 8, 9, 11, 12, 15, 18, 20, 25))
            return {"q": q, "n": q * 12}

        return Fam(
            category="Mental Division", difficulty=diff, tags=["chunking"],
            question="Divide {n} by 12 mentally.",
            answer=lambda p: F(p["q"]),
            hint="Split the divisor into four and three: halve twice to divide by four, then divide by three.",
            shortcut="{n} " + DIV + " 4, then " + DIV + " 3.",
            explanation="{n} " + DIV + " 12 = {ans}, and {ans} x 12 = {n} checks it.",
            mentalPattern="Split the divisor into factors and divide step by step.",
            commonMistake="Rounding the answer instead of keeping it exact.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 12 == p["n"],
        )

    out.append(_by_twelve("Hard", "divide by a composite divisor in stages"))

    def _by_fifteen(diff, reason):
        def gen(rng):
            q = pick(rng, (6, 8, 10, 12, 14, 16, 20, 24))
            return {"q": q, "n": q * 15}

        return Fam(
            category="Mental Division", difficulty=diff, tags=["chunking"],
            question="Divide {n} by 15 mentally.",
            answer=lambda p: F(p["q"]),
            hint="Split the divisor into five and three: divide by five first (double it and shift the digits), then divide by three.",
            shortcut="{n} " + DIV + " 5, then " + DIV + " 3.",
            explanation="{n} " + DIV + " 15 = {ans}, and {ans} x 15 = {n} confirms it.",
            mentalPattern="Factor the divisor and divide in two easy stages.",
            commonMistake="Dividing by 5 and by 3 in the wrong order, or stopping after one stage.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 15 == p["n"],
        )

    out.append(_by_fifteen("Hard", "two-stage division"))
    return out


def families():
    return extra_families()
