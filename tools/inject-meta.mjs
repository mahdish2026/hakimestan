#!/usr/bin/env node
/**
 * inject-meta.mjs — تزریق متادیتای کامل در <head> همهٔ صفحه‌ها
 *
 * ⚠ هشدار مهم دربارهٔ «نخستین / آخرین رخداد»:
 *   بعضی صفحه‌ها داخل <script> خود رشتهٔ «</head>» و «<style>» دارند
 *   (قالب Word و HTML برای خروجی گرفتن). هر جست‌وجوی متنی روی این
 *   فایل‌ها می‌تواند به داخل کد جاوااسکریپت بخورد.
 *
 *   بنابراین این ابزار «نخستین </head> پیش از <body>» را ملاک می‌گیرد
 *   و صریحاً از محدودهٔ <script>…</script> رد می‌شود.
 *
 * چه چیزی اضافه/تکمیل می‌کند:
 *   • <link rel="canonical">      → برای جلوگیری از محتوای تکراری در گوگل
 *   • Open Graph (og:*)           → پیش‌نمایش درست در تلگرام، واتس‌اپ، اینستاگرام
 *   • Twitter Card                → پیش‌نمایش در توییتر و لینکدین
 *   • <meta name="description">   → توضیح گمشده را از فهرست زیر می‌آورد
 *   • <meta name="theme-color">   → رنگ نوار مرورگر موبایل، از پس‌زمینهٔ خود صفحه
 *
 * همه چیز بین دو نشانگر تزریق می‌شود تا اجرای دوباره تکرار نسازد.
 *
 * اجرا:
 *   node tools/inject-meta.mjs --dry
 *   node tools/inject-meta.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');

const SITE = 'https://hakimistan.ir';
const SITE_NAME = 'حکیمستان';
const START = '<!-- hakim-meta:start -->';
const END = '<!-- hakim-meta:end -->';
const OG_IMAGE = `${SITE}/screenshots/og-cover.jpg`;

/** توضیحات صفحه‌هایی که description ندارند */
const DESCRIPTIONS = {
  '404.html': 'این نشانی در حکیمستان وجود ندارد. از صفحهٔ اصلی ادامه دهید — دیار حکیم، سرزمین یادگیری: بازی، آزمون‌ساز، دفتر معلم و درسگاه.',
  'games/hakim-quest.html': 'ماجرای حکیم — بازی آموزشی روایی در دیار حکیم. سفر، معما و انتخاب‌های اخلاقی برای دانش‌آموزان دبستان، در مرورگر و بدون نصب.',
  'games/jadval-hekmat.html': 'جدول حکمت — جدول کلمات آموزشی حکیمستان برای تقویت واژگان، املای فارسی و دانش عمومی دانش‌آموزان، مستقیم در مرورگر.',
  'games/kohan-diyar.html': 'فتح کهن دیار ایران — بازی آموزشی تاریخ و جغرافیای ایران. دانش‌آموزان با پاسخ درست، شهرها را آزاد و ایران را متحد می‌کنند.',
  'games/teacher.html': 'پنل معلم بازی فتح کهن دیار ایران — ساخت اتاق، مدیریت کلاس و دیدن پیشرفت دانش‌آموزان به‌صورت زنده.',
  'hqf-converter.html': 'مبدل آزمون‌ساز به HQF — فایل آزمون خود را به قالب استاندارد حکیمستان تبدیل کنید و در بازی‌ها و آزمون‌ها به کار ببرید.',
  'judges.html': 'معرفی پروژهٔ حکیمستان برای داوران جشنواره — معماری، فناوری‌های به‌کاررفته، دسترس‌پذیری، امنیت و امکانات آفلاین.',
  'offline.html': 'اتصال اینترنت قطع است. بخش زیادی از حکیمستان آفلاین کار می‌کند — می‌توانید به کار خود ادامه دهید.',
  'panels/teacher.html': 'پنل معلم حکیمستان — مدیریت کلاس، دانش‌آموزان، تکالیف و گزارش پیشرفت، همه در یک صفحه.',
  'videos.html': 'فیلم‌های آموزشی حکیمستان — مجموعهٔ ویدیوهای درس و کارگاه برای معلمان و دانش‌آموزان، با پخش روان روی موبایل.'
};

/** رنگ نوار مرورگر برای صفحه‌هایی که تعیین نکرده‌اند */
const THEME_COLORS = {
  'games/lab2d.html': '#08140a',
  'games/teacher.html': '#061c30',
  'hqf-converter.html': '#e7edff',
  'videos.html': '#faf8f3'
};

