"""Question families: Number Patterns, Mixed Mental Math."""
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt, dec


# ============================================================= Number Patterns
def pattern_families():
    out = []

    def _arith(diffs, diff, reason):
        def gen(rng):
            d = pick(rng, diffs)
            start = pick(rng, (1, 2, 3, 4, 5, 7, 10, 12))
            terms = [start + d * i for i in range(5)]
            return {"terms": ", ".join(str(t) for t in terms), "nxt": terms[-1] + d, "d": d}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["arithmetic-sequence"],
            question="What is the next number in this sequence? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="Find the gap between consecutive terms: subtract any term from the one after it. If that gap is constant, add it to the last term.",
            shortcut="The gap is constant, so add {d} to the final term.",
            explanation="Each term adds {d}, so the next term is {ans}.",
            mentalPattern="An arithmetic sequence has a constant difference: next = last + d.",
            commonMistake="Assuming a multiplying rule when the sequence is really adding a fixed step.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_arith((2, 3, 5, 10), "Easy", "constant step, easy to spot"))
    out.append(_arith((7, 9, 11, 12, 15), "Medium", "larger constant step"))
    out.append(_arith((13, 17, 19, 23, 25), "Hard", "large step that needs careful addition"))

    def _multiples(diff, reason):
        def gen(rng):
            k = pick(rng, (3, 4, 6, 7, 8, 9, 11, 12))
            start = pick(rng, (1, 2, 3, 4, 5))
            terms = [k * (start + i) for i in range(5)]
            return {"terms": ", ".join(str(t) for t in terms), "nxt": terms[-1] + k, "k": k}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["multiples"],
            question="What comes next? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="Check whether every term is a multiple of the same number - if so, that number is the step.",
            shortcut="These are multiples of {k}: add {k} again.",
            explanation="Every term is a multiple of {k} with the multiplier rising by one, so the next term is {ans}.",
            mentalPattern="Spot the times table: a constant step means the terms are multiples of that step.",
            commonMistake="Trying to find a multiplying rule for what is really a times table.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_multiples("Easy", "a familiar times table"))
    out.append(_multiples("Medium", "less familiar table"))

    def _squares(diff, reason):
        def gen(rng):
            start = pick(rng, (1, 2, 3, 4, 5, 6))
            terms = [(start + i) ** 2 for i in range(5)]
            return {"terms": ", ".join(str(t) for t in terms), "nxt": (start + 5) ** 2}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["squares"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="The gaps between terms grow steadily, which is the sign of a squaring pattern - try writing each term as something squared.",
            shortcut="The terms are consecutive squares: n squared, (n+1) squared, and so on.",
            explanation="Each term is a perfect square of consecutive integers, so the next is {ans}.",
            mentalPattern="Second differences that are constant (here 2) mean a quadratic, usually squares.",
            commonMistake="Extending the last gap linearly and ignoring the growing differences.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_squares("Easy", "the classic square sequence"))
    out.append(_squares("Medium", "squares starting further along"))
    out.append(_squares("Hard", "larger squares to continue"))

    def _geometric(ratios, diff, reason):
        def gen(rng):
            r = pick(rng, ratios)
            start = pick(rng, (1, 2, 3, 5))
            terms = [start * r ** i for i in range(5)]
            return {"terms": ", ".join(str(t) for t in terms), "nxt": terms[-1] * r, "r": r}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["geometric"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="Try DIVIDING a term by the one before it. If the ratio is always the same, the rule is multiply, not add.",
            shortcut="Each term is multiplied by {r}, so multiply the last term by {r}.",
            explanation="The ratio between consecutive terms is {r}, so the next term is {ans}.",
            mentalPattern="A constant RATIO (not a constant difference) means a geometric sequence.",
            commonMistake="Adding a difference when the rule is multiplication.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_geometric((2, 3), "Easy", "simple doubling or tripling"))
    out.append(_geometric((2, 3, 4), "Medium", "check the ratio rather than the difference"))
    out.append(_geometric((2, 3, 5), "Hard", "large numbers from repeated multiplication"))

    def _rising_diff(diff, reason):
        def gen(rng):
            start = pick(rng, (1, 2, 3, 4, 5))
            step0 = pick(rng, (1, 2, 3))
            terms, d = [start], step0
            for _ in range(4):
                terms.append(terms[-1] + d)
                d += 1
            return {"terms": ", ".join(str(t) for t in terms), "nxt": terms[-1] + d, "d": d}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["second-difference"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="The gaps are NOT constant here - work out the gaps, then look at how the gaps themselves are changing.",
            shortcut="The gaps increase by one each time, so add {d} to the last term.",
            explanation="The differences rise by one each step, so the next difference is {d} and the next term is {ans}.",
            mentalPattern="When the first differences are not constant, difference them again: a constant second difference means the gaps grow steadily.",
            commonMistake="Repeating the last difference instead of letting it grow.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_rising_diff("Medium", "the gap grows by one each step"))
    out.append(_rising_diff("Hard", "bigger starting gap that grows"))

    def _fib(diff, reason):
        def gen(rng):
            a = pick(rng, (1, 2, 3))
            b = pick(rng, (2, 3, 4, 5))
            terms = [a, b]
            for _ in range(4):
                terms.append(terms[-1] + terms[-2])
            return {"terms": ", ".join(str(t) for t in terms), "nxt": terms[-1] + terms[-2]}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["fibonacci"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="No constant gap and no constant ratio here - try adding two neighbouring terms together and see what you get.",
            shortcut="Each term is the sum of the two before it.",
            explanation="Every term after the first two equals the sum of the previous two, so the next term is {ans}.",
            mentalPattern="Fibonacci style: term(n) = term(n-1) + term(n-2).",
            commonMistake="Looking for a single multiplier when two previous terms are involved.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_fib("Medium", "sum of the two previous terms"))
    out.append(_fib("Hard", "larger Fibonacci-style terms"))

    def _rule(diff, reason):
        def gen(rng):
            k = pick(rng, (2, 3))
            add = pick(rng, (1, 2, 3))
            start = pick(rng, (1, 2, 3, 4))
            terms = [start]
            for _ in range(4):
                terms.append(terms[-1] * k + add)
            return {"terms": ", ".join(str(t) for t in terms), "nxt": terms[-1] * k + add,
                    "k": k, "add": add}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["two-step-rule"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="Each term is made by doing TWO things to the one before it: multiply by {k} and then add {add}. Check that on the first pair.",
            shortcut="Next = (previous x {k}) + {add}.",
            explanation="Applying (x {k}, then + {add}) to the last term gives {ans}.",
            mentalPattern="Two-step rules: 'times k plus c'. Verify the rule on two different pairs of terms before trusting it.",
            commonMistake="Spotting only the multiplication and forgetting the addition.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_rule("Medium", "multiply then add"))
    out.append(_rule("Hard", "larger multiplier and addend"))

    def _interleaved(diff, reason):
        def gen(rng):
            a0 = pick(rng, (2, 3, 4, 5))
            d = pick(rng, (2, 3, 4))
            b0 = pick(rng, (10, 20, 30))
            r = pick(rng, (2, 3))
            seq = []
            for i in range(3):
                seq.append(a0 + d * i)
                seq.append(b0 * r ** i)
            seq.append(a0 + d * 3)          # seven terms: the odd positions lead again
            return {"terms": ", ".join(str(t) for t in seq), "nxt": b0 * r ** 3}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["interleaved"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="One single rule will not fit here. Look at the 1st, 3rd and 5th terms on their own, then the 2nd, 4th and 6th - there are two sequences woven together.",
            shortcut="Alternate terms form their own sequence; continue the odd-position one.",
            explanation="The odd-position terms form their own sequence, and continuing it gives {ans}.",
            mentalPattern="Interleaved sequences: split into the odd positions and the even positions and treat each separately.",
            commonMistake="Forcing one rule across all the terms.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_interleaved("Hard", "two woven sequences to separate"))

    def _primes(diff, reason):
        def gen(rng):
            start = pick(rng, (0, 1, 2, 3))
            primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71]
            terms = primes[start:start + 5]
            return {"terms": ", ".join(str(t) for t in terms), "nxt": primes[start + 5]}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["primes"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="The gaps look irregular - that is the clue. Check whether each number has exactly two factors (itself and one).",
            shortcut="These are prime numbers in order: take the next prime.",
            explanation="Each term is the next prime number, so the sequence continues with {ans}.",
            mentalPattern="Primes have no factors other than 1 and themselves; irregular gaps are the giveaway.",
            commonMistake="Looking for a neat arithmetic or geometric rule, which primes do not have.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_primes("Easy", "small primes"))
    out.append(_primes("Medium", "primes further along the list"))
    out.append(_primes("Hard", "larger primes to continue"))

    def _cubes(diff, reason):
        def gen(rng):
            start = pick(rng, (1, 2, 3))
            terms = [(start + i) ** 3 for i in range(4)]
            return {"terms": ", ".join(str(t) for t in terms), "nxt": (start + 4) ** 3}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["cubes"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="Both the gaps and the gaps-between-gaps are growing fast, which points to cubes rather than squares.",
            shortcut="The terms are consecutive cubes: 1 cubed, 2 cubed, 3 cubed, and so on.",
            explanation="Each term is a cube of consecutive integers, so the next is {ans}.",
            mentalPattern="Cubes grow faster than squares: check n cubed when the terms explode in size.",
            commonMistake="Confusing cubes with squares.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_cubes("Medium", "recognisable cubes"))
    out.append(_cubes("Hard", "larger cubes"))

    def _triangular(diff, reason):
        def gen(rng):
            start = pick(rng, (2, 3, 4, 5))
            terms = [F((start + i) * (start + i + 1), 2) for i in range(4)]
            nxt = F((start + 4) * (start + 5), 2)
            return {"terms": ", ".join(fmt(t) for t in terms), "nxt": int(nxt)}

        return Fam(
            category="Number Patterns", difficulty=diff, tags=["triangular"],
            question="What is the next number? {terms}, ...",
            answer=lambda p: F(p["nxt"]),
            hint="The gaps here increase by exactly one each time (2, 3, 4, ...). These are the triangular numbers - keep adding the next integer.",
            shortcut="Add the next integer to the last term.",
            explanation="Each term adds the next whole number, so the next term is {ans}.",
            mentalPattern="Triangular numbers: 1, 3, 6, 10, 15 - term n = n(n+1)/2.",
            commonMistake="Treating it as a plain arithmetic sequence.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["nxt"],
        )

    out.append(_triangular("Medium", "gaps grow by one"))
    out.append(_triangular("Hard", "triangular numbers further along"))
    return out


# ============================================================ Mixed Mental Math
def mixed_families():
    out = []

    def _percent_then_add(diff, reason):
        def gen(rng):
            n = pick(rng, (80, 120, 150, 200, 240, 300))
            p = pick(rng, (10, 20, 25, 50)) if diff != "Hard" else pick(rng, (15, 30, 40, 60))
            add = pick(rng, (5, 8, 12, 15, 20))
            return {"n": n, "p": p, "add": add}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["percent-plus"],
            question="Work out {p}% of {n} and then add {add}.",
            answer=lambda p: F(p["n"] * p["p"], 100) + p["add"],
            hint="Do it in two clear steps: the percentage first, then add the extra amount.",
            shortcut="({p}% of {n}) + {add}.",
            explanation="{p}% of {n} plus {add} = {ans}.",
            mentalPattern="Break a two-part problem into two single-step calculations.",
            commonMistake="Adding {add} before taking the percentage.",
            reason=reason, gen=gen,
            verify=lambda p, a: a - p["add"] == F(p["n"] * p["p"], 100),
        )

    out.append(_percent_then_add("Easy", "benchmark percentage then a small addition"))
    out.append(_percent_then_add("Medium", "chunked percentage then addition"))
    out.append(_percent_then_add("Hard", "awkward percentage then addition"))

    def _fraction_then_multiply(diff, reason):
        def gen(rng):
            num, den = pick(rng, ((1, 2), (1, 3), (2, 3), (1, 4), (3, 4), (2, 5)))
            base = den * pick(rng, (6, 8, 10, 12, 15))
            k = pick(rng, (3, 4, 5, 6)) if diff != "Hard" else pick(rng, (7, 8, 9, 12))
            return {"num": num, "den": den, "base": base, "k": k}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["fraction-then-scale"],
            question="Find {num}/{den} of {base}, then multiply the result by {k}.",
            answer=lambda p: F(p["base"] * p["num"] * p["k"], p["den"]),
            hint="Divide by the bottom of the fraction first, then multiply by the top, and only then by {k}.",
            shortcut="({base} " + DIV + " {den}) x {num} x {k}.",
            explanation="{num}/{den} of {base}, then x {k}, gives {ans}.",
            mentalPattern="Dividing before multiplying keeps the numbers small enough to hold in your head.",
            commonMistake="Multiplying everything first and then dividing, which makes the numbers blow up.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["den"] == p["base"] * p["num"] * p["k"],
        )

    out.append(_fraction_then_multiply("Easy", "small fraction then a small multiplier"))
    out.append(_fraction_then_multiply("Medium", "larger base"))
    out.append(_fraction_then_multiply("Hard", "awkward multiplier"))

    def _speed_time_convert(diff, reason):
        def gen(rng):
            v = pick(rng, (30, 40, 45, 60, 72, 80, 90))
            hours = F(pick(rng, (1, 3)), pick(rng, (1, 2, 4)))
            return {"v": v, "hours": dec(hours), "dist": fmt(F(v) * hours)}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["speed-time-conversion"],
            question="A car travels at {v} km/h for {hours} hours. How far does it go, in km?",
            answer=lambda p: F(p["v"]) * F(p["hours"]),
            hint="Distance = speed x time. With a fractional number of hours, work out the distance for one hour and scale it.",
            shortcut="{v} x {hours} = {v} plus the fraction of {v}.",
            explanation="Distance = {v} x {hours} = {ans} km.",
            mentalPattern="Distance = speed x time; fractional times are just scaling.",
            commonMistake="Dividing instead of multiplying, or mishandling the fraction of an hour.",
            reason=reason, gen=gen, unit="km",
            verify=lambda p, a: a == F(p["v"]) * F(p["hours"]),
        )

    out.append(_speed_time_convert("Easy", "whole hours"))
    out.append(_speed_time_convert("Medium", "half or quarter hours"))
    out.append(_speed_time_convert("Hard", "awkward speeds and fractional hours"))

    def _average_then_scale(diff, reason):
        def gen(rng):
            a = pick(rng, (12, 15, 18, 20, 24, 30))
            b = pick(rng, (20, 26, 32, 36, 40, 44))
            k = pick(rng, (3, 4, 5, 10)) if diff != "Hard" else pick(rng, (7, 8, 12, 15))
            return {"a": a, "b": b, "k": k}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["average-then-scale"],
            question="Find the average of {a} and {b}, then multiply it by {k}.",
            answer=lambda p: F(p["a"] + p["b"], 2) * p["k"],
            hint="The average of two numbers is halfway between them. Find that first, then multiply.",
            shortcut="({a} + {b}) " + DIV + " 2, then x {k}.",
            explanation="The average is halfway between {a} and {b}, and multiplying by {k} gives {ans}.",
            mentalPattern="Average of two numbers = their midpoint = total / 2.",
            commonMistake="Multiplying first and averaging afterwards (same result here, but far bigger numbers).",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 2 == (p["a"] + p["b"]) * p["k"],
        )

    out.append(_average_then_scale("Easy", "simple midpoint then scale"))
    out.append(_average_then_scale("Medium", "larger numbers"))
    out.append(_average_then_scale("Hard", "awkward scale factor"))

    def _percent_chain(diff, reason):
        def gen(rng):
            n = pick(rng, (200, 400, 500, 600, 800))
            p1 = pick(rng, (10, 20, 25, 50))
            p2 = pick(rng, (10, 20, 25, 50))
            return {"n": n, "p1": p1, "p2": p2}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["percent-chain"],
            question="Increase {n} by {p1}%, then decrease the result by {p2}%. What is the final value?",
            answer=lambda p: F(p["n"] * (100 + p["p1"]) * (100 - p["p2"]), 10000),
            hint="Work step by step: the second percentage applies to the NEW value, not the original - the two changes never cancel to zero.",
            shortcut="Multiply by (100 + {p1})/100, then by (100 " + MINUS + " {p2})/100.",
            explanation="{n} x (100 + {p1})/100 x (100 " + MINUS + " {p2})/100 = {ans}.",
            mentalPattern="Chained percentage changes multiply; a rise of x% then a fall of x% always ends lower.",
            commonMistake="Adding and subtracting the percentages on the original value.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 10000 == p["n"] * (100 + p["p1"]) * (100 - p["p2"]),
        )

    out.append(_percent_chain("Medium", "two chained percentage changes"))
    out.append(_percent_chain("Hard", "chained changes that do not come out round"))

    def _two_step_word(diff, reason):
        def gen(rng):
            price = pick(rng, (200, 250, 300, 400, 500))
            qty = pick(rng, (3, 4, 5, 6))
            disc = pick(rng, (10, 20, 25))
            return {"price": price, "qty": qty, "disc": disc}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["word-problem"],
            question="A shop buys {qty} items at {price} rupees each, then sells the whole lot at a {disc}% loss. What is the selling price?",
            answer=lambda p: F(p["price"] * p["qty"] * (100 - p["disc"]), 100),
            hint="First find the total COST (price x quantity), then apply the loss percentage to that total.",
            shortcut="Cost = {price} x {qty}; selling price = cost x (100 " + MINUS + " {disc})/100.",
            explanation="Total cost is {price} x {qty}, and a {disc}% loss on that gives {ans} rupees.",
            mentalPattern="Split it: total first, then the percentage of that total.",
            commonMistake="Applying the percentage to one item instead of the whole lot.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * 100 == p["price"] * p["qty"] * (100 - p["disc"]),
        )

    out.append(_two_step_word("Easy", "small total then a benchmark loss"))
    out.append(_two_step_word("Medium", "larger total"))
    out.append(_two_step_word("Hard", "awkward total and percentage"))

    def _ratio_percent(diff, reason):
        def gen(rng):
            a, b = pick(rng, ((2, 3), (3, 5), (1, 4), (3, 7)))
            unit = pick(rng, (4, 5, 8, 10))
            total = (a + b) * unit
            return {"a": a, "b": b, "total": total}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["ratio-to-percent"],
            question="An amount of {total} rupees is split in the ratio {a} : {b}. What percentage does the first share represent?",
            answer=lambda p: F(p["a"] * 100, p["a"] + p["b"]),
            hint="The first share is {a} parts out of a total of (a + b) parts - turn that fraction into a percentage. The actual amount of money is not needed.",
            shortcut="{a} / ({a} + {b}) x 100.",
            explanation="The first share is {a} out of {a} + {b} parts, which is {ans}% of the whole.",
            mentalPattern="Ratio to percentage: parts / total parts x 100 - the money value cancels out.",
            commonMistake="Using the rupee amount in the fraction instead of the ratio parts.",
            reason=reason, gen=gen, unit="%",
            verify=lambda p, a: a * (p["a"] + p["b"]) == p["a"] * 100,
        )

    out.append(_ratio_percent("Medium", "convert ratio parts to a percentage"))
    out.append(_ratio_percent("Hard", "awkward parts-to-percentage conversion"))

    def _time_speed_mix(diff, reason):
        def gen(rng):
            dist = pick(rng, (120, 180, 240, 300, 360))
            v = pick(rng, (30, 40, 45, 60))
            return {"dist": dist, "v": v, "hours": fmt(F(dist, v))}

        return Fam(
            category="Mixed Mental Math", difficulty=diff, tags=["speed-time-minutes"],
            question="A journey of {dist} km is covered at {v} km/h. How many MINUTES does it take?",
            answer=lambda p: F(p["dist"] * 60, p["v"]),
            hint="Time = distance " + DIV + " speed gives HOURS. Multiply by 60 at the end to convert to minutes.",
            shortcut="{dist} " + DIV + " {v} hours, then x 60.",
            explanation="Time = {dist} / {v} hours, and x 60 gives {ans} minutes.",
            mentalPattern="Always check the units the question asks for before finishing.",
            commonMistake="Giving the answer in hours when minutes were asked for.",
            reason=reason, gen=gen, unit="minutes",
            verify=lambda p, a: a * p["v"] == p["dist"] * 60,
        )

    out.append(_time_speed_mix("Easy", "clean hours to minutes"))
    out.append(_time_speed_mix("Medium", "fractional hours to convert"))
    out.append(_time_speed_mix("Hard", "awkward conversion"))
    return out


def families():
    return pattern_families() + mixed_families()
