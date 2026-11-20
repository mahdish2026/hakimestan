/*!
 * sw.js — Service Worker حکیمستان
 * نسخه: 1.0.0
 *
 * راهبردها:
 *   • پوستهٔ برنامه (HTML/CSS/JS/آیکون) → Precache + Stale-While-Revalidate
 *   • ناوبری صفحه      → Network-First با فالبک آفلاین (offline.html)
 *   • تصاویر          → Cache-First با سقف تعداد
 *   • ویدیو و صدا      → شبکه؛ استثنا: صوت‌های آمادهٔ نقشستان و ممیزستان با کش و Range
 *   • منابع بیرونی     → Stale-While-Revalidate با سقف
 *
 * امنیت: درخواست‌های غیر-GET و مبدأهای ناشناس هرگز کش نمی‌شوند.
 */

'use strict';

const VERSION = 'hakim-v1.5.64';
const SHELL_CACHE = `${VERSION}-shell`;
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;
const IMAGES_CACHE = `${VERSION}-images`;
const EXTERNAL_CACHE = `${VERSION}-external`;
const KEEP_CACHES = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, IMAGES_CACHE, EXTERNAL_CACHE];

const MAX_IMAGES = 60;
const MAX_EXTERNAL = 30;

/* ── پوستهٔ اصلی: حتماً باید در نصب کش شود ─────────────────── */
const SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './games/math-geometry/style.css',
  './games/math-geometry/studio.css',
  './games/math-geometry/layout.css',
  './games/math-geometry/studio.js',
  './games/math-geometry/tools.js',
  './games/math-geometry/practice.js',
  './games/math-geometry/skills.js',
  './games/math-geometry/narration.js',
  './games/math-geometry/audio/symmetry.mp3',
  './games/math-geometry/audio/angles.mp3',
  './games/math-geometry/audio/quadrilaterals.mp3',
  './games/math-geometry/audio/mirror.mp3',
  './games/math-geometry/audio/center.mp3',
  './games/math-geometry/audio/rotation.mp3',
  './games/math-geometry/audio/tool-0.mp3',
  './games/math-geometry/audio/tool-1.mp3',
  './games/math-geometry/audio/tool-2.mp3',
  './games/math-geometry/audio/tool-3.mp3',
  './games/math-geometry/audio/tool-4.mp3',
  './games/math-geometry/audio/tool-5.mp3',
  './games/math-geometry/audio/tool-6.mp3',

  './games/math-geometry/data.js',
  './games/math-geometry/app.js',
  './assets/fonts/vazirmatn-100-900.woff2',
  './manifest.json',
  './icon.svg',
  './hakim-core.js',
  './css/a11y.css',
  './css/lobby.css?v=1405-07-kashi-light',
  './css/hakim-ui.css?v=1405-08-kashi-light',
  './js/hakim-a11y.js',
  './js/hakim-security.js',
  './js/hakim-theme.js',
  './js/hakim-sw-register.js',
  './js/hakim-read-aloud.js'
];

/* ── صفحات کلیدی که پیش‌بارگذاری می‌شوند (سبک‌ها) ──────────── */
const PREFETCH_PAGES = [
  './videos.html',
  './judges.html',
  './install-pwa.html',
  './math-learning.html',
  './games/math-geometry.html',
  './games/math-decimals.html',
  './games/math-decimals-teacher.html',
  './games/math-decimals/style.css',
  './games/math-decimals/data.js',
  './games/math-decimals/presentation.js',
  './games/math-decimals/diagnose.js',
  './games/math-decimals/display.js',
  './games/math-decimals/app.js',
  './games/math-decimals/workshop.js',
  './games/math-decimals/narration.js',
  './games/math-decimals/audio/tenths.mp3',
  './games/math-decimals/audio/place.mp3',
  './games/math-decimals/audio/line.mp3',
  './games/math-decimals/audio/compare.mp3',
  './games/math-decimals/audio/add.mp3',
  './games/math-decimals/audio/subtract.mp3',
  './games/math-decimals/audio/repeat.mp3',
  './games/math-decimals/audio/multiply.mp3',
  './games/math-decimals/audio/scale.mp3',
  './games/math-decimals/audio/market.mp3',
  './games/math-fasl2.html',
  './games/math-nesbat.html'
];

/* ── آزمایشگاه‌های تعاملی بازی lab2d ──────────────────────────
   این فایل‌ها سنگین‌اند (~۱۲۰ کیلوبایت هر یک) و برای نصب PWA
   پیش‌بارگذاری نمی‌شوند تا نصب روی اینترنت ضعیف کند نشود.
   در عوض: وقتی کاربر آنلاین است و مرورگر بی‌کار می‌شود، در
   پس‌زمینه کش می‌شوند تا آفلاین هم کار کنند. */
const LAB_APPS = [
  './games/lab2d-apps/hakim-gosh.html',
  './games/lab2d-apps/hakim-goosh.html',
  './games/lab2d-apps/hakim-pulley.html',
  './games/lab2d-apps/hakim-incline.html'
];

