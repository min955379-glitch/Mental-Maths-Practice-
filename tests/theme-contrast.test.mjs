/**
 * Dark-theme contrast and light-theme regression tests.
 *
 * The dark palette is not eyeballed: every pair below is parsed out of
 * pwa/css/styles.css and scored with the WCAG relative-luminance formula.
 * Text must clear 4.5:1, icons and control borders 3:1, and decorative
 * borders / surface steps just have to be perceptible.
 *
 * The light theme is pinned to its original values so a dark-mode tweak can
 * never quietly change it.
 *
 *   node tests/theme-contrast.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// --- WCAG ------------------------------------------------------------------
const srgb = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function luminance(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- tokens ----------------------------------------------------------------
const DECL = /--(c-[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
function block(name) {
  const start = CSS.indexOf(name);
  assert(start >= 0, `${name} block is missing from styles.css`);
  const end = CSS.indexOf('}', start);
  const out = {};
  for (const m of CSS.slice(start, end).matchAll(DECL)) out[m[1]] = m[2];
  return out;
}
const rootTokens = block(':root {');
const darkTokens = { ...rootTokens, ...block('[data-theme="dark"] {') };
const light = (n) => rootTokens[n];
const dark = (n) => darkTokens[n];

console.log('\nDark theme contrast');

const DARK_PAIRS = [
  // [label, foreground, background, minimum ratio]
  ['primary text on the page', 'c-text', 'c-bg', 7],
  ['primary text on a card', 'c-text', 'c-surface', 7],
  ['primary text on an elevated surface', 'c-text', 'c-surface-2', 7],
  ['secondary text on the page', 'c-text-muted', 'c-bg', 7],
  ['secondary text on a card', 'c-text-muted', 'c-surface', 7],
  ['muted text on the page', 'c-text-soft', 'c-bg', 4.5],
  ['muted text on a card', 'c-text-soft', 'c-surface', 4.5],
  ['accent text on a card', 'c-accent-text', 'c-surface', 4.5],
  ['accent text on the page', 'c-accent-text', 'c-bg', 4.5],
  ['icons/labels on an indigo chip', 'c-on-chip', 'c-indigo-100', 4.5],
  ['accent text on an indigo chip', 'c-accent-text', 'c-indigo-100', 4.5],
  ['success text on a card', 'c-success-text', 'c-surface', 4.5],
  ['success text on its own panel', 'c-success-text', 'c-success-bg', 4.5],
  ['error text on a card', 'c-error-text', 'c-surface', 4.5],
  ['error text on its own panel', 'c-error-text', 'c-error-bg', 4.5],
  ['warning text on its own panel', 'c-warning', 'c-warning-bg', 4.5],
  ['warning text on a card', 'c-warning', 'c-surface', 4.5],
  ['white label on the primary button', null, null, 4.5, '#ffffff', 'c-indigo-600'],
  ['white label on the secondary button', null, null, 4.5, '#ffffff', 'c-navy-800'],
  ['white label on the destructive button', null, null, 4.5, '#ffffff', 'c-error'],
  ['white label on the success button', null, null, 4.5, '#ffffff', 'c-success'],
  ['outlined control border on a card', 'c-border-strong', 'c-surface', 3],
  ['input border on a card', 'c-border-strong', 'c-surface', 3],
  ['card border on a card', 'c-border', 'c-surface', 1.4],
  ['card surface against the page', 'c-surface', 'c-bg', 1.1],
  ['elevated surface against a card', 'c-surface-2', 'c-surface', 1.1],
];

for (const [label, fg, bg, need, fgOverride, bgOverride] of DARK_PAIRS) {
  test(`dark: ${label} >= ${need}:1`, () => {
    const a = fgOverride || dark(fg);
    const b = bgOverride ? dark(bgOverride) : dark(bg);
    assert(a && b, `token --${fgOverride ? bgOverride : (fg || bg)} is not defined`);
    const r = contrast(a, b);
    assert(r >= need, `${a} on ${b} is ${r.toFixed(2)}:1, needs >= ${need}:1`);
  });
}

test('dark: the difficulty pills keep their colour meaning with readable text', () => {
  const cases = [
    ['Medium', /\[data-theme="dark"\]\s*\.q-diff\[data-difficulty="Medium"\]\s*{[^}]*background:\s*(#[0-9a-f]{6});\s*color:\s*(#[0-9a-f]{6})/],
    ['Hard', /\[data-theme="dark"\]\s*\.q-diff\[data-difficulty="Hard"\]\s*{[^}]*background:\s*(#[0-9a-f]{6});\s*color:\s*(#[0-9a-f]{6})/],
  ];
  for (const [name, re] of cases) {
    const m = CSS.match(re);
    assert(m, `no dark override for the ${name} difficulty pill`);
    const r = contrast(m[2], m[1]);
    assert(r >= 4.5, `${name} pill text is ${r.toFixed(2)}:1, needs >= 4.5:1`);
  }
});

test('dark: no leftover low-contrast indigo-on-indigo pairing', () => {
  // The old bug: an indigo-700 icon sitting on an indigo-100 chip in dark
  // mode measured 1.4:1. Every chip must now use --c-on-chip.
  const offenders = CSS.split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /background:\s*var\(--c-indigo-100\)/.test(l) && /color:\s*var\(--c-indigo-700\)/.test(l));
  assert(offenders.length === 0,
    `chip still pairs indigo-100 with indigo-700 on line(s) ${offenders.map(([n]) => n).join(', ')}`);
});

console.log('\nLight theme is unchanged');

const PINNED_LIGHT = {
  'c-bg': '#f5f6fb', 'c-surface': '#ffffff', 'c-surface-2': '#f8f9fd',
  'c-border': '#e3e6f1', 'c-border-strong': '#cdd2e3',
  'c-text': '#131a36', 'c-text-muted': '#5b6485', 'c-text-soft': '#8a92ab',
  'c-indigo-700': '#2738a0', 'c-indigo-600': '#3a4dc4', 'c-indigo-500': '#5063e0',
  'c-indigo-100': '#e2e7fb', 'c-success': '#1b9a6a', 'c-error': '#c0392b',
  'c-warning': '#b76a00', 'c-navy-900': '#060d2c', 'c-navy-800': '#0b1437',
};
for (const [token, want] of Object.entries(PINNED_LIGHT)) {
  test(`light: --${token} is still ${want}`, () => {
    const got = light(token);
    assert(got, `--${token} is missing from :root`);
    assert(got.toLowerCase() === want.toLowerCase(), `--${token} changed to ${got}`);
  });
}

test('light: the new semantic aliases keep the old light colours', () => {
  assert(light('c-on-chip') === light('c-indigo-700'), '--c-on-chip must mirror indigo-700 in light mode');
  assert(light('c-accent-text') === light('c-indigo-600'), '--c-accent-text must mirror indigo-600 in light mode');
  assert(light('c-success-text') === light('c-success'), '--c-success-text must mirror the light success colour');
  assert(light('c-error-text') === light('c-error'), '--c-error-text must mirror the light error colour');
  assert(light('c-warning-border') === '#f0d6a3', '--c-warning-border must keep the light hint border');
});

test('light: text and buttons still clear 4.5:1', () => {
  const pairs = [
    ['c-text', 'c-bg'], ['c-text-muted', 'c-bg'], ['c-text', 'c-surface'],
    ['c-text-muted', 'c-surface'],
  ];
  for (const [fg, bg] of pairs) {
    const r = contrast(light(fg), light(bg));
    assert(r >= 4.5, `${light(fg)} on ${light(bg)} is ${r.toFixed(2)}:1`);
  }
  assert(contrast('#ffffff', light('c-indigo-600')) >= 4.5, 'primary button label (light)');
  assert(contrast('#ffffff', light('c-error')) >= 4.5, 'danger button label (light)');
});

test('the service worker cache is versioned so fixed assets reach devices', () => {
  const sw = fs.readFileSync(path.join(PWA, 'sw.js'), 'utf8');
  const m = sw.match(/const\s+CACHE\s*=\s*'([^']+)'/);
  assert(m, 'sw.js has no CACHE constant');
  assert(/^iscsp-mm-v\d+$/.test(m[1]), `cache name looks wrong: ${m[1]}`);
  assert(/skipWaiting/.test(sw) && /clients\.claim/.test(sw), 'the worker must activate immediately');
  assert(/caches\.delete/.test(sw), 'the worker must delete superseded caches');
  assert(/question-bank\.js/.test(sw), 'the question bank must be precached');
});

test('the confirm dialog can never be stranded off-screen', () => {
  const backdrop = CSS.match(/\.modal-backdrop\s*{[^}]*}/);
  assert(backdrop, '.modal-backdrop rule is missing');
  assert(/margin:\s*auto/.test(CSS.match(/\.modal\s*{[^}]*}/)[0]), 'the dialog needs margin:auto to stay reachable when it overflows');
  assert(/overflow-y:\s*auto/.test(backdrop[0]), 'the backdrop must scroll');
  const actions = CSS.match(/\.modal-actions\s*\.btn\s*{[^}]*}/);
  assert(actions && /min-height:\s*44px/.test(actions[0]), 'dialog buttons need a 44px tap target');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
