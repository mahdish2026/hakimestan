// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/math-fasl2-questions.cjs
// Regression guard: every question must be self-contained. No unexplained
// "100th figure" prompts, no bare-number expressions, and every pattern
// question must state the pattern's starting shape and rule.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');

const source = fs.readFileSync('games/math-fasl2.html', 'utf8');

// ---- static source checks -------------------------------------------------
for (const leftover of ['شکل صدم', 'در شکل صدم', 'از ۴۰۲ خانه', '71/286', '۲۸۶', '[50,201]']) {
  assert.ok(!source.includes(leftover), `unexplained 100th-figure wording survived: ${leftover}`);
}
assert.ok(source.includes('شکل پنجم چند خانهٔ کل دارد؟'), 'interleaved review pattern item is missing');
assert.ok(/شکل اول ۳ ستون و ۱ خانهٔ رنگی دارد/.test(source), 'review item must define the starting shape');

// ---- runtime checks on the actual question data ---------------------------
let html = source.replace('<script src="../hakim-core.js"></script>', '');
html = html.replace('    const state = {name:', '    window.__LEVELS = LEVELS;\n    window.__ps = persianSpacing;\n    const state = {name:');
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
  }
});
const w = dom.window;
const levels = w.__LEVELS;
const ps = w.__ps;
const isBareFraction = value => /^[\d۰-۹]+\s*\/\s*[\d۰-۹]+$/.test(String(value || '').trim());
const isBareNumber = value => /^[\d۰-۹\s]+$/.test(String(value || '').trim());

try {
  assert.equal(levels.length, 6, 'six islands expected');
  let total = 0, answerTasks = 0;
  for (const [index, level] of levels.entries()) {
    for (const phase of ['practice', 'challenge']) {
      for (const q of level[phase]) {
        total++;
        assert.ok(typeof q.prompt === 'string' && q.prompt.trim().length >= 20,
          `island ${index + 1}/${phase}: question text is missing or too short`);
        assert.ok(/[؟?.]/.test(q.prompt), `island ${index + 1}/${phase}: prompt is not a sentence/question`);
        assert.ok(!/صدم|۱۰۰|100/.test(q.prompt), `island ${index + 1}/${phase}: unexplained 100th term`);
        if (q.kind === 'answer') {
          answerTasks++;
          const expression = String(q.expression || '');
          assert.ok(expression.length > 0, `island ${index + 1}/${phase}: answer task has no expression`);
          assert.ok(!isBareFraction(expression) && !isBareNumber(expression),
            `island ${index + 1}/${phase}: expression is a bare number without an operation`);
          assert.ok(/[+−×÷=□?]/.test(expression),
            `island ${index + 1}/${phase}: expression gives no operation or placeholder`);
          assert.ok(Array.isArray(q.answer) && q.answer.length === 2 && Number(q.answer[1]) !== 0,
            `island ${index + 1}/${phase}: answer key is invalid`);
        }
        // A question about the shape pattern must define the pattern itself.
        if (/الگو|قاعده/.test(q.prompt) && /شکل/.test(q.prompt)) {
          assert.ok(/شکل اول/.test(q.prompt),
            `island ${index + 1}/${phase}: pattern question does not state the starting shape`);
          assert.ok(/اضافه/.test(q.prompt),
            `island ${index + 1}/${phase}: pattern question does not state the growth rule`);
        }
      }
    }
  }
  assert.equal(total, 58, 'activity count changed');
  assert.equal(levels[5].practice.length, 6);
  assert.equal(levels[5].challenge.length, 7);

  // The rewritten island-6 questions are fully spaced in the source itself.
  const finalIsland = levels[5];
  const rewritten = [
    finalIsland.example.prompt,
    finalIsland.keys[3],
    finalIsland.practice[2].prompt,
    finalIsland.challenge[4].prompt,
    finalIsland.challenge[6].prompt
  ];
  for (const text of rewritten) assert.equal(ps(text), text, 'rewritten question needs runtime spacing fixes');
  assert.ok(/شکل اول/.test(finalIsland.example.prompt), 'worked example must define the pattern');
  assert.ok(!/صدم|۴۰۲|۲۸۶/.test(JSON.stringify(finalIsland)), 'island 6 still mentions the 100th figure');

  assert.equal(errors.length, 0, `unexpected jsdom errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({
    islands: levels.length,
    activities: total,
    answerTasks,
    island6: [finalIsland.practice.length, finalIsland.challenge.length],
    unexplained100thFigure: 0,
    bareExpressions: 0,
    patternQuestionsDefineRule: true,
    rewrittenSpacingStable: true,
    jsdomErrors: errors.length
  }, null, 2));
} finally {
  dom.window.close();
}
