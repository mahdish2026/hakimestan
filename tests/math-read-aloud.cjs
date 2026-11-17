// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/math-read-aloud.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const helper = fs.readFileSync(path.join(__dirname, '../js/hakim-read-aloud.js'), 'utf8');
const games = ['math-learning-1', 'math-olgoha', 'math-nesbat'];
const faslHtml = fs.readFileSync(path.join(__dirname, '../games/math-fasl2.html'), 'utf8');
const faslClip = faslHtml.match(/<template id="hakimGuideAudioData">([A-Za-z0-9+/=]+)<\/template>/);
assert.ok(faslClip && Buffer.from(faslClip[1], 'base64').subarray(0, 3).toString() === 'ID3', 'math-fasl2: embedded male Hakim guide audio missing or invalid');
assert.match(faslHtml, /<audio id="hakimGuideAudio" controls preload="none" aria-label="[^"]*صدای مرد/);
assert.match(faslHtml, /<details><summary>خواندن متن راهنمای صوتی<\/summary><p lang="fa-IR">[\s\S]{100,}?<\/p><\/details>/, 'math-fasl2: a transcript must accompany the recording');

for (const game of games) {
  let html = fs.readFileSync(path.join(__dirname, `../games/${game}.html`), 'utf8');
  html = html
    .replace(/<script src="\.\.\/hakim-core\.js"><\/script>/g, '')
    .replace(/<script src="\.\.\/js\/hakim-read-aloud\.js" defer><\/script>/g, '');
  const guideClip = html.match(/<template id="hakimGuideAudioData">([A-Za-z0-9+/=]+)<\/template>/);
  assert.ok(guideClip && Buffer.from(guideClip[1], 'base64').subarray(0, 3).toString() === 'ID3', `${game}: embedded male Hakim guide audio missing or invalid`);
  assert.match(html, /<audio id="hakimGuideAudio" controls preload="none" aria-label="[^"]*صدای مرد/);
  assert.match(html, /<details><summary>خواندن متن راهنمای صوتی<\/summary><p lang="fa-IR">[\s\S]{100,}?<\/p><\/details>/, `${game}: a text transcript must accompany the recording`);

  const dom = new JSDOM(html, {
    url: `https://hakimistan.test/games/${game}.html`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {} });
      window.scrollTo = () => {};
      window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      window.Hakim = {
        init() {}, setName() {}, say() {}, saveSession() {},
        renderFace(_mood, element) { element.textContent = '🧙'; }
      };
      window.AudioContext = class {
        constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
        createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: {} }; }
        createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      };
    }
  });

  try {
    const { document } = dom.window;
    const guidePlayer = document.getElementById('hakimGuideAudio');
    assert.ok(guidePlayer && guidePlayer.src.startsWith('data:audio/mpeg;base64,'), `${game}: guide audio should be wired for offline playback`);
    let voices = [];
    let voicesChanged;
    const spoken = [];
    let cancellations = 0;
    const speechSynthesis = {
      speaking: false,
      getVoices: () => voices,
      speak(utterance) { spoken.push(utterance); this.speaking = true; },
      cancel() { cancellations += 1; this.speaking = false; },
      addEventListener(type, listener) { if (type === 'voiceschanged') voicesChanged = listener; }
    };
    Object.defineProperty(dom.window, 'speechSynthesis', { configurable: true, value: speechSynthesis });
    dom.window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    dom.window.eval(helper);

    let buttons = [...document.querySelectorAll('[data-hk-read-aloud]')];
    assert.ok(buttons.length > 0, `${game}: expected read-aloud controls`);
    for (const button of buttons) {
      assert.ok(document.querySelector(button.getAttribute('data-hk-read-aloud')), `${game}: narration source missing`);
      assert.equal(button.hidden, true, `${game}: controls should hide when there is no Persian voice`);
    }

    voices = [{ lang: 'fa-IR', name: 'Persian female test voice' }];
    voicesChanged();
    assert.ok(buttons.every(button => button.hidden), `${game}: controls must not select a voice identified as feminine`);
    voices.push({ lang: 'fa-IR', name: 'Persian male test voice' });
    voicesChanged();
    buttons = [...document.querySelectorAll('[data-hk-read-aloud]')];
    assert.ok(buttons.every(button => !button.hidden), `${game}: controls should appear with a masculine Persian voice`);

    for (const button of buttons) {
      const source = document.querySelector(button.getAttribute('data-hk-read-aloud'));
      source.textContent = 'توضیح آموزشی برای شنیدن';
      button.click();
      assert.equal(spoken.at(-1).text, 'توضیح آموزشی برای شنیدن', `${game}: current text should be spoken`);
      assert.equal(spoken.at(-1).lang, 'fa-IR', `${game}: speech should use Persian`);
      assert.equal(button.getAttribute('aria-pressed'), 'true');
      assert.match(button.getAttribute('aria-label'), /توقف/);
      button.click();
      assert.equal(button.getAttribute('aria-pressed'), 'false');
      assert.equal(button.textContent, `🔊 ${button.dataset.hkReadAloudLabel}`);
    }

    const dynamicButton = document.createElement('button');
    dynamicButton.dataset.hkReadAloud = '#dynamicLessonText';
    dynamicButton.dataset.hkReadAloudLabel = 'شنیدن درس';
    dynamicButton.textContent = '🔊 شنیدن درس';
    dynamicButton.hidden = true;
    const dynamicSource = document.createElement('p');
    dynamicSource.id = 'dynamicLessonText';
    dynamicSource.textContent = 'درس کوتاه';
    document.body.append(dynamicSource, dynamicButton);
    dom.window.HakimReadAloud.refresh();
    assert.equal(dynamicButton.hidden, false, `${game}: dynamically rendered lesson button should be wired`);
    dynamicButton.click();
    assert.equal(spoken.at(-1).text, 'درس کوتاه');
    dynamicButton.click();
    assert.ok(cancellations >= buttons.length + 1);

    console.log(`PASS ${game}: Persian voice detection, no-voice fallback, speech, stop state, dynamic controls`);
  } finally {
    dom.window.close();
  }
}
