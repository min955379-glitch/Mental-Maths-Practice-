/**
 * Custom Settings dropdown.
 *
 * The Settings page used to hand the two selects straight to the device, which
 * drew its own popup - a full-screen white sheet that ignored the dark theme.
 * This module now draws the control; the native <select> is kept as the single
 * source of truth for the value so every existing save path is untouched.
 *
 * These tests run the app's real scripts in jsdom, drive the router to the
 * Settings page and use the resulting combobox the way a person (or a screen
 * reader) would, then assert on the native select, on StateStore and on the
 * applied theme.
 *
 *   node tests/select-component.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

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
async function goTo(win, hash) { win.location.hash = hash; await sleep(160); }

async function settings() { const d = makeApp(); await goTo(d.window, '#/settings'); return d; }
const click = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
const key = (el, k) => {
  const win = (el.ownerDocument || el).defaultView;
  el.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
};
const stored = (win) => {
  const raw = win.localStorage.getItem('iscsp-mm-state-v1');
  return raw ? JSON.parse(raw).settings : {};
};

console.log('\nCustom dropdown - it is actually rendered');

await test('both Settings selects are upgraded to the custom control', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  assert(doc.querySelectorAll('.select').length === 2, 'expected 2 custom dropdowns');
  assert(doc.querySelectorAll('.select-trigger').length === 2, 'expected 2 triggers');
  assert(doc.querySelectorAll('.select-menu[role="listbox"]').length === 2, 'expected 2 listboxes');
  assert(doc.querySelectorAll('[role="option"]').length === 3 + 5, 'expected 3 theme + 5 difficulty options');
});

await test('the native select stays in the form and keeps its value', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  for (const id of ['setTheme', 'setDifficulty']) {
    const sel = doc.getElementById(id);
    assert(sel, `${id} is gone`);
    assert(sel.form && sel.form.id === 'settingsForm', `${id} left the settings form`);
    assert(sel.classList.contains('select-native'), `${id} is not the hidden native layer`);
    assert(sel.dataset.selectEnhanced === 'true', `${id} was not marked as enhanced`);
    const key = id === 'setTheme' ? 'theme' : 'difficulty';
    assert(sel.value === win.StateStore.getSettings()[key], `${id} lost its value`);
  }
});

await test('the device picker can no longer be reached by keyboard or pointer', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  for (const id of ['setTheme', 'setDifficulty']) {
    const sel = doc.getElementById(id);
    assert(sel.getAttribute('tabindex') === '-1', `${id} is still tabbable`);
    assert(sel.getAttribute('aria-hidden') === 'true', `${id} is still exposed to screen readers`);
  }
  const decl = CSS.slice(CSS.indexOf('.select-native {'));
  const block = decl.slice(0, decl.indexOf('}'));
  assert(/pointer-events:\s*none/.test(block), 'the native select is still clickable');
  assert(/opacity:\s*0/.test(block), 'the native select is still visible');
});

await test('the trigger is a button, so it can never submit the form', async () => {
  const { window: win } = await settings();
  const triggers = [...win.document.querySelectorAll('.select-trigger')];
  assert(triggers.length === 2, 'expected 2 triggers');
  for (const t of triggers) {
    assert(t.tagName === 'BUTTON', `trigger is a <${t.tagName.toLowerCase()}>`);
    assert(t.getAttribute('type') === 'button', 'trigger is not type=button');
  }
});

console.log('\nCustom dropdown - accessibility');

await test('correct combobox + listbox semantics', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const trigger = doc.querySelector('.select-trigger');
  assert(trigger.getAttribute('role') === 'combobox', 'trigger is not a combobox');
  assert(trigger.getAttribute('aria-haspopup') === 'listbox', 'no aria-haspopup');
  assert(trigger.getAttribute('aria-expanded') === 'false', 'aria-expanded does not start false');
  const menuId = trigger.getAttribute('aria-controls');
  const menu = menuId && doc.getElementById(menuId);
  assert(menu && menu.classList.contains('select-menu'), 'aria-controls does not point at the menu');
  assert(trigger.id, 'the trigger has no id for a label to reference');
});

await test('each control takes its name from the row\'s own label', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const names = [...doc.querySelectorAll('.select-trigger')].map((t) => t.getAttribute('aria-label'));
  assert(names[0] === 'Theme', `theme control is named "${names[0]}"`);
  assert(names[1] === 'Default difficulty', `difficulty control is named "${names[1]}"`);
  const menus = [...doc.querySelectorAll('.select-menu')].map((m) => m.getAttribute('aria-label'));
  assert(menus[0] === 'Theme' && menus[1] === 'Default difficulty', `listbox names: ${menus.join(' | ')}`);
});

await test('options mirror the native select exactly', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const pairs = [['setTheme', ['light', 'dark', 'auto'], ['Light', 'Dark', 'Auto (system)']],
                 ['setDifficulty', ['Easy', 'Medium', 'Hard', 'Expert', 'Mixed'], ['Easy', 'Medium', 'Hard', 'Expert', 'Mixed']]];
  for (const [id, values, labels] of pairs) {
    const sel = doc.getElementById(id);
    const wrap = sel.closest('.select');
    const opts = [...wrap.querySelectorAll('[role="option"]')];
    assert(opts.length === values.length, `${id}: ${opts.length} options, expected ${values.length}`);
    opts.forEach((li, i) => {
      assert(li.dataset.value === values[i], `${id} option ${i}: value ${li.dataset.value} != ${values[i]}`);
      assert(li.querySelector('.select-option-text').textContent === labels[i], `${id} option ${i}: label mismatch`);
      assert(li.id, `${id} option ${i} has no id (aria-activedescendant needs one)`);
    });
  }
});

await test('the selected option is the only one marked as such', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  for (const id of ['setTheme', 'setDifficulty']) {
    const sel = doc.getElementById(id);
    const opts = [...sel.closest('.select').querySelectorAll('[role="option"]')];
    const on = opts.filter((o) => o.getAttribute('aria-selected') === 'true');
    assert(on.length === 1, `${id}: ${on.length} options marked selected`);
    assert(on[0].dataset.value === sel.value, `${id}: the marked option is not the current value`);
    assert(on[0].classList.contains('is-selected'), `${id}: selected row lacks .is-selected`);
  }
});

await test('the trigger shows the current value, not a placeholder', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const shown = [...doc.querySelectorAll('.select-value')].map((v) => v.textContent);
  assert(shown[0] === 'Auto (system)', `theme shows "${shown[0]}"`);
  assert(shown[1] === 'Mixed', `difficulty shows "${shown[1]}"`);
});

await test('no emoji anywhere in the control', async () => {
  const { window: win } = await settings();
  const html = [...win.document.querySelectorAll('.select')].map((s) => s.outerHTML).join('');
  assert(!EMOJI.test(html), 'the dropdown uses emoji');
});

console.log('\nCustom dropdown - opening and closing');

await test('clicking the trigger opens the menu', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wrap = doc.querySelector('.select');
  click(wrap.querySelector('.select-trigger'));
  await sleep(40);
  assert(wrap.classList.contains('is-open'), 'menu did not open');
  assert(wrap.querySelector('.select-trigger').getAttribute('aria-expanded') === 'true', 'aria-expanded did not flip');
  assert(wrap.querySelector('.select-menu').hidden === false, 'menu is still hidden');
});

await test('clicking again, Escape, or the outside all close it', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wrap = doc.querySelector('.select');
  const trigger = wrap.querySelector('.select-trigger');
  click(trigger); await sleep(40);
  click(trigger); await sleep(40);
  assert(!wrap.classList.contains('is-open'), 'a second click did not close it');

  click(trigger); await sleep(40);
  key(doc, 'Escape'); await sleep(40);
  assert(!wrap.classList.contains('is-open'), 'Escape did not close it');
  assert(trigger.getAttribute('aria-expanded') === 'false', 'aria-expanded did not reset');

  click(trigger); await sleep(40);
  click(doc.body); await sleep(40);
  assert(!wrap.classList.contains('is-open'), 'a click outside did not close it');
});

await test('Escape leaves the setting alone', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const before = stored(win).theme;
  const wrap = doc.querySelector('.select');
  click(wrap.querySelector('.select-trigger')); await sleep(40);
  key(doc, 'ArrowDown'); key(doc, 'ArrowDown'); key(doc, 'Escape'); await sleep(40);
  assert(stored(win).theme === before, 'Escape changed the saved theme');
});

await test('only one dropdown is open at a time', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wraps = [...doc.querySelectorAll('.select')];
  click(wraps[0].querySelector('.select-trigger')); await sleep(40);
  click(wraps[1].querySelector('.select-trigger')); await sleep(40);
  assert(!wraps[0].classList.contains('is-open'), 'the first menu stayed open');
  assert(wraps[1].classList.contains('is-open'), 'the second menu did not open');
});

console.log('\nCustom dropdown - keyboard');

await test('ArrowDown opens the menu and highlights the current value', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wrap = doc.querySelector('.select');
  const trigger = wrap.querySelector('.select-trigger');
  key(trigger, 'ArrowDown'); await sleep(40);
  assert(wrap.classList.contains('is-open'), 'ArrowDown did not open the menu');
  const active = trigger.getAttribute('aria-activedescendant');
  const current = doc.getElementById(active);
  assert(current && current.dataset.value === 'auto', 'the highlight did not start on the current value');
});

await test('arrows move, Home/End jump, Enter selects', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wrap = doc.querySelector('.select');
  const trigger = wrap.querySelector('.select-trigger');
  key(trigger, 'ArrowDown'); await sleep(40);      // opens on Auto (index 2)
  key(trigger, 'ArrowUp'); await sleep(10);
  assert(doc.getElementById(trigger.getAttribute('aria-activedescendant')).dataset.value === 'dark', 'ArrowUp did not move up');
  key(trigger, 'Home'); await sleep(10);
  assert(doc.getElementById(trigger.getAttribute('aria-activedescendant')).dataset.value === 'light', 'Home did not jump to the first option');
  key(trigger, 'End'); await sleep(10);
  assert(doc.getElementById(trigger.getAttribute('aria-activedescendant')).dataset.value === 'auto', 'End did not jump to the last option');
  key(trigger, 'ArrowUp'); key(trigger, 'ArrowUp'); await sleep(10);
  key(trigger, 'Enter'); await sleep(60);
  assert(!wrap.classList.contains('is-open'), 'Enter did not close the menu');
  assert(doc.getElementById('setTheme').value === 'light', `Enter selected ${doc.getElementById('setTheme').value}`);
  assert(stored(win).theme === 'light', 'Enter did not save the setting');
});

await test('Enter does not re-open the menu it just closed', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wrap = doc.querySelector('.select');
  const trigger = wrap.querySelector('.select-trigger');
  key(trigger, 'ArrowDown'); await sleep(40);
  key(trigger, 'Enter'); await sleep(80);
  assert(!wrap.classList.contains('is-open'), 'the menu reopened straight after Enter');
  assert(trigger.getAttribute('aria-expanded') === 'false', 'aria-expanded says it is still open');
});

console.log('\nCustom dropdown - picking a value');

await test('every theme option is selectable and applies at once', async () => {
  for (const [label, value, applied] of [['Light', 'light', 'light'], ['Dark', 'dark', 'dark'], ['Auto (system)', 'auto', 'light']]) {
    const { window: win } = await settings();
    const doc = win.document;
    const wrap = doc.getElementById('setTheme').closest('.select');
    click(wrap.querySelector('.select-trigger')); await sleep(40);
    const row = [...wrap.querySelectorAll('[role="option"]')].find((o) => o.dataset.value === value);
    assert(row, `no row for ${label}`);
    click(row); await sleep(60);
    assert(doc.getElementById('setTheme').value === value, `${label}: native select is ${doc.getElementById('setTheme').value}`);
    assert(stored(win).theme === value, `${label}: store is ${stored(win).theme}`);
    assert(doc.documentElement.dataset.theme === applied, `${label}: theme is ${doc.documentElement.dataset.theme}`);
    assert(wrap.querySelector('.select-value').textContent === label, `${label}: trigger shows "${wrap.querySelector('.select-value').textContent}"`);
    assert(!wrap.classList.contains('is-open'), `${label}: menu stayed open`);
    const marked = [...wrap.querySelectorAll('[role="option"]')].filter((o) => o.getAttribute('aria-selected') === 'true');
    assert(marked.length === 1 && marked[0] === row, `${label}: selection indicator is wrong`);
  }
});

await test('every difficulty option is selectable and saved', async () => {
  for (const value of ['Easy', 'Medium', 'Hard', 'Expert', 'Mixed']) {
    const { window: win } = await settings();
    const doc = win.document;
    const wrap = doc.getElementById('setDifficulty').closest('.select');
    click(wrap.querySelector('.select-trigger')); await sleep(40);
    const row = [...wrap.querySelectorAll('[role="option"]')].find((o) => o.dataset.value === value);
    click(row); await sleep(60);
    assert(doc.getElementById('setDifficulty').value === value, `${value}: native select is ${doc.getElementById('setDifficulty').value}`);
    assert(stored(win).difficulty === value, `${value}: store is ${stored(win).difficulty}`);
    assert(wrap.querySelector('.select-value').textContent === value, `${value}: trigger shows the wrong label`);
  }
});

await test('a new quiz still honours the saved default difficulty', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const wrap = doc.getElementById('setDifficulty').closest('.select');
  click(wrap.querySelector('.select-trigger')); await sleep(40);
  click([...wrap.querySelectorAll('[role="option"]')].find((o) => o.dataset.value === 'Hard')); await sleep(60);
  const session = win.QuizEngine.buildSession('practice', {});
  assert(session.difficulty === 'Hard', `quiz started with ${session.difficulty}`);
});

await test('picking a value saves only that setting', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  doc.getElementById('setSound').checked = true;      // deliberately left unsaved
  const wrap = doc.getElementById('setTheme').closest('.select');
  click(wrap.querySelector('.select-trigger')); await sleep(40);
  click([...wrap.querySelectorAll('[role="option"]')].find((o) => o.dataset.value === 'dark')); await sleep(60);
  assert(stored(win).theme === 'dark', 'theme was not saved');
  assert(stored(win).sound === false, 'picking a theme also committed an unsaved checkbox');
});

await test('the rest of the Settings form still saves the way it always did', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  doc.getElementById('setSound').checked = true;
  doc.getElementById('setCount').value = '15';
  doc.getElementById('setGoal').value = '30';
  doc.getElementById('setMotion').checked = true;
  doc.getElementById('setTheme').value = 'dark';           // the native select still drives the save
  doc.getElementById('setDifficulty').value = 'Expert';
  doc.getElementById('settingsForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(60);
  const s = stored(win);
  assert(s.sound === true && s.defaultCount === 15 && s.dailyGoal === 30 && s.reducedMotion === true, 'form save broke');
  assert(s.theme === 'dark' && s.difficulty === 'Expert', 'the selects stopped feeding the save handler');
  assert(doc.documentElement.dataset.reducedMotion === 'true', 'reduced motion did not apply');
});

await test('the dropdown re-syncs when something else changes the select', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const sel = doc.getElementById('setTheme');
  sel.value = 'dark';
  sel.dispatchEvent(new win.Event('change', { bubbles: true }));
  await sleep(20);
  const wrap = sel.closest('.select');
  assert(wrap.querySelector('.select-value').textContent === 'Dark', 'the trigger did not follow the select');
  const marked = [...wrap.querySelectorAll('[role="option"]')].filter((o) => o.getAttribute('aria-selected') === 'true');
  assert(marked.length === 1 && marked[0].dataset.value === 'dark', 'the indicator did not follow the select');
});

console.log('\nCustom dropdown - the component itself');

await test('it is a reusable component, not a Settings one-off', async () => {
  const { window: win } = await settings();
  const doc = win.document;
  const sel = doc.createElement('select');
  sel.innerHTML = '<option value="a">Alpha</option><option value="b">Beta</option>';
  const lab = doc.createElement('label');
  lab.setAttribute('for', 'probe'); lab.textContent = 'Probe';
  sel.id = 'probe';
  doc.body.appendChild(lab); doc.body.appendChild(sel);
  const api = win.AppSelect.enhanceAll(doc.body);
  assert(api.length === 1, `enhanceAll returned ${api.length}`);
  const trigger = sel.closest('.select').querySelector('.select-trigger');
  assert(trigger.getAttribute('aria-label') === 'Probe', `named "${trigger.getAttribute('aria-label')}"`);
  assert(trigger.querySelector('.select-value').textContent === 'Alpha', 'value not shown');
  click(trigger); await sleep(40);
  click([...sel.closest('.select').querySelectorAll('[role="option"]')].find((o) => o.dataset.value === 'b')); await sleep(40);
  assert(sel.value === 'b', 'the generic dropdown did not update its select');
  assert(!sel.dataset.setting || stored(win).theme !== 'b', 'a dropdown with no data-setting must not write settings');
});

await test('it is wired into the page the normal way', async () => {
  assert(SCRIPT_ORDER.includes('js/select.js'), 'select.js is not loaded by index.html');
  assert(SCRIPT_ORDER.indexOf('js/select.js') < SCRIPT_ORDER.indexOf('js/ui.js'), 'select.js should load before ui.js');
  const src = fs.readFileSync(path.join(PWA, 'js', 'select.js'), 'utf8');
  assert(!/https?:\/\//.test(src.replace(/https?:\/\/[^\s'"]*/g, '')), 'no stray URLs');
  assert(!/import\s|\brequire\(/.test(src), 'select.js pulls in a dependency');
  assert(/addEventListener\('click'/.test(src), 'no click handling at all');
});

await test('the animation is short and respects reduced motion', async () => {
  const menu = CSS.slice(CSS.indexOf('.select-menu {'), CSS.indexOf('.select.is-open .select-menu'));
  assert(/transition:[^;]*opacity\s+1[0-9][0-9]ms/.test(menu), 'no fast fade on the menu');
  assert(/transform/.test(menu), 'no scale/translate on the menu');
  const motionRule = CSS.slice(CSS.indexOf('[data-reduced-motion="true"]'));
  const motionBlock = motionRule.slice(0, motionRule.indexOf('}'));
  assert(/transition-duration:\s*0\.001ms\s*!important/.test(motionBlock), 'the app-wide reduced-motion rule is missing');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
