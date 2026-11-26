const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

// 1. Mission 1: PWA Install Suggestion Banner & A11y Toolbar
{
  const swReg = read('js/hakim-sw-register.js');
  assert(!swReg.includes('hk-install-floating'), 'floating install class must be removed');
  assert(!swReg.includes('.hk-install-text{display:none'), 'mobile install text hiding must be removed');
  assert(swReg.includes('showInstallSuggestion'), 'showInstallSuggestion must exist');
  assert(swReg.includes('hk-install-banner'), 'bottom suggestion banner must exist');

  const a11yCss = read('css/a11y.css');
  assert(/#a11y-tools\s*\{[^}]*display:\s*none/s.test(a11yCss), '#a11y-tools must default to display:none');
  assert(/html\.hk-high-contrast\s+\*[\s\S]*?text-shadow:\s*none\s*!important/.test(a11yCss), 'high-contrast must disable text-shadow');
}

// 2. Mission 2: Offline Fonts, Zero-CLS & Lobby Link in azmoon-saz.html
{
  const azmoon = read('azmoon-saz.html');
  const withoutCsp = azmoon.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
  assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/.test(withoutCsp), 'azmoon-saz must not load external font CDNs anywhere');
  assert(azmoon.includes('css/azmoon-fonts.css'), 'azmoon-saz must load local css/azmoon-fonts.css');

  const azmoonCss = read('css/azmoon-fonts.css');
  for (const m of azmoonCss.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
    const resolved = path.resolve(root, 'css', m[1]);
    assert(existsSync(resolved) && statSync(resolved).size > 1000, `Missing or empty font asset: ${m[1]}`);
  }

  const azDom = new JSDOM(azmoon);
  assert.equal(azDom.window.document.querySelectorAll('h1').length, 1, 'azmoon-saz must have exactly 1 <h1>');
  const lobbyLink = azDom.window.document.querySelector('header a[href="index.html"]');
  assert(lobbyLink, 'azmoon-saz header must include a link back to index.html');
  assert(/\.hakim\s*\{[^}]*position:\s*fixed/.test(azmoon), '#hakim container must use position:fixed to prevent CLS');
}

