/**
 * Regression tests for the bugs found in the deep code review (BUGS.md).
 *
 * Every test here FAILS against the pre-fix source and PASSES after the fix.
 * They run against the same real application as pwa.test.mjs:
 *
 *   node tests/regressions.test.mjs
 *   APP_DIR=/path/to/extracted/assets node tests/regressions.test.mjs
 */
process.env.TZ = process.env.TZ || 'Asia/Karachi'; // exercise a non-UTC user

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');

const rawHtml = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
const SCRIPT_ORDER = [...rawHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const HTML_NO_SCRIPTS = rawHtml.replace(/<script src="[^"]+"><\/script>/g, '');

function makeApp(seedStorage) {
  const dom = new JSDOM(HTML_NO_SCRIPTS, {
    url: 'https://app.local/index.html#/dashboard',   // start on a hash so app.js's boot never queues a navigation
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.confirm = () => (win.__confirmAnswer !== undefined ? win.__confirmAnswer : true);
  win.scrollTo = () => {};

  // jsdom keeps document.readyState === 'loading' during this synchronous
  // setup, so app.js defers its boot() to DOMContentLoaded — which then fires
  // in the middle of any test that awaits, re-routing and restarting the quiz.
  // Force the boot to happen now, exactly once, like it does in a browser.
  try {
    Object.defineProperty(win.document, 'readyState', { value: 'complete', configurable: true });
  } catch (e) { /* ignore: read-only in some jsdom versions */ }
  // jsdom ships no WebCrypto; the app needs it for password hashing.
  const cryptoShim = {
    getRandomValues: (arr) => webcrypto.getRandomValues(arr),
    subtle: webcrypto.subtle,
  };
  try { win.crypto.subtle = cryptoShim.subtle; win.crypto.getRandomValues = cryptoShim.getRandomValues; }
  catch (e) { Object.defineProperty(win, 'crypto', { value: cryptoShim, configurable: true }); }
  if (seedStorage) {
    for (const [k, v] of Object.entries(seedStorage)) win.localStorage.setItem(k, v);
  }
  for (const rel of SCRIPT_ORDER) win.eval(fs.readFileSync(path.join(PWA, rel), 'utf8'));
  return dom;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function go(dom, hash) {
  dom.window.history.replaceState(null, '', hash);
  dom.window.UI.route();
}
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

console.log('\nMental Maths Practice — regression suite (BUGS.md fixes)\n');

await test('R1. Quiz.submit() rejects null / undefined / "" instead of recording a wrong attempt', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/practice');
  const quiz = win.QuizEngine.Quiz;
  const attemptsBefore = win.StateStore.getAttempts().length;

  for (const bad of [null, undefined, '', '   ', '\n\t']) {
    eq(quiz.submit(bad), null, `submit(${JSON.stringify(bad)}) should be refused`);
  }
  eq(win.StateStore.getAttempts().length, attemptsBefore, 'blank answers were recorded as attempts');
  eq(quiz.current.correct + quiz.current.incorrect, 0, 'blank answers changed the score');
  eq(quiz.current.incorrect, 0, 'accuracy was corrupted by a blank answer');

  // A real answer still works after the refusals.
  const q = quiz.currentQuestion();
  const attempt = quiz.submit(q.correctAnswer);
  assert(attempt && attempt.isCorrect === true, 'valid answer was rejected');
  dom.window.close();
});

await test('R2. finish() / pause() / quit() are safe with no active session (no crash)', () => {
  const dom = makeApp();
  const win = dom.window;
  const quiz = win.QuizEngine.Quiz;
  assert(!quiz.isActive(), 'no quiz should be running yet');

  eq(quiz.finish(), null, 'finish() should no-op without a session');
  eq(quiz.pause(), null, 'pause() should no-op without a session');
  eq(quiz.quit(), null, 'quit() should no-op without a session');
  eq(quiz.currentQuestion(), null, 'currentQuestion() should be null without a session');
  eq(win.QuizEngine.isQuitSession(null), false, 'isQuitSession(null) must be false');
  dom.window.close();
});

await test('R3. Countdown persistence is throttled, but pause() still flushes the exact time', async () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/timed');

  let writes = 0;
  const realSetItem = win.localStorage.setItem.bind(win.localStorage);
  win.localStorage.setItem = (...args) => { writes++; return realSetItem(...args); };

  await sleep(6400); // ~6 ticks: 6 writes before the fix, 1 write after it
  assert(writes <= 2, `timer wrote localStorage ${writes} times in ~6 ticks (expected <= 2)`);

  const leftBefore = win.QuizEngine.Quiz.remainingSec;
  go(dom, '#/dashboard');
  const saved = win.StateStore.getUnfinished()[0];
  eq(saved.remainingSec, leftBefore, 'pause() did not flush the exact remaining time');
  dom.window.close();
});

await test('R4. Streak and "questions today" use the LOCAL date, not UTC', () => {
  const dom = makeApp();
  const win = dom.window;
  const Stats = win.Stats;
  const now = new Date();
  assert(-now.getTimezoneOffset() > 0, `this test needs a timezone ahead of UTC (offset is ${now.getTimezoneOffset()})`);

  // Three attempts that all land on the PREVIOUS UTC day but span two LOCAL days:
  //   00:30 today (local)  -> 19:30 yesterday UTC
  //   02:00 today (local)  -> 21:00 yesterday UTC
  //   23:30 yesterday      -> 18:30 yesterday UTC
  const today0030 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 30);
  const today0200 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0);
  const yest2330 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 30);

  // Guard: the fixture really is an edge case (UTC day != local day).
  assert(today0030.toISOString().slice(0, 10) !== Stats.dayKey(today0030),
    'fixture is not a UTC/local boundary case; the test would prove nothing');

  win.StateStore.recordAttempt({ id: 'a1', questionId: 'q1', category: 'Percentages', isCorrect: true, responseTimeMs: 100, attemptedAt: today0030.toISOString() });
  win.StateStore.recordAttempt({ id: 'a2', questionId: 'q2', category: 'Percentages', isCorrect: true, responseTimeMs: 100, attemptedAt: today0200.toISOString() });
  win.StateStore.recordAttempt({ id: 'a3', questionId: 'q3', category: 'Percentages', isCorrect: true, responseTimeMs: 100, attemptedAt: yest2330.toISOString() });

  eq(Stats.questionsToday(), 2, 'questionsToday() counted UTC days instead of local days');
  eq(Stats.dailyStreak(), 2, 'dailyStreak() used the UTC date boundary');
  eq(Stats.dayKey(today0030), Stats.dayKey(new Date()), 'dayKey should be the local calendar day');
  dom.window.close();
});

