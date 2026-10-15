#!/usr/bin/env node
/**
 * check-contrast.mjs — بازرسی کنتراست رنگ در CSS صفحات حکیمستان
 *
 * روش کار (تحلیل ایستا، بدون مرورگر):
 *   ۱) همهٔ <style> های هر صفحه و فایل‌های CSS را می‌خواند
 *   ۲) متغیرهای CSS (--x: value) را در :root و تم‌ها استخراج می‌کند
 *   ۳) در هر قاعده، جفت «رنگ متن + پس‌زمینه» را پیدا می‌کند
 *      (چه مستقیم و چه با var())
 *   ۴) نسبت کنتراست WCAG را حساب می‌کند و آستانه‌ها را بررسی می‌کند:
 *        متن معمولی   ≥ 4.5:1
 *        متن بزرگ     ≥ 3.0:1
 *        عناصر رابط   ≥ 3.0:1
 *
 * اجرا: node tools/check-contrast.mjs [--verbose]
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

/* ══════════════ ابزارهای رنگ ══════════════ */

function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (s === 'transparent' || s === 'inherit' || s === 'initial' || s === 'currentcolor' || s === 'unset') return null;
  if (s === 'white') s = '#fff';
  if (s === 'black') s = '#000';

  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
      };
    }
    return null;
  }

  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map((p) => p.trim());
    if (parts.length < 3) return null;
    const toByte = (p) => p.endsWith('%') ? Math.round(parseFloat(p) * 2.55) : parseFloat(p);
    const a = parts[3] !== undefined
      ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]))
      : 1;
    return { r: toByte(parts[0]), g: toByte(parts[1]), b: toByte(parts[2]), a };
  }

  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    const h = parseFloat(parts[0]) / 360;
    const sat = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] !== undefined ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (sat === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
  }

  // رنگ‌های نام‌دار رایج
  const NAMED = {
    red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00',
    orange: '#ffa500', purple: '#800080', gray: '#808080', grey: '#808080',
    silver: '#c0c0c0', navy: '#000080', teal: '#008080', maroon: '#800000',
    olive: '#808000', lime: '#00ff00', aqua: '#00ffff', cyan: '#00ffff',
    fuchsia: '#ff00ff', magenta: '#ff00ff', crimson: '#dc143c', gold: '#ffd700',
    pink: '#ffc0cb', brown: '#a52a2a', beige: '#f5f5dc', ivory: '#fffff0'
  };
  if (NAMED[s]) return parseColor(NAMED[s]);
  return null;
}

function composite(fg, bg) {
  if (!fg) return bg;
  if (fg.a >= 1) return fg;
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1
  };
}

function luminance(c) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

