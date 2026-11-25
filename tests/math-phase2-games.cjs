// Phase 2 quality & pedagogical verification suite for:
// - games/math-nesbat.html (نسبتستان)
// - games/math-olgoha.html (الگوستان)
// - games/math-learning-1.html (تقسیم چکشی)
// - games/math-time-mission.html (مأموریت زمان)

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const coreJs = fs.readFileSync('hakim-core.js', 'utf8');

function mountGame(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(
    '<script src="../hakim-core.js"></script>',
    `<script>${coreJs.replace(/<\/script/gi, '<\\/script')}</script>`
  );
  // Strip base64 MP3 payload in JSDOM to keep DOM boot fast
  html = html.replace(/<template id="hakimGuideAudioData"[^>]*>[\s\S]*?<\/template>/g, '<template id="hakimGuideAudioData"></template>');

  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', err => {
    if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|window\.scrollTo)/i.test(err.message)) {
      errors.push(err.message);
    }
  });

  const telemetry = { answers: [], sessions: [] };
  const dom = new JSDOM(html, {
    url: 'https://hakimestan.ir/' + filePath,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.print = () => {};
      window.confirm = () => true;
      window.alert = () => {};
      window.requestAnimationFrame = cb => setTimeout(cb, 0);
      window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
    }
  });

  const { window } = dom;
  assert.ok(window.Hakim, `${filePath}: Hakim core must load`);
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

  return { dom, window, document: window.document, html: fs.readFileSync(filePath, 'utf8'), errors, telemetry };
}

function verifyStaticInvariants(filePath, rawHtml) {
  assert.match(rawHtml, /<html[^>]+lang="fa"[^>]+dir="rtl"/i, `${filePath}: must declare lang="fa" dir="rtl"`);
  assert.doesNotMatch(rawHtml, /گواهینامه/, `${filePath}: must uniformly spell گواهی‌نامه with ZWNJ`);
  assert.match(rawHtml, /@media\s+print/, `${filePath}: must define @media print styles`);
  assert.match(rawHtml, /size:\s*A4/i, `${filePath}: must configure A4 print page size`);
  assert.match(rawHtml, /overflow-x:\s*(hidden|clip)/, `${filePath}: must prevent horizontal overflow`);
  assert.match(rawHtml, /@media\s*\(max-width:\s*(360|380|390|400|420)px\)/, `${filePath}: must define compact mobile layout rules (<=390px/420px)`);
  assert.match(rawHtml, /unicode-bidi:\s*isolate|dir="ltr"/, `${filePath}: must isolate LTR math/time notation inside RTL copy`);
}

