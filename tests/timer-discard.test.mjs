/**
 * End-to-end tests for the quiz timer and for discarding an unfinished quiz.
 *
 * Both features are driven through the REAL UI (real buttons, real modal,
 * real localStorage, real wall-clock time) - no stubbing of Date.now, so a
 * timer that only looks right because a counter was incremented still fails.
 *
 *   node tests/timer-discard.test.mjs
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

function makeApp(seedStorage) {
  const dom = new JSDOM(HTML_NO_SCRIPTS, {
    url: 'https://app.local/index.html#/dashboard',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.confirm = () => true;
  win.scrollTo = () => {};
  try { Object.defineProperty(win.document, 'readyState', { value: 'complete', configurable: true }); } catch (e) { /* ignore */ }
  if (seedStorage) for (const [k, v] of Object.entries(seedStorage)) win.localStorage.setItem(k, v);
  for (const rel of SCRIPT_ORDER) win.eval(fs.readFileSync(path.join(PWA, rel), 'utf8'));
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
const byId = (dom, id) => dom.window.document.getElementById(id);
const SETTLE_MS = 120;  // long enough for jsdom's queued hashchange to fire
// Poll instead of assuming one sleep is enough: under load jsdom can take a
// while to deliver the hashchange that renders the next screen.
async function waitFor(fn, timeout, label) {
  const deadline = Date.now() + (timeout || 2000);
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label || 'condition'}`);
    await sleep(20);
  }
}
// jsdom fires hashchange asynchronously, so setting the hash AND routing by
// hand would otherwise re-route a tick later - pausing the quiz we just
// started. Navigating through this helper waits for that to settle first.
async function go(dom, hash) {
  const same = dom.window.location.hash === hash;
  dom.window.location.hash = hash;
  if (same) dom.window.UI.route();   // no hashchange will fire for this one
  await sleep(SETTLE_MS);
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  \x1b[32mPASS\x1b[0m  ${name}`); passed++; }
  catch (e) { console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'not equal'}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

