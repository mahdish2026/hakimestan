/**
 * inject-csp.mjs — تزریق سیاست امنیت محتوا (CSP) در همهٔ صفحه‌ها
 *
 * چرا؟ فایل `_headers` فقط روی Netlify / Cloudflare Pages خوانده می‌شود.
 * روی هر میزبان دیگری (از جمله GitHub Pages یا هر وب‌سرور سادهٔ دیگر)
 * صفحه‌ها بدون هیچ CSP اجرا می‌شدند. این ابزار همان سیاست را به شکل
 * «متا» داخل خود صفحه‌ها می‌گذارد تا امنیت لایه‌ای و مستقل از میزبان باشد.
 *
 * نکته‌ها:
 *   • `frame-ancestors` در متا پشتیبانی نمی‌شود و خطای کنسول می‌دهد → نمی‌گذاریم.
 *   • `upgrade-insecure-requests` هم گذاشته نمی‌شود؛ در پیش‌نمایش محلی http
 *     می‌تواند دارایی‌های صفحه را به https ارتقا دهد و بشکند. این کار
 *     وظیفهٔ `_headers` روی میزبان واقعی است.
 *   • میزبان‌های فونت اختیاری آزمون‌ساز (Google Fonts / jsDelivr) مجاز مانده‌اند.
 *   • idempotent است: اجرای دوباره چیزی را تغییر نمی‌دهد.
 *
 * اجرا:
 *   node tools/inject-csp.mjs [--dry]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'", // unsafe-eval لازم نیست: pdf.js با isEvalSupported:false کار می‌کند
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https: wss: blob:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

const START = '<!-- hakim-csp:start -->';
const END = '<!-- hakim-csp:end -->';
const BLOCK = `${START}\n<meta http-equiv="Content-Security-Policy" content="${CSP}">\n${END}\n`;

async function listHtml(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listHtml(full)));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = (await listHtml(ROOT)).sort();
let changed = 0, skipped = 0;

for (const file of files) {
  let html = await readFile(file, 'utf8');
  const rel = file.slice(ROOT.length + 1);

  // اگر CSP متای دستی از قبل هست، کاری نکن (مثلاً index.html)
  if (/<meta[^>]+http-equiv=["']Content-Security-Policy["']/i.test(html) && !html.includes(START)) {
    console.log(`= ${rel} — CSP متای دستی دارد؛ رد شد`);
    skipped++;
    continue;
  }

  if (html.includes(START)) {
    const re = new RegExp(`${START}[\\s\\S]*?${END}\\n?`);
    const next = html.replace(re, BLOCK);
    if (next === html) { skipped++; continue; }
    if (!DRY) await writeFile(file, next, 'utf8');
    console.log(`↻ ${rel} — به‌روزرسانی شد`);
    changed++;
    continue;
  }

  const headOpen = html.match(/<head[^>]*>/i);
  if (!headOpen) { console.log(`! ${rel} — <head> پیدا نشد`); skipped++; continue; }
  const at = headOpen.index + headOpen[0].length;
  const next = html.slice(0, at) + '\n' + BLOCK + html.slice(at);
  if (!DRY) await writeFile(file, next, 'utf8');
  console.log(`+ ${rel} — CSP افزوده شد`);
  changed++;
}

console.log(`\n${DRY ? '[dry] ' : ''}${changed} فایل تغییر کرد، ${skipped} فایل دست‌نخورده.`);
