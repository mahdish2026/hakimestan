#!/usr/bin/env node
/**
 * gen-contrast-layer.mjs — تولید لایهٔ «اصلاح کنتراست» به‌صورت خودکار
 *
 * چرا لایه و نه ویرایش درجا؟
 *   • صفحه‌ها چند تم دارند (روشن / تیره / کلاس‌های data-theme).
 *     ویرایش مستقیم رنگ‌ها در جای خودشان می‌تواند یک تم را خراب کند.
 *   • یک لایهٔ جداگانه در پایان سند، فقط همان گزینشگرهای مشکل‌دار را
 *     با رنگ اصلاح‌شده بازنویسی می‌کند و به بقیهٔ طرح دست نمی‌زند.
 *   • قابل بازتولید و قابل حذف: اگر لازم شد، کل لایه برداشته می‌شود.
 *
 * روش اصلاح:
 *   • متن سفید روی رنگ برند → پس‌زمینهٔ برند فقط تا حد لازم تیره می‌شود.
 *     (طرح «ایکن/دکمهٔ رنگی با متن سفید» حفظ می‌شود)
 *   • متن تیره روی پس‌زمینهٔ روشن → خود متن تیره‌تر می‌شود.
 *   • فام و اشباع رنگ اصلی هرگز تغییر نمی‌کند؛ فقط روشنایی.
 *
 * اجرا:
 *   node tools/gen-contrast-layer.mjs --dry
 *   node tools/gen-contrast-layer.mjs            # نوشتن در css/contrast.css + تزریق
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const START = '<!-- hakim-contrast:start -->';
const END = '<!-- hakim-contrast:end -->';
const TARGET = 4.6;

/* ══════════════ کد رنگ ══════════════ */

function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (s === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
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
  return null;
}

const rgbToHsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
    h *= 60;
  }
  return { h, s, l };
};

const hslToRgb = (h, s, l) => {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
};

