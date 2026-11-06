// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/teacher-panel-wiring.cjs
// Client-side wiring check for the site tracker and the game results.
// IMPORTANT: this test mocks the Apps Script endpoint. It proves that the
// game's payload shape can be received and rendered by the teacher panel;
// it does NOT prove the real Google Apps Script deployment is reachable.
const fs = require('node:fs');
const assert = require('node:assert/strict');
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
assert.ok(panel.includes('GAME_NAMES[g.game]'), 'dashboard chart still shows raw game ids');

// ---- runtime rendering with a mocked endpoint ----------------------------
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
const results = [{
  id: 'r-1', student: 'سارا احمدی', game: 'math-fasl2', experiment: 'stage-1',
  score: 100, stars: 3, completed: true, date: new Date().toISOString(),
  details: JSON.stringify({ stage: 1, scorePercent: 100, stars: 3 })
}];
const visits = [{
  time: today + ' ۱۰:۰۰:۰۰', user: 'سارا احمدی', page: 'games/math-fasl2.html',
  status: 'جدید', device: 'رایانه', browser: 'Chrome', os: 'Linux',
  lang: 'fa-IR', ref: 'مستقیم'
}];
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
          byGame: [{ game: 'math-fasl2', count: 1 }]
        } }; break;
        case 'tpGetResults': data = { ok: true, results }; break;
        case 'tpGetAnalytics': data = { ok: true, visits }; break;
        case 'tpGetSurveys': data = { ok: true, surveys: [] }; break;
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

    click('.nav-btn[data-screen="results"]');
    await settle();
    assert.ok($('#resultsTable').textContent.includes('کسرستان'), 'results table does not name the game');
    assert.ok($('#resultsTable').textContent.includes('سارا احمدی'), 'results table does not show the student');
    assert.ok($('#resultCards').textContent.includes('کسرستان'), 'result cards do not name the game');
    assert.ok($('#fGame').querySelector('option[value="math-fasl2"]'), 'game filter option missing');

    $('#fGame').value = 'math-fasl2';
    click('#btnApplyFilter');
    await settle();
    const filtered = requests.filter(r => r.action === 'tpGetResults').at(-1);
    assert.equal(filtered.payload.gameId, 'math-fasl2', 'the game filter was not sent to the endpoint');

    click('.nav-btn[data-screen="stats"]');
    await settle();
    assert.ok($('#visitsTable').textContent.includes('کسرستان'), 'visits table does not name the game page');
    assert.ok($('#statsPages').textContent.includes('کسرستان'), 'popular pages chart does not name the game page');
    assert.ok($('#svTotal').textContent.includes('۱'), 'visit total is not rendered');

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
