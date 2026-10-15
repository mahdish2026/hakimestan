#!/usr/bin/env node
/**
 * fix-contrast.mjs — اصلاح خودکار کنتراست رنگ متن طبق WCAG
 *
 * رویکرد:
 *   • فقط ویژگی `color` را تغییر می‌دهد — پس‌زمینه‌ها و طرح اصلی دست‌نخورده می‌مانند
 *   • «فام» (hue) و «اشباع» (saturation) را حفظ می‌کند و فقط روشنایی را
 *     به‌اندازهٔ لازم کم یا زیاد می‌کند
 *   • کمترین تغییر ممکن را انجام می‌دهد تا به آستانه برسد (+ حاشیهٔ اطمینان)
 *   • رنگ‌های var() را در سطح همان قاعده حل می‌کند و اگر تم‌ها متفاوت باشند
 *     به رنگ ثابت تبدیل نمی‌کند (تا حالت شب خراب نشود)
 *
 * اجرا:
 *   node tools/fix-contrast.mjs --dry      # پیش‌نمایش تغییرات
 *   node tools/fix-contrast.mjs            # اعمال
 *   node tools/fix-contrast.mjs --all      # اصلاح همه، نه فقط موارد بحرانی
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const FIX_ALL = process.argv.includes('--all');

// آستانه‌ها: AA = 4.5 (متن معمولی) / 3.0 (متن بزرگ)
// در حالت پیش‌فرض فقط «ضعف‌های واقعی خوانایی» اصلاح می‌شوند
const CRITICAL_RATIO = 3.0;
const MARGIN = 0.06;   // حاشیهٔ اطمینان

/* ══════════════ رنگ ══════════════ */

function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s === 'white') s = '#fff';
  if (s === 'black') s = '#000';
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
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean);
    const a = p[3] !== undefined ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
    return { ...hslToRgb(parseFloat(p[0]), parseFloat(p[1]) / 100, parseFloat(p[2]) / 100), a };
  }
  return null;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      default: h = ((r - g) / d + 4);
    }
    h *= 60;
  }
  return { h, s, l };
}

const composite = (fg, bg) => fg.a >= 1 ? fg : ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1
});

