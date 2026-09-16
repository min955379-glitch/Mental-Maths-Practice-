(function () {
  'use strict';

  // Category-aware, question-specific hint library (v3, 7-category bank).
  // Only the seven approved categories are supported.

  var GENERIC = 'Break the problem into smaller, friendlier steps and solve each one.';

  var CATEGORY_HINTS = {
    'Speed': [
      'Convert the minutes into a fraction of an hour first (divide by 60), then multiply by the speed.',
      'Distance = Speed x Time, then rearrange to find Time or Speed.',
      'For unit conversion: km/h x 5/18 = m/s, or m/s x 3.6 = km/h.',
      'When you only have distance and time, divide distance by time to get speed.'
    ],
    'Percentage': [
      'Find 10% first (move the decimal one place), then build the percent using 10%/5%/1% pieces.',
      'Convert the percentage to a fraction of 100, simplify if you can, then take that fraction of the number.',
      'Use the complement of the percentage when it makes the arithmetic easier.',
      'For reverse-percentage problems, divide the known part by the percentage fraction rather than multiplying.'
    ],
    'Dozen': [
      '1 dozen is 12 items, so multiply dozens by 12 (or divide items by 12 to count dozens).',
      'When the question gives a per-dozen price, multiply it by the number of dozens to get the total cost.',
      'For mixed counts (dozens + extras), convert the dozens to items first, then add the extras.',
      'Think of the dozen as the natural unit and treat individual items separately.'
    ],
    'Area': [
      'Identify the shape first, then pick the matching formula (square / rectangle / triangle / semicircle).',
      'Square area = side x side; rectangle area = length x width.',
      'Triangle area = 1/2 x base x height - do not forget the half.',
      'For a semicircle, area = 1/2 x pi x r^2; with pi = 22/7 it becomes 11 x r^2 / 7.'
    ],
    'DMAS Rule': [
      'DMAS: do Division and Multiplication first (left to right), then Addition and Subtraction (left to right).',
      'Brackets come first, always evaluate the bracket as a single value before applying the rest.',
      'When in doubt, write the expression down and underline what you are about to evaluate next.',
      'When the four operators appear together, do x and / before + and -, never read straight left-to-right.'
    ],
    'Zakat (2.5%)': [
      'Zakat is 2.5% of the eligible amount, which is the same as dividing the amount by 40.',
      'For a quick mental Zakat calculation: take the amount in rupees, divide it by 40 - that is your Zakat.',
      'Zakat on a round amount: halve three times (divide by 8), then halve once more or multiply by 5 for the precise fraction.',
      'Always express the Zakat result in rupees, then check it is the right order of magnitude.'
    ],
    'Profit and Loss': [
      'Profit = Selling Price - Cost Price; Loss = Cost Price - Selling Price.',
      'Profit % and Loss % are both computed against the COST price - never the selling price.',
      'For a forward question: SP = CP x (1 + percent/100) for profit, (1 - percent/100) for loss.',
      'For a reverse question (find CP given SP and percent): CP = SP x 100 / (100 + percent) for profit, (100 - percent) for loss.'
    ]
  };

  var KEYWORD_HINTS = [
    { test: /minutes|min\b/i, hint: 'Convert minutes to a fraction of an hour by dividing by 60 before you multiply by the speed.' },
    { test: /km\/h|kph|m\/s|mph/i, hint: 'Make sure the units cancel correctly before you substitute numbers into the formula.' },
    { test: /profit\s*%|loss\s*%|percentage (?:of )?(?:profit|loss)/i, hint: 'Always compute the percentage against the cost price, not the selling price.' },
    { test: /dozen/i, hint: '1 dozen = 12 items, so multiply or divide by 12 as you move between dozens and items.' },
    { test: /semicircle|semi-circle|semi circle/i, hint: 'A semicircle is half a circle, so its area = (pi x r^2) / 2; with pi = 22/7 this is 11 x r^2 / 7.' },
    { test: /triangle|base|height/i, hint: 'Triangle area uses a 1/2 factor - compute base x height first, then halve it.' },
    { test: /zakat|2\.5%|2\.5 %/i, hint: '2.5% = 1/40, so divide the eligible amount by 40 to get the Zakat.' },
    { test: /discount|% off|reduced by/i, hint: 'A discount of X% means you pay (100 - X)% of the original.' }
  ];

  function num(v) { return String(v == null ? '' : v); }

  var BUILDERS = {};

  BUILDERS['Speed'] = function (t) {
    if (/speed of .* in .* minutes|at .+ km\/h .+ in \d+ minutes?/i.test(t))
      return 'Convert minutes into a fraction of an hour first (divide by 60), then multiply by the speed.';
    if (/how many hours/i.test(t))
      return 'Time (in hours) = distance / speed. Use the hours value directly, or multiply by 60 for minutes.';
    if (/speed in km\/h|what is its speed/i.test(t))
      return 'Speed = distance / time. Convert minutes to hours first by dividing by 60, then divide distance by that time.';
    return null;
  };

  BUILDERS['Percentage'] = function (t) {
    if (/What is \d+% of \d+/i.test(t))
      return 'Find 10% of the number, then build the percent using 10% / 5% / 1% pieces (or use the matching fraction).';
    if (/Find the percentage:|out of/i.test(t))
      return 'Write the part / whole as a fraction, scale it to 100 to read off the percentage.';
    return null;
  };

  BUILDERS['Dozen'] = function (t) {
    if (/How many .+ are in \d+ dozen/i.test(t))
      return '1 dozen = 12 items. Multiply the number of dozens by 12.';
    if (/packed into dozens|how many dozen/i.test(t))
      return 'Divide the items by 12 to get the number of dozens.';
    if (/1 dozen .+ costs|per dozen/i.test(t))
      return 'Multiply the per-dozen price by the number of dozens to get the total cost.';
    if (/box contains .+ dozen .+ and \d+ extra/i.test(t))
      return 'Convert the dozens to items (12 each), then add the extra items.';
    return null;
  };

  BUILDERS['Area'] = function (t) {
    if (/square with side (\d+)/i.test(t))
      return 'Square area = side x side.';
    if (/rectangle (\d+) .*[×x] ?(\d+)/i.test(t))
      return 'Rectangle area = length x width.';
    if (/triangle with base/i.test(t))
      return 'Triangle area = 1/2 x base x height - do not forget the half.';
    if (/semicircle with radius/i.test(t))
      return 'Semicircle area = (pi x r^2) / 2. With pi = 22/7 the half cancels, so it is 11 x r^2 / 7.';
    return null;
  };

  BUILDERS['DMAS Rule'] = function (t) {
    if (/Evaluate:/i.test(t))
      return 'Apply DMAS strictly: brackets first, then ÷ and × left-to-right, then + and − left-to-right.';
    return null;
  };

  BUILDERS['Zakat (2.5%)'] = function (t) {
    if (/What is 2\.5% of/i.test(t))
      return '2.5% = 1/40, so divide the number by 40 to get the result.';
    if (/Zakat on/i.test(t))
      return 'Zakat = 2.5% of the amount. Divide the eligible amount by 40.';
    return null;
  };

  BUILDERS['Profit and Loss'] = function (t) {
    if (/profit percentage/i.test(t))
      return 'Profit % = (Selling Price - Cost Price) / Cost Price x 100. The base is always the cost price.';
    if (/loss percentage/i.test(t))
      return 'Loss % = (Cost Price - Selling Price) / Cost Price x 100. The base is always the cost price.';
    if (/selling price|profit\?|loss\?/i.test(t))
      return 'For percentage profit: SP = CP x (1 + percent/100). For percentage loss: SP = CP x (1 - percent/100).';
    if (/cost price/i.test(t))
      return 'For percentage profit: CP = SP x 100 / (100 + percent). For percentage loss: CP = SP x 100 / (100 - percent).';
    return null;
  };

  // Answer-safety guard
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
    var stripped = String(hint).replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi, ' ');
    return numericTokens(stripped);
  }
  function revealsAnswer(hint, question) {
    var qNums = numericTokens(num(question.question));
    var hNums = hintNumbers(hint);
    var answers = [question.correctAnswer].concat(question.acceptedAnswers || []);
    for (var i = 0; i < answers.length; i++) {
      var raw = answers[i];
      if (raw == null) continue;
      var aStr = String(raw).trim();
      if (!aStr) continue;
      var lowHint = String(hint).toLowerCase();
      if (/[^\d.,\-+]/.test(aStr)) {
        if (aStr.length >= 2 && lowHint.indexOf(aStr.toLowerCase()) !== -1) return true;
      }
      var aNum = parseFloat(aStr);
      if (isFinite(aNum)) {
        if (Math.abs(aNum) < 1e-9) continue;
        var given = qNums.some(function (n) { return Math.abs(n - aNum) < 1e-9; });
        if (!given && hNums.some(function (n) { return Math.abs(n - aNum) < 1e-9; })) return true;
      }
      var aFrac = fractionValue(aStr);
      if (aFrac != null && hNums.some(function (n) { return Math.abs(n - aFrac) < 1e-9; })) return true;
      var aClock = clockValue(aStr);
      if (aClock != null && clockValue(hint) === aClock) return true;
    }
    return false;
  }
  function topicFallback(category) {
    return 'Think about which ' + (category || 'mental math') + ' pattern applies here, then work through it one step at a time.';
  }
  function hintFor(question) {
    if (!question) return 'Read the question carefully and identify what it is asking for first.';
    var text = num(question.question || '');
    var cat = question.category;
    var specific = null;
    var builder = cat && BUILDERS[cat];
    if (typeof builder === 'function') {
      try { specific = builder(text, question) || null; } catch (e) { specific = null; }
    }
    var nudge = '';
    for (var i = 0; i < KEYWORD_HINTS.length; i++) {
      if (KEYWORD_HINTS[i].test.test(text)) {
        var extra = KEYWORD_HINTS[i].hint;
        if (extra && (!specific || (specific.indexOf(extra) === -1 && extra.indexOf(specific) === -1))) nudge = extra;
        break;
      }
    }
    var candidates = [];
    if (specific && nudge) candidates.push(specific + ' ' + nudge);
    if (specific) candidates.push(specific);
    var list = (CATEGORY_HINTS[cat] || []).slice();
    for (var j = list.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = list[j]; list[j] = list[k]; list[k] = tmp;
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