const luminance = (c) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const ratio = (a, b) => {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const hex = (c) => '#' + [c.r, c.g, c.b].map((x) =>
  Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

/** روشنایی را در جهت لازم تغییر می‌دهد تا آستانه رد شود (فام/اشباع ثابت) */
function adjust(fg, bg, target = TARGET) {
  const { h, s, l } = rgbToHsl(fg);
  const bgLum = luminance(bg);
  const darker = bgLum > 0.35;          // پس‌زمینه روشن → متن تیره‌تر
  const dir = darker ? -1 : 1;
  const limit = darker ? 0 : 1;
  let cur = l;
  for (let i = 0; i < 400; i++) {
    if (darker ? cur < limit : cur > limit) break;
    const c = hslToRgb(h, s, cur);
    if (ratio(c, bg) >= target) return c;
    cur += dir * 0.004;
  }
  return darker ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
}

/* ══════════════ تحلیل صفحه ══════════════ */

const SKIP_SEL = /::?(?:before|after|marker|selection|placeholder|backdrop)|(?:^|[\s,>+~])(?:svg|path|circle|rect|img|canvas|video|use|symbol|line|polygon)\b|\.sr-only\b|\.visually-hidden\b|\.skip-link\b|\.a11y-hit\b|\.hk-live\b|\.icon\b|\.ic(-sm|lg)?\b/;

function splitRules(css) {
  // ۱) حذف کامنت‌ها (وگرنه بخشی از گزینشگر می‌شوند)
  let out = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // ۲) حذف صفحه‌آرایی چاپ
  out = out.replace(/@media[^{]*\bprint\b[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/gi, '');
  const rules = [];
  // فقط قواعد تک‌سطحی (بدون تودرتویی) — برای صفحه‌های این پروژه کافی است
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(out))) rules.push({ selector: m[1].trim(), body: m[2], index: m.index });
  return rules;
}

function analyze(css) {
  const findings = [];
  for (const { selector, body } of splitRules(css)) {
    if (!selector || selector.startsWith('@') || selector.startsWith('from') ||
        selector.startsWith('to') || /^\d+%/.test(selector)) continue;
    if (SKIP_SEL.test(selector)) continue;

    const cm = body.match(/(?:^|[;\s])color\s*:\s*([^;!]+)/);
    const bm = body.match(/(?:^|[;\s])background(?:-color)?\s*:\s*([^;!]+)/);
    if (!cm) continue;
    if (/var\(|inherit|currentcolor|unset|initial/i.test(cm[1])) continue;
    const fg = parseColor(cm[1]);
    if (!fg || fg.a < 1) continue;

    let bg = null, bgSource = 'background';
    if (bm) {
      if (/gradient|url\(/i.test(bm[1])) continue;
      const c = parseColor(bm[1]);
      if (!c || c.a < 1) continue;
      bg = c;
    } else {
      continue;   // بدون پس‌زمینهٔ صریح، پس‌زمینهٔ ارثی نامعلوم است
    }

    const r = ratio(fg, bg);
    if (r >= 4.5) continue;

    // کدام را تغییر دهیم؟
    const whiteText = luminance(fg) > 0.75 && luminance(bg) < 0.75;
    const fix = whiteText ? adjust(bg, { r: 255, g: 255, b: 255 }) : adjust(fg, bg);
    const prop = whiteText ? 'background-color' : 'color';

    // آستانهٔ «متن بزرگ»: اگر اندازهٔ فونت بزرگ باشد، ۳:۱ هم کافی است
    const sizeM = body.match(/font-size\s*:\s*([\d.]+)(px|rem|em)/);
    let isLarge = false;
    if (sizeM) {
      const px = sizeM[2] === 'rem' || sizeM[2] === 'em' ? parseFloat(sizeM[1]) * 16 : parseFloat(sizeM[1]);
      isLarge = px >= 24;
    }
    if (isLarge && ratio(whiteText ? { r: 255, g: 255, b: 255 } : fg,
                         whiteText ? bg : bg) >= 3.0) continue;

    // ✅ تأیید: نتیجه باید واقعاً به آستانه برسد، وگرنه رد شود
    const checkVal = prop === 'color' ? ratio(fix, bg) : ratio({ r: 255, g: 255, b: 255 }, fix);
    const need = isLarge ? 3.0 : 4.5;
    if (checkVal < need) continue;

    // اگر اعلان اصلی !important داشته، لایه هم باید داشته باشد تا برنده شود
    const important = /!important/i.test(prop === 'color' ? cm[1] : bm[1]);

    findings.push({
      selector, prop, value: hex(fix), important,
      was: +r.toFixed(2),
      now: +checkVal.toFixed(2)
    });
  }
  return findings;
}

/* ══════════════ اجرا ══════════════ */

async function htmlFiles(dir = ROOT, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tools', 'assets', 'books', 'videos', 'icons', 'screenshots'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(full, acc);
    else if (e.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

async function main() {
  const files = await htmlFiles();
  let total = 0;
  const report = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    let text = await readFile(file, 'utf8');

    // پاک‌کردن لایهٔ قبلی
    const prev = new RegExp(`${START}[\\s\\S]*?${END}\\n?`, 'g');
    const hadLayer = prev.test(text);
    text = text.replace(prev, '');

    const allFindings = [];
    for (const cssBlock of [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]) {
      allFindings.push(...analyze(cssBlock[1]));
    }
    // حذف تکراری‌ها (یک گزینشگر چند بار)
    const seen = new Set();
    const unique = allFindings.filter((f) => {
      const k = f.selector + '|' + f.prop;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (!unique.length) {
      if (hadLayer && !DRY) await writeFile(file, text, 'utf8');
      continue;
    }

    // گروه‌بندی اصلاح‌ها در قواعد کم‌تعداد (گزینشگرهای هم‌ویژگی و هم‌مقدار)
    const groups = new Map();
    for (const f of unique) {
      const key = `${f.value}|${f.important ? '!' : ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    const lines = [...groups.entries()].map(([key, items]) => {
      const [value, imp] = key.split('|');
      const props = [...new Set(items.map((i) => i.prop))];
      return `${items.map((i) => i.selector).join(', ')}{${props.map((p) => `${p}:${value}${imp ? ' !important' : ''}`).join(';')}}`;
    });
    const block = `\n${START}\n<style id="hk-contrast-layer">\n/* اصلاح کنتراست WCAG — تولیدشده توسط tools/gen-contrast-layer.mjs */\n${lines.join('\n')}\n</style>\n${END}\n`;

    total += unique.length;
    report.push([rel, unique.length]);
    if (!DRY) {
      text = text.replace(/<\/body>/i, `${block}</body>`);
      await writeFile(file, text, 'utf8');
    }
  }

  console.log(`\n${DRY ? '🔍 پیش‌نمایش' : '✅ لایهٔ کنتراست ساخته شد'}\n`);
  console.log(`  کل اصلاح‌ها: ${total} در ${report.length} صفحه\n`);
  for (const [f, n] of report.sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}  ${f}`);
  }
  console.log('');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
