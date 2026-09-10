(function () {
  'use strict';
  // Category-aware hint library.
  // Each entry provides a small, methodology-focused nudge.
  // The hint MUST NOT reveal the final answer.
  // Hints are matched by question category and, where useful, by
  // sub-patterns detected in the question text.

  const CATEGORY_HINTS = {
    'Percentages': [
      'Try breaking the percentage into 10% chunks (10% + 5% + 1% etc.).',
      'Find 10% first by moving the decimal one place, then scale.',
      'Use the complement: subtract from 100% if it is easier.',
      'Convert the percent to a fraction over 100 before multiplying.'
    ],
    'Speed Distance Time': [
      'Convert minutes to a fraction of an hour first (e.g. 20 min = 1/3 h).',
      'Use Distance = Speed × Time. Rearrange the formula you need.',
      'For unit conversion: km/h × 5/18 = m/s, or m/s × 3.6 = km/h.',
      'If two objects move toward each other, add their speeds.'
    ],
    'Fractions': [
      'Find a common denominator before adding or subtracting fractions.',
      'Cross-multiply to compare: a/b vs c/d, check a·d vs b·c.',
      'Try the butterfly method for adding/subtracting fractions.',
      'Simplify the fraction first — it makes the arithmetic easier.'
    ],
    'Ratios Proportions': [
      'Find the unit value first (e.g. price of 1 item), then scale up.',
      'Use cross-multiplication: a/b = c/d → a·d = b·c.',
      'If the ratio scales, the value scales by the same factor.',
      'Set up the proportion so units cancel correctly.'
    ],
    'Profit Loss': [
      'Profit % = (Profit / Cost Price) × 100, never use selling price.',
      'Loss % is also computed against the cost price.',
      'If a 20% discount applies, the final price is 80% of the original.',
      'Find the discount first, then subtract from the original price.'
    ],
    'Averages': [
      'Average = (sum of values) / (count).',
      'If the average changes, the extra points needed = change × count.',
      'For consecutive numbers, the average equals the middle value.',
      'Weighted average: multiply each value by its weight, then divide.'
    ],
    'Work Time': [
      'Combined rate = sum of individual rates (1/a + 1/b + ...).',
      'For two workers, the combined time = (a × b) / (a + b).',
      'Convert the whole job into "1 unit" and find the rate per hour.',
      'Ask: "How much work can each person do in one hour?"'
    ],
    'Pipes Tanks': [
      'For two pipes: combined time = (a × b) / (a + b).',
      'A filling pipe adds positive rate, a draining pipe subtracts.',
      'Convert the tank capacity to "1" and find each pipe rate per hour.',
      'Work = Rate × Time. Sum the rates when pipes run together.'
    ],
    'Unit Conversion': [
      'Multiply or divide by the right factor (e.g. 1000 m = 1 km).',
      'km/h → m/s: multiply by 5/18. m/s → km/h: multiply by 18/5 (or 3.6).',
      'Square / cube the factor when converting area / volume units.',
      'Write the units in the equation and cancel them like numbers.'
    ],
    'Basic Arithmetic': [
      'Apply BODMAS / PEMDAS: brackets, orders, ×/÷, then +/−.',
      'Estimate first so you can spot wrong answers quickly.',
      'Regroup: e.g. 99 × n = (100 × n) − n.',
      'Break big numbers into friendly parts: 47 = 50 − 3.'
    ],
    'Decimals': [
      'Multiply decimals by removing the dot, then count the total decimal places.',
      'For division, multiply both numbers to clear the decimal.',
      'Round to a nearby whole number, estimate, then compute exactly.',
      'Convert the decimal to a fraction (e.g. 0.25 = 1/4) when useful.'
    ],
    'Mental Multiplication': [
      'Two-digit × 11: place the digit sum between the original digits.',
      'Break one number into tens and units, then add the partials.',
      'Look for round-number shortcuts: 99 × n = (100 × n) − n.',
      'Use the difference-of-squares identity: (a+b)(a−b) = a² − b².'
    ],
    'Mental Division': [
      'Long division: estimate each digit, multiply, subtract, bring down.',
      'For ÷ 5, multiply by 2 and divide by 10.',
      'For ÷ 25, multiply by 4 and divide by 100.',
      'Cancel common factors in the dividend and divisor first.'
    ],
    'Age Problems': [
      'Express every age in terms of one variable (usually the youngest).',
      'Differences between ages stay constant over time.',
      'Sum of ages today vs in N years: add N to each person.',
      'Set up an equation and solve for the unknown.'
    ],
    'Time Calculation': [
      'Convert everything to a single unit (minutes or hours) first.',
      'A 12-hour clock: noon = 12:00 PM, midnight = 12:00 AM.',
      'For elapsed time, count forward from start to end.',
      'Watch out for AM/PM flips when crossing 12:00.'
    ],
    'Relative Speed': [
      'Same direction: subtract speeds. Opposite: add them.',
      'Closing distance per unit time = sum of speeds (toward each other).',
      'Trains problem: relative speed = sum of speeds (head-on).',
      'Convert all speeds to the same unit before combining.'
    ],
    'Number Patterns': [
      'Compute differences between consecutive terms first.',
      'If the second difference is constant, the pattern is quadratic.',
      'Try small cases (n = 1, 2, 3) to guess the closed-form formula.',
      'For a sum of first n integers, use n(n+1)/2.'
    ],
    'Mixed Mental Math': [
      'Identify the underlying concept (rate, ratio, percentage) first.',
      'Estimate before calculating so you can sanity-check the answer.',
      'Pick the simplest form of the numbers: 25 = 100/4, 75 = 3 × 25.',
      'Re-read the question — it often hints at which formula to use.'
    ]
  };

  // Generic fallbacks by question text keyword. Used when no category hint
  // matches strongly, or to add an extra nudge on top of the category hint.
  const KEYWORD_HINTS = [
    { test: /percentage|percent|%/i, hint: 'Identify the percentage and the base value first.' },
    { test: /discount|off|reduce/i, hint: 'A discount of X% means you pay (100 − X)% of the original.' },
    { test: /markup|increase|grow/i, hint: 'A markup of X% means the new value is (100 + X)% of the original.' },
    { test: /km\/h|kph|m\/s|mph|miles/i, hint: 'Convert units before substituting into the formula.' },
    { test: /pipes?|tank/i, hint: 'Combined pipe rate is the sum of individual fill rates.' },
    { test: /average|mean/i, hint: 'Average = total ÷ count. Total = average × count.' },
    { test: /profit|loss/i, hint: 'Always compare against the cost price, not the selling price.' },
    { test: /ratio|proportion/i, hint: 'A ratio scales by the same factor on both sides.' }
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function hintFor(question) {
    if (!question) return 'Read the question carefully and identify the goal first.';
    const cat = question.category;
    let hint;
    if (cat && CATEGORY_HINTS[cat] && CATEGORY_HINTS[cat].length) {
      hint = pickRandom(CATEGORY_HINTS[cat]);
    } else {
      hint = 'Break the problem into smaller, friendlier steps and solve each one.';
    }
    // Optionally add a secondary, keyword-based nudge for more specificity.
    for (const k of KEYWORD_HINTS) {
      if (k.test.test(question.question || '')) {
        if (k.hint && k.hint !== hint) hint = hint + ' ' + k.hint;
        break;
      }
    }
    return hint;
  }

  window.Hints = { hintFor, CATEGORY_HINTS, KEYWORD_HINTS };
})();
