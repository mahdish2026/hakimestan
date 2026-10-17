#!/usr/bin/env node
/**
 * test-a11y-pwa.mjs — راستی‌آزمایی سه اصلاح اخیر
 *
 *   ۱) نوار دسترس‌پذیری: در حالت بسته فقط یک دکمهٔ ♿
 *   ۲) کنتراست بالا: بدون سایهٔ پشت متن، با وزن قلم و زیرخط
 *   ۳) دکمهٔ نصب PWA: حذف دایرهٔ بنفش + بنر پیشنهاد نصب
 *   ۴) نسخهٔ کش Service Worker
 *
 * دو دستهٔ بررسی:
 *   • ایستا (regex روی css/a11y.css و js/hakim-sw-register.js و sw.js)
 *   • پویا (DOM واقعی با jsdom؛ در صورت نبود jsdom رد می‌شود)
 *
 * اجرا:
 *   npm i --no-save jsdom && node tools/test-a11y-pwa.mjs
 *   node tools/test-a11y-pwa.mjs --strict   ← نبودِ jsdom خطا شمرده شود
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STRICT = process.argv.includes('--strict');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/* ══════════════ ابزارهای CSS ══════════════ */

/** بدنهٔ یک قاعده با سلکتور دقیق (سلکتورهای داخل فهرست مثل «a, #x» را رد می‌کند) */
function cssRule(css, selector) {
  const needle = selector + ' {';
  let from = 0;
  for (;;) {
    const at = css.indexOf(needle, from);
    if (at === -1) return null;
    // کاراکتر غیرفاصلهٔ پیش از سلکتور اگر کاما باشد، عضو یک فهرست سلکتور است
    let i = at - 1;
    while (i >= 0 && /\s/.test(css[i])) i--;
    if (i < 0 || css[i] === '}' || css[i] === '/' || css[i] === '*') {
      const end = css.indexOf('}', at);
      return css.slice(at + needle.length, end);
    }
    from = at + needle.length;
  }
}

/** بدنهٔ یک @media/at-rule با تطبیق آکولاد */
function atRuleBody(css, header) {
  const at = css.indexOf(header);
  if (at === -1) return null;
  let i = css.indexOf('{', at);
  if (i === -1) return null;
  let depth = 0;
  const start = i + 1;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i);
    }
  }
  return null;
}

