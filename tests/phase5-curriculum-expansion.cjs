// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/phase5-curriculum-expansion.cjs
// Phase 5 — curriculum expansion: «پیمانه‌ستان» (فصل ۶)، «آمارستان» (فصل ۷)،
// «هم‌آواستان»، «ایران‌گرد کوچک»، «کلاس‌یار» و «گذرنامهٔ قهرمان و تقویم یادگیری».
// Verifies the data banks, page shells, offline/PWA wiring and ecosystem registries.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const quiet = () => new VirtualConsole();
const parse = (html) => new JSDOM(html, { url: 'https://hakimistan.ir/', virtualConsole: quiet() }).window.document;

function loadData(rel, globalName) {
  const sandbox = { window: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read(rel), sandbox, { filename: rel });
  const data = sandbox.window[globalName];
  assert.ok(data, `${rel} must expose window.${globalName}`);
  return data;
}

const GAMES = [
  { id: 'math-measurement', name: 'پیمانه‌ستان', global: 'MeasurementData', app: 'PeymanestanApp', storage: 'hakim.measurement.v1' },
  { id: 'math-stats', name: 'آمارستان', global: 'StatsData', app: 'AmarestanApp', storage: 'hakim.stats.v1' },
  { id: 'farsi5-hamava', name: 'هم‌آواستان', global: 'HamavaData', app: 'HamavaApp', storage: 'hakim.hamava.v1' },
  { id: 'iran-geography', name: 'ایران‌گرد کوچک', global: 'IranGeoData', app: 'IranGeoApp', storage: 'hakim.irangeo.v1' }
];
const NEW_ROOT_PAGES = ['kelasyar.html', 'masir-yadgiri.html'];

// ---- 1) modular page shells ---------------------------------------------
for (const g of GAMES) {
  const shell = `games/${g.id}.html`;
  const html = read(shell);
  assert.ok(Buffer.byteLength(html) < 10 * 1024, `${shell} must stay a light (<10 KB) shell`);
  for (const f of ['style.css', 'data.js', 'app.js']) {
    assert.ok(exists(`games/${g.id}/${f}`), `games/${g.id}/${f} missing`);
    assert.ok(html.includes(`${g.id}/${f}`), `${shell} must load ${g.id}/${f}`);
  }
  const doc = parse(html);
  assert.equal(doc.documentElement.getAttribute('lang'), 'fa', `${shell}: lang=fa`);
  assert.equal(doc.documentElement.getAttribute('dir'), 'rtl', `${shell}: dir=rtl`);
  assert.equal(doc.querySelectorAll('h1').length, 1, `${shell}: exactly one <h1>`);
  assert.ok(doc.querySelector('link[rel="canonical"]'), `${shell}: canonical link missing`);
  assert.ok(doc.querySelector('meta[http-equiv="Content-Security-Policy"]'), `${shell}: CSP meta missing`);
  assert.ok(doc.querySelector('main#main'), `${shell}: <main id="main"> missing`);
  assert.ok(doc.title.includes(g.name.split(' ')[0]), `${shell}: title must name ${g.name}`);
  const app = read(`games/${g.id}/app.js`);
  assert.ok(app.includes(g.storage), `${g.id}/app.js must persist under ${g.storage}`);
  assert.ok(app.includes(`window.${g.app}`) || app.includes(`root.${g.app}`), `${g.id}/app.js must expose ${g.app}`);
  assert.ok(app.includes(g.id), `${g.id}/app.js must report gameId ${g.id}`);
  assert.match(app, /گواهی‌نامه/, `${g.id}/app.js must award a certificate (گواهی‌نامه with ZWNJ)`);
  const css = read(`games/${g.id}/style.css`);
  assert.match(css, /@media print/, `${g.id}/style.css needs print styles`);
  assert.match(css, /size:\s*A4/, `${g.id}/style.css must print on A4`);
  assert.match(css, /prefers-reduced-motion/, `${g.id}/style.css must honour reduced motion`);
}

