// Phase 3 quality, accessibility, offline-first, and pedagogical verification suite for:
// - Group A: games/lab2d.html + games/lab2d-apps/{hakim-gosh,hakim-goosh,hakim-incline,hakim-pulley}.html
// - Group B: games/farsi5-vocab.html, games/kohan-diyar.html
// - Group C: games/hakim-quest.html, games/hakim-cards.html, games/hakim-treasure.html, games/jadval-hekmat.html
// - Group D: games/snake-ladder.html, games/snake-ladder-online.html, games/mancheh-online.html

'use strict';

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const coreJs = fs.readFileSync('hakim-core.js', 'utf8');
const teacherPanelHtml = fs.readFileSync('panels/teacher.html', 'utf8');
const swJs = fs.readFileSync('sw.js', 'utf8');

const PHASE3_GAMES = [
  { file: 'games/lab2d.html', id: 'lab2d', swCheck: './games/lab2d.html' },
  { file: 'games/lab2d-apps/hakim-gosh.html', id: 'hakim-gosh', swCheck: './games/lab2d-apps/hakim-gosh.html' },
  { file: 'games/lab2d-apps/hakim-goosh.html', id: 'hakim-goosh', swCheck: './games/lab2d-apps/hakim-goosh.html' },
  { file: 'games/lab2d-apps/hakim-incline.html', id: 'hakim-incline', swCheck: './games/lab2d-apps/hakim-incline.html' },
  { file: 'games/lab2d-apps/hakim-pulley.html', id: 'hakim-pulley', swCheck: './games/lab2d-apps/hakim-pulley.html' },
  { file: 'games/farsi5-vocab.html', id: 'farsi5-vocab', swCheck: './games/farsi5-vocab.html' },
  { file: 'games/kohan-diyar.html', id: 'kohan-diyar', swCheck: './games/kohan-diyar.html' },
  { file: 'games/hakim-quest.html', id: 'hakim-quest', swCheck: './games/hakim-quest.html' },
  { file: 'games/hakim-cards.html', id: 'hakim-cards', swCheck: './games/hakim-cards.html' },
  { file: 'games/hakim-treasure.html', id: 'hakim-treasure', swCheck: './games/hakim-treasure.html' },
  { file: 'games/jadval-hekmat.html', id: 'jadval-hekmat', swCheck: './games/jadval-hekmat.html' },
  { file: 'games/snake-ladder.html', id: 'snake-ladder', swCheck: './games/snake-ladder.html' },
  { file: 'games/snake-ladder-online.html', id: 'snake-ladder-online', swCheck: './games/snake-ladder-online.html' },
  { file: 'games/mancheh-online.html', id: 'mancheh-online', swCheck: './games/mancheh-online.html' }
];

function inlineScriptsForTest(filePath, rawHtml) {
  const inlinedCore = `<script>${coreJs.replace(/<\/script/gi, '<\\/script')}</script>`;
  return rawHtml
    .replace(/<script\s+src="(?:\.\.\/)+hakim-core\.js"[^>]*><\/script>/i, inlinedCore)
    .replace(/<script\s+src="[^"]*(?:back-to-lobby|hakim-security|hakim-a11y|hakim-sw-register|hakim-read-aloud|html2canvas)[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<link\s+rel="stylesheet"[^>]*>/gi, '');
}