await test('R5. Snapshots saved in the same millisecond still sort newest-first', () => {
  const dom = makeApp();
  const win = dom.window;
  const base = { id: 's', questionCache: [{ id: 'q1', question: 'Q', correctAnswer: '1' }], index: 0, progress: { entries: [{}] }, mode: 'quick', count: 1 };
  const fixed = new Date(2026, 8, 10, 12, 0, 0).toISOString();
  ['first', 'second', 'third'].forEach((tag, i) => {
    const snap = JSON.parse(JSON.stringify(base));
    snap.id = tag;
    snap.startedAt = fixed;
    snap.lastSavedAt = fixed; // identical to the millisecond
    win.StateStore.saveUnfinishedSnapshot(snap);
  });
  const order = win.StateStore.getUnfinished().map((s) => s.id);
  eq(order.join(','), 'third,second,first', 'same-millisecond snapshots are not newest-first');
  dom.window.close();
});

await test('R6. "Expert" difficulty now generates Expert questions with safe hints', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/practice');
  const pool = win.QuizEngine.buildSession('quick', { count: 40, difficulty: 'Expert' });
  const expert = pool.questionCache.filter((q) => q.difficulty === 'Expert');
  assert(expert.length > 0, 'no Expert questions were generated for an Expert quiz');
  for (const q of expert.slice(0, 10)) {
    const hint = win.Hints.hintFor(q);
    assert(hint && hint.length > 15, `Expert question has no hint: ${q.question}`);
    assert(!win.Hints.revealsAnswer(hint, q), `hint revealed the answer: ${hint} -> ${q.correctAnswer}`);
  }
  dom.window.close();
});