/** پیش‌بارگذاری آرام در زمان بی‌کاری مرورگر */
function prefetchLabApps() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const run = () => {
    (async () => {
      const cache = await caches.open(ASSETS_CACHE);
      for (const url of LAB_APPS) {
        try {
          const hit = await caches.match(url);
          if (hit) continue;
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (err) { /* اختیاری: در فرصت بعدی */ }
      }
    })();
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 8000 });
  else setTimeout(run, 4000);
}

/* ══════════════════════════════════════════════════════════
   نصب: کش‌کردن پوسته
   ══════════════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // هر فایل جداگانه تا یک خطای ۴۰۴ کل نصب را خراب نکند
    await Promise.all(SHELL_ASSETS.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (err) {
        console.warn('[sw] نصب: ناموفق در کش‌کردن', url, err.message);
      }
    }));

    const pages = await caches.open(PAGES_CACHE);
    await Promise.all(PREFETCH_PAGES.map(async (url) => {
      try {
        await pages.add(new Request(url, { cache: 'reload' }));
      } catch (err) { /* اختیاری */ }
    }));

    await self.skipWaiting();
  })());
});

/* ══════════════════════════════════════════════════════════
   فعال‌سازی: پاک‌سازی کش‌های قدیمی
   ══════════════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (name.startsWith('hakim-') && !KEEP_CACHES.includes(name)) {
        console.log('[sw] حذف کش قدیمی:', name);
        return caches.delete(name);
      }
      return undefined;
    }));

    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.disable(); } catch (e) {}
    }

    // کش‌کردن آرام آزمایشگاه‌های تعاملی در وقت بی‌کاری
    prefetchLabApps();
    await self.clients.claim();
  })());
});

/* ══════════════════════════════════════════════════════════
   ابزارهای کمکی
   ══════════════════════════════════════════════════════════ */
function isSameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; } catch (e) { return false; }
}

function isMedia(url) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v|mp3|wav|m4a|aac|flac|pdf)$/i.test(url.pathname);
}

function isImage(url) {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(url.pathname);
}

function isStaticAsset(request, url) {
  return ['style', 'script', 'font', 'manifest', 'worker'].includes(request.destination) ||
         /\.(css|js|mjs|woff2?|ttf|otf|eot|json|webmanifest)$/i.test(url.pathname);
}

