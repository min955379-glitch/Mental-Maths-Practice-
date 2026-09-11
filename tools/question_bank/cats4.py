"""Question families: Decimals, Mental Multiplication, Mental Division."""
from fractions import Fraction as F

from common import Fam, MULT, DIV, MINUS, pick, rand_int, fmt, dec


# ==================================================================== Decimals
def decimal_families():
    out = []

    def _add(diff, reason):
        def gen(rng):
            if diff == "Easy":
                a = F(rand_int(rng, 1, 40) * 5, 10)
                b = F(rand_int(rng, 1, 40) * 5, 10)
            elif diff == "Medium":
                a = F(rand_int(rng, 15, 250), 10)
                b = F(rand_int(rng, 15, 250), 10)
            else:
                a = F(rand_int(rng, 25, 480), 10)
                b = F(rand_int(rng, 25, 480), 10)
            return {"a": dec(a), "b": dec(b), "total": dec(a + b)}

        return Fam(
            category="Decimals", difficulty=diff, tags=["addition"],
            question="Add {a} and {b}.",
            answer=lambda p: "{total}",
            hint="Line up the decimal points (or add the whole parts and the decimal parts separately), then combine.",
            shortcut="Whole parts first, then the decimals - carry if the decimals cross 1.",
            explanation="Adding the whole parts and the decimal parts gives {ans}.",
            mentalPattern="With decimals, always work in hundredths or tenths so the place values line up.",
            commonMistake="Adding the digits without aligning the decimal point.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["total"],
        )

    out.append(_add("Easy", "simple decimal addition"))
    out.append(_add("Medium", "two-decimal addition with carrying"))
    out.append(_add("Hard", "larger decimals that need careful alignment"))

    def _sub(diff, reason):
        def gen(rng):
            if diff == "Easy":
                a = F(rand_int(rng, 20, 90), 10)
                b = F(rand_int(rng, 5, 19), 10)
            elif diff == "Medium":
                a = F(rand_int(rng, 100, 400), 10)
                b = F(rand_int(rng, 20, 99), 10)
            else:
                a = F(rand_int(rng, 200, 800), 10)
                b = F(rand_int(rng, 100, 199), 10)
            return {"a": dec(a), "b": dec(b), "diff": dec(a - b)}

        return Fam(
            category="Decimals", difficulty=diff, tags=["subtraction"],
            question="Subtract {b} from {a}.",
            answer=lambda p: "{diff}",
            hint="Take away the whole part first, then the decimal part - or add on from {b} up to {a} and count the gap.",
            shortcut="Counting up from {b} to {a} is often easier than subtracting.",
            explanation="{a} " + MINUS + " {b} = {ans}.",
            mentalPattern="Add-on subtraction: work out what must be added to the smaller number to reach the larger.",
            commonMistake="Mis-aligning the decimal points when borrowing.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["diff"],
        )

    out.append(_sub("Easy", "simple decimal subtraction"))
    out.append(_sub("Medium", "subtraction needing borrowing across the decimal point"))
    out.append(_sub("Hard", "larger values with borrowing"))

    def _scale(diff, reason):
        def gen(rng):
            base = F(rand_int(rng, 12, 480), 10)
            factor = pick(rng, (10, 100, 1000)) if diff != "Hard" else pick(rng, (100, 1000, 20, 300))
            return {"base": dec(base), "factor": factor, "total": dec(base * factor)}

        return Fam(
            category="Decimals", difficulty=diff, tags=["place-value"],
            question="Multiply {base} by {factor}.",
            answer=lambda p: "{total}",
            hint="Multiplying by a power of ten only moves the decimal point - count the zeros and shift the point that many places right.",
            shortcut="Shift the decimal point {zeros} places to the right.",
            explanation="{base} x {factor} = {ans} (the digits stay in the same order).",
            mentalPattern="Times ten moves every digit one place left; times a hundred moves it two.",
            commonMistake="Moving the decimal point the wrong way.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, zeros=len(str(p["factor"])) - 1))(_scale_gen(rng)),
            verify=lambda p, a: a == p["total"],
        )

    def _scale_gen(rng):
        base = F(rand_int(rng, 12, 480), 10)
        factor = pick(rng, (10, 100, 1000, 20, 300))
        return {"base": fmt(base), "factor": factor, "total": fmt(base * factor)}

    out.append(_scale("Easy", "shift the decimal point one to three places"))
    out.append(_scale("Medium", "shift with a larger starting decimal"))
    out.append(_scale("Hard", "scaling by 20 or 300, which needs two steps"))

    def _mul(diff, reason):
        def gen(rng):
            if diff == "Easy":
                a, b = F(rand_int(rng, 2, 9), 10), rand_int(rng, 2, 9)
            elif diff == "Medium":
                a, b = F(rand_int(rng, 11, 99), 10), rand_int(rng, 3, 12)
            else:
                a, b = F(rand_int(rng, 11, 99), 100), rand_int(rng, 5, 15)
            return {"a": dec(a), "b": b, "total": dec(a * b)}

        return Fam(
            category="Decimals", difficulty=diff, tags=["multiplication"],
            question="Multiply {a} by {b}.",
            answer=lambda p: "{total}",
            hint="Ignore the decimal point, multiply the whole numbers, then put the decimal point back - the answer has the same number of decimal places as {a}.",
            shortcut="Multiply as whole numbers, then shift the point back.",
            explanation="{a} x {b} = {ans}.",
            mentalPattern="Count the decimal places in the factors; the product has that many in total.",
            commonMistake="Forgetting to put the decimal point back in the product.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["total"],
        )

    out.append(_mul("Easy", "one decimal multiplied by a single digit"))
    out.append(_mul("Medium", "two-digit decimal times a two-digit number"))
    out.append(_mul("Hard", "two decimal places times a two-digit number"))

    def _div(diff, reason):
        def gen(rng):
            if diff == "Easy":
                b = F(rand_int(rng, 2, 9), 10)
                q = rand_int(rng, 2, 9)
            elif diff == "Medium":
                b = F(rand_int(rng, 2, 12), 10)
                q = rand_int(rng, 3, 15)
            else:
                b = F(rand_int(rng, 12, 45), 100)
                q = rand_int(rng, 3, 20)
            return {"b": dec(b), "q": q, "total": dec(b * q)}

        return Fam(
            category="Decimals", difficulty=diff, tags=["division"],
            question="Divide {total} by {b}.",
            answer=lambda p: F(p["q"]),
            hint="Scale both numbers by the same power of ten until the divisor is a whole number, then divide as usual.",
            shortcut="Multiply both by 10 (or 100) first, so the division becomes a whole-number one.",
            explanation="{total} " + DIV + " {b} = {ans}: scaling both sides by a power of ten turns it into a clean division.",
            mentalPattern="Dividing by a decimal: make the divisor whole first, then divide.",
            commonMistake="Moving the decimal point in only one of the two numbers.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * F(p["b"]) == F(p["total"]),
        )

    out.append(_div("Easy", "divide by a simple one-place decimal"))
    out.append(_div("Medium", "larger divisor decimal"))
    out.append(_div("Hard", "two-decimal divisor"))

    def _money(diff, reason):
        def gen(rng):
            price = F(pick(rng, (12, 15, 18, 24, 25, 35, 45, 55, 65, 75)), 10)
            qty = pick(rng, (2, 3, 4, 5, 6, 8)) if diff != "Hard" else pick(rng, (7, 9, 11, 12, 15))
            return {"price": dec(price), "qty": qty, "total": dec(price * qty),
                    "item": pick(rng, ("kg of rice", "kg of sugar", "litres of milk", "metres of cloth", "pens"))}

        return Fam(
            category="Decimals", difficulty=diff, tags=["word-problem", "money"],
            question="What is the cost of {qty} {item} at {price} rupees each?",
            answer=lambda p: "{total}",
            hint="Multiply the price by the quantity: treat the rupees and the decimal part separately, then combine.",
            shortcut="{price} x {qty} - multiply the whole rupees, then the decimal part.",
            explanation="{price} x {qty} = {ans} rupees.",
            mentalPattern="Money multiplication: split the price into rupees plus the decimal part and double-check the size of the answer.",
            commonMistake="Placing the decimal point wrongly in the total.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["total"],
        )

    out.append(_money("Easy", "one decimal price times a small quantity"))
    out.append(_money("Medium", "larger quantity"))
    out.append(_money("Hard", "awkward quantity and price"))

    def _fraction_link(diff, reason):
        def gen(rng):
            num, den = pick(rng, ((1, 2), (1, 4), (3, 4), (1, 5), (2, 5), (1, 8), (3, 8)))
            return {"num": num, "den": den, "dec": dec(F(num, den))}

        return Fam(
            category="Decimals", difficulty=diff, tags=["decimal-fraction"],
            question="Write {num}/{den} as a decimal.",
            answer=lambda p: "{dec}",
            hint="Scale the fraction to tenths, hundredths or thousandths - or divide the top by the bottom.",
            shortcut="{num}/{den} = {ans}.",
            explanation="{num} " + DIV + " {den} = {ans}.",
            mentalPattern="Benchmark fractions: halves, quarters, fifths and eighths are worth memorising as decimals.",
            commonMistake="Dividing the denominator by the numerator.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["dec"],
        )

    out.append(_fraction_link("Easy", "halves and quarters"))
    out.append(_fraction_link("Medium", "fifths and eighths"))
    out.append(_fraction_link("Hard", "less common fractions to convert"))
    return out


