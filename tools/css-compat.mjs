#!/usr/bin/env node
/**
 * css-compat.mjs — سازگاری CSS با مرورگرهای قدیمی‌تر
 *
 * دو کار انجام می‌دهد:
 *
 *  ۱) پیشوند -webkit- برای backdrop-filter و filter
 *     (Safari تا نسخهٔ ۱۸ فقط با پیشوند کار می‌کند — برای iOS حیاتی است)
 *
 *  ۲) فالبک برای color-mix()
 *     اگر مرورگر color-mix را نشناسد، اعلان را کامل دور می‌ریزد؛
 *     یعنی پس‌زمینه یا رنگ متن از دست می‌رود. با افزودن یک اعلان
 *     ساده پیش از آن، مرورگر قدیمی رنگ تخمینی می‌گیرد و مرورگر نو
 *     همچنان از color-mix استفاده می‌کند.
 *
 * ⚠ هشدار حیاتی:
 *   برخی صفحه‌ها داخل <script> خود رشتهٔ «<style>» و «</style>» دارند
 *   (قالب Word و HTML برای خروجی گرفتن). اگر محتوای <script> را مثل CSS
 *   پردازش کنیم، کد جاوااسکریپت آسیب می‌بیند (مثلاً `for(;;)` به `for()` تبدیل می‌شود).
 *
 *   بنابراین این ابزار <script>…</script> را کامل کنار می‌گذارد
 *   و فقط <style>های واقعی را ویرایش می‌کند.
 *
 * idempotent است. اجرا: node tools/css-compat.mjs [--dry]
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');

/* ══════════════ ابزار رنگ ══════════════ */

function parseColor(v) {
  if (!v) return null;
  let s = String(v).trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (s === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean);
    if (p.length < 3) return null;
    const byte = (x) => x.endsWith('%') ? Math.round(parseFloat(x) * 2.55) : parseFloat(x);
    return {
      r: byte(p[0]), g: byte(p[1]), b: byte(p[2]),
      a: p[3] !== undefined ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1
    };
  }
  if (s === 'currentcolor' || s === 'inherit' || s === 'initial' || s === 'unset') return null;
  return null;
}

