import { prisma } from "../lib/prisma";

/**
 * Algorithmic question generator.
 * Each generator uses deterministic math — answer is derived from the question,
 * not pre-stored. This guarantees mathematical correctness.
 */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface GeneratedQuestion {
  text: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  unit: string | null;
  categorySlug: string;
  difficulty: string;
  shortcut: string;
  explanation: string;
  mentalPattern: string;
  commonMistake: string;
  patternKey: string;
}

const generators: Record<string, () => GeneratedQuestion> = {
  percentage_of: () => {
    const base = randInt(50, 800);
    const percentages = [10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 12.5, 7.5];
    const pct = pick(percentages);
    const answer = (base * pct) / 100;

    // Build shortcut
    let shortcut: string;
    if (pct === 10) shortcut = `10% of ${base} = ${base / 10}`;
    else if (pct === 5) shortcut = `5% of ${base} = ${base / 20}`;
    else if (pct === 12.5) shortcut = `12.5% = 1/8. ${base} ÷ 8 = ${answer}`;
    else if (pct === 7.5) shortcut = `7.5% of ${base} = (${pct} × ${base})/100 = ${answer}`;
    else if (pct % 10 === 0 && pct > 10) shortcut = `${pct / 10} × 10% of ${base} = ${(pct / 10) * (base / 10)}`;
    else if (pct === 15) shortcut = `10% of ${base} = ${base / 10}, 5% = ${base / 20}, total = ${answer}`;
    else if (pct === 35) shortcut = `30% of ${base} = ${(30 * base) / 100}, 5% = ${(5 * base) / 100}, total = ${answer}`;
    else shortcut = `${pct}% of ${base} = ${answer}`;

    return {
      text: `What is ${pct}% of ${base}?`,
      correctAnswer: String(answer),
      acceptedAnswers: [String(answer), Number(answer).toFixed(2).replace(/\.?0+$/, "")],
      unit: null,
      categorySlug: "percentages",
      difficulty: pct === 7.5 || pct === 12.5 ? "Hard" : pct >= 50 ? "Medium" : "Easy",
      shortcut,
      explanation: `${pct}% = ${pct}/100. So ${pct}% of ${base} = (${pct} × ${base})/100 = ${answer}.`,
      mentalPattern: "Break percentage into 10%, 5%, 12.5% chunks. 12.5% = 1/8.",
      commonMistake: "Long multiplication instead of using percentage shortcuts.",
      patternKey: "percentage_basic",
    };
  },

  percentage_reverse: () => {
    const pct = pick([20, 25, 30, 40, 50, 60, 75]);
    const result = randInt(20, 200) * (pct / 100);
    const base = (result * 100) / pct;
    return {
      text: `${pct}% of a number is ${result}. What is the number?`,
      correctAnswer: String(base),
      acceptedAnswers: [String(base)],
      unit: null,
      categorySlug: "percentages",
      difficulty: "Hard",
      shortcut: `If ${pct}% = ${result}, then 1% = ${result / pct}, so 100% = ${(result / pct) * 100}.`,
      explanation: `Divide by the percentage: ${result} ÷ ${pct}% = ${result} × 100/${pct} = ${base}.`,
      mentalPattern: "Reverse percentage: divide the part by the percentage fraction.",
      commonMistake: "Multiplying instead of dividing.",
      patternKey: "percentage_reverse",
    };
  },

  speed_distance_time: () => {
    const speed = pick([60, 72, 90, 108, 45, 36]);
    const minutes = pick([10, 15, 20, 30, 45]);
    const distance = (speed * minutes) / 60;
    return {
      text: `A vehicle moves at ${speed} km/h. How many kilometers will it cover in ${minutes} minutes?`,
      correctAnswer: String(distance),
      acceptedAnswers: [String(distance), `${distance} km`],
      unit: "km",
      categorySlug: "speed-distance-time",
      difficulty: minutes % 15 === 0 ? "Easy" : "Medium",
      shortcut: `${minutes} minutes = ${minutes}/60 = 1/${60 / minutes} hour. ${speed} ÷ ${60 / minutes} = ${distance}.`,
      explanation: `Distance = Speed × Time. Time = ${minutes}/60 = 1/${60 / minutes} hour. Distance = ${speed} × 1/${60 / minutes} = ${distance} km.`,
      mentalPattern: "Convert minutes to fraction of hour, then multiply or divide.",
      commonMistake: "Forgetting to convert minutes to hours.",
      patternKey: "speed_distance_minutes",
    };
  },

  unit_speed_convert: () => {
    const kmh = pick([18, 36, 54, 72, 90, 108]);
    const ms = (kmh * 5) / 18;
    return {
      text: `A car moves at ${kmh} km/h. Change this speed into meters per second.`,
      correctAnswer: String(ms),
      acceptedAnswers: [String(ms), `${ms} m/s`],
      unit: "m/s",
      categorySlug: "unit-conversion",
      difficulty: "Medium",
      shortcut: `km/h to m/s: × 5/18. ${kmh} × 5/18 = ${ms}.`,
      explanation: `1 km/h = 5/18 m/s. So ${kmh} km/h = ${kmh} × 5/18 = ${ms} m/s.`,
      mentalPattern: "km/h × 5/18 = m/s. Common: 18→5, 36→10, 54→15, 72→20, 90→25, 108→30.",
      commonMistake: "Multiplying by 18/5 instead of 5/18.",
      patternKey: "unit_speed",
    };
  },

  unit_speed_reverse: () => {
    const ms = pick([5, 10, 15, 20, 25, 30]);
    const kmh = (ms * 18) / 5;
    return {
      text: `A car moves at ${ms} m/s. What is its speed in km/h?`,
      correctAnswer: String(kmh),
      acceptedAnswers: [String(kmh), `${kmh} km/h`],
      unit: "km/h",
      categorySlug: "unit-conversion",
      difficulty: "Medium",
      shortcut: `m/s to km/h: × 18/5. ${ms} × 18/5 = ${kmh}.`,
      explanation: `1 m/s = 18/5 km/h = 3.6 km/h. So ${ms} m/s = ${ms} × 3.6 = ${kmh} km/h.`,
      mentalPattern: "m/s to km/h: × 3.6 (or × 18/5).",
      commonMistake: "Multiplying by 3.6 incorrectly.",
      patternKey: "unit_speed",
    };
  },

  profit_loss: () => {
    const cost = randInt(200, 900);
    const pct = pick([10, 15, 20, 25, 30]);
    const isProfit = Math.random() < 0.5;
    const change = (cost * pct) / 100;
    const final = isProfit ? cost + change : cost - change;
    return {
      text: `A person bought an item for ${cost} and sold it at a ${pct}% ${isProfit ? "profit" : "loss"}. What was the selling price?`,
      correctAnswer: String(final),
      acceptedAnswers: [String(final)],
      unit: null,
      categorySlug: "profit-loss",
      difficulty: "Easy",
      shortcut: `${pct}% of ${cost} = ${change}. ${isProfit ? "Add" : "Subtract"}: ${cost} ${isProfit ? "+" : "-"} ${change} = ${final}.`,
      explanation: `${pct}% of ${cost} = ${change}. Selling price = ${cost} ${isProfit ? "+" : "-"} ${change} = ${final}.`,
      mentalPattern: "Calculate percentage of cost, then add (profit) or subtract (loss).",
      commonMistake: "Adding instead of subtracting for loss.",
      patternKey: isProfit ? "profit" : "loss",
    };
  },

  average_basic: () => {
    const a = randInt(10, 90);
    const b = randInt(10, 90);
    const c = randInt(10, 90);
    const d = randInt(10, 90);
    const avg = (a + b + c + d) / 4;
    return {
      text: `Find the average of these four numbers: ${a}, ${b}, ${c}, and ${d}.`,
      correctAnswer: String(avg),
      acceptedAnswers: [String(avg)],
      unit: null,
      categorySlug: "averages",
      difficulty: "Easy",
      shortcut: `Sum = ${a + b + c + d}. Divide by 4 = ${avg}.`,
      explanation: `Sum = ${a} + ${b} + ${c} + ${d} = ${a + b + c + d}. Average = ${a + b + c + d} ÷ 4 = ${avg}.`,
      mentalPattern: "Average = Sum ÷ Count.",
      commonMistake: "Forgetting one number in the sum.",
      patternKey: "average_basic",
    };
  },

  ratio_division: () => {
    const r1 = randInt(2, 7);
    const r2 = randInt(2, 7);
    const unit = randInt(5, 15);
    const total = (r1 + r2) * unit;
    const bigger = r1 > r2 ? r1 : r2;
    const biggerPart = bigger * unit;
    return {
      text: `A rope ${total} cm long is divided into two pieces in the ratio ${r1}:${r2}. What is the length of the larger piece?`,
      correctAnswer: String(biggerPart),
      acceptedAnswers: [String(biggerPart), `${biggerPart} cm`],
      unit: "cm",
      categorySlug: "ratios-proportions",
      difficulty: "Medium",
      shortcut: `Total parts = ${r1 + r2}. Each part = ${total} ÷ ${r1 + r2} = ${unit}. Larger = ${bigger} × ${unit} = ${biggerPart}.`,
      explanation: `Total parts = ${r1} + ${r2} = ${r1 + r2}. Each part = ${total}/${r1 + r2} = ${unit}. Larger piece = ${bigger} × ${unit} = ${biggerPart} cm.`,
      mentalPattern: "Total parts method: sum ratio, find unit value, multiply.",
      commonMistake: "Confusing which part is larger.",
      patternKey: "ratio_division",
    };
  },

  unit_price: () => {
    const items = randInt(3, 12);
    const cost = items * randInt(8, 25);
    const unit = cost / items;
    const target = randInt(3, 15);
    const total = target * unit;
    return {
      text: `If ${items} notebooks cost ${cost}, what is the cost of ${target} notebooks?`,
      correctAnswer: String(total),
      acceptedAnswers: [String(total)],
      unit: null,
      categorySlug: "ratios-proportions",
      difficulty: "Easy",
      shortcut: `One notebook = ${cost} ÷ ${items} = ${unit}. ${target} notebooks = ${target} × ${unit} = ${total}.`,
      explanation: `Unit price = ${cost}/${items} = ${unit}. Cost of ${target} = ${target} × ${unit} = ${total}.`,
      mentalPattern: "Find unit price, then multiply.",
      commonMistake: "Proportion cross-multiplication error.",
      patternKey: "unit_price",
    };
  },

  multiply_11: () => {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const num = a * 10 + b;
    const product = num * 11;
    return {
      text: `Multiply quickly: ${num} × 11.`,
      correctAnswer: String(product),
      acceptedAnswers: [String(product)],
      unit: null,
      categorySlug: "mental-multiplication",
      difficulty: "Easy",
      shortcut: `Place the digit sum between the digits: ${a} + ${b} = ${a + b} → ${product}.`,
      explanation: `For 2-digit × 11: add the digits and place between. ${a}(${a}+${b})${b} = ${a}${a + b}${b} = ${product}.`,
      mentalPattern: "Two-digit × 11: add digits and place between them.",
      commonMistake: "Carrying over incorrectly when digit sum is ≥ 10.",
      patternKey: "multiply_by_11",
    };
  },

  fraction_subtraction: () => {
    const d1 = pick([3, 4, 5, 6, 8]);
    const d2 = pick([3, 4, 5, 6, 8]);
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const num = n1 * d2 - n2 * d1;
    if (num <= 0) return generators.fraction_subtraction();
    const den = d1 * d2;
    return {
      text: `Solve: ${n1}/${d1} - ${n2}/${d2}.`,
      correctAnswer: `${num}/${den}`,
      acceptedAnswers: [`${num}/${den}`, String(num / den)],
      unit: null,
      categorySlug: "fractions",
      difficulty: "Medium",
      shortcut: `Cross multiply: ${n1}×${d2} - ${n2}×${d1} = ${n1 * d2} - ${n2 * d1} = ${num}. Denominator = ${d1}×${d2} = ${den}.`,
      explanation: `Common denominator: ${d1 * d2}. ${n1}/${d1} = ${n1 * d2}/${d1 * d2}, ${n2}/${d2} = ${n2 * d1}/${d1 * d2}. Difference = ${num}/${den}.`,
      mentalPattern: "Butterfly method: cross-multiply to subtract fractions.",
      commonMistake: "Subtracting denominators instead of finding common denominator.",
      patternKey: "fraction_subtraction",
    };
  },

  bodmas: () => {
    const a = randInt(20, 80);
    const b = randInt(2, 8);
    const c = randInt(2, 5);
    const d = randInt(2, 10);
    const answer = a - b * c + d;
    return {
      text: `Solve: ${a} - ${b} × ${c} + ${d}.`,
      correctAnswer: String(answer),
      acceptedAnswers: [String(answer)],
      unit: null,
      categorySlug: "basic-arithmetic",
      difficulty: "Easy",
      shortcut: `Multiplication first: ${b} × ${c} = ${b * c}. Then ${a} - ${b * c} + ${d} = ${answer}.`,
      explanation: `BODMAS: ${b} × ${c} = ${b * c}. Then ${a} - ${b * c} + ${d} = ${answer}.`,
      mentalPattern: "BODMAS: multiplication before addition/subtraction.",
      commonMistake: "Operating left to right ignoring BODMAS.",
      patternKey: "bodmas",
    };
  },

  pipes_combined: () => {
    const a = randInt(3, 8);
    const b = randInt(a + 2, 16);
    const time = (a * b) / (a + b);
    return {
      text: `Pipe A fills a tank in ${a} hours, and Pipe B fills it in ${b} hours. If both pipes are open together, how many hours will they take to fill the tank?`,
      correctAnswer: String(time),
      acceptedAnswers: [String(time), `${time} hours`],
      unit: "hours",
      categorySlug: "pipes-tanks",
      difficulty: "Hard",
      shortcut: `Product over sum: (${a} × ${b})/(${a} + ${b}) = ${a * b}/${a + b} = ${time}.`,
      explanation: `Combined rate = 1/${a} + 1/${b} = ${b + a}/${a * b}. Time = ${a * b}/${a + b} = ${time} hours.`,
      mentalPattern: "Two pipes: time = (a × b)/(a + b).",
      commonMistake: "Averaging the times: (a + b)/2.",
      patternKey: "pipes_combined",
    };
  },

  work_together: () => {
    const a = randInt(6, 20);
    const b = randInt(a + 2, 30);
    const time = (a * b) / (a + b);
    return {
      text: `Worker A can do a task in ${a} days, and Worker B can do it in ${b} days. In how many days can they complete it together?`,
      correctAnswer: String(time),
      acceptedAnswers: [String(time), `${time} days`],
      unit: "days",
      categorySlug: "work-time",
      difficulty: "Hard",
      shortcut: `Product over sum = (${a} × ${b})/(${a} + ${b}) = ${a * b}/${a + b} = ${time}.`,
      explanation: `Combined rate = 1/${a} + 1/${b} = ${a + b}/${a * b}. Time = ${a * b}/${a + b} = ${time} days.`,
      mentalPattern: "Two workers: time = (a × b)/(a + b).",
      commonMistake: "Averaging the days instead of computing rates.",
      patternKey: "work_together",
    };
  },

  man_days: () => {
    const men1 = randInt(4, 12);
    const days1 = randInt(10, 30);
    const total = men1 * days1;
    const men2 = randInt(men1 + 2, 24);
    const days2 = total / men2;
    if (!Number.isInteger(days2)) return generators.man_days();
    return {
      text: `${men1} men can finish a work in ${days1} days. How many days will ${men2} men take to finish the same work?`,
      correctAnswer: String(days2),
      acceptedAnswers: [String(days2), `${days2} days`],
      unit: "days",
      categorySlug: "work-time",
      difficulty: "Medium",
      shortcut: `Total work = ${men1} × ${days1} = ${total} man-days. ${total} ÷ ${men2} = ${days2}.`,
      explanation: `Work = men × days = ${men1} × ${days1} = ${total}. New days = ${total}/${men2} = ${days2}.`,
      mentalPattern: "Man-days: total work is constant. More men = fewer days.",
      commonMistake: "Proportion cross-multiplication error.",
      patternKey: "man_days",
    };
  },

  age_ratio: () => {
    const r = randInt(2, 5);
    const son = randInt(8, 15);
    const total = son * (r + 1);
    const father = son * r;
    return {
      text: `A father is ${r} times older than his son. The sum of their ages is ${total} years. What is the age of the son?`,
      correctAnswer: String(son),
      acceptedAnswers: [String(son), `${son} years`],
      unit: "years",
      categorySlug: "age-problems",
      difficulty: "Medium",
      shortcut: `${r} + 1 = ${r + 1} parts. ${total} ÷ ${r + 1} = ${son}.`,
      explanation: `Let son's age = x, father's = ${r}x. x + ${r}x = ${total}, so ${r + 1}x = ${total}, x = ${son}.`,
      mentalPattern: "Convert ratio into total parts, then divide.",
      commonMistake: "Dividing by ${r} instead of ${r + 1}.",
      patternKey: "age_ratio",
    };
  },

  discount: () => {
    const price = randInt(200, 1000);
    const pct = pick([10, 15, 20, 25, 30, 40]);
    const final = price - (price * pct) / 100;
    return {
      text: `The price of an item is ${price}. If you get a ${pct}% discount, what is the final price?`,
      correctAnswer: String(final),
      acceptedAnswers: [String(final)],
      unit: null,
      categorySlug: "profit-loss",
      difficulty: "Easy",
      shortcut: `${pct}% of ${price} = ${(price * pct) / 100}. ${price} - ${(price * pct) / 100} = ${final}.`,
      explanation: `Discount = ${pct}% × ${price} = ${(price * pct) / 100}. Final = ${price} - ${(price * pct) / 100} = ${final}.`,
      mentalPattern: "Discount = percentage × original. Final = original - discount.",
      commonMistake: "Adding discount instead of subtracting.",
      patternKey: "discount",
    };
  },

  train_pole: () => {
    const speed = pick([54, 72, 90, 108]);
    const ms = (speed * 5) / 18;
    const time = randInt(5, 20);
    const length = ms * time;
    return {
      text: `A ${length}-meter-long train is moving at ${speed} km/h. How many seconds will it take to pass a pole?`,
      correctAnswer: String(time),
      acceptedAnswers: [String(time), `${time} s`],
      unit: "s",
      categorySlug: "speed-distance-time",
      difficulty: "Hard",
      shortcut: `${speed} km/h = ${ms} m/s. ${length} ÷ ${ms} = ${time}.`,
      explanation: `Convert ${speed} km/h to m/s: ${ms} m/s. Time = ${length} ÷ ${ms} = ${time} s.`,
      mentalPattern: "km/h to m/s: × 5/18. Pole = train length only.",
      commonMistake: "Forgetting to convert km/h to m/s.",
      patternKey: "train_pole",
    };
  },

  percentage_increase: () => {
    const old = randInt(20, 100);
    const inc = pick([10, 20, 25, 50]);
    const newVal = old + inc;
    const pct = (inc / old) * 100;
    if (pct !== Math.round(pct)) return generators.percentage_increase();
    return {
      text: `A quantity increases from ${old} to ${newVal}. What is the percentage increase?`,
      correctAnswer: String(pct),
      acceptedAnswers: [String(pct), `${pct}%`],
      unit: "%",
      categorySlug: "percentages",
      difficulty: "Medium",
      shortcut: `Increase = ${inc}. ${inc}/${old} × 100 = ${pct}%.`,
      explanation: `% increase = (change/original) × 100 = (${inc}/${old}) × 100 = ${pct}%.`,
      mentalPattern: "% change = (change/original) × 100.",
      commonMistake: "Dividing by new value instead of original.",
      patternKey: "percentage_increase",
    };
  },
};