(async () => {
// 3. Mission 3: Heavy Pages Optimization (farsi5-vocab DOM + Inline Asset Extraction)
{
  const vocabDom = new JSDOM(read('games/farsi5-vocab.html'), {
    url: 'https://hakimistan.ir/games/farsi5-vocab.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  await new Promise((r) => setTimeout(r, 40));
  const initialNodes = vocabDom.window.document.querySelectorAll('*').length;
  assert(initialNodes < 2500, `farsi5-vocab initial DOM should be < 2500 nodes, got ${initialNodes}`);

  // Switch to Lessons tab & test lazy accordion hydration
  vocabDom.window.eval("App.switchTab('lessons')");
  const secondLesson = vocabDom.window.document.getElementById('lesson-card-2');
  assert(secondLesson && !secondLesson.classList.contains('open'), '2nd lesson accordion starts closed');
  assert.equal(secondLesson.querySelectorAll('.word-item-card').length, 0, 'closed lesson accordion must defer rendering word cards');
  vocabDom.window.eval("App.toggleLessonAccordion('2')");
  await new Promise((r) => setTimeout(r, 30));
  const reopenedLesson = vocabDom.window.document.getElementById('lesson-card-2');
  assert(reopenedLesson.querySelectorAll('.word-item-card').length > 0, 'opening lesson accordion hydrates its word cards');

  // Switch to Search tab & test 24-card pagination
  vocabDom.window.eval("App.switchTab('search')");
  assert.equal(vocabDom.window.document.querySelectorAll('#searchResultsGrid .word-item-card').length, 24, 'search tab renders 24 cards initially');
  assert(vocabDom.window.document.getElementById('btnLoadMoreSearch'), 'search tab exposes load-more button');
  vocabDom.window.close();

  const htmlFiles = execFileSync('git', ['ls-files', '*.html'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  for (const f of htmlFiles) {
    const bytes = statSync(path.join(root, f)).size;
    assert(bytes < 700 * 1024, `${f} exceeds 700 KB budget (${bytes} bytes)`);
  }
  for (const heavy of ['games/math-time-mission.html', 'games/kohan-diyar.html', 'games/hakim-quest.html', 'games/lab2d.html']) {
    const src = read(heavy);
    assert(!/data:(?:image|audio|font)\/[^"'\s)]{10000,}/.test(src), `${heavy} still embeds a >10 KB data URI`);
  }
  const lab2d = read('games/lab2d.html');
  assert(!lab2d.includes('iframe.srcdoc'), 'lab2d.html must use external iframe.src instead of iframe.srcdoc');
  for (const app of ['hakim-gosh.html', 'hakim-goosh.html', 'hakim-incline.html', 'hakim-pulley.html']) {
    assert(existsSync(path.join(root, 'games/lab2d-apps', app)), `Missing lab2d sub-app: ${app}`);
  }
}

// 4. Mission 4: Teacher Panel Analytics & Persian Name Mappings
{
  const teacher = read('panels/teacher.html');
  const tDom = new JSDOM(teacher);
  assert.equal(tDom.window.document.querySelectorAll('h1').length, 1, 'panels/teacher.html must have exactly 1 <h1>');
  const gameFilterValues = [...tDom.window.document.querySelectorAll('#fGame option')].map((o) => o.value);
  assert(gameFilterValues.includes('math-decimals'), '#fGame must include math-decimals');
  assert(gameFilterValues.includes('math-geometry'), '#fGame must include math-geometry');
  assert(teacher.includes('formatSurveyGame'), 'panels/teacher.html must format survey game names via formatSurveyGame');
  for (const key of ['math-decimals', 'math-geometry', 'math-time-mission', 'hakim-cards', 'hakim-treasure', 'jadval-hekmat', 'lab2d', 'farsi5-vocab']) {
    assert(teacher.includes(`'${key}':`), `GAME_NAMES in panels/teacher.html must map ${key}`);
  }
}

// 5. Mission 5: Semantic <h1> Across All 44 Pages, Sitemap & SW Offline Coverage
{
  const htmlFiles = execFileSync('git', ['ls-files', '*.html'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  assert.equal(htmlFiles.length, 44, 'expected 44 tracked HTML files');
  for (const f of htmlFiles) {
    const dom = new JSDOM(read(f));
    const h1Count = dom.window.document.querySelectorAll('h1').length;
    assert.equal(h1Count, 1, `${f} must contain exactly 1 <h1>, found ${h1Count}`);
  }

  const sitemap = read('sitemap.xml');
  for (const requiredPage of ['judges.html', 'assessment/decimals-check.html', 'games/math-decimals-teacher.html']) {
    assert(sitemap.includes(`https://hakimistan.ir/${requiredPage}`), `sitemap.xml missing ${requiredPage}`);
  }

  const sw = read('sw.js');
  assert(sw.includes('isTimeMissionAudio'), 'sw.js must route Time Mission MP3s through HTTP 206 Range handler');
  assert(sw.includes("'./css/azmoon-fonts.css'"), 'sw.js must precache css/azmoon-fonts.css');
  assert(sw.includes("'./css/fonts.css'"), 'sw.js must precache css/fonts.css');
}

// 6. Mission 6: Dry-run Idempotency of Build/Audit Scripts
{
  const before = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  for (const tool of ['tools/extract-inline-assets.mjs', 'tools/inject-core.mjs', 'tools/inject-csp.mjs', 'tools/inject-meta.mjs', 'tools/css-compat.mjs']) {
    execFileSync('node', [tool, '--dry'], { cwd: root, stdio: 'ignore' });
  }
  const after = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  assert.equal(after, before, 'tools/* --dry must not mutate working tree files');
}

console.log('PASS: Phase 1 quality gates (PWA/a11y, offline fonts, heavy-page DOM & extraction, teacher panel, 44/44 h1, sitemap/SW, dry-run tools)');
})().catch((err) => { console.error(err); process.exit(1); });
