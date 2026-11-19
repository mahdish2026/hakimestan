// Run: npm install --no-save --package-lock=false jsdom@26 && node tests/offline-page.cjs
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('offline.html', 'utf8');
for (const path of ['offline.html', 'games/not-cached.html']) {
  const dom = new JSDOM(html, {
    url: 'https://example.org/hakimestan/' + path,
    runScripts: 'dangerously',
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'serviceWorker', { value: { controller: { scriptURL: 'https://example.org/hakimestan/sw.js' } } });
      Object.defineProperty(w.navigator, 'onLine', { value: false, configurable: true });
    }
  });
  const w = dom.window, d = w.document;
  assert.equal(d.baseURI, 'https://example.org/hakimestan/');
  assert.equal(d.querySelector('.brand').href, 'https://example.org/hakimestan/index.html');
  assert(d.querySelector('.portrait svg[aria-label]'));
  assert(d.querySelector('.portrait svg path'));
  assert.equal(d.querySelector('.status').getAttribute('role'), 'status');
  assert(d.getElementById('statusText').textContent.includes('اینترنت قطع است'));
  Object.defineProperty(w.navigator, 'onLine', { value: true });
  w.dispatchEvent(new w.Event('online'));
  assert(d.getElementById('dot').classList.contains('on'));
  assert(d.getElementById('statusText').textContent.includes('شبکه در دسترس است'));
  d.getElementById('retry').disabled = true;
  w.dispatchEvent(new w.Event('pageshow'));
  assert.equal(d.getElementById('retry').disabled, false);
  // Every local SVG gradient reference resolves inside the self-contained portrait.
  for (const m of html.matchAll(/url\(#([^)]*)\)/g)) assert(d.getElementById(m[1]));
  dom.window.close();
}
const sw = fs.readFileSync('sw.js', 'utf8');
assert(sw.includes("'./assets/fonts/vazirmatn-100-900.woff2'"));
assert(fs.existsSync('assets/fonts/vazirmatn-100-900.woff2'));
assert(html.includes('prefers-reduced-motion'));
assert(html.includes('location.reload()'));
assert(!html.includes("fetch('./manifest.json'"));
console.log('Offline page: nested fallback paths, portrait, status, retry reset and font precache passed.');