// Answer the current question correctly through the real form.
function answerCurrent(dom, answer) {
  const win = dom.window;
  const q = win.QuizEngine.Quiz.currentQuestion();
  byId(dom, 'qInput').value = (answer != null ? answer : q.correctAnswer);
  byId(dom, 'quizForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
}
function advance(dom) { byId(dom, 'fbNext').click(); }

// Build N unfinished sessions without touching the UI (used to set up state).
function makeUnfinished(win, mode, answered) {
  // Always leave at least a couple of questions unanswered so the session
  // stays unfinished instead of completing itself.
  const s = win.QuizEngine.buildSession(mode, { count: answered + 3 });
  win.QuizEngine.Quiz.start(s);
  for (let i = 0; i < answered; i++) {
    win.QuizEngine.Quiz.submit(String(win.QuizEngine.Quiz.currentQuestion().correctAnswer));
    win.QuizEngine.Quiz.next();
  }
  const snap = win.QuizEngine.Quiz.quit();
  win.QuizEngine.Quiz._detachCallbacks();
  return snap;
}

console.log('\nDiscard quiz');

await test('D1. Discard deletes only the selected unfinished quiz (from storage, not just the DOM)', async () => {
  const dom = makeApp(); const win = dom.window;
  const a = makeUnfinished(win, 'quick', 2);
  const b = makeUnfinished(win, 'category', 1);
  eq(win.StateStore.getUnfinished().length, 2, 'both quizzes should be unfinished');

  await go(dom, '#/dashboard');
  const cards = win.document.querySelectorAll('.continue-card');
  eq(cards.length, 2, 'dashboard should show two cards');
  eq(cards[0].getAttribute('data-session-id'), String(b.id), 'the most recent quiz is shown first');

  // Discard the primary (most recent) one.
  cards[0].querySelector('.continue-actions .btn-ghost').click();
  await sleep(10);
  eq(byId(dom, 'confirmModal').hidden, false, 'confirmation modal did not open');
  eq(byId(dom, 'confirmTitle').textContent, 'Discard this quiz?', 'wrong modal title');
  byId(dom, 'confirmOk').click();
  await sleep(10);

  const left = win.StateStore.getUnfinished();
  eq(left.length, 1, 'one unfinished quiz should remain');
  assert(!left.some((s) => String(s.id) === String(b.id)), 'the discarded quiz is still in storage');
  eq(String(left[0].id), String(a.id), 'the wrong quiz was discarded');
  eq(win.document.querySelectorAll('.continue-card').length, 1, 'dashboard did not refresh immediately');
  dom.window.close();
});

await test('D2. A discarded quiz does not come back after the app is closed and reopened', async () => {
  const dom = makeApp(); const win = dom.window;
  const a = makeUnfinished(win, 'quick', 1);
  const b = makeUnfinished(win, 'timed', 1);
  await go(dom, '#/dashboard');
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(10);
  const storage = dumpStorage(win);
  dom.window.close();

  // Simulate reopening the app with the same persisted state.
  const dom2 = makeApp(storage); const win2 = dom2.window;
  const ids = win2.StateStore.getUnfinished().map((s) => String(s.id));
  assert(!ids.includes(String(b.id)), 'the discarded quiz came back after a reload');
  assert(ids.includes(String(a.id)), 'the other unfinished quiz was lost on reload');
  dom2.window.close();
});

await test('D3. "Keep It" closes the modal and deletes nothing', async () => {
  const dom = makeApp(); const win = dom.window;
  const a = makeUnfinished(win, 'quick', 3);
  await go(dom, '#/dashboard');
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmCancel').click();
  await sleep(10);
  eq(byId(dom, 'confirmModal').hidden, true, 'modal should be closed');
  eq(win.StateStore.getUnfinished().length, 1, 'quiz must survive "Keep It"');
  eq(win.document.querySelectorAll('.continue-card').length, 1, 'card must still be on the dashboard');
  // And it is still resumable.
  await go(dom, `#/resume?id=${a.id}`);
  assert(win.QuizEngine.Quiz.isActive(), 'a kept quiz must still resume');
  dom.window.close();
});

await test('D4. Discarding from "Other unfinished quizzes" removes that one and keeps the rest', async () => {
  const dom = makeApp(); const win = dom.window;
  const first = makeUnfinished(win, 'quick', 1);
  const second = makeUnfinished(win, 'category', 2);
  const third = makeUnfinished(win, 'fulltest', 0);
  await go(dom, '#/dashboard');
  const others = win.document.querySelectorAll('.continue-others-body .continue-card');
  eq(others.length, 2, 'two quizzes should be in the collapsed list');
  const targetId = others[0].getAttribute('data-session-id');
  others[0].querySelector('.continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(10);
  const ids = win.StateStore.getUnfinished().map((s) => String(s.id));
  assert(!ids.includes(String(targetId)), 'the discarded quiz is still there');
  eq(ids.length, 2, 'the other unfinished quizzes must be untouched');
  eq(win.document.querySelectorAll('.continue-card').length, 2, 'dashboard should show two cards now');
  dom.window.close();
});

await test('D5. Discarding leaves completed history, attempts and statistics untouched', async () => {
  const dom = makeApp(); const win = dom.window;
  // A completed session first.
  const done = win.QuizEngine.buildSession('quick', { count: 3 });
  win.QuizEngine.Quiz.start(done);
  for (let i = 0; i < 3; i++) { win.QuizEngine.Quiz.submit(String(win.QuizEngine.Quiz.currentQuestion().correctAnswer)); win.QuizEngine.Quiz.next(); }
  win.QuizEngine.Quiz._detachCallbacks();
  const sessionsBefore = win.StateStore.getSessions().length;
  const attemptsBefore = win.StateStore.getAttempts().length;
  eq(sessionsBefore, 1, 'the finished quiz should be in the history');

  const live = makeUnfinished(win, 'category', 2);
  const attemptsBeforeDiscard = win.StateStore.getAttempts().length;
  await go(dom, '#/dashboard');
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(10);

  eq(win.StateStore.getSessions().length, sessionsBefore, 'completed history must not change');
  eq(win.StateStore.getAttempts().length, attemptsBeforeDiscard, 'attempts must not change');
  assert(win.Stats.totals().total > 0, 'overall statistics must survive a discard');
  dom.window.close();
});

await test('D6. Discarding the quiz that is currently open stops it from being re-saved', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  answerCurrent(dom);
  const id = String(win.QuizEngine.Quiz.current.id);
  await go(dom, '#/dashboard');            // navigates away -> pause() saves it
  eq(win.StateStore.getUnfinished().filter((s) => String(s.id) === id).length, 1, 'the open quiz should be pending');
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(60);                        // long enough for any stray tick
  eq(win.StateStore.getUnfinished().filter((s) => String(s.id) === id).length, 0, 'a running quiz must stay discarded');
  dom.window.close();
});

await test('D7. The exact user flow: start, answer, leave, Keep It, then Discard', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  (await waitFor(() => win.document.querySelector('.diff-card'), 2000, 'chooser')).click();
  await waitFor(() => win.QuizEngine.Quiz.isActive(), 2000, 'session');
  for (let i = 0; i < 3; i++) { answerCurrent(dom); advance(dom); }
  await go(dom, '#/dashboard');                       // leave it unfinished
  eq(win.StateStore.getUnfinished().length, 1, 'the quiz should be saved as unfinished');
  eq(win.document.querySelectorAll('.continue-card').length, 1, 'Continue Quiz should show it');

  // "Keep It" first
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmCancel').click();
  await sleep(10);
  eq(win.StateStore.getUnfinished().length, 1, 'Keep It must not delete anything');

  // now discard for real
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(20);
  eq(win.StateStore.getUnfinished().length, 0, 'the quiz must be gone from storage');
  eq(win.document.querySelectorAll('.continue-card').length, 0, 'the card must disappear immediately');
  eq(byId(dom, 'continueSection').hidden, true, 'the Continue Quiz section should hide when empty');

  const storage = dumpStorage(win);
  dom.window.close();
  const dom2 = makeApp(storage);
  eq(dom2.window.StateStore.getUnfinished().length, 0, 'it must not come back after reopening the app');
  // ...and a brand new quiz can still be saved and discarded afterwards.
  const win2 = dom2.window;
  await go(dom2, '#/setup?mode=quick');
  (await waitFor(() => win2.document.querySelector('.diff-card'), 2000, 'chooser')).click();
  await waitFor(() => win2.QuizEngine.Quiz.isActive(), 2000, 'session');
  answerCurrent(dom2);
  await go(dom2, '#/dashboard');
  eq(win2.StateStore.getUnfinished().length, 1, 'a new unfinished quiz should be stored');
  win2.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  dom2.window.document.getElementById('confirmOk').click();
  await sleep(20);
  eq(win2.StateStore.getUnfinished().length, 0, 'the new quiz must discard too');
  dom2.window.close();
});