// 1. Test games/math-nesbat.html
function testNesbat() {
  const filePath = 'games/math-nesbat.html';
  const ctx = mountGame(filePath);
  const { window, document, html, errors, telemetry } = ctx;
  try {
    verifyStaticInvariants(filePath, html);
    assert.equal(typeof window.diagnoseNesbat, 'function', 'math-nesbat must expose window.diagnoseNesbat');

    // Verify diagnostic engine misconceptions without answer spoilers
    const diagPlace = window.diagnoseNesbat({ type: 'input', answer: 25 }, { val: 250 });
    assert.ok(diagPlace.includes('مرتبهٔ دهدهی') && !diagPlace.includes('۲۵'), 'math-nesbat place-value diagnostic must be non-spoiling');
    const diagChoice = window.diagnoseNesbat({ type: 'choice', diagChoice: { 1: 'ترتیب دو مقدار در نسبت جابه‌جا شده است.' } }, { choiceIdx: 1 });
    assert.ok(diagChoice.includes('ترتیب'), 'math-nesbat choice diagnostic must return targeted misconception message');

    // Theme toggle + persistence
    const btnTheme = document.getElementById('btnTheme');
    assert.ok(btnTheme, 'math-nesbat must provide #btnTheme');
    const prevTheme = document.body.dataset.theme;
    btnTheme.click();
    assert.notEqual(prevTheme, document.body.dataset.theme, 'math-nesbat #btnTheme must toggle body data-theme');

    // Start game & test gameplay + telemetry
    document.getElementById('nameIn').value = 'پژوهشگر نسبت';
    document.getElementById('btnEnter').click();
    const lands = [...document.querySelectorAll('#lands button, #lands .land, #lands [data-land]')];
    assert.ok(lands.length >= 5 || document.getElementById('lands').children.length >= 5, 'math-nesbat map should render 5 lands');
    const firstLand = document.querySelector('#lands button') || document.getElementById('lands').firstElementChild;
    firstLand.click();

    // Advance past lab/intro step if needed until a question renders in #answerBox
    for (let step = 0; step < 3; step++) {
      const choices = [...document.querySelectorAll('#answerBox button')];
      const inp = document.getElementById('ans');
      if (choices.length >= 2) {
        choices[1].click();
        const checkBtn = [...document.querySelectorAll('#acts button')].find(b => b.textContent.includes('بررسی'));
        if (checkBtn) checkBtn.click();
        break;
      } else if (inp) {
        inp.value = '999';
        const checkBtn = [...document.querySelectorAll('#acts button')].find(b => b.textContent.includes('بررسی'));
        if (checkBtn) checkBtn.click();
        break;
      } else {
        const nextAct = document.querySelector('#acts button');
        if (nextAct) nextAct.click();
      }
    }
    assert.ok(telemetry.answers.length >= 1, 'math-nesbat must call Hakim.saveAnswer on question attempt');
    assert.equal(telemetry.answers[0].game_id, 'math-nesbat', 'math-nesbat saveAnswer game_id must be math-nesbat');

    // Certificate modal opens cleanly
    document.getElementById('btnBackMap').click();
    document.getElementById('btnCertMap').click();
    assert.ok(!document.getElementById('cert').hidden || document.getElementById('cert').classList.contains('active') || document.getElementById('certName').textContent.includes('پژوهشگر نسبت'), 'math-nesbat certificate should populate learner name');

    assert.equal(errors.length, 0, `math-nesbat JSDOM errors: ${errors.join('; ')}`);
  } finally {
    window.close();
  }
}

// 2. Test games/math-olgoha.html
function testOlgoha() {
  const filePath = 'games/math-olgoha.html';
  const ctx = mountGame(filePath);
  const { window, document, html, errors, telemetry } = ctx;
  try {
    verifyStaticInvariants(filePath, html);
    assert.equal(typeof window.diagnoseOlgoha, 'function', 'math-olgoha must expose window.diagnoseOlgoha');

    // Test pattern misconception diagnosis (off-by-1 constant term & shared edges)
    const diagOff1 = window.diagnoseOlgoha({ type: 'input', answer: 13 }, { val: 12 });
    assert.ok(diagOff1.includes('۱ واحد اختلاف') && !diagOff1.includes('۱۳'), 'math-olgoha off-by-1 diagnostic must be non-spoiling');
    const diagShared = window.diagnoseOlgoha({ type: 'input', answer: 13 }, { val: 16 });
    assert.ok(diagShared.includes('ضلع‌های مشترک'), 'math-olgoha overcount diagnostic should warn about shared edges');

    // Theme toggle
    const btnTheme = document.getElementById('btnTheme');
    assert.ok(btnTheme, 'math-olgoha must provide #btnTheme');
    const prevTheme = document.body.dataset.theme;
    btnTheme.click();
    assert.notEqual(prevTheme, document.body.dataset.theme, 'math-olgoha #btnTheme must toggle body data-theme');

    // Start student & enter Land 1
    document.getElementById('nameIn').value = 'پژوهشگر الگو';
    document.getElementById('btnEnter').click();
    assert.ok(document.getElementById('lands').children.length >= 5, 'math-olgoha map should render 5 lands');
    const firstLand = document.querySelector('#lands button') || document.getElementById('lands').firstElementChild;
    firstLand.click();

    for (let step = 0; step < 3; step++) {
      const choices = [...document.querySelectorAll('#answerBox button')];
      const inp = document.getElementById('ans');
      if (choices.length >= 2) {
        choices[1].click();
        const checkBtn = [...document.querySelectorAll('#acts button')].find(b => b.textContent.includes('بررسی'));
        if (checkBtn) checkBtn.click();
        break;
      } else if (inp) {
        inp.value = '999';
        const checkBtn = [...document.querySelectorAll('#acts button')].find(b => b.textContent.includes('بررسی'));
        if (checkBtn) checkBtn.click();
        break;
      } else {
        const nextAct = document.querySelector('#acts button');
        if (nextAct) nextAct.click();
      }
    }
    assert.ok(telemetry.answers.length >= 1, 'math-olgoha must call Hakim.saveAnswer on question attempt');
    assert.equal(telemetry.answers[0].game_id, 'math-olgoha', 'math-olgoha saveAnswer game_id must be math-olgoha');

    assert.equal(errors.length, 0, `math-olgoha JSDOM errors: ${errors.join('; ')}`);
  } finally {
    window.close();
  }
}

