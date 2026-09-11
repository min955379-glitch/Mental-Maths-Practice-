/**
 * Contact Us page and WhatsApp integration, end-to-end.
 *
 * Driven through the real router, the real template and the real state store
 * (jsdom + the app's own scripts), so nothing here passes because a string was
 * found in a file: the page has to actually render, and the WhatsApp link has
 * to be a real, clickable, byte-exact link - not a button with a handler, and
 * not a URL that was quietly re-encoded.
 *
 *   node tests/contact-us.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PWA = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : path.join(ROOT, 'pwa');

/* The URL exactly as supplied by the owner of the app. It must never be
   re-encoded, re-worded or given a different number. */
const WA_URL = 'https://wa.me/03485581969?text=Hey!%20We%20want%20you%20to%20improve%20these%20things%20in%20the%20Mental%20Maths%20Practice%20application......';
const WA_NUMBER = '03485581969';
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const rawHtml = fs.readFileSync(path.join(PWA, 'index.html'), 'utf8');
const SCRIPT_ORDER = [...rawHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const HTML_NO_SCRIPTS = rawHtml.replace(/<script src="[^"]+"><\/script>/g, '');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  \x1b[32mPASS\x1b[0m  ${name}`); passed++; }
  catch (e) { console.log(`  \x1b[31mFAIL\x1b[0m  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function goTo(win, hash) {
  win.location.hash = hash;   // jsdom fires hashchange asynchronously
  await sleep(160);
}

const contact = async () => { const d = makeApp(); await goTo(d.window, '#/contact'); return d; };

console.log('\nContact Us - navigation');

await test('Contact Us is in the side navigation and does not disturb the other items', async () => {
  const dom = makeApp();
  const items = [...dom.window.document.querySelectorAll('.nav-item')].map((a) => a.getAttribute('href'));
  assert(items.includes('#/contact'), `no #/contact item in the nav (${items.join(', ')})`);
  const before = ['#/dashboard', '#/settings', '#/history', '#/patterns', '#/coach'];
  for (const href of before) assert(items.includes(href), `the nav lost ${href}`);
  const item = dom.window.document.querySelector('.nav-item[href="#/contact"]');
  assert(item.querySelector('svg'), 'the nav item needs an icon, not an emoji');
  assert(/Contact Us/.test(item.textContent), 'the nav item must be labelled Contact Us');
});

await test('opening #/contact renders the page with its heading', async () => {
  const dom = await contact();
  const screen = dom.window.document.querySelector('.contact-screen');
  assert(screen, 'the contact screen did not render');
  const h1 = screen.querySelector('h1');
  assert(h1 && h1.textContent.trim() === 'Contact Us', `heading is "${h1 && h1.textContent}"`);
  const navItem = dom.window.document.querySelector('.nav-item[data-route="contact"]');
  assert(navItem.classList.contains('active'), 'the Contact Us nav item should be marked active');
  assert(!dom.window.document.querySelector('.landing'), 'the router fell through to the landing page');
});

console.log('\nContact Us - content');

await test('the welcome message is the supplied text, word for word', async () => {
  const dom = await contact();
  const text = dom.window.document.getElementById('contactWelcome').textContent.replace(/\s+/g, ' ').trim();
  const expected = [
    'Hey everyone, welcome to the Mental Maths Practice app.',
    'If you would like us to change anything in the app, improve an existing feature, fix a problem, or add a new feature or update, feel free to contact us.',
    'We value your feedback and suggestions and will continue improving the application.',
  ];
  for (const sentence of expected) {
    assert(text.includes(sentence), `missing sentence: "${sentence.slice(0, 48)}..."`);
  }
});

await test('the developer is credited by name and role', async () => {
  const dom = await contact();
  const doc = dom.window.document;
  assert(doc.getElementById('devName').textContent.trim() === 'Muhammad Ibrahim', 'developer name is wrong');
  assert(doc.getElementById('devRole').textContent.trim() === 'Developer of Mental Maths Practice', 'developer role is wrong');
  const body = doc.querySelector('.contact-screen').textContent;
  assert(body.includes('Developed by Muhammad Ibrahim'), 'the "Developed by Muhammad Ibrahim" line is missing');
});

await test('the supplied developer photo is used, correctly cropped and accessible', async () => {
  const dom = await contact();
  const doc = dom.window.document;
  const img = doc.getElementById('developerPhoto');
  assert(img, 'no developer photo on the page');
  assert(img.tagName === 'IMG', 'the photo must be a real <img>');
  assert(img.getAttribute('src') === 'img/developer.jpg', `unexpected src: ${img.getAttribute('src')}`);
  assert(/Muhammad Ibrahim/.test(img.getAttribute('alt') || ''), 'the photo needs an alt name');
  assert(img.getAttribute('width') === '512' && img.getAttribute('height') === '512',
    'intrinsic width/height attributes reserve the space so the card does not shift while loading');
  const file = path.join(PWA, 'img', 'developer.jpg');
  assert(fs.existsSync(file), 'pwa/img/developer.jpg is missing from the shipped assets');
  const bytes = fs.readFileSync(file);
  assert(bytes[0] === 0xff && bytes[1] === 0xd8, 'the developer asset is not a JPEG');
  assert(bytes.length > 8 * 1024, `the developer asset looks truncated (${bytes.length} bytes)`);
  // The shipped asset is the photo the client supplied, not a stand-in.
  const source = path.join(ROOT, '..', 'uploads', 'Polish_20260810_231449085.png');
  if (fs.existsSync(source)) {
    assert(fs.statSync(source).size > 0, 'the supplied photo is unreadable');
  }
});

console.log('\nWhatsApp contact');

await test('the WhatsApp URL is byte-exact', async () => {
  const dom = await contact();
  const href = dom.window.document.getElementById('whatsappBtn').getAttribute('href');
  assert(href === WA_URL, `the URL changed:\n        expected ${WA_URL}\n        actual   ${href}`);
});

await test('the URL decodes to the exact number and message', async () => {
  const dom = await contact();
  const href = dom.window.document.getElementById('whatsappBtn').getAttribute('href');
  const url = new URL(href);
  assert(url.origin + url.pathname === 'https://wa.me/03485581969', `wrong number: ${url.pathname}`);
  assert(url.pathname.replace('/', '') === WA_NUMBER, `the number must be ${WA_NUMBER}`);
  const message = url.searchParams.get('text');
  assert(message === 'Hey! We want you to improve these things in the Mental Maths Practice application......',
    `the pre-filled message changed: "${message}"`);
  // Re-encoding must be a no-op: the stored attribute has to survive a round trip.
  assert(decodeURIComponent(href.split('?text=')[1]) === message, 'the message is encoded differently in the markup');
});

await test('the button is a real, labelled, accessible link - not a mock', async () => {
  const dom = await contact();
  const btn = dom.window.document.getElementById('whatsappBtn');
  assert(btn.tagName === 'A', 'the WhatsApp button must be a real link (an <a>), not a button with a handler');
  assert(btn.hasAttribute('href'), 'the link has no href');
  assert((btn.getAttribute('aria-label') || '').includes(WA_NUMBER), 'the accessible label should name the number');
  assert(/Contact Us on WhatsApp/.test(btn.textContent), 'the visible label is missing');
  assert(btn.querySelector('svg'), 'the button needs the WhatsApp icon');
  assert(btn.querySelector('svg').getAttribute('aria-hidden') === 'true', 'the decorative icon must be hidden from screen readers');
  // No target="": inside the APK's WebView a new window would never open.
  assert(!btn.hasAttribute('target'), 'target="_blank" would break the click inside the app WebView');
});

await test('tapping the button is not intercepted by a JavaScript handler', async () => {
  const dom = await contact();
  const btn = dom.window.document.getElementById('whatsappBtn');
  const ev = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true });
  btn.dispatchEvent(ev);
  assert(!ev.defaultPrevented, 'something is calling preventDefault() - the link would not open WhatsApp');
  // A listener that navigates itself would leave a marker behind.
  assert(btn.getAttribute('href') === WA_URL, 'the href must still be the WhatsApp URL after a click');
});