# ======================================================== Mental Multiplication
def multiplication_families():
    out = []

    def _by(kind, diff, reason):
        def gen(rng):
            if kind == "five":
                n = pick(rng, (12, 14, 16, 18, 22, 24, 26, 34, 46, 58))
            elif kind == "ten":
                n = pick(rng, (13, 27, 34, 45, 56, 68, 79, 83, 94))
            elif kind == "eleven":
                n = rand_int(rng, 12, 89)
            elif kind == "twentyfive":
                n = pick(rng, (8, 12, 16, 20, 24, 32, 36, 44, 48))
            elif kind == "fifty":
                n = pick(rng, (14, 18, 22, 26, 34, 42, 46, 54, 62))
            elif kind == "hundred":
                n = pick(rng, (17, 23, 38, 47, 59, 61, 72, 88, 96))
            elif kind == "nine":
                n = pick(rng, (12, 15, 18, 23, 27, 34, 41, 56, 67))
            elif kind == "fifteen":
                n = pick(rng, (8, 12, 16, 20, 24, 32, 40, 48, 60))
            elif kind == "ninetynine":
                n = pick(rng, (12, 18, 24, 35, 42, 56, 67, 78, 89))
            elif kind == "onetwentyfive":
                n = pick(rng, (8, 16, 24, 32, 40, 48, 56, 64, 72))
            elif kind == "double":
                n = pick(rng, (13, 17, 19, 23, 29, 31, 37, 41, 47))
            else:
                n = pick(rng, (12, 15, 18, 24, 36, 45, 55, 65, 75))
            return {"n": n, "k": {"five": 5, "ten": 10, "eleven": 11, "twentyfive": 25,
                                  "fifty": 50, "hundred": 100, "nine": 9, "fifteen": 15,
                                  "ninetynine": 99, "onetwentyfive": 125, "double": 4}[kind]}

        hints = {
            "five": "Times 5 is times 10 then halve it - half of {n}0.",
            "ten": "Times 10 just appends a zero.",
            "eleven": "For a two-digit number, put the sum of its digits between them (carry if the sum passes 9).",
            "twentyfive": "Times 25 is a quarter of times 100: divide {n} by 4, then add two zeros.",
            "fifty": "Times 50 is half of times 100: halve {n}, then add two zeros.",
            "hundred": "Times 100 appends two zeros.",
            "nine": "Times 9 is times 10 minus the number: {n}0 minus {n}.",
            "fifteen": "Times 15 is times 10 plus half of that.",
            "ninetynine": "Times 99 is times 100 minus the number.",
            "onetwentyfive": "Times a hundred and twenty-five is an eighth of times a thousand: divide the number by eight, then add three zeros.",
            "double": "Times 4 is double, then double again.",
        }
        patterns = {
            "five": "Halve, then times ten.",
            "ten": "Append a zero.",
            "eleven": "Two digits a and b: a, (a+b), b - carry the 1 if a+b is 10 or more.",
            "twentyfive": "Times 25 = divide by 4, then times 100.",
            "fifty": "Times 50 = halve, then times 100.",
            "hundred": "Append two zeros.",
            "nine": "Times 9 = times 10 minus the number.",
            "fifteen": "Times 15 = times 10 plus half of it.",
            "ninetynine": "Times 99 = times 100 minus the number.",
            "onetwentyfive": "Times 125 = divide by 8, then times 1000.",
            "double": "Times 4 = double twice.",
        }

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=[kind],
            question="Multiply {n} by {k} mentally.",
            answer=lambda p: F(p["n"] * p["k"]),
            hint=hints[kind] + " Work the shortcut first, then sanity-check the size of the answer.",
            shortcut=patterns[kind],
            explanation="{n} x {k} = {ans} using the shortcut: " + patterns[kind],
            mentalPattern=patterns[kind],
            commonMistake="Doing long multiplication and losing a carry - the shortcut avoids that entirely.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["n"] * p["k"],
        )

    out.append(_by("ten", "Easy", "append a zero"))
    out.append(_by("hundred", "Easy", "append two zeros"))
    out.append(_by("five", "Easy", "halve then times ten"))
    out.append(_by("double", "Easy", "double twice"))
    out.append(_by("eleven", "Medium", "digit-sum trick with a carry"))
    out.append(_by("twentyfive", "Medium", "divide by four, then times 100"))
    out.append(_by("fifty", "Medium", "halve, then times 100"))
    out.append(_by("nine", "Medium", "times ten minus the number"))
    out.append(_by("fifteen", "Medium", "times ten plus half"))
    out.append(_by("ninetynine", "Hard", "times 100 minus the number"))
    out.append(_by("onetwentyfive", "Hard", "divide by eight, then times 1000"))

    def _two_digit(diff, reason):
        def gen(rng):
            if diff == "Medium":
                a = pick(rng, (12, 15, 18, 21, 24))
                b = pick(rng, (13, 14, 16, 17, 22))
            else:
                a = pick(rng, (23, 27, 34, 38, 43, 46))
                b = pick(rng, (19, 26, 29, 37, 44, 52))
            return {"a": a, "b": b}

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=["two-digit"],
            question="Multiply {a} by {b} mentally.",
            answer=lambda p: F(p["a"] * p["b"]),
            hint="Split one factor into tens and units, multiply the two parts separately, then add - or round one factor to a near ten and correct.",
            shortcut="{a} x {b} = {a} x the tens of {b}, plus {a} x the units of {b}.",
            explanation="Breaking {b} into tens and units: {a} x {b} = {ans}.",
            mentalPattern="Distributive law: a x (b + c) = ab + ac - it turns one hard product into two easy ones.",
            commonMistake="Forgetting the second partial product or mis-adding them.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["a"] * p["b"],
        )

    out.append(_two_digit("Medium", "distributive split with small factors"))
    out.append(_two_digit("Hard", "larger two-digit factors"))

    def _square_five(diff, reason):
        def gen(rng):
            n = pick(rng, (15, 25, 35, 45, 55, 65, 75, 85, 95)) if diff != "Hard" else pick(rng, (105, 115, 125, 135, 145))
            return {"n": n}

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=["squares", "ending-in-five"],
            question="What is {n} squared?",
            answer=lambda p: F(p["n"] ** 2),
            hint="For a number ending in 5: take the digits before the 5, multiply them by one more than themselves, and put 25 on the end.",
            shortcut="({lead} x {lead1}) followed by 25.",
            explanation="{n} squared = {lead} x {lead1} with 25 appended = {ans}.",
            mentalPattern="(10a + 5) squared = 100a(a+1) + 25.",
            commonMistake="Squaring the 5 and the leading digits separately without the cross term.",
            reason=reason,
            gen=lambda rng: (lambda p: dict(p, lead=p["n"] // 10, lead1=p["n"] // 10 + 1))(_sq5_gen(rng)),
            verify=lambda p, a: a == p["n"] ** 2,
        )

    def _sq5_gen(rng):
        n = pick(rng, (15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125))
        return {"n": n}

    out.append(_square_five("Easy", "the classic ending-in-5 shortcut"))
    out.append(_square_five("Medium", "bigger numbers ending in 5"))
    out.append(_square_five("Hard", "three-digit numbers ending in 5"))

    def _near_base(diff, reason):
        def gen(rng):
            if diff == "Medium":
                a = pick(rng, (97, 98, 99, 101, 102, 103))
                b = pick(rng, (94, 96, 97, 98, 104, 105))
            else:
                a = pick(rng, (92, 94, 96, 97, 103, 106, 108))
                b = pick(rng, (91, 93, 95, 97, 104, 107, 109))
            return {"a": a, "b": b}

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=["near-base"],
            question="Multiply {a} by {b} mentally.",
            answer=lambda p: F(p["a"] * p["b"]),
            hint="Both numbers sit close to 100: use (100 plus or minus d1)(100 plus or minus d2) = 10000 plus or minus 100(d1 + d2) plus d1 x d2.",
            shortcut="Start from 10000, adjust by the sum of the differences times 100, then add the product of the differences.",
            explanation="Working from 100: {a} x {b} = {ans}.",
            mentalPattern="Near a base: (base plus a)(base plus b) = base squared + base(a + b) + ab.",
            commonMistake="Forgetting the product of the two differences.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["a"] * p["b"],
        )

    out.append(_near_base("Medium", "both factors close to 100"))
    out.append(_near_base("Hard", "factors further from 100"))

    def _three_by_one(diff, reason):
        def gen(rng):
            a = pick(rng, (112, 125, 134, 148, 156, 167, 175, 186, 194)) if diff == "Hard" else pick(rng, (102, 110, 121, 132, 143))
            b = pick(rng, (3, 4, 5, 6, 7, 8, 9))
            return {"a": a, "b": b}

        return Fam(
            category="Mental Multiplication", difficulty=diff, tags=["three-digit"],
            question="Multiply {a} by {b} mentally.",
            answer=lambda p: F(p["a"] * p["b"]),
            hint="Split the three-digit number into hundreds, tens and units, multiply each part, then add the three results.",
            shortcut="Work left to right: hundreds x {b}, then tens x {b}, then units x {b}, and add as you go.",
            explanation="{a} x {b} = {ans}.",
            mentalPattern="Left-to-right partial products are easier to hold in your head than the written column method.",
            commonMistake="Dropping a partial product or mixing up place values.",
            reason=reason, gen=gen,
            verify=lambda p, a: a == p["a"] * p["b"],
        )

    out.append(_three_by_one("Medium", "three digits split into parts"))
    out.append(_three_by_one("Hard", "larger three-digit number"))
    return out


