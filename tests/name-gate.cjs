// Site-wide student name (HakimStudent in hakim-core.js): validation, storage,
// the blocking «اسمت چیه؟» dialog on game pages, input sync and telemetry fallback.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'hakim-core.js'), 'utf8');
const wait = ms => new Promise(r => setTimeout(r, ms));
const KEY = 'hakimestan_student_name';

async function page(url, body, seed) {
  const dom = new JSDOM(`<!doctype html><html lang="fa" dir="rtl"><head></head><body>${body || ''}</body></html>`, {url, runScripts: 'outside-only', pretendToBeVisual: true});
  const w = dom.window;
  w.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
  if (seed) for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, v);
  w.eval(core);
  await wait(20); // DOMContentLoaded → boot
  return w;
}
const outbox = w => JSON.parse(w.localStorage.getItem('hakim_telemetry_outbox_v1') || '[]');

(async () => {
  // ── validation rules ──
  {
    const w = await page('http://localhost/index.html');
    const HS = w.HakimStudent;
    assert.ok(HS && typeof HS.require === 'function' && typeof HS.edit === 'function', 'HakimStudent API');
    assert.equal(w.Hakim.student, HS, 'also reachable as Hakim.student');
    for (const bad of ['', '   ', 'ع', '۱۲۳۴', '!!', 'بازیکن', 'دانش‌آموز', 'دانش آموز', 'سالک', 'دوست من', 'کاوشگر مهمان', 'تحلیل‌گر جوان', 'قهرمان زمان', 'دانش‌آموز دانا']) {
      assert.equal(HS.validate(bad).ok, false, `rejects «${bad}»`);
      assert.ok(HS.validate(bad).message, `explains «${bad}»`);
    }
    assert.deepEqual([HS.validate('  سارا   احمدی ').ok, HS.validate('  سارا   احمدی ').name], [true, 'سارا احمدی']);
    assert.equal(HS.validate('<b>Ali</b>').name, 'bAli/b', 'markup characters are stripped');
    assert.equal(HS.validate('x'.repeat(80)).name.length, 40, 'length is capped');
    assert.equal(HS.isGamePage(), false, 'lobby is not a game page');
    assert.equal(w.document.getElementById('hk-name-gate'), null, 'no gate outside games');
    // legacy key used by the lobby chat is understood
    const legacy = await page('http://localhost/index.html', '', {studentName: 'مریم'});
    assert.equal(legacy.HakimStudent.get(), 'مریم');
    const stale = await page('http://localhost/index.html', '', {[KEY]: 'بازیکن'});
    assert.equal(stale.HakimStudent.get(), '', 'a stored placeholder is not a name');
  }

  // ── game page without a name: blocking dialog ──
  {
    const w = await page('http://localhost/games/hakim-cards.html', '<main id="game"><h1>بازی</h1><label for="nameInput">نام</label><input id="nameInput"><button id="go">شروع</button></main>');
    const d = w.document, HS = w.HakimStudent;
    const gate = d.getElementById('hk-name-gate');
    assert.ok(gate, 'game page without a name shows the gate');
    assert.equal(gate.getAttribute('role'), 'dialog');
    assert.equal(gate.getAttribute('aria-modal'), 'true');
    assert.equal(d.getElementById(gate.getAttribute('aria-labelledby')).textContent, 'سلام! اسمت چیه؟');
    assert.equal(d.querySelector('label[for="hkngInput"]').textContent, 'اسم تو');
    assert.equal(d.activeElement.id, 'hkngInput', 'focus starts in the name field');
    assert.ok(d.getElementById('game').hasAttribute('inert'), 'the game behind is inert');
    assert.equal(gate.querySelector('.hkng-cancel'), null, 'no guest / skip option');
    assert.equal(d.querySelectorAll('h1').length, 1, 'gate adds no extra h1');
    // Escape does not dismiss the mandatory gate
    gate.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    assert.ok(d.getElementById('hk-name-gate'), 'Escape cannot skip the name');
    // late-added page content becomes inert too
    const late = d.createElement('div'); late.id = 'late'; d.body.appendChild(late);
    await wait(5);
    assert.ok(late.hasAttribute('inert'), 'content added while open is inert');
    let waited = '';
    assert.equal(HS.require(n => { waited = n; }), false, 'require() reports a missing name');
    const form = gate.querySelector('form'), input = gate.querySelector('input');
    form.dispatchEvent(new w.Event('submit', {cancelable: true, bubbles: true}));
    assert.ok(d.getElementById('hk-name-gate'), 'empty name is refused');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.match(d.getElementById('hkngError').textContent, /اسمت را بنویس/);
    input.value = 'بازیکن';
    form.dispatchEvent(new w.Event('submit', {cancelable: true, bubbles: true}));
    assert.ok(d.getElementById('hk-name-gate'), 'placeholder name is refused');
    let evt = null;
    w.addEventListener('hakim:student-name', e => { evt = e.detail; });
    input.value = '  سارا  احمدی ';
    form.dispatchEvent(new w.Event('submit', {cancelable: true, bubbles: true}));
    assert.equal(d.getElementById('hk-name-gate'), null, 'valid name closes the gate');
    assert.equal(w.localStorage.getItem(KEY), 'سارا احمدی', 'saved site-wide');
    assert.equal(d.getElementById('game').hasAttribute('inert'), false, 'game is usable again');
    assert.equal(late.hasAttribute('inert'), false);
    assert.equal(d.documentElement.classList.contains('hkng-open'), false);
    assert.equal(d.getElementById('nameInput').value, 'سارا احمدی', 'game name field prefilled');
    assert.equal(d.getElementById('nameInput').getAttribute('aria-required'), 'true');
    assert.equal(waited, 'سارا احمدی', 'queued require() callback runs');
    assert.equal(w.Hakim.getName(), 'سارا احمدی', 'Hakim greets with the name');
    await wait(5);
    assert.deepEqual({...evt}, {name: 'سارا احمدی', source: 'gate'}, 'change event for games');

    // telemetry uses the real name instead of game placeholders
    w.Hakim.saveAnswer({game_id: 'hakim-treasure', student_name: 'سالک', question: 'q', correct: true});
    w.Hakim.saveSession({game_id: 'hakim-cards', score: 3});
    w.Hakim.saveAnswer({game_id: 'snake-ladder', student_name: 'رضا', question: 'q', correct: true});
    const sent = [...outbox(w).map(p => p.student_name)];
    assert.deepEqual(sent, ['سارا احمدی', 'سارا احمدی', 'رضا'], 'placeholders resolve to the site name; real names are kept');
    assert.equal(w.Hakim.getLocalProgress('hakim-cards')[0].student_name, 'سارا احمدی');

    // editing a game's own name field updates the site-wide name
    const own = d.getElementById('nameInput');
    own.value = 'سارا رضایی';
    own.dispatchEvent(new w.Event('change', {bubbles: true}));
    assert.equal(HS.get(), 'سارا رضایی');
    own.value = '';
    own.dispatchEvent(new w.Event('change', {bubbles: true}));
    assert.equal(own.value, 'سارا رضایی', 'clearing a game field restores the name');
    assert.equal(HS.get(), 'سارا رضایی', 'an empty field never erases the name');
    // inputs rendered later (app.js games) are filled automatically
    const box = d.createElement('div'); box.innerHTML = '<input id="studentNameInput" value="تحلیل‌گر جوان">';
    d.getElementById('game').appendChild(box);
    await wait(10);
    assert.equal(d.getElementById('studentNameInput').value, 'سارا رضایی');

    // edit dialog: has a cancel button and Escape closes it without changes
    HS.edit();
    let g2 = d.getElementById('hk-name-gate');
    assert.ok(g2 && g2.querySelector('.hkng-cancel'), 'edit dialog can be cancelled');
    assert.equal(g2.querySelector('input').value, 'سارا رضایی', 'edit starts from the current name');
    g2.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    assert.equal(d.getElementById('hk-name-gate'), null);
    assert.equal(HS.get(), 'سارا رضایی');
    HS.edit();
    g2 = d.getElementById('hk-name-gate');
    g2.querySelector('input').value = 'Sara';
    g2.querySelector('form').dispatchEvent(new w.Event('submit', {cancelable: true, bubbles: true}));
    assert.equal(HS.get(), 'Sara');
    assert.equal(own.value, 'Sara', 'edit syncs game fields');
  }

  // ── upgrade path and profile-per-name games ──
  {
    const w = await page('http://localhost/games/math-geometry.html', '<form id="f"><input id="playerName" data-hakim-name-commit="submit"></form><input id="nameInput">');
    const d = w.document, HS = w.HakimStudent;
    assert.equal(HS.suggest('بازیکن'), false, 'placeholders are never suggested');
    assert.equal(HS.suggest('کاوشگر قدیمی'), true);
    assert.equal(d.getElementById('hkngInput').value, 'کاوشگر قدیمی', 'the game\'s last player is offered in the gate');
    assert.equal(HS.get(), '', 'a suggestion is not a saved name until confirmed');
    d.querySelector('#hk-name-gate form').dispatchEvent(new w.Event('submit', {cancelable: true, bubbles: true}));
    assert.equal(HS.get(), 'کاوشگر قدیمی', 'confirming keeps the old progress name');
    const pf = d.getElementById('playerName');
    assert.equal(pf.value, 'کاوشگر قدیمی');
    pf.value = 'کاوشگر دوم';
    pf.dispatchEvent(new w.Event('change', {bubbles: true}));
    assert.equal(HS.get(), 'کاوشگر قدیمی', 'commit-on-start fields do not switch the name on blur');
    d.getElementById('f').dispatchEvent(new w.Event('submit', {cancelable: true, bubbles: true}));
    assert.equal(HS.get(), 'کاوشگر دوم', '…but do on start');
    // background sync never rewrites a field that already exists on the page
    const other = d.getElementById('nameInput');
    other.value = 'در حال ویرایش';
    d.body.appendChild(d.createElement('p'));
    await wait(10);
    assert.equal(other.value, 'در حال ویرایش');
  }

  // ── stored name: no gate on any game, including nested lab apps ──
  for (const url of ['http://localhost/games/kohan-diyar.html', 'http://localhost/games/lab2d-apps/hakim-incline.html', 'http://localhost/hakimestan/games/math-stats']) {
    const w = await page(url, '<input id="studentNameInput">', {[KEY]: 'علی'});
    assert.equal(w.document.getElementById('hk-name-gate'), null, url);
    assert.equal(w.HakimStudent.isGamePage(), true, url);
    assert.equal(w.document.getElementById('studentNameInput').value, 'علی', url);
    let ran = '';
    assert.equal(w.HakimStudent.require(n => { ran = n; }), true);
    assert.equal(ran, 'علی');
  }
  // teacher tools and opted-out pages are never gated
  for (const url of ['http://localhost/games/teacher.html', 'http://localhost/games/math-decimals-teacher.html']) {
    assert.equal((await page(url)).document.getElementById('hk-name-gate'), null, url);
  }
  {
    const dom = new JSDOM('<!doctype html><html><head><meta name="hakim-name-gate" content="off"></head><body></body></html>', {url: 'http://localhost/games/x.html', runScripts: 'outside-only'});
    dom.window.eval(core);
    await wait(20);
    assert.equal(dom.window.document.getElementById('hk-name-gate'), null, 'meta opt-out');
  }

  // ── every game page loads the core (so every game is gated) ──
  const games = fs.readdirSync(path.join(root, 'games')).filter(f => f.endsWith('.html') && !/teacher/.test(f)).map(f => 'games/' + f)
    .concat(fs.readdirSync(path.join(root, 'games/lab2d-apps')).filter(f => f.endsWith('.html')).map(f => 'games/lab2d-apps/' + f));
  assert.ok(games.length >= 25);
  for (const g of games) {
    const html = fs.readFileSync(path.join(root, g), 'utf8');
    assert.match(html, /<script[^>]+src="(\.\.\/)+hakim-core\.js/, `${g} loads hakim-core.js`);
  }
  console.log(`Name gate: rules, mandatory dialog, sync, edit and telemetry OK (${games.length} game pages load it)`);
})().catch(e => { console.error(e); process.exitCode = 1; });
