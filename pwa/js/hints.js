(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Category-aware, question-specific hint library.
  //
  // Rules this file must never break:
  //   1. A hint explains the METHOD (the trick/pattern), never the result.
  //   2. A hint must never contain the correct answer or an accepted answer.
  //   3. A hint must be relevant to the actual question on screen, so it is
  //      generated from the question text: its numbers, units and wording.
  //
  // `hintFor()` builds a specific hint, appends at most one keyword nudge,
  // then runs the result through `revealsAnswer()`. If the hint would give
  // the game away it is replaced by a safe methodology nudge.
  // ---------------------------------------------------------------------

  var GENERIC = 'Break the problem into smaller, friendlier steps and solve each one.';

  // Fallback nudges per category. Used when no pattern matches, and as the
  // safety net when a generated hint turns out to reveal the answer.
  var CATEGORY_HINTS = {
    'Percentages': [
      'Try breaking the percentage into 10% chunks (10% + 5% + 1% etc.).',
      'Find 10% first by moving the decimal one place, then scale.',
      'Use the complement: subtract from 100% if it is easier.',
      'Convert the percent to a fraction over 100 before multiplying.'
    ],
    'Speed Distance Time': [
      'Convert minutes to a fraction of an hour first (e.g. 20 min = 1/3 h).',
      'Use Distance = Speed x Time. Rearrange the formula you need.',
      'For unit conversion: km/h x 5/18 = m/s, or m/s x 3.6 = km/h.',
      'If two objects move toward each other, add their speeds.'
    ],
    'Fractions': [
      'Find a common denominator before adding or subtracting fractions.',
      'Cross-multiply to compare: a/b vs c/d, check a x d vs b x c.',
      'Try the butterfly method for adding or subtracting fractions.',
      'Simplify the fraction first - it makes the arithmetic easier.'
    ],
    'Ratios Proportions': [
      'Find the unit value first (e.g. price of 1 item), then scale up.',
      'Use cross-multiplication: a/b = c/d means a x d = b x c.',
      'If the ratio scales, the value scales by the same factor.',
      'Set up the proportion so the units cancel correctly.'
    ],
    'Profit Loss': [
      'Profit % = (Profit / Cost Price) x 100, never use the selling price.',
      'Loss % is also computed against the cost price.',
      'If a discount applies, work out the amount off first, then subtract.',
      'Find the discount amount, then subtract it from the original price.'
    ],
    'Averages': [
      'Average = (sum of values) / (count).',
      'If the average changes, the extra points needed = change x count.',
      'For consecutive numbers, the average equals the middle value.',
      'Weighted average: multiply each value by its weight, then divide.'
    ],
    'Work Time': [
      'Combined rate = sum of the individual rates (1/a + 1/b + ...).',
      'For two workers, the combined time = (a x b) / (a + b).',
      'Convert the whole job into "1 unit" and find the rate per hour.',
      'Ask: "How much work can each person do in one hour?"'
    ],
    'Pipes Tanks': [
      'For two pipes: combined time = (a x b) / (a + b).',
      'A filling pipe adds a positive rate, a draining pipe subtracts.',
      'Convert the tank capacity to "1" and find each pipe rate per hour.',
      'Work = Rate x Time. Sum the rates when the pipes run together.'
    ],
    'Unit Conversion': [
      'Convert the units first: multiply or divide by the right factor (e.g. 1000 m = 1 km).',
      'km/h to m/s: multiply by 5/18. m/s to km/h: multiply by 3.6.',
      'Square or cube the factor when converting area or volume units.',
      'Write the units in the equation and cancel them like numbers.'
    ],
    'Basic Arithmetic': [
      'Apply BODMAS / PEMDAS: brackets, orders, x and /, then + and -.',
      'Estimate first so you can spot a wrong answer quickly.',
      'Regroup: e.g. 99 x n = (100 x n) - n.',
      'Break big numbers into friendly parts: 47 = 50 - 3.'
    ],
    'Decimals': [
      'Multiply decimals by removing the dot, then count the decimal places.',
      'For division, multiply both numbers to clear the decimal.',
      'Round to a nearby whole number, estimate, then compute exactly.',
      'Convert the decimal to a fraction (e.g. 0.25 = 1/4) when useful.'
    ],
    'Mental Multiplication': [
      'Two-digit x 11: place the digit sum between the original digits.',
      'Break one number into tens and units, then add the partials.',
      'Look for round-number shortcuts: 99 x n = (100 x n) - n.',
      'Use the difference-of-squares identity: (a+b)(a-b) = a^2 - b^2.'
    ],
    'Mental Division': [
      'Long division: estimate each digit, multiply, subtract, bring down.',
      'For dividing by 5, multiply by 2 and divide by 10.',
      'For dividing by 25, multiply by 4 and divide by 100.',
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
      'For elapsed time, count forward from the start to the end.',
      'Watch out for AM/PM flips when crossing 12:00.'
    ],
    'Relative Speed': [
      'Same direction: subtract the speeds. Opposite: add them.',
      'Closing distance per unit time = sum of the speeds (toward each other).',
      'Trains problem: relative speed = sum of the speeds (head-on).',
      'Convert all speeds to the same unit before combining.'
    ],
    'Number Patterns': [
      'Compute the differences between consecutive terms first.',
      'If the second difference is constant, the pattern is quadratic.',
      'Try small cases (n = 1, 2, 3) to guess the closed-form formula.',
      'For a sum of the first n integers, use n(n+1)/2.'
    ],
    'Mixed Mental Math': [
      'Identify the underlying concept (rate, ratio, percentage) first.',
      'Estimate before calculating so you can sanity-check the answer.',
      'Pick the simplest form of the numbers: 25 = 100/4, 75 = 3 x 25.',
      'Re-read the question - it often hints at which formula to use.'
    ]
  };

  // Extra nudges matched on wording. At most one is appended, and only when
  // it adds something the specific hint did not already say.
  var KEYWORD_HINTS = [
    { test: /discount|% off|reduced by/i, hint: 'A discount of X% means you pay (100 - X)% of the original.' },
    { test: /profit\s*%|loss\s*%|percentage (?:of )?profit/i, hint: 'Always compare against the cost price, not the selling price.' },
    { test: /km\/h|kph|m\/s|mph|miles per hour/i, hint: 'Convert the units before you substitute into the formula.' },
    { test: /pipes?|tank/i, hint: 'The combined rate is the sum of the individual fill rates.' },
    { test: /average|mean/i, hint: 'Average = total / count, so total = average x count.' },
    { test: /ratio|proportion/i, hint: 'A ratio scales by the same factor on both sides.' },
    { test: /consecutive/i, hint: 'In an evenly spaced list the middle term is the average.' }
  ];

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function num(v) { return String(v == null ? '' : v); }

  // ---------------------------------------------------------------
  // Question-specific hint builders, by category.
  // Each returns a string, or null when the wording is not recognised
  // (the caller then falls back to the category library).
  // ---------------------------------------------------------------
  var BUILDERS = {};

  BUILDERS['Percentages'] = function (t) {
    var m;
    // "What is 15% of 240?"  /  "Calculate 15% of 240"
    if ((m = t.match(/([\d.]+)\s*%\s*of\s*([\d,]+)/i))) {
      var p = parseFloat(m[1]);
      var chunks = [];
      var left = p;
      [10, 10, 5, 5, 1, 1, 1, 1].forEach(function (unit) {
        if (left >= unit - 1e-9) { chunks.push(unit + '%'); left -= unit; }
      });
      if (p === 10) return 'Move the decimal point one place left to get 10%, then scale to ' + p + '%.';
      if (chunks.length && left < 1e-9) return 'Try splitting ' + p + '% into ' + chunks.join(' + ') + ' pieces: find each piece from 10% and 5% of the number, then add them.';
      if (p % 25 === 0 || p === 12.5 || p === 75) return 'Turn ' + p + '% into a simple fraction first (think 25%, 50%, 75%, 12.5%), then take that fraction of the number.';
      return 'Find 10% of the number first (shift the decimal one place), then build up to ' + p + '% with 10%, 5% and 1% pieces.';
    }
    // "20% of a number is 48. What is the number?"
    if (/increas[^.?!]*\bthen\b[^.?!]*decreas|decreas[^.?!]*\bthen\b[^.?!]*increas/i.test(t)) return 'Do it in two steps on a starting value of 100: apply the first change, then apply the second change to the NEW value, never the original. Successive equal percent changes do not cancel out.';
    if (/%\s*of\s*(?:a|the)?\s*number/i.test(t)) return 'Call the number x. Write x times the percentage as a fraction equals the given value, then divide by that fraction (or multiply by 100/percent).';
    // percentage score from marks
    if ((m = t.match(/([\d,]+)\s*(?:marks?|points?|out of)\b[\s\S]*?out of\s*([\d,]+)/i)) || /percentage|percent\s*\?/i.test(t)) {
      return 'Write it as a fraction first, cancel any common factor, then convert that simplified fraction to a percent.';
    }
    // increase / decrease
    if (/increas|decreas|grow|rise/i.test(t)) return 'Percent change = (change / ORIGINAL value) x 100 - always divide by the starting number, not the new one.';
    return null;
  };

  BUILDERS['Speed Distance Time'] = function (t) {
    var m;
    if (/toward each other|approach|meet/i.test(t)) return 'Add the two speeds to get the closing speed, then divide the distance by it.';
    if ((m = t.match(/(?:at|speed of)\s*([\d.]+)\s*(?:km\/h|kmh|kph|m\/s|mph)[\s\S]*?in\s*(\d+)\s*(minutes|min|seconds|sec|hours|hour)/i))) {
      return 'Convert the ' + m[2] + ' ' + m[3] + ' into a fraction of an hour first (' + m[2] + '/60), then multiply by the speed.';
    }
    if (/(train|bridge|platform|pole|tunnel)/i.test(t)) return 'Convert km/h to m/s first (multiply by 5/18), and remember the train must cover its OWN length plus the length it is passing.';
    if (/speed in km\/h|what is its speed|average speed/i.test(t)) return 'Speed = Distance / Time. Get the time into hours (or the distance into km) before you divide.';
    if (/how (?:many|much) (?:kilometers|kilometres|km|distance)/i.test(t)) return 'Distance = Speed x Time. Put the time into hours before multiplying.';
    return 'Write down Distance = Speed x Time and rearrange it for the quantity you are asked for.';
  };

  BUILDERS['Fractions'] = function (t) {
    if (/(\d+)\s*\/\s*\d+\s*[-+\u2212\u2013]\s*\d+\s*\/\s*\d+/.test(t)) return 'Use the butterfly method: cross-multiply for the numerator, multiply the denominators for the denominator, then simplify.';
    if (/biggest|largest|smallest|greatest|least/i.test(t)) return 'Compare the fractions two at a time by cross-multiplying, or see how far each one sits below 1 whole.';
    if (/\bof\b/.test(t)) return 'Divide by the denominator first when it cancels cleanly, then multiply by the numerator.';
    if (/inside|outside|in water|in mud|in the air|remain/i.test(t)) return 'Add up the fractions given, subtract that from one whole, then take that fraction of the total.';
    return 'Find a common denominator for the fractions before you add or subtract, then simplify at the end.';
  };

  BUILDERS['Ratios Proportions'] = function (t) {
    if (/ratio/i.test(t)) return 'Add the ratio parts to get the total number of parts, divide the whole by that, then multiply by the part you need.';
    if (/cost|price|items|apples|pens|notebooks|eggs|buy/i.test(t)) return 'Find the UNIT price (the price of exactly one item) first, then multiply by the number you need.';
    if (/litres|liters|petrol|consum/i.test(t)) return 'This is a direct proportion: work out the multiplier between the two amounts, then scale the other quantity by the same factor.';
    return 'Set it up as two equal fractions and cross-multiply.';
  };

  BUILDERS['Averages'] = function (t) {
    if (/consecutive|odd numbers|even numbers/i.test(t)) return 'In an evenly spaced list the average is the MIDDLE term - count outwards from there to reach the ends.';
    if (/needed|make the total average|new average|5th|next test/i.test(t)) return 'Work out the total needed for the new average (new average x number of items), then subtract the total you already have.';
    if (/average of these|find the average|mean of/i.test(t)) return 'Add the values (pair a small one with a large one to make it easy), then divide by how many there are.';
    if (/returns? at|there and back|whole journey|round trip/i.test(t)) return 'The two legs cover equal DISTANCE, so the speeds do not average: use total distance / total time, which for two equal legs simplifies to 2ab/(a+b).';
    if (/equal (?:time|distance)|average speed/i.test(t)) return 'Equal TIME intervals: plain mean of the speeds. Equal DISTANCES: use total distance / total time, not the mean of the speeds.';
    return 'Average = total / count, so total = average x count.';
  };

  BUILDERS['Work Time'] = function (t, q) {
    if (/men can finish|man-days|workers/i.test(t)) return 'Total work = men x days. That total never changes, so divide it by the new number of men.';
    if (/together|both|combined/i.test(t)) return 'Add the rates: one day of work is 1/a + 1/b. For two workers the combined time is (a x b) / (a + b).';
    return 'Turn the whole job into "1 unit" and work out how much each person finishes in one hour or one day.';
  };

  BUILDERS['Pipes Tanks'] = function (t) {
    if (/empti|drain|leak/i.test(t)) return 'A filling pipe adds a positive rate, a draining pipe subtracts. Add the signed rates, then invert to get the time.';
    if (/together|both are open|both pipes/i.test(t)) return 'Add the two rates (1/a + 1/b). For two pipes the combined time is (a x b) / (a + b) - never the average of the two times.';
    return 'Call the tank "1", find each pipe fraction per hour, then add or subtract the fractions.';
  };

  BUILDERS['Unit Conversion'] = function (t) {
    if (/m\/s|meters per second|metres per second/i.test(t)) return 'km/h to m/s: multiply by 5/18 (18 km/h = 5 m/s - scale from there).';
    if (/km\/h|km per hour|kilometers per hour/i.test(t)) return 'm/s to km/h: multiply by 3.6 (10 m/s = 36 km/h - scale from there).';
    if (/cm|mm|metre|meter|km\b/i.test(t)) return 'Count the steps: x1000 from km to m, x100 from m to cm, x10 from cm to mm - and divide when going the other way.';
    return 'Write the units into the calculation and cancel them like numbers.';
  };

  BUILDERS['Basic Arithmetic'] = function (t) {
    if (/\(|bracket/i.test(t)) return 'BODMAS: brackets first, then x and /, then + and - from left to right.';
    return 'BODMAS / PEMDAS: do the multiplication and division BEFORE the addition and subtraction - not left to right.';
  };

  BUILDERS['Decimals'] = function (t) {
    if (/multiply|product/i.test(t)) return 'Ignore the decimal points, multiply the digits, then put the decimal point back using the TOTAL number of decimal places.';
    if (/divide|quotient/i.test(t)) return 'Shift the decimal point the same number of places in BOTH numbers to clear it, then divide as usual.';
    return 'Round to a nearby whole number to estimate first, then place the decimal point deliberately.';
  };

  BUILDERS['Mental Multiplication'] = function (t) {
    if (/x\s*11|\u00d7\s*11|\*\s*11/.test(t)) return 'For x11: write the first digit, then the SUM of the two digits, then the last digit - carry the 1 if that sum is 10 or more.';
    if (/99|101|98|102/.test(t)) return 'Round to 100, multiply, then correct by adding or subtracting the original number.';
    if (/x\s*5|\u00d7\s*5/.test(t)) return 'Multiplying by 5 is the same as multiplying by 10 and halving.';
    if (/x\s*25|\u00d7\s*25/.test(t)) return 'Multiplying by 25 is the same as dividing by 4 and multiplying by 100.';
    return 'Split one factor into tens and units, multiply the parts separately, then add them back together.';
  };

  BUILDERS['Mental Division'] = function (t) {
    if (/\/\s*25|divide.*25/i.test(t)) return 'Dividing by 25 is the same as multiplying by 4 and dividing by 100.';
    if (/\/\s*5|divide.*\b5\b/i.test(t)) return 'Dividing by 5 is the same as multiplying by 2 and dividing by 10.';
    if (/\/\s*4|divide.*\b4\b/i.test(t)) return 'Dividing by 4 is just halving twice.';
    return 'Cancel any common factor from the top and bottom first, then estimate each digit of the quotient.';
  };

  BUILDERS['Age Problems'] = function (t) {
    if (/times (?:as )?old|times older/i.test(t)) return 'Call the youngest person x. The other is a multiple of x, so their ages add up to (multiple + 1) parts - divide the total by that number of parts.';
    if (/after\s*\d+\s*years|in\s*\d+\s*years|years (?:ago|back)/i.test(t)) return 'Move EVERY age by the same number of years - the difference between two ages never changes.';
    return 'Express every age in terms of one variable and solve the equation.';
  };

  BUILDERS['Time Calculation'] = function (t) {
    if (/from\s*\d{1,2}[:.]\d{2}\s*(am|pm)?\s*to\s*\d{1,2}[:.]\d{2}/i.test(t)) return 'Snap to a clean hour first, then adjust by the difference - and check whether you crossed 12:00 (AM/PM flip).';
    if (/arrive|reach(?:es)? at|at what time/i.test(t)) return 'Divide the distance by the speed to get the hours, then add that to the starting time.';
    if (/minutes are there|how long|elapsed/i.test(t)) return 'Convert everything to minutes past midnight (or to a single unit), then subtract.';
    return 'Convert every quantity into one single unit (minutes or hours) before you combine them.';
  };

  BUILDERS['Relative Speed'] = function (t) {
    if (/opposite/i.test(t)) return 'Opposite directions: ADD the two speeds to get the separation speed, then multiply by the time.';
    if (/same direction|overtak|catch/i.test(t)) return 'Same direction: SUBTRACT the slower speed from the faster one, then use that gap speed.';
    if (/downstream|upstream|stream|boat/i.test(t)) return 'Downstream = boat + stream, upstream = boat - stream. Half the difference of the two gives the stream speed.';
    return 'Put both speeds into the same units, then add (towards each other) or subtract (same direction).';
  };

  BUILDERS['Profit Loss'] = function (t) {
    if (/discount|% off/i.test(t)) return 'Find the discount amount (percent x original), then subtract it from the original price - or take (100 - percent)% directly.';
    if (/profit\s*%|loss\s*%|percentage (?:of )?(?:profit|loss)/i.test(t)) return 'Work out the change (selling price - cost price), then divide by the COST price and multiply by 100.';
    if (/selling price|sold it/i.test(t)) return 'Find the percent of the COST price first, then add it for a profit or subtract it for a loss.';
    return 'Always take the percentage of the cost price, never of the selling price.';
  };

  BUILDERS['Number Patterns'] = function (t) {
    if (/sum|total of the first/i.test(t)) return 'Pair the first term with the last, the second with the second-last - each pair has the same sum - then count the pairs.';
    if (/next|missing|comes next|series/i.test(t)) return 'Take the differences between consecutive terms; if those differences are constant it is linear, if the second difference is constant it is quadratic.';
    return 'Try the first few cases (n = 1, 2, 3) and look for the rule that generates them.';
  };

  BUILDERS['Mixed Mental Math'] = function (t) {
    return 'Decide which single idea the wording is pointing at (rate, ratio, percentage or average), then apply that one pattern - and estimate first to sanity-check.';
  };

  // ---------------------------------------------------------------
  // Answer-safety guard.
  // A hint must never hand over the answer. We compare every numeric
  // token in the hint against the correct answer and every accepted
  // answer (also checked as a fraction and as a clock time).
  // ---------------------------------------------------------------
  function numericTokens(text) {
    var out = [];
    var re = /-?\d+(?:\.\d+)?/g;
    var m;
    while ((m = re.exec(text)) !== null) out.push(parseFloat(m[0]));
    return out;
  }

  function fractionValue(s) {
    var m = String(s).match(/^\s*(-?\d+)\s*\/\s*(\d+)\s*$/);
    if (!m) return null;
    var d = parseInt(m[2], 10);
    if (!d) return null;
    return parseInt(m[1], 10) / d;
  }

  function clockValue(s) {
    var m = String(s).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!m) return null;
    var h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return h * 60 + (parseInt(m[2], 10) || 0);
  }

  function hintNumbers(hint) {
    // "10%" and "12.5 percent" are method language, not values, so they are
    // stripped before we look for leaked answers.
    const stripped = String(hint).replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi, ' ');
    return numericTokens(stripped);
  }

  function revealsAnswer(hint, question) {
    const qNums = numericTokens(num(question.question));
    const hNums = hintNumbers(hint);
    const answers = [question.correctAnswer].concat(question.acceptedAnswers || []);
    for (var i = 0; i < answers.length; i++) {
      const raw = answers[i];
      if (raw == null) continue;
      const aStr = String(raw).trim();
      if (!aStr) continue;
      const lowHint = String(hint).toLowerCase();

      // Non-numeric answers (fractions like "7/20", clock times, words):
      // the answer must not appear verbatim in the hint.
      if (/[^\d.,\-+]/.test(aStr)) {
        if (aStr.length >= 2 && lowHint.indexOf(aStr.toLowerCase()) !== -1) return true;
      }

      const aNum = parseFloat(aStr);
      if (isFinite(aNum)) {
        if (Math.abs(aNum) < 1e-9) continue; // ignore trivial zeros
        // A number that is already given in the question is not a leak.
        const given = qNums.some(function (n) { return Math.abs(n - aNum) < 1e-9; });
        if (!given && hNums.some(function (n) { return Math.abs(n - aNum) < 1e-9; })) return true;
      }

      const aFrac = fractionValue(aStr);
      if (aFrac != null && hNums.some(function (n) { return Math.abs(n - aFrac) < 1e-9; })) return true;

      const aClock = clockValue(aStr);
      if (aClock != null && clockValue(hint) === aClock) return true;
    }
    return false;
  }

  function topicFallback(category) {
    return 'Think about which ' + (category || 'mental math') + ' pattern applies here, then work through it one step at a time.';
  }

  function hintFor(question) {
    if (!question) return 'Read the question carefully and identify what it is asking for first.';
    const text = num(question.question || '');
    const cat = question.category;

    // 1. The specific, question-tailored hint.
    let specific = null;
    const builder = cat && BUILDERS[cat];
    if (typeof builder === 'function') {
      try { specific = builder(text, question) || null; } catch (e) { specific = null; }
    }

    // 2. At most one extra keyword nudge, when it adds something new.
    let nudge = '';
    for (var i = 0; i < KEYWORD_HINTS.length; i++) {
      if (KEYWORD_HINTS[i].test.test(text)) {
        const extra = KEYWORD_HINTS[i].hint;
        if (extra && (!specific || (specific.indexOf(extra) === -1 && extra.indexOf(specific) === -1))) nudge = extra;
        break;
      }
    }

    // 3. Build an ordered candidate list, most specific first, and return the
    //    first one that does not give the answer away. The category hints and
    //    the topic fallback are always on-topic, so relevance is guaranteed.
    const candidates = [];
    if (specific && nudge) candidates.push(specific + ' ' + nudge);
    if (specific) candidates.push(specific);
    const list = (CATEGORY_HINTS[cat] || []).slice();
    for (var j = list.length - 1; j > 0; j--) { // shuffle
      const k = Math.floor(Math.random() * (j + 1));
      const tmp = list[j]; list[j] = list[k]; list[k] = tmp;
    }
    candidates.push.apply(candidates, list);
    candidates.push(topicFallback(cat));

    for (var c = 0; c < candidates.length; c++) {
      if (candidates[c] && !revealsAnswer(candidates[c], question)) return candidates[c];
    }
    return topicFallback(cat);
  }

  window.Hints = { hintFor: hintFor, CATEGORY_HINTS: CATEGORY_HINTS, KEYWORD_HINTS: KEYWORD_HINTS, BUILDERS: BUILDERS, revealsAnswer: revealsAnswer };
})();
