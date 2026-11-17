const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cases = [
  ['hakim-goosh', 'bubble'],
  ['hakim-gosh', 'bubble'],
  ['hakim-incline', 'bubble-text'],
  ['hakim-pulley', 'bubble-text']
];

for (const [name, sourceId] of cases) {
  const html = fs.readFileSync(path.join(root, `games/lab2d-apps/${name}.html`), 'utf8');
  const controls = html.match(/<button\b[^>]*data-hk-read-aloud="#[^"]+"[^>]*>[\s\S]*?<\/button>/g) || [];
  assert.equal(controls.length, 1, `${name}: expected one user-initiated read-aloud control`);
  assert.match(controls[0], new RegExp(`data-hk-read-aloud="#${sourceId}"`), `${name}: control should read Hakim's current message`);
  assert.match(controls[0], /aria-controls="[^"]+"/);
  assert.match(controls[0], /aria-pressed="false"/);
  assert.match(controls[0], /aria-label="[^"]*صدای مرد فارسی دستگاه"/);
  assert.match(controls[0], /\shidden(?:\s|>)/, `${name}: hide the control unless a masculine Persian voice is available`);
  assert.match(html, new RegExp(`id="${sourceId}"`), `${name}: narration source must exist`);
  assert.match(html, /<script src="\.\.\/\.\.\/js\/hakim-read-aloud\.js" defer><\/script>/);
  assert.match(html, /hk-read-aloud[^}]*\[hidden\][^}]*display:none/, `${name}: hidden controls must stay hidden`);
}

console.log('Lab 2D narration: accessible, user-triggered male-Persian read-aloud controls are wired in all four apps.');