await test('R7. New Expert generators produce self-consistent questions', () => {
  const dom = makeApp();
  const win = dom.window;
  const seen = { successive: 0, reverse: 0, roundtrip: 0 };
  for (let i = 0; i < 400; i++) {
    const q = win.Generator.generateOne(i % 2 === 0 ? 'Percentages' : 'Averages', 'Expert');
    if (!q) continue;
    if (/increased by|decreased by/.test(q.question)) seen.successive++;
    else if (/% of a number is/.test(q.question)) seen.reverse++;
    else if (/returns at/.test(q.question)) seen.roundtrip++;
    // The generator's own answer must be accepted by the grader.
    assert(win.Normalize.compareAnswers(q.correctAnswer, q), `answer not graded correct: ${q.question} -> ${q.correctAnswer}`);
    const hint = win.Hints.hintFor(q);
    assert(hint && hint.length > 15, `no hint for: ${q.question}`);
    assert(!win.Hints.revealsAnswer(hint, q), `hint revealed the answer for: ${q.question}`);
  }
  assert(seen.successive > 0 && seen.reverse > 0 && seen.roundtrip > 0, `generators not reached: ${JSON.stringify(seen)}`);
  dom.window.close();
});

await test('R8. A second toast is not wiped out by the first toast\'s timer', async () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/dashboard');
  const toast = byId(dom, 'toast');
  win.UI.showToast('first message');
  await sleep(1000);
  win.UI.showToast('second message');
  await sleep(1600); // 2.6s after the first toast -> old code hid the second one here
  assert(toast.classList.contains('show'), 'the newer toast was hidden by the older toast timer');
  eq(toast.textContent, 'second message', 'toast text was replaced');
  dom.window.close();
});

await test('R9. getAccountDetails() no longer returns the password salt or hash', async () => {
  const dom = makeApp();
  const win = dom.window;
  const res = await win.Auth.register({ name: 'Tester', email: 't@example.com', password: 'secret123' });
  assert(res && res.ok, 'registration failed: ' + (res && res.msg));
  const details = win.Auth.getAccountDetails();
  assert(details, 'no account details returned');
  eq(details.salt, undefined, 'salt must not be exposed');
  eq(details.hash, undefined, 'hash must not be exposed');
  eq(details.email, 't@example.com', 'email missing from account details');
  assert(details.since, 'since (createdAt) missing from account details');
  dom.window.close();
});

await test('R10. StateStore.deleteSession() removes exactly one history entry', () => {
  const dom = makeApp();
  const win = dom.window;
  const s1 = win.QuizEngine.buildSession('quick', { count: 5 });
  const s2 = win.QuizEngine.buildSession('quick', { count: 5 });
  win.StateStore.recordSession(s1);
  win.StateStore.recordSession(s2);
  eq(win.StateStore.getSessions().length, 2, 'sessions were not recorded');
  win.StateStore.deleteSession(s1.id);
  const left = win.StateStore.getSessions().map((s) => s.id);
  eq(left.length, 1, 'deleteSession removed the wrong number of sessions');
  eq(left[0], s2.id, 'the wrong session was deleted');
  dom.window.close();
});

await test('R11. Fractions accept a negative denominator and match equivalent forms', () => {
  const dom = makeApp();
  const win = dom.window;
  const N = win.Normalize;
  assert(N.parseFraction('7/-20'), 'negative denominator was rejected');
  const q = { question: 'x', correctAnswer: '7/20', acceptedAnswers: [], category: 'Fractions', unit: '' };
  assert(N.compareAnswers('-7/20', q) === false, '-7/20 must not equal 7/20');
  const qNeg = { question: 'y', correctAnswer: '-7/20', acceptedAnswers: [], category: 'Fractions', unit: '' };
  assert(N.compareAnswers('7/-20', qNeg) === true, '7/-20 should equal -7/20');
  dom.window.close();
});

