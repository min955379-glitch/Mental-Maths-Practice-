"""Area mental-math builder.

Master prompt section 10:
    Square: Area = side x side
    Rectangle: Area = length x width
    Triangle: Area = 1/2 x base x height
    Semicircle: Area = 1/2 x pi x r ** 2  (use pi = 22/7 where appropriate)

The four undimensioned reference questions from section 13 are excluded
per the section 13 closing-note rule (cannot determine dimensions).
"""

from fractions import Fraction


def _square_q(side, difficulty):
    area = side * side
    return {
        "question": f"Find the area of a square with side {side} m.",
        "correctAnswer": str(area),
        "acceptedAnswers": [str(area), f"{area} m2", f"{area} sq m", f"{area} square m"],
        "unit": "m2",
        "category": "Area",
        "difficulty": difficulty,
        "explanation": f"Square area = side x side = {side} x {side} = {area} m2.",
        "shortcut": f"{side}^2 = {area}.",
        "mentalPattern": "Square area is just the side squared.",
        "commonMistake": "Doubling instead of squaring (perimeter confusion).",
    }


def _rectangle_q(length, width, difficulty):
    area = length * width
    return {
        "question": f"Find the area of a rectangle {length} m x {width} m.",
        "correctAnswer": str(area),
        "acceptedAnswers": [str(area), f"{area} m2", f"{area} sq m"],
        "unit": "m2",
        "category": "Area",
        "difficulty": difficulty,
        "explanation": f"Rectangle area = length x width = {length} x {width} = {area} m2.",
        "shortcut": f"{length} x {width} = {area}.",
        "mentalPattern": "Rectangle area = length x width (two sides only).",
        "commonMistake": "Adding sides (perimeter) instead of multiplying.",
    }


def _triangle_q(base, height, difficulty):
    bh = base * height
    if bh % 2 != 0:
        return None
    area = bh // 2
    return {
        "question": f"Find the area of a triangle with base {base} m and height {height} m.",
        "correctAnswer": str(area),
        "acceptedAnswers": [str(area), f"{area} m2", f"{area} sq m"],
        "unit": "m2",
        "category": "Area",
        "difficulty": difficulty,
        "explanation": (
            f"Triangle area = 1/2 x base x height. Half the product of base and height. "
            f"{base} x {height} = {bh}; 1/2 of {bh} = {area} m2."
        ),
        "shortcut": f"1/2 x {base} x {height} = {area}.",
        "mentalPattern": "Halve the product base x height.",
        "commonMistake": "Forgetting the 1/2 factor.",
    }


def _semicircle_q(radius, difficulty):
    r = radius
    if (r * r) % 7 != 0:
        return None
    area = 11 * (r * r) // 7
    return {
        "question": f"Find the area of a semicircle with radius {r} m. (Use pi = 22/7.)",
        "correctAnswer": str(area),
        "acceptedAnswers": [str(area), f"{area} m2", f"{area} sq m"],
        "unit": "m2",
        "category": "Area",
        "difficulty": difficulty,
        "explanation": (
            f"Semicircle area = 1/2 x pi x r^2. With pi = 22/7 the half cancels, so "
            f"= 11 x r^2 / 7 = 11 x {r * r} / 7 = {area}."
        ),
        "shortcut": f"1/2 x 22/7 x {r}^2 = 11 x {r * r} / 7 = {area}.",
        "mentalPattern": "With pi = 22/7: area = (22/7 x r^2) / 2 = 11 x r^2 / 7.",
        "commonMistake": "Forgetting the 1/2 factor for a semicircle.",
    }


def build():
    seen = set()
    out = []

    # Easy: squares (small side)
    for side in range(2, 16):
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 8:
            break
        q = _square_q(side, "Easy")
        if q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Easy: rectangles (small dimensions)
    RECT_PAIRS_EASY = [(5, 6), (8, 9), (10, 12), (7, 8), (6, 9), (4, 12), (5, 12), (9, 10)]
    for length, width in RECT_PAIRS_EASY:
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 14:
            break
        q = _rectangle_q(length, width, "Easy")
        if q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: bigger squares + more rectangles
    for side in range(16, 28):
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 7:
            break
        q = _square_q(side, "Moderate")
        if q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Moderate: triangles (integer area)
    TRI_PAIRS_MOD = [(8, 9), (10, 11), (12, 13), (14, 15), (16, 9), (18, 11), (20, 13), (22, 15), (24, 17), (26, 19), (28, 21), (30, 23), (32, 25), (34, 27), (36, 29), (38, 31), (40, 33), (42, 35), (44, 37), (46, 39), (48, 41), (50, 43)]
    for base, height in TRI_PAIRS_MOD:
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
            break
        q = _triangle_q(base, height, "Moderate")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Hard: triangles with bigger values + semicircles
    TRI_PAIRS_HARD = [(30, 21), (40, 25), (50, 27), (60, 33), (70, 35)]
    for base, height in TRI_PAIRS_HARD:
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 4:
            break
        q = _triangle_q(base, height, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    SEMICIRCLES = [7, 14, 21, 28, 35, 42, 49]
    for r in SEMICIRCLES:
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
            break
        q = _semicircle_q(r, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    # Fill any remaining Easy slots with more squares (45-100)
    for side in range(45, 60):
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break
        q = _square_q(side, "Easy")
        if q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)

    return out
