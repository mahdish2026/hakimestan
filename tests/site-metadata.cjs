// Offline checks for public discovery and install metadata. Run with jsdom@26.
const {JSDOM} = require('jsdom');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const site = new URL('https://hakimistan.ir/');
function local(ref) {
  const u = new URL(ref,site);
  assert.equal(u.origin,site.origin);
  assert.ok(fs.statSync(path.join(root,u.pathname==='/'?'index.html':u.pathname)).isFile(),ref);
  return u.pathname;
}
const manifest = JSON.parse(read('manifest.json'));
for (const entry of [...manifest.icons,...manifest.screenshots,...manifest.shortcuts.flatMap(s=>s.icons)]) local(entry.src);
for (const entry of manifest.shortcuts) local(entry.url);
local(manifest.start_url);
const xml = new JSDOM(read('sitemap.xml'),{contentType:'text/xml'}).window.document;
const routes = [...xml.querySelectorAll('url > loc')].map(el=>local(el.textContent.trim()));
assert.equal(new Set(routes).size,routes.length);
assert.ok(read('robots.txt').includes('Sitemap: '+site+'sitemap.xml'));
for (const a of new JSDOM(read('math-learning.html')).window.document.querySelectorAll('.games-grid > a')) assert.ok(routes.includes(local(a.getAttribute('href'))));
console.log(`PASS: ${routes.length} sitemap entries, ${manifest.shortcuts.length} PWA shortcuts and local install assets`);
