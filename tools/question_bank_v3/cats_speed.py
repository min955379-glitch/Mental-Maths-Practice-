"""Speed mental-math builder.

Master prompt section 8:
    Distance from speed (km/h) and time (in minutes).

Reference questions to preserve verbatim (master prompt section 13):
    1. 900 km/h x 15 min, x 17 min, x 23 min, x 24 min, x 25 min,
       x 35 min, x 40 min, x 45 min, x 50 min
    2. 90 km/h x 35 min -> 52.5 km  (non-integer, kept verbatim)
"""

from fractions import Fraction

SPEEDS_EASY = [40, 45, 50, 54, 60, 72, 80, 90, 100, 120]
MINUTES_EASY = [5, 10, 12, 15, 20, 25, 30, 40, 45, 60]

# 900 km/h reference questions (master prompt section 13)
REFERENCE_DISTANCE = [
    (900, 15),
    (900, 17),
    (900, 23),
    (900, 24),
    (900, 25),
    (900, 35),
    (900, 40),
    (900, 45),
    (900, 50),
    (90, 35),   # 90 km/h x 35 min -> 52.5 km (non-integer, kept)
]


def _format_number(n):
    n = Fraction(n)
    if n.denominator == 1:
        return str(int(n))
    f = float(n)
    s = f"{f:.4f}".rstrip("0").rstrip(".")
    return s


def _distance_q(speed, minutes, difficulty):
    distance = Fraction(speed * minutes, 60)
    return {
        "question": f"A vehicle travels at {speed} km/h. How many kilometres does it cover in {minutes} minutes?",
        "correctAnswer": _format_number(distance),
        "acceptedAnswers": [_format_number(distance), _format_number(distance) + " km", _format_number(distance) + "km"],
        "unit": "km",
        "category": "Speed",
        "difficulty": difficulty,
        "explanation": (
            f"Distance = Speed x Time. {minutes} minutes = {minutes}/60 = "
            f"{Fraction(minutes, 60)} hour. Distance = {speed} x "
            f"{Fraction(minutes, 60)} = {_format_number(distance)} km."
        ),
        "shortcut": (
            f"Convert {minutes} minutes to {Fraction(minutes, 60)} of an hour, "
            f"then multiply by {speed}: {_format_number(distance)} km."
        ),
        "mentalPattern": (
            "Always convert minutes to a fraction of an hour first (divide by 60). "
            "Pick the speed and time so the calculation stays in your head."
        ),
        "commonMistake": (
            "Multiplying speed by minutes directly (without dividing minutes by 60), "
            "which gives an answer in km-minutes rather than km."
        ),
    }


def _time_q(distance, speed, difficulty):
    if distance % speed != 0:
        return None
    hours = distance // speed
    return {
        "question": f"At {speed} km/h, how many hours does it take to travel {distance} km?",
        "correctAnswer": str(hours),
        "acceptedAnswers": [str(hours), f"{hours} hours", f"{hours}h", f"{hours} hr", str(hours)],
        "unit": "hours",
        "category": "Speed",
        "difficulty": difficulty,
        "explanation": f"Time = Distance / Speed = {distance} / {speed} = {hours} hours.",
        "shortcut": f"{distance} / {speed} = {hours}.",
        "mentalPattern": "Time = Distance / Speed. The result is in hours.",
        "commonMistake": "Multiplying speed by distance instead of dividing.",
    }


def _find_speed_q(distance, hours, difficulty):
    if distance % hours != 0:
        return None
    speed = distance // hours
    return {
        "question": f"A vehicle covers {distance} km in {hours} hours. What is its speed in km/h?",
        "correctAnswer": str(speed),
        "acceptedAnswers": [str(speed), f"{speed} km/h", f"{speed} km per hour"],
        "unit": "km/h",
        "category": "Speed",
        "difficulty": difficulty,
        "explanation": f"Speed = Distance / Time = {distance} / {hours} = {speed} km/h.",
        "shortcut": f"{distance} / {hours} = {speed}.",
        "mentalPattern": "Speed = Distance / Time. Get the time into hours first.",
        "commonMistake": "Multiplying distance by time instead of dividing.",
    }


def build():
    """Generate the Speed question bank (>= 50 questions)."""
    seen = set()
    out = []

    # 10 reference questions (section 13) -- Easy
    for speed, minutes in REFERENCE_DISTANCE:
        q = _distance_q(speed, minutes, "Easy")
        if q["question"] in seen:
            continue
        seen.add(q["question"])
        out.append(q)

    # Easy: speed x minutes distance
    for speed in SPEEDS_EASY:
        for minutes in MINUTES_EASY:
            if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
                break
            distance = Fraction(speed * minutes, 60)
            if distance.denominator > 12:
                continue  # skip awkward fractions for Easy
            q = _distance_q(speed, minutes, "Easy")
            if q["question"] in seen:
                continue
            seen.add(q["question"])
            out.append(q)
        if len([q for q in out if q["difficulty"] == "Easy"]) >= 22:
            break

    # Moderate: harder minute values that produce clean integer distances
    MOD_MINUTES = [3, 4, 6, 8, 9, 16, 24, 36, 48]
    MOD_SPEEDS = [60, 90, 120, 150, 180, 240, 300, 360, 420, 480, 600]
    for speed in MOD_SPEEDS:
        for minutes in MOD_MINUTES:
            if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
                break
            distance = Fraction(speed * minutes, 60)
            if distance.denominator != 1:
                continue
            q = _distance_q(speed, minutes, "Moderate")
            if q["question"] in seen:
                continue
            seen.add(q["question"])
            out.append(q)
        if len([q for q in out if q["difficulty"] == "Moderate"]) >= 20:
            break

    # Hard: reverse -- "find time" or "find speed" problems
    PAIRS = [
        (240, 60), (300, 60), (480, 60), (180, 45), (240, 30),
        (360, 45), (240, 20), (300, 30), (450, 60), (900, 60),
    ]
    for d, s in PAIRS:
        q = _time_q(d, s, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 4:
            break

    SPEED_HOURS = [
        (120, 2), (180, 3), (300, 5), (450, 9), (240, 4), (360, 6),
    ]
    for d, h in SPEED_HOURS:
        q = _find_speed_q(d, h, "Hard")
        if q and q["question"] not in seen:
            seen.add(q["question"])
            out.append(q)
        if len([q for q in out if q["difficulty"] == "Hard"]) >= 8:
            break

    return out
