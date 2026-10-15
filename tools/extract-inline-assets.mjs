#!/usr/bin/env node
/**
 * extract-inline-assets.mjs — استخراج منابع base64 از HTML به فایل‌های واقعی
 *
 * چرا؟ base64:
 *   • ۳۳٪ حجیم‌تر از فایل اصلی است
 *   • HTML را حجیم می‌کند و تجزیهٔ صفحه را کند می‌کند
 *   • جدا کش نمی‌شود (هر بار با HTML دانلود می‌شود)
 *   • مانع بارگذاری موازی می‌شود
 *
 * چه چیزی استخراج می‌شود:
 *   • url(data:font/woff2;...[;charset=utf-8];base64,...) → assets/fonts/*.woff2
 *   • url(data:image/png;base64,...)                     → assets/img/*.png
 * و به‌جایش مسیر نسبی درست (با توجه به عمق فایل) گذاشته می‌شود.
 *
 * idempotent است — اجرای دوباره چیزی را خراب نمی‌کند.
 * اجرا: node tools/extract-inline-assets.mjs [--dry]
 */
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const FONT_DIR = join(ROOT, 'assets', 'fonts');
const IMG_DIR = join(ROOT, 'assets', 'img');

/* نگاشت نام‌خوانا برای فونت‌های شناخته‌شده */
const FONT_NAME_MAP = {
  vazirmatn: 'vazirmatn',
  amiri: 'amiri',
  lalezar: 'lalezar',
  estedad: 'estedad',
  sahel: 'sahel',
  shabnam: 'shabnam',
  samim: 'samim',
  parastoo: 'parastoo',
  gandom: 'gandom',
  'markazi-text': 'markazi-text',
  mirza: 'mirza',
  katibeh: 'katibeh',
  harmattan: 'harmattan',
  scheherazade: 'scheherazade'
};

