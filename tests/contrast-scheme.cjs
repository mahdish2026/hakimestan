// Run with: npm install --no-save --package-lock=false jsdom@26 && node tests/contrast-scheme.cjs
//
// تست «کنتراست هماهنگ با پس‌زمینه» (کلاس hk-hc-light روی <html>)
//   ۱) ایستا: css/a11y.css — دو قانون متقابلِ انحصاری، بدون فهرست ثابت تم‌ها
//   ۲) ایستا: js/hakim-a11y.js — چهار تابع دقیقاً مطابق مشخصات + نقاط فراخوانی
//   ۳) پویا (jsdom): سناریوهای پس‌زمینهٔ مات/شفاف، تعویض تم، خاموش‌کردن کنتراست
//
// نکتهٔ مهم دربارهٔ jsdom: آبشار (cascade) jsdom فقط ترتیب قانون‌ها را می‌فهمد و
// !important را نادیده می‌گیرد. در مرورگر واقعی قانون‌های !important کنتراست بر رنگ
// تم غلبه می‌کنند؛ برای همین a11y.css اینجا «بعد از» استایل تم گذاشته می‌شود تا
// jsdom هم همان نتیجهٔ مرورگر را بدهد (رنگ متن body در حالت کنتراست = رنگ کنتراست).
// بدون این، باگ «سنجیدن رنگ کنتراستِ خود» در تست دیده نمی‌شد.
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'css/a11y.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'js/hakim-a11y.js'), 'utf8');

let passed = 0;
function ok(name, cond, extra) {
  assert.ok(cond, name + (extra ? ' — ' + extra : ''));
  passed++;
  console.log('  ✅ ' + name);
}

/* ══════════════ ۱) ایستا: css/a11y.css ══════════════ */
console.log('۱) css/a11y.css');

const TARGETS = ['body', '.muted', 'small', 'figcaption', '.slogan', '.panel-group-label'];
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
/** همهٔ قانون‌های سطح‌بالا و داخل @media: { selectors: [...], body } */
function rules(source) {
  const out = [];
  const src = stripComments(source);
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const head = m[1].trim();
    if (head.startsWith('@')) continue;
    out.push({ selectors: head.split(',').map((s) => s.replace(/^[^]*?\{/, '').trim()).filter(Boolean), body: m[2] });
  }
  return out;
}
const all = rules(css);
const colorOf = (body) => {
  const m = body.match(/(?:^|[;\s])color\s*:\s*([^;]+)/);
  return m ? m[1].trim().toLowerCase() : null;
};
const contrastRules = all.filter((r) => r.selectors.some((s) => s.includes('hk-high-contrast')));

const white = contrastRules.filter((r) => colorOf(r.body) === '#ffffff !important');
const dark = contrastRules.filter((r) => colorOf(r.body) === '#10131c !important');
ok('دقیقاً یک قانون سفید (#ffffff) برای متن کنتراست', white.length === 1, String(white.length));
ok('دقیقاً یک قانون تیره (#10131c) برای متن کنتراست', dark.length === 1, String(dark.length));
ok('قانون سفید: همهٔ شش سلکتور با html.hk-high-contrast:not(.hk-hc-light)',
  white[0].selectors.length === 6 &&
  TARGETS.every((t, i) => white[0].selectors[i] === 'html.hk-high-contrast:not(.hk-hc-light) ' + t),
  white[0].selectors.join(' | '));
ok('قانون تیره: همهٔ شش سلکتور با html.hk-high-contrast.hk-hc-light',
  dark[0].selectors.length === 6 &&
  TARGETS.every((t, i) => dark[0].selectors[i] === 'html.hk-high-contrast.hk-hc-light ' + t),
  dark[0].selectors.join(' | '));
ok('هیچ قانون کنتراستِ دیگری color متن را عوض نمی‌کند (جز :focus-visible)',
  contrastRules.filter((r) => colorOf(r.body) && r !== white[0] && r !== dark[0])
    .every((r) => r.selectors.every((s) => /:focus-visible$/.test(s))));
