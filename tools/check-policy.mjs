#!/usr/bin/env node
/**
 * Dependency-free policy gate for the PWA.
 *
 * It enforces the rules that the JSDOM suites cannot cheaply assert over the
 * whole source tree, so a regression in content quality fails CI instead of
 * reaching a phone:
 *
 *   1. no emoji anywhere in the shipped app (SVG icons only)
 *   2. no native confirm() / alert() dialogs (in-app modal only)
 *   3. no remote resources (the app must work offline)
 *   4. question bank: no '*' in user-facing maths, hints are teaching hints
 *      (>= 25 chars, never reveal a number that is not already in the question)
 *   5. the service worker precaches the question bank
 *
 * Usage:  node tools/check-policy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PWA = path.join(ROOT, 'pwa');

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);
const note = (msg) => notes.push(msg);

/* ---------------------------------------------------------------- helpers */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}\u{2900}-\u{297F}]/u;
const REMOTE = /https?:\/\/(?!www\.w3\.org\/)[^\s"'`)]*\w/gi;

/** Drop comments so prose about confirm() is not mistaken for a call. */
function stripComments(src, html) {
  let out = html ? src.replace(/<!--[\s\S]*?-->/g, '') : src;
  return out.split('\n').map((l) => l.replace(/(^|[^:])(\/\/.*)$/, '$1')).join('\n');
}

function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p);
const sourceFiles = [...walk(path.join(PWA, 'js'), ['.js']), path.join(PWA, 'index.html')];
const markupFiles = [path.join(PWA, 'index.html'), ...walk(PWA, ['.css'])];

/* ------------------------------------------------------- 1. no emoji */
for (const file of [...sourceFiles, ...markupFiles]) {
  const lines = stripComments(fs.readFileSync(file, 'utf8'), file.endsWith('.html')).split('\n');
  lines.forEach((line, i) => {
    if (EMOJI.test(line)) fail(`emoji in ${rel(file)}:${i + 1} -> ${line.trim().slice(0, 80)}`);
  });
}
note(`scanned ${new Set([...sourceFiles, ...markupFiles]).size} files for emoji`);

/* ------------------------------------------- 2. no native dialogs */
for (const file of sourceFiles) {
  const src = stripComments(fs.readFileSync(file, 'utf8'), file.endsWith('.html'));
  for (const m of src.matchAll(/\b(confirm|alert|prompt)\s*\(/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    fail(`native ${m[1]}() in ${rel(file)}:${line} - use the in-app modal`);
  }
}
note('checked for native confirm()/alert()/prompt()');

/* ------------------------------------------------ 3. offline only */
for (const file of [...sourceFiles, ...markupFiles]) {
  const src = fs.readFileSync(file, 'utf8');
  const hits = [...src.matchAll(REMOTE)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'));
  if (hits.length) fail(`remote reference in ${rel(file)} -> ${[...new Set(hits)].join(', ')}`);
}
note('checked for remote resources (offline-first)');

/* --------------------------------------------------- 4. bank rules */
const bankPath = path.join(PWA, 'js', 'question-bank.js');
global.window = {};
// eslint-disable-next-line no-eval
eval(fs.readFileSync(bankPath, 'utf8'));
const bank = global.window.QUESTION_BANK || [];
if (!bank.length) fail('question bank is empty or failed to load');

const numbersIn = (s) => (String(s).match(/-?\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(/,/g, ''));

let starHits = 0;
let shortHints = 0;
let leakyHints = 0;
for (const q of bank) {
  if (/\*/.test(q.question || '')) starHits += 1;
  const hint = (q.hint || '').trim();
  if (hint.length < 25) shortHints += 1;
  const answer = String(q.correctAnswer).replace(/[%\s]/g, '');
  const hintHas = numbersIn(hint).includes(answer) || hint.includes(answer);
  const qHas = numbersIn(q.question || '').includes(answer) || (q.question || '').includes(answer);
  if (hintHas && !qHas) leakyHints += 1;
}
if (starHits) fail(`${starHits} question(s) use '*' instead of the multiplication sign`);
if (shortHints) fail(`${shortHints} hint(s) are shorter than 25 characters`);
if (leakyHints) fail(`${leakyHints} hint(s) reveal the answer`);
note(`bank: ${bank.length} questions checked (typography, hint length, answer leakage)`);

/* -------------------------------------- 5. the bank is precached */
const sw = fs.readFileSync(path.join(PWA, 'sw.js'), 'utf8');
if (!/question-bank\.js/.test(sw)) fail('service worker does not precache js/question-bank.js');
note('service worker precaches the question bank');

/* ------------------------------------------------------------ report */
for (const n of notes) console.log(`  ok    ${n}`);
if (failures.length) {
  console.error(`\n${failures.length} policy violation(s):`);
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}
console.log('\npolicy checks passed');
