/**
 * Stylesheet integrity and quiz-control layout.
 *
 * The answer input used to hang out of the right-hand side of the quiz card
 * because a stray `}` at the end of the dark-theme token block was absorbed
 * into the next rule's selector, which made the browser throw away
 * `* { box-sizing: border-box }`. Every `width: 100%` control in the app then
 * grew by its own padding + border - the answer input by 34px, the auth
 * fields, the dialog buttons and the Continue Quiz buttons with it.
 *
 * These tests parse the real stylesheet with a real CSS parser (jsdom's
 * CSSOM) so the failure mode is caught the same way a browser would catch it:
 * the rule simply is not there.
 *
 *   node tests/css-layout.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');
const CSS = fs.readFileSync(path.join(PWA, 'css', 'styles.css'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  \x1b[32mPASS\x1b[0m  ${name}`); passed++; }
  catch (e) { console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

const dom = new JSDOM(`<!doctype html><html><head><style>${CSS}</style></head><body></body></html>`);
const rules = [...dom.window.document.styleSheets[0].cssRules];
const rule = (sel) => rules.find((r) => r.selectorText === sel);
const style = (sel) => {
  const r = rule(sel);
  assert(r, `no rule for ${sel} in styles.css`);
  return r.style;
};
const decl = (sel, prop) => style(sel).getPropertyValue(prop).trim();
/** Raw declaration text, for values cssstyle drops (clamp(), aspect-ratio...). */
function rawRule(sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = CSS.match(new RegExp('(^|\\n)\\s*' + esc + '\\s*{([^}]*)}', 'm'));
  assert(m, `no rule for ${sel} in styles.css`);
  return m[2];
}

console.log('\nStylesheet integrity');

test('the stylesheet has balanced braces (a stray one silently eats the next rule)', () => {
  const stripped = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0, negative = 0;
  for (const ch of stripped) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) negative++; }
  }
  assert(negative === 0, `${negative} closing brace(s) with nothing to close`);
  assert(depth === 0, `stylesheet ends ${depth} level(s) inside a block`);
});

test('the universal border-box rule survives parsing', () => {
  const r = rule('*');
  assert(r, 'the "*" rule is missing - a stray brace is swallowing it');
  assert(r.style.getPropertyValue('box-sizing').trim() === 'border-box',
    `expected box-sizing: border-box, got "${r.style.getPropertyValue('box-sizing')}"`);
});

test('form controls are border-box and can never exceed their container', () => {
  const s = style('input, select, textarea, button');
  assert(s.getPropertyValue('box-sizing').trim() === 'border-box', 'form controls must be border-box');
  assert(s.getPropertyValue('max-width').trim() === '100%', 'form controls need max-width: 100%');
});

test('every theme token block opens and closes exactly once', () => {
  assert(/{[^}]*--c-bg[\s\S]*?}/.test(CSS), 'no token block found');
  const opens = (CSS.match(/\[data-theme="dark"\]\s*{/g) || []).length;
  assert(opens === 1, `expected one [data-theme="dark"] token block, found ${opens}`);
});

console.log('\nQuiz answer area (Part 1 - input inside the card)');

test('the quiz form is a full-width column that cannot be pushed wider', () => {
  const s = style('.quiz-form');
  assert(s.getPropertyValue('display').trim() === 'flex', 'the form must be a flex container');
  assert(s.getPropertyValue('flex-direction').trim() === 'column', 'the form must stack vertically');
  assert(s.getPropertyValue('width').trim() === '100%', 'the form must fill the card content box');
  assert(s.getPropertyValue('min-width').trim() === '0px' || s.getPropertyValue('min-width').trim() === '0',
    'min-width: 0 stops an intrinsic minimum from overflowing the card');
});

test('the answer input fills the card with equal margins and no overflow', () => {
  const s = style('.quiz-form input[type="text"]');
  assert(s.getPropertyValue('width').trim() === '100%', 'the input must be width: 100%');
  assert(s.getPropertyValue('max-width').trim() === '100%', 'the input must be capped at 100%');
  assert(/padding:\s*14px 16px/.test(rawRule('.quiz-form input[type="text"]')), 'the field keeps its typing area');
  assert(s.getPropertyValue('min-width').trim() === '0px' || s.getPropertyValue('min-width').trim() === '0',
    'min-width: 0 stops the input growing past the card');
  // The cascade gives it border-box via the universal rule and the form-control
  // rule; what must never happen is this rule setting content-box back.
  const box = s.getPropertyValue('box-sizing').trim();
  assert(box === '' || box === 'border-box', `the input must not be content-box (got "${box}")`);
  for (const side of ['margin-left', 'margin-right', 'margin-top', 'margin-bottom']) {
    const v = s.getPropertyValue(side).trim();
    assert(v === '' || v === '0px' || v === '0', `${side} must be 0 (got "${v}") so the gaps are the card padding`);
  }
});

console.log('\nQuiz controls (Parts 2 and 3 - one compact row each)');