function contrastRatio(a, b) {
  if (!a || !b) return null;
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* ══════════════ تحلیل CSS ══════════════ */

/** استخراج متغیرهای CSS از متن */
function collectVars(css) {
  const vars = {};
  const re = /(--[\w-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g;
  let m;
  while ((m = re.exec(css))) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

/** جای‌گذاری var() ها (تا دو سطح تودرتو) */
function resolveValue(value, vars, depth = 0) {
  if (depth > 4 || !value) return value;
  const re = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g;
  return value.replace(re, (_, name, fallback) => {
    const v = vars[name] !== undefined ? vars[name] : (fallback || '');
    return resolveValue(v, vars, depth + 1);
  });
}

/** حذف بلوک‌های @media که برای شرایط خاص‌اند (کنتراست بالا، چاپ، …) */
function stripSpecialAtRules(css) {
  let out = css;
  const patterns = [
    /@media[^{]*prefers-contrast[^{]*\{/i,
    /@media[^{]*forced-colors[^{]*\{/i,
    /@media[^{]*print[^{]*\{/i
  ];
  for (const p of patterns) {
    let guard = 0;
    while (p.test(out) && guard++ < 20) {
      const m = out.match(p);
      const start = m.index + m[0].length - 1; // موقعیت {
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

/** جداکردن قاعده‌های CSS */
function parseRules(css) {
  const rules = [];
  const clean = stripSpecialAtRules(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    if (!selector || selector.startsWith('@')) continue;
    rules.push({ selector, body });
  }
  return rules;
}

/**
 * ساخت «زمینه‌های تم»: هر تم یک مجموعهٔ متغیر و یک پس‌زمینهٔ صفحه دارد.
 * تم‌ها از گزینشگرهایی مثل [data-theme="night"] یا .theme-dark شناسایی می‌شوند.
 */
function buildThemes(cssText) {
  const clean = stripSpecialAtRules(cssText.replace(/\/\*[\s\S]*?\*\//g, ''));

  // متغیرهای پایه از :root و html و body
  const base = {};
  const baseRules = /(?::root|^html\b|^body\b|\bhtml\s*,|\bbody\s*,)[^{}]*\{([^{}]*)\}/gim;
  let m;
  while ((m = baseRules.exec(clean))) {
    Object.assign(base, collectVars(m[1]));
  }

  const bgKeys = ['--bg', '--background', '--page-bg', '--paper', '--surface', '--bg-color', '--bg-1', '--canvas'];

  const pageBgOf = (vars) => {
    for (const k of bgKeys) {
      const c = parseColor(vars[k]);
      if (c) return c;
    }
    return null;
  };

  const themes = [{
    name: 'پیش‌فرض',
    token: null,
    vars: base,
    pageBg: null // بعداً از روی rules پر می‌شود
  }];

  // تم‌های نام‌دار — فقط الگوی استاندارد [data-theme="x"] یا [data-mode="x"]
  const seen = new Map();
  const themeBlockRe = /([^{}]*\[data-(?:theme|mode)\s*=\s*["']?([\w-]{1,24})["']?\][^{}]*)\{([^{}]*)\}/g;
  while ((m = themeBlockRe.exec(clean))) {
    const token = m[2];
    const vars = { ...base, ...collectVars(m[3]) };

    // پس‌زمینه: از متغیر یا مستقیم
    let pageBg = pageBgOf(vars);
    if (!pageBg) {
      const directBg = m[3].match(/(?:^|[;\s])background(?:-color)?\s*:\s*([^;!]+)/i);
      if (directBg) {
        const stops = directBg[1].match(/(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/gi) || [];
        const parsed = stops.map(parseColor).filter(Boolean);
        if (parsed.length) pageBg = parsed[0];
      }
    }

    if (seen.has(token)) {
      // ادغام: متغیرهای تازه‌تر اولویت دارند
      const prev = seen.get(token);
      seen.set(token, { ...prev, vars: { ...prev.vars, ...vars }, pageBg: pageBg || prev.pageBg });
    } else {
      seen.set(token, { name: token, token, vars, pageBg });
    }
  }
  for (const t of seen.values()) themes.push(t);

  // پس‌زمینهٔ مستقیم روی body/html برای تم پیش‌فرض
  if (!themes[0].pageBg) {
    for (const { selector, body } of parseRules(clean)) {
      if (!/^(html|body|:root)(\s*,|$)/i.test(selector)) continue;
      const b = body.match(/(?:^|[;\s])background(?:-color)?\s*:\s*([^;!]+)/i);
      if (!b) continue;
      const stops = b[1].match(/(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/gi) || [];
      const parsed = stops.map(parseColor).filter(Boolean);
      if (parsed.length) { themes[0].pageBg = parsed[0]; break; }
    }
  }
  if (!themes[0].pageBg) themes[0].pageBg = pageBgOf(base) || DEFAULT_BG;

  // تم‌هایی که پس‌زمینه ندارند، از پیش‌فرض ارث می‌برند
  for (const t of themes) if (!t.pageBg) t.pageBg = themes[0].pageBg;

  return themes;
}

/** تخمین اندازهٔ فونت از متن قاعده */
function fontSizePx(body, rootSize = 16) {
  const m = body.match(/font-size\s*:\s*([\d.]+)\s*(px|rem|em|pt|%)?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  const unit = m[2] || 'px';
  if (unit === 'px') return v;
  if (unit === 'rem' || unit === 'em') return v * rootSize;
  if (unit === 'pt') return v * 1.333;
  if (unit === '%') return (v / 100) * rootSize;
  return null;
}

function fontWeightBold(body) {
  const m = body.match(/font-weight\s*:\s*([\w]+|\d+)/i);
  if (!m) return false;
  const v = m[1].toLowerCase();
  if (v === 'bold' || v === 'bolder') return true;
  const n = parseInt(v, 10);
  return !Number.isNaN(n) && n >= 700;
}

/* ══════════════ اجرا ══════════════ */

async function htmlFiles(dir = ROOT, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tools'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(full, acc);
    else if (e.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const DEFAULT_BG = { r: 255, g: 255, b: 255, a: 1 };

/** گزینشگرهایی که متن واقعی نیستند و باید نادیده گرفته شوند */
const NON_TEXT_SELECTOR = /::?(?:before|after|marker|selection|placeholder|backdrop)|(?:^|[\s,>+~])(?:svg|path|circle|rect|img|canvas|video|use|symbol)\b|\.icon\b|\.ic\b|\.ic-sm\b|\.spinner\b|\.sr-only\b|\.visually-hidden\b|\.hk-live\b|\.skip-link\b|\.a11y-hit\b/;

function analyze(name, cssText) {
  const themes = buildThemes(cssText);
  const rules = parseRules(cssText);
  const issues = [];
  let checked = 0;

  /** آیا این قاعده مربوط به همین تم است؟ */
  const themeTokenOf = (selector) => {
    const m = selector.match(/\[data-(?:theme|mode)\s*=\s*["']?([\w-]{1,24})["']?\]/);
    return m ? m[1] : null;
  };

  for (const theme of themes) {
    const vars = theme.vars;

    for (const { selector, body } of rules) {
      if (NON_TEXT_SELECTOR.test(selector)) continue;

      const ruleToken = themeTokenOf(selector);
      if (theme.token === null) {
        // تم پیش‌فرض: فقط قاعده‌های عمومی (بدون قید تم)
        if (ruleToken !== null) continue;
      } else {
        // تم نام‌دار: قاعده‌های عمومی + قاعده‌های همین تم
        if (ruleToken !== null && ruleToken !== theme.token) continue;
        if (ruleToken === null) continue; // قاعدهٔ عمومی را فقط یک‌بار (در تم پیش‌فرض) بررسی می‌کنیم
      }

      const colorRaw = body.match(/(?:^|[;\s])color\s*:\s*([^;!]+)/i);
      if (!colorRaw) continue;
      const rawFg = resolveValue(colorRaw[1].trim(), vars);
      if (/inherit|currentcolor|unset|initial/i.test(rawFg)) continue;

      const fgColor = parseColor(rawFg);
      if (!fgColor) continue;

      const bgRaw = body.match(/(?:^|[;\s])background(?:-color|-image)?\s*:\s*([^;!]+)/i);
      const size = fontSizePx(body);
      const bold = fontWeightBold(body);
      const isLarge = size !== null && (size >= 24 || (size >= 18.66 && bold));
      const threshold = isLarge ? 3 : 4.5;

      // پس‌زمینه: از همین قاعده، وگرنه پس‌زمینهٔ تم
      let candidates = [theme.pageBg];
      let bgText = `صفحه (تم ${theme.name})`;
      let ownBg = false;
      if (bgRaw) {
        const bgValue = resolveValue(bgRaw[1].trim(), vars);
        if (!/^(none|transparent|inherit|unset|initial)$/i.test(bgValue.trim())) {
          const stops = bgValue.match(/(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/gi);
          const parsed = stops ? stops.map(parseColor).filter(Boolean) : [];
          if (parsed.length) { candidates = parsed; bgText = bgValue; ownBg = true; }
          else {
            const c = parseColor(bgValue);
            if (c) { candidates = [c]; bgText = bgValue; ownBg = true; }
          }
        }
      }

      // بدترین کنتراست را پیدا کن (شفافیت روی پس‌زمینهٔ تم می‌نشیند)
      let worst = null;
      for (const raw of candidates) {
        const solid = raw.a >= 1 ? raw : composite(raw, theme.pageBg);
        const fgSolid = fgColor.a >= 1 ? fgColor : composite(fgColor, solid);
        const r = contrastRatio(fgSolid, solid);
        if (r === null) continue;
        if (!worst || r < worst.ratio) worst = { ratio: r };
      }
      if (!worst) continue;
      checked++;

      if (worst.ratio < threshold) {
        issues.push({
          selector,
          theme: theme.name,
          ratio: +worst.ratio.toFixed(2),
          threshold,
          fgText: rawFg,
          bgText: ownBg ? String(bgText).trim().slice(0, 90) : String(bgText),
          size,
          note: isLarge ? 'متن بزرگ' : 'متن معمولی'
        });
      }
    }
  }

  return { name, checked, issues, themes };
}

function stopText(stops) {
  return stops.slice(0, 3).join(' / ');
}

async function main() {
  const files = await htmlFiles();
  const cssFiles = (await readdir(join(ROOT, 'css')).catch(() => []))
    .filter((f) => f.endsWith('.css'))
    .map((f) => join(ROOT, 'css', f));

  let totalChecked = 0;
  let totalIssues = 0;
  const perPage = [];

  for (const file of [...files, ...cssFiles]) {
    const rel = relative(ROOT, file).split('\\').join('/');
    const text = await readFile(file, 'utf8');
    const cssBlocks = [];
    if (file.endsWith('.html')) {
      const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      let m;
      while ((m = re.exec(text))) cssBlocks.push(m[1]);
    } else {
      cssBlocks.push(text);
    }

    let checked = 0;
    const issues = [];
    for (const block of cssBlocks) {
      const res = analyze(rel, block);
      checked += res.checked;
      issues.push(...res.issues);
    }

    totalChecked += checked;
    totalIssues += issues.length;
    perPage.push({ rel, checked, issues });

    const tag = issues.length ? '⚠️ ' : '✅';
    console.log(`${tag} ${rel} — ${checked} جفت رنگ بررسی شد، ${issues.length} مشکل`);
    for (const i of issues.slice(0, VERBOSE ? 200 : 6)) {
      console.log(`     ${i.ratio}:1 (کمینه ${i.threshold}) [تم ${i.theme}] — ${i.selector.slice(0, 55)}`);
      console.log(`        color: ${i.fgText}  روی  ${i.bgText.slice(0, 75)}  ${i.size ? `(${Math.round(i.size)}px)` : ''}`);
    }
    if (issues.length > 6 && !VERBOSE) console.log(`     … و ${issues.length - 6} مورد دیگر (با --verbose ببینید)`);
  }

  console.log('\n══════════════════════════════════════');
  console.log(`مجموع جفت‌های رنگ بررسی‌شده: ${totalChecked}`);
  console.log(`مجموع مشکلات کنتراست: ${totalIssues}`);
  const worst = perPage.flatMap((p) => p.issues.map((i) => ({ ...i, rel: p.rel })))
    .sort((a, b) => a.ratio - b.ratio).slice(0, 10);
  if (worst.length) {
    console.log('\nبدترین موارد:');
    for (const w of worst) {
      console.log(`  ${String(w.ratio).padStart(5)}:1  ${w.rel.padEnd(28)} ${w.selector.slice(0, 45)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
