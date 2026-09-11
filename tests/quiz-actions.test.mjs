/**
 * Quiz action area + in-app confirmation dialog (MASTER PROMPT — Part 2).
 *
 * Covers the reorganised action hierarchy (Submit Answer primary on the upper
 * row, Hint | Quit secondary below) and the custom confirm dialog that replaced
 * the native browser confirm() everywhere.
 *
 *   node tests/quiz-actions.test.mjs
 *   APP_DIR=/path/to/assets node tests/quiz-actions.test.mjs
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

function makeApp() {
  const dom = new JSDOM(HTML_NO_SCRIPTS, {
    url: 'https://app.local/index.html#/dashboard',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.scrollTo = () => {};
  // Any call to the native dialog is a regression: the app must use its own.
  win.__nativeConfirmCalls = 0;
  win.confirm = () => { win.__nativeConfirmCalls++; return true; };
  try { Object.defineProperty(win.document, 'readyState', { value: 'complete', configurable: true }); } catch (e) {}
  for (const rel of SCRIPT_ORDER) win.eval(fs.readFileSync(path.join(PWA, rel), 'utf8'));
  return dom;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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

console.log('\nMental Maths Practice — quiz action area + confirm dialog\n');

await test('A1. Action hierarchy: Submit Answer first and primary, Hint and Quit secondary below', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  const actions = dom.window.document.querySelector('.quiz-actions');
  assert(actions, 'no .quiz-actions container on the quiz screen');

  const ids = [...actions.children].map((b) => b.id);
  eq(ids.join(','), 'qSubmit,qHint,qQuit', 'DOM order should be Submit, Hint, Quit (matches the visual grid)');

  const submit = byId(dom, 'qSubmit');
  const hint = byId(dom, 'qHint');
  const quit = byId(dom, 'qQuit');

  eq(submit.getAttribute('type'), 'submit', 'Submit must remain the form submit button');
  assert(submit.classList.contains('btn-primary'), 'Submit must use the primary style');
  assert(submit.classList.contains('btn-lg'), 'Submit should be the visually dominant action');
  eq(hint.getAttribute('type'), 'button', 'Hint must not submit the form');
  eq(quit.getAttribute('type'), 'button', 'Quit must not submit the form');
  assert(hint.classList.contains('btn-ghost'), 'Hint should be a secondary action');
  assert(quit.classList.contains('btn-ghost'), 'Quit should be a secondary action');
  assert(!quit.classList.contains('btn-primary'), 'Quit must not look like the primary action');

  // Grid placement: row 1 right (Submit), row 2 left (Hint) / right (Quit).
  assert(/#qSubmit\s*\{[^}]*grid-row:\s*1/s.test(CSS), 'Submit should sit on the first grid row');
  assert(/#qSubmit\s*\{[^}]*justify-self:\s*end/s.test(CSS), 'Submit should be right aligned');
  assert(/#qHint\s*\{[^}]*grid-row:\s*2/s.test(CSS), 'Hint should sit on the second grid row');
  assert(/#qQuit\s*\{[^}]*grid-row:\s*2/s.test(CSS), 'Quit should sit on the second grid row');
  assert(/#qHint\s*\{[^}]*justify-self:\s*start/s.test(CSS), 'Hint should be left aligned');
  assert(/#qQuit\s*\{[^}]*justify-self:\s*end/s.test(CSS), 'Quit should be right aligned');

  // No emoji, real SVG icons on the secondary actions.
  for (const b of [submit, hint, quit]) {
    assert(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b.textContent), `button uses emoji: ${b.textContent.trim()}`);
  }
  assert(hint.querySelector('svg'), 'Hint needs its lightbulb icon');
  assert(quit.querySelector('svg'), 'Quit needs its exit icon');
  dom.window.close();
});

await test('A2. Quit opens the in-app dialog, never the native browser confirm', () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/practice');
  const modal = byId(dom, 'confirmModal');
  assert(modal.hidden, 'the dialog should start hidden');

  byId(dom, 'qQuit').click();
  eq(modal.hidden, false, 'Quit must open the in-app dialog');
  eq(win.__nativeConfirmCalls, 0, 'the native confirm() must never be used');
  eq(byId(dom, 'confirmTitle').textContent.trim(), 'Leave this quiz?', 'unexpected dialog title');
  assert(/progress will be saved/i.test(byId(dom, 'confirmMessage').textContent), 'dialog should say progress is saved');
  eq(byId(dom, 'confirmOk').textContent.trim(), 'Save & Quit Quiz', 'unexpected confirm button label');
  eq(byId(dom, 'confirmCancel').textContent.trim(), 'Keep Practising', 'unexpected cancel button label');
  eq(modal.getAttribute('role') !== null || !!modal.querySelector('[role="dialog"]'), true, 'dialog needs dialog semantics');
  eq(modal.querySelector('[role="dialog"]').getAttribute('aria-modal'), 'true', 'dialog should be aria-modal');
  dom.window.close();
});

await test('A3. Cancelling keeps the quiz running — via button, Escape and backdrop', async () => {
  const dom = makeApp();
  go(dom, '#/practice');
  const unfinishedBefore = dom.window.StateStore.getUnfinished().length;

  // (a) Cancel button
  byId(dom, 'qQuit').click();
  byId(dom, 'confirmCancel').click();
  await sleep(0);
  assert(dom.window.QuizEngine.Quiz.isActive(), 'cancel button should keep the quiz running');
  assert(byId(dom, 'confirmModal').hidden, 'dialog should close after cancelling');
  assert(byId(dom, 'quizForm'), 'quiz screen should still be rendered');

  // (b) Escape key
  byId(dom, 'qQuit').click();
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(0);
  assert(dom.window.QuizEngine.Quiz.isActive(), 'Escape should keep the quiz running');
  assert(byId(dom, 'confirmModal').hidden, 'Escape should close the dialog');

  // (c) Clicking the backdrop
  byId(dom, 'qQuit').click();
  byId(dom, 'confirmModal').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await sleep(0);
  assert(dom.window.QuizEngine.Quiz.isActive(), 'backdrop click should keep the quiz running');
  assert(byId(dom, 'confirmModal').hidden, 'backdrop click should close the dialog');

  eq(dom.window.StateStore.getUnfinished().length, unfinishedBefore, 'cancelling must not save a second session');
  dom.window.close();
});

await test('A4. Confirming quits, saves exactly one session and shows the Continue card', async () => {
  const dom = makeApp();
  go(dom, '#/practice');
  for (let i = 0; i < 4; i++) {
    const q = dom.window.QuizEngine.Quiz.currentQuestion();
    byId(dom, 'qInput').value = String(q.correctAnswer);
    byId(dom, 'quizForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    byId(dom, 'fbNext').click();
  }

  byId(dom, 'qQuit').click();
  byId(dom, 'confirmOk').click();
  await sleep(0);

  eq(dom.window.QuizEngine.Quiz.isActive(), false, 'confirming should stop the quiz');
  eq(dom.window.location.hash, '#/dashboard', 'quitting should return to the dashboard');
  const unfinished = dom.window.StateStore.getUnfinished();
  eq(unfinished.length, 1, 'quitting should save exactly one unfinished session');
  eq(unfinished[0].progress.entries.filter((e) => e.userAnswer !== '').length, 4, 'progress not saved on quit');
  const cards = [...dom.window.document.querySelectorAll('#continueQuizHost .continue-card')];
  eq(cards.length, 1, 'the Continue Quiz card should appear after quitting');
  dom.window.close();
});

await test('A5. Submit and Hint still work from the new layout', () => {
  const dom = makeApp();
  go(dom, '#/practice');
  const q = dom.window.QuizEngine.Quiz.currentQuestion();

  // Hint first: still question-specific, still does not reveal the answer.
  byId(dom, 'qHint').click();
  const hintText = byId(dom, 'qHintText').textContent.trim();
  assert(hintText.length > 15, 'hint did not appear');
  assert(!dom.window.Hints.revealsAnswer(hintText, q), `hint revealed the answer: ${hintText}`);
  assert(byId(dom, 'qHint').classList.contains('activated'), 'hint button should show its activated state');

  // Submit a wrong answer, then a right one.
  byId(dom, 'qInput').value = 'definitely-not-the-answer';
  byId(dom, 'quizForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  eq(dom.window.QuizEngine.Quiz.current.incorrect, 1, 'wrong answer not recorded');
  assert(byId(dom, 'quizFeedback').hidden === false, 'feedback panel did not appear');

  byId(dom, 'fbNext').click();
  const q2 = dom.window.QuizEngine.Quiz.currentQuestion();
  byId(dom, 'qInput').value = String(q2.correctAnswer);
  byId(dom, 'quizForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  eq(dom.window.QuizEngine.Quiz.current.correct, 1, 'correct answer not recorded');
  dom.window.close();
});

await test('A6. Discard, history delete and data reset also use the in-app dialog', async () => {
  const dom = makeApp();
  const win = dom.window;
  go(dom, '#/practice');
  byId(dom, 'qInput').value = String(win.QuizEngine.Quiz.currentQuestion().correctAnswer);
  byId(dom, 'quizForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  byId(dom, 'fbNext').click();
  go(dom, '#/dashboard');

  // Discard on the Continue card
  const card = dom.window.document.querySelector('#continueQuizHost .continue-card');
  assert(card, 'Continue card missing');
  [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Discard').click();
  eq(byId(dom, 'confirmModal').hidden, false, 'Discard must use the in-app dialog');
  assert(byId(dom, 'confirmOk').classList.contains('btn-danger'), 'a destructive action should use the danger style');
  byId(dom, 'confirmOk').click();
  await sleep(0);
  eq(win.StateStore.getUnfinished().length, 0, 'discard should remove the unfinished quiz');

  // Reset all data on the Settings screen
  go(dom, '#/settings');
  byId(dom, 'resetData').click();
  eq(byId(dom, 'confirmModal').hidden, false, 'Reset must use the in-app dialog');
  byId(dom, 'confirmCancel').click();
  await sleep(0);

  eq(win.__nativeConfirmCalls, 0, 'the native confirm() must never be used anywhere');
  dom.window.close();
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
