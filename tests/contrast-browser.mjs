#!/usr/bin/env node
/**
 * contrast-browser.mjs — تست مرورگر واقعی برای «کنتراست هماهنگ با پس‌زمینه»
 *
 *   ۱) تم روشن («مدرن» مدرسهٔ ریاضی) + کنتراست → متن بدنه #10131c
 *   ۲) تم تاریک (لابی، شب عرفانی) + کنتراست → متن سفید
 *   ۳) با کنتراست روشن، تعویض تم «بلافاصله» (فریم بعد) رنگ متن کنتراست را عوض می‌کند
 *   ۴) تم‌های روشن لابی (پس‌زمینهٔ فقط‌گرادیان، شفاف) + کنتراست → متن تیره
 *   ۵) کنتراست ذخیره‌شده + بارگذاری مجدد (تم ذخیره‌شده هنگام پارس اعمال می‌شود)
 *   ۶) همهٔ صفحه‌ها: hk-hc-light = روشنایی واقعی خودِ صفحه (پیش از کنتراست)
 *
 * اجرا (Chrome/Chromium لازم است):
 *   npm i --no-save --package-lock=false puppeteer-core
 *   CHROME_PATH=/path/to/chrome node tests/contrast-browser.mjs
 * روی لینوکس بدون Chrome:  npm i --no-save --package-lock=false puppeteer-core @sparticuz/chromium
 *   (اگر libnss3 نصب نیست: LD_LIBRARY_PATH=/tmp/al2023/lib پس از اولین اجرا)
 */
import http from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONLY_FAST = process.argv.includes('--fast');

/* ── سرور ایستا (sw.js عمداً ۴۰۴ تا کش Service Worker در تست دخالت نکند) ── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/sw.js' || /\.(mp3|mp4|pdf)$/.test(p)) { res.writeHead(404); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT) || !(await stat(file)).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

/* ── مرورگر ── */
let executablePath = process.env.CHROME_PATH;
let args = ['--no-sandbox', '--disable-dev-shm-usage'];
if (!executablePath) {
  const { default: chromium } = await import('@sparticuz/chromium');
  executablePath = await chromium.executablePath();
  args = chromium.args.filter((a) => a !== '--single-process');
}
const browser = await puppeteer.launch({ executablePath, args, headless: true });

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
}

const DARK_TEXT = 'rgb(16, 19, 28)';    // #10131c
const WHITE = 'rgb(255, 255, 255)';

async function open(path, { theme, contrast } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument((theme, contrast) => {
    try {
      if (theme) localStorage.setItem('hakimestan_lobby_theme', theme);
      if (contrast) localStorage.setItem('hakim.a11y.prefs.v1', JSON.stringify({ contrast: true, reduceMotion: false, textScale: 1 }));
    } catch (e) {}
  }, theme, contrast);
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  return { page, ctx };
}
/** وضعیت در «فریم بعد» — همان چیزی که کاربر در نخستین رسم بعدی می‌بیند */
const nextFrame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
const state = (page) => page.evaluate(() => ({
  theme: document.body.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme'),
  hc: document.documentElement.classList.contains('hk-high-contrast'),
  light: document.documentElement.classList.contains('hk-hc-light'),
  color: getComputedStyle(document.body).color,
  leftovers: document.querySelectorAll('style[data-hk-contrast-probe]').length
}));
const clickContrast = (page) => page.evaluate(() => {
  document.getElementById('a11y-fab').click();
  document.querySelector('#a11y-tools button[data-pref="contrast"]').click();
});
const pickTheme = (page, id) => page.evaluate((id) => {
  document.getElementById('themeBtn').click();
  document.querySelector('.theme-opt[data-theme="' + id + '"]').click();
}, id);
const wait = (page, ms) => page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
const show = (s) => `${s.theme}: ${s.light ? 'hk-hc-light' : '—'} / ${s.color}`;

const LOBBY_LIGHT = ['sunny', 'sky', 'candy', 'shad', 'modern'];
const LOBBY_DARK = ['night', 'ocean', 'forest'];

/* ══════ ۱) تم روشن مدرسهٔ ریاضی + کنتراست ══════ */
console.log('\n۱) مدرسهٔ ریاضی، تم «مدرن» (روشن) + کنتراست');
{
  const { page, ctx } = await open('/math-learning.html', { theme: 'modern' });
  await clickContrast(page); await nextFrame(page);
  const s = await state(page);
  ok('hk-hc-light نشست و متن بدنه #10131c است', s.hc && s.light && s.color === DARK_TEXT, show(s));
  const title = await page.evaluate(() => getComputedStyle(document.querySelector('.page-title')).color);
  ok('تیتر صفحه (ارث از body) هم #10131c است', title === DARK_TEXT, title);
  await ctx.close();
}

/* ══════ ۲) تم تاریک لابی + کنتراست ══════ */
console.log('\n۲) لابی، تم «شب عرفانی» (تاریک) + کنتراست');
{
  const { page, ctx } = await open('/index.html', { theme: 'night' });
  await clickContrast(page); await nextFrame(page);
  const s = await state(page);
  ok('hk-hc-light نیست و متن بدنه سفید است', s.hc && !s.light && s.color === WHITE, show(s));
  await ctx.close();
}