// 3. Test games/math-learning-1.html
function testDivision() {
  const filePath = 'games/math-learning-1.html';
  const ctx = mountGame(filePath);
  const { window, document, html, errors, telemetry } = ctx;
  try {
    verifyStaticInvariants(filePath, html);
    assert.doesNotMatch(html, /مثلاً زهرا/, 'math-learning-1 placeholder must be gender-neutral');
    assert.equal(typeof window.diagnoseDivisionStep, 'function', 'math-learning-1 must expose window.diagnoseDivisionStep');

    // Test diagnostic cases across division quotient misconceptions
    const dZero = window.diagnoseDivisionStep({ working: 3 }, 6, 1);
    assert.ok(dZero.includes('کوچک‌تر است') && !dZero.includes('= 0'), 'zero-in-quotient misconception diagnostic must be non-spoiling');

    const dTooBig = window.diagnoseDivisionStep({ working: 13 }, 6, 3);
    assert.ok(dTooBig.includes('بزرگ‌تر می‌شود'), 'too-large quotient diagnostic must fire when prod > working');

    const dRemBig = window.diagnoseDivisionStep({ working: 15 }, 6, 1);
    assert.ok(dRemBig.includes('باقی‌مانده'), 'remainder >= divisor diagnostic must fire when quotient digit is too small');

    // Theme toggle
    const btnTheme = document.getElementById('btnTheme');
    assert.ok(btnTheme, 'math-learning-1 must provide #btnTheme');
    const prevTheme = document.body.dataset.theme;
    btnTheme.click();
    assert.notEqual(prevTheme, document.body.dataset.theme, 'math-learning-1 #btnTheme must toggle body data-theme');

    // Enter name, launch Level 1, click stage intro 'شروع!', test step option click & telemetry
    const nameInput = document.getElementById('nameInput');
    nameInput.value = 'پژوهشگر تقسیم';
    nameInput.dispatchEvent(new window.Event('input'));
    document.getElementById('btnPlay').click();
    const startStageBtn = document.querySelector('#actions button');
    assert.ok(startStageBtn, 'math-learning-1 stage intro should render start button in #actions');
    startStageBtn.click();

    const optBtns = [...document.querySelectorAll('#opts button')];
    assert.ok(optBtns.length >= 2, 'math-learning-1 must render step choice buttons in #opts');
    optBtns[0].click();
    assert.ok(telemetry.answers.length >= 1, 'math-learning-1 must call Hakim.saveAnswer on step choice');
    assert.equal(telemetry.answers[0].game_id, 'math-learning-1', 'math-learning-1 saveAnswer game_id must be math-learning-1');

    assert.equal(errors.length, 0, `math-learning-1 JSDOM errors: ${errors.join('; ')}`);
  } finally {
    window.close();
  }
}