// ---- 2) math data banks: every task is answerable with its own key -------
function verifyMath(data, label, minStages, minTasks) {
  assert.ok(data.stages.length >= minStages, `${label}: expected >= ${minStages} stations`);
  let tasks = 0;
  const ids = new Set();
  const answerSlots = [0, 0, 0];
  for (const st of data.stages) {
    assert.ok(st.title && st.lesson, `${label}/${st.id}: station needs a title and a micro-lesson (درسنامه)`);
    for (const part of ['story', 'formula', 'worked', 'trap']) {
      assert.ok(String(st.lesson[part] || '').trim().length > 10, `${label}/${st.id}: lesson needs a «${part}» step before practice`);
    }
    assert.ok(st.demoKind, `${label}/${st.id}: lesson needs an interactive visual demo`);
    assert.ok(st.tasks.length >= 4, `${label}/${st.id}: station needs >= 4 tasks`);
    for (const t of st.tasks) {
      tasks++;
      assert.ok(!ids.has(t.id), `${label}: duplicate task id ${t.id}`);
      ids.add(t.id);
      assert.ok(t.prompt && t.hint && t.why, `${label}/${t.id}: prompt, hint and why are required`);
      if (t.kind === 'choice') {
        assert.ok(Array.isArray(t.options) && t.options.length >= 2, `${label}/${t.id}: options missing`);
        assert.equal(new Set(t.options).size, t.options.length, `${label}/${t.id}: duplicate options`);
        assert.equal(data.checkAnswer(t, t.answer), true, `${label}/${t.id}: key must be accepted`);
        for (let i = 0; i < t.options.length; i++) {
          if (i !== t.answer) assert.equal(data.checkAnswer(t, i), false, `${label}/${t.id}: wrong option ${i} accepted`);
        }
        if (t.options.length === 3) answerSlots[t.answer]++;
      } else {
        assert.ok(Number.isFinite(t.answer), `${label}/${t.id}: numeric answer required`);
        assert.equal(data.checkAnswer(t, String(t.answer)), true, `${label}/${t.id}: numeric key must be accepted`);
        assert.notEqual(data.checkAnswer(t, String(t.answer + 7)), true, `${label}/${t.id}: wrong number accepted`);
        // Persian digits and the Persian decimal separator must be understood.
        const fa = String(t.answer).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫');
        assert.equal(data.checkAnswer(t, fa), true, `${label}/${t.id}: Persian-digit key must be accepted`);
      }
    }
  }
  assert.ok(tasks >= minTasks, `${label}: expected >= ${minTasks} tasks, found ${tasks}`);
  // Correct options must not cluster in one slot (guessing "always the first" must not work).
  const totalSlots = answerSlots.reduce((a, b) => a + b, 0);
  if (totalSlots >= 9) {
    for (const n of answerSlots) assert.ok(n >= Math.floor(totalSlots / 6), `${label}: unbalanced answer positions ${answerSlots}`);
  }
  return tasks;
}
const measurement = loadData('games/math-measurement/data.js', 'MeasurementData');
const stats = loadData('games/math-stats/data.js', 'StatsData');
const measurementTasks = verifyMath(measurement, 'پیمانه‌ستان', 10, 50);
const statsTasks = verifyMath(stats, 'آمارستان', 9, 45);

// Textbook coverage keywords (Chapter 6 & 7 of the Grade 5 math book).
const mText = JSON.stringify(measurement.stages);
for (const kw of ['لوزی', 'ذوزنقه', 'دایره', 'حجم', 'گنجایش', 'لیتر', 'سی‌سی']) {
  assert.ok(mText.includes(kw), `پیمانه‌ستان must cover «${kw}»`);
}
const sText = JSON.stringify(stats.stages);
for (const kw of ['نمودار ستونی', 'دایره‌ای', 'خط شکسته', 'میانگین', 'احتمال', 'تاس']) {
  assert.ok(sText.includes(kw), `آمارستان must cover «${kw}»`);
}
// Lab tasks must refuse a correct number typed without building the model.
const labTask = measurement.stages.flatMap((s) => s.tasks).find((t) => t.kind === 'lab' && t.labType === 'rhombus');
assert.ok(labTask, 'پیمانه‌ستان needs a rhombus lab');
assert.equal(measurement.checkAnswer(labTask, String(labTask.answer), { d1: 1, d2: 1 }), 'lab-incomplete');