# ============================================================= Mental Division
def division_families():
    out = []

    def _by(kind, diff, reason):
        def gen(rng):
            if kind == "five":
                q = pick(rng, (12, 16, 18, 22, 24, 26, 34, 42, 48))
                d = 5
            elif kind == "four":
                q = pick(rng, (13, 17, 21, 25, 29, 33, 41, 45, 53))
                d = 4
            elif kind == "ten":
                q = pick(rng, (12, 23, 34, 45, 56, 67, 78, 89))
                d = 10
            elif kind == "hundred":
                q = pick(rng, (7, 12, 19, 23, 34, 41, 56, 63))
                d = 100
            elif kind == "twentyfive":
                q = pick(rng, (6, 8, 12, 16, 20, 24, 32, 40))
                d = 25
            elif kind == "twenty":
                q = pick(rng, (7, 9, 12, 15, 18, 21, 25, 32))
                d = 20
            elif kind == "eight":
                q = pick(rng, (11, 13, 15, 17, 19, 21, 23, 25))
                d = 8
            elif kind == "fifty":
                q = pick(rng, (9, 11, 13, 15, 17, 19, 23, 27))
                d = 50
            elif kind == "half":
                q = pick(rng, (12, 18, 24, 30, 36, 42, 48, 54))
                d = 0.5
            elif kind == "quarter":
                q = pick(rng, (8, 12, 16, 20, 24, 28, 32, 40))
                d = 0.25
            else:
                q = pick(rng, (12, 18, 24, 36, 45))
                d = 5
            return {"q": q, "d": fmt(F(str(d))), "n": fmt(F(str(d)) * q)}

        hints = {
            "five": "Dividing by 5 is doubling, then dividing by 10.",
            "four": "Dividing by 4 is halving, then halving again.",
            "ten": "Dividing by 10 just moves the decimal point one place left.",
            "hundred": "Dividing by 100 moves the decimal point two places left.",
            "twentyfive": "Dividing by 25 is multiplying by 4, then dividing by 100.",
            "twenty": "Dividing by 20 is halving, then dividing by 10.",
            "eight": "Dividing by 8 is halving three times.",
            "fifty": "Dividing by 50 is doubling, then dividing by 100.",
            "half": "Dividing by a half is the same as multiplying by 2.",
            "quarter": "Dividing by a quarter is the same as multiplying by 4.",
        }
        patterns = {
            "five": "Divide by 5: double it, then divide by 10.",
            "four": "Divide by 4: halve, then halve again.",
            "ten": "Divide by 10: shift the decimal point one place.",
            "hundred": "Divide by 100: shift the decimal point two places.",
            "twentyfive": "Divide by 25: times 4, then divide by 100.",
            "twenty": "Divide by 20: halve, then divide by 10.",
            "eight": "Divide by 8: halve three times.",
            "fifty": "Divide by 50: double, then divide by 100.",
            "half": "Divide by 1/2: multiply by 2.",
            "quarter": "Divide by 1/4: multiply by 4.",
        }

        return Fam(
            category="Mental Division", difficulty=diff, tags=[kind],
            question="Divide {n} by {d} mentally.",
            answer=lambda p: F(p["q"]),
            hint=hints[kind] + " Estimate the size of the answer first so you know roughly what to expect.",
            shortcut=patterns[kind],
            explanation="{n} " + DIV + " {d} = {ans}, because " + patterns[kind].lower(),
            mentalPattern=patterns[kind],
            commonMistake="Dividing the wrong way round (the larger number must be divided by the smaller).",
            reason=reason, gen=gen,
            verify=lambda p, a: a * F(p["d"]) == F(p["n"]),
        )

    out.append(_by("ten", "Easy", "shift the decimal point"))
    out.append(_by("hundred", "Easy", "shift the decimal point two places"))
    out.append(_by("five", "Easy", "double then divide by ten"))
    out.append(_by("four", "Easy", "halve twice"))
    out.append(_by("twenty", "Medium", "halve then divide by ten"))
    out.append(_by("twentyfive", "Medium", "times four then divide by 100"))
    out.append(_by("eight", "Medium", "halve three times"))
    out.append(_by("fifty", "Medium", "double then divide by 100"))
    out.append(_by("half", "Hard", "dividing by a fraction"))
    out.append(_by("quarter", "Hard", "dividing by a quarter"))

    def _exact(diff, reason):
        def gen(rng):
            d = pick(rng, (3, 4, 6, 7, 8, 9))
            q = pick(rng, (12, 15, 18, 21, 24, 27, 32, 36)) if diff != "Hard" else pick(rng, (38, 43, 47, 52, 58, 64))
            return {"d": d, "q": q, "n": d * q}

        return Fam(
            category="Mental Division", difficulty=diff, tags=["exact-division"],
            question="Divide {n} by {d} exactly.",
            answer=lambda p: F(p["q"]),
            hint="Build the answer up: how many times does {d} go into the first part of {n}, then the rest? Check by multiplying back.",
            shortcut="Chunk it: take out an easy multiple of {d} first, then deal with the remainder.",
            explanation="{n} " + DIV + " {d} = {ans}, and {ans} x {d} = {n} confirms it.",
            mentalPattern="Chunking with multiples of the divisor is faster and safer than short division.",
            commonMistake="Forgetting a zero in the quotient when the divisor does not go into a digit.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["d"] == p["n"],
        )

    out.append(_exact("Easy", "small exact division"))
    out.append(_exact("Medium", "two-digit quotient"))
    out.append(_exact("Hard", "larger quotient to build up"))

    def _remainder(diff, reason):
        def gen(rng):
            d = pick(rng, (3, 4, 5, 6, 7, 8, 9))
            q = pick(rng, (11, 13, 17, 19, 23, 29, 31))
            r = rand_int(rng, 1, d - 1)
            return {"d": d, "q": q, "r": r, "n": d * q + r}

        return Fam(
            category="Mental Division", difficulty=diff, tags=["remainder"],
            question="What is the remainder when {n} is divided by {d}?",
            answer=lambda p: F(p["r"]),
            hint="Find the largest multiple of {d} that is not bigger than {n} - the gap left over is the remainder.",
            shortcut="Take out as many {d}s as you can; whatever is left under {d} is the answer.",
            explanation="{d} x a whole number gets you as close as possible to {n}; the leftover is {ans}.",
            mentalPattern="Remainder = dividend minus (divisor x integer quotient).",
            commonMistake="Giving the quotient instead of the remainder, or a remainder bigger than the divisor.",
            reason=reason, gen=gen,
            verify=lambda p, a: (p["n"] - a) % p["d"] == 0 and a < p["d"],
        )

    out.append(_remainder("Medium", "find the leftover after chunking"))
    out.append(_remainder("Hard", "larger numbers with an awkward divisor"))

    def _word(diff, reason):
        def gen(rng):
            each = pick(rng, (3, 4, 5, 6, 8, 10, 12))
            groups = pick(rng, (12, 15, 20, 24, 25, 30, 35, 40))
            total = each * groups          # exact by construction
            return {"total": total, "each": each, "groups": groups,
                    "thing": pick(rng, ("students", "books", "apples", "chairs", "boxes"))}

        return Fam(
            category="Mental Division", difficulty=diff, tags=["word-problem"],
            question="{total} {thing} are shared equally into groups of {each}. How many groups are there?",
            answer=lambda p: F(p["groups"]),
            hint="How many times does the group size go into the total? Take out an easy multiple of the group size first, then keep going with what is left.",
            shortcut="{total} " + DIV + " {each} - chunk it rather than doing long division.",
            explanation="{total} " + DIV + " {each} = {ans} groups.",
            mentalPattern="Sharing means dividing; chunk with convenient multiples of the group size.",
            commonMistake="Multiplying instead of dividing.",
            reason=reason, gen=gen,
            verify=lambda p, a: a * p["each"] == p["total"],
        )

    out.append(_word("Easy", "friendly sharing problem"))
    out.append(_word("Medium", "larger total to share"))
    out.append(_word("Hard", "awkward group size"))
    return out


def families():
    return decimal_families() + multiplication_families() + division_families()
