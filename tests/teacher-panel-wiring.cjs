// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/teacher-panel-wiring.cjs
// Client-side wiring check for the site tracker and the game results.
// IMPORTANT: this test mocks the Apps Script endpoint. It proves that the
// game's payload shape can be received and rendered by the teacher panel;
// it does NOT prove the real Google Apps Script deployment is reachable.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const { JSDOM, VirtualConsole } = require('jsdom');

const game = fs.readFileSync('games/math-fasl2.html', 'utf8');
const panel = fs.readFileSync('panels/teacher.html', 'utf8');
const core = fs.readFileSync('hakim-core.js', 'utf8');
const ENDPOINT = /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/;

// ---- static wiring -------------------------------------------------------
const gameUrl = game.match(ENDPOINT)?.[0];
const panelUrl = panel.match(ENDPOINT)?.[0];
const coreUrl = core.match(ENDPOINT)?.[0];
assert.ok(gameUrl && panelUrl && coreUrl, 'an endpoint is missing');
assert.equal(gameUrl, panelUrl, 'game and teacher panel do not share the endpoint');
assert.equal(panelUrl, coreUrl, 'hakim-core and teacher panel do not share the endpoint');

for (const snippet of [
  "action:'logVisit'",
  "sendTeacherRequest('answer'",
  "sendTeacherRequest('session'",
  "game_id:'math-fasl2'"
]) assert.ok(game.includes(snippet), `game is missing ${snippet}`);
for (const snippet of ["action: 'session'", "action: 'answer'"])
  assert.ok(core.includes(snippet), `hakim-core is missing ${snippet}`);
for (const snippet of ["api('tpGetResults'", "api('tpGetAnalytics'", 'function renderResults(', 'id="resultsTable"', 'id="visitsTable"'])
  assert.ok(panel.includes(snippet), `panel is missing ${snippet}`);

// «کسرستان» must be a known game, a selectable filter, and a known visited page.
assert.ok(panel.includes("'math-fasl2':'کسرستان'"), 'GAME_NAMES has no کسرستان entry');
assert.ok(panel.includes('<option value="math-fasl2">کسرستان</option>'), 'the results filter has no کسرستان option');
assert.ok(panel.includes("'games/math-fasl2.html':'کسرستان'"), 'PAGE_NAMES has no کسرستان entry');
assert.ok(panel.includes('mappedName(GAME_NAMES,g.game)'), 'dashboard chart must resolve game IDs with a safe lookup');

// ---- runtime rendering with a mocked endpoint ----------------------------
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
const results = [{
  id: 'r-1', student: 'سارا احمدی', game: 'math-fasl2', experiment: 'stage-1',
  score: 100, stars: 3, completed: true, date: new Date().toISOString(),
  details: JSON.stringify({ stage: 1, scorePercent: 100, stars: 3 })
}, {
  id:'r-cannon', student:'مریم', game:'hakim-action-cannon', experiment:'fossil', score:50,
  completed:true, date:new Date().toISOString(), details:JSON.stringify({stars:1})
}, {
  id:'r-exp', student:'علی', game:'hakimestan-lab-2d', experiment:'hakim-action-cannon', score:70,
  completed:true, date:new Date().toISOString(), details:JSON.stringify({stars:2,experiment_id:'hakim-action-cannon'})
}, {
  id:'r-unknown', student:'امیر', game:'unknown-activity', experiment:'water-transfer', score:30,
  completed:false, date:new Date().toISOString(), details:'{}'
}];
const visits = [{
  time: today + ' ۱۰:۰۰:۰۰', user: 'سارا احمدی', page: 'games/math-fasl2.html',
  status: 'جدید', device: 'رایانه', browser: 'Chrome', os: 'Linux',
  lang: 'fa-IR', ref: 'مستقیم'
}, {
  time:today+' ۱۲:۰۰:۰۰', user:'مریم', page:'games/lab2d-apps/hakim-action-cannon.html?demo=1',
  status:'برگشتی', device:'موبایل', browser:'Chrome', os:'Linux', lang:'fa-IR', ref:'مستقیم'
}, {
  time:today+' ۱۳:۰۰:۰۰', user:'علی', page:'https://hakimistan.ir/hakimestan/games/math-fasl2.html?from=home',
  status:'جدید', device:'موبایل', browser:'Chrome', os:'Linux', lang:'fa-IR', ref:'مستقیم'
}];
const surveys=[{type:'student',name:'مریم',game:'hakim-action-cannon',rating:'4'},
  {type:'teacher',name:'آموزگار',game:'games/math-fasl2.html',rating:'5'}];
