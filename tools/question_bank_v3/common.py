"""Shared constants for the v3 7-category builder."""
from fractions import Fraction

CATEGORIES = [
    "Speed",
    "Percentage",
    "Dozen",
    "Area",
    "DMAS Rule",
    "Zakat (2.5%)",
    "Profit and Loss",
]
DIFFICULTIES = ["Easy", "Moderate", "Hard"]
REQUIRED_PER_CATEGORY = 50  # minimum per category

TARGETS = {  # 45 / 40 / 15 split
    "Easy": 0.45,
    "Moderate": 0.40,
    "Hard": 0.15,
}


def fmt(n):
    """Render a Fraction or int as a clean decimal string."""
    n = Fraction(n)
    if n.denominator == 1:
        return str(int(n))
    f = float(n)
    s = f"{f:.4f}".rstrip("0").rstrip(".")
    return s
