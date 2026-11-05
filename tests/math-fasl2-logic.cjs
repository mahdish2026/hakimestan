// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/math-fasl2-logic.cjs
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');

let html = fs.readFileSync('games/math-fasl2.html', 'utf8');
const core = fs.readFileSync('hakim-core.js', 'utf8');
html = html.replace('<script src="../hakim-core.js"></script>', `<script>${core.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace('    const state = {name:', '    window.__LEVELS = LEVELS;\n    window.__isTaskCorrect = isTaskCorrect;\n    window.__persianSpacing = persianSpacing;\n    const state = {name:');

const errors = [];
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
    window.SpeechSynthesisUtterance = class {};
    window.speechSynthesis = { getVoices: () => [], cancel() {}, speak() {}, addEventListener() {} };
  }
});

const { document, __LEVELS: levels, __isTaskCorrect: isTaskCorrect, __persianSpacing: persianSpacing } = dom.window;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const click = element => { assert.ok(element, 'expected a clickable element'); element.click(); };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
const reduce = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const compareRationals = (a, b) => {
  const lhs = a[0] * b[1], rhs = b[0] * a[1];
  return lhs < rhs ? '<' : lhs > rhs ? '>' : '=';
};
const isPositiveInteger = value => Number.isSafeInteger(value) && value > 0;
const isNonNegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
const forbiddenWording = /کتاب|صفحه|bookPages|pageRange|فصل|گنجِ فصل|فرهنگ خواندن|الگوی پایانی کتاب|خط کسری|محمد|یادداشت پایان|تمرین\u200c?های خود/;
function collectPersianStrings(value, path, out) {
  if (typeof value === 'string') {
    if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(value)) out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPersianStrings(item, `${path}[${index}]`, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectPersianStrings(item, `${path}.${key}`, out);
  }
}
function expectedTaskAnswer(q) {
  if (q.kind === 'answer') return q.answer.slice();
  if (q.kind === 'parts') return { whole: q.whole, numerator: q.numerator };
  if (q.kind === 'compare') return compareRationals(q.left, q.right) || q.answer;
  if (q.kind === 'truth') return q.answer;
  if (q.kind === 'numberline') return q.target;
  if (q.kind === 'sort' || q.kind === 'order') return q.order.slice();
  if (q.kind === 'paint') {
    const cells = [];
    for (let r = 0; r < q.rowCount; r += 1) for (let c = 0; c < q.colCount; c += 1) cells.push(`${r},${c}`);
    return cells.sort();
  }
  return null;
}
function wrongTaskAnswer(q, expected) {
  if (q.kind === 'answer') return [expected[0] + 1, expected[1]];
  if (q.kind === 'parts') return { whole: expected.whole + 1, numerator: expected.numerator };
  if (q.kind === 'compare') return expected === '>' ? '<' : '>';
  if (q.kind === 'truth') return !expected;
  if (q.kind === 'numberline') return expected + 1 <= q.maxWhole * q.denominator ? expected + 1 : expected - 1;
  if (q.kind === 'sort' || q.kind === 'order') return expected.slice().reverse();
  if (q.kind === 'paint') return expected.slice(1);
  return null;
}

try {
  assert.equal(levels.length, 6, 'six islands are required');
  const allTasks = [];
  const compareSigns = new Set();
  let totalActivities = 0;

  levels.forEach((level, index) => {
    const label = `island ${index + 1}`;
    for (const field of ['short', 'topics', 'title', 'summary', 'goal', 'story', 'intro', 'formula', 'tip', 'visual']) {
      assert.ok(typeof level[field] === 'string' && level[field].trim(), `${label}: missing ${field}`);
    }
    assert.ok(Array.isArray(level.keys) && level.keys.length >= 3, `${label}: key points are incomplete`);
    assert.ok(level.example && level.example.prompt && level.example.expression, `${label}: worked example is incomplete`);
    assert.ok(Array.isArray(level.example.steps) && level.example.steps.length >= 3, `${label}: worked steps are incomplete`);
    const guess = level.example.guess;
    assert.ok(guess && guess.prompt && guess.hint && guess.feedback, `${label}: prediction text is incomplete`);
    assert.equal(guess.options.length, 3, `${label}: prediction must have three choices`);
    assert.ok(Number.isInteger(guess.answer) && guess.answer >= 0 && guess.answer < 3, `${label}: prediction answer is out of range`);
    assert.ok(Array.isArray(level.practice) && Array.isArray(level.challenge), `${label}: task lists are missing`);
    const expectedCounts = index === 5 ? [6, 7] : [4, 5];
    assert.deepEqual([level.practice.length, level.challenge.length], expectedCounts, `${label}: unexpected task counts`);
    totalActivities += level.practice.length + level.challenge.length;

    for (const [phase, tasks] of [['practice', level.practice], ['challenge', level.challenge]]) {
      tasks.forEach((q, taskIndex) => {
        const id = `${label}/${phase}/${taskIndex + 1}`;
        allTasks.push(q);
        assert.ok(q.prompt && q.prompt.trim(), `${id}: prompt is missing`);
        assert.ok((q.hint && q.hint.trim()) || (Array.isArray(q.hints) && q.hints.length), `${id}: hint is missing`);
        assert.ok(Array.isArray(q.solution) && q.solution.length && q.solution.every(step => typeof step === 'string' && step.trim()), `${id}: solution is incomplete`);
        assert.ok(['answer', 'parts', 'compare', 'truth', 'numberline', 'sort', 'order', 'paint'].includes(q.kind), `${id}: unknown task kind ${q.kind}`);

        if (q.kind === 'answer') {
          assert.ok(Array.isArray(q.answer) && q.answer.length === 2, `${id}: answer must be [numerator, denominator]`);
          assert.ok(Number.isSafeInteger(q.answer[0]) && isPositiveInteger(q.answer[1]), `${id}: answer is not a valid rational`);
          assert.deepEqual(reduce(q.answer[0], q.answer[1]), [q.answer[0], q.answer[1]], `${id}: answer should already be simplified`);
        }
        if (q.kind === 'parts') {
          assert.ok(isNonNegativeInteger(q.whole) && isNonNegativeInteger(q.numerator) && isPositiveInteger(q.denominator), `${id}: mixed-number parts are invalid`);
          assert.ok(q.numerator < q.denominator, `${id}: remainder must be smaller than the denominator`);
        }
        if (q.kind === 'compare') {
          assert.ok(['<', '=', '>'].includes(q.answer), `${id}: invalid comparison sign`);
          assert.ok(q.expression && q.expression.includes('□'), `${id}: comparison expression needs a placeholder`);
          assert.ok(Array.isArray(q.left) && q.left.length === 2 && isNonNegativeInteger(q.left[0]) && isPositiveInteger(q.left[1]), `${id}: left operand is invalid`);
          assert.ok(Array.isArray(q.right) && q.right.length === 2 && isNonNegativeInteger(q.right[0]) && isPositiveInteger(q.right[1]), `${id}: right operand is invalid`);
          assert.equal(compareRationals(q.left, q.right), q.answer, `${id}: stored sign contradicts the operands`);
          compareSigns.add(q.answer);
        }
        if (q.kind === 'truth') assert.equal(typeof q.answer, 'boolean', `${id}: truth answer must be boolean`);
        if (q.kind === 'numberline') {
          assert.ok(isPositiveInteger(q.denominator) && isPositiveInteger(q.maxWhole), `${id}: number-line scale is invalid`);
          assert.ok(Number.isSafeInteger(q.target) && q.target >= 0 && q.target <= q.maxWhole * q.denominator, `${id}: target is outside the number line`);
        }
        if (q.kind === 'sort' || q.kind === 'order') {
          assert.ok(Array.isArray(q.items) && q.items.length >= 2, `${id}: sequence items are missing`);
          const ids = q.items.map(item => item.id);
          assert.equal(new Set(ids).size, ids.length, `${id}: item ids are not unique`);
          assert.ok(Array.isArray(q.order) && q.order.length === ids.length, `${id}: order length is wrong`);
          assert.equal(new Set(q.order).size, q.order.length, `${id}: order repeats an item`);
          assert.ok(q.order.every(value => ids.includes(value)), `${id}: order references an unknown id`);
          if (q.kind === 'sort') {
            assert.ok(q.items.every(item => Array.isArray(item.value) && item.value.length === 2), `${id}: sort items need numeric values`);
            for (let i = 1; i < q.order.length; i += 1) {
              const prev = q.items.find(item => item.id === q.order[i - 1]).value;
              const next = q.items.find(item => item.id === q.order[i]).value;
              assert.ok(prev[0] * next[1] <= next[0] * prev[1], `${id}: sort order is not ascending`);
            }
          }
        }
        const expected = expectedTaskAnswer(q);
        const wrong = wrongTaskAnswer(q, expected);
        assert.equal(isTaskCorrect(q, expected), true, `${id}: stored expected answer is rejected by the validator`);
        assert.equal(isTaskCorrect(q, wrong), false, `${id}: a clearly wrong answer was accepted`);
        assert.equal(persianSpacing(persianSpacing(q.prompt)), persianSpacing(q.prompt), `${id}: spacing helper is not idempotent`);
        if (q.kind === 'paint') {
          assert.ok(isPositiveInteger(q.rows) && isPositiveInteger(q.cols), `${id}: grid size is invalid`);
          assert.ok(isNonNegativeInteger(q.rowCount) && isNonNegativeInteger(q.colCount), `${id}: selected area is invalid`);
          assert.ok(q.rowCount <= q.rows && q.colCount <= q.cols && q.rowCount * q.colCount > 0, `${id}: selected area is outside the grid`);
        }
      });
    }
  });

  assert.equal(totalActivities, 58, 'the 58 activities must remain intact');
  assert.deepEqual([...compareSigns].sort(), ['<', '=', '>'].sort(), 'all three comparison relations must be exercised');

  // The comparison UI must be LTR, labelled, and driven by the selected symbol.
  click($('#entryForm button[type="submit"]'));
  $('#studentName').value = 'آزمون منطق';
  click($('#entryForm button[type="submit"]'));
  assert.ok($('#soundToggle'), 'optional sound toggle is missing');
  assert.equal($('#soundToggle').getAttribute('aria-pressed'), 'false', 'sound should be opt-in');
  click($('#soundToggle'));
  assert.equal($('#soundToggle').getAttribute('aria-pressed'), 'true', 'sound toggle did not turn on');

  click($('.level-card[data-level="5"]'));
  click($('#toPractice'));
  assert.ok($('.compare-lab'), 'comparison lab is missing');
  assert.equal($('.compare-row').getAttribute('dir'), 'ltr', 'comparison choices must be isolated LTR');
  assert.deepEqual($$('.compare-choice').map(button => button.dataset.value), ['<', '=', '>'], 'choice order must be < = > from left to right');
  assert.ok($$('.compare-choice').every(button => button.getAttribute('aria-label') && button.querySelector('small')), 'comparison buttons need spoken and visible labels');
  assert.equal($$('.compare-bar-row').length, 2, 'comparison needs one bar per side');
  assert.equal($('[data-compare-symbol]').textContent, '□', 'comparison slot should start empty');
  assert.match($('[data-compare-coach]').textContent, /دهانه/, 'comparison coach rule is missing');

  click($$('.compare-choice').find(button => button.dataset.value === '>'));
  assert.equal($('[data-compare-symbol]').textContent, '>', 'selected sign should appear in the live statement');
  assert.match($('[data-compare-coach]').textContent, /چپ/, 'greater-than coach text is wrong');
  click($('#checkTask'));
  assert.ok($('#nextTask').hidden, 'a wrong comparison sign was accepted');

  click($$('.compare-choice').find(button => button.dataset.value === '<'));
  assert.equal($('[data-compare-symbol]').textContent, '<', 'correct sign should appear in the live statement');
  assert.match($('[data-compare-coach]').textContent, /راست/, 'less-than coach text is wrong');
  click($('#checkTask'));
  assert.ok(!$('#nextTask').hidden, 'the correct comparison sign was rejected');
  assert.notEqual($('#hudXp').textContent, '۰', 'XP should increase after a correct answer');
  assert.equal($('#hudStreak').textContent, '۱', 'streak should start at one after a correct answer');

  const dataStrings = [];
  collectPersianStrings(levels, 'LEVELS', dataStrings);
  for (const { path, text } of dataStrings) {
    assert.doesNotMatch(text, forbiddenWording, `${path} still references the book, a page, or a chapter`);
    assert.equal(persianSpacing(persianSpacing(text)), persianSpacing(text), `${path}: spacing helper is not idempotent`);
  }
  assert.equal(errors.length, 0, `unexpected jsdom errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ islands: levels.length, tasks: totalActivities, validatedAnswers: allTasks.length, userStrings: dataStrings.length, compareRelations: [...compareSigns].sort(), choiceOrder: ['<', '=', '>'], xpStarted: true, soundOptIn: true, bookPageRefsRemoved: true, jsdomErrors: errors.length }, null, 2));
} finally {
  dom.window.close();
}