const requests = [];
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error.message));

const dom = new JSDOM(panel, {
  url: 'https://example.test/panels/teacher.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.print = () => {};
    window.confirm = () => true;
    window.requestAnimationFrame = callback => setTimeout(callback, 0);
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.fetch = (url, options = {}) => {
      let payload = {};
      try { payload = JSON.parse(options.body || '{}'); } catch (_) {}
      requests.push({ url, action: payload.action, payload });
      let data = { ok: true };
      switch (payload.action) {
        case 'tpLogin': data = { ok: true, token: 'mock-token', username: 'معلم آزمایشی' }; break;
        case 'tpGetStats': data = { ok: true, stats: {
          total: 1, today: 1, week: 1, avgScore: 100,
          topStudents: [{ name: 'سارا احمدی', count: 1, avgScore: 100, best: 100 }],
          byGame: [{ game: 'math-fasl2', count: 1 },{game:'hakim-action-cannon',count:2}]
        } }; break;
        case 'tpGetResults': data = { ok: true, results }; break;
        case 'tpGetAnalytics': data = { ok: true, visits }; break;
        case 'tpGetSurveys': data = { ok: true, surveys }; break;
        case 'tpGetGames': data = {ok:true,games:[{id:'kohan-diyar',name:'فتح کهن دیار ایران'},{id:'hakim-action-cannon',name:'hakim-action-cannon'}]}; break;
        default: break;
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    };
  }
});
const w = dom.window;
const d = w.document;
const $ = selector => d.querySelector(selector);
const click = selector => {
  const el = typeof selector === 'string' ? $(selector) : selector;
  assert.ok(el, `missing clickable element: ${selector}`);
  el.click();
};
const settle = () => new Promise(resolve => setTimeout(resolve, 40));

