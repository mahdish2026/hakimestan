// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/math-fasl2-final-review.cjs
// Regression guard for the final review: one word for the certificate, no literal
// \u200c in visible copy, no numeric counters in the drawing-lab guide.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');

const source = fs.readFileSync('games/math-fasl2.html', 'utf8');
const Z = '\u200c';
const CERT = 'گواهی' + Z + 'نامه';

// ---- static source checks -------------------------------------------------
assert.ok(!source.includes('گذرنامه'), 'old “گذرنامه” wording is still present');
assert.ok(source.includes(CERT), 'the certificate must be called “گواهی نامه”');
assert.ok(source.includes(CERT + 'ٔ پایان بازی'), 'final certificate title must use the unified wording');
assert.ok(!source.includes('counter(howto)'), 'lab guide still draws numeric counters');
assert.ok(!source.includes('counter-reset:howto'), 'lab guide still resets a numeric counter');
assert.ok(source.includes('.lab-howto li::before{content:"✓"'), 'lab guide must use a check mark instead of numbers');
assert.ok(source.includes('content:counter(example, persian)'), 'worked-step counters must use a valid CSS counter style');
assert.ok(!source.includes('counter(example,"persian")'), 'quoted CSS counter style was invalid and rendered nothing');

const visibleOnly = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
assert.ok(!visibleOnly.includes('\\u200c'), 'visible static copy still contains a literal \\u200c escape');
assert.ok(visibleOnly.includes('خانه' + Z + 'ها'), 'guide lab sentence should use a real half-space');

// ---- runtime checks ------------------------------------------------------
let html = source;
html = html.replace('<script src="../hakim-core.js"></script>', '');
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(html, {
  url: 'https://example.test/games/math-fasl2.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.print = () => {};
    window.confirm = () => true;
    window.requestAnimationFrame = callback => setTimeout(callback, 0);
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
  }
});
const w = dom.window;
const d = w.document;
const $ = selector => d.querySelector(selector);
const $$ = selector => Array.from(d.querySelectorAll(selector));
const click = element => { assert.ok(element, 'missing clickable element'); element.click(); };

try {
  $('#studentName').value = 'سارا';
  click($('#entryForm button[type=submit]'));
  assert.ok(!$('#map').hidden, 'map did not open');

  // Guide: no visible escape sequences, and the lab sentence is correct Persian.
  click($('#guideButton'));
  assert.ok($('#guideModal'), 'guide modal missing');
  const guideText = $('#guideModal').textContent;
  assert.ok(!guideText.includes('\\u200c'), 'guide modal still shows a literal \\u200c');
  assert.ok(guideText.includes('خانه' + Z + 'ها'), 'guide lab sentence lost its half-space');
  assert.ok(guideText.includes(CERT), 'guide should mention the unified certificate wording');
  click($('#closeGuide'));

  // Drawing lab: three steps, no Latin digits in the how-to box.
  click($('#openDrawLab'));
  const howto = $('.lab-howto');
  assert.ok(howto, 'lab how-to box missing');
  assert.equal($$('.lab-howto li').length, 3, 'lab how-to should still have three steps');
  assert.ok(!/[0-9]/.test(howto.textContent), 'lab how-to text should not contain Latin digits');
  click($('#labBack'));

  // Certificate: partial and full states both carry the unified name.
  click($('#openCertificate'));
  assert.ok(!$('#certificate').hidden, 'certificate did not open');
  assert.ok($('#certificateTitle').textContent.includes(CERT), 'partial certificate title is not unified');
  assert.ok(!$('#certificate').textContent.includes('گذرنامه'), 'certificate still says “گذرنامه”');
  assert.ok(!$('#certificate').textContent.includes('\\u200c'), 'certificate shows a literal \\u200c');

  assert.equal(errors.length, 0, `unexpected jsdom errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({
    unifiedCertificate: CERT,
    passportWordings: source.split('گذرنامه').length - 1,
    visibleLiteralEscapes: visibleOnly.split('\\u200c').length - 1,
    labHowtoNumbers: 0,
    invalidQuotedCounterRemoved: true,
    guideModalClean: true,
    jsdomErrors: errors.length
  }, null, 2));
} finally {
  dom.window.close();
}
