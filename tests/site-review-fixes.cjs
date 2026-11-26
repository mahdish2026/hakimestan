// Regression checks for the site-review fixes:
//  1) Kohan-Diyar: the two map buttons sit side by side (no overlap) and only one map is open at a time
//  2) hakim-a11y: enlarged hit areas never anchor to a far ancestor and cover neighbouring buttons
//  3) Azmoon-saz online exam: the generated file parses, answers are scrambled per exam, grading still unlocks them
//  4) Privacy: privacy page + opt-out honoured by every visit tracker
//  5) Every indexable page declares a canonical URL
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');

const read = (f) => fs.readFileSync(f, 'utf8');

// ── 1) Kohan-Diyar map buttons ─────────────────────────────────────────────
{
  const html = read('games/kohan-diyar.html');
  const doc = new JSDOM(html).window.document;
  const group = doc.querySelector('#map-section .progress-title > .game-map-links');
  assert.ok(group, 'kohan: map buttons must share one .game-map-links group');
  const btns = group.querySelectorAll('.game-map-link');
  assert.equal(btns.length, 2, 'kohan: conquest-map + march-map buttons expected in the group');
  assert.match(btns[0].getAttribute('onclick'), /toggleMapModal\(\)/);
  assert.match(btns[1].getAttribute('onclick'), /openMarchMap\(\)/);
  assert.equal(doc.querySelectorAll('#map-section .progress-title > .game-map-link').length, 0,
    'kohan: no map button may be a direct grid child (they would stack in the same cell)');
  // buttons must be position:relative so the a11y ::after hit area stays on the button
  assert.match(html, /#map-section \.game-map-links > \.game-map-link \{[^}]*position:relative !important/);
  assert.match(html, /function openMapModal\(\) \{[\s\S]{0,200}KohanMarch\.busy\) return;/, 'kohan: conquest map must not open during a march');
  assert.match(html, /function closeMarchConflicts\(\)/);
}

// ── 2) hakim-a11y hit-area fallback ────────────────────────────────────────
{
  const js = read('js/hakim-a11y.js');
  assert.match(js, /if \(getComputedStyle\(el\)\.position === 'static'\) \{\s*el\.style\.position = '';\s*el\.classList\.remove\('a11y-hit'\);/,
    'a11y: enlarged hit area must be dropped when the page forces position:static');
}

// ── 3) Azmoon-saz online exam ──────────────────────────────────────────────
// jsdom has no TextEncoder/TextDecoder on window; every real browser does.
function addCodec(win) { win.TextEncoder = TextEncoder; win.TextDecoder = TextDecoder; }
{
  const src = read('azmoon-saz.html');
  assert.doesNotMatch(src, /EXAM_SECRET/, 'azmoon: no global shared answer key');
  const vc = new VirtualConsole();
  const dom = new JSDOM(src.replace(/<script[^>]+src=[^>]+><\/script>/g, ''),
    { runScripts: 'dangerously', url: 'http://localhost/azmoon-saz.html', virtualConsole: vc, pretendToBeVisual: true, beforeParse: addCodec });
  const w = dom.window;
  const out = w.eval(`(() => {
    const e = exam();
    const q1 = newQ('mcq'); q1.text = 'پایتخت ایران؟'; q1.options = ['شیراز','تبریز','تهران','مشهد']; q1.answer = 2; q1.explanation = 'توضیح‌ویژه‌آزمون';
    const q2 = newQ('short'); q2.text = 'دو به علاوهٔ دو؟'; q2.shortAnswers = ['پاسخ‌کوتاه‌ویژه'];
    e.questions = [q1, q2]; e.showCorrect = 'end';
    return [onlineHTML({ sameOrigin: false }), onlineHTML({ sameOrigin: false })];
  })()`);
  const [h1, h2] = out;
  assert.doesNotMatch(h1, /پاسخ‌کوتاه‌ویژه|توضیح‌ویژه‌آزمون|"answer":2/, 'azmoon: answers must not appear in plain text');
  const xs = [...h1.matchAll(/"_x":"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(xs.length, 2);
  for (const x of xs) {
    const plain = Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    assert.doesNotMatch(plain, /پاسخ‌کوتاه‌ویژه|answer|HK2/, 'azmoon: base64 decoding alone must not reveal answers');
  }
  const k1 = (h1.match(/"secret":"([0-9a-z]+)"/) || [])[1], k2 = (h2.match(/"secret":"([0-9a-z]+)"/) || [])[1];
  assert.ok(k1 && k2 && k1 !== k2, 'azmoon: each exported exam gets its own random key');
  const scripts = [...h1.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 1);
  for (const s of scripts) new vm.Script(s, { filename: 'online-exam.js' }); // throws on syntax errors
  const exam = new JSDOM(h1, { runScripts: 'dangerously', url: 'http://localhost/exam.html', pretendToBeVisual: true, beforeParse: addCodec });
  const qs = JSON.parse(exam.window.eval('prepare(); JSON.stringify(qs)'));
  const mcq = qs.find((q) => q.type === 'mcq'), sh = qs.find((q) => q.type === 'short');
  assert.equal(mcq.answer, 2, 'azmoon: mcq answer unlocked inside the exam');
  assert.equal(mcq.explanation, 'توضیح‌ویژه‌آزمون');
  assert.deepEqual(sh.shortAnswers, ['پاسخ‌کوتاه‌ویژه']);
  assert.ok(!mcq._x && !sh._x);
  exam.window.close(); w.close();
}

// ── 4) Privacy page + opt-out ──────────────────────────────────────────────
{
  assert.ok(fs.existsSync('privacy.html'), 'privacy.html missing');
  const p = read('privacy.html');
  assert.match(p, /hk_no_stats/);
  assert.match(p, /<link rel="canonical" href="https:\/\/hakimistan\.ir\/privacy\.html">/);
  assert.match(read('index.html'), /<a href="privacy\.html">حریم خصوصی<\/a>/, 'lobby footer must link the privacy page');
  assert.match(read('sw.js'), /'\.\/privacy\.html'/);
  assert.match(read('sitemap.xml'), /https:\/\/hakimistan\.ir\/privacy\.html/);
  const walk = (d, acc = []) => {
    for (const f of fs.readdirSync(d)) {
      const q = path.join(d, f);
      if (/node_modules|\.git|exports|\.arena|vendor|tests/.test(q)) continue;
      if (fs.statSync(q).isDirectory()) walk(q, acc); else if (/\.(html|js)$/.test(f)) acc.push(q);
    }
    return acc;
  };
  const trackers = walk('.').filter((f) => /action\s*:\s*['"]logVisit['"]/.test(read(f)));
  assert.ok(trackers.length >= 20, 'expected the visit trackers to be found');
  for (const f of trackers) assert.match(read(f), /hk_no_stats/, f + ': visit tracker ignores the privacy opt-out');
}

// ── 5) Canonical URLs ──────────────────────────────────────────────────────
{
  const files = [];
  for (const d of ['.', 'games', 'panels']) for (const f of fs.readdirSync(d)) if (f.endsWith('.html')) files.push(path.join(d, f));
  for (const d of fs.readdirSync('games')) {
    const g = path.join('games', d);
    if (fs.statSync(g).isDirectory()) for (const f of fs.readdirSync(g)) if (f.endsWith('.html')) files.push(path.join(g, f));
  }
  for (const f of files) {
    const h = read(f);
    if (/<meta name="robots" content="noindex/.test(h)) continue;
    const m = h.match(/<link rel="canonical" href="([^"]+)">/);
    assert.ok(m, f + ': missing canonical');
    const want = 'https://hakimistan.ir/' + (f === 'index.html' ? '' : f.split(path.sep).join('/'));
    assert.equal(m[1], want, f + ': canonical must point to itself');
  }
}

console.log('site-review-fixes: kohan map buttons, a11y hit areas, online exam, privacy opt-out, canonicals ✓');