await test('D8. Three unfinished quizzes: discarding the middle one leaves the other two', async () => {
  const dom = makeApp(); const win = dom.window;
  const a = makeUnfinished(win, 'quick', 4);
  const b = makeUnfinished(win, 'category', 7);
  const c = makeUnfinished(win, 'timed', 2);
  await go(dom, '#/dashboard');
  eq(win.document.querySelectorAll('.continue-card').length, 3, 'three cards expected');
  const others = win.document.querySelectorAll('.continue-others-body .continue-card');
  eq(others.length, 2, 'two should be in the collapsed list');
  eq(others[0].getAttribute('data-session-id'), String(b.id), 'the middle quiz is first in the list');

  others[0].querySelector('.continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(20);

  const ids = win.StateStore.getUnfinished().map((x) => String(x.id));
  assert(!ids.includes(String(b.id)), 'Quiz B must be discarded');
  assert(ids.includes(String(a.id)), 'Quiz A must survive');
  assert(ids.includes(String(c.id)), 'Quiz C must survive');
  eq(ids.length, 2, 'exactly one quiz should have been removed');
  const cards = [...win.document.querySelectorAll('.continue-card')].map((el) => el.getAttribute('data-session-id'));
  assert(!cards.includes(String(b.id)), 'the discarded quiz must not be rendered any more');
  eq(cards.length, 2, 'the dashboard shows the two remaining quizzes');
  dom.window.close();
});

await test('D9. Discard still works when the stored copy disagrees with the card snapshot', async () => {
  const dom = makeApp(); const win = dom.window;
  const a = makeUnfinished(win, 'quick', 2);
  const b = makeUnfinished(win, 'category', 3);
  await go(dom, '#/dashboard');
  // Simulate the stored copy drifting away from the snapshot the card was
  // built from (an id that round-tripped through JSON, or a re-save that
  // replaced the object). Replace it with a clone carrying a new id, so the
  // card's own id no longer matches anything in storage.
  const arr = win.StateStore.State.data.unfinished;
  const i = arr.findIndex((x) => String(x.id) === String(b.id));
  arr[i] = JSON.parse(JSON.stringify(arr[i]));
  arr[i].id = 'stale-' + String(b.id);
  const card = [...win.document.querySelectorAll('.continue-card')].find((el) => el.getAttribute('data-session-id') === String(b.id));
  assert(card, 'the card built from the older snapshot should still be rendered');
  card.querySelector('.continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(20);
  const ids = win.StateStore.getUnfinished().map((x) => String(x.id));
  assert(!ids.includes('stale-' + String(b.id)), 'the stale entry must be removed by the fallback');
  assert(ids.includes(String(a.id)), 'the other quiz must be untouched');
  dom.window.close();
});

await test('D10. The discard tells the user what happened', async () => {
  const dom = makeApp(); const win = dom.window;
  makeUnfinished(win, 'quick', 1);
  makeUnfinished(win, 'category', 1);
  await go(dom, '#/dashboard');
  win.document.querySelector('.continue-card .continue-actions .btn-ghost').click();
  await sleep(10);
  byId(dom, 'confirmOk').click();
  await sleep(20);
  const toast = byId(dom, 'toast');
  assert(/discarded/i.test(toast.textContent), `the user should be told it was discarded (got "${toast.textContent}")`);
  assert(/1 unfinished quiz left/i.test(toast.textContent), `the remaining count should be reported (got "${toast.textContent}")`);
  dom.window.close();
});

console.log('\nQuiz timer');

await test('T1. An untimed quiz timer starts as soon as the quiz does and keeps running', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  const eng = win.QuizEngine.Quiz;
  eq(byId(dom, 'qTimer').hidden, false, 'the timer should be visible');
  assert(/^00:0[01]$/.test(byId(dom, 'qTimerText').textContent), `timer should start near zero, got ${byId(dom, 'qTimerText').textContent}`);
  await sleep(1300);
  const shown = byId(dom, 'qTimerText').textContent;
  assert(shown === '00:01' || shown === '00:02', `timer should have advanced past 00:00, got ${shown}`);
  assert(eng.elapsedMsNow() >= 1000, `engine elapsed should be >= 1s, got ${eng.elapsedMsNow()}`);
  dom.window.close();
});

await test('T2. The timer keeps running across question transitions and answer submissions', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  const eng = win.QuizEngine.Quiz;
  await sleep(600);
  answerCurrent(dom);                       // question 1 answered
  const afterFirstAnswer = eng.elapsedMsNow();
  advance(dom);                             // -> question 2
  assert(eng.index === 1, 'should be on question 2');
  const q2Start = eng.questionMsNow();
  assert(q2Start < 200, 'the per-question clock must reset for the new question');
  await sleep(700);
  assert(eng.questionMsNow() >= 600, 'the new question is not being timed');
  assert(eng.elapsedMsNow() > afterFirstAnswer, 'the session clock must keep running');
  answerCurrent(dom);
  advance(dom);
  await sleep(500);
  assert(eng.elapsedMsNow() > 1500, 'the session clock stopped after the second answer');
  // Per-answer timings were recorded, not lost.
  const timed = eng.progress.entries.filter((e) => e && e.responseTimeMs > 0).length;
  assert(timed >= 2, `per-question timings were not recorded (${timed})`);
  dom.window.close();
});