async function htmlFiles(dir = ROOT, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tools', 'assets', 'books', 'videos', 'icons'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(full, acc);
    else if (e.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function prefixFor(absPath) {
  const rel = relative(ROOT, dirname(absPath)) || '';
  if (!rel) return '';
  return '../'.repeat(rel.split(/[\\/]/).filter(Boolean).length);
}

const kb = (n) => (n / 1024).toFixed(0) + ' KB';

async function main() {
  await mkdir(FONT_DIR, { recursive: true });
  await mkdir(IMG_DIR, { recursive: true });

  const files = await htmlFiles();
  let totalSaved = 0;
  const written = new Set();
  const report = [];

  for (const file of files) {
    let html = await readFile(file, 'utf8');
    const before = Buffer.byteLength(html);
    const prefix = prefixFor(file);
    let changed = false;
    const usedNames = new Set();

    /* ── ۱) فونت‌ها ─────────────────────────────────────── */
    // الگو: @font-face { ... src: url(data:font/woff2;...;base64,XXXX) ... }
    const fontFaceRe = /@font-face\s*\{([^}]*)\}/g;
    const faces = [];
    let m;
    while ((m = fontFaceRe.exec(html))) faces.push({ full: m[0], body: m[1], index: m.index });

    for (const face of faces) {
      const urlMatch = face.body.match(/url\(\s*data:font\/(\w+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)\s*\)/);
      if (!urlMatch) continue;

      const fmt = urlMatch[1];                 // woff2
      const data = urlMatch[2];
      const family = (face.body.match(/font-family\s*:\s*['"]?([^;'"]+)/) || [, 'font'])[1].trim();
      const weight = (face.body.match(/font-weight\s*:\s*([^;]+)/) || [, '400'])[1].trim().replace(/\s+/g, '-');
      const style = (face.body.match(/font-style\s*:\s*([^;]+)/) || [, 'normal'])[1].trim();

      const slug = FONT_NAME_MAP[family.toLowerCase().replace(/\s+/g, '-')] ||
                   family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'font';
      let name = `${slug}-${weight}`;
      if (style !== 'normal') name += `-${style}`;
      let fileName = `${name}.${fmt}`;
      if (written.has(fileName) || usedNames.has(fileName)) {
        // همان فایل قبلاً نوشته شده — از همان استفاده می‌کنیم
      } else {
        const buf = Buffer.from(data, 'base64');
        if (!DRY) await writeFile(join(FONT_DIR, fileName), buf);
        written.add(fileName);
        report.push({ kind: 'فونت', file: fileName, size: buf.length, from: relative(ROOT, file) });
      }
      usedNames.add(fileName);

      const newBody = face.body.replace(
        /url\(\s*data:font\/[^)]+\)/,
        `url('${prefix}assets/fonts/${fileName}') format('${fmt}')`
      );
      html = html.replace(face.full, `@font-face {${newBody}}`);
      changed = true;
      totalSaved += data.length - Math.round(data.length * 0.75);
    }

    /* ── ۲) تصاویر ─────────────────────────────────────── */
    // دو جا استفاده می‌شوند: url('data:...') در CSS و src="data:..." در <img>
    const imgPatterns = [
      /url\(\s*(['"]?)data:image\/(\w+);base64,([A-Za-z0-9+/=]{400,})\1\s*\)/g,
      /(src\s*=\s*)(['"])data:image\/(\w+);base64,([A-Za-z0-9+/=]{400,})\2/g
    ];
    // ساختار یکنواخت: { full, fmt, data, replacement(fn) }
    const imgMatches = [];
    for (const [pi, re] of imgPatterns.entries()) {
      let im;
      while ((im = re.exec(html))) {
        const fmt = pi === 0 ? im[2] : im[3];
        const data = pi === 0 ? im[3] : im[4];
        imgMatches.push({ fmt, data, index: im.index, raw: im[0], pattern: pi });
      }
    }
    // حذف هم‌پوشانی (اگر دو الگو یک مورد را دیدند)
    imgMatches.sort((a, b) => a.index - b.index);
    const deduped = [];
    let lastEnd = -1;
    for (const im of imgMatches) {
      if (im.index < lastEnd) continue;
      lastEnd = im.index + im.raw.length;
      deduped.push(im);
    }

    // یک داده، یک فایل — هر تعداد ارجاع
    const byData = new Map();
    for (const im of deduped) {
      if (!byData.has(im.data)) byData.set(im.data, []);
      byData.get(im.data).push(im);
    }

    let imgIdx = 0;
    for (const [data, uses] of byData) {
      const fmt = uses[0].fmt;
      const stem = relative(ROOT, file).replace(/\.html$/, '').replace(/[\\/]/g, '-');
      const fileName = imgIdx === 0 ? `${stem}-art.${fmt}` : `${stem}-art-${imgIdx + 1}.${fmt}`;
      imgIdx++;
      const buf = Buffer.from(data, 'base64');
      if (!DRY) {
        await writeFile(join(IMG_DIR, fileName), buf);
        written.add('img/' + fileName);
      }
      report.push({ kind: 'تصویر', file: fileName, size: buf.length, from: relative(ROOT, file), uses: uses.length });
      for (const im of uses) {
        const path = `${prefix}assets/img/${fileName}`;
        const replacement = im.pattern === 0 ? `url('${path}')` : `src="${path}"`;
        html = html.replace(im.raw, replacement);
      }
      changed = true;
      totalSaved += (data.length - Math.round(data.length * 0.75)) * uses.length;
    }

    if (changed && !DRY) {
      await writeFile(file, html, 'utf8');
      const after = Buffer.byteLength(html);
      report.push({ kind: 'صفحه', file: relative(ROOT, file), before, after });
    }
  }

  /* ── گزارش ─────────────────────────────────────────── */
  console.log('\n' + (DRY ? '🔍 حالت آزمون (بدون نوشتن)' : '✅ استخراج انجام شد') + '\n');

  const fonts = report.filter((r) => r.kind === 'فونت');
  const imgs = report.filter((r) => r.kind === 'تصویر');
  const pages = report.filter((r) => r.kind === 'صفحه');

  if (fonts.length) {
    console.log('  فونت‌ها:');
    for (const f of fonts) console.log(`    fonts/${f.file.padEnd(34)} ${kb(f.size).padStart(9)}`);
  }
  if (imgs.length) {
    console.log('\n  تصاویر:');
    for (const i of imgs) console.log(`    img/${i.file.padEnd(36)} ${kb(i.size).padStart(9)}${i.uses > 1 ? `  (${i.uses} بار استفاده)` : ''}`);
  }
  if (pages.length) {
    console.log('\n  کاهش حجم صفحات:');
    let sum = 0;
    for (const p of pages) {
      const d = p.before - p.after;
      sum += d;
      console.log(`    ${p.file.padEnd(34)} ${kb(p.before).padStart(9)} → ${kb(p.after).padStart(9)}  (−${kb(d)})`);
    }
    console.log(`    ${'جمع'.padEnd(34)} ${kb(sum).padStart(9)} کاهش`);
  }
  if (!report.length) console.log('  چیزی برای استخراج نبود (همه قبلاً استخراج شده)');
  console.log('');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
