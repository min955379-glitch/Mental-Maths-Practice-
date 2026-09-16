(function () {
  'use strict';

  // Runtime question generator for the 7-category mental-math bank.
  // The PWA reads its question pool from window.QUESTIONS (declared in
  // data.js, populated by tools/question_bank_v3/build.py and verified
  // by tools/question_bank_v3/verify.py). This file provides an
  // *unlimited* generator used by the quiz engine when the bank runs dry.
  //
  // Only the seven approved categories are supported. Calling
  // window.Generator.generateOne(<retired>) returns null.

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];
  function fmt(n) { if (Number.isInteger(n)) return String(n); return String(parseFloat(n.toFixed(3))); }

  function genSpeed() {
    const v = pick([40, 45, 50, 54, 60, 72, 80, 90, 100, 120, 150, 180, 240, 300, 360, 420, 480, 600, 900]);
    const t = pick([5, 10, 12, 15, 20, 24, 25, 30, 35, 36, 40, 45, 50, 60]);
    const d = (v * t) / 60;
    return {
      question: 'A vehicle travels at ' + v + ' km/h. How many kilometres does it cover in ' + t + ' minutes?',
      correctAnswer: fmt(d),
      acceptedAnswers: [fmt(d) + ' km', fmt(d) + 'km'],
      unit: 'km',
      category: 'Speed',
      difficulty: t <= 12 ? 'Moderate' : 'Easy',
      shortcut: t + ' minutes = ' + t + '/60 hour. ' + v + ' × ' + t + '/60 = ' + fmt(d) + ' km.',
      explanation: 'Distance = Speed × Time = ' + v + ' × (' + t + '/60) = ' + fmt(d) + ' km.',
      mentalPattern: 'Convert minutes to a fraction of an hour, then multiply by the speed.',
      commonMistake: 'Multiplying speed by minutes without dividing minutes by 60.',
      sourceType: 'generated',
    };
  }

  function genPercentage() {
    const p = pick([5, 10, 12, 15, 20, 22, 25, 30, 35, 40, 45, 50, 60, 75, 80, 90]);
    const candidates = [10, 20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 240, 250, 300, 400, 500, 600, 800, 1000];
    const n = pick(candidates.filter(x => (p * x) % 100 === 0));
    const ans = (p * n) / 100;
    return {
      question: 'What is ' + p + '% of ' + n + '?',
      correctAnswer: fmt(ans),
      acceptedAnswers: [fmt(ans), fmt(ans) + ' percent', fmt(ans) + '%'],
      unit: '',
      category: 'Percentage',
      difficulty: 'Easy',
      shortcut: 'Find 10% first, then scale to ' + p + '%.',
      explanation: p + '% of ' + n + ' = (' + p + '/100) × ' + n + ' = ' + fmt(ans) + '.',
      mentalPattern: '10% chunks (10% + 5% + 1%) or special fractions.',
      commonMistake: 'Multiplying n × 0.0p with long arithmetic.',
      sourceType: 'generated',
    };
  }

  function genDozen() {
    const kind = rand(0, 2);
    const item = pick(['eggs', 'pencils', 'pens', 'apples', 'bottles', 'books', 'packs']);
    if (kind === 0) {
      const n = rand(2, 12);
      const total = n * 12;
      return {
        question: 'How many ' + item + ' are in ' + n + ' dozen?',
        correctAnswer: fmt(total),
        acceptedAnswers: [fmt(total)],
        unit: '',
        category: 'Dozen',
        difficulty: 'Easy',
        shortcut: n + ' × 12 = ' + total + '.',
        explanation: '1 dozen = 12 ' + item + '. ' + n + ' dozen = ' + n + ' × 12 = ' + total + ' ' + item + '.',
        mentalPattern: 'Dozen arithmetic always multiplies or divides by 12.',
        commonMistake: 'Multiplying by 10 instead of 12.',
        sourceType: 'generated',
      };
    } else if (kind === 1) {
      const price = pick([60, 84, 96, 120, 144]);
      const n = rand(2, 9);
      const total = price * n;
      return {
        question: 'If 1 dozen ' + item + ' costs ' + price + ' rupees, what is the cost of ' + n + ' dozen ' + item + '?',
        correctAnswer: fmt(total),
        acceptedAnswers: [fmt(total), fmt(total) + ' rupees', 'Rs ' + fmt(total)],
        unit: 'rupees',
        category: 'Dozen',
        difficulty: 'Moderate',
        shortcut: n + ' × ' + price + ' = ' + total + ' rupees.',
        explanation: n + ' dozen * ' + price + ' rupees/dozen = ' + total + ' rupees.',
        mentalPattern: 'Cost of N dozen at P/dozen = N × P.',
        commonMistake: 'Dividing P by N to get per-item price.',
        sourceType: 'generated',
      };
    } else {
      const n = rand(2, 8);
      const extra = rand(2, 11);
      const total = n * 12 + extra;
      return {
        question: 'A box contains ' + n + ' dozen ' + item + ' and ' + extra + ' extra ' + item + '. How many ' + item + ' are in the box?',
        correctAnswer: fmt(total),
        acceptedAnswers: [fmt(total)],
        unit: '',
        category: 'Dozen',
        difficulty: 'Hard',
        shortcut: (n * 12) + ' + ' + extra + ' = ' + total + '.',
        explanation: n + ' dozen = ' + (n * 12) + ' ' + item + '. Plus ' + extra + ' extras = ' + total + ' ' + item + '.',
        mentalPattern: 'Convert dozens to items first, then add the extras.',
        commonMistake: 'Adding dozens + extras as if both were counts of items.',
        sourceType: 'generated',
      };
    }
  }

  function genArea() {
    const kind = rand(0, 3);
    if (kind === 0) {
      const s = rand(5, 30);
      return {
        question: 'Find the area of a square with side ' + s + ' m.',
        correctAnswer: fmt(s * s),
        acceptedAnswers: [fmt(s * s), (s * s) + ' m2', (s * s) + ' sq m'],
        unit: 'm2',
        category: 'Area',
        difficulty: 'Easy',
        shortcut: s + '² = ' + (s * s) + '.',
        explanation: 'Square area = side × side = ' + s + ' × ' + s + ' = ' + (s * s) + ' m².',
        mentalPattern: 'Square area is just the side squared.',
        commonMistake: 'Doubling instead of squaring (perimeter confusion).',
        sourceType: 'generated',
      };
    } else if (kind === 1) {
      const l = rand(5, 25);
      const w = rand(4, l - 1);
      return {
        question: 'Find the area of a rectangle ' + l + ' m × ' + w + ' m.',
        correctAnswer: fmt(l * w),
        acceptedAnswers: [fmt(l * w), (l * w) + ' m2', (l * w) + ' sq m'],
        unit: 'm2',
        category: 'Area',
        difficulty: 'Easy',
        shortcut: l + ' × ' + w + ' = ' + (l * w) + '.',
        explanation: 'Rectangle area = length × width = ' + l + ' × ' + w + ' = ' + (l * w) + ' m².',
        mentalPattern: 'Rectangle area: only the two sides matter.',
        commonMistake: 'Adding sides (perimeter) instead of multiplying.',
        sourceType: 'generated',
      };
    } else if (kind === 2) {
      const b = rand(6, 30);
      const h = rand(6, 30);
      const bh = b * h;
      const ans = bh / 2;
      return {
        question: 'Find the area of a triangle with base ' + b + ' m and height ' + h + ' m.',
        correctAnswer: fmt(ans),
        acceptedAnswers: [fmt(ans), fmt(ans) + ' m2', fmt(ans) + ' sq m'],
        unit: 'm2',
        category: 'Area',
        difficulty: 'Moderate',
        shortcut: '1/2 × ' + b + ' × ' + h + ' = ' + fmt(ans) + '.',
        explanation: 'Triangle area = 1/2 × base × height = 1/2 × ' + b + ' × ' + h + ' = ' + fmt(ans) + ' m².',
        mentalPattern: 'Halve the product base × height.',
        commonMistake: 'Forgetting the 1/2 factor.',
        sourceType: 'generated',
      };
    } else {
      const r = pick([7, 14, 21, 28, 35, 42, 49]);
      const ans = 11 * r * r / 7;
      return {
        question: 'Find the area of a semicircle with radius ' + r + ' m. (Use π = 22/7.)',
        correctAnswer: fmt(ans),
        acceptedAnswers: [fmt(ans), fmt(ans) + ' m2', fmt(ans) + ' sq m'],
        unit: 'm2',
        category: 'Area',
        difficulty: 'Hard',
        shortcut: '1/2 × 22/7 × ' + r + '² = 11 × ' + (r * r) + ' / 7 = ' + fmt(ans) + '.',
        explanation: 'Semicircle area = 1/2 × π × r² = 1/2 × 22/7 × ' + (r * r) + ' = ' + fmt(ans) + ' m².',
        mentalPattern: 'With π = 22/7: area = (22/7 × r²) / 2 = 11 × r² / 7.',
        commonMistake: 'Forgetting the 1/2 factor for a semicircle.',
        sourceType: 'generated',
      };
    }
  }

  function genDmas() {
    const kind = rand(0, 2);
    if (kind === 0) {
      const a = rand(2, 15);
      const b = rand(3, 9);
      const c = rand(2, 9);
      const ans = a + b * c;
      return {
        question: 'Evaluate: ' + a + ' + ' + b + ' × ' + c,
        correctAnswer: fmt(ans),
        acceptedAnswers: [fmt(ans)],
        unit: '',
        category: 'DMAS Rule',
        difficulty: 'Easy',
        shortcut: b + ' × ' + c + ' = ' + (b * c) + '; ' + a + ' + ' + (b * c) + ' = ' + ans + '.',
        explanation: 'Apply DMAS: ' + b + ' × ' + c + ' = ' + (b * c) + ', then ' + a + ' + ' + (b * c) + ' = ' + ans + '.',
        mentalPattern: 'Do × and ÷ before + and −.',
        commonMistake: 'Doing (a + b) × c = left-to-right.',
        sourceType: 'generated',
      };
    } else if (kind === 1) {
      const c = pick([2, 3, 4, 5, 6]);
      const b = c * rand(2, 9);
      const a = rand(20, 100);
      const q = b / c;
      const ans = a - q;
      return {
        question: 'Evaluate: ' + a + ' − ' + b + ' ÷ ' + c,
        correctAnswer: fmt(ans),
        acceptedAnswers: [fmt(ans)],
        unit: '',
        category: 'DMAS Rule',
        difficulty: 'Easy',
        shortcut: b + ' ÷ ' + c + ' = ' + q + '; ' + a + ' − ' + q + ' = ' + ans + '.',
        explanation: 'Apply DMAS: ' + b + ' ÷ ' + c + ' = ' + q + ', then ' + a + ' − ' + q + ' = ' + ans + '.',
        mentalPattern: 'Do ÷ before −, even when − is on the left.',
        commonMistake: 'Left-to-right subtraction first.',
        sourceType: 'generated',
      };
    } else {
      const a = rand(2, 9);
      const b = rand(2, 9);
      const c = rand(2, 9);
      const ans = (a + b) * c;
      return {
        question: 'Evaluate: (' + a + ' + ' + b + ') × ' + c,
        correctAnswer: fmt(ans),
        acceptedAnswers: [fmt(ans)],
        unit: '',
        category: 'DMAS Rule',
        difficulty: 'Moderate',
        shortcut: '(' + a + ' + ' + b + ') × ' + c + ' = ' + (a + b) + ' × ' + c + ' = ' + ans + '.',
        explanation: 'Brackets first: ' + a + ' + ' + b + ' = ' + (a + b) + '; then ' + (a + b) + ' × ' + c + ' = ' + ans + '.',
        mentalPattern: 'Brackets first, then × and /, then + and −.',
        commonMistake: 'Forgetting the brackets and doing a + b × c.',
        sourceType: 'generated',
      };
    }
  }

  function genZakat() {
    const mult = pick([1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50]);
    const amount = 40 * mult;
    const zakat = amount / 40;
    return {
      question: 'What is the Zakat on ' + amount + ' rupees?',
      correctAnswer: fmt(zakat),
      acceptedAnswers: [fmt(zakat), fmt(zakat) + ' rupees', 'Rs ' + fmt(zakat)],
      unit: 'rupees',
      category: 'Zakat (2.5%)',
      difficulty: amount >= 10000 ? 'Moderate' : 'Easy',
      shortcut: amount + ' ÷ 40 = ' + zakat + '.',
      explanation: 'Zakat = 2.5% = 1/40 of the eligible amount. ' + amount + ' / 40 = ' + zakat + ' rupees.',
      mentalPattern: 'Zakat = amount ÷ 40 for any amount.',
      commonMistake: 'Dividing by 25 (which is 4%) instead of 40 (which is 2.5%).',
      sourceType: 'generated',
    };
  }

  function genProfitLoss() {
    const kind = rand(0, 3);
    if (kind === 0) {
      const cp = pick([100, 200, 250, 300, 400, 500, 800, 1000]);
      const pct = pick([10, 20, 25, 30, 50]);
      const sp = cp + (cp * pct / 100);
      return {
        question: 'Buy an item for ' + cp + ' rupees and sell it for ' + sp + ' rupees. What is the profit percentage?',
        correctAnswer: pct + '%',
        acceptedAnswers: [pct + '%', String(pct), pct + ' percent', pct + ' %'],
        unit: '%',
        category: 'Profit and Loss',
        difficulty: 'Easy',
        shortcut: 'Profit = ' + (sp - cp) + '. (' + (sp - cp) + '/' + cp + ') × 100 = ' + pct + '%.',
        explanation: 'Profit = SP − CP = ' + (sp - cp) + '. Profit % = (Profit/CP) × 100 = ' + pct + '%.',
        mentalPattern: 'Always take the percentage of the cost price.',
        commonMistake: 'Dividing profit by selling price (smaller wrong percentage).',
        sourceType: 'generated',
      };
    } else if (kind === 1) {
      const cp = pick([100, 200, 300, 400, 500]);
      const pct = pick([10, 20, 25, 50]);
      const sp = cp - (cp * pct / 100);
      return {
        question: 'Buy an item for ' + cp + ' rupees and sell it for ' + sp + ' rupees. What is the loss percentage?',
        correctAnswer: pct + '%',
        acceptedAnswers: [pct + '%', String(pct), pct + ' percent', pct + ' %'],
        unit: '%',
        category: 'Profit and Loss',
        difficulty: 'Easy',
        shortcut: 'Loss = ' + (cp - sp) + '. (' + (cp - sp) + '/' + cp + ') × 100 = ' + pct + '%.',
        explanation: 'Loss = CP − SP = ' + (cp - sp) + '. Loss % = (Loss/CP) × 100 = ' + pct + '%.',
        mentalPattern: 'Loss % is also computed against the cost price.',
        commonMistake: 'Dividing loss by selling price.',
        sourceType: 'generated',
      };
    } else if (kind === 2) {
      const cp = pick([100, 200, 300, 400, 500, 1000]);
      const pct = pick([10, 20, 25, 30, 50]);
      const sp = cp + (cp * pct / 100);
      return {
        question: 'Buy for ' + cp + ' rupees and sell at a ' + pct + '% profit. What is the selling price?',
        correctAnswer: fmt(sp),
        acceptedAnswers: [fmt(sp), fmt(sp) + ' rupees', 'Rs ' + fmt(sp)],
        unit: 'rupees',
        category: 'Profit and Loss',
        difficulty: 'Moderate',
        shortcut: 'SP = ' + cp + ' × (100 + ' + pct + ')/100 = ' + sp + '.',
        explanation: 'Profit amount = ' + cp + ' × ' + pct + '/100 = ' + (cp * pct / 100) + '. SP = ' + cp + ' + ' + (cp * pct / 100) + ' = ' + sp + '.',
        mentalPattern: 'SP = CP × (1 + percent/100) for a profit.',
        commonMistake: 'Subtracting the profit percent instead of adding.',
        sourceType: 'generated',
      };
    } else {
      const cp = pick([100, 200, 300, 400, 500, 1000]);
      const pct = pick([10, 20, 25, 50]);
      const sp = cp - (cp * pct / 100);
      return {
        question: 'Buy for ' + cp + ' rupees and sell at a ' + pct + '% loss. What is the selling price?',
        correctAnswer: fmt(sp),
        acceptedAnswers: [fmt(sp), fmt(sp) + ' rupees', 'Rs ' + fmt(sp)],
        unit: 'rupees',
        category: 'Profit and Loss',
        difficulty: 'Moderate',
        shortcut: 'SP = ' + cp + ' × (100 − ' + pct + ')/100 = ' + sp + '.',
        explanation: 'Loss amount = ' + cp + ' × ' + pct + '/100 = ' + (cp * pct / 100) + '. SP = ' + cp + ' − ' + (cp * pct / 100) + ' = ' + sp + '.',
        mentalPattern: 'SP = CP × (1 − percent/100) for a loss.',
        commonMistake: 'Adding the loss percent instead of subtracting.',
        sourceType: 'generated',
      };
    }
  }

  const GENERATORS = {
    'Speed':           [genSpeed],
    'Percentage':      [genPercentage],
    'Dozen':           [genDozen],
    'Area':            [genArea],
    'DMAS Rule':       [genDmas],
    'Zakat (2.5%)':    [genZakat],
    'Profit and Loss': [genProfitLoss],
  };

  function generateOne(category, difficulty) {
    if (category && !GENERATORS[category]) return null;
    const cats = category ? [category] : Object.keys(GENERATORS);
    const fn = pick(cats.map(c => pick(GENERATORS[c])));
    if (!fn) return null;
    const q = fn();
    if (!q) return null;
    if (difficulty && ['Easy', 'Moderate', 'Hard'].indexOf(difficulty) !== -1) q.difficulty = difficulty;
    q.id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    return q;
  }

  function generateMany(count, category, difficulty) {
    const list = [];
    let safety = 0;
    while (list.length < count && safety < count * 20) {
      const q = generateOne(category, difficulty);
      if (q) list.push(q);
      safety++;
    }
    return list;
  }

  window.Generator = { generateOne: generateOne, generateMany: generateMany };
})();