function mountOfflineGame(filePath, { reducedMotion = true } = {}) {
  const rawHtml = fs.readFileSync(filePath, 'utf8');
  const html = inlineScriptsForTest(filePath, rawHtml);

  const errors = [];
  const offlineFetchCalls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', err => {
    if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|window\.scrollTo)/i.test(err.message)) {
      errors.push(err.message);
    }
  });
  virtualConsole.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

  const telemetry = { answers: [], sessions: [] };
  const rafIds = new Set();
  let closed = false;
  const dom = new JSDOM(html, {
    url: 'https://hakimestan.ir/' + filePath,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true });
      window.scrollTo = () => {};
      window.print = () => {};
      window.confirm = () => true;
      window.alert = () => {};
      window.requestAnimationFrame = cb => {
        if (closed) return 0;
        const id = setTimeout(() => {
          rafIds.delete(id);
          if (!closed && window.document) cb(Date.now());
        }, 16);
        rafIds.add(id);
        return id;
      };
      window.cancelAnimationFrame = id => {
        rafIds.delete(id);
        clearTimeout(id);
      };
      window.matchMedia = query => ({
        matches: reducedMotion && /prefers-reduced-motion:\s*reduce/i.test(query),
        media: query,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {}
      });
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      window.HTMLMediaElement.prototype.load = () => {};
      window.fetch = url => {
        offlineFetchCalls.push(String(url));
        return Promise.reject(new Error('OFFLINE_NETWORK_BLOCKED'));
      };
    }
  });

  const { window } = dom;
  const origClose = window.close.bind(window);
  window.close = () => {
    closed = true;
    for (const id of rafIds) clearTimeout(id);
    rafIds.clear();
    return origClose();
  };
  assert.ok(window.Hakim && typeof window.Hakim.saveSession === 'function', `${filePath}: external Hakim core must load`);
  const origSaveAnswer = window.Hakim.saveAnswer.bind(window.Hakim);
  const origSaveSession = window.Hakim.saveSession.bind(window.Hakim);
  window.Hakim.saveAnswer = payload => {
    telemetry.answers.push(payload);
    return origSaveAnswer(payload);
  };
  window.Hakim.saveSession = payload => {
    telemetry.sessions.push(payload);
    return origSaveSession(payload);
  };

  return { dom, window, document: window.document, rawHtml, errors, offlineFetchCalls, telemetry };
}

function verifyRelativeAssets(filePath, rawHtml) {
  const dir = path.dirname(path.resolve(filePath));
  const attrRe = /\b(?:src|href)="([^"#?]+)"/gi;
  let m;
  while ((m = attrRe.exec(rawHtml)) !== null) {
    const ref = m[1].trim();
    if (!ref || /^(?:https?:|data:|blob:|mailto:|tel:|javascript:)/i.test(ref)) continue;
    if (ref.includes('${') || ref.includes("'") || ref.includes('+')) continue;
    const resolved = path.resolve(dir, ref);
    assert.ok(fs.existsSync(resolved), `${filePath}: referenced asset must exist on disk -> ${ref}`);
  }
}

