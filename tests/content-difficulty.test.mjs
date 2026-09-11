/**
 * Question bank content + difficulty system (MASTER PROMPT — Part 1).
 *
 * Checks the shipped bank (size, spread, answer integrity, typography), the
 * EASY / MEDIUM / HARD chooser that now sits between the mode and the quiz,
 * per-difficulty accuracy tracking, repeat-free randomisation and the adaptive
 * weak-area recommendation.
 *
 *   node tests/content-difficulty.test.mjs
 *   APP_DIR=/path/to/assets node tests/content-difficulty.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');

const rawHtml = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
const SCRIPT_ORDER = [...rawHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const HTML_NO_SCRIPTS = rawHtml.replace(/<script src="[^"]+"><\/script>/g, '');
const CSS = fs.readFileSync(path.join(PWA, 'css/styles.css'), 'utf8');

function makeApp(storage) {
  const dom = new JSDOM(HTML_NO_SCRIPTS, {
    url: 'https://app.local/index.html#/dashboard',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.scrollTo = () => {};
  if (storage) for (const k of Object.keys(storage)) win.localStorage.setItem(k, storage[k]);
  try { Object.defineProperty(win.document, 'readyState', { value: 'complete', configurable: true }); } catch (e) {}
  for (const rel of SCRIPT_ORDER) win.eval(fs.readFileSync(path.join(PWA, rel), 'utf8'));
  return dom;
}

function go(dom, hash) { dom.window.history.replaceState(null, '', hash); dom.window.UI.route(); }
const byId = (dom, id) => dom.window.document.getElementById(id);

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  \u001b[32mPASS\u001b[0m  ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  \u001b[31mFAIL\u001b[0m  ${name}\n        ${err.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'values differ'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

console.log('\nContent & difficulty (Part 1)\n' + '-'.repeat(60));

// ---------------------------------------------------------------- bank size
await test('C1. The bank holds at least 900 questions across 18 categories', () => {
  const dom = makeApp();
  const win = dom.window;
  const qs = win.QUESTIONS || [];
  assert(qs.length >= 900, `bank has only ${qs.length} questions`);
  const cats = new Set(qs.map((q) => q.category));
  eq(cats.size, 18, 'number of categories in the bank');
  eq(win.CATEGORIES.length, 18, 'CATEGORIES length');
  for (const cat of win.CATEGORIES) {
    const n = qs.filter((q) => q.category === cat).length;
    assert(n >= 50, `"${cat}" has only ${n} questions (minimum 50)`);
  }
  // the three generator-only categories keep unlimited generation AND gain seeds
  for (const cat of ['Mental Division', 'Number Patterns', 'Mixed Mental Math']) {
    const seeds = qs.filter((q) => q.category === cat).length;
    assert(seeds >= 50, `"${cat}" needs at least 50 seeds, has ${seeds}`);
    const gen = win.Generator.generateMany(25, cat);
    assert(gen.length === 25, `"${cat}" no longer generates questions`);
  }
  dom.window.close();
});

await test('C2. Every category carries Easy, Medium and Hard questions', () => {
  const dom = makeApp();
  const qs = dom.window.QUESTIONS || [];
  const report = [];
  for (const cat of dom.window.CATEGORIES) {
    const row = {};
    for (const d of ['Easy', 'Medium', 'Hard']) row[d] = qs.filter((q) => q.category === cat && q.difficulty === d).length;
    report.push(`${cat}: ${row.Easy}/${row.Medium}/${row.Hard}`);
    for (const d of ['Easy', 'Medium', 'Hard']) {
      assert(row[d] >= 17, `"${cat}" has only ${row[d]} ${d} questions`);
    }
  }
  const totals = {};
  for (const d of ['Easy', 'Medium', 'Hard']) totals[d] = qs.filter((q) => q.difficulty === d).length;
  assert(totals.Easy >= 300 && totals.Medium >= 300 && totals.Hard >= 300,
    `difficulty split looks wrong: ${JSON.stringify(totals)}`);
  console.log('        ' + report.join('\n        '));
  dom.window.close();
});

await test('C3. Every question is complete, unique and free of "*" and emoji', () => {
  const dom = makeApp();
  const qs = dom.window.QUESTIONS || [];
  const seenIds = new Set();
  const seenText = new Set();
  for (const q of qs) {
    const where = `${q.id}: ${String(q.question).slice(0, 50)}`;
    assert(q.id !== undefined && q.id !== null, `${where} has no id`);
    assert(!seenIds.has(q.id), `duplicate id ${q.id}`);
    seenIds.add(q.id);
    const norm = String(q.question).trim().toLowerCase().replace(/\s+/g, ' ');
    assert(!seenText.has(norm), `duplicate question: ${where}`);
    seenText.add(norm);
    for (const field of ['question', 'correctAnswer', 'shortcut', 'explanation', 'mentalPattern']) {
      const v = q[field];
      assert(v && String(v).trim(), `${where} has an empty ${field}`);
      assert(!String(v).includes('*'), `${where} uses "*" in ${field}`);
      assert(!EMOJI_RE.test(String(v)), `${where} contains an emoji in ${field}`);
    }
    // Bank questions ship a hint; the older hand-written seeds get one from
    // Hints.hintFor(). Either way the user always sees a real hint.
    const hint = q.hint || dom.window.Hints.hintFor(q);
    assert(hint && String(hint).trim(), `${where} has no hint at all`);
    assert(String(hint).length >= 25, `${where} hint is too short`);
    assert(!String(hint).includes('*'), `${where} hint uses "*"`);
    assert(['Easy', 'Medium', 'Hard', 'Expert'].includes(q.difficulty), `${where} bad difficulty ${q.difficulty}`);
    assert(dom.window.CATEGORIES.includes(q.category), `${where} unknown category ${q.category}`);
  }
  dom.window.close();
});

await test('C4. A hint never gives the answer away (whole bank)', () => {
  const dom = makeApp();
  const win = dom.window;
  const leaks = [];
  for (const q of win.QUESTIONS || []) {
    if (win.Hints.revealsAnswer && win.Hints.revealsAnswer(q.hint, q)) leaks.push(q.id + ': ' + q.hint.slice(0, 60));
  }
  assert(leaks.length === 0, `${leaks.length} hints reveal the answer, e.g. ${leaks[0]}`);
  dom.window.close();
});

await test('C5. Difficulty chooser sits between the mode and the quiz', () => {
  const dom = makeApp();
  const win = dom.window;
  // every mode entry point leads to the chooser, not straight into a quiz
  const links = [...win.document.querySelectorAll('a[href^="#/"]')].map((a) => a.getAttribute('href'));
  for (const mode of ['quick', 'timed', 'fulltest', 'weak', 'mistakes']) {
    assert(links.includes(`#/setup?mode=${mode}`), `no chooser entry point for mode "${mode}"`);
  }
  // category cards open the chooser for that category
  go(dom, '#/categories');
  const card = win.document.querySelector('#catGrid .cat-card');
  const catName = card.querySelector('h3').textContent.trim();
  card.click();
  assert(win.location.hash === '#/setup?mode=category&cat=' + encodeURIComponent(catName),
    `category card routed to ${win.location.hash}`);
  dom.window.close();
});

await test('C6. The chooser offers EASY / MEDIUM / HARD and starts the chosen level', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/setup?mode=category&cat=Percentages');
  const cards = [...win.document.querySelectorAll('#difficultyGrid .diff-card')];
  eq(cards.length, 3, 'number of difficulty cards');
  eq(cards.map((c) => c.dataset.difficulty).join(','), 'Easy,Medium,Hard', 'difficulty order');
  cards.forEach((c) => {
    assert(c.querySelector('h3').textContent.trim() === c.dataset.difficulty, 'card title mismatch');
    assert(/\d+ questions ready/.test(c.querySelector('.diff-stats').textContent), 'card is missing its question count');
    assert(!EMOJI_RE.test(c.textContent), 'difficulty card contains an emoji');
  });
  assert(/Recommended/.test(win.document.getElementById('setupRecommend').textContent), 'no adaptive recommendation shown');
  assert(cards.filter((c) => c.classList.contains('recommended')).length === 1, 'exactly one card should be recommended');

  // choosing Hard really starts a Hard quiz
  cards.find((c) => c.dataset.difficulty === 'Hard').click();
  const session = win.QuizEngine.Quiz.current;
  eq(session.difficulty, 'Hard', 'session difficulty');
  eq(session.category, 'Percentages', 'session category');
  const wrong = session.questionCache.filter((q) => q.difficulty !== 'Hard');
  assert(wrong.length === 0, `${wrong.length} questions are not Hard: ${wrong.map((q) => q.question).join(' | ')}`);
  eq(byId(dom, 'qDifficulty').textContent, 'Hard', 'difficulty pill on the quiz screen');
  dom.window.close();
});

await test('C7. Mixed difficulty is still one tap away', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/setup?mode=quick');
  byId(dom, 'setupMixed').click();
  const session = win.QuizEngine.Quiz.current;
  eq(session.difficulty, 'Mixed', 'mixed session difficulty');
  assert(session.questionCache.length === 10, 'quick practice should build 10 questions');
  dom.window.close();
});

await test('C8. Sessions rotate: no repeats inside a session, fresh questions first', () => {
  const dom = makeApp();
  const win = dom.window;
  // Two full sessions of Percentages/Easy fit entirely inside the seeded bank,
  // so the second one must not repeat anything the first one served.
  const seen = new Set();
  let crossed = 0;
  for (let i = 0; i < 2; i++) {
    const s = win.QuizEngine.buildSession('category', { category: 'Percentages', difficulty: 'Easy', count: 10 });
    const texts = s.questionCache.map((q) => String(q.question).trim().toLowerCase());
    eq(new Set(texts).size, texts.length, 'a session repeated one of its own questions');
    texts.forEach((t) => { if (seen.has(t)) crossed++; seen.add(t); });
  }
  eq(crossed, 0, 'the second session repeated a question from the first');

  // Draining a small category must still hand back full, duplicate-free
  // sessions rather than crashing or coming up short.
  for (let i = 0; i < 8; i++) {
    const s = win.QuizEngine.buildSession('category', { category: 'Pipes Tanks', difficulty: 'Easy', count: 10 });
    eq(s.questionCache.length, 10, 'a session came up short once the category was drained');
    const texts = s.questionCache.map((q) => String(q.question).trim().toLowerCase());
    eq(new Set(texts).size, 10, 'a drained-category session repeated a question internally');
  }
  dom.window.close();
});

await test('C9. Accuracy is tracked per difficulty', () => {
  const dom = makeApp();
  const win = dom.window;
  const mk = (difficulty, isCorrect, n) => {
    for (let i = 0; i < n; i++) {
      win.StateStore.recordAttempt({
        id: 'a' + difficulty + i, questionId: 'q' + difficulty + i, sessionId: 's1',
        category: 'Percentages', difficulty, userAnswer: '1', correctAnswer: isCorrect ? '1' : '2',
        isCorrect, responseTimeMs: 1000, attemptedAt: new Date().toISOString(),
      });
    }
  };
  mk('Easy', true, 8);
  mk('Medium', true, 6);
  mk('Medium', false, 2);
  mk('Hard', false, 4);
  const stats = win.Stats.difficultyStats();
  const byDiff = Object.fromEntries(stats.map((s) => [s.difficulty, s]));
  eq(byDiff.Easy.attempts, 8, 'easy attempts');
  eq(byDiff.Easy.accuracy, 100, 'easy accuracy');
  eq(byDiff.Medium.attempts, 8, 'medium attempts');
  eq(byDiff.Medium.accuracy, 75, 'medium accuracy');
  eq(byDiff.Hard.attempts, 4, 'hard attempts');
  eq(byDiff.Hard.accuracy, 0, 'hard accuracy');
  // a category filter narrows it down
  eq(win.Stats.difficultyStats('Fractions').reduce((s, x) => s + x.attempts, 0), 0, 'category filter ignored');
  dom.window.close();
});

await test('C10. The recommendation adapts to how the user is doing', () => {
  const dom = makeApp();
  const win = dom.window;
  const seed = (difficulty, correct, total) => {
    for (let i = 0; i < total; i++) {
      win.StateStore.recordAttempt({
        id: 'r' + difficulty + i, questionId: 'r' + difficulty + i, sessionId: 's1',
        category: 'Percentages', difficulty, userAnswer: '1', correctAnswer: '1',
        isCorrect: i < correct, responseTimeMs: 1000, attemptedAt: new Date().toISOString(),
      });
    }
  };
  // nobody has answered anything yet -> start at Easy
  eq(win.Stats.recommendedDifficulty(null).difficulty, 'Easy', 'cold start should be Easy');
  // comfortable on Easy -> step up
  seed('Easy', 9, 10);
  eq(win.Stats.recommendedDifficulty(null).difficulty, 'Medium', '90% on Easy should move to Medium');
  // struggling on Medium -> stay there
  seed('Medium', 3, 10);
  eq(win.Stats.recommendedDifficulty(null).difficulty, 'Medium', '30% on Medium should stay on Medium');
  // holding up on Medium -> push to Hard
  for (let i = 0; i < 8; i++) {
    win.StateStore.recordAttempt({
      id: 'm2' + i, questionId: 'm2' + i, sessionId: 's1', category: 'Percentages', difficulty: 'Medium',
      userAnswer: '1', correctAnswer: '1', isCorrect: true, responseTimeMs: 1000, attemptedAt: new Date().toISOString(),
    });
  }
  eq(win.Stats.recommendedDifficulty(null).difficulty, 'Hard', 'strong Medium should move to Hard');
  dom.window.close();
});

await test('C11. Weak-area and mistake practice stay adaptive and repeat-free', () => {
  const dom = makeApp();
  const win = dom.window;
  // build a clear weakness: Fractions wrong, Percentages right
  for (let i = 0; i < 6; i++) {
    win.StateStore.recordAttempt({ id: 'w' + i, questionId: 'wq' + i, sessionId: 's1', category: 'Fractions', difficulty: 'Easy', userAnswer: '1', correctAnswer: '2', isCorrect: false, responseTimeMs: 1000, attemptedAt: new Date().toISOString() });
    win.StateStore.recordAttempt({ id: 'p' + i, questionId: 'pq' + i, sessionId: 's1', category: 'Percentages', difficulty: 'Easy', userAnswer: '1', correctAnswer: '1', isCorrect: true, responseTimeMs: 1000, attemptedAt: new Date().toISOString() });
  }
  eq(win.Stats.weakestCategories(1)[0], 'Fractions', 'Fractions should be the weakest category');
  const weak = win.QuizEngine.buildSession('weak', { count: 10 });
  eq(weak.category, 'Fractions', 'weak mode targets the weakest category');
  eq(new Set(weak.questionCache.map((q) => q.question)).size, 10, 'weak session repeated a question');

  const mistakes = win.QuizEngine.buildSession('mistakes', { count: 10 });
  assert(mistakes.questionCache.length === 10, 'mistake session should be full');
  eq(new Set(mistakes.questionCache.map((q) => q.question)).size, 10, 'mistake session repeated a question');
  dom.window.close();
});

await test('C12. A long session is spread across categories and never repeats', () => {
  const dom = makeApp();
  const win = dom.window;
  const s = win.QuizEngine.buildSession('fulltest', {});
  eq(s.questionCache.length, 50, 'full test size');
  const cats = new Set(s.questionCache.map((q) => q.category));
  assert(cats.size >= 12, `full test only covered ${cats.size} categories`);
  eq(new Set(s.questionCache.map((q) => q.question)).size, 50, 'full test repeated a question');
  dom.window.close();
});

await test('C13. User-facing maths uses the proper symbols, never "*"', () => {
  const dom = makeApp();
  const qs = dom.window.QUESTIONS || [];
  let star = 0;
  for (const q of qs) {
    const blob = [q.question, q.hint, q.shortcut, q.explanation, q.mentalPattern, q.commonMistake].join(' ');
    if (blob.includes('*')) star++;
  }
  eq(star, 0, 'questions still use "*"');
  // and the symbols the brief asks for are actually in use
  const withSymbols = qs.filter((q) => /[×÷−]/.test([q.question, q.hint, q.shortcut, q.explanation].join(' '))).length;
  assert(withSymbols > 200, `only ${withSymbols} questions use × ÷ or −`);
  dom.window.close();
});

await test('C14. The chooser is styled, responsive and emoji-free', () => {
  assert(/\.difficulty-grid\s*\{[^}]*grid-template-columns/.test(CSS), 'difficulty grid is not a CSS grid');
  assert(/@media[^{]*\([^)]*820px\)[^}]*\{[^}]*\.difficulty-grid[^}]*1fr/.test(CSS.replace(/\s+/g, ' ')) ||
         /\.difficulty-grid[^}]*\}\s*@media/.test(CSS), 'no narrow-screen rule for the difficulty grid');
  assert(/\.diff-card\s*\{/.test(CSS), '.diff-card has no styles');
  assert(/\.diff-badge\s*\{/.test(CSS), '.diff-badge has no styles');
  const tpl = rawHtml.slice(rawHtml.indexOf('id="tpl-setup"'));
  assert(!EMOJI_RE.test(tpl.slice(0, 2000)), 'the chooser template contains an emoji');
  assert(tpl.includes('id="difficultyGrid"'), 'the chooser template has no difficulty grid');
  assert(tpl.includes('id="setupMixed"'), 'the chooser template has no mixed-difficulty button');
});

await test('C15. The generated bank file is served and merged into the app', () => {
  assert(SCRIPT_ORDER.includes('js/question-bank.js'), 'question-bank.js is not loaded by index.html');
  const idx = SCRIPT_ORDER.indexOf('js/question-bank.js');
  assert(idx > SCRIPT_ORDER.indexOf('js/data.js'), 'the bank must load after the hand-written seeds');
  assert(idx < SCRIPT_ORDER.indexOf('js/quiz.js'), 'the bank must load before the quiz engine');
  const bank = fs.readFileSync(path.join(PWA, 'js', 'question-bank.js'), 'utf8');
  assert(/window\.QUESTION_BANK\s*=/.test(bank), 'bank does not define window.QUESTION_BANK');
  assert(/window\.QUESTIONS\s*=\s*\(window\.QUESTIONS\s*\|\|[\s\S]{0,40}\)\.concat\(/.test(bank), 'bank does not merge into window.QUESTIONS');
  const dom = makeApp();
  eq(typeof dom.window.QUESTION_BANK, 'object', 'QUESTION_BANK missing at runtime');
  assert(dom.window.QUESTION_BANK.length >= 900, 'QUESTION_BANK is too small');
  const handWritten = (dom.window.QUESTIONS || []).filter((q) => typeof q.id === 'number' && q.id < 1000).length;
  assert(handWritten >= 50, `the original ${'seeds'} were dropped (found ${handWritten})`);
  dom.window.close();
});

console.log('-'.repeat(60));
console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`FAILED: ${f.name}\n  ${f.err.stack}\n`);
  process.exit(1);
}
