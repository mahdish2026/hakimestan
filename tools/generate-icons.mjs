/**
 * generate-icons.mjs — تولید مجموعهٔ آیکون‌های PWA حکیمستان از icon.svg
 *
 * اجرا:
 *   npm i sharp && node tools/generate-icons.mjs
 *
 * خروجی در پوشهٔ icons/ نوشته می‌شود:
 *   icon-48.png … icon-512.png  (purpose=any)
 *   maskable-192.png, maskable-512.png  (purpose=maskable، با ناحیهٔ امن)
 *   apple-touch-icon.png (۱۸۰×۱۸۰)
 *   favicon-32.png, favicon-16.png
 */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'icons');
const SRC = join(ROOT, 'icon.svg');
const BG = { r: 0x12, g: 0x0a, b: 0x1e, alpha: 1 }; // #120a1e

const ANY_SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];
const MASKABLE_SIZES = [192, 512];
const MASKABLE_SAFE_RATIO = 0.72; // محتوا در ۷۲٪ مرکز تا در ناحیهٔ امن بماند

async function render(svg, size, { padding = false } = {}) {
  const density = Math.max(96, Math.ceil((size / 512) * 384)) * 2;
  let pipeline = sharp(svg, { density });

  if (padding) {
    pipeline = pipeline.resize(Math.round(size * MASKABLE_SAFE_RATIO), Math.round(size * MASKABLE_SAFE_RATIO), {
      fit: 'contain',
      background: { ...BG, alpha: 0 }
    }).extend({
      top: Math.round(size * (1 - MASKABLE_SAFE_RATIO) / 2),
      bottom: Math.round(size * (1 - MASKABLE_SAFE_RATIO) / 2),
      left: Math.round(size * (1 - MASKABLE_SAFE_RATIO) / 2),
      right: Math.round(size * (1 - MASKABLE_SAFE_RATIO) / 2),
      background: BG
    });
  } else {
    pipeline = pipeline.resize(size, size, { fit: 'contain', background: { ...BG, alpha: 0 } });
  }

  return pipeline.png({ compressionLevel: 9, palette: false }).toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const svg = await readFile(SRC);

  const written = [];

  for (const size of ANY_SIZES) {
    const buf = await render(svg, size);
    const file = join(OUT, `icon-${size}.png`);
    await sharp(buf).toFile(file);
    written.push(file.replace(ROOT + '/', ''));
  }

  for (const size of MASKABLE_SIZES) {
    const buf = await render(svg, size, { padding: true });
    const file = join(OUT, `maskable-${size}.png`);
    await sharp(buf).toFile(file);
    written.push(file.replace(ROOT + '/', ''));
  }

  // آیکون اپل (بدون شفافیت)
  const apple = await sharp(await render(svg, 180)).flatten({ background: '#120a1e' }).png().toBuffer();
  await sharp(apple).toFile(join(OUT, 'apple-touch-icon.png'));
  written.push('icons/apple-touch-icon.png');

  // فاوآیکون‌های کوچک
  for (const size of [16, 32]) {
    const buf = await render(svg, size);
    await sharp(buf).toFile(join(OUT, `favicon-${size}.png`));
    written.push(`icons/favicon-${size}.png`);
  }

  console.log('✅ آیکون‌های ساخته‌شده:');
  for (const f of written) console.log('  •', f);
}

main().catch((err) => {
  console.error('❌ خطا در تولید آیکون‌ها:', err);
  process.exit(1);
});
