/**
 * Answer normalization and validation.
 * Supports: numbers, decimals, percentages, fractions, time, and units.
 */

export interface NormalizationResult {
  isCorrect: boolean;
  reason?: string;
}

// Parse a fraction string like "7/8" or "2/4" to a number
function parseFraction(input: string): number | null {
  const m = input.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const den = parseInt(m[2], 10);
  if (den === 0) return null;
  return num / den;
}

// Parse time string like "12:00 PM", "12 PM", "12:00pm"
function parseTime(input: string): number | null {
  const t = input.trim().toLowerCase().replace(/\s+/g, " ");
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3];
  if (h < 0 || h > 24 || min < 0 || min >= 60) return null;
  if (meridiem) {
    if (meridiem === "am" && h === 12) h = 0;
    if (meridiem === "pm" && h !== 12) h += 12;
  }
  return h * 60 + min;
}

// Strip a unit suffix (km, m, m/s, km/h, L, cm, %, years, hrs, etc.)
function stripUnit(input: string, expectedUnit?: string | null): string {
  let s = input.trim();
  // Remove common units if they match the expected
  const units = [
    "km/h", "kmh", "m/s", "ms", "km", "meters", "meter", "metres", "metre",
    "liters", "liter", "litres", "litre", "lit", "l", "cm", "mm", "kg", "g",
    "seconds", "second", "sec", "secs", "s", "minutes", "minute", "min", "mins",
    "hours", "hour", "hr", "hrs", "h", "years", "year", "yrs", "yr", "y",
    "apples", "mangoes", "eggs", "pens", "notebooks", "books",
    "kmph",
  ];
  // Sort by length desc to match longer first
  units.sort((a, b) => b.length - a.length);
  for (const u of units) {
    const re = new RegExp(`\\s*${u.replace("/", "\\/")}\\.?$`, "i");
    s = s.replace(re, "");
  }
  // Remove trailing % if expected unit is %
  if (expectedUnit === "%") {
    s = s.replace(/%$/, "").trim();
  }
  return s.trim();
}

// Convert "0.5" and ".5" etc. to number
function toNumber(s: string): number | null {
  if (s === "" || s === "-" || s === "+") return null;
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  return null;
}

/**
 * Compare two answers allowing for various forms.
 */
export function isAnswerCorrect(
  userInput: string,
  correctAnswer: string,
  acceptedAnswersJson: string,
  expectedUnit?: string | null
): NormalizationResult {
  if (!userInput || !userInput.trim()) {
    return { isCorrect: false, reason: "Empty answer" };
  }

  // Build a list of accepted raw forms
  let acceptedForms: string[] = [];
  try {
    acceptedForms = JSON.parse(acceptedAnswersJson);
  } catch {
    acceptedForms = [correctAnswer];
  }
  if (!acceptedForms.includes(correctAnswer)) acceptedForms.push(correctAnswer);

  const userTrim = userInput.trim();
  const userNorm = userTrim.toLowerCase().replace(/\s+/g, " ");

  // 1) Exact match (case-insensitive, whitespace-normalized)
  for (const form of acceptedForms) {
    const formNorm = form.trim().toLowerCase().replace(/\s+/g, " ");
    if (userNorm === formNorm) return { isCorrect: true };
  }

  // 2) Strip user input unit and compare
  const userStripped = stripUnit(userTrim, expectedUnit);
  for (const form of acceptedForms) {
    const formStripped = stripUnit(form, expectedUnit);
    if (userStripped.toLowerCase() === formStripped.toLowerCase()) {
      return { isCorrect: true };
    }
  }

  // 3) Numeric comparison (with tolerance)
  const userNum = toNumber(userStripped);
  const correctNum = toNumber(stripUnit(correctAnswer, expectedUnit));
  if (userNum !== null && correctNum !== null) {
    if (Math.abs(userNum - correctNum) < 1e-6) return { isCorrect: true };
    // Also try fraction equivalence
    const userFrac = parseFraction(userStripped);
    const correctFrac = parseFraction(stripUnit(correctAnswer, expectedUnit));
    if (userFrac !== null && correctFrac !== null) {
      if (Math.abs(userFrac - correctFrac) < 1e-6) return { isCorrect: true };
    }
  }

  // 4) Fraction vs decimal
  const userFrac = parseFraction(userStripped);
  if (userFrac !== null && correctNum !== null) {
    if (Math.abs(userFrac - correctNum) < 1e-6) return { isCorrect: true };
  }

  // 5) Time comparison (only if both look like times)
  const userT = parseTime(userTrim);
  const correctT = parseTime(correctAnswer);
  if (userT !== null && correctT !== null) {
    if (userT === correctT) return { isCorrect: true };
  }

  // 6) Percentage: "75" matches "75%" if expected unit is %
  if (expectedUnit === "%") {
    const u = toNumber(userStripped);
    const c = toNumber(stripUnit(correctAnswer, "%"));
    if (u !== null && c !== null && Math.abs(u - c) < 1e-6) {
      return { isCorrect: true };
    }
  }

  return { isCorrect: false, reason: "Answer does not match expected" };
}