// 4. Test games/math-time-mission.html
function testTimeMission() {
  const filePath = 'games/math-time-mission.html';
  const ctx = mountGame(filePath);
  const { window, document, html, errors, telemetry } = ctx;
  try {
    verifyStaticInvariants(filePath, html);
    assert.doesNotMatch(html, /برنامه‌ی|عقربه‌ی|دکمه‌ی|لغزنده‌ی|مرحله‌ی/, 'math-time-mission must uniformly use ـهٔ instead of ـه‌ی in user copy');
    assert.equal(typeof window.diagnoseTimeError, 'function', 'math-time-mission must expose window.diagnoseTimeError');

    // Test diagnostic cases:
    const qClock = { time: [3, 20, 0], options: [{ time: [3, 20, 0], correct: true }, { time: [3, 4, 0], correct: false }] };
    const diagRaw = window.diagnoseTimeError(qClock, { time: [3, 4, 0], correct: false }, 0);
    assert.ok(diagRaw.includes('در ۵ ضرب کن') && !diagRaw.includes('۲۰'), 'Stage 0 should diagnose raw clock number without ×5 and without spoiling ۲۰');

    const diagSwap = window.diagnoseTimeError({ time: [2, 30, 0], options: [{ time: [2, 30, 0], correct: true }] }, { time: [6, 10, 0], correct: false }, 0);
    assert.ok(diagSwap.includes('جابه‌جا خواندی'), 'Stage 0 should diagnose swapped hour/minute hands');

    const qCarry = { equation: [{ type: 'time', time: [1, 40, 0] }, { type: 'op', text: '+' }, { type: 'time', time: [1, 35, 0] }], options: [{ time: [3, 15, 0], correct: true }] };
    const diagCarry = window.diagnoseTimeError(qCarry, { time: [2, 75, 0], correct: false }, 6);
    assert.ok(diagCarry.includes('۶۰'), 'Stage 6 should diagnose un-converted >=60 minutes');

    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    assert.ok(themeBtn, 'math-time-mission must provide #themeToggle');
    assert.equal(document.body.dataset.theme, 'light', 'default theme should be light');
    themeBtn.click();
    assert.equal(document.body.dataset.theme, 'dark', '#themeToggle should switch body data-theme to dark');
    themeBtn.click();

    // Start student -> Stage 1 -> skip lesson & worked example -> test 2-attempt flow + telemetry
    const identity = document.getElementById('studentIdentity');
    identity.value = 'پژوهشگر زمان';
    identity.dispatchEvent(new window.Event('input'));
    document.getElementById('startForm').dispatchEvent(new window.Event('submit', { cancelable: true }));

    document.querySelectorAll('#levelsGrid .level-card')[0].click();
    if (document.getElementById('lessonSkip')) document.getElementById('lessonSkip').click();
    if (document.getElementById('startQuestions')) document.getElementById('startQuestions').click();

    let verifiedTwoAttempts = false;
    for (let i = 0; i < 5 && !verifiedTwoAttempts; i++) {
      const choices = [...document.querySelectorAll('#answerArea .choice')];
      assert.ok(choices.length >= 2, 'Stage 1 question should render choice buttons');
      choices[0].click();
      if (document.querySelector('.feedback-diagnostic')) {
        assert.equal(document.querySelector('.feedback-final-answer'), null, 'Attempt 1 must not reveal .feedback-final-answer');
        const disabledAfter1 = [...document.querySelectorAll('#answerArea .choice')].filter(b => b.disabled);
        assert.equal(disabledAfter1.length, 1, 'Attempt 1 should disable only the 1 chosen wrong option');

        for (const rem of [...document.querySelectorAll('#answerArea .choice')].filter(b => !b.disabled)) {
          rem.click();
          if (document.querySelector('.feedback-detailed')) {
            const allLocked = [...document.querySelectorAll('#answerArea .choice')].every(b => b.disabled);
            assert.equal(allLocked, true, 'Attempt 2 wrong must lock all choice buttons');
            assert.ok(document.querySelector('.feedback-final-answer'), 'Attempt 2 wrong must reveal .feedback-final-answer');
            verifiedTwoAttempts = true;
          }
          break;
        }
      }
      if (!verifiedTwoAttempts) {
        const nextBtn = document.querySelector('#gameActions .button');
        if (nextBtn) nextBtn.click();
      }
    }
    assert.equal(verifiedTwoAttempts, true, 'Verified full two-attempt diagnostic + lock cycle in math-time-mission');
    assert.ok(telemetry.answers.length >= 1, 'math-time-mission must call Hakim.saveAnswer');
    assert.equal(telemetry.answers[0].game_id, 'math-time-mission', 'math-time-mission saveAnswer game_id must be math-time-mission');

    assert.equal(errors.length, 0, `math-time-mission JSDOM errors: ${errors.join('; ')}`);
  } finally {
    window.close();
  }
}

testNesbat();
testOlgoha();
testDivision();
testTimeMission();
console.log('Phase 2 math games suite: all 4 upgraded games (math-nesbat, math-olgoha, math-learning-1, math-time-mission) verified.');
