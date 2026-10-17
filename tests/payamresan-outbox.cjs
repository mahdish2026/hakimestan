// پیام‌رسان: چرخهٔ ارسال پیام — تیک خوردن بعد از تأیید سرور + ناموفق شدن به‌جای ساعت بی‌نهایت
// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/payamresan-outbox.cjs
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch (e) { console.error('jsdom لازم است: npm install --no-save --package-lock=false jsdom@26'); process.exit(2); }
const fs = require('fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'payamresan.html'), 'utf8');

function makeWindow(scenario) {
  const store = { msgs: [] }; // fake Apps Script backend rows
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
      // Canvas stub (jsdom has no canvas)
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
          const body = JSON.parse(init.body);
          if (scenario === 'postLost') return Promise.reject(new TypeError('Failed to fetch')); // POST گم می‌شود، GET سالم است
          if (body.action === 'message') {
            store.msgs.push({ id: 'srv' + (store.msgs.length + 1), from_user: body.from_user, to_group: body.to_group, to_user: body.to_user, text: body.text, date: body.date });
          }
          return Promise.resolve({ ok: true, status: 200, type: 'basic', text: () => Promise.resolve('{"ok":true}'), json: () => Promise.resolve({ ok: true }) });
        }
        const action = u.searchParams.get('action');
        let payload = {};
        if (action === 'messages') payload = { messages: store.msgs.slice(-300), serverTime: new Date().toISOString() };
        else if (action === 'users') payload = { users: [{ username: 'تست', role: 'student' }, { username: 'خانم معلم', role: 'teacher' }] };
        else if (action === 'groups') payload = { groups: ['عمومی'] };
        else if (action === 'reads') payload = { reads: {} };
        else if (action === 'words') payload = { words: [] };
        else if (action === 'capabilities') payload = {};
        return Promise.resolve({ ok: true, status: 200, type: 'basic', json: () => Promise.resolve(payload), text: () => Promise.resolve(JSON.stringify(payload)) });
      };
    }
  });
  return { dom, store };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, timeout = 9000, step = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (fn()) return true; await sleep(step); }
  return fn();
}

(async () => {
  // ── سناریو ۱: ارسال موفق — پیام نباید روی ساعت بماند ──
  {
    const { dom, store } = makeWindow('ok');
    const w = dom.window, d = w.document;
    assert(await until(() => w.HK && w.HK.S.me === 'تست'), 'ورود با نشست ذخیره‌شده');
    assert(await until(() => d.querySelector('#page-chat.active')), 'صفحهٔ چت فعال شد');
    // باز کردن گفتگوی عمومی مثل کاربر (کلیک روی آیتم سایدبار) — اگر نبود، مستقیم:
    if (w.HK.App && w.HK.App.openChat) w.HK.App.openChat('group', 'عمومی');
    await sleep(300);
    d.querySelector('#msgInput').value = 'سلام تست یک دو سه';
    d.querySelector('#btnSend').click();
    assert(await until(() => d.querySelectorAll('#msgs .bubble.me').length >= 1), 'حباب پیام خودم ساخته شد');
    assert(await until(() => store.msgs.length === 1), 'پیام به سرور (جعلی) رسید');
    assert(await until(() => w.HK.S.outbox.length === 0), 'صف ارسال خالی شد');
    const okTick = await until(() => {
      const b = d.querySelector('#msgs .bubble.me'); if (!b) return false;
      const t = b.querySelector('.tick'); if (!t) return false;
      return t.classList.contains('sent') || t.classList.contains('delivered') || t.classList.contains('read') || !b.classList.contains('pending');
    }, 9000);
    assert(okTick, 'تیک ارسال نمایش داده شد (روی ساعت نماند)');
    const bubbleTxt = d.querySelector('#msgs .bubble.me .txt, #msgs .bubble.me').textContent;
    assert(!bubbleTxt.includes('hk1:'), 'متادیتای سیم در متن دیده نمی‌شود');
    console.log('scenario ok: PASS — tick =', d.querySelector('#msgs .bubble.me .tick')?.className, '| store msgs =', store.msgs.length);
    w.close();
  }

  // ── سناریو ۲: POST گم می‌شود — پیام نباید تا ابد ساعت نشان دهد ──
  {
    const { dom, store } = makeWindow('postLost');
    const w = dom.window, d = w.document;
    assert(await until(() => w.HK && w.HK.S.me === 'تست'), 'ورود');
    if (w.HK.App && w.HK.App.openChat) w.HK.App.openChat('group', 'عمومی');
    await sleep(300);
    d.querySelector('#msgInput').value = 'این پیام نباید گم شود';
    d.querySelector('#btnSend').click();
    assert(await until(() => w.HK.S.outbox.length === 1), 'پیام وارد صف شد');
    assert.strictEqual(w.HK.S.outbox[0].status !== 'failed', true);
    // چرخه‌های تلاش مجدد را با صفر کردن زمان انتظار جلو می‌اندازیم (مثل گذر زمان واقعی)
    for (let i = 0; i < 6; i++) {
      const it = w.HK.S.outbox[0]; if (!it) break;
      it.nextAt = 0; it.sentAt = 0;
      await w.HK.Outbox.flush();
      await sleep(150);
    }
    const it = w.HK.S.outbox[0];
    assert(it && it.status === 'failed', 'بعد از چند تلاش ناموفق، وضعیت failed شد (ساعت بی‌نهایت نداریم) — got: ' + (it && it.status));
    const bubble = d.querySelector('#msgs .bubble.me');
    assert(bubble && bubble.classList.contains('failed'), 'حباب حالت ناموفق گرفت');
    assert(bubble.textContent.includes('ارسال نشد'), 'دکمه/متن «ارسال نشد» برای تلاش دوباره دیده می‌شود');
    assert.strictEqual(store.msgs.length, 0, 'پیام واقعاً به سرور نرسیده (تیک دروغین نداریم)');
    console.log('scenario postLost: PASS — status=failed, retry visible');
    w.close();
  }

  // ── سناریو ۳: لایه‌های اصلاح در صفحه هستند ──
  {
    const { dom } = makeWindow('ok');
    const d = dom.window.document;
    assert(d.querySelector('#pr-fix-layer'), 'لایهٔ اصلاح CSS وجود دارد');
    assert(d.querySelector('#msgInput').getAttribute('placeholder') === 'پیامت رو بنویس…', 'پلیس‌هولدر کوتاه شد');
    assert(html.includes("body[data-page=\"chat\"] #a11y-toolbar"), 'قانون جای دکمهٔ دسترس‌پذیری بالای کادر ارسال هست');
    const a11ycss = fs.readFileSync(path.join(__dirname, '..', 'css', 'a11y.css'), 'utf8');
    assert(a11ycss.includes('--hk-composer-h'), 'a11y.css از ارتفاع واقعی کادر ارسال استفاده می‌کند');
    console.log('scenario layers: PASS');
    dom.window.close();
  }
  console.log('\nALL PASS'); process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