export function generateQuestion(categorySlug?: string): GeneratedQuestion {
  let pool: (() => GeneratedQuestion)[] = [];
  switch (categorySlug) {
    case "percentages":
      pool = [generators.percentage_of, generators.percentage_reverse, generators.percentage_increase];
      break;
    case "speed-distance-time":
      pool = [generators.speed_distance_time, generators.train_pole];
      break;
    case "unit-conversion":
      pool = [generators.unit_speed_convert, generators.unit_speed_reverse];
      break;
    case "profit-loss":
      pool = [generators.profit_loss, generators.discount];
      break;
    case "averages":
      pool = [generators.average_basic];
      break;
    case "ratios-proportions":
      pool = [generators.ratio_division, generators.unit_price];
      break;
    case "mental-multiplication":
      pool = [generators.multiply_11];
      break;
    case "fractions":
      pool = [generators.fraction_subtraction];
      break;
    case "basic-arithmetic":
      pool = [generators.bodmas];
      break;
    case "pipes-tanks":
      pool = [generators.pipes_combined];
      break;
    case "work-time":
      pool = [generators.work_together, generators.man_days];
      break;
    case "age-problems":
      pool = [generators.age_ratio];
      break;
    default:
      pool = [
        generators.percentage_of,
        generators.speed_distance_time,
        generators.unit_speed_convert,
        generators.profit_loss,
        generators.average_basic,
        generators.ratio_division,
        generators.unit_price,
        generators.multiply_11,
        generators.fraction_subtraction,
        generators.bodmas,
      ];
  }
  return pick(pool)();
}

export async function generateAndStoreQuestion(categorySlug?: string) {
  const gen = generateQuestion(categorySlug);
  const cat = await prisma.category.findUnique({ where: { slug: gen.categorySlug } });
  if (!cat) throw new Error("Category not found");

  const created = await prisma.question.create({
    data: {
      text: gen.text,
      correctAnswer: gen.correctAnswer,
      acceptedAnswers: JSON.stringify(gen.acceptedAnswers),
      unit: gen.unit,
      categoryId: cat.id,
      difficulty: gen.difficulty,
      shortcut: gen.shortcut,
      explanation: gen.explanation,
      mentalPattern: gen.mentalPattern,
      commonMistake: gen.commonMistake,
      sourceType: "generated",
      patternKey: gen.patternKey,
    },
    include: { category: true },
  });
  return created;
}