ok('هیچ فهرست ثابت body[data-theme=…] برای کنتراست نمانده',
  !contrastRules.some((r) => r.selectors.some((s) => /\[data-theme/.test(s))) &&
  !/hk-high-contrast[^{]*\[data-theme/.test(stripComments(css)));
const star = all.find((r) => r.selectors.length === 1 && r.selectors[0] === 'html.hk-high-contrast *');
ok('html.hk-high-contrast * { font-weight: bolder !important; text-shadow: none !important } دست‌نخورده',
  !!star && /font-weight:\s*bolder\s*!important/.test(star.body) && /text-shadow:\s*none\s*!important/.test(star.body));
const link = all.find((r) => r.selectors.length === 1 && r.selectors[0] === 'html.hk-high-contrast a');
ok('html.hk-high-contrast a { text-decoration: underline !important } دست‌نخورده',
  !!link && /text-decoration:\s*underline\s*!important/.test(link.body));

/* ══════════════ ۲) ایستا: js/hakim-a11y.js ══════════════ */
console.log('۲) js/hakim-a11y.js');

const SPEC = {
  parseRgb: `function parseRgb(color) {
    var m = String(color).match(/rgba?\\(\\s*([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,\\s\\/]+([\\d.]+%?))?\\s*\\)/i);
    if (!m) return null;
    var a = m[4] === undefined ? 1 : (/%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a: a };
  }`,
  luminanceOf: `function luminanceOf(color) {
    var c = parseRgb(color);
    if (!c || c.a < 0.35) return null;
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }`,
  pageIsLight: `function pageIsLight() {
    try {
      var cs = getComputedStyle(document.body);
      var l = luminanceOf(cs.backgroundColor);
      if (l === null) l = luminanceOf(getComputedStyle(document.documentElement).backgroundColor);
      if (l !== null) return l > 0.5;
      /* پس‌زمینهٔ شفاف (مثل لابی که فقط گرادیان دارد): رنگ متن تم ملاک است؛
         متن روشن یعنی پس‌زمینه تیره */
      var t = luminanceOf(cs.color);
      if (t !== null) return t < 0.5;
      return true;
    } catch (e) { return true; }
  }`,
  updateContrastScheme: `function updateContrastScheme() {
    var root = document.documentElement;
    if (!prefs.contrast) { root.classList.remove('hk-hc-light'); return; }
    root.classList.toggle('hk-hc-light', pageIsLight());
  }`
};
/** متن کامل یک تابع با تطبیق آکولاد */
function fnSource(src, name) {
  const at = src.indexOf('function ' + name + '(');
  if (at === -1) return null;
  let i = src.indexOf('{', at), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(at, i + 1);
  }
  return null;
}
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
for (const name of Object.keys(SPEC)) {
  const count = js.split('function ' + name + '(').length - 1;
  ok(`تابع ${name} دقیقاً یک بار و مطابق مشخصات`, count === 1 && norm(fnSource(js, name)) === norm(SPEC[name]));
}
const applyPrefs = fnSource(js, 'applyPrefs');
ok('آخرین خط applyPrefs(): updateContrastScheme();', /updateContrastScheme\(\);\s*\}$/.test(applyPrefs));
const init = fnSource(js, 'init');
ok('init(): MutationObserver روی document.body با attributeFilter data-theme/class/style → updateContrastScheme() وقتی prefs.contrast',
  /new MutationObserver\(function \(\) \{ if \(prefs\.contrast\) (?:\{[^}]*)?updateContrastScheme\(\);(?:\s*\})? \}\)\s*\.observe\(document\.body, \{ attributes: true, attributeFilter: \['data-theme', 'class', 'style'\] \}\)/.test(init));
ok("init(): رویداد load → updateContrastScheme()",
  /addEventListener\('load', function \(\) \{[^}]*updateContrastScheme\(\);\s*\}\)/.test(init));

/* ══════════════ ۳) پویا: jsdom ══════════════ */
console.log('۳) jsdom (a11y.css واقعی بارگذاری می‌شود)');

const THEMES = `
  body[data-theme="light"]       { background-color: #f4f6ff; color: #202943; }
  body[data-theme="dark"]        { background-color: #111426; color: #f1ecff; }
  body[data-theme="glass-dark"]  { background-color: transparent; background-image: linear-gradient(#1b1035, #07040f); color: #f1ecff; }
  body[data-theme="glass-light"] { background-color: transparent; background-image: linear-gradient(#fff8ec, #fdeecd); color: #202943; }
`;
const EXPECT = { light: true, dark: false, 'glass-dark': false, 'glass-light': true };
const RGB = { '#10131c': 'rgb(16, 19, 28)', '#ffffff': 'rgb(255, 255, 255)' };

