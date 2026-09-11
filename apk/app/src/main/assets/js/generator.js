(function () {
  'use strict';
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];
  function fmt(n) { if (Number.isInteger(n)) return String(n); return String(parseFloat(n.toFixed(3))); }
  function genPercentOf() {
    const variant = pick([1,2,3]);
    let p, n, ans, shortcut, explanation, difficulty, commonMistake;
    if (variant === 1) { p = pick([10,20,25,30,40,50,75,100]); n = pick([60,80,120,150,200,240,400,500,800,1000]); ans = (p/100)*n; shortcut = p+'% = '+(p/100)+' × '+n+' = '+fmt(ans); explanation = p+'% of '+n+' = ('+p+'/100) × '+n+' = '+fmt(ans)+'.'; difficulty = "Easy"; commonMistake = "Multiplying n × 0.0p with long arithmetic."; }
    else if (variant === 2) { p = pick([15,5,35,45,60,80,90]); n = pick([80,120,200,240,320,400,600,800]); ans = (p/100)*n; shortcut = '10% = '+fmt(0.1*n)+', 5% = '+fmt(0.05*n)+'. Adjust and add.'; explanation = 'Break '+p+'% into 10% chunks and combine. Result = '+fmt(ans)+'.'; difficulty = "Medium"; commonMistake = "Dividing instead of multiplying."; }
    else { p = pick([12.5,7.5,17.5,22.5,2.5,250,150,125]); n = pick([80,160,200,240,320,400,800,1000]); ans = (p/100)*n; let note=""; if(p===12.5)note="12.5% = 1/8. "; else if(p===7.5)note="7.5% = 3/40. "; shortcut = note+n+' × '+(p/100)+' = '+fmt(ans)+'.'; explanation = p+'% of '+n+' = '+fmt(ans)+'.'; difficulty = (p===250||p===150) ? "Medium" : "Hard"; commonMistake = "Long decimal multiplication."; }
    return { question:'What is '+p+'% of '+n+'?', correctAnswer:fmt(ans), acceptedAnswers:[], unit:'', category:'Percentages', difficulty, shortcut, explanation, mentalPattern:"10% chunks, special fractions (12.5% = 1/8, 7.5% = 3/40), or direct multiplication.", commonMistake, sourceType:'generated' };
  }
  function genSpeedDistanceTime() {
    const t = pick([15,20,30,45,6,10,12]); const v = pick([60,90,120,180,240,300,450,600,72,54]); const d = (v*t)/60;
    return { question:'A vehicle moves at '+v+' km/h. How many kilometers does it cover in '+t+' minutes?', correctAnswer:fmt(d), acceptedAnswers:[fmt(d)+' km'], unit:'km', category:'Speed Distance Time', difficulty: t<=12?'Medium':'Easy', shortcut:t+' min = '+t+'/60 hour = '+fmt(t/60)+' h. '+v+' × '+fmt(t/60)+' = '+fmt(d)+'.', explanation:'Distance = Speed × Time = '+v+' × ('+t+'/60) = '+fmt(d)+' km.', mentalPattern:"Convert minutes to a fraction of an hour, then multiply.", commonMistake:"Multiplying speed by minutes instead of hours.", sourceType:'generated' };
  }
  function genFractionOf() {
    const n = pick([40,60,80,100,120,144,200,240,360]); const fd = pick([[1,4],[3,4],[1,5],[2,5],[3,5],[1,8],[3,8],[5,8],[7,8]]); const num=fd[0], den=fd[1]; const ans = (num/den)*n;
    return { question:'What is '+num+'/'+den+' of '+n+'?', correctAnswer:fmt(ans), acceptedAnswers:[], unit:'', category:'Fractions', difficulty: den<=5?'Easy':'Medium', shortcut:num+'/'+den+' of '+n+' = ('+num+' × '+n+') / '+den+' = '+fmt(ans)+'.', explanation:'Multiply n by num, then divide by den.', mentalPattern:"Multiply first, then divide. Cancel if possible.", commonMistake:"Dividing first by the larger number.", sourceType:'generated' };
  }
  function genUnitPrice() {
    const qty = pick([4,5,6,8,10,12,15,20]); const unit = pick([10,12,15,20,25,30,40,50]); const total = qty*unit; const newQty = pick([3,5,7,9,11,14,16,18,24]); const newTotal = newQty*unit;
    return { question:'If '+qty+' items cost '+total+', what is the cost of '+newQty+' items?', correctAnswer:fmt(newTotal), acceptedAnswers:[], unit:'', category:'Ratios Proportions', difficulty:'Easy', shortcut:'1 item = '+unit+'. '+newQty+' × '+unit+' = '+fmt(newTotal)+'.', explanation:'Unit price = '+total+'/'+qty+' = '+unit+'. '+newQty+' × '+unit+' = '+fmt(newTotal)+'.', mentalPattern:"Find the unit price first, then multiply.", commonMistake:"Cross-multiplying without simplifying.", sourceType:'generated' };
  }
  function genProfitLoss() {
    const cp = pick([200,300,400,500,600,800,1000,1200]); const pct = pick([10,15,20,25,30,40,50]); const isProfit = Math.random()<0.5; const sp = isProfit ? cp + (cp*pct/100) : cp - (cp*pct/100);
    return { question: isProfit ? 'A shopkeeper bought an item for '+cp+' and sold it at a '+pct+'% profit. What is the selling price?' : 'A shopkeeper bought an item for '+cp+' and sold it at a '+pct+'% loss. What is the selling price?', correctAnswer:fmt(sp), acceptedAnswers:[], unit:'', category:'Profit Loss', difficulty: pct<=25?'Easy':'Medium', shortcut:pct+'% of '+cp+' = '+fmt(cp*pct/100)+'. '+(isProfit?'Add to':'Subtract from')+' '+cp+' = '+fmt(sp)+'.', explanation: isProfit?'Profit = '+pct+'% of '+cp+' = '+fmt(cp*pct/100)+'. SP = '+cp+' + profit = '+fmt(sp)+'.':'Loss = '+pct+'% of '+cp+' = '+fmt(cp*pct/100)+'. SP = '+cp+' - loss = '+fmt(sp)+'.', mentalPattern:"Profit/Loss % is always on the cost price. Find that amount, then add or subtract.", commonMistake:"Using the selling price as the base for the percentage.", sourceType:'generated' };
  }
  function genPipes() {
    const a = pick([3,4,5,6,8,10,12]); let b = pick([6,8,10,12,15,20,24]); while (b===a) b = pick([6,8,10,12,15,20,24]); const ans = (a*b)/(a+b);
    return { question:'Pipe A fills a tank in '+a+' hours and Pipe B fills it in '+b+' hours. If both pipes are open together, how many hours will they take?', correctAnswer:fmt(ans), acceptedAnswers:[fmt(ans)+' hours'], unit:'hours', category:'Pipes Tanks', difficulty:'Medium', shortcut:'Product over sum = ('+a+' × '+b+') / ('+a+' + '+b+') = '+fmt(ans)+'.', explanation:'Combined rate = 1/'+a+' + 1/'+b+' = '+(a+b)/(a*b)+' tank/h. Time = 1 / combined rate = '+fmt(ans)+' hours.', mentalPattern:"Two pipes: (a × b) / (a + b).", commonMistake:"Averaging the two times instead of using the formula.", sourceType:'generated' };
  }
  function genKmhToMs() {
    const known = [18,36,54,72,90,108,126,144]; const v = pick(known); const ms = (v*5)/18;
    return { question:'Convert '+v+' km/h into meters per second.', correctAnswer:fmt(ms), acceptedAnswers:[fmt(ms)+' m/s'], unit:'m/s', category:'Unit Conversion', difficulty: v%36===0?'Easy':'Medium', shortcut:v+' × (5/18) = '+fmt(ms)+' m/s. (Or '+v+'/18 × 5.)', explanation:'km/h -> m/s: multiply by 5/18. '+v+' × 5/18 = '+fmt(ms)+' m/s.', mentalPattern:"Memorize 18 km/h = 5 m/s. Scale the 5 accordingly.", commonMistake:"Multiplying by 18/5 instead of 5/18.", sourceType:'generated' };
  }
  function genMsToKmh() {
    const known = [5,10,15,20,25,30,35,40]; const m = pick(known); const kmh = m*3.6;
    return { question:'Convert '+m+' m/s into km/h.', correctAnswer:fmt(kmh), acceptedAnswers:[fmt(kmh)+' km/h'], unit:'km/h', category:'Unit Conversion', difficulty:'Easy', shortcut:m+' × 3.6 = '+fmt(kmh)+' km/h.', explanation:'m/s -> km/h: multiply by 3.6. '+m+' × 3.6 = '+fmt(kmh)+'.', mentalPattern:"10 m/s = 36 km/h. Scale.", commonMistake:"Multiplying by 18/5 instead of 3.6.", sourceType:'generated' };
  }
  function genMultiplyBy11() {
    const a = rand(12,89); const tens=Math.floor(a/10); const units=a%10; const sum=tens+units; let middle=String(sum); let extra=0; if(sum>=10){extra=1;middle=String(sum-10);} const ans = (tens+extra)*100 + parseInt(middle,10)*10 + units;
    return { question:'Multiply quickly: '+a+' × 11', correctAnswer:fmt(ans), acceptedAnswers:[], unit:'', category:'Mental Multiplication', difficulty: sum>=10?'Medium':'Easy', shortcut:'Insert sum of digits ('+tens+'+'+units+'='+sum+') between '+tens+' and '+units+' -> '+ans+'.', explanation:'Two-digit × 11: place the sum of the digits between them. Carry if sum >= 10.', mentalPattern:"n × 11: digits of n with their sum in the middle.", commonMistake:"Forgetting to carry when the digit sum is two-digit.", sourceType:'generated' };
  }
  function genDecimalMultiply() {
    const a = parseFloat((rand(2,9)/10).toFixed(1)); const b = parseFloat((rand(2,9)/10).toFixed(1)); const ans = parseFloat((a*b).toFixed(3));
    return { question:'Multiply: '+a+' × '+b, correctAnswer:fmt(ans), acceptedAnswers:[], unit:'', category:'Decimals', difficulty:'Easy', shortcut:'Digits '+Math.round(a*10)+' × '+Math.round(b*10)+' = '+Math.round(a*10)*Math.round(b*10)+', then place 3 decimals -> '+fmt(ans)+'.', explanation:a+' × '+b+' = '+ans+'.', mentalPattern:"Ignore decimals, count places at the end.", commonMistake:"Miscounting decimal places.", sourceType:'generated' };
  }
  function genAgeProblem() {
    const k = pick([2,3,4,5]); const son = pick([6,7,8,9,10,12]); const total = son*(k+1);
    return { question:'A father is '+k+' times older than his son. The sum of their ages is '+total+' years. What is the son\'s age?', correctAnswer:fmt(son), acceptedAnswers:[son+' years'], unit:'years', category:'Age Problems', difficulty: k===2?'Easy':'Medium', shortcut:k+' + 1 = '+(k+1)+' parts. '+total+' / '+(k+1)+' = '+son+'.', explanation:'Let son = x. Father = '+k+'x. x + '+k+'x = '+total+' -> '+(k+1)+'x = '+total+' -> x = '+son+'.', mentalPattern:"Total parts method — split the whole into (k + 1) parts.", commonMistake:"Dividing the total by k instead of k+1.", sourceType:'generated' };
  }
  function genRatio(depth) {
    // depth guards against unbounded recursion if the value sets ever change.
    if (depth === undefined) depth = 0;
    const total = pick([24,32,36,40,48,56,64,72,80,96]); const a = pick([2,3,4,5]); let b = pick([1,2,3,4,5]); while(b===a) b = pick([1,2,3,4,5]); const sumParts=a+b; const each=total/sumParts;
    if(!Number.isInteger(each)) {
      if (depth >= 8) { const e2 = Math.round(each*10)/10; return null; }
      return genRatio(depth + 1);
    }
    return { question:'In a group of '+total+' people, the ratio of boys to girls is '+a+':'+b+'. How many girls are there?', correctAnswer:fmt(b*each), acceptedAnswers:[b*each+' girls'], unit:'', category:'Ratios Proportions', difficulty:'Medium', shortcut:'Total parts = '+sumParts+'. Each part = '+total+'/'+sumParts+' = '+each+'. Girls = '+b+' × '+each+' = '+(b*each)+'.', explanation:'Sum of ratio parts = '+sumParts+'. Each = '+total+'/'+sumParts+' = '+each+'. Girls = '+b+' × '+each+' = '+(b*each)+'.', mentalPattern:"Total parts method: divide whole by sum, multiply by relevant part.", commonMistake:"Multiplying by the wrong part.", sourceType:'generated' };
  }
  function genWorkTime() {
    const m = pick([6,8,10,12,15,20]); const d = pick([10,12,15,20,24,30]); const work = m*d; const newM = pick([4,5,6,8,10,12,15,16,24]); if(newM===m) return genWorkTime(); const newD = work/newM;
    return { question:m+' men can finish a work in '+d+' days. How many days will '+newM+' men take?', correctAnswer:fmt(newD), acceptedAnswers:[fmt(newD)+' days'], unit:'days', category:'Work Time', difficulty:'Medium', shortcut:'Work = '+m+' × '+d+' = '+work+' man-days. '+work+' / '+newM+' = '+fmt(newD)+'.', explanation:'Work = men × days = '+m+' × '+d+' = '+work+'. Days = '+work+' / '+newM+' = '+fmt(newD)+'.', mentalPattern:"Man-days method: total work stays constant.", commonMistake:"Adding men instead of using the man-day product.", sourceType:'generated' };
  }
  function genAverageOfSequence() {
    const start = pick([11,13,15,17,21,23,25,31]); const diff = 2; const count = pick([5,7]); const mid = (count-1)/2; const largest = start + mid*2*diff;
    return { question:'The average of '+count+' consecutive odd numbers is '+(start+mid*diff)+'. What is the largest number?', correctAnswer:fmt(largest), acceptedAnswers:[], unit:'', category:'Averages', difficulty:'Medium', shortcut:'Average = middle. Largest = average + '+(mid*diff)+'.', explanation:'For consecutive numbers, average = middle value. Largest = middle + (count-1)/2 × step.', mentalPattern:"Average of consecutive sequence equals the middle value.", commonMistake:"Thinking the largest is the average itself.", sourceType:'generated' };
  }
  function genOppositeDirection() {
    const a = pick([10,12,14,16,18,20]); const b = pick([10,12,14,16,18,20]); const t = pick([0.5,1,1.5,2]); const d = (a+b)*t;
    const timeStr = t===0.5?'30 minutes':(t===1?'1 hour':(t===1.5?'1 hour 30 minutes':'2 hours'));
    return { question:'Two cyclists start from the same point and move in opposite directions at '+a+' km/h and '+b+' km/h. How far apart are they after '+timeStr+'?', correctAnswer:fmt(d), acceptedAnswers:[fmt(d)+' km'], unit:'km', category:'Relative Speed', difficulty: (t===0.5||t===1.5)?'Medium':'Easy', shortcut:'Opposite directions -> add speeds = '+(a+b)+' km/h. '+(t===0.5?'Half hour':(t===1.5?'1.5 h':(t+' h')))+' -> '+fmt(d)+' km.', explanation:'Opposite-direction relative speed = '+(a+b)+' km/h. Distance = '+(a+b)+' × '+t+' = '+fmt(d)+' km.', mentalPattern:"Opposite directions -> add speeds.", commonMistake:"Subtracting the speeds instead of adding.", sourceType:'generated' };
  }
  // "Expert" tier: the settings screen offers Expert, but nothing generated it.
  function genSuccessivePercent() {
    const p = pick([10,20,25,40,50]);
    const up = Math.random() < 0.5;
    const net = parseFloat(((p*p)/100).toFixed(3));          // always a net LOSS
    const after = 100 * (1 + (up ? p : -p)/100);
    const back = after * (1 + (up ? -p : p)/100);
    const dir = up ? 'increased' : 'decreased';
    const rev = up ? 'decreased' : 'increased';
    return { question:'A price is '+dir+' by '+p+'% and then '+rev+' by '+p+'%. What is the net percentage decrease?', correctAnswer:fmt(net), acceptedAnswers:[fmt(net)+'%', '-'+fmt(net), net+'% loss'], unit:'%', category:'Percentages', difficulty:'Expert', shortcut:'Start from 100. After '+dir+' by '+p+'% -> '+fmt(after)+'; then '+rev+' by '+p+'% of '+fmt(after)+' -> '+fmt(back)+'. Net = '+fmt(100-back)+'% down. Shortcut: p\u00b2/100 = '+p+'\u00b2/100 = '+fmt(net)+'%.', explanation:'Successive equal percentage changes never cancel out. The net change is -(p\u00b2/100)% = -('+p+'\u00b2/100)% = a '+fmt(net)+'% decrease.', mentalPattern:'Successive percent change: up p% then down p% (or the reverse) always loses p\u00b2/100 percent.', commonMistake:'Assuming +'+p+'% and -'+p+'% cancel to 0%.' };
  }
  function genReversePercent() {
    const p = pick([12.5,20,25,40,60,75,80]);
    const base = pick([60,80,120,160,200,240,320,400,500]);
    const part = parseFloat(((p/100)*base).toFixed(3));
    return { question:p+'% of a number is '+fmt(part)+'. What is the number?', correctAnswer:fmt(base), acceptedAnswers:[fmt(base)+'', String(Math.round(base))], unit:'', category:'Percentages', difficulty:'Hard', shortcut:'Call the number x: '+p+'% x x = '+fmt(part)+', so x = '+fmt(part)+' \u00f7 '+(p/100)+' = '+fmt(part)+' \u00d7 '+(100/p)+' = '+fmt(base)+'.', explanation:'Reverse percentage: divide the given part by the percentage written as a decimal (or multiply by 100/'+p+').', mentalPattern:'Reverse percent: part \u00f7 (percent/100) = whole. Multiply by the reciprocal fraction.', commonMistake:'Multiplying by the percentage instead of dividing by it.' };
  }
  function genAverageSpeedRoundTrip() {
    const pairs = [[40,60],[30,60],[20,30],[50,75],[60,90],[24,48],[36,45],[25,100],[15,45],[12,24]];
    const pair = pick(pairs); const a = pair[0], b = pair[1];
    const ans = parseFloat(((2*a*b)/(a+b)).toFixed(3));
    return { question:'A car travels from city A to city B at '+a+' km/h and returns at '+b+' km/h. What is the average speed for the whole journey?', correctAnswer:fmt(ans), acceptedAnswers:[fmt(ans)+' km/h', fmt(ans)+'kmph'], unit:'km/h', category:'Averages', difficulty:'Expert', shortcut:'Equal distances, so use 2ab/(a+b) = 2 \u00d7 '+a+' \u00d7 '+b+' / ('+a+' + '+b+') = '+fmt(ans)+' km/h. Never the plain mean of the two speeds.', explanation:'Average speed = total distance / total time. With equal distances d each way the times are d/'+a+' and d/'+b+', which simplifies to the harmonic mean 2ab/(a+b) = '+fmt(ans)+' km/h.', mentalPattern:'Average speed over equal DISTANCES = harmonic mean 2ab/(a+b), not the arithmetic mean.', commonMistake:'Averaging the two speeds (('+a+'+'+b+')/2 = '+fmt((a+b)/2)+'), which overweights the slower leg.' };
  }
  // ------------------------------------------------------- Mental Division
  // Dividing by 5 / 25 / 4 / 20 / 50 is a shortcut, not long division.
  function genMentalDivision() {
    const kinds = [
      { d: 5, label: 'double it and divide by ten', tip: 'Dividing by five is doubling, then dividing by ten.', diff: 'Easy' },
      { d: 10, label: 'move the digits one place', tip: 'Dividing by ten just shifts the digits one place.', diff: 'Easy' },
      { d: 4, label: 'halve it twice', tip: 'Dividing by four is halving, then halving again.', diff: 'Easy' },
      { d: 25, label: 'multiply by four and divide by a hundred', tip: 'Dividing by twenty-five is times four, then divide by a hundred.', diff: 'Medium' },
      { d: 20, label: 'halve it, then divide by ten', tip: 'Dividing by twenty is halving, then dividing by ten.', diff: 'Medium' },
      { d: 50, label: 'double it and divide by a hundred', tip: 'Dividing by fifty is doubling, then dividing by a hundred.', diff: 'Medium' },
      { d: 8, label: 'halve it three times', tip: 'Dividing by eight is halving three times.', diff: 'Hard' },
      { d: 125, label: 'multiply by eight and divide by a thousand', tip: 'Dividing by a hundred and twenty-five is times eight, then divide by a thousand.', diff: 'Hard' }
    ];
    const k = pick(kinds);
    const q = pick([12, 16, 18, 24, 25, 32, 36, 45, 48, 60, 75, 80, 90, 100, 120, 150, 200, 240, 300, 400, 500, 600, 750, 800, 1000, 125, 250, 375, 625]);
    const n = k.d * q;
    return {
      question: 'Divide ' + n + ' by ' + k.d + '.',
      correctAnswer: fmt(q), acceptedAnswers: [fmt(q)], unit: '',
      category: 'Mental Division', difficulty: k.diff,
      shortcut: k.tip + ' Here: ' + n + ' \u00f7 ' + k.d + ' = ' + fmt(q) + '.',
      explanation: 'Use the shortcut (' + k.label + '): ' + n + ' \u00f7 ' + k.d + ' = ' + fmt(q) + ', and ' + fmt(q) + ' \u00d7 ' + k.d + ' = ' + n + ' checks it.',
      mentalPattern: k.tip,
      commonMistake: 'Starting long division instead of using the divisor\u2019s relationship to ten, a hundred or a thousand.',
      sourceType: 'generated'
    };
  }

  // --------------------------------------------------------- Number Patterns
  function genNumberPatterns() {
    const kind = pick(['arithmetic', 'geometric', 'squares', 'fibonacci', 'rising']);
    if (kind === 'arithmetic') {
      const start = pick([2, 3, 5, 7, 10, 12]);
      const d = pick([3, 4, 5, 6, 7, 9, 11, 12, 15, 20]);
      const terms = [0, 1, 2, 3, 4].map(i => start + d * i);
      return {
        question: 'What is the next number? ' + terms.join(', ') + ', ...',
        correctAnswer: fmt(terms[4] + d), acceptedAnswers: [], unit: '',
        category: 'Number Patterns', difficulty: d <= 6 ? 'Easy' : 'Medium',
        shortcut: 'The gap is constant (' + d + '), so add it to the last term: ' + fmt(terms[4]) + ' + ' + d + '.',
        explanation: 'Each term adds ' + d + ', so the next is ' + fmt(terms[4] + d) + '.',
        mentalPattern: 'Constant gap means an arithmetic sequence: next = last + gap.',
        commonMistake: 'Looking for a multiplying rule when the sequence is simply adding a fixed step.',
        sourceType: 'generated'
      };
    }
    if (kind === 'geometric') {
      const start = pick([2, 3, 4, 5]);
      const r = pick([2, 3, 4, 5]);
      const terms = [0, 1, 2, 3, 4].map(i => start * Math.pow(r, i));
      return {
        question: 'What is the next number? ' + terms.join(', ') + ', ...',
        correctAnswer: fmt(terms[4] * r), acceptedAnswers: [], unit: '',
        category: 'Number Patterns', difficulty: r <= 3 ? 'Easy' : 'Medium',
        shortcut: 'Each term is multiplied by ' + r + ', so ' + fmt(terms[4]) + ' \u00d7 ' + r + '.',
        explanation: 'The ratio is ' + r + ', so the next term is ' + fmt(terms[4] * r) + '.',
        mentalPattern: 'A constant RATIO means a geometric sequence.',
        commonMistake: 'Adding a difference when the rule is multiplication.',
        sourceType: 'generated'
      };
    }
    if (kind === 'squares') {
      const start = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      const terms = [0, 1, 2, 3, 4].map(i => (start + i) * (start + i));
      return {
        question: 'What is the next number? ' + terms.join(', ') + ', ...',
        correctAnswer: fmt((start + 5) * (start + 5)), acceptedAnswers: [], unit: '',
        category: 'Number Patterns', difficulty: start <= 6 ? 'Easy' : 'Medium',
        shortcut: 'The terms are consecutive squares: ' + start + '\u00b2, ' + (start + 1) + '\u00b2, and so on, so square ' + (start + 5) + '.',
        explanation: 'Each term is the square of consecutive integers, so the next is ' + (start + 5) + '\u00b2 = ' + fmt((start + 5) * (start + 5)) + '.',
        mentalPattern: 'Growing gaps that grow by two each time point to squares.',
        commonMistake: 'Extending the last gap instead of spotting the squares.',
        sourceType: 'generated'
      };
    }
    if (kind === 'fibonacci') {
      let a = pick([1, 2, 3, 4]);
      let b = pick([2, 3, 5, 6]);
      const terms = [a, b];
      for (let i = 0; i < 3; i++) { const n = terms[terms.length - 1] + terms[terms.length - 2]; terms.push(n); }
      const next = terms[terms.length - 1] + terms[terms.length - 2];
      return {
        question: 'What is the next number? ' + terms.join(', ') + ', ...',
        correctAnswer: fmt(next), acceptedAnswers: [], unit: '',
        category: 'Number Patterns', difficulty: 'Hard',
        shortcut: 'Each term is the sum of the two before it: ' + terms[3] + ' + ' + terms[4] + '.',
        explanation: 'Adding the last two terms gives ' + fmt(next) + '.',
        mentalPattern: 'Fibonacci style: term = previous + the one before it.',
        commonMistake: 'Hunting for a single multiplier when two previous terms are involved.',
        sourceType: 'generated'
      };
    }
    const start = pick([1, 2, 3, 4, 5]);
    let d = pick([2, 3, 4]);
    const terms = [start];
    for (let i = 0; i < 4; i++) { terms.push(terms[terms.length - 1] + d); d += 1; }
    return {
      question: 'What is the next number? ' + terms.join(', ') + ', ...',
      correctAnswer: fmt(terms[terms.length - 1] + d), acceptedAnswers: [], unit: '',
      category: 'Number Patterns', difficulty: 'Hard',
      shortcut: 'The gaps grow by one each step, so the next gap is ' + d + '.',
      explanation: 'Differences rise by one, so the next term is ' + fmt(terms[terms.length - 1] + d) + '.',
      mentalPattern: 'When the gaps are not constant, difference them again.',
      commonMistake: 'Repeating the last gap instead of letting it grow.',
      sourceType: 'generated'
    };
  }

  // -------------------------------------------------------- Mixed Mental Math
  function genMixedMentalMath() {
    const kind = pick(['percentAdd', 'fractionScale', 'speedTime', 'averageScale', 'percentChain']);
    if (kind === 'percentAdd') {
      const n = pick([80, 120, 150, 200, 240, 300, 400]);
      const p = pick([10, 20, 25, 50]);
      const add = pick([5, 8, 12, 15, 20, 25]);
      const ans = (p / 100) * n + add;
      return {
        question: 'Work out ' + p + '% of ' + n + ' and then add ' + add + '.',
        correctAnswer: fmt(ans), acceptedAnswers: [], unit: '',
        category: 'Mixed Mental Math', difficulty: p <= 25 ? 'Easy' : 'Medium',
        shortcut: p + '% of ' + n + ' = ' + fmt((p / 100) * n) + ', then + ' + add + '.',
        explanation: p + '% of ' + n + ' is ' + fmt((p / 100) * n) + '; adding ' + add + ' gives ' + fmt(ans) + '.',
        mentalPattern: 'Split it into two single-step calculations.',
        commonMistake: 'Adding the extra amount before taking the percentage.',
        sourceType: 'generated'
      };
    }
    if (kind === 'fractionScale') {
      const den = pick([2, 3, 4, 5]);
      const num = pick(den === 2 ? [1] : den === 3 ? [1, 2] : den === 4 ? [1, 3] : [1, 2, 3, 4]);
      const base = den * pick([8, 10, 12, 15, 20, 24]);
      const k = pick([3, 4, 5, 6]);
      const ans = (base * num / den) * k;
      return {
        question: 'Find ' + num + '/' + den + ' of ' + base + ', then multiply the result by ' + k + '.',
        correctAnswer: fmt(ans), acceptedAnswers: [], unit: '',
        category: 'Mixed Mental Math', difficulty: k <= 4 ? 'Easy' : 'Medium',
        shortcut: base + ' \u00f7 ' + den + ' \u00d7 ' + num + ' \u00d7 ' + k + '.',
        explanation: num + '/' + den + ' of ' + base + ' is ' + fmt(base * num / den) + ', and \u00d7 ' + k + ' gives ' + fmt(ans) + '.',
        mentalPattern: 'Divide first, then multiply - it keeps the numbers small.',
        commonMistake: 'Multiplying everything first and then dividing.',
        sourceType: 'generated'
      };
    }
    if (kind === 'speedTime') {
      const v = pick([30, 40, 45, 60, 72, 80, 90]);
      const hours = pick([0.5, 1.5, 2, 2.5, 3, 4]);
      const ans = v * hours;
      return {
        question: 'A car travels at ' + v + ' km/h for ' + hours + ' hours. How far does it go?',
        correctAnswer: fmt(ans), acceptedAnswers: [fmt(ans) + ' km'], unit: 'km',
        category: 'Mixed Mental Math', difficulty: Number.isInteger(hours) ? 'Easy' : 'Medium',
        shortcut: 'Distance = speed \u00d7 time = ' + v + ' \u00d7 ' + hours + '.',
        explanation: v + ' \u00d7 ' + hours + ' = ' + fmt(ans) + ' km.',
        mentalPattern: 'Distance = speed \u00d7 time; a fractional hour is just scaling.',
        commonMistake: 'Dividing instead of multiplying.',
        sourceType: 'generated'
      };
    }
    if (kind === 'averageScale') {
      const a = pick([12, 15, 18, 20, 24, 30]);
      const b = pick([26, 32, 36, 40, 44, 50]);
      const k = pick([3, 4, 5, 10]);
      const ans = ((a + b) / 2) * k;
      return {
        question: 'Find the average of ' + a + ' and ' + b + ', then multiply it by ' + k + '.',
        correctAnswer: fmt(ans), acceptedAnswers: [], unit: '',
        category: 'Mixed Mental Math', difficulty: k <= 5 ? 'Easy' : 'Medium',
        shortcut: '(' + a + ' + ' + b + ') \u00f7 2 \u00d7 ' + k + '.',
        explanation: 'The midpoint is ' + fmt((a + b) / 2) + ', and \u00d7 ' + k + ' gives ' + fmt(ans) + '.',
        mentalPattern: 'Average of two numbers is their midpoint.',
        commonMistake: 'Multiplying first, which makes the numbers unnecessarily big.',
        sourceType: 'generated'
      };
    }
    const n = pick([200, 400, 500, 600, 800]);
    const p1 = pick([10, 20, 25, 50]);
    const p2 = pick([10, 20, 25, 50]);
    const ans = n * ((100 + p1) / 100) * ((100 - p2) / 100);
    return {
      question: 'Increase ' + n + ' by ' + p1 + '%, then decrease the result by ' + p2 + '%. What is the final value?',
      correctAnswer: fmt(ans), acceptedAnswers: [], unit: '',
      category: 'Mixed Mental Math', difficulty: 'Hard',
      shortcut: 'Multiply by ' + ((100 + p1) / 100) + ', then by ' + ((100 - p2) / 100) + '.',
      explanation: n + ' \u00d7 ' + ((100 + p1) / 100) + ' \u00d7 ' + ((100 - p2) / 100) + ' = ' + fmt(ans) + '.',
      mentalPattern: 'Chained percentage changes multiply - a rise and a fall of the same size never cancel.',
      commonMistake: 'Adding and subtracting the percentages on the original value.',
      sourceType: 'generated'
    };
  }

  const GENERATORS = { 'Percentages': genPercentOf, 'Speed Distance Time': genSpeedDistanceTime, 'Fractions': genFractionOf, 'Ratios Proportions': genUnitPrice, 'Profit Loss': genProfitLoss, 'Pipes Tanks': genPipes, 'Unit Conversion': [genKmhToMs, genMsToKmh], 'Mental Multiplication': genMultiplyBy11, 'Decimals': genDecimalMultiply, 'Age Problems': genAgeProblem, 'Averages': genAverageOfSequence, 'Work Time': genWorkTime, 'Relative Speed': genOppositeDirection,
    'Mental Division': genMentalDivision, 'Number Patterns': genNumberPatterns, 'Mixed Mental Math': genMixedMentalMath };
  // Expert tier generators, used when the requested difficulty is Expert.
  const EXPERT_GENERATORS = { 'Percentages': [genSuccessivePercent, genReversePercent], 'Averages': [genAverageSpeedRoundTrip] };

  function generateOne(category, difficulty) {
    // An Expert request must be served by a category that actually has Expert
    // generators, otherwise the tier silently degrades to Medium.
    const expertCats = Object.keys(EXPERT_GENERATORS);
    let cats = category ? [category] : Object.keys(GENERATORS);
    if (difficulty === 'Expert') {
      cats = (category && expertCats.indexOf(category) !== -1) ? [category] : expertCats;
    }
    const usable = cats.filter(c => GENERATORS[c]);
    if (usable.length === 0) return null;
    const cat = pick(usable);
    if (difficulty === 'Expert' && EXPERT_GENERATORS[cat]) {
      const eq = pick(EXPERT_GENERATORS[cat])();
      if (eq) { eq.id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); return eq; }
    }
    const fn = GENERATORS[cat];
    const q = typeof fn === 'function' ? fn() : pick(fn)();
    if (!q) return null;
    q.id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    return q;
  }
  function generateMany(count, category, difficulty) {
    const list = []; let safety = 0;
    while (list.length < count && safety < count*20) {
      const q = generateOne(category, difficulty); if (q) list.push(q); safety++;
    }
    return list;
  }
  window.Generator = { generateOne, generateMany };
})();