await test('R12. A Content-Security-Policy is declared and nothing loads from the network', () => {
  const html = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
  const csp = html.match(/<meta[^>]+Content-Security-Policy[^>]+content="([^"]+)"/i);
  assert(csp, 'index.html has no CSP meta tag');
  assert(/script-src[^;]*'self'/.test(csp[1]), 'script-src must be restricted');
  assert(/object-src\s+'none'/.test(csp[1]), 'object-src should be none');

  const files = ['index.html', 'sw.js', 'manifest.webmanifest', 'css/styles.css'].concat(
    fs.readdirSync(path.join(PWA, 'js')).map((f) => 'js/' + f)
  );
  for (const rel of files) {
    const src = fs.readFileSync(path.join(PWA, rel), 'utf8');
    const remote = src.match(/https?:\/\/(?!www\.w3\.org)[^\s"'()]+/g);
    assert(!remote, `${rel} references a remote resource: ${remote && remote[0]}`);
  }
});

await test('R13. Every category is seeded, and no card ever shows a bare "0 seeded questions"', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/categories');
  const cards = [...dom.window.document.querySelectorAll('#catGrid .cat-card')];
  assert(cards.length > 0, 'no category cards rendered');
  const seededCounts = (win.QUESTIONS || []).reduce((m, q) => { m[q.category] = (m[q.category] || 0) + 1; return m; }, {});
  cards.forEach((card) => {
    const name = card.querySelector('h3').textContent.trim();
    const meta = card.querySelector('.cat-meta').textContent.trim();
    // the v1.2 bank seeds every category, so a zero count must never appear
    assert(seededCounts[name] > 0, `"${name}" has no seeded questions`);
    assert(!/\b0 seeded questions\b/.test(meta), `"${name}" shows a bare zero count: ${meta}`);
  });
  // and the bank itself must meet the master-prompt minimum
  const perCat = Object.values(seededCounts);
  eq(perCat.length, win.CATEGORIES.length, 'every category in CATEGORIES must be seeded');
  assert(Math.min(...perCat) >= 50, 'each category must carry at least 50 questions, saw ' + Math.min(...perCat));
  dom.window.close();
});

await test('R14. Attempt history is capped at 5000 without losing the newest data', () => {
  // Seeded directly: calling recordAttempt() 5000 times would re-serialise the
  // whole state on every call and OOM jsdom (it is O(n^2) by design of the
  // immediate-persistence model, not a bug in the cap).
  const attempts = [];
  for (let i = 0; i < 5005; i++) attempts.push({ id: 'a' + i, questionId: 'q', category: 'Percentages', isCorrect: true, responseTimeMs: 1, attemptedAt: new Date().toISOString() });
  const dom = makeApp({ 'iscsp-mm-state-v1': JSON.stringify({ attempts, sessions: [], unfinished: [] }) });
  const win = dom.window;

  eq(win.StateStore.getAttempts().length, 5005, 'seeded attempts were not loaded');
  win.StateStore.recordAttempt({ id: 'newest', questionId: 'q', category: 'Percentages', isCorrect: true, responseTimeMs: 1, attemptedAt: new Date().toISOString() });
  const all = win.StateStore.getAttempts();
  eq(all.length, 5000, 'attempts cap (5000) not enforced');
  eq(all[all.length - 1].id, 'newest', 'the newest attempt was dropped instead of the oldest');
  eq(all[0].id, 'a6', 'the oldest attempt was not dropped');
  dom.window.close();
});

await test('R15. An unknown ?cat= route falls back to mixed practice instead of trusting input', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/category?cat=__proto__');
  const quiz = win.QuizEngine.Quiz;
  assert(quiz.isActive(), 'quiz did not start');
  eq(quiz.current.category, null, 'an unknown category should not be stored on the session');
  go(dom, '#/category?cat=Percentages');
  eq(win.QuizEngine.Quiz.current.category, 'Percentages', 'a valid category should still work');
  dom.window.close();
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