(async () => {
  // 1) Verify offline outbox & local progress in hakim-core.js
  {
    const { dom, window } = mountOfflineGame('games/hakim-cards.html');
    window.Hakim.saveSession({
      student_name: 'تست آفلاین',
      game_id: 'hakim-cards',
      score: 120,
      stars: 3,
      duration: 45,
      completed: true
    });
    window.Hakim.saveAnswer({
      student_name: 'تست آفلاین',
      game_id: 'hakim-cards',
      question_id: 'q1',
      question_text: 'سؤال تستی',
      student_answer: 'پاسخ',
      correct_answer: 'پاسخ',
      is_correct: true
    });
    const outbox = JSON.parse(window.localStorage.getItem('hakim_telemetry_outbox_v1') || '[]');
    assert.equal(outbox.length, 2, 'hakim-core.js must queue both session and answer offline in hakim_telemetry_outbox_v1');
    const localProgress = window.Hakim.getLocalProgress('hakim-cards');
    assert.ok(Array.isArray(localProgress) && localProgress.length === 1 && localProgress[0].score === 120 && localProgress[0].stars === 3, 'hakim-core.js must record local session progress offline');
    dom.window.close();
  }

  // 2) Verify static, SW, Teacher Panel, A11y, Orthography, and Offline Boot across all 14 Phase 3 games
  for (const game of PHASE3_GAMES) {
    assert.ok(teacherPanelHtml.includes(game.id), `panels/teacher.html must register game_id "${game.id}"`);
    assert.ok(swJs.includes(game.swCheck), `sw.js must precache/prefetch "${game.swCheck}"`);

    const { dom, window, document, rawHtml, errors, offlineFetchCalls } = mountOfflineGame(game.file);
    await new Promise(r => setTimeout(r, 90));

    assert.equal(document.documentElement.getAttribute('lang'), 'fa', `${game.file}: must declare lang="fa"`);
    assert.equal(document.documentElement.getAttribute('dir'), 'rtl', `${game.file}: must declare dir="rtl"`);
    assert.match(rawHtml, /http-equiv="Content-Security-Policy"/i, `${game.file}: must include CSP meta tag`);
    assert.doesNotMatch(rawHtml, /id="hakim-core-script"/i, `${game.file}: must not embed stale inline hakim-core-script`);
    assert.match(rawHtml, /<script\s+src="(?:\.\.\/)+hakim-core\.js"/i, `${game.file}: must reference external hakim-core.js`);
    assert.match(rawHtml, /prefers-reduced-motion:\s*reduce/i, `${game.file}: must define prefers-reduced-motion CSS`);
    assert.match(rawHtml, /overflow(?:-x)?:\s*(?:clip|hidden)/i, `${game.file}: must guard horizontal overflow`);

    // Orthography checks
    const unnormalizedEzafe = rawHtml.match(/ه‌ی(?=[\s،.؟!؛:«»)\]])/g) || [];
    assert.equal(unnormalizedEzafe.length, 0, `${game.file}: must normalize all ـه‌ی ezafe forms to ـهٔ`);
    assert.doesNotMatch(rawHtml, /گواهینامه|داناییات|مکتب خانه/, `${game.file}: must use standard Persian ZWNJ orthography`);

    // Verify all relative assets exist
    verifyRelativeAssets(game.file, rawHtml);

    // Heading & button accessibility
    const h1s = document.querySelectorAll('h1');
    assert.equal(h1s.length, 1, `${game.file}: must have exactly 1 <h1> heading`);
    const unnamedButtons = Array.from(document.querySelectorAll('button')).filter(b => {
      const txt = (b.textContent || '').trim();
      const aria = (b.getAttribute('aria-label') || '').trim();
      const title = (b.getAttribute('title') || '').trim();
      const lby = (b.getAttribute('aria-labelledby') || '').trim();
      return !txt && !aria && !title && !lby;
    });
    assert.equal(unnamedButtons.length, 0, `${game.file}: all <button> elements must have an accessible name`);

    // Offline boot cleanliness
    assert.equal(errors.length, 0, `${game.file}: must boot offline with zero runtime errors (got: ${errors.join('; ')})`);
    assert.equal(offlineFetchCalls.length, 0, `${game.file}: must not fire unguarded network fetches when navigator.onLine === false (called: ${offlineFetchCalls.join(', ')})`);

    dom.window.close();
  }

  // 3) Group A & B Pedagogical & Theme Checks
  {
    const gooshHtml = fs.readFileSync('games/lab2d-apps/hakim-goosh.html', 'utf8');
    assert.match(gooshHtml, /چکشی، سندانی و رکابی/, 'hakim-goosh.html must name all three middle-ear ossicles accurately for Grade 5 Science');

    const { dom: vocabDom, document: vocabDoc } = mountOfflineGame('games/farsi5-vocab.html');
    assert.match(vocabDom.serialize(), /مکتب‌خانه/, 'farsi5-vocab.html must spell مکتب‌خانه with ZWNJ');
    const vocabThemeBtn = vocabDoc.getElementById('btnOpenThemeModal');
    assert.ok(vocabThemeBtn, 'farsi5-vocab.html must expose #btnOpenThemeModal theme settings button');
    vocabDom.window.close();

    const { dom: kdDom, window: kdWin, document: kdDoc } = mountOfflineGame('games/kohan-diyar.html');
    const kdRaw = fs.readFileSync('games/kohan-diyar.html', 'utf8');
    assert.match(kdRaw, /هلاکوخان به کدام شهر که پایتخت خلفای عباسی بود لشکر کشید/, 'kohan-diyar.html Q23 must accurately test Hulagu capture of Baghdad before establishing Maragheh (Lesson 20)');
    const lightBtn = Array.from(kdDoc.querySelectorAll('.theme-btn')).find(b => (b.textContent || '').includes('تم طومار روشن'));
    assert.ok(lightBtn, 'kohan-diyar.html must include a light parchment theme button');
    lightBtn.click();
    assert.equal(kdDoc.body.getAttribute('data-theme'), 'light', 'kohan-diyar.html light theme button must activate data-theme="light"');
    kdWin.close();
  }

  // 4) Group C Interactive Telemetry & Shuffling Checks
  {
    // hakim-cards.html: start game -> flip matching pair -> verify Hakim.saveAnswer fires
    const { dom, window, document, telemetry } = mountOfflineGame('games/hakim-cards.html');
    const themeBtn = document.getElementById('themeBtn');
    assert.ok(themeBtn, 'hakim-cards.html must provide #themeBtn');
    themeBtn.click();
    assert.equal(document.body.dataset.theme, 'light', 'hakim-cards.html #themeBtn must switch to light theme');

    document.getElementById('startBtn').click();
    const cards = Array.from(document.querySelectorAll('#board .card'));
    assert.equal(cards.length, 12, 'hakim-cards.html level 6 must render 12 cards');
    // Click two cards to trigger checkPair() -> Hakim.saveAnswer()
    cards[0].click();
    cards[1].click();
    assert.equal(telemetry.answers.length, 1, 'hakim-cards.html checkPair() must record attempt via Hakim.saveAnswer');
    dom.window.close();
  }

  {
    // hakim-treasure.html: start classic journey -> moral choice -> math puzzle -> answer -> verify Hakim.saveAnswer
    const { dom, window, document, telemetry } = mountOfflineGame('games/hakim-treasure.html');
    const fabTheme = document.getElementById('fabTheme');
    assert.ok(fabTheme, 'hakim-treasure.html must provide #fabTheme');
    fabTheme.click();
    assert.equal(document.body.dataset.theme, 'dark', 'hakim-treasure.html #fabTheme must switch to dark/night theme');

    assert.ok(window.HakimTreasure, 'hakim-treasure.html must expose HakimTreasure controller');
    window.HakimTreasure.start('classic');
    window.HakimTreasure.cont();
    window.HakimTreasure.choose(0);
    window.HakimTreasure.toMath();
    const ansIdx = Number(window.HakimTreasure.state.math.answer);
    window.HakimTreasure.answer(ansIdx);
    assert.equal(telemetry.answers.length, 1, 'hakim-treasure.html answerMath() must record math answer via window.Hakim.saveAnswer');
    assert.equal(telemetry.answers[0].is_correct, true, 'hakim-treasure.html shuffled math answer index must evaluate as correct');
    dom.window.close();
  }

  {
    // jadval-hekmat.html: start crossword -> verify grid & dark theme toggle
    const { dom, document } = mountOfflineGame('games/jadval-hekmat.html');
    const btnThemeStart = document.getElementById('btnThemeStart');
    assert.ok(btnThemeStart, 'jadval-hekmat.html must provide #btnThemeStart');
    btnThemeStart.click();
    assert.equal(document.body.dataset.theme, 'dark', 'jadval-hekmat.html #btnThemeStart must toggle dark theme');
    document.getElementById('startBtn').click();
    assert.ok(document.querySelectorAll('#board .cell').length > 10, 'jadval-hekmat.html must build and render crossword cells offline');
    dom.window.close();
  }

  // 5) Group D Board Games & Offline Multiplayer Graceful Fallback Checks
  {
    // snake-ladder.html: start game -> ask question -> verify shuffled MCQ or TF question modal opens
    const { dom, document } = mountOfflineGame('games/snake-ladder.html');
    document.getElementById('themeBtn').click();
    assert.equal(document.body.dataset.theme, 'dark', 'snake-ladder.html #themeBtn must toggle dark theme');
    document.getElementById('startBtn').click();
    document.getElementById('rollBtn').click();
    assert.ok(!document.getElementById('qModal').classList.contains('hidden'), 'snake-ladder.html rollBtn must open educational question modal');
    dom.window.close();
  }

  for (const onlineFile of ['games/snake-ladder-online.html', 'games/mancheh-online.html']) {
    const { dom, document, offlineFetchCalls } = mountOfflineGame(onlineFile);
    const banner = document.getElementById('offlineNotice');
    assert.ok(banner && !banner.hidden, `${onlineFile}: must display #offlineNotice banner automatically when offline`);
    const fallbackLink = banner.querySelector('a[href="snake-ladder.html"]');
    assert.ok(fallbackLink, `${onlineFile}: #offlineNotice must link directly to offline snake-ladder.html`);
    document.getElementById('createBtn').click();
    await new Promise(r => setTimeout(r, 30));
    assert.equal(offlineFetchCalls.length, 0, `${onlineFile}: clicking createBtn while offline must show friendly guidance without firing network fetch`);
    dom.window.close();
  }

  console.log('✓ Phase 3 general/science/Persian/history/board games suite passed (all 14 games verified).');
})();