test('Submit Answer is centred on its own row, sized by its label', () => {
  const s = style('#qSubmit');
  assert(s.getPropertyValue('justify-self').trim() === 'center', 'Submit Answer must be centred under the input');
  assert(s.getPropertyValue('grid-row').trim() === '1', 'Submit Answer belongs on the first row');
  assert(/\b1\s*\/\s*-1|1 \/ -1/.test(s.getPropertyValue('grid-column')), 'Submit Answer must span the whole row to centre');
  assert(s.getPropertyValue('white-space').trim() === 'nowrap', 'the label must never wrap to two lines');
  assert(s.getPropertyValue('width').trim() === 'auto', 'the button must size to its label, not to a fixed width');
  assert(s.getPropertyValue('max-width').trim() === '100%', 'the button must never exceed the card');
  assert(!/\d+px/.test(s.getPropertyValue('width')), 'no hard-coded pixel width - it breaks small screens');
});

test('Submit Answer keeps a comfortable touch target without being oversized', () => {
  const lg = style('.btn-lg');
  const minH = parseFloat(lg.getPropertyValue('min-height'));
  assert(minH >= 44, `min-height ${minH}px is below the 44px touch target`);
  assert(minH <= 52, `min-height ${minH}px is taller than it needs to be`);
});

test('Hint and Quit share the second row, pinned to the card edges, same size', () => {
  const hint = style('#qHint');
  const quit = style('#qQuit');
  assert(hint.getPropertyValue('grid-row').trim() === '2', 'Hint belongs on the second row');
  assert(quit.getPropertyValue('grid-row').trim() === '2', 'Quit belongs on the second row');
  assert(hint.getPropertyValue('grid-column').trim() === '1', 'Hint is the left-hand control');
  assert(quit.getPropertyValue('grid-column').trim() === '2', 'Quit is the right-hand control');
  assert(hint.getPropertyValue('justify-self').trim() === 'start', 'Hint must sit toward the left');
  assert(quit.getPropertyValue('justify-self').trim() === 'end', 'Quit must sit toward the right');
  // Identical sizing declarations is what makes the two buttons consistent.
  for (const prop of ['width', 'max-width']) {
    assert(hint.getPropertyValue(prop) === quit.getPropertyValue(prop),
      `Hint and Quit disagree on ${prop} (${hint.getPropertyValue(prop)} vs ${quit.getPropertyValue(prop)})`);
  }
});

test('no control in the quiz can wrap its label or exceed the card', () => {
  const s = style('.quiz-actions .btn');
  assert(s.getPropertyValue('white-space').trim() === 'nowrap', 'labels must not wrap');
  assert(s.getPropertyValue('max-width').trim() === '100%', 'a control must never exceed its column');
  assert(s.getPropertyValue('min-width').trim() === '0px' || s.getPropertyValue('min-width').trim() === '0',
    'min-width: 0 lets a grid column shrink instead of overflowing');
});

test('the old rules that caused the oversized, wrapping button are gone', () => {
  const submit = rule('#qSubmit').cssText;
  assert(!/min-width:\s*100%/.test(submit), 'Submit Answer must not be forced to 100% width on small screens');
  assert(!/min-width:\s*min\(200px/.test(submit), 'the 200px minimum is what made the button oversized');
  assert(!/grid-column:\s*2;/.test(submit), 'Submit Answer must not share a column with Quit');
});

console.log('\nContact Us presentation (Part 6 - the developer photo)');

test('the developer photo is circular, undistorted and fluid', () => {
  const s = style('.developer-photo');
  assert(s.getPropertyValue('border-radius').trim() === '50%', 'the photo must be a circle');
  assert(s.getPropertyValue('object-fit').trim() === 'cover', 'object-fit: cover crops without distorting');
  assert(s.getPropertyValue('aspect-ratio').trim() === '1 / 1', 'a 1:1 box keeps the photo square');
  assert(s.getPropertyValue('height').trim() === 'auto', 'height must follow the aspect ratio');
  const w = rawRule('.developer-photo').match(/width:\s*([^;]+);/);
  assert(w, 'the photo has no width declaration');
  assert(/clamp\(/.test(w[1]), `the photo needs a fluid clamp() width, got "${w[1]}"`);
  assert(!/^\d+px$/.test(w[1].trim()), 'no fixed pixel width - it would not be responsive');
});

test('the WhatsApp button is a full-width, easy-to-tap control on phones', () => {
  const s = style('.btn-whatsapp');
  assert(parseFloat(s.getPropertyValue('min-height')) >= 48, 'the button needs a 48px+ tap target');
  assert(s.getPropertyValue('background').trim().includes('c-wa'), 'the button must use the WhatsApp token');
  assert(s.getPropertyValue('color').trim() === 'rgb(255, 255, 255)', 'white label on the green fill');
  assert(style('.contact-screen').getPropertyValue('max-width').trim() === '760px', 'the page matches the app content width');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
