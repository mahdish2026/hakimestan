// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/math-fasl2-learning.cjs
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');

let html = fs.readFileSync('games/math-fasl2.html', 'utf8');
const core = fs.readFileSync('hakim-core.js', 'utf8');
html = html.replace('<script src="../hakim-core.js"></script>', `<script>${core.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace('    const state = {name:', '    window.__LEVELS = LEVELS;\n    const state = {name:');

const errors = [];
const spoken = [];
const persianVoices = [];
const speechListeners = new Map();
let speechCancellations = 0;
const speechSynthesis = {
  getVoices: () => persianVoices,
  cancel() { speechCancellations += 1; },
  speak(utterance) { spoken.push(utterance); },
  addEventListener(type, listener) {
    if (!speechListeners.has(type)) speechListeners.set(type, []);
    speechListeners.get(type).push(listener);
  },
  dispatch(type) { (speechListeners.get(type) || []).forEach(listener => listener({ type })); }
};
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(html, {
  url: 'https://example.test/games/math-fasl2.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.print = () => {};
    window.confirm = () => true;
    window.requestAnimationFrame = callback => setTimeout(callback, 0);
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    window.speechSynthesis = speechSynthesis;
  }
});

const { document, __LEVELS: levels } = dom.window;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const click = element => { assert.ok(element, 'expected a clickable element'); element.click(); };
const forbiddenWording = /کتاب|صفحه|bookPages|pageRange|فصل|گنجِ فصل|فرهنگ خواندن|الگوی پایانی کتاب|خط کسری|محمد|یادداشت پایان|تمرین\u200c?های خود/;

try {
  click($('#entryForm button[type="submit"]'));
  assert.match($('#nameError').textContent, /نام دانش‌آموز را وارد کن/, 'student-name gate disappeared');
  $('#studentName').value = 'آزمون یادگیری';
  click($('#entryForm button[type="submit"]'));

  assert.equal(levels.length, 6, 'the six-island structure must remain');
  const activityCount = levels.reduce((sum, level) => sum + level.practice.length + level.challenge.length, 0);
  assert.equal(activityCount, 58, 'the 58 practice/challenge activities must remain');
  assert.equal($$('.level-card').length, 6, 'all six islands should remain available');
  assert.ok($('.level-card.recommended'), 'the map should recommend a next island without locking others');
  assert.doesNotMatch(document.title, forbiddenWording, 'page title still names the printed chapter');
  assert.doesNotMatch(document.querySelector('meta[name="description"]').getAttribute('content'), forbiddenWording, 'meta description still names the printed chapter');
  assert.doesNotMatch($('#map').textContent, forbiddenWording, 'map still references the book, a page, or a chapter');
  for (const level of levels) assert.doesNotMatch(level.topics, forbiddenWording, `island topics still reference the book: ${level.short}`);

  assert.ok($('#openRepModal') && $('#openReviewModal'), 'linked-representation and interleaved-review buttons are missing from the map');
  click($('#openRepModal'));
  assert.ok(!$('#repModal').hidden, 'linked representations panel should open');
  assert.equal($$('.rep-view').length, 3, 'bar, area, and number-line views should be linked');
  assert.equal($$('.rep-cell').length, 16, 'two-unit bar and area grids should start with four parts per unit');
  assert.ok($('.rep-axis .rep-marker'), 'the number-line marker should be visible');
  click($('[data-rep-d="6"]'));
  assert.equal($$('.rep-cell').length, 24, 'changing the denominator should update every view');
  assert.equal($('#repRange').getAttribute('max'), '12', 'the range should cover two whole units');
  click($('#repToggle'));
  assert.match($('#repSymbol').className, /hidden-labels/, 'numeric labels should hide for a prediction');
  assert.equal($$('[data-rep-guess]').length, 4, 'four benchmark estimates should be offered');
  click($('[data-rep-guess="half"]'));
  assert.match($('#repFeedback').textContent, /آفرین/, 'a correct magnitude estimate should get feedback');
  click($('#repClose'));
  assert.ok($('#repModal').hidden, 'linked representations panel should close');

  click($('#openReviewModal'));
  assert.ok(!$('#reviewModal').hidden, 'interleaved review should open');
  assert.equal($$('.review-card').length, 3, 'three short review prompts should be drawn');
  assert.equal(new Set($$('.review-card').map(card => card.dataset.reviewKind)).size, 3, 'review prompts should mix distinct topics');
  click($('#reviewShuffle'));
  assert.equal($$('.review-card').length, 3, 'reshuffling should keep three prompts');
  click($('#reviewClose'));
  assert.ok($('#reviewModal').hidden, 'interleaved review should close');

  const truthWhy = levels[5].practice.concat(levels[5].challenge).filter(q => q.kind === 'truth');
  assert.equal(truthWhy.length, 3, 'final island should have three error-analysis questions');
  assert.ok(truthWhy.every(q => q.whyOptions && q.whyAnswer && q.whyText), 'each error-analysis question needs reasons and an explanation');

  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    const guess = level.example.guess;
    assert.ok(guess && guess.options.length === 3, `island ${index + 1} needs one three-choice prediction`);
    assert.ok(Number.isInteger(guess.answer) && guess.answer >= 0 && guess.answer < guess.options.length, `island ${index + 1} prediction answer is invalid`);
    assert.ok(guess.prompt && guess.hint && guess.feedback, `island ${index + 1} prediction needs a prompt, a hint, and explanatory feedback`);

    click($(`.level-card[data-level="${index}"]`));
    assert.doesNotMatch($('#play').textContent, forbiddenWording, `island ${index + 1} lesson still references the book, a page, or a chapter`);
    assert.match($('.lesson-label').textContent, /تمرین و چالش/, `island ${index + 1} lesson label is not book-independent`);
    if (index === 5) {
      assert.ok($('.reading-note'), 'final review note is missing');
      assert.match($('.reading-note').textContent, /یادداشت مروری/, 'final review note should be a general study reminder');
      assert.doesNotMatch($('.reading-note').textContent, forbiddenWording, 'review note still quotes book-specific history');
    }
    assert.ok($('#exampleSteps').hidden, `island ${index + 1} should keep the worked solution optional at first`);
    assert.equal($('#revealWork').getAttribute('aria-expanded'), 'false');
    assert.ok($$('#exampleSteps li').length >= 3, 'worked steps must be retained');
    assert.ok(!$('.lesson-reference').open, 'the detailed rules and notes should start collapsed');
    assert.equal($$('[data-prediction-choice]').length, 3);
    assert.ok($$('[data-read-aloud]').every(button => button.hidden), 'read-aloud controls should stay unobtrusive when no Persian voice exists');

    const hintButton = $('#showPredictionHint');
    click(hintButton);
    assert.ok(!$('#predictionHint').hidden, 'optional hint should open');
    assert.equal(hintButton.getAttribute('aria-expanded'), 'true');
    click(hintButton);
    assert.ok($('#predictionHint').hidden, 'optional hint should close again');

    const wrongIndex = (guess.answer + 1) % guess.options.length;
    click($(`[data-prediction-choice="${wrongIndex}"]`));
    assert.ok($('#predictionFeedback').textContent.includes('چیزی کم نمی‌شود'), 'a wrong guess must not be punitive');
    assert.ok(!$('#predictionHint').hidden, 'a gentle hint should be offered after a wrong guess');
    assert.ok(!$(`[data-prediction-choice="${wrongIndex}"]`).disabled, 'a wrong guess must allow another try');
    assert.ok($('[data-lesson-flow="predict"]').classList.contains('done'));
    assert.ok($('[data-lesson-flow="see"]').classList.contains('active'));

    click($(`[data-prediction-choice="${guess.answer}"]`));
    assert.equal($('#lessonPrediction').dataset.state, 'solved', 'the correct prediction should be recognized');
    assert.ok($('#predictionFeedback').classList.contains('is-correct'), 'correct answer should receive encouraging feedback');
    assert.ok($('#predictionFeedback').textContent.trim().length > 25, 'feedback should explain the math, not only say correct');
    assert.ok($('#predictionFeedback').querySelector('.frac'), 'feedback should retain its formatted fraction explanation');
    assert.ok($$('[data-prediction-choice]').every(button => button.disabled), 'choices should settle after the correct answer');
    assert.ok($('#revealWork').classList.contains('is-unlocked'));

    click($('#revealWork'));
    assert.ok(!$('#exampleSteps').hidden, 'the student should be able to reveal worked steps');
    assert.equal($('#revealWork').getAttribute('aria-expanded'), 'true');
    click($('#revealWork'));
    assert.ok($('#exampleSteps').hidden, 'the student should be able to hide worked steps again');
    click($('#toPractice'));
    assert.ok($('.task-shell'), `island ${index + 1} no longer leads into its practice`);
    click($('#backToMap'));
  }

  // With a Persian voice available, the same controls become visible and read both the question and the drawing step.
  persianVoices.push({ lang: 'fa-IR', name: 'Persian female test voice' });
  speechSynthesis.dispatch('voiceschanged');
  assert.ok($$('[data-read-aloud]').every(button => button.hidden), 'a feminine Persian system voice must not be selected for Hakim');
  persianVoices.push({ lang: 'fa-IR', name: 'Persian male test voice' });
  speechSynthesis.dispatch('voiceschanged');
  click($('.level-card[data-level="2"]'));
  assert.ok(!$('#listenPrediction').hidden, 'read-aloud controls should appear when a Persian voice exists');
  assert.ok($$('[data-read-aloud]').every(button => !button.hidden), 'every drawing step should offer Persian speech');
  click($('#listenPrediction'));
  assert.equal(spoken.at(-1).text, levels[2].example.guess.prompt, 'the prediction question should be read aloud');
  assert.equal(spoken.at(-1).voice.lang, 'fa-IR', 'speech must use the Persian voice');
  click($('[data-speak-step]'));
  assert.match(spoken.at(-1).text, /یک مستطیل کامل/, 'the current drawing step should be read aloud');
  $('.lesson-reference').open = true;
  assert.ok(!$('#listenLessonReference').hidden, 'the island rules should offer Persian read-aloud');
  click($('#listenLessonReference'));
  assert.ok(spoken.at(-1).text.includes(levels[2].story), 'the lesson rule and explanation should be read aloud');
  click($('#toPractice'));
  assert.ok(!$('#listenTaskPrompt').hidden, 'practice questions should offer Persian read-aloud');
  click($('#listenTaskPrompt'));
  assert.equal(spoken.at(-1).text, levels[2].practice[0].prompt, 'the current practice question should be read aloud');
  assert.equal(speechCancellations, 4, 'each new speech request should replace the previous one');

  assert.equal(errors.length, 0, `unexpected jsdom errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ islands: levels.length, activities: activityCount, predictions: levels.length, noPersianVoiceFallback: 'hidden controls', persianVoiceReadAloud: true, bookPageRefsRemoved: true, linkedViews: 3, reviewPrompts: 3, whyPanels: truthWhy.length, jsdomErrors: errors.length }, null, 2));
} finally {
  dom.window.close();
}
