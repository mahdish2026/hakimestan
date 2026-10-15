#!/usr/bin/env node
/**
 * make-og-image.mjs — ساخت تصویر Open Graph (۱۲۰۰×۶۳۰)
 *
 * این تصویر در پیش‌نمایش لینک حکیمستان در تلگرام، واتس‌اپ، ایتا،
 * بله، توییتر و لینکدین نشان داده می‌شود.
 *
 * متن فارسی با فونت Vazirmatn رندر می‌شود. اگر فونت در دسترس نباشد،
 * نسخهٔ بدون متن ساخته می‌شود تا همیشه خروجی داشته باشیم.
 *
 * اجرا:  node tools/make-og-image.mjs
 */
import sharp from 'sharp';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'screenshots/og-cover.jpg');

const W = 1200, H = 630;
const GOLD = '#f2b23c';
const TEAL = '#2dd4bf';
const NIGHT = '#0e0a22';

const FONT_CANDIDATES = [
  '/home/user/.fonts/Vazirmatn-Bold.ttf',
  '/home/user/.fonts/Vazirmatn-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
];

/** فونت را به‌صورت data-URI در SVG جاسازی می‌کند */
async function loadFont() {
  for (const p of FONT_CANDIDATES) {
    if (existsSync(p)) {
      const b64 = (await readFile(p)).toString('base64');
      return `data:font/ttf;base64,${b64}`;
    }
  }
  return null;
}

/** گوشه‌های گرد برای تصویر */
function roundedMask(w, h, r) {
  return Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
  );
}

async function main() {
  const font = await loadFont();

  // ── تصویر اسکرین‌شات ──
  const shotSrc = join(ROOT, 'screenshots/lobby.jpg');
  const shotW = 540;
  const shot = await sharp(shotSrc).resize(shotW, null, { fit: 'inside' }).toBuffer();
  const sm = await sharp(shot).metadata();
  const shotX = 56;                       // سمت چپ (در چیدمان راست‌به‌چپ، انتها)
  const shotY = Math.round((H - sm.height) / 2);
  const shotRounded = await sharp(shot)
    .composite([{ input: roundedMask(sm.width, sm.height, 18), blend: 'dest-in' }])
    .png().toBuffer();

  // ── متن (اگر فونت داشتیم) ──
  const textX = W - 56;                   // لبهٔ راست، شروع خواندن فارسی
  const textBlock = font ? `
    <defs><style>
      @font-face { font-family:'HK'; src:url('${font}'); font-weight:700; }
      .t  { font-family:'HK', Tahoma, sans-serif; direction:rtl; text-anchor:start; }
    </style></defs>
    <text class="t" x="${textX}" y="252" font-size="72" font-weight="700" fill="#ffffff">حکیمستان</text>
    <text class="t" x="${textX}" y="312" font-size="30" fill="${GOLD}">دیار حکیم، سرزمین یادگیری</text>
    <rect x="${textX - 232}" y="352" width="232" height="3" rx="2" fill="${GOLD}" opacity=".55"/>
    <text class="t" x="${textX}" y="404" font-size="24" fill="#cfc7e6">بازی‌های آموزشی، آزمون‌ساز،</text>
    <text class="t" x="${textX}" y="438" font-size="24" fill="#cfc7e6">دفتر معلم و درسگاه ضبط تدریس</text>
    <text class="t" x="${textX}" y="512" font-size="26" fill="${TEAL}" font-weight="700">hakimistan.ir</text>
  ` : '';

  const overlay = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g1" cx="76%" cy="4%" r="70%">
          <stop offset="0%" stop-color="${GOLD}" stop-opacity=".34"/>
          <stop offset="60%" stop-color="#8b5cf6" stop-opacity=".14"/>
          <stop offset="100%" stop-color="${NIGHT}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g2" cx="4%" cy="98%" r="58%">
          <stop offset="0%" stop-color="${TEAL}" stop-opacity=".26"/>
          <stop offset="100%" stop-color="${NIGHT}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="${NIGHT}"/>
      <rect width="${W}" height="${H}" fill="url(#g1)"/>
      <rect width="${W}" height="${H}" fill="url(#g2)"/>
      <rect x="0" y="0" width="${W}" height="6" fill="${GOLD}" opacity=".9"/>
      ${textBlock}
    </svg>`
  );

  await sharp({ create: { width: W, height: H, channels: 3, background: NIGHT } })
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: shotRounded, top: shotY, left: shotX }
    ])
    .jpeg({ quality: 87, progressive: true, mozjpeg: true })
    .toFile(OUT);

  const st = await stat(OUT);
  console.log(`\n✅ ${OUT.replace(ROOT + '/', '')}  ${W}×${H}  ${Math.round(st.size / 1024)} کیلوبایت`);
  console.log(font ? '   با متن فارسی (فونت Vazirmatn)\n' : '   ⚠ بدون متن — فونت Vazirmatn پیدا نشد\n');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