/* ══════════════ ۱) نوار دسترس‌پذیری ══════════════ */
async function testToolbar() {
  const css = await readFile(join(ROOT, 'css/a11y.css'), 'utf8');

  const base = cssRule(css, '#a11y-tools');
  ok('قاعدهٔ پایهٔ #a11y-tools پیدا شد', base !== null);
  ok('پایهٔ #a11y-tools → display:none', !!base && /display:\s*none\s*;/.test(base));
  ok('پایهٔ #a11y-tools دیگر display:flex ندارد', !!base && !/display:\s*flex/.test(base));

  const open = cssRule(css, '#a11y-toolbar.open #a11y-tools');
  ok('قاعدهٔ باز: #a11y-toolbar.open #a11y-tools { display:flex }', !!open && /display:\s*flex\s*;/.test(open));

  const hidden = cssRule(css, '#a11y-tools[hidden]');
  ok('#a11y-tools[hidden] { display:none !important }', !!hidden && /display:\s*none\s*!important/.test(hidden));

  // JS نباید تغییر کرده باشد: همان کلاس open و همان tools.hidden
  const js = await readFile(join(ROOT, 'js/hakim-a11y.js'), 'utf8');
  ok('JS: کلاس open روی نوار ست می‌شود', /classList\.toggle\('open'/.test(js));
  ok('JS: tools.hidden هنگام بستن ست می‌شود', /tools\.hidden\s*=\s*!open/.test(js));
}

/* ══════════════ ۲) کنتراست بالا ══════════════ */
async function testContrast() {
  const css = await readFile(join(ROOT, 'css/a11y.css'), 'utf8');

  const shadows = [...css.matchAll(/text-shadow\s*:([^;}]+)/g)].map((m) => m[1].trim());
  const withOffset = shadows.filter((v) => !/^none(\s*!important)?$/.test(v));
  ok('هیچ text-shadow سایه‌دار باقی نمانده', withOffset.length === 0, withOffset.join(' | '));
  ok('text-shadow: none در حالت کنتراست بالا هست', shadows.filter((v) => /^none\b/.test(v)).length >= 2);

  const hcAll = cssRule(css, 'html.hk-high-contrast *');
  ok('قاعدهٔ html.hk-high-contrast * ساخته شد', hcAll !== null);
  ok('  → font-weight: bolder !important', !!hcAll && /font-weight:\s*bolder\s*!important/.test(hcAll));
  ok('  → text-shadow: none !important', !!hcAll && /text-shadow:\s*none\s*!important/.test(hcAll));

  const hcA = cssRule(css, 'html.hk-high-contrast a');
  ok('html.hk-high-contrast a → text-decoration: underline !important',
    !!hcA && /text-decoration:\s*underline\s*!important/.test(hcA));

  const pc = atRuleBody(css, '@media (prefers-contrast: more)');
  ok('بلوک @media (prefers-contrast: more) پیدا شد', pc !== null);
  const star = pc ? cssRule(pc, '*') : null;
  ok('  → * { border-color: currentColor; font-weight: bolder; text-shadow: none }',
    !!star && /border-color:\s*currentColor/.test(star) &&
    /font-weight:\s*bolder/.test(star) && /text-shadow:\s*none/.test(star));

  // رنگ متن کنتراست: دو قانونِ متقابلاً انحصاری، بدون فهرست ثابت تم‌ها
  const hcWhite = css.match(/html\.hk-high-contrast:not\(\.hk-hc-light\) body,[^{]*\{([^}]*)\}/);
  const hcDark = css.match(/html\.hk-high-contrast\.hk-hc-light body,[^{]*\{([^}]*)\}/);
  ok('متن سفید فقط با html.hk-high-contrast:not(.hk-hc-light)', !!hcWhite && /color:\s*#ffffff\s*!important/.test(hcWhite[1]) && !/text-shadow/.test(hcWhite[1]));
  ok('متن تیرهٔ #10131c فقط با html.hk-high-contrast.hk-hc-light', !!hcDark && /color:\s*#10131c\s*!important/.test(hcDark[1]) && !/text-shadow/.test(hcDark[1]));
  ok('هیچ فهرست ثابت body[data-theme=…] برای کنتراست نمانده', !/hk-high-contrast[^{]*body\[data-theme=/.test(css));
}

/* ══════════════ ۳) دکمهٔ نصب PWA ══════════════ */
async function testInstallSource() {
  const js = await readFile(join(ROOT, 'js/hakim-sw-register.js'), 'utf8');

  ok('رشتهٔ hk-install-floating حذف شده', !js.includes('hk-install-floating'));
  ok('CSS موبایلِ «.hk-install-text{display:none» حذف شده', !js.includes('.hk-install-text{display:none'));
  ok('آرایهٔ hosts حذف شده', !/var hosts\s*=\s*\[/.test(js));
  ok('showInstallButton فقط جایگاه صریح را می‌گیرد', /querySelector\('\[data-pwa-install\]'\)/.test(js));
  ok('showInstallSuggestion ساخته شده', /function showInstallSuggestion\s*\(/.test(js));
  ok('showInstallSuggestion در API عمومی هست', /showInstallSuggestion:\s*showInstallSuggestion/.test(js));

  ok('بنر با شناسهٔ hk-install-banner', /hk-install-banner/.test(js));
  ok('متن بنر: «نصب حکیمستان روی این دستگاه»', js.includes('نصب حکیمستان روی این دستگاه'));
  ok('متن بنر: «مثل یک اپ واقعی — آفلاین، سریع و بدون فروشگاه»',
    js.includes('مثل یک اپ واقعی — آفلاین، سریع و بدون فروشگاه'));
  ok('دکمهٔ نصب: id=hk-ib-yes + «⬇️ نصب برنامه»', /yes\.id\s*=\s*'hk-ib-yes'/.test(js) && js.includes('⬇️ نصب برنامه'));
  ok('دکمهٔ بستن: id=hk-ib-no + aria-label «فعلاً نه»',
    /no\.id\s*=\s*'hk-ib-no'/.test(js) && /setAttribute\('aria-label',\s*'فعلاً نه'\)/.test(js));
  ok('تأخیر ۴ ثانیه', /SUGGEST_DELAY\s*=\s*4000/.test(js));
  ok('کلید localStorage: hakim.pwa.installDismissedAt', js.includes("'hakim.pwa.installDismissedAt'"));
  ok('مهلت هفت‌روزه برای ✕', /DISMISS_MS\s*=\s*7\s*\*\s*DAY_MS/.test(js));
  ok('مهلت یک‌روزه برای «نصب»', /rememberDismiss\(DAY_MS\)/.test(js));
  ok('appinstalled بنر را هم حذف می‌کند',
    /appinstalled[\s\S]{0,400}removeInstallSuggestion\(\)/.test(js));

  ok('استایل: پس‌زمینهٔ تیرهٔ #141033', js.includes('background:#141033'));
  ok('استایل: دکمهٔ طلایی #f5c76a', js.includes('background:#f5c76a'));
  ok('استایل: انیمیشن ورود از پایین', /@keyframes hk-ib-in\{from\{transform:translateY\(110%\)/.test(js));
  ok('استایل: env(safe-area-inset-bottom)', js.includes('env(safe-area-inset-bottom'));
  ok('استایل: در چاپ hidden', /@media print\{#hk-install-banner,\.hk-install-btn\{display:none!important\}\}/.test(js));
}

/* ══════════════ ۴) نسخهٔ Service Worker ══════════════ */
async function testVersion() {
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
  const m = sw.match(/const VERSION = '([^']+)'/);
  ok(`sw.js → VERSION = 'hakim-v1.3.8'`, !!m && m[1] === 'hakim-v1.3.8', m ? m[1] : 'یافت نشد');
  ok('نام کش‌ها از VERSION ساخته می‌شود', /\$\{VERSION\}-shell/.test(sw));
}

/* ══════════════ ۵) تست DOM با jsdom ══════════════ */
async function testDom() {
  let JSDOM;
  try {
    ({ JSDOM } = await import('jsdom'));
  } catch (e) {
    const msg = 'jsdom نصب نیست → تست DOM رد شد (npm i --no-save jsdom)';
    if (STRICT) ok(msg, false);
    else console.log(`  ⚠️  ${msg}`);
    return;
  }

  const src = (await readFile(join(ROOT, 'js/hakim-sw-register.js'), 'utf8'))
    .replace(/<\/script/gi, '<\\/script');

  const PAGE = '<!doctype html><html lang="fa"><head><title>ت</title></head><body>'
    + '<header class="topbar"><nav class="nav"><a href="/">خانه</a></nav></header>'
    + '<main><h1>حکیمستان</h1></main>'
    + '<script>' + src + '<\/script>'
    + '</body></html>';

  /** یک صفحهٔ jsdom آماده (SW جعلی) — اسکریپت مثل صفحهٔ واقعی داخل HTML اجرا می‌شود */
  async function boot() {
    const dom = new JSDOM(PAGE, {
      url: 'https://hakim.test/', runScripts: 'dangerously', pretendToBeVisual: true,
      beforeParse(window) {
        window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
        const reg = {
          scope: 'https://hakim.test/', waiting: null, installing: null,
          update: () => Promise.resolve(), addEventListener() {}
        };
        Object.defineProperty(window.navigator, 'serviceWorker', {
          value: {
            controller: null,
            register: () => Promise.resolve(reg),
            addEventListener() {},
            ready: Promise.resolve(reg)
          },
          configurable: true
        });
      }
    });
    // صبر تا اجرای init() روی DOMContentLoaded — مثل مرورگر واقعی
    await new Promise((resolve) => {
      if (dom.window.document.readyState === 'complete') return resolve();
      dom.window.addEventListener('load', resolve, { once: true });
      setTimeout(resolve, 2000);
    });
    await new Promise((r) => setTimeout(r, 10));
    return dom;
  }

  function promptEvent(window) {
    const ev = new window.Event('beforeinstallprompt', { cancelable: true });
    ev.prompted = 0;
    ev.prompt = () => { ev.prompted++; };
    ev.userChoice = Promise.resolve({ outcome: 'accepted' });
    return ev;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ‏A) جایگاه صریح [data-pwa-install] */
  {
    const dom = await boot();
    const { window } = dom;
    window.document.body.insertAdjacentHTML('beforeend', '<div id="slot" data-pwa-install></div>');
    window.HakimPWA.showInstallButton();

    const btn = window.document.querySelector('#slot #hk-install-btn');
    ok('A: دکمهٔ برچسب‌دار داخل جایگاه صریح نشست', !!btn);
    ok('A: در هدر/ناوبری هیچ دکمه‌ای تزریق نشد', window.document.querySelector('header #hk-install-btn') === null);
    ok('A: کلاس hk-install-floating ساخته نمی‌شود', !window.document.querySelector('.hk-install-floating'));
    ok('A: دکمه بدون بنر است', window.document.getElementById('hk-install-banner') === null);

    const css = window.document.getElementById('hk-install-style')?.textContent || '';
    ok('A: CSS تزریق‌شده بدون دایرهٔ ۵۰٪ و بدون مخفی‌کردن متن',
      !css.includes('.hk-install-text{display:none') && !css.includes('border-radius:50%'));
    dom.window.close();
  }

  /* ‏B) بنر پیشنهاد: ساخت، بستن با ✕ و نیامدن دوباره */
  {
    const dom = await boot();
    const { window } = dom;
    window.HakimPWA.showInstallSuggestion();

    const bar = window.document.getElementById('hk-install-banner');
    ok('B: بنر ساخته شد', !!bar);
    ok('B: متن اصلی بنر درست است', !!bar && bar.textContent.includes('نصب حکیمستان روی این دستگاه'));
    ok('B: زیرمتن بنر درست است', !!bar && bar.textContent.includes('مثل یک اپ واقعی — آفلاین، سریع و بدون فروشگاه'));
    const yes = window.document.getElementById('hk-ib-yes');
    const no = window.document.getElementById('hk-ib-no');
    ok('B: دکمهٔ نصب (hk-ib-yes) هست', !!yes && yes.textContent.includes('نصب برنامه'));
    ok('B: دکمهٔ بستن (hk-ib-no) با aria-label «فعلاً نه»',
      !!no && no.getAttribute('aria-label') === 'فعلاً نه' && no.textContent.trim() === '✕');
    ok('B: بنر در انتهای body است', !!bar && bar.parentNode === window.document.body);

    no.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    ok('B: با ✕ بنر بسته شد', window.document.getElementById('hk-install-banner') === null);

    const raw = window.localStorage.getItem('hakim.pwa.installDismissedAt');
    let rec = null;
    try { rec = JSON.parse(raw); } catch (e) {}
    ok('B: کلید hakim.pwa.installDismissedAt ذخیره شد', !!rec && typeof rec.t === 'number');
    ok('B: مهلت ذخیره‌شده هفت روز است', !!rec && rec.ms === 7 * 24 * 60 * 60 * 1000, rec ? String(rec.ms) : 'null');

    window.HakimPWA.showInstallSuggestion();
    ok('B: در مهلت هفت‌روزه دیگر نشان داده نمی‌شود', window.document.getElementById('hk-install-banner') === null);
    dom.window.close();
  }

  /* ‏C) تأخیر ۴ ثانیه + حذف بنر با appinstalled */
  {
    const dom = await boot();
    const { window } = dom;
    window.dispatchEvent(promptEvent(window));
    ok('C: بلافاصله پس از beforeinstallprompt بنری نیست', window.document.getElementById('hk-install-banner') === null);
    await wait(4300);
    ok('C: پس از ~۴ ثانیه بنر ظاهر شد', !!window.document.getElementById('hk-install-banner'));
    window.dispatchEvent(new window.Event('appinstalled'));
    ok('C: با appinstalled بنر حذف شد', window.document.getElementById('hk-install-banner') === null);
    dom.window.close();
  }

  /* ‏D) کلیک «نصب» → مهلت یک‌روزه + فراخوانی prompt */
  {
    const dom = await boot();
    const { window } = dom;
    const ev = promptEvent(window);
    window.dispatchEvent(ev);
    window.HakimPWA.showInstallSuggestion();

    const yes = window.document.getElementById('hk-ib-yes');
    yes.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(50);

    let rec = null;
    try { rec = JSON.parse(window.localStorage.getItem('hakim.pwa.installDismissedAt')); } catch (e) {}
    ok('D: پس از کلیک نصب، مهلت یک روز ذخیره شد', !!rec && rec.ms === 24 * 60 * 60 * 1000, rec ? String(rec.ms) : 'null');
    ok('D: پس از کلیک نصب، بنر بسته شد', window.document.getElementById('hk-install-banner') === null);
    ok('D: doInstall() فراخوانی شد (prompt)', ev.prompted === 1, String(ev.prompted));
    ok('D: پس از کلیک، در مهلت یک‌روزه دوباره نمی‌آید', (window.HakimPWA.showInstallSuggestion(), window.document.getElementById('hk-install-banner') === null));
    dom.window.close();
  }

  /* ‏E) صفحهٔ واقعی: هیچ دکمه‌ای در هدر تزریق نمی‌شود */
  {
    const dom = await boot();
    const { window } = dom;
    window.dispatchEvent(promptEvent(window));
    await wait(4300);
    ok('E: بدون جایگاه صریح، هدر صفحه دست‌نخورده می‌ماند',
      window.document.querySelector('header #hk-install-btn') === null);
    ok('E: به‌جایش بنر پیشنهاد آمده', !!window.document.getElementById('hk-install-banner'));
    dom.window.close();
  }
}

/* ══════════════ اجرا ══════════════ */
console.log('🧪 راستی‌آزمایی اصلاحات (نوار دسترس‌پذیری، کنتراست، بنر نصب)');

section('۱) نوار دسترس‌پذیری — css/a11y.css');
await testToolbar();

section('۲) کنتراست بالا بدون سایه — css/a11y.css');
await testContrast();

section('۳) دکمهٔ نصب PWA — js/hakim-sw-register.js');
await testInstallSource();

section('۴) نسخهٔ Service Worker — sw.js');
await testVersion();

section('۵) تست DOM واقعی (jsdom)');
await testDom();

console.log(`\n──────────────\nنتیجه: ${pass} موفق، ${fail} ناموفق`);
if (fail) {
  console.log('ناموفق‌ها:');
  failures.forEach((f) => console.log('  • ' + f));
}
process.exit(fail ? 1 : 0);