// ---- 3) Persian homophones ----------------------------------------------
const hamava = loadData('games/farsi5-hamava/data.js', 'HamavaData');
assert.ok(hamava.chapters.length >= 6, 'هم‌آواستان needs 6 chapters');
assert.ok(hamava.lexicon.length >= 20, 'هم‌آواستان lexicon needs >= 20 pairs');
let hamavaTasks = 0;
for (const ch of hamava.chapters) {
  for (const t of ch.tasks) {
    hamavaTasks++;
    assert.ok(t.sentence && t.why && t.hint, `هم‌آواستان/${t.id}: sentence, hint and why required`);
    assert.ok(Number.isInteger(t.answer) && t.options[t.answer] !== undefined, `هم‌آواستان/${t.id}: invalid key`);
    assert.equal(new Set(t.options).size, t.options.length, `هم‌آواستان/${t.id}: duplicate options`);
  }
}
assert.ok(hamavaTasks >= 36, 'هم‌آواستان needs >= 36 tasks');

// ---- 4) Iran geography ---------------------------------------------------
const geo = loadData('games/iran-geography/data.js', 'IranGeoData');
assert.ok(geo.missions.length >= 6, 'ایران‌گرد کوچک needs 6 missions');
assert.ok(geo.mapPins.length >= 18, 'ایران‌گرد کوچک needs >= 18 atlas pins');
const pinIds = new Set(geo.mapPins.map((p) => p.id));
assert.equal(pinIds.size, geo.mapPins.length, 'duplicate atlas pin ids');
let geoTasks = 0, mapTasks = 0;
for (const m of geo.missions) {
  for (const t of m.tasks) {
    geoTasks++;
    if (t.kind === 'map') {
      mapTasks++;
      assert.ok(pinIds.has(t.targetPin), `ایران‌گرد/${t.id}: unknown target pin ${t.targetPin}`);
    } else {
      assert.ok(Number.isInteger(t.answer) && t.options[t.answer] !== undefined, `ایران‌گرد/${t.id}: invalid key`);
    }
  }
}
assert.ok(geoTasks >= 36 && mapTasks >= 12, 'ایران‌گرد کوچک needs >= 36 tasks with >= 12 on the map');

