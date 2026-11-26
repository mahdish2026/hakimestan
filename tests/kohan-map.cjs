// Offline regression checks for the conquest atlas.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
let html = fs.readFileSync('games/kohan-diyar.html', 'utf8');
const core = fs.readFileSync('hakim-core.js', 'utf8');
assert.match(fs.readFileSync('sw.js','utf8'), /\.\/games\/kohan-diyar\/atlas\.css/);
assert.match(html, /ازبکستان امروزی/);
html = html.replace('<script src="../hakim-core.js"></script>', `<script>${core}</script>`);
// The test hook executes in the same script scope as the game without changing production APIs.
html = html.replace('// بستن مودال با کلیک روی پس‌زمینه یا کلید Escape', `
window.__atlasTest = {
  data: () => ({provinces: PROVINCE_INFO, cityCount: CITIES.length, samarkandProvinces: PROVINCE_IDS[4]}),
  seed: () => { state = {hearts:3,currentQ:4,currentCity:1,conqueredCities:[0,1],badges:[{city:0},{city:1}],conquestRecords:{0:{score:10,at:1700000000000}}}; },
  open: openMapModal, close: closeMapModal,
  city: showCityCard,
  zoom: atlasZoom,
  view: () => atlasView,
  province: showProvincePopup
};
// بستن مودال با کلیک روی پس‌زمینه یا کلید Escape`);
const errors = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(e.message); });
const dom = new JSDOM(html, {url:'https://hakimestan.ir/games/kohan-diyar.html', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc, beforeParse(w) {
  w.localStorage.setItem('hk_no_stats','1');
  w.matchMedia = () => ({matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo = () => {}; w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {};
}});
const w = dom.window, doc = w.document, api = w.__atlasTest;
assert.ok(api, 'game script and atlas hook initialized');
const data = api.data();
assert.equal(Object.keys(data.provinces).length,31);
assert.equal(data.cityCount,6);
assert.equal(data.samarkandProvinces.length,0);
for (const info of Object.values(data.provinces)) for (const key of ['name','center','historicalCity','era','landmarks','famous','souvenir','didYouKnow']) assert.ok(info[key], `${info.name}: ${key}`);
api.seed(); api.open();
assert.ok(doc.querySelector('#mapModalOverlay').classList.contains('show'));
assert.equal(doc.querySelectorAll('#modalMapContainer path.conquered-province').length,2);
assert.equal(doc.querySelectorAll('#atlasTimeline li').length,2);
assert.equal(doc.querySelectorAll('#modalCityMarkers .city-marker').length,5);
assert.ok(doc.querySelector('.atlas-route polyline'));
api.zoom(1.25); assert.equal(api.view().scale,1.25);
api.city(4,doc.querySelector('#modalMapContainer'));
assert.match(doc.querySelector('#provincePopup').textContent,/ازبکستان/);
assert.match(doc.querySelector('#provincePopup').textContent,/ثبت نشده|در انتظار فتح/);
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(doc.querySelector('#provincePopup'),null);
assert.ok(doc.querySelector('#mapModalOverlay').classList.contains('show'));
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.ok(!doc.querySelector('#mapModalOverlay').classList.contains('show'));
assert.deepEqual(errors,[]);
dom.window.close();
console.log('Kohan conquest atlas: 31 provinces, 6 stages, offline data and interactions OK');
