// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/pwa-a11y.cjs
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const pwa = fs.readFileSync('js/hakim-sw-register.js', 'utf8');
const a11y = fs.readFileSync('js/hakim-a11y.js', 'utf8');
const css = fs.readFileSync('css/a11y.css', 'utf8');
function page(html = '') {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { url: 'https://example.org/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const observers = [];
  const NativeObserver = w.MutationObserver;
  w.MutationObserver = class extends NativeObserver {
    constructor(callback) { super(callback); observers.push(this); }
  };
  const close = w.close.bind(w);
  w.close = () => { observers.forEach(observer => observer.disconnect()); close(); };
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.navigator.serviceWorker = { register: () => Promise.resolve({ addEventListener() {} }), addEventListener() {} };
  return dom;
}
(async () => {
  assert(!pwa.includes('hk-install-floating'));
  assert(!pwa.includes('.hk-install-text{display:none'));
  assert(pwa.includes("'header'"));
  assert([...css.matchAll(/text-shadow:([^;]+);/g)].every(m => /^none(?:\s*!important)?$/.test(m[1].trim())));
  assert(css.includes('font-weight: bolder !important'));
  assert(css.includes('text-decoration: underline !important'));
  assert(css.includes('html.hk-high-contrast.hk-hc-light body'));
  assert(!/hk-high-contrast body\[data-theme=/.test(css));
  let dom = page('<header></header>'); let w = dom.window;
  w.eval(pwa); w.HakimPWA.showInstallButton();
  assert(w.document.querySelector('header #hk-install-btn').textContent.includes('نصب برنامه'));
  w.HakimPWA.showInstallSuggestion();
  assert(!w.document.getElementById('hk-install-banner'));
  await new Promise(resolve => setTimeout(resolve, 10));
  dom.window.close();
  dom = page(); w = dom.window; w.eval(pwa);
  w.HakimPWA.showInstallSuggestion();
  w.document.getElementById('hk-ib-no').click();
  assert(!w.document.getElementById('hk-install-banner'));
  assert.equal(JSON.parse(w.localStorage.getItem('hakim.pwa.installDismissedAt')).ms, 7 * 86400000);
  w.HakimPWA.showInstallSuggestion();
  assert(!w.document.getElementById('hk-install-banner'));
  w.localStorage.clear();
  w.HakimPWA.showInstallSuggestion();
  w.dispatchEvent(new w.Event('DOMContentLoaded')); // init attaches appinstalled handler
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.dispatchEvent(new w.Event('appinstalled'));
  assert(!w.document.getElementById('hk-install-banner'));
  await new Promise(resolve => setTimeout(resolve, 10));
  dom.window.close();
  dom = page('<main>test</main>'); w = dom.window;
  w.document.body.style.backgroundColor = 'rgb(255,255,255)';
  w.eval(a11y);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.HakimA11y.toggleContrast();
  assert(w.document.documentElement.classList.contains('hk-hc-light'));
  w.document.body.style.backgroundColor = 'rgb(10,10,10)';
  await new Promise(resolve => setTimeout(resolve, 10));
  assert(!w.document.documentElement.classList.contains('hk-hc-light'));
  w.document.body.style.backgroundColor = 'rgb(250,250,250)';
  w.document.body.dataset.theme = 'modern';
  await new Promise(resolve => setTimeout(resolve, 10));
  assert(w.document.documentElement.classList.contains('hk-hc-light'));
  w.HakimA11y.toggleContrast();
  assert(!w.document.documentElement.classList.contains('hk-hc-light'));
  await new Promise(resolve => setTimeout(resolve, 10));
  dom.window.close();
  console.log('PASS: PWA hosts, labels, banner dismissal/storage, installation cleanup; contrast light/dark/theme/off; CSS guards');
})().catch(error => { console.error(error); process.exit(1); });