/* ══════ ۳) تعویض تم با کنتراست روشن — بلافاصله ══════ */
console.log('\n۳) تعویض تم با کنتراست روشن (سنجش در فریم بعد، بدون صبر برای ترنزیشن)');
for (const [path, seq, light] of [
  ['/math-learning.html', ['modern', 'night', 'sunny', 'ocean', 'sky', 'forest', 'modern'], { modern: 1, sunny: 1, sky: 1 }],
  ['/index.html', ['night', 'sunny', 'ocean', 'modern', 'forest', 'sky', 'night'], { sunny: 1, modern: 1, sky: 1 }]
]) {
  const { page, ctx } = await open(path, { theme: seq[0] });
  await clickContrast(page); await nextFrame(page);
  for (const t of seq.slice(1)) {
    await pickTheme(page, t); await nextFrame(page);
    const s = await state(page);
    const want = !!light[t];
    ok(`${path} → ${t}: ${want ? 'متن تیره' : 'متن سفید'} در همان فریم`, s.light === want && s.color === (want ? DARK_TEXT : WHITE), show(s));
  }
  await wait(page, 900);
  const s = await state(page);
  ok(`${path}: پس از پایان ترنزیشن‌ها هم پایدار است`, s.light === !!light[seq[seq.length - 1]] && s.leftovers === 0, show(s));
  await ctx.close();
}

/* ══════ ۴) همهٔ تم‌های لابی (پس‌زمینهٔ شفاف/فقط گرادیان) ══════ */
console.log('\n۴) همهٔ تم‌های لابی + کنتراست (کلیک دکمه)');
for (const t of [...LOBBY_LIGHT, ...LOBBY_DARK]) {
  const { page, ctx } = await open('/index.html', { theme: t });
  await clickContrast(page); await nextFrame(page);
  const s = await state(page);
  const want = LOBBY_LIGHT.includes(t);
  ok(`لابی ${t}: ${want ? 'hk-hc-light + #10131c' : 'سفید'}`, s.light === want && s.color === (want ? DARK_TEXT : WHITE), show(s));
  await clickContrast(page); await nextFrame(page);
  const off = await state(page);
  ok(`لابی ${t}: خاموش‌کردن کنتراست → هر دو کلاس حذف`, !off.hc && !off.light, show(off));
  await ctx.close();
}

/* ══════ ۵) کنتراست ذخیره‌شده + بارگذاری ══════ */
console.log('\n۵) کنتراست ذخیره‌شده + بارگذاری مجدد');
for (const [path, t, want] of [
  ['/math-learning.html', 'modern', true], ['/math-learning.html', 'ocean', false], ['/math-learning.html', 'night', false],
  ['/math-learning.html', 'sunny', true], ['/index.html', 'sunny', true], ['/index.html', 'modern', true], ['/index.html', 'night', false]
]) {
  const { page, ctx } = await open(path, { theme: t, contrast: true });
  const s = await state(page);
  ok(`${path} (${t}) با کنتراست ذخیره‌شده → ${want ? 'متن تیره' : 'متن سفید'}`, s.hc && s.light === want && s.color === (want ? DARK_TEXT : WHITE), show(s));
  await ctx.close();
}

/* ══════ ۶) همهٔ صفحه‌ها: کلاس = روشنایی واقعی خودِ صفحه ══════ */
if (!ONLY_FAST) {
  console.log('\n۶) همهٔ صفحه‌ها: hk-hc-light با روشنایی خودِ صفحه (پیش از کنتراست) یکی است');
  const pages = [];
  for (const d of ['', 'games/', 'games/lab2d-apps/', 'panels/']) {
    for (const f of await readdir(join(ROOT, d))) if (f.endsWith('.html')) pages.push('/' + d + f);
  }
  for (const p of pages) {
    const { page, ctx } = await open(p);
    // روشنایی «واقعی»: همان منطق pageIsLight ولی پیش از روشن‌شدن کنتراست (رنگ‌های خودِ تم)
    const truth = await page.evaluate(() => {
      const lum = (c) => { const m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/i);
        if (!m) return null; const a = m[4] === undefined ? 1 : (/%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
        return a < 0.35 ? null : (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255; };
      const cs = getComputedStyle(document.body);
      let l = lum(cs.backgroundColor); if (l === null) l = lum(getComputedStyle(document.documentElement).backgroundColor);
      if (l !== null) return l > 0.5;
      const t = lum(cs.color); return t !== null ? t < 0.5 : true;
    });
    const hasBar = await page.evaluate(() => !!document.getElementById('a11y-fab'));
    if (!hasBar) { await page.evaluate(() => window.HakimA11y && window.HakimA11y.toggleContrast()); }
    else await clickContrast(page);
    await nextFrame(page);
    const s = await state(page);
    ok(`${p.padEnd(38)} ${truth ? 'روشن → متن تیره' : 'تیره → متن سفید'}`,
      s.hc && s.light === truth && s.color === (truth ? DARK_TEXT : WHITE) && s.leftovers === 0, show(s));
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\n──────────────\nنتیجه: ${pass} موفق، ${fail} ناموفق`);
if (fail) { console.log('ناموفق‌ها:'); failures.forEach((f) => console.log('  • ' + f)); }
process.exit(fail ? 1 : 0);
