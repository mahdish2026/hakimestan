// Serve the repo on localhost:8000. Install puppeteer-core and @sparticuz/chromium, or supply CHROME_PATH.
// Every remote endpoint is intercepted: no real student data is read, written or deleted.
//
// Guards two trust boundaries that the page-level checks do not cover:
//  1. games/teacher.html renders names typed by students (via the Worker). A hostile name must
//     appear as text, never as markup, and malformed numeric fields must not break the table.
//  2. games/lab2d.html accepts completion messages only from its own same-origin game frame.
const assert = require('node:assert/strict');
const pup = require('puppeteer-core');
const base = 'http://localhost:8000/';
const WORKER = 'https://hakim-game-worker.mahdisharifian7.workers.dev';
const EVIL = '<img src=x onerror="window.__pwned=1">\'"); window.__pwned=2; //';

async function launch() {
  const pkg = process.env.CHROME_PATH ? null : require('@sparticuz/chromium');
  const chrome = pkg?.default || pkg;
  return pup.launch({executablePath: process.env.CHROME_PATH || await chrome.executablePath(), args: chrome?.args || ['--no-sandbox']});
}

async function teacherPanel(browser) {
  const p = await browser.newPage();
  const errors = [], deletes = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.accept());
  await p.setRequestInterception(true);
  p.on('request', r => {
    const u = r.url();
    if (r.method() === 'OPTIONS') return r.respond({status: 204, headers: {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, DELETE, POST'}});
    if (u.startsWith(WORKER + '/list')) {
      return r.respond({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: JSON.stringify([
        {id: 7, student_name: EVIL, score: 18, hearts: 9, max_combo: '<b>x</b>', commander: '__proto__', conquered_cities: '"abc"', lesson_stats: '{"18":{"c":"<i>1</i>","w":2}}', created_at: '2026-11-01 10:00'},
        {id: 'b2', student_name: '=HYPERLINK("http://example.com")', score: 5, hearts: -2, created_at: '2026-11-02 10:00'},
        {id: 'c3', student_name: 'سارا', score: 12, hearts: 2, commander: 'nasir', created_at: '2026-11-03 10:00'}
      ])});
    }
    if (u.startsWith(WORKER + '/stats')) {
      return r.respond({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({total_plays: '<svg onload=alert(1)>', avg_score: 11, max_score: 18, min_score: 5})});
    }
    if (u.startsWith(WORKER + '/delete')) {
      deletes.push(new URL(u).searchParams.get('id'));
      return r.respond({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"ok":true}'});
    }
    if (!u.startsWith(base) && /^https?:/.test(u)) return r.abort();
    r.continue();
  });
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('ftah_teacher_token', 'test-token');
    localStorage.setItem('ftah_teacher_auth', JSON.stringify({time: Date.now()}));
  });
  await p.goto(base + 'games/teacher.html', {waitUntil: 'load'});
  await p.waitForSelector('.students-table tbody tr', {timeout: 10000});
  const view = await p.evaluate(() => ({
    pwned: window.__pwned || 0,
    rows: document.querySelectorAll('.students-table tbody tr').length,
    injected: document.querySelectorAll('#content img, #content svg[onload], #content i, #content b').length,
    firstName: document.querySelector('.students-table tbody tr td:nth-child(4) strong')?.textContent,
    statsText: document.querySelector('.stats-grid .num')?.textContent
  }));
  assert.equal(view.pwned, 0, 'student name executed script in teacher panel');
  assert.equal(view.rows, 3);
  assert.equal(view.injected, 0, 'markup from server data was rendered as HTML');
  assert.ok([EVIL, '=HYPERLINK("http://example.com")', 'سارا'].includes(view.firstName), 'names should render as plain text');
  assert.equal(view.statsText, '0', 'non-numeric stats must not render as markup');

  // Search box value is re-rendered on each keystroke; quotes must not break out of the attribute.
  await p.evaluate(() => onSearch('"><img src=x onerror="window.__pwned=3">'));
  assert.equal(await p.evaluate(() => window.__pwned || 0), 0, 'search query broke out of its attribute');
  await p.evaluate(() => clearFilters());

  // Deleting the hostile row sends its real id, and the confirm text cannot inject code.
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('.delete-btn')].find(b => b.dataset.id === '7');
    btn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  assert.deepEqual(deletes, ['7']);
  assert.equal(await p.evaluate(() => window.__pwned || 0), 0);

  // CSV export neutralises spreadsheet formulas.
  const csv = await p.evaluate(async () => {
    let blob;
    const orig = URL.createObjectURL;
    URL.createObjectURL = b => { blob = b; return 'blob:test'; };
    HTMLAnchorElement.prototype.click = function () {};
    exportCSV();
    URL.createObjectURL = orig;
    return blob.text();
  });
  if (process.env.DEBUG) console.log(csv);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://example.com"")"`) && !csv.includes('ضعیف'), 'CSV name column must be the plain name, with formulas neutralised');
  assert.deepEqual(errors, []);
  await p.close();
}

async function labMessages(browser) {
  const p = await browser.newPage();
  const sent = [];
  await p.setRequestInterception(true);
  p.on('request', r => {
    const u = r.url();
    if (u.includes('script.google.com')) { sent.push(r.postData() || ''); return r.respond({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"ok":true}'}); }
    if (!u.startsWith(base) && /^https?:/.test(u)) return r.abort();
    r.continue();
  });
  await p.goto(base + 'games/lab2d.html', {waitUntil: 'load'});
  await p.evaluate(() => { STUDENT.name = 'آزمون'; STUDENT.cls = '۵'; });

  // A message that does not come from the embedded game frame is ignored.
  await p.evaluate(() => window.postMessage({type: 'hakim-gosh-complete', game: 'pulley', score: 100, stars: 3}, '*'));
  await new Promise(r => setTimeout(r, 300));
  assert.equal(await p.evaluate(() => !!PROGRESS.done.pulley), false, 'forged completion from another window was accepted');

  // The real same-origin game frame can still report completion, but only for known experiments.
  await p.evaluate(() => new Promise(res => {
    const f = document.getElementById('hakim-gosh-frame');
    f.onload = res;
    f.src = 'lab2d-apps/hakim-pulley.html';
  }));
  const frame = p.frames().find(f => f.url().includes('hakim-pulley.html'));
  await frame.evaluate(() => {
    parent.postMessage({type: 'hakim-gosh-complete', game: '__proto__', score: 100, stars: 3}, '*');
    parent.postMessage({type: 'hakim-gosh-complete', game: 'pulley', score: 80, stars: 2}, '*');
  });
  await new Promise(r => setTimeout(r, 400));
  const state = await p.evaluate(() => ({pulley: !!PROGRESS.done.pulley, score: PROGRESS.score.pulley, proto: Object.keys(PROGRESS.done).includes('__proto__')}));
  assert.deepEqual(state, {pulley: true, score: 80, proto: false});
  await p.close();
}

(async () => {
  const browser = await launch();
  try {
    await teacherPanel(browser);
    await labMessages(browser);
  } finally { await browser.close(); }
  console.log('PASS: teacher dashboard escapes student data (names, search, stats, CSV) and lab2d accepts results only from its own game frame');
})().catch(e => { console.error(e); process.exitCode = 1; });