await test('T3. Timing is derived from real timestamps, not from counting ticks', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  const eng = win.QuizEngine.Quiz;
  const t0 = Date.now();
  await sleep(1500);
  const measured = Date.now() - t0;
  const reported = eng.elapsedMsNow();
  // The engine may be marginally behind a Date.now() reading taken a hair
  // earlier, but it must never be off by more than a few hundred ms.
  assert(Math.abs(reported - measured) < 400, `elapsed drifted from the real clock: ${reported}ms vs ${measured}ms`);
  dom.window.close();
});

await test('T4. A countdown quiz counts down from its limit and never goes negative', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/timed');
  const eng = win.QuizEngine.Quiz;
  eq(eng.current.timeLimitSec, 600, 'timed quiz should be 10 minutes');
  assert(eng.remainingSec > 590 && eng.remainingSec <= 600, `countdown should start near 10:00, got ${eng.remainingSec}`);
  eq(byId(dom, 'qTimerText').textContent, '10:00', 'the display should start at 10:00');
  await sleep(1300);
  assert(eng.remainingSec < 600, 'countdown did not move');
  assert(eng.remainingSec >= 597, `countdown moved too far (${eng.remainingSec})`);
  assert(/^09:5\d$/.test(byId(dom, 'qTimerText').textContent), `display should be 09:5x, got ${byId(dom, 'qTimerText').textContent}`);
  assert(eng.remainingMsNow() >= 0, 'remaining time must never be negative');
  dom.window.close();
});

