(function () {
  'use strict';
  const PATTERNS = [
    { id:'percentage-chunks', title:'Percentage shortcuts', items:['10% rule: shift the decimal one place.','5% rule: half of 10%.','12.5% = 1/8. Divide by 8.','25% = 1/4. 50% = 1/2. 75% = 3/4.','15% = 10% + 5%. 35% = 30% + 5%.'] },
    { id:'speed-conversion', title:'Speed conversion (km/h <-> m/s)', items:['18 km/h = 5 m/s','36 km/h = 10 m/s','54 km/h = 15 m/s','72 km/h = 20 m/s','90 km/h = 25 m/s','km/h -> m/s: x 5/18.   m/s -> km/h: x 3.6.'] },
    { id:'time-fractions', title:'Time fractions of an hour', items:['6 min = 1/10 hour','10 min = 1/6 hour','12 min = 1/5 hour','15 min = 1/4 hour','20 min = 1/3 hour','30 min = 1/2 hour'] },
    { id:'ratio-total-parts', title:'Ratios: total parts method', items:['Add the parts to get total parts.','Divide the whole by total parts.','Multiply each part by the per-part value.'] },
    { id:'work-man-days', title:'Work: man-days', items:['Work = number of workers x number of days.','Total work is constant across the same job.','Days = total work / workers.'] },
    { id:'pipes-product-sum', title:'Pipes: product over sum', items:['Two independent pipes: time = (a x b) / (a + b).','Example: 4h and 12h -> (4x12)/(4+12) = 3 hours.'] },
    { id:'profit-loss', title:'Profit and loss', items:['Profit % = (Profit / Cost Price) x 100.','Loss % = (Loss / Cost Price) x 100.','Always divide by cost price, not selling price.'] },
    { id:'discount', title:'Discount', items:['Final price = Original x (1 - discount%).','Or: subtract the discount from the original.'] },
    { id:'average', title:'Averages', items:['Average = sum / count.','Consecutive numbers: the average is the middle value.','Equal time intervals: average speed = mean of speeds.'] },
    { id:'fraction-butterfly', title:'Fractions: butterfly method', items:['a/b - c/d: numerator = axd - cxb, denominator = bxd.','Always simplify at the end.'] },
    { id:'eleven-trick', title:'x 11 trick (two-digit)', items:['Take the two digits, place their sum in between.','If the sum is two digits, carry the 1.','Example: 47 x 11 = 4_(4+7)_7 = 517.'] },
    { id:'opposite-direction', title:'Relative speed', items:['Opposite directions: add speeds.','Same direction: subtract speeds.','Time to meet = initial distance / relative speed.'] }
  ];
  function search(q) { if(!q) return PATTERNS; const term = q.toLowerCase(); return PATTERNS.filter(p => p.title.toLowerCase().includes(term) || p.items.some(it => it.toLowerCase().includes(term))); }
  function linkableQuestions() { const out = {}; for (const q of (window.QUESTIONS || [])) { if(!out[q.category]) out[q.category] = []; out[q.category].push(q); } return out; }
  window.Patterns = { list: PATTERNS, search, linkableQuestions };
})();
