// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/math-school-cards.cjs
// Guards the integration of «کسرستان» into the math-school page and the
// detailed project description (معرفی تفصیلی), plus the offline cache wiring.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const parse = html => new JSDOM(html, { url: 'https://hakimistan.ir/' }).window.document;

// ---- 1) school page: five cards, one dedicated to کسرستان -----------------
const schoolSource = read('math-learning.html');
const school = parse(schoolSource);
const cards = [...school.querySelectorAll('main.games-grid > a.game-card')];
assert.equal(cards.length, 7, 'school page must show exactly seven game cards');
const hrefs = cards.map(card => card.getAttribute('href'));
assert.deepEqual(hrefs, [
  'games/math-learning-1.html',
  'games/math-time-mission.html',
  'games/math-olgoha.html',
  'games/math-fasl2.html',
  'games/math-nesbat.html',
  'games/math-geometry.html',
  'games/math-decimals.html'
], 'card order/links changed');
for (const href of hrefs) {
  assert.ok(fs.existsSync(path.join(root, href)), `broken card link: ${href}`);
}

const ks = cards[3];
assert.ok(ks.classList.contains('kasrestan-card'), 'کسرستان card has no dedicated class');
assert.equal(ks.getAttribute('data-game'), 'math-fasl2');
assert.match(ks.getAttribute('aria-label') || '', /کسرستان/);
// All games share the same content hierarchy, without privileged extra notes.
for (const card of cards) {
  assert.deepEqual([...card.children].map(el => el.className), ['card-top', 'card-tags', 'card-cta']);
  assert.equal(card.querySelectorAll('.card-desc').length, 1);
  assert.equal(card.querySelectorAll('p').length, 1, 'each card has one concise description');
  assert.equal(card.querySelector('.card-name').children.length, 0, 'titles should not have extra badges');
  const description = card.querySelector('.card-desc').textContent.trim();
  assert.ok(description.length >= 100 && description.length <= 200, 'keep descriptions concise and comparable');
}
assert.ok(ks.querySelector('.card-icon svg'), 'dedicated icon missing');
assert.ok(ks.querySelector('.card-cta'), 'dedicated CTA missing');
const tags = [...ks.querySelectorAll('.card-tags .tag')].map(t => t.textContent.trim());
assert.ok(tags.some(t => t.includes('۶ جزیره') && t.includes('۵۸ فعالیت')), 'activity tags missing');
assert.ok(tags.some(t => t.includes('پنل معلم')), 'teacher-panel tag missing');
assert.ok(ks.textContent.includes('پرسش'), 'card copy does not describe the questions');
assert.ok(ks.textContent.includes('گواهی'), 'card copy does not mention the certificate');
assert.ok(!ks.textContent.includes('گذرنامه'), 'old passport wording leaked into the card');
// The dedicated look must be real CSS, not just a class name.
assert.match(schoolSource, /\.kasrestan-card::before\s*\{/);
assert.doesNotMatch(schoolSource, /(?:kasrestan|nesbat)-(?:ribbon|note)/);
assert.match(schoolSource, /\.kasrestan-card \.card-icon\s*\{/);
assert.match(schoolSource, /body\[data-theme="night"\] \.kasrestan-card/, 'dark themes not covered');
assert.match(schoolSource, /هفت بازی/, 'subtitle/meta do not mention five games');

// ---- 2) detailed description page ---------------------------------------
const judgesSource = read('judges.html');
const judges = parse(judgesSource);
const kasrestanRows = [...judges.querySelectorAll('table tbody tr')]
  .filter(tr => tr.textContent.includes('کسرستان (مدرسه ریاضی)'));
assert.equal(kasrestanRows.length, 1, 'games table must list کسرستان once');
assert.match(kasrestanRows[0].textContent, /۶ جزیره/);
assert.match(kasrestanRows[0].textContent, /محتوای ثابت/);
const nesbatRows = [...judges.querySelectorAll('table tbody tr')]
  .filter(tr => tr.textContent.includes('نسبتستان (مدرسه ریاضی)'));
assert.equal(nesbatRows.length, 1, 'games table must list نسبتستان once');
assert.match(nesbatRows[0].textContent, /۵ سرزمین/);
assert.match(nesbatRows[0].textContent, /محتوای ثابت/);

const schoolSection = [...judges.querySelectorAll('section')]
  .find(sec => sec.textContent.includes('🧮 مدرسه ریاضی'));
assert.ok(schoolSection, 'math-school section is missing');
const features = [...schoolSection.querySelectorAll('.feature-list > li')];
assert.equal(features.length, 7, 'math-school section must list seven games');
assert.ok(features.some(li => li.textContent.includes('کسرستان')));
assert.ok(schoolSection.querySelector('.ks-spotlight'), 'dedicated spotlight block missing');
assert.ok(schoolSection.querySelector('.ks-chips'), 'feature chips missing');
assert.ok(schoolSection.querySelector('a[href="math-learning.html"]'), 'link to school page missing');
assert.ok(schoolSection.querySelector('a[href="games/math-fasl2.html"]'), 'link to game missing');
assert.match(judgesSource, /\.ks-spotlight\s*\{/);

// Stale, contradictory counts used to say ۱۳ / ۱۲ / ۱۳.
assert.match(judgesSource, /<strong>۱۷ بازی آموزشی<\/strong>/);
assert.match(judgesSource, /پلتفرمی کامل با ۱۷ بازی آموزشی/);
assert.match(judgesSource, /<span class="num">۱۷<\/span><span class="label">بازی تعاملی/);
assert.ok(!/۱۴ بازی آموزشی|۱۳ بازی آموزشی|۱۲ بازی آموزشی|<span class="num">۱۴<\/span>/.test(judgesSource),
  'stale game counts remain');

// ---- 3) lobby, cache, docs ----------------------------------------------
const lobby = parse(read('index.html'));
const schoolBento = [...lobby.querySelectorAll('a.bento-card')]
  .find(a => a.getAttribute('href') === 'math-learning.html');
assert.ok(schoolBento, 'lobby link to math school missing');
assert.match(schoolBento.textContent, /هفت بازی/);

const sw = read('sw.js');
assert.match(sw, /const VERSION = 'hakim-v1\.5\.58'/);
assert.match(sw, /'\.\/math-learning\.html'/);
assert.match(sw, /'\.\/judges\.html'/);
assert.match(sw, /'\.\/games\/math-fasl2\.html'/);
assert.match(sw, /'\.\/js\/hakim-read-aloud\.js'/);
for (const rel of ['games/math-learning-1.html', 'games/math-olgoha.html', 'games/math-nesbat.html']) {
  assert.ok(read(rel).includes('../js/hakim-read-aloud.js'), `${rel}: local read-aloud helper missing`);
}
assert.ok(read('js/hakim-read-aloud.js').includes('SpeechSynthesisUtterance'), 'read-aloud speech fallback missing');

const readme = read('README.md');
for (const rel of ['math-fasl2.html', 'math-learning-1.html', 'math-time-mission.html', 'math-olgoha.html']) {
  assert.ok(readme.includes('`' + rel + '`'), `README is missing ${rel}`);
}
assert.ok(readme.includes('math-learning.html'), 'README does not mention the school page');

// No new external dependency in the changed pages.
for (const rel of ['math-learning.html', 'judges.html', 'index.html']) {
  const html = read(rel);
  for (const url of html.match(/(?:src|href)="(https?:\/\/[^"]+)"/g) || []) {
    assert.ok(/drive\.google|script\.google|hakimistan\.ir|w3\.org/.test(url),
      `${rel}: unexpected external resource ${url}`);
  }
}

console.log(JSON.stringify({
  schoolCards: cards.length,
  dedicatedCard: 'kasrestan-card',
  cardLinksResolve: true,
  descriptionRowsForKasrestan: kasrestanRows.length,
  mathSchoolGamesListed: features.length,
  spotlight: true,
  gameCountsFixedTo: 17,
  cacheVersion: 'hakim-v1.5.58',
  schoolPagePrefetched: true,
  docsUpdated: true
}, null, 2));
