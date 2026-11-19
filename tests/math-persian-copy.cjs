// Run: node tests/math-persian-copy.cjs (requires jsdom@26).
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const files = ['math-learning.html', ...fs.readdirSync('games').filter(f => /^math.*\.html$/.test(f)).map(f => `games/${f}`)];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(source);
  for (const script of dom.window.document.querySelectorAll('script:not([src])')) {
    if (!script.type || /javascript/.test(script.type)) new vm.Script(script.textContent, { filename: file });
  }
  // Compatibility correction keys are intentionally unspaced; actual copy is not.
  const copy = source.replace(/const PERSIAN_WORD_FIXES = \{[\s\S]*?\n    \};/, '');
  for (const typo of ['تازهترین', 'تکفایل', 'دوریدفه', 'گامبهگام', 'خانههای', 'بهعلاوهی', 'هممخرجکردن', 'توسعهدهنده', 'میفهمی', 'ماموریت']) {
    assert(!copy.includes(typo), `${file}: uncorrected copy: ${typo}`);
  }
  if (file === 'math-learning.html') {
    const cards = dom.window.document.querySelector('.games-grid').textContent;
    assert(!/تازه.?ترین|جدیدترین|آخرین نسخه|تازه!/.test(cards));
    assert(cards.includes('دربارهٔ کسرستان'));
    assert(cards.includes('دو ردیفه'));
  }
  dom.window.close();
}
const game = fs.readFileSync('games/math-fasl2.html', 'utf8');
const helper = game.slice(game.indexOf('    const PERSIAN_WORD_FIXES'), game.indexOf('    const HAS_PERSIAN'));
const spacing = vm.runInNewContext(helper + '\npersianSpacing;');
for (const word of ['زمانی', 'رنگین', 'واحدی', 'ردیفی', 'قسمتی', 'تمرینی', 'طلایی', 'بطری', 'خانه‌ای', 'می‌شود']) {
  assert.equal(spacing(word), word, `correct word must not be split: ${word}`);
}
for (const [input, expected] of [
  ['خانهها را گامبهگام میشماریم.', 'خانه‌ها را گام‌به‌گام می‌شماریم.'],
  ['میفهمی، جابهجایی، ادامهی درس', 'می‌فهمی، جابه‌جایی، ادامهٔ درس']
]) {
  assert.equal(spacing(input), expected);
  assert.equal(spacing(spacing(input)), expected, 'corrections must be idempotent');
}
console.log('PASS: six math pages parse; copy is corrected, descriptions are evergreen, spacing preserves valid words.');
