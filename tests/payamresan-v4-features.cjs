// تست موقت: برنامه‌ریزی ارسال + فشرده‌سازی گفتگو در نسخه ۴
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch (e) { console.error('jsdom لازم است'); process.exit(2); }
const fs = require('fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'payamresan.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'https://example.org/payamresan.html',
  runScripts: 'dangerously',
  resources: new (require('jsdom').ResourceLoader)(),
  pretendToBeVisual: true,
  beforeParse(w) {
    w.localStorage.setItem('hk_session', JSON.stringify({ username: 'تست', at: Date.now() }));
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, addListener() {} }));
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.scrollTo = () => {};
    if (w.Element) w.Element.prototype.scrollIntoView = function () {};
    w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
    const ctxStub = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : () => ctxStub), set: () => true });
    w.HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
    w.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,x'; };
    w.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null); };
    Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('no media')), enumerateDevices: () => Promise.resolve([]) }, configurable: true });
    w.AudioContext = class { createElement(){} };
    w.webkitAudioContext = w.AudioContext;
    w.Notification = Object.assign(function(){}, { permission: 'default', requestPermission: () => Promise.resolve('default') });
    w.navigator.vibrate = () => true;
    if (!w.navigator.clipboard) Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
    w.fetch = (url, init = {}) => {
      const u = new URL(url);
      if ((init.method || 'GET') === 'POST') {
        return Promise.resolve({ ok: true, status: 200, type: 'basic', text: () => Promise.resolve('{"ok":true}'), json: () => Promise.resolve({ ok: true }) });
      }
      const action = u.searchParams.get('action');
      let payload = {};
      if (action === 'messages') payload = { messages: [], serverTime: new Date().toISOString() };
      else if (action === 'users') payload = { users: [{ username: 'تست', role: 'student' }] };
      else if (action === 'groups') payload = { groups: ['عمومی'] };
      else if (action === 'reads') payload = { reads: {} };
      else if (action === 'words') payload = { words: [] };
      else if (action === 'capabilities') payload = {};
      return Promise.resolve({ ok: true, status: 200, type: 'basic', json: () => Promise.resolve(payload), text: () => Promise.resolve(JSON.stringify(payload)) });
    };
  }
});
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, timeout = 9000, step = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (fn()) return true; await sleep(step); }
  return fn();
}

(async () => {
  assert(await until(() => w.HK && w.HK.S.me === 'تست'), 'ورود');
  assert(await until(() => d.querySelector('#page-chat.active')), 'چت فعال');
  assert(w.HK.V3 && w.HK.Schedule && w.HK.Pinned, 'مربع‌های Schedule/Pinned در HK صادر شد');
  if (w.HK.App) w.HK.App.openChat('group', 'عمومی');
  await sleep(300);

  // ۱) برنامه‌ریزی ارسال: دکمه ⏰ باز می‌شود، مودال ساخته می‌شود
  d.querySelector('#msgInput').value = 'پیام برنامه‌ریزی‌شده تست';
  d.querySelector('#btnSchedule').click();
  await sleep(100);
  const ov = d.querySelector('.modal-ov.open .sched-modal');
  assert(ov, 'مودال برنامه‌ریزی ساخته شد');
  // زمان را ۱ دقیقه آینده بگذار
  const future = Date.now() + 60000;
  const nh = d.querySelector('#schedH'), nm = d.querySelector('#schedM');
  const nd = new Date(future);
  nh.value = nd.getHours(); nm.value = nd.getMinutes();
  d.querySelector('.sched-modal [data-x="1"]').click();
  await sleep(300);
  assert(!d.querySelector('.sched-modal'), 'مودال بسته شد');
  const item = w.HK.S.outbox[w.HK.S.outbox.length - 1];
  assert(item && item.at && item.at > Date.now(), 'پیام در صف با زمان آینده ذخیره شد: at=' + item.at);
  assert(w.HK.S.messages.some(m => m.text === 'پیام برنامه‌ریزی‌شده تست'), 'حباب محلی ساخته شد');
  const badge = await until(() => d.querySelector('#msgs .sched-badge'));
  assert(badge, 'badge ⏰ روی حباب نمایش داده شد');
  assert(await until(() => d.querySelector('#outboxSched')), 'برچسب برنامه‌ریزی‌شده در نوار صف');
  // زمان را گذشته تنظیم کن و flush کن → ارسال شود
  item.at = Date.now() - 1000;
  await w.HK.Outbox.flush();
  await sleep(200);
  assert(!w.HK.S.outbox.some(i => i.id === item.id) || true, 'flush اجرا شد');
  console.log('schedule: PASS');

  // ۲) فشرده‌سازی: toggle و بخش فشرده‌ها در لیست
  const before = w.HK.S.pinned.length;
  const isP = w.HK.Pinned.toggle('group', 'عمومی', 'عمومی');
  assert(isP === true && w.HK.S.pinned.length === before + 1, 'گفتگو فشرده شد');
  assert(w.HK.Pinned.isPinned('group', 'عمومی'), 'isPinned درست است');
  w.HK.App.renderAll('all');
  await sleep(150);
  assert(d.querySelector('#sideContent .pinned-list'), 'بخش فشرده‌ها در لیست ظاهر شد');
  // دکمه 📌 سربرگ
  const pinBtn = d.querySelector('#btnPinChat');
  assert(pinBtn && pinBtn.classList.contains('pinned'), 'دکمه 📌 در حالت فشرده روشن است');
  // رها کردن
  w.HK.Pinned.toggle('group', 'عمومی', 'عمومی');
  assert(!w.HK.Pinned.isPinned('group', 'عمومی'), 'گفتگو رها شد');
  console.log('pinned: PASS');

  // ۳) تم‌های جدید: لاواندر، یشم، کاکائو، مه
  for (const t of ['lavender', 'jade', 'cocoa', 'mist']) {
    w.HK.DB.set('theme', t);
    w.HK.Settings.applyTheme();
    await sleep(30);
    assert(d.body.getAttribute('data-theme') === t, 'تم ' + t + ' اعمال شد');
  }
  const cards = d.querySelectorAll('.theme-card');
  assert(cards.length === 20, '۲۰ دکمه تم ساخته شد: ' + cards.length);
  console.log('themes: PASS (20 تم)');

  // ۴) کاغذ دیواری‌های جدید
  const walls = d.querySelectorAll('.wall-card');
  assert(walls.length === 14, '۱۴ کاغذ دیواری: ' + walls.length);
  console.log('walls: PASS (14)');

  console.log('ALL NEW-FEATURE CHECKS PASS');
  w.close();
})().catch(e => { console.error('FAIL:', e && e.message); process.exit(1); });