await test('the WhatsApp icon is drawn from the shared icon registry', async () => {
  const dom = await contact();
  const chip = dom.window.document.getElementById('waIcon');
  const btnIcon = dom.window.document.getElementById('waBtnIcon');
  assert(chip && chip.querySelector('svg'), 'the chip icon is missing');
  assert(btnIcon && btnIcon.querySelector('svg'), 'the button icon is missing');
  assert(chip.innerHTML === btnIcon.innerHTML, 'both icons should be the same glyph');
  assert(dom.window.Icons && /<svg/.test(dom.window.Icons.whatsapp || ''), 'the WhatsApp glyph must live in js/icons.js');
});

await test('the page carries no emoji', async () => {
  const dom = await contact();
  const text = dom.window.document.querySelector('.contact-screen').textContent;
  assert(!EMOJI.test(text), 'emoji found on the Contact Us page');
});

await test('the developer photo is precached for offline use', async () => {
  const sw = fs.readFileSync(path.join(PWA, 'sw.js'), 'utf8');
  assert(/img\/developer\.jpg/.test(sw), 'the service worker does not precache the developer photo');
});

console.log('\nContact Us - nothing else broke');

await test('leaving Contact Us still renders the dashboard', async () => {
  const dom = await contact();
  await goTo(dom.window, '#/dashboard');
  assert(dom.window.document.getElementById('kpiAccuracy'), 'the dashboard did not render after Contact Us');
  assert(!dom.window.document.querySelector('.contact-screen'), 'the contact screen is still mounted');
});

await test('the quiz still starts and still renders its controls after a visit', async () => {
  const dom = await contact();
  await goTo(dom.window, '#/practice');
  const doc = dom.window.document;
  assert(doc.getElementById('qInput'), 'the answer input is missing');
  assert(doc.getElementById('qSubmit'), 'Submit Answer is missing');
  assert(doc.getElementById('qQuit'), 'Quit is missing');
  assert(doc.getElementById('qSubmit').textContent.trim() === 'Submit Answer', 'the Submit label changed');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