// ---- 5) کلاس‌یار and the passport ----------------------------------------
for (const rel of NEW_ROOT_PAGES) {
  const html = read(rel);
  const doc = parse(html);
  assert.equal(doc.querySelectorAll('h1').length, 1, `${rel}: exactly one <h1>`);
  assert.ok(doc.querySelector('meta[http-equiv="Content-Security-Policy"]'), `${rel}: CSP missing`);
  assert.ok(Buffer.byteLength(html) < 700 * 1024, `${rel}: must stay under 700 KB`);
  assert.match(html, /@page\s*\{[^}]*size:\s*A4/, `${rel}: A4 print sheet missing`);
  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:|tel:|#|javascript:)/.test(href)) continue;
    assert.ok(exists(href.split(/[?#]/)[0]), `${rel}: broken link ${href}`);
  }
}
const kelasyar = read('kelasyar.html');
assert.ok(kelasyar.includes('hakimestan_daftar_v1'), 'کلاس‌یار must read the دفتر معلم roster');
assert.ok(kelasyar.includes('indexedDB'), 'کلاس‌یار must keep an IndexedDB copy');
assert.ok(kelasyar.includes("hqf"), 'کلاس‌یار duel must import HQF question files');
assert.ok(kelasyar.includes('getUserMedia'), 'کلاس‌یار calm meter uses the (optional) microphone');

const masir = read('masir-yadgiri.html');
const masirGames = [...masir.matchAll(/\{ id: '([a-z0-9-]+)', title: '[^']+', cat: '[^']+', icon: '[^']+', href: '([^']+)'/g)];
assert.equal(masirGames.length, 21, 'passport must stamp all 21 student games');
for (const [, id, href] of masirGames) {
  assert.ok(exists(href), `passport links to a missing game: ${href}`);
  assert.equal(href, `games/${id}.html`, `passport id/href mismatch for ${id}`);
}
for (const g of GAMES) {
  assert.ok(masir.includes(`'${g.storage}'`), `passport must detect ${g.id} via ${g.storage}`);
}
for (const month of ['مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند', 'فروردین', 'اردیبهشت']) {
  assert.ok(masir.includes(month), `learning calendar must include ${month}`);
}

// Passport stamping works against real localStorage contents.
{
  const dom = new JSDOM(masir, {
    url: 'https://hakimistan.ir/masir-yadgiri.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: quiet(),
    beforeParse(win) {
      win.localStorage.setItem('hakim.measurement.v1', JSON.stringify({ stars: { 'm1': 3 } }));
      win.localStorage.setItem('hakim.irangeo.v1', JSON.stringify({ stars: { 'ig1': 2 } }));
      win.localStorage.setItem('hakim.geometry.v1.progress', '{"done":1}');
      win.print = () => {};
      win.matchMedia = win.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    }
  });
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const text = dom.window.document.body.textContent;
  assert.match(text, /گذرنامه/, 'passport UI did not render');
  dom.window.close();
}

// ---- 6) ecosystem wiring --------------------------------------------------
const sw = read('sw.js');
for (const g of GAMES) {
  assert.ok(sw.includes(`'./games/${g.id}.html'`), `sw.js must precache games/${g.id}.html`);
  for (const f of ['style.css', 'data.js', 'app.js']) {
    assert.ok(sw.includes(`'./games/${g.id}/${f}'`), `sw.js must precache games/${g.id}/${f}`);
  }
}
for (const rel of NEW_ROOT_PAGES) assert.ok(sw.includes(`'./${rel}'`), `sw.js must precache ${rel}`);

const sitemap = read('sitemap.xml');
for (const rel of [...GAMES.map((g) => `games/${g.id}.html`), ...NEW_ROOT_PAGES]) {
  assert.ok(sitemap.includes(`https://hakimistan.ir/${rel}`), `sitemap.xml missing ${rel}`);
}

const teacher = read('panels/teacher.html');
const tDoc = parse(teacher);
const filterValues = [...tDoc.querySelectorAll('#fGame option')].map((o) => o.value);
for (const g of GAMES) {
  assert.ok(filterValues.includes(g.id), `teacher panel #fGame must offer ${g.id}`);
  assert.ok(teacher.includes(`'${g.id}':'${g.name}'`), `GAME_NAMES must map ${g.id}`);
  assert.ok(teacher.includes(`'games/${g.id}.html':'${g.name}'`), `PAGE_NAMES must map games/${g.id}.html`);
}
assert.ok(teacher.includes("'kelasyar.html':'کلاس‌یار'"), 'PAGE_NAMES must map kelasyar.html');
assert.ok(teacher.includes("'masir-yadgiri.html':"), 'PAGE_NAMES must map masir-yadgiri.html');

const lobby = parse(read('index.html'));
const lobbyHrefs = [...lobby.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
for (const rel of ['games/farsi5-hamava.html', 'games/iran-geography.html', 'kelasyar.html', 'masir-yadgiri.html']) {
  assert.ok(lobbyHrefs.includes(rel), `index.html must link ${rel}`);
}
const heroStats = lobby.querySelector('.hero-stats').textContent;
assert.match(heroStats, /۲۱\s*بازی تعاملی/);
assert.match(heroStats, /۸\s*ابزار معلم/);
const toolCount = lobby.querySelector('[data-count-for="grid-tools"]').textContent.trim();
assert.equal(toolCount, '۸', 'tools kicker must say ۸');
assert.doesNotMatch(read('index.html'), /۱۷ بازی/, 'stale ۱۷-game wording remains in the lobby');

const judges = read('judges.html');
for (const name of ['پیمانه‌ستان', 'آمارستان', 'هم‌آواستان', 'ایران‌گرد کوچک', 'کلاس‌یار']) {
  assert.ok(judges.includes(name), `judges.html must introduce ${name}`);
}
const readme = read('README.md');
for (const rel of ['math-measurement.html', 'math-stats.html', 'farsi5-hamava.html', 'iran-geography.html', 'kelasyar.html', 'masir-yadgiri.html']) {
  assert.ok(readme.includes('`' + rel + '`'), `README is missing ${rel}`);
}

// Hakim Core + companion wiring and snake_case telemetry for the Phase 5 pages.
for (const [html, appJs, gameId] of [
  ['games/math-measurement.html', 'games/math-measurement/app.js', 'math-measurement'],
  ['games/math-stats.html', 'games/math-stats/app.js', 'math-stats'],
  ['games/farsi5-hamava.html', 'games/farsi5-hamava/app.js', 'farsi5-hamava'],
  ['games/iran-geography.html', 'games/iran-geography/app.js', 'iran-geography']
]) {
  const page = read(html);
  const coreAt = page.indexOf('../hakim-core.js');
  const compAt = page.indexOf('../js/hakim-companion.js');
  assert.ok(coreAt > 0 && compAt > coreAt, html + ' must load hakim-core.js then hakim-companion.js');
  const worldsAt = page.indexOf('../js/hakim-worlds.js');
  assert.ok(worldsAt > compAt && worldsAt < page.indexOf('app.js"'), html + ' must load the shared world visuals before app.js');
  assert.ok(page.includes('../css/hakim-worlds.css') && /<body data-world="(measure|stats|hamava|geo)">/.test(page), html + ' must use the shared world skin');
  const app = read(appJs);
  assert.ok(app.includes(gameId), appJs + ' must declare game id ' + gameId);
  assert.ok(/HakimCompanion/.test(app) && /reportStage|reportAnswer/.test(app), appJs + ' must report through HakimCompanion');
  assert.ok(/W\(\)\.journey\(/.test(app) && /W\(\)\.certBanner\(/.test(app) && /w\.celebrate\(/.test(app), appJs + ' must show the stage journey, certificate banner and stage celebration');
  assert.ok(!/Hakim\s*\.\s*save(Answer|Session)\s*\(/.test(app), appJs + ' must not bypass the companion snake_case telemetry bridge');
}
for (const page of ['kelasyar.html', 'masir-yadgiri.html']) {
  const src = read(page);
  assert.ok(src.includes('src="hakim-core.js"') && src.includes('src="js/hakim-companion.js"'), page + ' must load Hakim Core and the companion');
}
const companion = read('js/hakim-companion.js');
for (const field of ['game_id', 'student_name', 'is_correct', 'experiment_id']) {
  assert.ok(companion.includes(field), 'companion telemetry must use snake_case field ' + field);
}
assert.ok(/pointer-events\s*:\s*none/.test(companion), 'companion panel must not block game buttons');
assert.ok(/function mountMusic/.test(companion) && /preload = 'none'/.test(companion), 'companion must offer opt-in background music without preloading');
for (const [appJs, track] of [['games/math-measurement/app.js', 'music9.mp3'], ['games/math-stats/app.js', 'music7.mp3'], ['games/farsi5-hamava/app.js', 'music6.mp3'], ['games/iran-geography/app.js', 'music8.mp3']]) {
  assert.ok(read(appJs).includes("music: '" + track + "'"), appJs + ' must mount background music ' + track);
  assert.ok(exists('games/' + track), 'missing music file games/' + track);
}
const swSrc = read('sw.js');
for (const asset of ['./js/hakim-companion.js', './js/hakim-worlds.js', './css/hakim-worlds.css', './games/iran-geography/map-geo.js']) {
  assert.ok(swSrc.includes(asset), 'sw.js must precache ' + asset);
}

console.log(JSON.stringify({
  measurement: { stations: measurement.stages.length, tasks: measurementTasks },
  stats: { stations: stats.stages.length, tasks: statsTasks },
  hamava: { chapters: hamava.chapters.length, tasks: hamavaTasks, lexicon: hamava.lexicon.length },
  irangeo: { missions: geo.missions.length, tasks: geoTasks, mapTasks, pins: geo.mapPins.length },
  passportGames: masirGames.length,
  ecosystemWired: true
}, null, 2));