await test('T5. When the countdown reaches zero the quiz finishes itself and is saved', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/timed');
  const eng = win.QuizEngine.Quiz;
  const finishedId = String(eng.current.id);
  answerCurrent(dom);                 // bank one answer so the result has content
  // Wind the countdown down to ~0.4s using the window's own clock, which is
  // the time base the engine measures against. The engine still derives the
  // remaining time from timestamps, so this exercises the real path.
  eng.deadline = win.performance.now() + 400;
  await sleep(900);
  eq(eng.isActive(), false, 'the quiz should have finished itself');
  assert(!win.StateStore.getUnfinished().some((s) => String(s.id) === finishedId),
    'a finished quiz must not stay unfinished');
  eq(win.StateStore.getSessions().length, 1, 'the finished quiz should be in the history');
  assert(byId(dom, 'resScore') !== null, 'the results screen should be shown');
  dom.window.close();
});

await test('T6. Resuming continues the clock instead of resetting it', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  answerCurrent(dom);
  await sleep(1200);
  const beforeQuit = win.QuizEngine.Quiz.elapsedMsNow();
  assert(beforeQuit >= 1000, 'the quiz should have been running for a second');
  byId(dom, 'qQuit').click();                    // in-app modal
  await sleep(10);
  byId(dom, 'confirmOk').click();                // "Save & Quit Quiz"
  await sleep(10);
  const saved = win.StateStore.getUnfinished()[0];
  assert(saved.elapsedMs >= 1000, `the elapsed time was not saved (${saved.elapsedMs})`);

  await go(dom, `#/resume?id=${saved.id}`);
  const eng = win.QuizEngine.Quiz;
  assert(eng.elapsedMsNow() >= 1000, `the resumed clock restarted at zero (${eng.elapsedMsNow()})`);
  assert(byId(dom, 'qTimerText').textContent !== '00:00', 'the display must not reset to 00:00 on resume');
  await sleep(700);
  assert(eng.elapsedMsNow() > beforeQuit + 500, 'the clock is not running after the resume');
  dom.window.close();
});

await test('T7. Every practice mode starts a working timer', async () => {
  for (const mode of ['quick', 'category', 'weak', 'mistakes', 'fulltest']) {
    const dom = makeApp(); const win = dom.window;
    try {
      if (mode === 'category') await go(dom, '#/setup?mode=category&cat=Percentages');
      else await go(dom, `#/setup?mode=${mode}`);
      const card = await waitFor(() => win.document.querySelector('.diff-card'), 2000, `${mode}: difficulty chooser`);
      card.click();
      await waitFor(() => win.QuizEngine.Quiz.isActive(), 2000, `${mode}: session start`);
      const start = win.QuizEngine.Quiz.elapsedMsNow();
      await sleep(600);
      const later = win.QuizEngine.Quiz.elapsedMsNow();
      if (!(later > start + 300)) throw new Error(`${mode}: timer did not advance (${start} -> ${later})`);
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(win.document.getElementById('qTimerText').textContent)) {
        throw new Error(`${mode}: timer display is malformed (${win.document.getElementById('qTimerText').textContent})`);
      }
    } finally { dom.window.close(); }
  }
});

await test('T8. The timer still throttles persistence (no write storm)', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  let writes = 0;
  const realSetItem = win.localStorage.setItem.bind(win.localStorage);
  win.localStorage.setItem = (...args) => { writes++; return realSetItem(...args); };
  await sleep(6400);
  assert(writes <= 2, `the timer wrote localStorage ${writes} times in ~6.4s (expected <= 2)`);
  dom.window.close();
});

await test('T9. Time spent away from the quiz does not count toward the elapsed time', async () => {
  const dom = makeApp(); const win = dom.window;
  await go(dom, '#/setup?mode=quick');
  win.document.querySelector('.diff-card').click();
  await sleep(600);
  const before = win.QuizEngine.Quiz.elapsedMsNow();
  await go(dom, '#/dashboard');           // leaves the quiz: the clock banks
  const banked = win.QuizEngine.Quiz.elapsedMs;
  assert(banked >= before - 50, 'the elapsed time should be banked when leaving');
  await sleep(1200);                    // a second passes with the quiz closed
  const after = win.QuizEngine.Quiz.elapsedMs;
  assert(Math.abs(after - banked) < 60, `closed time leaked into the session clock (${banked} -> ${after})`);
  dom.window.close();
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
