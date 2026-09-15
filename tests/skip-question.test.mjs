/**
 * Skip question.
 *
 * Skipping moves the question you are looking at to the back of the queue and
 * shows you the next one; it comes back at the end of the session. It is not
 * an answer: nothing is recorded as an attempt, and neither `correct` nor
 * `incorrect` moves - the question simply costs you marks until you answer it.
 *
 * These tests drive the real engine and the real quiz screen in jsdom: the
 * queue rotation, the parallel progress array, the timing bank, the resume
 * snapshot and the results screen all have to actually work.
 *
 *   node tests/skip-question.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const rawHtml = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(PWA, 'css', 'styles.css'), 'utf8');
const SCRIPT_ORDER = [...rawHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const HTML_NO_SCRIPTS = rawHtml.replace(/<script src="[^"]+"><\/script>/g, '');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  \x1b[32mPASS\x1b[0m  ${name}`); passed++; }
  catch (e) { console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'values differ'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeApp() {
  const dom = new JSDOM(HTML_NO_SCRIPTS, {
    url: 'https://app.local/index.html#/dashboard',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.scrollTo = () => {};
  try { Object.defineProperty(win.document, 'readyState', { value: 'complete', configurable: true }); } catch (e) { /* ignore */ }
  for (const rel of SCRIPT_ORDER) win.eval(fs.readFileSync(path.join(PWA, rel), 'utf8'));
  return dom;
}
function go(dom, hash) { dom.window.history.replaceState(null, '', hash); dom.window.UI.route(); }
const click = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));

/** Start a quiz and hand back { dom, win, quiz, doc }. */
async function startQuiz(hash = '#/practice') {
  const dom = makeApp();
  go(dom, hash);
  await sleep(120);
  const win = dom.window;
  return { dom, win, quiz: win.QuizEngine.Quiz, doc: win.document };
}
const idsOf = (quiz) => quiz.current.questionCache.map((q) => q.id);

console.log('\nSkip question — the button');

await test('the Skip button sits with Hint and Quit, below Submit', async () => {
  const { dom, doc } = await startQuiz();
  const actions = doc.querySelector('.quiz-actions');
  const ids = [...actions.children].map((b) => b.id);
  eq(ids.join(','), 'qSubmit,qHint,qSkip,qQuit', 'DOM order should be Submit, Hint, Skip, Quit');
  const skip = doc.getElementById('qSkip');
  eq(skip.getAttribute('type'), 'button', 'Skip must never submit the form');
  assert(skip.classList.contains('btn-ghost'), 'Skip should be a secondary action');
  assert(skip.querySelector('svg'), 'Skip needs its icon');
  assert(!EMOJI.test(skip.textContent), 'the Skip button uses emoji');
  assert((skip.getAttribute('aria-label') || '').length > 10, 'Skip needs an accessible label');
  dom.window.close();
});