function luminance(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

function ratio(a, b) {
  if (!a || !b) return null;
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * رنگ متنی می‌سازد که آستانه را رد کند، با کمترین تغییر روشنایی.
 * فام و اشباع حفظ می‌شوند.
 */
function lightenToTarget(fg, bg, target) {
  const { h, s, l } = rgbToHsl(fg);
  const solidBg = bg.a >= 1 ? bg : { r: 255, g: 255, b: 255, a: 1 };

  const at = (lightness) => {
    const rgb = hslToRgb(h, s, lightness);
    return { ...rgb, a: fg.a };
  };

  // اگر متن تیره‌تر روی پس‌زمینهٔ روشن لازم است یا برعکس؟
  const bgLum = luminance(solidBg);
  const needDarker = bgLum > 0.35;   // پس‌زمینهٔ روشن → متن را تیره کن
  const step = 0.004;
  const limit = needDarker ? 0 : 1;
  const dir = needDarker ? -1 : 1;

  let best = null;
  for (let cur = l; needDarker ? cur >= limit : cur <= limit; cur += dir * step) {
    const cand = at(cur);
    const r = ratio(composite(cand, solidBg), solidBg);
    if (r !== null && r >= target) { best = { color: cand, lightness: cur, ratio: r }; break; }
  }
  if (!best) {
    // نهایت تلاش: سفید یا سیاه
    const extreme = needDarker ? { r: 0, g: 0, b: 0, a: fg.a } : { r: 255, g: 255, b: 255, a: fg.a };
    const r = ratio(composite(extreme, solidBg), solidBg);
    if (r !== null && r >= target) best = { color: extreme, lightness: needDarker ? 0 : 1, ratio: r };
  }
  return best;
}

const toHex = (c) => '#' + [c.r, c.g, c.b].map((x) =>
  Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

/* ══════════════ تحلیل ══════════════ */

const NON_TEXT = /::?(?:before|after|marker|selection|placeholder|backdrop)|(?:^|[\s,>+~])(?:svg|path|circle|rect|img|canvas|video|use|symbol)\b|\.icon\b|\.ic(-sm)?\b|\.sr-only\b|\.visually-hidden\b|\.hk-live\b|\.skip-link\b|\.a11y-hit\b/;

function stripSpecialAtRules(css) {
  let out = css;
  for (const p of [/@media[^{]*prefers-contrast[^{]*\{/i, /@media[^{]*forced-colors[^{]*\{/i, /@media[^{]*print[^{]*\{/i]) {
    let guard = 0;
    while (p.test(out) && guard++ < 20) {
      const m = out.match(p);
      const start = m.index + m[0].length - 1;
      let depth = 0, i = start;
      for (; i < out.length; i++) {
        if (out[i] === '{') depth++;
        else if (out[i] === '}') { depth--; if (depth === 0) break; }
      }
      out = out.slice(0, m.index) + out.slice(i + 1);
    }
  }
  return out;
}

function collectVars(css) {
  const vars = {};
  const re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = re.exec(css))) vars[m[1]] = m[2].trim();
  return vars;
}

function resolveVars(value, vars, depth = 0) {
  if (depth > 3 || !value) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g,
    (_, name, fb) => resolveVars(vars[name] !== undefined ? vars[name] : (fb || ''), vars, depth + 1));
}

/**
 * پس‌زمینهٔ پایهٔ صفحه — با اطمینان بالا
 *
 * موارد مهم:
 *   • بلوک‌های @media print نادیده گرفته می‌شوند (آن‌ها سفید هستند و
 *     در نمایش عادی نقشی ندارند)
 *   • نخستین اعلان background روی body/html معتبر است، نه آخرین
 *     (اعلان‌های بعدی معمولاً داخل media query‌های خاص هستند)
 *   • نام متغیرهای رنگ پایه گسترده است چون هر صفحه نام خودش را دارد
 */
function stripPrintBlocks(css) {
  let out = css;
  const p = /@media[^{]*\bprint\b[^{]*\{/i;
  let guard = 0;
  while (p.test(out) && guard++ < 10) {
    const m = out.match(p);
    const start = m.index + m[0].length - 1;
    let depth = 0, i = start;
    for (; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') { depth--; if (depth === 0) break; }
    }
    out = out.slice(0, m.index) + out.slice(i + 1);
  }
  return out;
}

const BG_VAR_NAMES = [
  '--bg', '--background', '--body-bg', '--page-bg', '--canvas', '--base', '--bg-primary',
  '--bg-color', '--bg-0', '--bg-1', '--bg1', '--bg-2', '--bg2', '--dark-bg', '--night',
  '--paper', '--surface', '--surface-solid', '--card-bg'
];

/** آیا این رنگ تیره است؟ */
const isDark = (c) => c && luminance(c) < 0.22;

function pageBackground(css) {
  const clean = stripPrintBlocks(css);
  const vars = collectVars(clean);

  // ۱) اعلان مستقیم background روی html/body — در ترتیب سند
  const bodyRe = /(?:^|[}{;\s])(html|body)\s*\{([^}]*)\}/gi;
  let m;
  while ((m = bodyRe.exec(clean))) {
    const body = m[2];
    const b = body.match(/background(?:-color)?\s*:\s*([^;!]+)/i);
    if (!b) continue;
    const val = resolveVars(b[1], vars);
    // فقط رنگ پایه را بردار، نه گرادیان‌های تزئینی
    const stops = (val.match(/(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/gi) || [])
      .map(parseColor).filter(Boolean);
    // آخرین لایهٔ مات، رنگ پایه است
    const opaque = stops.filter((c) => c.a >= 1);
    if (opaque.length) return { color: opaque[opaque.length - 1], confidence: 'بالا (body)' };
    if (stops.length) return { color: stops[stops.length - 1], confidence: 'متوسط (body نیمه‌شفاف)' };
  }

  // ۲) متغیرهای پایه
  for (const k of BG_VAR_NAMES) {
    const c = parseColor(vars[k]);
    if (c && c.a >= 1) return { color: c, confidence: `بالا (${k})` };
  }

  // ۳) color-scheme به‌عنوان نشانه
  const darkScheme = /color-scheme\s*:\s*[^;{}]*dark/i.test(clean);
  if (darkScheme) {
    return { color: null, confidence: 'نامعلوم — طرح تیره اعلام شده ولی رنگ پایه پیدا نشد', dark: true };
  }

  return { color: null, confidence: 'نامعلوم', dark: null };
}

/* ══════════════ اصلاح ══════════════ */

let changed = 0, checked = 0, skippedVars = 0, skippedTheme = 0, uncertain = 0;
const log = [];
const uncertainFiles = new Set();
const bgReport = [];

function fixCss(css, fileLabel) {
  const clean = css;
  const vars = collectVars(clean);
  const bgInfo = pageBackground(clean);

  // ⛔ اگر پس‌زمینهٔ پایه با اطمینان مشخص نشد، هیچ تغییری نده.
  //    حدس‌زدن در اینجا می‌تواند طرح را نابود کند (متن سفید → خاکستری).
  if (!bgInfo.color) {
    uncertain++;
    uncertainFiles.add(fileLabel);
    return clean;
  }
  const pageBg = bgInfo.color;

  // آیا این فایل تم تیره هم دارد؟ اگر بله، اصلاح رنگ‌های var() خطرناک است
  const hasDarkTheme = /\[data-theme\s*=\s*["']?(?:night|dark|ocean|forest)/
    .test(clean) || /color-scheme\s*:\s*[^;{}]*dark/i.test(clean);

  let out = '';
  let i = 0;

  // پیمایش خطی روی اعلان‌ها
  const re = /([a-zA-Z-]+)(\s*:\s*)([^;{}]*(?:\([^;{}]*\)[^;{}]*)*)/g;
  let m;
  let lastIndex = 0;

  while ((m = re.exec(clean))) {
    const [full, prop, colon, value] = m;
    out += clean.slice(lastIndex, m.index);
    lastIndex = m.index + full.length;

    if (prop.toLowerCase() !== 'color') { out += full; continue; }

    // زمینهٔ گزینشگر
    const selStart = Math.max(
      clean.lastIndexOf('{', m.index - 1),
      clean.lastIndexOf('}', m.index - 1),
      clean.lastIndexOf(';', m.index - 1)
    );
    const prevBrace = clean.lastIndexOf('{', m.index - 1);
    const prevClose = clean.lastIndexOf('}', m.index - 1);
    const selectorStart = Math.max(prevBrace, prevClose);
    let selector = '';
    if (prevBrace > prevClose) {
      const ruleStart = Math.max(
        clean.lastIndexOf('}', prevBrace - 1),
        clean.lastIndexOf('{', prevBrace - 1)
      );
      selector = clean.slice(ruleStart + 1, prevBrace).trim();
    }
    if (selector && NON_TEXT.test(selector)) { out += full; continue; }

    const rawFg = resolveVars(value.trim(), vars);
    if (/inherit|currentcolor|unset|initial|transparent/i.test(rawFg)) { out += full; continue; }

    const fg = parseColor(rawFg);
    if (!fg) { out += full; continue; }

    // پس‌زمینهٔ همان قاعده را ببین
    let bg = pageBg;
    if (prevBrace > prevClose) {
      const ruleBody = clean.slice(prevBrace + 1, clean.indexOf('}', prevBrace));
      const bgm = ruleBody.match(/background(?:-color)?\s*:\s*([^;!]+)/i);
      if (bgm) {
        const bgVal = resolveVars(bgm[1], vars);
        const stops = (bgVal.match(/(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/gi) || [])
          .map(parseColor).filter(Boolean);
        if (stops.length) {
          // بدترین حالت (کم‌کنتراست‌ترین) را در نظر بگیر
          let worst = null, worstR = Infinity;
          for (const s of stops) {
            const solid = s.a >= 1 ? s : composite(s, pageBg);
            const r = ratio(composite(fg, solid), solid);
            if (r !== null && r < worstR) { worstR = r; worst = s; }
          }
          if (worst) bg = worst.a >= 1 ? worst : composite(worst, pageBg);
        }
      }
    }

    const current = ratio(composite(fg, bg), bg);
    if (current === null) { out += full; continue; }
    checked++;

    const sizeM = clean.slice(prevBrace > prevClose ? prevBrace : m.index,
                              clean.indexOf('}', m.index)).match(/font-size\s*:\s*([\d.]+)(px|rem)/);
    let isLarge = false;
    if (sizeM) {
      const px = sizeM[2] === 'rem' ? parseFloat(sizeM[1]) * 16 : parseFloat(sizeM[1]);
      isLarge = px >= 24;
    }
    const threshold = (isLarge ? 3.0 : 4.5) + MARGIN;
    const mustFix = FIX_ALL ? current < threshold : current < CRITICAL_RATIO;

    if (!mustFix) { out += full; continue; }

    // اگر رنگ از متغیر می‌آید و فایل تم تیره هم دارد، دست نزن
    if (/var\(/.test(value) && hasDarkTheme) { skippedVars++; out += full; continue; }

    const fixed = lightenToTarget(fg, bg, threshold);
    if (!fixed) { out += full; continue; }

    const newHex = toHex(fixed.color);
    if (newHex.toLowerCase() === toHex(fg).toLowerCase()) { out += full; continue; }

    changed++;
    log.push({
      file: fileLabel, selector: selector.slice(0, 45),
      from: toHex(fg), to: newHex,
      was: +current.toFixed(2), now: +ratio(composite(fixed.color, bg), bg).toFixed(2)
    });

    out += `${prop}${colon}${newHex}`;
  }
  out += clean.slice(lastIndex);
  return out;
}

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

  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    let text = await readFile(file, 'utf8');
    const original = text;

    text = text.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi,
      (full, attrs, css) => {
        const info = pageBackground(css);
        bgReport.push([rel, info.color ? toHex(info.color) : '—', info.confidence]);
        return `<style${attrs}>${fixCss(css, rel)}</style>`;
      });

    if (text !== original && !DRY) await writeFile(file, text, 'utf8');
  }

  console.log(`\n${DRY ? '🔍 پیش‌نمایش' : '✅ اصلاح شد'}${FIX_ALL ? ' (همهٔ موارد)' : ' (فقط موارد بحرانی زیر ۳:۱)'}\n`);
  console.log(`  جفت رنگ بررسی‌شده: ${checked}`);
  console.log(`  رنگ‌های اصلاح‌شده:  ${changed}`);
  if (skippedVars) console.log(`  رد‌شده (متغیر + تم تیره): ${skippedVars}`);
  if (uncertain) console.log(`  ⛔ صفحه‌های رد‌شده (پس‌زمینه نامعلوم): ${uncertainFiles.size} فایل — ${[...uncertainFiles].join(', ')}`);

  if (log.length) {
    console.log('\n  نمونهٔ تغییرات:');
    for (const l of log.slice(0, 12)) {
      console.log(`    ${l.file.padEnd(24)} ${l.selector.slice(0, 26).padEnd(27)} ${l.from} → ${l.to}   (${l.was} → ${l.now})`);
    }
    if (log.length > 12) console.log(`    … و ${log.length - 12} مورد دیگر`);
  }
  console.log('');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
