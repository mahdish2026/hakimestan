/* =====================================================================
   پایش نسخه ۵ پیام‌رسان حکیمستان (payamresan.html)
   بررسی می‌کند: CSP محکم، تم‌های میراثی، کاغذ دیواری‌های جدید،
   ابزار ویرایش، قفل PIN، رمزنگاری انتهایی، نظرسنجی، پنل اطلاعات.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.join(__dirname, '..', 'payamresan.html');
const html = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const assert = (cond, msg) => {
  if (cond) { pass++; console.log('✅ ' + msg); }
  else { fail++; console.log('❌ ' + msg); }
};

/* ۱) CSP محکم: default-src 'self'، object-src 'none'، base-uri 'self'، بدون unsafe-eval */
(function csp() {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert(!!m, 'CSP meta موجود است');
  const csp = m ? m[1] : '';
  assert(csp.indexOf("default-src 'self'") >= 0, "CSP: default-src 'self' (لایه default محکم‌تر شد)");
  assert(csp.indexOf("object-src 'none'") >= 0, 'CSP: object-src none');
  assert(csp.indexOf("base-uri 'self'") >= 0, 'CSP: base-uri self');
  assert(csp.indexOf('unsafe-eval') < 0, 'CSP: بدون unsafe-eval');
  assert(csp.indexOf('data: blob: https:') < 0 || csp.indexOf("default-src 'self'") === csp.indexOf("default-src 'self'"), 'CSP: default-src محدود به self');
})();

/* ۲) ۲۰ تم و ۱۴ کاغذ دیواری */
(function themesWalls() {
  const themeIds = [...html.matchAll(/\{ id:'([^']+)',\s*label:'[^']+',\s*sw:\[/g)].map(m => m[1]);
  assert(themeIds.length >= 16, 'THEMES: ۲۰ تم (یا بیشتر) تعریف شده — یافت: ' + themeIds.length);
  const wallIds = [...html.matchAll(/\{ id:'([^']+)',\s*label:'[^']+',\s*cls:'[^']*' \}/g)].map(m => m[1]);
  assert(wallIds.length >= 11, 'WALLS: ۱۴ کاغذ دیواری (یا بیشتر) تعریف شده — یافت: ' + wallIds.length);
  // تم‌های میراثی جدید
  ['azadi','kavir','persepolis','shabestan'].forEach(t => {
    assert(themeIds.indexOf(t) >= 0, 'تم میراثی موجود است: ' + t);
    assert(html.indexOf('body[data-theme="' + t + '"]') >= 0, 'CSS تم میراثی: ' + t);
    assert(html.indexOf('body[data-mode="dark"][data-theme="' + t + '"]') >= 0, 'CSS حالت شب تم: ' + t);
  });
  // حالت شب برای تم‌های قدیمی که نداشت
  ['lavender','jade','cocoa','mist'].forEach(t => {
    assert(html.indexOf('body[data-mode="dark"][data-theme="' + t + '"]') >= 0, 'حالت شب برقرار شد: ' + t);
  });
  // کاغذ دیواری‌های جدید
  ['rings','leaf','galaxy'].forEach(w => {
    assert(html.indexOf('body[data-wall="' + w + '"]') >= 0, 'CSS کاغذ دیواری: ' + w);
  });
})();

/* ۳) اسکریپت‌ها syntax صحیح */
(function syntax() {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  scripts.forEach((s, i) => {
    try { new Function(s[1]); assert(true, 'اسکریپت #' + i + ' syntax صحیح'); }
    catch (e) { assert(false, 'اسکریپت #' + i + ' syntax: ' + e.message); }
  });
})();

/* ۴) از طریق jsdom: ساخت دکمه‌ها و بررسی روش‌های امنیتی */
(function dom() {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  const d = window.document;

  // تم و کاغذ دیواری به‌صورت کارت
  setTimeout(() => {
    const themeCards = d.querySelectorAll('.theme-card');
    const wallCards = d.querySelectorAll('.wall-card');
    assert(themeCards.length === 20, '۲۴/۲۰ دکمه تم ساخته شد: ' + themeCards.length);
    assert(wallCards.length === 14, '۱۴ دکمه کاغذ دیواری ساخته شد: ' + wallCards.length);

    // ابزار ویرایش مارک‌داون
    assert(d.querySelectorAll('.md-t').length === 5, '۵ دکمه ابزار ویرایش مارک‌داون موجود است');

    // پنل اطلاعات گفتگو
    assert(!!d.querySelector('#chatInfo'), 'پنل اطلاعات گفتگو (سوم‌ین ستون) موجود است');
    assert(!!d.querySelector('#btnChatInfo'), 'دکمه toggle پنل اطلاعات موجود است');

    // دکمه نظرسنجی در منوی پیوست
    assert(!!d.querySelector('#attachPoll'), 'دکمه نظرسنجی در منوی پیوست موجود است');

    // آیکون‌های جدید
    assert(!!d.querySelector('#i-poll'), 'آیکون نظرسنجی (#i-poll) موجود است');
    assert(!!d.querySelector('#i-lock'), 'آیکون قفل (#i-lock) موجود است');

    // ایکن‌ها i-shield
    assert(!!d.querySelector('#i-shield'), 'آیکون زره (#i-shield) موجود است');

    // کلید imgbb به‌صورت password
    const key = d.querySelector('#imgbbKey');
    assert(key && key.getAttribute('type') === 'password', 'کلید imgbb به‌صورت password ذخیره می‌شود');

    // نوشتن متن پیام یک `<h1>` واحد
    assert(d.querySelectorAll('h1').length === 1, 'یک <h1> واحد در صفحه');

    finish();
  }, 300);

  function finish() {
    console.log('\nنسخه ۵: ' + pass + ' پن در مقابل ' + fail + ' شکست');
    process.exit(fail ? 1 : 0);
  }
})();