(async () => {
  try {
    $('#passIn').value = 'mock-password';
    click('#btnLogin');
    await settle();
    assert.ok($('#loginView').classList.contains('hidden'), 'mock teacher login did not open the panel');
    assert.ok($('#gamesChart').textContent.includes('کسرستان'), 'dashboard chart does not name the game');
    assert.ok($('#gamesChart').textContent.includes('بازی نامشخص'), 'chart uses the descriptive legacy name');
    assert.equal(w.gameTitle('فتح کهن دیار ایران'), 'فتح کهن دیار ایران', 'Persian names with spaces are not truncated');
    assert.equal(w.gameTitle('🎲 مار و پله دانش'), 'مار و پله دانش');
    assert.equal(w.displayRecordedName('unknown-activity'), 'شناسهٔ ثبت‌شده: unknown-activity');
    assert.equal(w.displayRecordedName('constructor'), 'شناسهٔ ثبت‌شده: constructor');
    assert.equal(w.displayRecordedName('games/unknown-activity.html'), 'شناسهٔ ثبت‌شده: games/unknown-activity.html');
    assert.equal(w.displayRecordedName('https://hakimistan.ir/games/math-fasl2.html?v=1'), 'کسرستان');
    assert.equal(w.getCleanPageInfo('cert-studio').name, 'استودیو گواهی');
    for(const page of execFileSync('git',['ls-files','*.html'],{encoding:'utf8'}).trim().split('\n')) {
      assert.match(w.getCleanPageInfo(page).name,/[\u0600-\u06ff]/,`${page}: every current page has a Persian label`);
      assert.equal(w.getCleanPageInfo(page).path,page,`${page}: correct destination`);
    }
    assert.equal(w.getCleanPageInfo('%68akim-action-cannon.html').href,'');
    assert.equal(w.getCleanPageInfo('hakim-action-cannon').href, '', 'do not link to a page absent from the repository');
    click('.nav-btn[data-screen="games"]'); await settle();
    assert.ok($('#gameList').textContent.includes('فتح کهن دیار ایران'));
    assert.ok($('#gameList').textContent.includes('بازی نامشخص'));
    click('#gameList [data-id="kohan-diyar"]'); await settle();
    assert.ok($('#qTitle').textContent.includes('فتح کهن دیار ایران'), 'question title retains the full Persian name');

    click('.nav-btn[data-screen="results"]');
    await settle();
    assert.ok($('#resultsTable').textContent.includes('کسرستان'), 'results table does not name the game');
    assert.ok($('#resultsTable').textContent.includes('سارا احمدی'), 'results table does not show the student');
    assert.ok($('#resultCards').textContent.includes('کسرستان'), 'result cards do not name the game');
    assert.ok($('#resultsTable').textContent.includes('بازی نامشخص (hakim-action-cannon)'), 'legacy game/experiment should be readable');
    assert.ok($('#resultCards').textContent.includes('بازی نامشخص (hakim-action-cannon)'), 'mobile cards should also name the experiment');
    assert.ok($('#resultsTable').textContent.includes('فسیل و لایه‌های رسوبی'));
    assert.ok($('#resultsTable').textContent.includes('انتقال آب در گیاه'));
    assert.ok($('#resultsTable').textContent.includes('شناسهٔ ثبت‌شده: unknown-activity'));
    assert.equal(w.__resultsData[1].game,'hakim-action-cannon', 'original game ID must remain intact');
    assert.equal(w.__resultsData[2].experiment,'hakim-action-cannon', 'original experiment ID must remain intact');
    click('#resultsTable .detail-result[data-idx="1"]');
    assert.ok($('#detailBody').textContent.includes('بازی نامشخص'));
    click('[data-close-detail]');
    click('#resultsTable .detail-result[data-idx="2"]');
    assert.ok($('#detailBody').textContent.includes('بازی نامشخص (hakim-action-cannon)'), 'nested experiment ID has a readable label');
    assert.ok($('#detailBody').textContent.includes('hakim-action-cannon'), 'unidentified ID remains visible');
    click('[data-close-detail]');
    assert.ok($('#fGame').querySelector('option[value="hakim-action-cannon"]'), 'legacy filter keeps the original ID');
    assert.ok($('#fGame').querySelector('option[value="math-fasl2"]'), 'game filter option missing');

    $('#fGame').value = 'math-fasl2';
    click('#btnApplyFilter');
    await settle();
    const filtered = requests.filter(r => r.action === 'tpGetResults').at(-1);
    assert.equal(filtered.payload.gameId, 'math-fasl2', 'the game filter was not sent to the endpoint');
    $('#fGame').value='hakim-action-cannon'; click('#btnApplyFilter'); await settle();
    assert.equal(requests.filter(r=>r.action==='tpGetResults').at(-1).payload.gameId,'hakim-action-cannon', 'legacy filter sends original ID');

    click('.nav-btn[data-screen="stats"]');
    await settle();
    assert.ok($('#visitsTable').textContent.includes('کسرستان'), 'visits table does not name the game page');
    assert.ok($('#statsPages').textContent.includes('کسرستان'), 'popular pages chart does not name the game page');
    assert.ok($('#svTotal').textContent.includes('۳'), 'visit total is not rendered');
    assert.ok($('#visitsTable').textContent.includes('بازی نامشخص (hakim-action-cannon)'));
    assert.ok($('#statsPages').textContent.includes('بازی نامشخص (hakim-action-cannon)'));
    assert.ok($('#surveysList').textContent.includes('بازی نامشخص (hakim-action-cannon)'));
    assert.equal($('#visitsTable a[href*="hakim-action-cannon"]'),null, 'legacy identifier has no fabricated link');
    $('#vSearch').value='بازی نامشخص'; $('#vSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.ok($('#visitsTable').textContent.includes('مریم'), 'search finds Persian label');
    $('#vSearch').value='hakim-action-cannon'; $('#vSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.ok($('#visitsTable').textContent.includes('مریم'), 'search still finds the raw id');
    let exported;
    w.URL.createObjectURL=blob=>{exported=blob;return 'blob:test'};
    w.URL.revokeObjectURL=()=>{}; w.HTMLAnchorElement.prototype.click=function(){};
    const blobText=blob=>new Promise((resolve,reject)=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsText(blob)});
    click('#btnExportVisits');
    const visitsCsv=await blobText(exported);
    assert.ok(visitsCsv.includes('بازی نامشخص') && visitsCsv.includes('hakim-action-cannon'), 'CSV contains both readable name and original path');
    const imported=[{id:'old-import',student:'<img src=x onerror=alert(1)>',game:'hakim-action-cannon',experiment:'fossil',score:10}];
    w.readImport(new w.File([JSON.stringify({results:imported})],'backup.json',{type:'application/json'}));
    await settle();
    assert.ok($('#importPreview').textContent.includes('بازی نامشخص'));
    assert.ok($('#importPreview').textContent.includes('فسیل و لایه‌های رسوبی'));
    assert.equal($('#importPreview img'),null,'import preview escapes student name');
    click('#btnConfirmImport'); await settle();
    const importRequest=requests.filter(r=>r.action==='tpImportResults').at(-1);
    assert.equal(importRequest.payload.results[0].game,'hakim-action-cannon','import preserves identifiers');
    click('#btnExport');
    const backup=JSON.parse(await blobText(exported));
    assert.equal(backup.results[1].game,'hakim-action-cannon', 'JSON backup preserves raw identifiers');
    assert.equal(backup.results[2].experiment,'hakim-action-cannon');
    click('#btnExportCsv');
    const resultsCsv=await blobText(exported);
    assert.ok(resultsCsv.includes('بازی نامشخص') && resultsCsv.includes('فسیل و لایه‌های رسوبی'));
    w.deleteResult('r-exp',2,$('#resultsTable .delete-result[data-idx="2"]')); await settle();
    const deleted=requests.filter(r=>r.action==='tpDeleteResult').at(-1);
    assert.equal(deleted.payload.experiment,'hakim-action-cannon','delete sends the original ID');
    assert.equal(deleted.payload.game,'hakimestan-lab-2d');
    w.renderResults([{student:'<img src=x onerror=alert(1)>',game:'<img src=x onerror=alert(1)>',experiment:'<svg onload=alert(1)>',details:'{}'}]);
    assert.equal($('#resultsTable img'),null); assert.equal($('#resultsTable svg[onload]'),null);
    assert.equal($('#resultCards img'),null); assert.equal($('#resultCards svg[onload]'),null);
    w.renderGameChart([{game:'<img src=x onerror=alert(1)>',count:1}]);
    assert.equal($('#gamesChart img'),null);
    w.renderSurveys([{type:'student',game:'<img src=x onerror=alert(1)>',name:'<svg onload=alert(1)>'}]);
    assert.equal($('#surveysList img'),null); assert.equal($('#surveysList svg[onload]'),null);
    const unsafe=w.getCleanPageInfo('javascript:alert(1)');
    assert.ok(!unsafe.href.startsWith('javascript:'), 'unsafe visit URL must not become a JavaScript link');

    assert.equal(errors.length, 0, `unexpected jsdom errors: ${errors.join(' | ')}`);
    console.log(JSON.stringify({
      endpointShared: true,
      gameActions: ['logVisit', 'answer', 'session'],
      panelActions: ['tpGetResults', 'tpGetAnalytics'],
      resultsRendered: true,
      visitsRendered: true,
      gameName: 'کسرستان',
      gameFilterSent: true,
      endpointMode: 'mocked (no live Apps Script request)',
      requests: requests.length,
      jsdomErrors: errors.length
    }, null, 2));
  } finally {
    dom.window.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
