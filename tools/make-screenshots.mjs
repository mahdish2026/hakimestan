/**
 * make-screenshots.mjs — ساخت فایل‌های screenshots/ از تصاویر موجود در videos/
 *
 * صفحهٔ judges.html انتظار چهار تصویر دارد:
 *   screenshots/lobby.jpg ، mancheh.jpg ، lab.jpg ، teacher-panel.jpg
 *
 * تصاویر videos/*.jpg اسکرین‌شات‌های واقعی همان بخش‌های برنامه هستند،
 * پس همان‌ها را با اندازهٔ استاندارد ۱۲۸۰×۷۲۰ در screenshots/ می‌نویسیم
 * و نسخهٔ WebP هم کنارشان می‌سازیم.
 *
 * اجرا: npm i sharp && node tools/make-screenshots.mjs
 */
import sharp from 'sharp';
import { stat, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MAP = [
  { out: 'lobby.jpg',        from: 'hakim-quest.jpg',        label: 'لابی حکیمستان' },
  { out: 'mancheh.jpg',      from: 'mancheh-online.jpg',     label: 'منچِ دانش آنلاین' },
  { out: 'lab.jpg',          from: 'lab2d.jpg',              label: 'آزمایشگاه ۲بعدی' },
  { out: 'teacher-panel.jpg',from: 'teacher-panel.jpg',      label: 'پنل معلم' }
];

const W = 1280, H = 720;

async function main() {
  const available = new Set(await readdir(join(ROOT, 'videos')));
  const kb = (n) => (n / 1024).toFixed(0) + ' KB';

  for (const item of MAP) {
    if (!available.has(item.from)) {
      console.log(`⚠ منبع ${item.from} پیدا نشد — ${item.out} ساخته نشد`);
      continue;
    }
    const src = join(ROOT, 'videos', item.from);
    const jpgOut = join(ROOT, 'screenshots', item.out);
    const webpOut = join(ROOT, 'screenshots', item.out.replace(/\.jpe?g$/i, '.webp'));

    // برش مرکزی به نسبت ۱۶:۹ و تغییر اندازه
    await sharp(src)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 84, progressive: true, mozjpeg: true })
      .toFile(jpgOut);

    await sharp(src)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 6 })
      .toFile(webpOut);

    const j = (await stat(jpgOut)).size;
    const w = (await stat(webpOut)).size;
    console.log(`✅ screenshots/${item.out.padEnd(18)} ${kb(j).padStart(8)}  (WebP: ${kb(w)}) — ${item.label}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
