// Run with: NODE_PATH=<jsdom modules> node tests/math-fasl2-draw-lab.cjs
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');

let html = fs.readFileSync('games/math-fasl2.html', 'utf8');
const core = fs.readFileSync('hakim-core.js', 'utf8');
html = html.replace('<script src="../hakim-core.js"></script>', `<script>${core.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace('    const state = {name:', '    window.__LEVELS = LEVELS;\n    window.__DRAW_LABS = DRAW_LABS;\n    window.__LAB_GROUPS = LAB_GROUPS;\n    const state = {name:');

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

const { document, localStorage } = dom.window;
const { __LEVELS: levels, __DRAW_LABS: labs, __LAB_GROUPS: groups } = dom.window;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const click = element => { assert.ok(element, 'expected a clickable element'); element.click(); };
const clickSelector = selector => click($(selector));

function labExpected(lab) {
  if (lab.mode === 'grid') return lab.grid.expected.slice();
  if (lab.mode === 'line') return lab.line.expected.slice();
  return lab.regions.expected.slice();
}

function solveCurrentLab() {
  const id = $('.lab-card').dataset.labId;
  const lab = labs.find(item => item.id === id);
  const values = labExpected(lab);
  if (lab.mode === 'grid') {
    values.forEach(value => click($(`[data-lab-cell="${value}"]`)));
  } else if (lab.mode === 'line') {
    values.forEach(value => click($(`[data-lab-tick="${value}"]`)));
  } else {
    values.forEach(value => click($(`[data-lab-region="${value}"]`)));
  }
  clickSelector('#labCheck');
  assert.match($('#labFeedback').textContent, /درست کشیدی/, `${id}: correct drawing was not accepted`);
}

try {
  assert.equal(levels.length, 6);
  assert.equal(groups.length, 5);
  assert.ok(labs.length >= 18, 'drawing lab should cover every major case');
  assert.equal(new Set(labs.map(lab => lab.id)).size, labs.length, 'lab ids must be unique');
  const groupIds = new Set(groups.map(group => group.id));
  const levelIndexes = new Set(levels.map((_, i) => i));

  labs.forEach(lab => {
    const id = lab.id;
    assert.ok(groupIds.has(lab.group), `${id}: unknown group`);
    assert.ok(levelIndexes.has(lab.level), `${id}: unknown island`);
    assert.ok(['grid', 'line', 'regions'].includes(lab.mode), `${id}: unknown mode`);
    for (const field of ['title', 'equation', 'idea', 'prompt', 'hint']) assert.ok(typeof lab[field] === 'string' && lab[field].trim(), `${id}: missing ${field}`);
    assert.ok(Array.isArray(lab.steps) && lab.steps.length >= 3, `${id}: steps are incomplete`);
    assert.ok(lab.steps.every(step => step && typeof step.title === 'string' && step.title.trim() && typeof step.text === 'string' && step.text.trim()), `${id}: every step needs a clear action and a reason`);
    assert.ok(Array.isArray(lab.solution) && lab.solution.length >= 2, `${id}: solution is incomplete`);
    const expected = labExpected(lab);
    assert.ok(expected.length > 0, `${id}: expected drawing is empty`);
    assert.equal(new Set(expected).size, expected.length, `${id}: duplicated expected marks`);
    if (lab.mode === 'grid') {
      const { rows, cols } = lab.grid;
      assert.ok(expected.every(value => Number.isInteger(value) && value >= 0 && value < rows * cols), `${id}: grid mark out of range`);
      assert.equal(lab.grid.rowLabels.length, rows, `${id}: row labels are incomplete`);
      assert.equal(lab.grid.colLabels.length, cols, `${id}: column labels are incomplete`);
    }
    if (lab.mode === 'line') {
      const { maxWhole, denominator, start, end } = lab.line;
      const max = maxWhole * denominator;
      assert.ok(Number.isInteger(start) && start >= 0 && start <= max, `${id}: line start is out of range`);
      assert.ok(Number.isInteger(end) && end >= 0 && end <= max, `${id}: line end is out of range`);
      assert.ok(expected.every(value => Number.isInteger(value) && value >= 0 && value <= max), `${id}: line mark out of range`);
    }
    if (lab.mode === 'regions') {
      assert.equal(lab.regions.cells.length, 4, `${id}: mixed-area decomposition needs four regions`);
      assert.ok(expected.every(value => Number.isInteger(value) && value >= 0 && value < 4), `${id}: region mark out of range`);
    }
  });

  for (const group of groups) {
    assert.ok(labs.filter(lab => lab.group === group.id).length >= 2, `${group.id}: not enough cases`);
  }
  for (const groupId of ['add', 'multiply', 'divide']) {
    const cases = labs.filter(lab => lab.group === groupId);
    assert.ok(cases.some(lab => lab.mode === 'grid'), `${groupId}: missing shape drawing`);
    assert.ok(cases.some(lab => lab.mode === 'line'), `${groupId}: missing number-line drawing`);
  }
  for (let i = 0; i < levels.length; i += 1) assert.ok(labs.some(lab => lab.level === i), `island ${i + 1}: no drawing lab`);

  localStorage.clear();
  $('#studentName').value = 'آزمون رسم';
  clickSelector('#entryForm button[type="submit"]');
  assert.equal($('#map').hidden, false, 'map should be visible');

  const ranges = $$('.level-pages .page-range');
  assert.equal(ranges.length, 6, 'every island needs an isolated page range');
  assert.ok(ranges.every(node => node.getAttribute('dir') === 'ltr'), 'page ranges must be LTR');
  assert.equal(ranges[0].textContent, '۴۰–۴۵', 'first page range must read ۴۰–۴۵');
  assert.match($('.level-card[data-level="0"]').getAttribute('aria-label'), /۴۰ تا ۴۵/, 'spoken page range must be unambiguous');
  $('.coverage-panel').open = true;
  assert.equal($$('.coverage-list .page-range').length, 6, 'coverage rows need isolated page ranges');
  assert.match($('.coverage-intro').textContent, /تمرین تعاملی رسم و محور/, 'coverage should mention the drawing lab');

  clickSelector('#openDrawLab');
  assert.equal($('#lab').hidden, false, 'drawing lab did not open');
  assert.equal($('#map').hidden, true, 'map should be hidden while the lab is open');
  assert.equal($$('.lab-group-btn').length, 5, 'all operation groups should be visible');
  assert.equal($$('.lab-scenario-btn').length, labs.filter(lab => lab.group === 'represent').length, 'scenario list should match the active group');
  assert.match($('#labProgressPill').textContent, /۰ از/, 'lab progress should start at zero');
  const equationText = $('.lab-equation-line').textContent;
  assert.ok(!/[0-9۰-۹٠-٩]+\s*\/\s*[0-9۰-۹٠-٩]+/.test(equationText), `lab equation still shows slash fractions: ${equationText}`);
  assert.ok($('.lab-equation-line .lab-frac'), 'lab equation must use a stacked fraction bar');
  assert.ok($$('.lab-scenario-btn').every(button => !/[0-9۰-۹٠-٩]+\s*\/\s*[0-9۰-۹٠-٩]+/.test(button.textContent)), 'scenario titles still contain raw slash fractions');
  assert.ok($('.lab-idea') && $('.lab-step-head') && $('#labStepProgress'), 'step explanation header is missing');
  assert.match($('#labStepProgress').textContent, /گام ۱ از/, 'step progress should be readable');
  assert.ok($$('.lab-steps li strong').length >= 3 && $$('.lab-steps li p').length >= 3, 'steps must have a bold action and a plain explanation');

  const first = $('.lab-card').dataset.labId;
  assert.equal(first, 'units-strips', 'the lab should start with unit strips');
  assert.equal($$('[data-lab-cell]').length, 12, 'unit strips should have 12 cells');
  clickSelector('#labStep');
  assert.equal($$('.lab-steps li:not([hidden])').length, 2, 'stepper should reveal one more step');
  clickSelector('#labHint');
  assert.match($('#labFeedback').textContent, /دو ردیف کامل/, 'hint should be helpful');
  // A wrong check must be gentle and unlock the optional answer after two tries.
  click($('[data-lab-cell="0"]'));
  clickSelector('#labCheck');
  assert.match($('#labFeedback').textContent, /هنوز کامل نشده/, 'wrong drawing should not be accepted');
  assert.equal($('#labReveal').hidden, true, 'answer should not be exposed after the first mistake');
  clickSelector('#labCheck');
  assert.equal($('#labReveal').hidden, false, 'optional answer should appear after repeated tries');
  clickSelector('#labReset');

  solveCurrentLab();
  assert.match($('#labProgressPill').textContent, /۱ از/, 'first lab badge was not recorded');
  assert.ok($('#labSolution .lab-frac'), 'solution should use stacked fractions, not decimals');
  assert.ok(!/[0-9۰-۹٠-٩]+\s*\/\s*[0-9۰-۹٠-٩]+/.test($('#labSolution').textContent), 'solution still shows raw slash fractions');
  assert.equal($('#labCheck').disabled, true, 'check should be disabled after a solved lab');
  let rawProfile = '';
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('hakim_fasl2_profile_v1_')) rawProfile = localStorage.getItem(key) || '';
  }
  assert.match(rawProfile, /labDone/, 'lab badge should be persisted in the profile');
  assert.match(rawProfile, /labXp/, 'lab XP should be persisted in the profile');

  // Number-line case.
  click($('.lab-scenario-btn[data-lab-id="units-line"]'));
  assert.equal($$('[data-lab-tick]').length, 13, '0..3 with quarters should have 13 ticks');
  solveCurrentLab();
  assert.match($('#labProgressPill').textContent, /۲ از/, 'second lab badge was not recorded');

  // Multiplication area case.
  click($('.lab-group-btn[data-lab-group="multiply"]'));
  click($('.lab-scenario-btn[data-lab-id="mul-area"]'));
  solveCurrentLab();

  // Division measurement case on the number line.
  click($('.lab-group-btn[data-lab-group="divide"]'));
  click($('.lab-scenario-btn[data-lab-id="div-whole-frac"]'));
  solveCurrentLab();

  // Mixed-number decomposed area.
  click($('.lab-group-btn[data-lab-group="mixed"]'));
  click($('.lab-scenario-btn[data-lab-id="mixed-area"]'));
  solveCurrentLab();
  assert.match($('#labFeedback').textContent, /درست کشیدی/, 'mixed-area lab should be solvable');

  clickSelector('#labBack');
  assert.equal($('#map').hidden, false, 'back from map lab should return to the map');
  assert.match($('#openDrawLab').textContent, /۵ از/, 'map lab counter should reflect earned badges');

  // From a lesson, the lab should return to that same lesson.
  click($('.level-card[data-level="0"]'));
  assert.ok($('#revealWork'), 'lesson should be visible');
  assert.ok($('.lesson-label .page-range'), 'lesson page range must be isolated');
  assert.equal($('.lesson-label .page-range').getAttribute('dir'), 'ltr', 'lesson page range must be LTR');
  clickSelector('#openDrawLabFromLesson');
  assert.equal($('#lab').hidden, false, 'lesson lab button did not open the lab');
  assert.match($('.lab-header-copy').textContent, /پیشنهاد ویژه/, 'lesson lab should preselect that island');
  clickSelector('#labBack');
  assert.ok($('#revealWork'), 'back from lesson lab should return to the lesson');

  // Every island lesson must show a correct, isolated page range and a lab button.
  clickSelector('#backToMap');
  for (let i = 1; i < levels.length; i += 1) {
    click($(`.level-card[data-level="${i}"]`));
    assert.ok($('#revealWork'), `island ${i + 1}: lesson did not open`);
    const lessonRange = $(`.lesson-label .page-range`);
    assert.ok(lessonRange, `island ${i + 1}: lesson page range missing`);
    assert.equal(lessonRange.getAttribute('dir'), 'ltr', `island ${i + 1}: lesson page range is not LTR`);
    assert.equal(lessonRange.textContent, levels[i].bookPages, `island ${i + 1}: lesson page range text is wrong`);
    assert.ok($('#openDrawLabFromLesson'), `island ${i + 1}: lesson lab button missing`);
    clickSelector('#backToMap');
  }

  assert.equal(errors.length, 0, `unexpected jsdom errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ labs: labs.length, groups: groups.length, grid: labs.filter(l => l.mode === 'grid').length, line: labs.filter(l => l.mode === 'line').length, regions: labs.filter(l => l.mode === 'regions').length, solvedInTest: 5, pageRangesFixed: true, persisted: true, jsdomErrors: errors.length }, null, 2));
} finally {
  dom.window.close();
}
