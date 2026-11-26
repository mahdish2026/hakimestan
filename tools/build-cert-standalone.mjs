#!/usr/bin/env node
/**
 * ساخت نسخهٔ تک‌فایلی و آفلاین «ساخت گواهی و تقدیرنامه»
 * همهٔ فونت‌ها، تصویرها و اسکریپت‌ها درون یک فایل HTML جاسازی می‌شوند تا
 * بدون اینترنت و بدون سرور (با دوبار کلیک) باز شود.
 *
 *   node tools/build-cert-standalone.mjs  →  exports/cert-studio-standalone.html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'cert-studio.html');
const OUT_DIR = join(ROOT, 'exports');
const OUT = join(OUT_DIR, 'cert-studio-standalone.html');
const SITE = 'https://hakimistan.ir/';

const MIME = { '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const dataURI = rel => {
  const p = join(ROOT, rel);
  if (!existsSync(p)) throw new Error('فایل پیدا نشد: ' + rel);
  return `data:${MIME[extname(p)] || 'application/octet-stream'};base64,${readFileSync(p).toString('base64')}`;
};
const js = rel => readFileSync(join(ROOT, rel), 'utf8').replace(/<\/script/gi, '<\\/script');
const must = (html, re, label) => { if (!re.test(html)) throw new Error('الگو پیدا نشد: ' + label); };

let h = readFileSync(SRC, 'utf8');

// CSP صفحهٔ سایت برای فایل محلی لازم نیست (همه‌چیز درون‌خطی است)
must(h, /<meta http-equiv="Content-Security-Policy"[^>]*>/, 'CSP');
h = h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/, '');

// پیوندهای مخصوص سایت/PWA
h = h.replace(/<link rel="preload"[^>]*>\s*/g, '')
     .replace(/<link rel="manifest"[^>]*>/g, '')
     .replace(/<link rel="apple-touch-icon"[^>]*>/g, '')
     .replace(/href="icon\.svg"/g, `href="${dataURI('icon.svg')}"`);

// فونت‌ها
h = h.replace(/url\((['"]?)(assets\/fonts\/[^'")]+)\1\)/g, (_, q, rel) => `url("${dataURI(rel)}")`);

// CSS مشترک
h = h.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, rel) => `<style>${readFileSync(join(ROOT, rel), 'utf8')}</style>`);

// اسکریپت‌ها (ثبت Service Worker روی فایل محلی کاربردی ندارد)
h = h.replace(/<script src="js\/hakim-sw-register\.js"[^>]*><\/script>\s*/g, '');
h = h.replace(/<script src="([^"]+\.js)"( defer)?><\/script>/g, (m, rel) => {
  if (!existsSync(join(ROOT, rel))) throw new Error('اسکریپت پیدا نشد: ' + rel);
  return `<script>${js(rel)}</script>`;
});

// تصویرهای تذهیب
must(h, /const ASSET_FRAME = '[^']+';/, 'ASSET_FRAME');
h = h.replace(/const ASSET_FRAME = '([^']+)';/, (_, rel) => `const ASSET_FRAME = '${dataURI(rel)}';`)
     .replace(/const ASSET_SHAMSEH = '([^']+)';/, (_, rel) => `const ASSET_SHAMSEH = '${dataURI(rel)}';`);

// قاب‌های نگارگری تذهیب و اسلیمی (نشانی‌ها درون رشته‌های JS هستند)
must(h, /'assets\/img\/cert-frames\//, 'FRAME_IMGS');
h = h.replace(/'(assets\/img\/cert-frames\/[^']+\.webp)'/g, (_, rel) => `'${dataURI(rel)}'`);

// پیوند «خانه» به سایت حکیمستان
h = h.replace(/href="index\.html"/g, `href="${SITE}" target="_blank" rel="noopener"`);

// هیچ نشانی محلی باقی نماند
const left = [...h.matchAll(/(?:src|href)="(?!data:|https?:|#|\$\{|javascript:)([^"]+)"/g)].map(m => m[1]);
const leftUrl = [...h.matchAll(/url\((['"]?)(?!data:|#|\$\{|\+)([^'")]+)\1\)/g)].map(m => m[2]);
const leftJs = [...h.matchAll(/'(assets\/[^']+)'/g)].map(m => m[1]);
if (left.length || leftUrl.length || leftJs.length) throw new Error('ارجاع محلی باقی مانده: ' + [...left, ...leftUrl, ...leftJs].join(', '));

h = h.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!-- نسخهٔ تک‌فایلی و آفلاین «لوح‌نگار» حکیمستان (ساخت لوح تقدیر و گواهی) — ${new Date().toISOString().slice(0, 10)} — ${SITE} -->`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, h);
console.log(`✓ ${OUT.replace(ROOT + '/', '')} — ${(Buffer.byteLength(h) / 1048576).toFixed(2)} MB`);