/* ══════════════ ابزار ══════════════ */

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** صفحه‌های خارج از ایندکس (نباید canonical و og داشته باشند) */
const NOINDEX = new Set(['404.html', 'offline.html']);


/**
 * مرزهای واقعی <head> را پیدا می‌کند و از محدودهٔ <script>…</script> رد می‌شود.
 * خروجی: { open, close } یا null اگر پیدا نشد.
 */
function findHeadBounds(text) {
  const lower = text.toLowerCase();
  const re = /<\/head\s*>|<script\b[^>]*>|<\/script\s*>|<body[\s>]/gi;
  let depth = 0;
  let m;
  while ((m = re.exec(text))) {
    const tok = m[0].toLowerCase();
    if (tok.startsWith('<script')) { depth = 1; continue; }
    if (tok.startsWith('</script')) { depth = 0; continue; }
    if (depth > 0) continue;                       // داخل اسکریپت — رد کن
    if (tok.startsWith('</head')) return { close: m.index };
    if (tok.startsWith('<body')) break;            // به body رسیدیم، head تمام شد
  }
  return null;
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
  let changed = 0;
  const log = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    let text = await readFile(file, 'utf8');
    const original = text;

    // حذف تزریق قبلی
    const prev = new RegExp(`\\s*${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
    text = text.replace(prev, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');

    // خواندن مقادیر موجود
    const titleM = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : SITE_NAME;

    const descM = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);
    const desc = (descM ? descM[1] : DESCRIPTIONS[rel] || '').replace(/\s+/g, ' ').trim();

    const themeM = text.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
    const theme = themeM ? themeM[1] : (THEME_COLORS[rel] || '');

    // نشانی کامل صفحه
    const url = rel === 'index.html' ? `${SITE}/` : `${SITE}/${rel}`;
    const noindex = NOINDEX.has(rel);

    const lines = [];
    if (!descM && desc) lines.push(`<meta name="description" content="${escapeAttr(desc)}">`);
    if (!themeM && theme) lines.push(`<meta name="theme-color" content="${escapeAttr(theme)}">`);

    if (!noindex) {
      lines.push(`<link rel="canonical" href="${url}">`);
      lines.push(`<meta property="og:type" content="website">`);
      lines.push(`<meta property="og:site_name" content="${SITE_NAME}">`);
      lines.push(`<meta property="og:locale" content="fa_IR">`);
      lines.push(`<meta property="og:title" content="${escapeAttr(title)}">`);
      if (desc) lines.push(`<meta property="og:description" content="${escapeAttr(desc)}">`);
      lines.push(`<meta property="og:url" content="${url}">`);
      lines.push(`<meta property="og:image" content="${OG_IMAGE}">`);
      lines.push(`<meta property="og:image:width" content="1280">`);
      lines.push(`<meta property="og:image:height" content="720">`);
      lines.push(`<meta property="og:image:alt" content="نمایی از حکیمستان — دیار حکیم، سرزمین یادگیری">`);
      lines.push(`<meta name="twitter:card" content="summary_large_image">`);
      lines.push(`<meta name="twitter:title" content="${escapeAttr(title)}">`);
      if (desc) lines.push(`<meta name="twitter:description" content="${escapeAttr(desc)}">`);
      lines.push(`<meta name="twitter:image" content="${OG_IMAGE}">`);
    } else {
      lines.push(`<meta name="robots" content="noindex, follow">`);
    }

    if (!lines.length) continue;

    const block = `${START}\n${lines.join('\n')}\n${END}\n`;

    // تزریق پیش از </head> واقعی — با اطمینان از اینکه داخل <script> نیستیم
    const bounds = findHeadBounds(text);
    if (!bounds) {
      log.push([rel, 'بدون </head> معتبر']);
      continue;
    }
    const idx = bounds.close;
    text = text.slice(0, idx) + block + text.slice(idx);

    if (text !== original) {
      changed++;
      log.push([rel, `${lines.length} خط`]);
      if (!DRY) await writeFile(file, text, 'utf8');
    }
  }

  console.log(`\n${DRY ? '🔍 پیش‌نمایش' : '✅ متادیتا تزریق شد'}\n`);
  console.log(`  صفحه‌های به‌روزشده: ${changed} از ${files.length}\n`);
  for (const [f, n] of log) console.log(`    ${f.padEnd(34)} ${n}`);
  console.log('');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