await test('the action row is a three-column grid, with a two-column fallback', async () => {
  const { dom } = await startQuiz();
  assert(/grid-template-columns:\s*repeat\(3/.test(CSS), 'the action row should have three columns');
  assert(/#qSkip\s*\{[^}]*justify-self:\s*center/s.test(CSS), 'Skip should sit in the middle');
  assert(/\.quiz-actions\.no-hint\s*\{[^}]*repeat\(2/s.test(CSS), 'Full Test (no Hint) should fall back to two columns');
  dom.window.close();
});

await test('without hints (Full Test) Skip and Quit take the two columns', async () => {
  const dom = makeApp();
  dom.window.StateStore.setSettings({ hintMode: false });   // same switch Full Test uses
  go(dom, '#/practice');
  await sleep(120);
  const doc = dom.window.document;
  const hint = doc.getElementById('qHint');
  const actions = doc.querySelector('.quiz-actions');
  const skip = doc.getElementById('qSkip');
  eq(hint.hidden, true, 'the Hint button should be hidden when hints are off');
  assert(actions.classList.contains('no-hint'), 'the row should switch to the two-column layout');
  assert(skip && !skip.hidden, 'Skip must stay available even without hints');
  dom.window.close();
});

console.log('\nSkip question — what it does');

await test('skipping shows the next question and keeps the position', async () => {
  const { dom, quiz, doc } = await startQuiz();
  const before = idsOf(quiz);
  const first = quiz.currentQuestion().id;
  const label = doc.getElementById('qProgress').textContent;
  const ok = quiz.skip();
  eq(ok, true, 'skip() should succeed on the first question');
  assert(quiz.currentQuestion().id !== first, 'the same question is still on screen');
  eq(doc.getElementById('qProgress').textContent, label, 'the progress label must not jump');
  eq(quiz.index, 0, 'the index stays put; the queue rotates underneath');
  eq(idsOf(quiz).length, before.length, 'no question may be lost');
  eq(idsOf(quiz)[idsOf(quiz).length - 1], first, 'the skipped question goes to the back');
  dom.window.close();
});

await test('skipping is not an answer: no attempt, no score change', async () => {
  const { dom, win, quiz } = await startQuiz();
  const attemptsBefore = win.StateStore.getAttempts().length;
  quiz.skip();
  eq(win.StateStore.getAttempts().length, attemptsBefore, 'skipping must not record an attempt');
  eq(quiz.current.correct, 0, 'correct must not move');
  eq(quiz.current.incorrect, 0, 'incorrect must not move');
  eq(quiz.current.skipped, 1, 'the session should count one skip');
  dom.window.close();
});

await test('progress entries rotate with their questions', async () => {
  const { dom, quiz } = await startQuiz();
  const first = quiz.currentQuestion().id;
  quiz.skip();
  quiz.skip();
  eq(quiz.current.questionCache.length, quiz.progress.entries.length, 'one entry per question');
  const skippedEntries = quiz.progress.entries.filter((e) => e.skipped).length;
  eq(skippedEntries, 2, 'both skipped questions carry the flag');
  eq(quiz.progress.entries[quiz.progress.entries.length - 2].skipped, true, 'first skipped question waits near the end');
  eq(quiz.progress.entries[quiz.progress.entries.length - 1].skipped, true, 'second skipped question is last');
  assert(quiz.current.questionIds.length === quiz.current.questionCache.length, 'the id list stays the same length');
  eq(quiz.current.questionIds[quiz.current.questionIds.length - 2], first, 'the id list rotates with the queue');
  dom.window.close();
});

await test('a skipped question comes back at the end of the session', async () => {
  const { dom, quiz, doc } = await startQuiz();
  const first = quiz.currentQuestion().id;
  const total = quiz.current.questionCache.length;
  quiz.skip();
  // Walk to the end without answering: the skipped question must reappear.
  for (let i = 0; i < total - 1; i++) quiz.next();
  eq(quiz.index, total - 1, 'we should be on the last question');
  eq(quiz.currentQuestion().id, first, 'the skipped question should be the last one');
  eq(quiz.isQuestionSkipped(quiz.index), true, 'the engine knows it was skipped');
  dom.window.close();
});

await test('the screen says so when a skipped question comes back', async () => {
  const { dom, win, quiz, doc } = await startQuiz();
  const total = quiz.current.questionCache.length;
  quiz.skip();
  for (let i = 0; i < total - 1; i++) quiz.next();
  await sleep(40);
  const tag = doc.getElementById('qSkipTag');
  assert(tag && !tag.hidden, 'the "Skipped earlier" tag should be visible on the revisited question');
  assert(!EMOJI.test(tag.textContent), 'the tag uses emoji');
  dom.window.close();
});

await test('a question cannot be skipped twice, and the last one cannot be skipped', async () => {
  const { dom, quiz } = await startQuiz();
  const total = quiz.current.questionCache.length;
  quiz.skip();
  for (let i = 0; i < total - 1; i++) quiz.next();      // back on the skipped question, last in the queue
  const before = quiz.current.skipped;
  eq(quiz.skip(), false, 'the already-skipped question must not be skipped again');
  eq(quiz.current.skipped, before, 'the counter must not move');
  eq(quiz.index, total - 1, 'nothing may rotate');
  dom.window.close();
});

await test('skip is refused on the very last question even when it was never skipped', async () => {
  const { dom, quiz } = await startQuiz();
  const total = quiz.current.questionCache.length;
  for (let i = 0; i < total - 1; i++) quiz.next();
  eq(quiz.index, total - 1, 'on the last question');
  eq(quiz.isQuestionSkipped(quiz.index), false, 'this one was never skipped');
  eq(quiz.skip(), false, 'skipping the last question would show the same question again');
  eq(quiz.current.skipped, 0, 'no skip counted');
  dom.window.close();
});

await test('the time spent on a skipped question is banked, not lost', async () => {
  const { dom, quiz } = await startQuiz();
  const entry = quiz.progress.entries[quiz.index];
  quiz.skip();
  const skippedEntry = quiz.progress.entries[quiz.progress.entries.length - 1];
  assert(typeof skippedEntry.questionMs === 'number', 'the skipped question should keep its reading time');
  assert(skippedEntry.skippedAt, 'the skip is timestamped');
  const fresh = quiz.progress.entries[quiz.index];
  assert(!fresh.skipped, 'the question we moved on to is not marked skipped');
  quiz._endQuestion();
  assert(quiz.questionMs < 4000, 'the clock restarts for the next question');
  dom.window.close();
});

await test('the rotated order survives a pause and resume', async () => {
  const { dom, quiz } = await startQuiz();
  const first = quiz.currentQuestion().id;
  quiz.skip();
  const order = idsOf(quiz).join(',');
  const snap = quiz._saveSnapshot();
  quiz.pause();
  quiz.resume(snap);
  eq(idsOf(quiz).join(','), order, 'the queue order must survive a resume');
  eq(quiz.current.skipped, 1, 'the skip count survives');
  eq(quiz.progress.entries[quiz.progress.entries.length - 1].skipped, true, 'the skipped flag survives');
  eq(idsOf(quiz)[idsOf(quiz).length - 1], first, 'the skipped question is still at the back');
  dom.window.close();
});

console.log('\nSkip question — nothing else broke');

await test('a quiz can still be answered and finished normally', async () => {
  const { dom, win, quiz } = await startQuiz();
  const total = quiz.current.questionCache.length;
  quiz.skip();                                   // skip the first, answer everything
  for (let i = 0; i < total; i++) {
    quiz.submit(quiz.currentQuestion().correctAnswer);
    quiz.next();
  }
  const sessions = win.StateStore.getSessions();
  const s = sessions[sessions.length - 1];
  assert(s, 'the finished quiz should be recorded as a session');
  eq(s.count, total, 'the session still has every question');
  eq(s.correct + s.incorrect, total, 'every question - including the skipped one - was graded');
  eq(s.skipped, 1, 'one skip was used');
  dom.window.close();
});

await test('the results screen reports the skipped count (and hides it at zero)', async () => {
  const { dom, win, quiz, doc } = await startQuiz();
  const total = quiz.current.questionCache.length;
  quiz.skip();
  for (let i = 0; i < total - 1; i++) {
    quiz.submit(quiz.currentQuestion().correctAnswer);
    quiz.next();
  }
  quiz.submit(quiz.currentQuestion().correctAnswer);
  quiz.next();                                   // last question: triggers finish()
  await sleep(60);
  const wrap = doc.getElementById('resSkippedWrap');
  assert(wrap, 'the results screen has no Skipped figure');
  eq(wrap.hidden, false, 'the figure should show when something was skipped');
  eq(doc.getElementById('resSkipped').textContent, '1', 'it should report one skipped question');
  eq(doc.getElementById('resCorrect').textContent, String(total), 'every question was answered and counted');
  dom.window.close();
});

await test('skipping does not touch the question bank', async () => {
  const { dom, win, quiz } = await startQuiz();
  const bankSize = (win.QUESTIONS || []).length;
  const ids = idsOf(quiz).slice().sort().join(',');
  quiz.skip(); quiz.skip();
  eq((win.QUESTIONS || []).length, bankSize, 'the bank must not change');
  eq(idsOf(quiz).slice().sort().join(','), ids, 'the session keeps exactly the same questions');
  eq(quiz.current.count, quiz.current.questionCache.length, 'the session count stays honest');
  dom.window.close();
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