function isNavigationRequest(request, url) {
  if (request.mode === 'navigate') return true;
  if (request.destination === 'document') return true;
  return /\.html?$/i.test(url.pathname) || url.pathname.endsWith('/');
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const removeCount = keys.length - maxEntries;
    // قدیمی‌ترین‌ها اول (ترتیب درج)
    for (let i = 0; i < removeCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[sw] ${cacheName}: ${removeCount} مورد قدیمی حذف شد`);
  } catch (e) {}
}

async function putSafe(cacheName, request, response) {
  // فقط پاسخ‌های موفق و same-origin (یا opaque برای منابع بیرونی) کش می‌شوند
  if (!response) return;
  if (response.status !== 200 && response.type !== 'opaque') return;
  if (response.headers.get('cache-control')?.includes('no-store')) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (e) {
    console.warn('[sw] کش‌کردن ناموفق:', e.message);
  }
}

/* ══════════════════════════════════════════════════════════
   راهبردها
   ══════════════════════════════════════════════════════════ */

/** Network-First برای ناوبری صفحه با فالبک آفلاین */
async function handleNavigation(event) {
  const request = event.request;
  try {
    const preload = self.registration.navigationPreload
      ? await event.preloadResponse
      : undefined;
    const response = preload || await fetch(request);
    await putSafe(PAGES_CACHE, request, response);
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // اگر همین صفحه قبلاً کش شده، همان را بده
    const byUrl = await caches.match(request.url, { ignoreSearch: true });
    if (byUrl) return byUrl;

    const offline = await caches.match('./offline.html');
    if (offline) return offline;

    return new Response(
      '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">' +
      '<title>آفلاین</title><body style="font-family:Tahoma;background:#0d0a1f;color:#f1ecff;' +
      'display:grid;place-items:center;height:100vh;margin:0;text-align:center">' +
      '<div><h1>اتصال اینترنت قطع است</h1><p>حکیمستان آفلاین در دسترس نیست.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

/** Cache-First برای دارایی‌های ایستا */
async function handleAsset(request) {
  // ignoreSearch عمداً حذف شده: لینک‌های نسخه‌دار (مثل lobby.css?v=...)
  // باید نسخهٔ تازه را بیاورند، نه نسخهٔ کهنهٔ کش‌شده را.
  const cached = await caches.match(request);
  if (cached) {
    // به‌روزرسانی در پس‌زمینه
    fetch(request).then((res) => putSafe(ASSETS_CACHE, request, res)).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    await putSafe(ASSETS_CACHE, request, response);
    return response;
  } catch (err) {
    return new Response('/* آفلاین: فایل در دسترس نیست */', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/** Cache-First با سقف برای تصاویر */
async function handleImage(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await putSafe(IMAGES_CACHE, request, response);
    trimCache(IMAGES_CACHE, MAX_IMAGES);
    return response;
  } catch (err) {
    // تصویر جانگهدار شفاف
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>';
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' }, status: 200 });
  }
}

/** Stale-While-Revalidate برای منابع بیرونی */
async function handleExternal(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const network = fetch(request).then((res) => {
    putSafe(EXTERNAL_CACHE, request, res);
    trimCache(EXTERNAL_CACHE, MAX_EXTERNAL);
    return res;
  }).catch(() => null);

  if (cached) return cached;
  const res = await network;
  if (res) return res;
  return new Response('', { status: 504 });
}

/* ══════════════════════════════════════════════════════════
   رویداد fetch
   ══════════════════════════════════════════════════════════ */
// Only allowlisted, bundled geometry and decimals clips use cached Range support.
// Other media retain the site's network-only policy.
function isGeometryAudio(url) {
  const prefix = new URL('games/math-geometry/audio/', self.registration.scope);
  if (url.origin !== prefix.origin || !url.pathname.startsWith(prefix.pathname)) return false;
  return /^(?:symmetry|angles|quadrilaterals|mirror|center|rotation|tool-[0-6])\.mp3$/.test(url.pathname.slice(prefix.pathname.length));
}
function isDecimalAudio(url) {
  const prefix=new URL('games/math-decimals/audio/',self.registration.scope);
  return url.origin===prefix.origin&&url.pathname.startsWith(prefix.pathname)&&/^(?:tenths|place|line|compare|add|subtract|repeat|multiply|scale|market)\.mp3$/.test(url.pathname.slice(prefix.pathname.length));
}
async function handleGeometryAudio(request) {
  const full = await caches.match(request.url, { ignoreSearch: true });
  if (!full || full.status !== 200) return fetch(request);
  const range = request.headers.get('range');
  if (!range) return full;
  const bytes = await full.arrayBuffer(), size = bytes.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  const invalid = () => new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  if (!match || (!match[1] && !match[2])) return invalid();
  let start, end;
  if (!match[1]) { const suffix = Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid(); start = Math.max(0, size - suffix); end = size - 1; }
  else { start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return invalid();
  end = Math.min(end, size - 1);
  return new Response(bytes.slice(start, end + 1), { status: 206, headers: { 'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end-start+1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // فقط GET کش می‌شود؛ POST/PUT/… مستقیم به شبکه
  if (request.method !== 'GET') return;


  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  // پروتکل‌های غیر http (مثل chrome-extension) نادیده گرفته شوند
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (isGeometryAudio(url) || isDecimalAudio(url)) { event.respondWith(handleGeometryAudio(request).catch(() => new Response('', {status:503}))); return; }
  // سایر Rangeها بدون تغییر به شبکه می‌روند.
  if (request.headers.get('range')) return;

  // ویدیو، صدا و PDF: همیشه شبکه (حجم بالا، پشتیبانی Range)
  if (isMedia(url)) return;

  event.respondWith((async () => {
    try {
      if (!isSameOrigin(request.url)) {
        return await handleExternal(request);
      }
      if (isNavigationRequest(request, url)) {
        return await handleNavigation(event);
      }
      if (request.destination === 'image' || isImage(url)) {
        return await handleImage(request);
      }
      if (isStaticAsset(request, url)) {
        return await handleAsset(request);
      }
      // بقیه: شبکه با فالبک کش
      try {
        const res = await fetch(request);
        return res;
      } catch (err) {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    } catch (err) {
      console.warn('[sw] خطای fetch:', request.url, err.message);
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});

/* ══════════════════════════════════════════════════════════
   پیام‌ها از صفحه
   ══════════════════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  const data = event.data || {};

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: VERSION });
      break;

    case 'CLEAR_CACHES':
      event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.map((n) => n.startsWith('hakim-') ? caches.delete(n) : null));
        event.ports[0]?.postMessage({ cleared: true });
      })());
      break;

    case 'CACHE_PAGE':
      event.waitUntil((async () => {
        try {
          const cache = await caches.open(PAGES_CACHE);
          await cache.add(new Request(data.url, { cache: 'reload' }));
          event.ports[0]?.postMessage({ ok: true });
        } catch (e) {
          event.ports[0]?.postMessage({ ok: false, error: e.message });
        }
      })());
      break;

    case 'CACHE_STATS':
      event.waitUntil((async () => {
        const stats = {};
        for (const name of KEEP_CACHES) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          stats[name] = keys.length;
        }
        event.ports[0]?.postMessage(stats);
      })());
      break;

    default:
      break;
  }
});

/* ══════════════════════════════════════════════════════════
   همگام‌سازی پس‌زمینه (اختیاری)
   ══════════════════════════════════════════════════════════ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'hakim-sync') {
    event.waitUntil(Promise.resolve());
  }
});

console.log('[sw] حکیمستان', VERSION, 'بارگذاری شد');
