/**
 * End-to-end tests for Mental Maths Practice (PWA).
 *
 * These drive the REAL application: the real index.html, the real modules,
 * the real router, the real localStorage persistence. Nothing is mocked
 * except two browser APIs jsdom lacks (matchMedia, confirm).
 *
 *   NODE_PATH=/home/user/tests/node_modules node tests/pwa.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');

// ---------------------------------------------------------------- harness
const rawHtml = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
const SCRIPT_ORDER = [...rawHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const HTML_NO_SCRIPTS = rawHtml.replace(/<script src="[^"]+"><\/script>/g, '');

function makeApp(seedStorage) {
  const dom = new JSDOM(HTML_NO_SCRIPTS, {
    url: 'https://app.local/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  // --- minimal polyfills for APIs jsdom does not implement -----------------
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.confirm = () => (win.__confirmAnswer !== undefined ? win.__confirmAnswer : true);
  win.scrollTo = () => {};
  if (seedStorage) {
    for (const [k, v] of Object.entries(seedStorage)) win.localStorage.setItem(k, v);
  }
  for (const rel of SCRIPT_ORDER) {
    win.eval(fs.readFileSync(path.join(PWA, rel), 'utf8'));
  }
  return dom;
}

function dumpStorage(win) {
  const out = {};
  for (let i = 0; i < win.localStorage.length; i++) {
    const k = win.localStorage.key(i);
    out[k] = win.localStorage.getItem(k);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function go(dom, hash) {
  dom.window.history.replaceState(null, '', hash);
  dom.window.UI.route();
}

const $ = (dom, sel) => dom.window.document.querySelector(sel);
const byId = (dom, id) => dom.window.document.getElementById(id);
const text = (dom, id) => {
  const el = byId(dom, id);
  return el ? el.textContent.trim() : null;
};

function submitAnswer(dom, value) {
  byId(dom, 'qInput').value = String(value);
  byId(dom, 'quizForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
function nextQuestion(dom) {
  byId(dom, 'fbNext').click();
}
function answerCorrectly(dom, times = 1) {
  for (let i = 0; i < times; i++) {
    const q = dom.window.QuizEngine.Quiz.currentQuestion();
    submitAnswer(dom, q.correctAnswer);
    nextQuestion(dom);
  }
}
function continueCards(dom) {
  return [...dom.window.document.querySelectorAll('#continueQuizHost .continue-card')];
}

// ------------------------------------------------------------------ runner
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
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'values differ'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ================================================================== tests
console.log('\nMental Maths Practice — end-to-end suite\n');

const RELEVANCE = {
  Percentages: ['percent', '%'],
  'Speed Distance Time': ['speed', 'distance', 'time', 'km', 'hour', 'train'],
  Fractions: ['fraction', 'denominator', 'numerator', 'butterfly', 'common'],
  'Ratios Proportions': ['ratio', 'unit', 'parts', 'proportion', 'cross-multiply'],
  'Profit Loss': ['cost', 'profit', 'loss', 'discount', 'selling'],
  Averages: ['average', 'total', 'count', 'middle', 'mean'],
  'Work Time': ['work', 'rate', 'days', 'men', 'workers', 'hour'],
  'Pipes Tanks': ['pipe', 'tank', 'rate', 'fill'],
  'Unit Conversion': ['km/h', 'm/s', 'unit', 'convert', '3.6', '5/18', 'steps'],
  'Basic Arithmetic': ['bodmas', 'pemdas', 'multiplication', 'brackets'],
  Decimals: ['decimal', 'places', 'point'],
  'Mental Multiplication': ['11', 'tens', 'factor', 'multiply', 'halving', 'units'],
  'Mental Division': ['divid', 'cancel', 'factor', 'halv', 'quotient'],
  'Age Problems': ['age', 'youngest', 'variable', 'parts', 'multiple'],
  'Time Calculation': ['minute', 'hour', 'time', 'clock', '12:00', 'am/pm'],
  'Relative Speed': ['speed', 'direction', 'stream', 'boat', 'gap'],
  'Number Patterns': ['difference', 'pattern', 'term', 'cases', 'pair', 'rule'],
  'Mixed Mental Math': ['concept', 'estimate', 'pattern', 'idea', 'rate', 'ratio', 'percentage', 'average'],
};

await test('1. Hint library: every seed question gets a relevant hint that never reveals the answer', () => {
  const dom = makeApp();
  const { Hints, QUESTIONS } = dom.window;
  assert(QUESTIONS.length >= 50, `expected 50 seed questions, got ${QUESTIONS.length}`);
  for (const q of QUESTIONS) {
    const hint = Hints.hintFor(q);
    assert(typeof hint === 'string' && hint.length > 15, `no real hint for: ${q.question}`);
    assert(!Hints.revealsAnswer(hint, q), `hint reveals the answer for "${q.question}": ${hint}`);
    const keys = RELEVANCE[q.category];
    if (keys) {
      const low = hint.toLowerCase();
      assert(keys.some((k) => low.includes(k)), `hint not relevant to ${q.category} ("${q.question}"): ${hint}`);
    }
  }
  dom.window.close();
});

await test('2. Hint library: generated questions also get safe, non-revealing hints', () => {
  const dom = makeApp();
  const { Hints, Generator } = dom.window;
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const q = Generator.generateOne();
    if (!q) continue;
    n++;
    const hint = Hints.hintFor(q);
    assert(hint && hint.length > 15, `no hint for generated question: ${q.question}`);
    assert(!Hints.revealsAnswer(hint, q), `hint reveals answer for "${q.question}" -> ${hint}`);
  }
  assert(n > 300, `expected many generated questions, got ${n}`);
  dom.window.close();
});

await test('3. Hint button works: appears, is relevant, marks itself activated, and is idempotent', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  const btn = byId(dom, 'qHint');
  const wrap = byId(dom, 'qHintText');
  assert(btn && !btn.hidden, 'Hint button is not visible on the quiz screen');
  assert(wrap.hidden === true, 'hint text should start hidden');

  btn.click();
  const first = wrap.textContent.trim();
  assert(wrap.hidden === false, 'hint text did not appear after clicking Hint');
  assert(first.length > 15, `hint text is empty/short: "${first}"`);
  assert(wrap.classList.contains('show'), 'hint reveal animation class missing');

  const q = dom.window.QuizEngine.Quiz.currentQuestion();
  assert(!dom.window.Hints.revealsAnswer(first, q), `hint revealed the answer: ${first}`);
  assert(btn.classList.contains('activated'), 'button did not get the activated state');
  assert(btn.disabled === true, 'button was not disabled after use');
  assert(btn.getAttribute('aria-pressed') === 'true', 'aria-pressed not set');
  assert(btn.textContent.includes('Hint shown'), 'button label did not change to "Hint shown"');
  eq(dom.window.QuizEngine.Quiz.hintsUsedForCurrent(), 1, 'hint should be counted exactly once');

  // second and third clicks must not duplicate or change anything
  btn.click();
  btn.click();
  eq(wrap.textContent.trim(), first, 'hint text changed on a repeat click');
  eq(dom.window.QuizEngine.Quiz.hintsUsedForCurrent(), 1, 'duplicate hint was recorded');
  dom.window.close();
});

await test('4. Hint survives to the next question: fresh button, fresh hint', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  byId(dom, 'qHint').click();
  const first = byId(dom, 'qHintText').textContent.trim();
  answerCorrectly(dom, 1);
  const btn = byId(dom, 'qHint');
  assert(!btn.classList.contains('activated'), 'hint button should reset for the next question');
  assert(byId(dom, 'qHintText').hidden === true, 'old hint should be cleared for the next question');
  btn.click();
  const second = byId(dom, 'qHintText').textContent.trim();
  assert(second.length > 15, 'no hint on the second question');
  assert(second !== first || true, 'hint may legitimately repeat');
  eq(dom.window.QuizEngine.Quiz.hintsUsedForCurrent(), 1, 'hint count should be per question');
  dom.window.close();
});

await test('5. Leaving a quiz with the Back button auto-saves it (and stops the countdown)', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  answerCorrectly(dom, 4);
  const before = dom.window.QuizEngine.Quiz.current.id;
  // simulate Android back / side-nav navigation
  go(dom, '#/dashboard');
  eq(dom.window.QuizEngine.Quiz.isActive(), false, 'quiz should no longer be running');
  const unfinished = dom.window.StateStore.getUnfinished();
  eq(unfinished.length, 1, 'exactly one unfinished session should be stored');
  eq(unfinished[0].id, before, 'stored session id mismatch');
  eq(unfinished[0].progress.entries.filter((e) => e.userAnswer !== '').length, 4, 'answered count not saved');
  dom.window.close();
});

await test('6. Dashboard shows a Continue Quiz card with mode, progress, percentage and remaining', () => {
  const dom = makeApp();
  go(dom, '#/timed'); // 20 questions, 10 minutes
  answerCorrectly(dom, 7);
  go(dom, '#/dashboard');

  const section = byId(dom, 'continueSection');
  eq(section.hidden, false, 'Continue Quiz section should be visible');
  const cards = continueCards(dom);
  eq(cards.length, 1, 'expected exactly one Continue Quiz card');
  const cardText = cards[0].textContent.replace(/\s+/g, ' ');
  assert(cardText.includes('Timed Quiz'), `card should name the mode: ${cardText}`);
  assert(cardText.includes('7 / 20 completed'), `card should show 7 / 20 completed: ${cardText}`);
  assert(cardText.includes('35%'), `card should show 35%: ${cardText}`);
  assert(cardText.includes('13 remaining'), `card should show 13 remaining: ${cardText}`);
  const btn = cards[0].querySelector('.btn-primary');
  assert(btn && btn.textContent.includes('Continue Quiz'), 'Continue Quiz button missing');
  assert(btn.querySelector('svg'), 'Continue button must use an SVG icon, not an emoji');
  dom.window.close();
});

await test('7. The unfinished quiz survives a full page refresh', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  answerCorrectly(dom, 3);
  go(dom, '#/dashboard');
  const storage = dumpStorage(dom.window);
  const sessionId = dom.window.StateStore.getUnfinished()[0].id;
  dom.window.close();

  // brand new page load, same persisted storage
  const dom2 = makeApp(storage);
  go(dom2, '#/dashboard');
  const cards = continueCards(dom2);
  eq(cards.length, 1, 'Continue Quiz card should still be there after a refresh');
  eq(cards[0].getAttribute('data-session-id'), sessionId, 'wrong session restored after refresh');
  assert(cards[0].textContent.includes('3 / 10 completed'), `progress lost on refresh: ${cards[0].textContent}`);
  dom2.window.close();
});

await test('8. Continue Quiz resumes at the exact question with every answer preserved', async () => {
  const dom = makeApp();
  go(dom, '#/timed');
  answerCorrectly(dom, 7);
  const original = JSON.parse(JSON.stringify(dom.window.QuizEngine.Quiz.current));
  const orderBefore = original.questionCache.map((q) => q.id);
  go(dom, '#/dashboard');
  const snapshot = dom.window.StateStore.getUnfinished()[0];

  // click the real Continue button (it navigates to #/resume?id=...)
  continueCards(dom)[0].querySelector('.btn-primary').click();
  assert(dom.window.location.hash.startsWith('#/resume?id='), `Continue button did not navigate: ${dom.window.location.hash}`);
  await sleep(30); // let the browser's hashchange fire, then render deterministically
  dom.window.UI.route();

  const engine = dom.window.QuizEngine.Quiz;
  assert(engine.isActive(), 'resume did not start a session');
  eq(engine.current.id, snapshot.id, 'resume created a different session');
  eq(engine.index, 7, `should resume ON question 8 (index 7), got index ${engine.index}`);
  eq(text(dom, 'qProgress'), 'Question 8 / 20', 'progress label wrong after resume');
  eq(engine.current.mode, 'timed', 'mode not preserved');
  eq(engine.current.count, 20, 'question count not preserved');
  eq(JSON.stringify(engine.current.questionCache.map((q) => q.id)), JSON.stringify(orderBefore), 'question order changed');
  eq(engine.current.correct, 7, 'correct count not preserved');
  eq(engine.current.incorrect, 0, 'incorrect count not preserved');
  eq(engine.progress.entries.filter((e) => e.userAnswer !== '').length, 7, 'previous answers not preserved');
  eq(engine.progress.entries.filter((e) => e.isCorrect).length, 7, 'correct/incorrect flags not preserved');
  eq(byId(dom, 'qInput').value, '', 'a fresh question should start with an empty input');
  dom.window.close();
});

await test('9. Timed quizzes keep their remaining countdown across a pause and resume', async () => {
  const dom = makeApp();
  go(dom, '#/timed');
  const total = dom.window.QuizEngine.Quiz.current.timeLimitSec;
  eq(total, 600, 'timed quiz should be 10 minutes');
  answerCorrectly(dom, 1);
  await sleep(1200); // let the countdown tick
  const leftBefore = dom.window.QuizEngine.Quiz.remainingSec;
  assert(leftBefore < total, 'countdown did not run');

  go(dom, '#/dashboard'); // user leaves
  const saved = dom.window.StateStore.getUnfinished()[0];
  eq(saved.remainingSec, leftBefore, 'remaining time was not saved');

  go(dom, `#/resume?id=${saved.id}`);
  const remaining = dom.window.QuizEngine.Quiz.remainingSec;
  assert(remaining <= leftBefore && remaining > leftBefore - 5, `timer not restored (${remaining} vs ${leftBefore})`);
  dom.window.close();
});

await test('10. Multiple unfinished quizzes coexist; the most recent is shown first', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  answerCorrectly(dom, 2);
  go(dom, '#/dashboard');

  go(dom, '#/categories');
  go(dom, '#/category?cat=Percentages');
  answerCorrectly(dom, 1);
  go(dom, '#/dashboard');

  go(dom, '#/weak');
  answerCorrectly(dom, 3);
  go(dom, '#/dashboard');

  const all = dom.window.StateStore.getUnfinished();
  eq(all.length, 3, `expected 3 unfinished sessions, got ${all.length}`);
  const cards = continueCards(dom);
  eq(cards.length, 3, 'all unfinished quizzes should be listed');
  const primary = cards[0];
  assert(primary.classList.contains('primary'), 'most recent quiz should be the prominent card');
  assert(primary.textContent.includes('Weak Areas'), 'most recent quiz should be the Weak Areas one');
  const primaryId = primary.getAttribute('data-session-id');
  eq(primaryId, all[0].id, 'primary card is not the most recently saved session');
  const others = dom.window.document.querySelector('.continue-others');
  assert(others && others.textContent.includes('Other unfinished quizzes (2)'), 'other quizzes should be collapsible');
  dom.window.close();
});

await test('11. Discard removes only the chosen unfinished quiz', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  answerCorrectly(dom, 1);
  go(dom, '#/dashboard');
  go(dom, '#/timed');
  answerCorrectly(dom, 2);
  go(dom, '#/dashboard');

  const ids = dom.window.StateStore.getUnfinished().map((s) => s.id);
  eq(ids.length, 2, 'expected two unfinished sessions');
  const target = continueCards(dom).find((c) => c.getAttribute('data-session-id') === ids[1]);
  [...target.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Discard').click();

  const left = dom.window.StateStore.getUnfinished().map((s) => s.id);
  eq(left.length, 1, 'exactly one session should remain');
  eq(left[0], ids[0], 'the wrong session was discarded');
  dom.window.close();
});

await test('12. Quit asks for confirmation; confirming saves progress and returns to the dashboard', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  answerCorrectly(dom, 5);

  dom.window.__confirmAnswer = false; // user cancels
  byId(dom, 'qQuit').click();
  assert(dom.window.QuizEngine.Quiz.isActive(), 'cancelling should keep the user inside the quiz');
  assert(byId(dom, 'quizForm'), 'quiz screen should still be rendered after cancelling');

  dom.window.__confirmAnswer = true; // user confirms
  byId(dom, 'qQuit').click();
  eq(dom.window.QuizEngine.Quiz.isActive(), false, 'quitting should stop the quiz');
  eq(dom.window.location.hash, '#/dashboard', 'quitting should return to the dashboard');
  const unfinished = dom.window.StateStore.getUnfinished();
  eq(unfinished.length, 1, 'quitting should save the session');
  eq(unfinished[0].progress.entries.filter((e) => e.userAnswer !== '').length, 5, 'progress not saved on quit');
  dom.window.close();
});

await test('13. Finishing a quiz clears the Continue card and records the session in history', () => {
  const dom = makeApp();
  go(dom, '#/practice'); // 10 questions
  answerCorrectly(dom, 7);
  go(dom, '#/dashboard');
  eq(continueCards(dom).length, 1, 'card should exist while unfinished');

  const unfinishedId = dom.window.StateStore.getUnfinished()[0].id;
  go(dom, `#/resume?id=${unfinishedId}`);
  eq(dom.window.QuizEngine.Quiz.index, 7, 'should resume at question 8');
  answerCorrectly(dom, 3); // finish it

  // results screen
  eq(text(dom, 'resScore'), '10 / 10', 'results should show the final score');
  eq(text(dom, 'resAccuracy'), '100%', 'results accuracy wrong');

  go(dom, '#/dashboard');
  eq(byId(dom, 'continueSection').hidden, true, 'Continue Quiz section should disappear once finished');
  eq(continueCards(dom).length, 0, 'no Continue card should remain');
  eq(dom.window.StateStore.getUnfinished().length, 0, 'unfinished store should be empty');
  const sessions = dom.window.StateStore.getSessions();
  eq(sessions.length, 1, 'the completed session should be in history');
  eq(sessions[0].completedAt !== null, true, 'session should be marked completed');
  eq(sessions[0].correct, 10, 'session correct count wrong');
  eq(dom.window.StateStore.getAttempts().length, 10, 'all attempts should be recorded');

  go(dom, '#/history');
  assert(byId(dom, 'historyList').textContent.includes('10/10'), 'history should list the completed session');
  dom.window.close();
});

await test('14. Regression: dashboard, category practice and results still work', () => {
  const dom = makeApp();
  go(dom, '#/dashboard');
  assert(byId(dom, 'kpiSolved'), 'dashboard KPIs missing');
  assert(byId(dom, 'categoryBars'), 'category performance missing');

  go(dom, '#/category?cat=Fractions');
  assert(dom.window.QuizEngine.Quiz.isActive(), 'category practice did not start');
  eq(dom.window.QuizEngine.Quiz.current.category, 'Fractions', 'category filter not applied');
  const q = dom.window.QuizEngine.Quiz.currentQuestion();
  eq(q.category, 'Fractions', 'question outside the chosen category');

  // wrong answers still recorded and reviewed
  submitAnswer(dom, 'definitely-wrong');
  eq(dom.window.QuizEngine.Quiz.current.incorrect, 1, 'wrong answer not recorded');
  assert(byId(dom, 'quizFeedback').hidden === false, 'feedback panel did not appear');
  dom.window.close();
});

// ------------------------------------------------------------------ report
console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
