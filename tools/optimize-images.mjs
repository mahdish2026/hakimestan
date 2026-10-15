/**
 * optimize-images.mjs — بهینه‌سازی تصاویر حکیمستان
 *
 * کارها:
 *   ۱) ساخت نسخهٔ WebP از هر JPEG در پوشهٔ videos/ (کیفیت ۸۲، بدون بزرگ‌نمایی)
 *   ۲) ساخت نسخه‌های کوچک‌شده برای نمایش در شبکه (۴۸۰ و ۹۶۰ پیکسل عرض)
 *   ۳) گزارش میزان صرفه‌جویی حجم
 *
 * اجرا:
 *   npm i sharp && node tools/optimize-images.mjs
 *
 * فایل‌های اصلی دست‌نخورده می‌مانند؛ فایل‌های WebP کنار آن‌ها ساخته می‌شوند
 * چون HTML از <picture> با فالبک JPEG استفاده می‌کند.
 */
import sharp from 'sharp';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'videos');
const OUT_DIR = join(ROOT, 'videos', 'optimized');

const WEBP_QUALITY = 82;
const THUMB_WIDTHS = [480, 960];
const MAX_WIDTH = 1920;

const kb = (n) => (n / 1024).toFixed(0) + ' KB';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const entries = (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  let originalTotal = 0;
  let webpTotal = 0;
  const rows = [];

  for (const name of entries) {
    const src = join(SRC_DIR, name);
    const base = basename(name, extname(name));
    const srcSize = (await stat(src)).size;
    originalTotal += srcSize;

    const meta = await sharp(src).metadata();
    const targetWidth = Math.min(meta.width || MAX_WIDTH, MAX_WIDTH);

    // نسخهٔ کامل WebP
    const fullOut = join(OUT_DIR, `${base}.webp`);
    await sharp(src)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toFile(fullOut);
    const fullSize = (await stat(fullOut)).size;
    webpTotal += fullSize;

    // نسخه‌های کوچک برای srcset
    const variants = [];
    for (const w of THUMB_WIDTHS) {
      if (!meta.width || meta.width <= w) continue;
      const out = join(OUT_DIR, `${base}-${w}.webp`);
      await sharp(src)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
        .toFile(out);
      const s = (await stat(out)).size;
      webpTotal += s;
      variants.push(`${w}:${kb(s)}`);
    }

    rows.push({
      name,
      before: kb(srcSize),
      after: kb(fullSize),
      saving: (100 - (fullSize / srcSize) * 100).toFixed(0) + '%',
      variants: variants.join(' , ') || '—'
    });
  }

  console.log('\n  فایل'.padEnd(34) + 'قبل'.padStart(10) + 'WebP'.padStart(10) + 'صرفه'.padStart(8) + '  نسخه‌های کوچک');
  console.log('  ' + '─'.repeat(88));
  for (const r of rows) {
    console.log('  ' + r.name.padEnd(32) + r.before.padStart(10) + r.after.padStart(10) + r.saving.padStart(8) + '  ' + r.variants);
  }
  console.log('  ' + '─'.repeat(88));
  console.log(`  جمع JPEG: ${kb(originalTotal)}  →  جمع WebP (شامل نسخه‌های کوچک): ${kb(webpTotal)}`);
  console.log(`  کاهش کلی: ${(100 - (webpTotal / originalTotal) * 100).toFixed(0)}%\n`);
  console.log(`  خروجی در: videos/optimized/\n`);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