/** هم‌آمیزی دو رنگ در فضای sRGB */
function mix(c1, c2, weight1, weight2) {
  const total = weight1 + weight2 || 1;
  const w1 = weight1 / total, w2 = weight2 / total;
  // پیش‌ضرب آلفا
  const a = c1.a * w1 + c2.a * w2;
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const r = (c1.r * c1.a * w1 + c2.r * c2.a * w2) / a;
  const g = (c1.g * c1.a * w1 + c2.g * c2.a * w2) / a;
  const b = (c1.b * c1.a * w1 + c2.b * c2.a * w2) / a;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

function toCss(c) {
  if (!c) return null;
  if (c.a >= 1) {
    return '#' + [c.r, c.g, c.b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
  }
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${+c.a.toFixed(3)})`;
}

/* ══════════════ تحلیل و بازنویسی ══════════════ */

/** استخراج متغیرهای CSS برای حل var() داخل color-mix */
function collectVars(css) {
  const vars = {};
  const re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = re.exec(css))) vars[m[1]] = m[2].trim();
  return vars;
}

/** حل var() تا دو سطح */
function resolveVars(value, vars, depth = 0) {
  if (depth > 3 || !value) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name, fb) => {
    const v = vars[name] !== undefined ? vars[name] : (fb || '');
    return resolveVars(v, vars, depth + 1);
  });
}

/**
 * محاسبهٔ نتیجهٔ یک color-mix برای استفاده به‌عنوان فالبک.
 * اگر قابل‌محاسبه نباشد، null برمی‌گرداند.
 */
function computeColorMix(mixBody, vars) {
  // الگو: in <space>, <color> [<pct>], <color> [<pct>]
  const m = mixBody.match(/^\s*in\s+([\w-]+)\s*,\s*(.+)$/i);
  if (!m) return null;
  const space = m[1].toLowerCase();
  const rest = m[2];

  // جداکردن دو رنگ در سطح بالا (با احتساب پرانتزها)
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of rest) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  if (parts.length !== 2) return null;

  const parsePart = (p) => {
    const t = resolveVars(p.trim(), vars).trim();
    const pm = t.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    const colorText = (pm[1] || '').trim();
    const pct = pm[2] !== undefined ? parseFloat(pm[2]) : null;
    return { color: parseColor(colorText), pct, raw: colorText };
  };

  const A = parsePart(parts[0]);
  const B = parsePart(parts[1]);
  if (!A.color || !B.color) return null;

  // درصدها: اگر یکی داده نشده، مکمل دیگری است
  let pa = A.pct, pb = B.pct;
  if (pa === null && pb === null) { pa = 50; pb = 50; }
  else if (pa === null) pa = 100 - pb;
  else if (pb === null) pb = 100 - pa;

  // در فضای oklab، تخمین sRGB خطای قابل‌توجه دارد؛
  // برای فالبک، میانگین ساده بده و روی نتیجه برچسب «تخمینی» بگذار
  if (space.startsWith('ok')) {
    const simple = {
      r: (A.color.r * pa + B.color.r * pb) / 100,
      g: (A.color.g * pa + B.color.g * pb) / 100,
      b: (A.color.b * pa + B.color.b * pb) / 100,
      a: (A.color.a * pa + B.color.a * pb) / 100
    };
    return { css: toCss(simple), approximate: true };
  }

  return { css: toCss(mix(A.color, B.color, pa, pb)), approximate: false };
}

/* ══════════════ پردازش ══════════════ */

async function htmlAndCssFiles(dir = ROOT, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tools', 'assets', 'books', 'videos', 'icons', 'screenshots'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlAndCssFiles(full, acc);
    else if (e.name.endsWith('.html') || e.name.endsWith('.css')) acc.push(full);
  }
  return acc;
}

/**
 * هر color-mix(...) در مقدار را با رنگ محاسبه‌شده‌اش جایگزین می‌کند.
 * اگر حتی یکی قابل‌محاسبه نباشد، null برمی‌گرداند (یعنی فالبک نساز).
 *
 * مزیت این روش نسبت به «حدس رنگ پایه»: برای گرادیان، سایه و حاشیه
 * یکسان کار می‌کند و شکل اصلی طرح حفظ می‌شود.
 */
function replaceColorMix(value, vars) {
  let result = '';
  let i = 0;
  let found = 0;
  const src = value;

  while (i < src.length) {
    const start = src.toLowerCase().indexOf('color-mix(', i);
    if (start === -1) { result += src.slice(i); break; }
    result += src.slice(i, start);

    // پیدا کردن پرانتز بستهٔ متناظر
    let depth = 0, j = start + 'color-mix('.length - 1;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) break; }
    }
    if (j >= src.length) return null; // پرانتز نامتوازن

    const inner = src.slice(start + 'color-mix('.length, j);
    const computed = computeColorMix(inner, vars);
    if (!computed || !computed.css) return null;

    result += computed.css;
    found++;
    i = j + 1;
  }

  return found > 0 ? result : null;
}

/**
 * رنگ پایهٔ مات را از یک مقدار گرادیان بیرون می‌کشد.
 * در `background: radial-gradient(...), var(--bg)` آخرین لایه رنگ پایه است.
 * اگر همهٔ لایه‌ها گرادیان باشند، از متغیرهای شناخته‌شده کمک می‌گیرد.
 */
function findGradientBase(value, vars) {
  const resolved = resolveVars(value, vars);
  // لایه‌ها را با کاما در سطح بالا جدا کن
  const layers = [];
  let depth = 0, cur = '';
  for (const ch of resolved) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { layers.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) layers.push(cur.trim());

  // ۱) آخرین لایه‌ای که گرادیان نیست و رنگ معتبر است
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (/gradient|url\(|none|image-set/i.test(l)) continue;
    const c = parseColor(l.trim());
    if (c) return toCss(c);
  }

  // ۲) آخرین رنگ مات داخل خود گرادیان‌ها (مثلاً انتهای radial-gradient)
  const stops = [];
  const re = /(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black|transparent)\b)/gi;
  let m;
  while ((m = re.exec(resolved))) {
    const c = parseColor(m[1]);
    if (c && c.a >= 1) stops.push(c);   // فقط رنگ‌های کاملاً مات
  }
  if (stops.length) return toCss(stops[stops.length - 1]);

  return null;
}

/**
 * ۱) یکسان‌سازی backdrop-filter
 *
 * با همان پیمایشگر خطیِ color-mix کار می‌کند: هر اعلان را می‌بیند و
 * فقط اگر اعلان قبلی در همان قاعده پیشوند -webkit- نبود، آن را اضافه می‌کند.
 * اعلان‌های تکراری پشت‌سرهم هم جمع می‌شوند.
 *
 * کاملاً idempotent: اجرای دوباره هیچ تغییری نمی‌دهد.
 * پیشوندهای داخل @supports (شرط پشتیبانی) دست‌نخورده می‌مانند.
 */
function addWebkitPrefixes(css) {
  let count = 0;
  const parts = css.split(/([{};])/);

  let prev = null;      // آخرین اعلانِ دیده‌شده در همین قاعده { prop, value }
  const out = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '{' || part === '}') { out.push(part); prev = null; continue; }
    if (part === ';') { out.push(part); continue; }

    const dm = part.match(/^(\s*)([a-zA-Z-]+)(\s*:\s*)([\s\S]*)$/);
    if (!dm) { out.push(part); prev = null; continue; }

    const [, indent, propRaw, colon, value] = dm;
    const prop = propRaw.toLowerCase();

    if (prop !== 'backdrop-filter' && prop !== '-webkit-backdrop-filter') {
      prev = { prop, value: value.trim() };
      out.push(part);
      continue;
    }

    const v = value.trim();

    // حذف اعلان زائد باید جداکنندهٔ «;» همراهش را هم بردارد
    const dropWithSemicolon = () => { if (parts[i + 1] === ';') i++; };

    // اعلان تکراری عین قبلی → دور بریز
    if (prev && prev.prop === prop && prev.value === v) { count++; dropWithSemicolon(); continue; }

    if (prop === 'backdrop-filter') {
      // اگر پیشوند همان مقدار از قبل آمده، دوباره اضافه نکن
      if (prev && prev.prop === '-webkit-backdrop-filter' && prev.value === v) {
        out.push(part);
        prev = { prop, value: v };
        continue;
      }
      count++;
      out.push(`${indent}-webkit-backdrop-filter:${v};${part}`);
      // اعلان واقعیِ بعدی همان استاندارد است
      prev = { prop, value: v };
      continue;
    }

    // prop === '-webkit-backdrop-filter'
    // اگر استانداردِ همین‌مقدار بلافاصله قبل آمده، این اعلان زائد است
    if (prev && prev.prop === 'backdrop-filter' && prev.value === v) {
      count++; dropWithSemicolon(); continue;
    }

    out.push(part);
    prev = { prop, value: v };
  }

  let text = out.join('');

  // جمع‌کردن اعلان‌های استانداردِ پشت‌سرهم با مقدار یکسان
  text = text.replace(
    /((?:^|[{;\s])backdrop-filter\s*:\s*([^;{}]+);)(\s*(?:-webkit-)?backdrop-filter\s*:\s*\2;)+/g,
    (m, first) => { count++; return first; }
  );

  return { css: text, count };
}

/**
 * ۲) افزودن فالبک پیش از هر اعلان دارای color-mix()
 *
 * با یک پیمایش خطی کار می‌کند و «آخرین ویژگی» داخل هر قاعده را نگه می‌دارد،
 * پس کاملاً idempotent است: اگر فالبک از قبل آمده باشد، دوباره اضافه نمی‌شود.
 */
function addColorMixFallbacks(css, vars) {
  let count = 0, skipped = 0;

  // تقسیم به قطعه‌های اعلان با حفظ جداکننده‌ها
  // قطعه‌ها با { } ; جدا می‌شوند
  const parts = css.split(/([{};])/);
  let lastProp = null;        // آخرین ویژگی‌ای که در همین قاعده دیده شده
  let lastWasPlain = false;   // آیا مقدارش ساده بود (بدون color-mix)
  let lastIdx = -1;           // جای آن اعلان در آرایهٔ out (برای ترمیم)
  let lastValue = '';
  const out = [];

  const reset = () => { lastProp = null; lastWasPlain = false; lastIdx = -1; lastValue = ''; };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '{' || part === '}') { out.push(part); reset(); continue; }
    if (part === ';') { out.push(part); continue; }

    // آیا این قطعه یک اعلان «ویژگی: مقدار» است؟
    const declMatch = part.match(/^(\s*)([a-zA-Z-]+)(\s*:\s*)([\s\S]*)$/);
    if (!declMatch) { out.push(part); continue; }

    const [, indent, prop, , value] = declMatch;
    const hasMix = /color-mix\(/i.test(value);

    if (!hasMix) {
      lastProp = prop;
      lastWasPlain = true;
      lastIdx = out.length;
      lastValue = value;
      out.push(part);
      continue;
    }

    // مقدار جانشین: هر color-mix با رنگ محاسبه‌شده‌اش جایگزین می‌شود.
    // این روش برای گرادیان، سایه، حاشیه و رنگ متن یکسان کار می‌کند
    // و شکل اصلی طرح را حفظ می‌کند (برخلاف فالبک رنگ خالی).
    const replaced = replaceColorMix(value, vars);

    // فالبک از قبل آمده؟
    const coversAsSame = lastWasPlain && lastProp === prop;
    const coversAsBg = lastWasPlain && prop === 'background' && lastProp === 'background-color';
    const alreadyCovered = coversAsSame || coversAsBg;

    if (alreadyCovered) {
      // ترمیم: اگر فالبک موجود با مقدار درست یکی نیست، جایگزینش کن
      if (replaced && coversAsSame && lastValue.trim() !== replaced.trim()) {
        out[lastIdx] = `${indent}${prop}:${replaced};`;
        count++;
      } else if (replaced && coversAsBg && lastValue.trim() !== replaced.trim()) {
        out[lastIdx] = `${indent}background-color:${replaced};`;
        count++;
      }
      out.push(part);
      reset();
      continue;
    }

    if (replaced) {
      count++;
      out.push(`${indent}${prop}:${replaced};${part}`);
    } else {
      skipped++;
      out.push(part);
    }
    reset();
  }

  return { css: out.join(''), count, skipped };
}

async function main() {
  const files = await htmlAndCssFiles();
  let totalPrefix = 0, totalFallback = 0, totalSkipped = 0;
  const touched = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    let text = await readFile(file, 'utf8');
    const original = text;

    // ── گام ۰: پوشاندن محدودهٔ <script>…</script> تا دست‌نخورده بماند ──
    //    (بعضی صفحه‌ها داخل JS رشتهٔ <style> دارند)
    const shielded = [];

    if (file.endsWith('.html')) {
      text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (m) => {
        shielded.push(m);
        return `\u0000HKSCRIPT${shielded.length - 1}\u0000`;
      });

      // فقط داخل <style> ها دست می‌بریم
      text = text.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
        const vars = collectVars(css);
        const r = addWebkitPrefixes(css);
        totalPrefix += r.count;
        const r2 = addColorMixFallbacks(r.css, vars);
        totalFallback += r2.count;
        totalSkipped += r2.skipped;
        return `<style${attrs}>${r2.css}</style>`;
      });
    } else {
      const vars = collectVars(text);
      const r = addWebkitPrefixes(text);
      totalPrefix += r.count;
      const r2 = addColorMixFallbacks(r.css, vars);
      totalFallback += r2.count;
      totalSkipped += r2.skipped;
      text = r2.css;
    }

    // ── بازگردانی محدودهٔ <script> که دست‌نخورده نگه داشته شد ──
    if (shielded.length) {
      text = text.replace(/\u0000HKSCRIPT(\d+)\u0000/g, (m, i) => shielded[Number(i)]);
    }

    if (text !== original) {
      touched.push(rel);
      if (!DRY) await writeFile(file, text, 'utf8');
    }
  }

  console.log(`\n${DRY ? '🔍 حالت آزمون' : '✅ سازگاری CSS اعمال شد'}\n`);
  console.log(`  پیشوند -webkit-backdrop-filter افزوده‌شده: ${totalPrefix}`);
  console.log(`  فالبک color-mix تولیدشده:                ${totalFallback}`);
  console.log(`  موارد پیچیده (دست‌نخورده):                ${totalSkipped}`);
  console.log(`  فایل‌های تغییریافته: ${touched.length}\n`);
  for (const t of touched) console.log(`    • ${t}`);
  console.log('');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