/** پنجرهٔ jsdom با ماژول واقعی؛ هنگام بستن، همهٔ MutationObserverها قطع می‌شوند */
function makeDom(html, contrastSaved) {
  const dom = new JSDOM(html, { url: 'https://hakim.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const observers = [];
  const Native = w.MutationObserver;
  w.MutationObserver = class extends Native { constructor(cb) { super(cb); observers.push(this); } };
  const close = w.close.bind(w);
  w.close = () => { observers.forEach((o) => o.disconnect()); close(); };
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  if (contrastSaved) w.localStorage.setItem('hakim.a11y.prefs.v1', JSON.stringify({ contrast: true, reduceMotion: false, textScale: 1 }));
  w.eval(js);
  if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return dom;
}
function boot(theme, contrastSaved) {
  return makeDom('<!doctype html><html lang="fa" dir="rtl"><head><title>ت</title>'
    + '<style id="theme">' + THEMES + '</style>'
    + '<style id="a11y">' + css + '</style>'          // آخر: معادل برتری !important در مرورگر
    + '</head><body data-theme="' + theme + '"><main><h1>حکیمستان</h1><p class="muted">متن کم‌رنگ</p></main></body></html>', contrastSaved);
}
const hasLight = (w) => w.document.documentElement.classList.contains('hk-hc-light');
const hasHC = (w) => w.document.documentElement.classList.contains('hk-high-contrast');
const bodyColor = (w) => w.getComputedStyle(w.document.body).color;
const flush = () => new Promise((r) => setTimeout(r, 0));   // میکروتسک MutationObserver
const clickContrast = (w) => {
  w.document.getElementById('a11y-fab').click();
  w.document.querySelector('#a11y-tools button[data-pref="contrast"]').click();
};

(async () => {
  /* الف) کنتراست با کلیک دکمه، روی هر تم (مسیر applyPrefs) */
  for (const theme of Object.keys(EXPECT)) {
    const dom = boot(theme); const w = dom.window;
    ok(`[${theme}] پیش از کنتراست: هیچ کلاسی نیست`, !hasHC(w) && !hasLight(w));
    clickContrast(w);
    const want = EXPECT[theme];
    ok(`[${theme}] کنتراست روشن → hk-hc-light ${want ? 'می‌نشیند' : 'نمی‌نشیند'}`, hasHC(w) && hasLight(w) === want,
      w.document.documentElement.className);
    ok(`[${theme}] رنگ متن body = ${want ? '#10131c' : '#ffffff'}`, bodyColor(w) === RGB[want ? '#10131c' : '#ffffff'], bodyColor(w));
    await flush();
    ok(`[${theme}] پس از میکروتسک‌ها هم پایدار می‌ماند`, hasLight(w) === want);
    clickContrast(w);
    ok(`[${theme}] خاموش‌کردن کنتراست → hk-hc-light حذف می‌شود`, !hasHC(w) && !hasLight(w));
    await flush();
    dom.window.close();
  }

  /* ب) کنتراست ذخیره‌شده + بارگذاری (مسیر init → applyPrefs) */
  for (const theme of Object.keys(EXPECT)) {
    const dom = boot(theme, true); const w = dom.window;
    ok(`[${theme}] بارگذاری با کنتراست ذخیره‌شده → hk-hc-light ${EXPECT[theme] ? 'هست' : 'نیست'}`,
      hasHC(w) && hasLight(w) === EXPECT[theme], w.document.documentElement.className);
    await flush();
    dom.window.close();
  }

  /* ج) تعویض تم با کنتراست روشن (مسیر MutationObserver) */
  {
    const dom = boot('dark'); const w = dom.window;
    clickContrast(w);
    const seq = ['glass-light', 'glass-dark', 'light', 'dark', 'glass-light', 'light', 'glass-dark', 'dark'];
    for (const theme of seq) {
      w.document.body.setAttribute('data-theme', theme);
      await flush();
      ok(`تعویض تم → ${theme}: hk-hc-light ${EXPECT[theme] ? 'می‌نشیند' : 'برداشته می‌شود'} و رنگ متن درست است`,
        hasLight(w) === EXPECT[theme] && bodyColor(w) === RGB[EXPECT[theme] ? '#10131c' : '#ffffff'],
        w.document.documentElement.className + ' / ' + bodyColor(w));
    }
    clickContrast(w);
    ok('خاموش‌کردن کنتراست پس از تعویض‌ها → کلاس حذف و رنگ تم برمی‌گردد',
      !hasHC(w) && !hasLight(w) && bodyColor(w) === 'rgb(241, 236, 255)', bodyColor(w));
    w.document.body.setAttribute('data-theme', 'light');
    await flush();
    ok('با کنتراست خاموش، تعویض تم کلاسی نمی‌گذارد', !hasLight(w));
    dom.window.close();
  }

  /* د) تم روی <html data-theme> (مثل واژه‌ستان/طرح درس) و تغییر class/style بدنه */
  {
    const themesOnRoot = THEMES.replace(/body\[data-theme=("[^"]+")\]/g, 'html[data-theme=$1] body');
    const dom = makeDom('<!doctype html><html data-theme="dark"><head><style>' + themesOnRoot + '</style><style>' + css
      + '</style></head><body><main><h1>ت</h1></main></body></html>');
    const w = dom.window;
    w.HakimA11y.toggleContrast();
    ok('تم تیره روی <html> → بدون hk-hc-light', hasHC(w) && !hasLight(w));
    w.document.documentElement.setAttribute('data-theme', 'glass-light');
    await flush();
    ok('تعویض data-theme روی <html> به تم روشن → hk-hc-light', hasLight(w), w.document.documentElement.className);
    w.document.documentElement.setAttribute('data-theme', 'dark');
    await flush();
    ok('و برگشت به تم تیره → حذف hk-hc-light', !hasLight(w));
    w.document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    await flush();
    ok('تغییر style بدنه به پس‌زمینهٔ روشن → hk-hc-light', hasLight(w));
    w.document.body.style.removeProperty('background-color');
    w.document.body.className = 'night';
    await flush();
    ok('تغییر class بدنه → باز ارزیابی (دوباره تیره)', !hasLight(w));
    dom.window.close();
  }

  console.log(`\nPASS: ${passed} بررسی — CSS انحصاری، توابع دقیق، مات/شفاف، بارگذاری، تعویض تم (body و html)، خاموش‌کردن`);
})().catch((error) => { console.error('\n❌', error.message); process.exit(1); });
