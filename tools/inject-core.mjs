#!/usr/bin/env node
/**
 * inject-core.mjs — تزریق یکنواخت لایه‌های مشترک به همهٔ صفحات HTML حکیمستان
 *
 * برای هر فایل HTML:
 *   • <link rel="stylesheet" href="{prefix}css/a11y.css"> را در <head> اضافه می‌کند
 *   • اسکریپت‌های js/hakim-security.js ، js/hakim-a11y.js و js/hakim-sw-register.js
 *     را پیش از </body> اضافه می‌کند
 *
 * پیشوند مسیر بر اساس عمق فایل محاسبه می‌شود («» برای ریشه، «../» برای زیرپوشه‌ها).
 *
 * idempotent است: اجرای دوباره چیزی را تکراری نمی‌کند.
 * اجرا: node tools/inject-core.mjs [--check]
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');

const MARKER_START = '<!-- hakim-core:start -->';
const MARKER_END = '<!-- hakim-core:end -->';

const SKIP = new Set(['offline.html']); // این صفحه دستی ساخته شده است

async function htmlFiles(dir = ROOT, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'tools') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(full, acc);
    else if (e.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function prefixFor(absPath) {
  const rel = relative(ROOT, dirname(absPath)) || '';
  if (!rel) return '';
  const depth = rel.split(/[\\/]/).filter(Boolean).length;
  return '../'.repeat(depth);
}

function buildBlock(prefix) {
  return `${MARKER_START}
<link rel="stylesheet" href="${prefix}css/a11y.css">
${MARKER_END}`;
}

function buildScripts(prefix) {
  return `${MARKER_START}
<script src="${prefix}js/hakim-security.js" defer></script>
<script src="${prefix}js/hakim-a11y.js" defer></script>
<script src="${prefix}js/hakim-sw-register.js" defer></script>
${MARKER_END}`;
}

/**
 * تزریق پیش از یک تگ.
 *
 * ⚠ نکتهٔ مهم: بعضی صفحه‌ها داخل رشته‌های جاوااسکریپت خود «</head>» دارند
 * (قالب‌های Word و HTML برای خروجی گرفتن). اگر از lastIndexOf استفاده کنیم،
 * بلوک داخل کد جاوااسکریپت می‌افتد و در <head> واقعی هیچ‌چیز اضافه نمی‌شود.
 *
 * بنابراین برای </head> از «نخستین» رخداد و برای </body> از «آخرین»
 * رخداد استفاده می‌شود.
 */
function inject(html, block, tag, { first = false, after = false } = {}) {
  const idx = first ? html.indexOf(tag) : html.lastIndexOf(tag);
  if (idx === -1) return null;
  const at = after ? idx + tag.length : idx;
  return html.slice(0, at) + block + '\n' + html.slice(at);
}

async function main() {
  const files = await htmlFiles();
  let changed = 0;
  const report = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (SKIP.has(rel)) continue;

    let html = await readFile(file, 'utf8');
    const original = html;
    const prefix = prefixFor(file);
    const block = buildBlock(prefix);
    const scripts = buildScripts(prefix);

    // حذف نسخه‌های قبلی (اگر با همان نشانگر تزریق شده بودند)
    // حذف کامل بلوک قبلی همراه با فاصله‌های اطرافش تا خط خالی تکرار نشود
    html = html.replace(
      new RegExp(`\\s*${escapeRe(MARKER_START)}[\\s\\S]*?${escapeRe(MARKER_END)}\\s*`, 'g'), '\n');
    html = html.replace(/\n{3,}/g, '\n\n');

    if (!/<head[\s>]/i.test(html)) {
      report.push(['بدون <head>', rel]);
      continue;
    }
    if (!/<\/body\s*>/i.test(html)) {
      report.push(['بدون </body>', rel]);
      continue;
    }
    // سلامت: </head> واقعی باید پیش از <body> باشد
    const headAt = html.indexOf('</head>');
    const bodyAt = html.search(/<body[\s>]/i);
    if (headAt === -1 || (bodyAt !== -1 && headAt > bodyAt)) {
      report.push(['</head> نامعتبر', rel]);
      continue;
    }

    // CSS دسترس‌پذیری بلافاصله بعد از باز شدن <head> می‌آید تا با
    // بلوک متادیتا (که پیش از </head> تزریق می‌شود) هیچ‌وقت جابه‌جا نشود.
    let withHead = inject(html, block, '<head>', { first: true, after: true });
    if (withHead === null) withHead = inject(html, block, '</head>', { first: true });
    // اسکریپت‌ها پیش از لایهٔ کنتراست بیایند تا آن لایه همیشه آخرین چیز در سند بماند
    const contrastMarker = '<!-- hakim-contrast:start -->';
    const anchor = html.includes(contrastMarker) ? contrastMarker : '</body>';
    const withBoth = inject(withHead, scripts, anchor);

    if (withBoth !== original) {
      changed++;
      report.push([prefix ? `زیرپوشه (${prefix})` : 'ریشه', rel]);
      if (!CHECK_ONLY) await writeFile(file, withBoth, 'utf8');
    }
  }

  const mode = CHECK_ONLY ? 'بازبینی' : 'تزریق';
  console.log(`\n📄 ${mode} لایه‌های مشترک — ${files.length} فایل بررسی شد، ${changed} فایل ${CHECK_ONLY ? 'نیاز به تزریق دارد' : 'به‌روزرسانی شد'}\n`);
  for (const [note, rel] of report) console.log(`  • [${note}] ${rel}`);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((err) => { console.error(err); process.exit(1); });
