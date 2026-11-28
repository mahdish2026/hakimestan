/*!
 * sw.js — Service Worker حکیمستان
 * نسخه: 1.0.0
 *
 * راهبردها:
 *   • پوستهٔ برنامه (HTML/CSS/JS/آیکون) → Precache + Stale-While-Revalidate
 *   • ناوبری صفحه      → Network-First با فالبک آفلاین (offline.html)
 *   • تصاویر          → Cache-First با سقف تعداد
 *   • ویدیو و صدا      → شبکه؛ استثنا: صوت‌های آمادهٔ نقشستان و ممیزستان با کش و Range
 *   • منابع بیرونی     → مستقیم از شبکه، بدون کش برنامه
 *
 * امنیت: درخواست‌های غیر-GET و مبدأهای ناشناس هرگز کش نمی‌شوند.
 */

'use strict';

const VERSION = 'hakim-v1.5.124';
const SHELL_CACHE = `${VERSION}-shell`;
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;
const IMAGES_CACHE = `${VERSION}-images`;
const KEEP_CACHES = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, IMAGES_CACHE];

const MAX_IMAGES = 100;

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
  './assets/fonts/lalezar-400.woff2',
  './assets/fonts/amiri-400.woff2',
  './assets/fonts/amiri-700.woff2',
  './manifest.json',
  './icon.svg',
  './hakim-core.js',
  './back-to-lobby.js',
  './css/fonts.css',
  './css/azmoon-fonts.css',
  './css/a11y.css',
  './css/folio.css',
  './css/lobby.css?v=1405-09-hero-wrap',
  './css/hakim-ui.css?v=1405-08-kashi-light',
  './js/hakim-a11y.js',
  './js/hakim-companion.js',
  './js/hakim-worlds.js',
  './js/hakim-logo.js',
  './tools/serve.cjs',
  './js/hakim-cert.js',
  './js/hakim-map-motion.js',
  './css/hakim-cert.css',
  './assets/img/hakimestan-logo.svg',
  './assets/img/hakimestan-logo-light.svg',
  './assets/img/hakimestan-logo-stacked.svg',
  './assets/img/hakimestan-emblem.svg',
  './css/hakim-worlds.css',
  './css/hakim-tazhib.css',
  './assets/img/tazhib-cert-frame.webp',
  './assets/img/tazhib-shamseh.svg',
  './assets/img/tazhib-ganj-a4.webp',
  './js/hakim-scene-kit.js',
  './css/hakim-scenes.css',
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
  './privacy.html',
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
  './games/math-decimals/audio/product-column.mp3',
  './games/math-decimals/audio/scale.mp3',
  './games/math-decimals/audio/market.mp3',
  './games/math-fasl2.html',
  './games/math-nesbat.html',
  './games/math-olgoha.html',
  './games/math-learning-1.html',
  './games/math-time-mission.html',
  './games/kohan-diyar.html',
  './games/kohan-diyar/march.js',
  './games/kohan-diyar/march.css',
  './games/kohan-diyar/atlas.css',
  './games/hakim-quest.html',
  './games/hakim-cards.html',
  './games/hakim-treasure.html',
  './games/jadval-hekmat.html',
  './games/snake-ladder.html',
  './games/snake-ladder-online.html',
  './games/mancheh-online.html',
  './games/lab2d.html',
  './games/farsi5-vocab.html',
  './games/math-measurement.html',
  './games/math-measurement/style.css',
  './games/math-measurement/data.js',
  './games/math-measurement/app.js',
  './games/math-measurement/city.js',
  './games/math-stats.html',
  './games/math-stats/style.css',
  './games/math-stats/data.js',
  './games/math-stats/app.js',
  './games/math-stats/wheel.js',
  './games/farsi5-hamava.html',
  './games/farsi5-hamava/style.css',
  './games/farsi5-hamava/data.js',
  './games/farsi5-hamava/lessons.js',
  './games/farsi5-hamava/book.js',
  './games/farsi5-hamava/audio/ch1-kh-vav.mp3',
  './games/farsi5-hamava/audio/ch2-sin-sad-se.mp3',
  './games/farsi5-hamava/audio/ch3-te-ta.mp3',
  './games/farsi5-hamava/audio/ch4-ze-group.mp3',
  './games/farsi5-hamava/audio/ch5-he-ayn.mp3',
  './games/farsi5-hamava/audio/ch6-editor.mp3',
  './games/farsi5-hamava/app.js',
  './games/iran-geography.html',
  './cert-studio.html',
  './games/iran-geography/style.css',
  './games/iran-geography/map-geo.js',
  './games/iran-geography/data.js',
  './games/iran-geography/lessons.js',
  './games/iran-geography/lesson-view.js',
  './games/iran-geography/roadtrip.js',
  './games/iran-geography/audio/m1-population.mp3',
  './games/iran-geography/audio/m2-water.mp3',
  './games/iran-geography/audio/m3-industry.mp3',
  './games/iran-geography/audio/m4-roads.mp3',
  './games/iran-geography/audio/m5-governance.mp3',
  './games/iran-geography/audio/m6-neighbors.mp3',
  './games/iran-geography/app.js',
  './kelasyar.html',
  './masir-yadgiri.html',
  './azmoon-saz.html',
  './daftar.html',
  './tarh-dars.html',
  './darsgah.html',
  './hqf-converter.html',
  './css/teacher-studios.css',
  './css/teacher-studios-pro.css',
  './css/teacher-workdesk.css',
  './css/teacher-materials.css',
  './js/teacher-workdesk.js',
  './js/teacher-studio-pro.js',
  './js/teacher-studio-appearance.js',
  './assets/teacher-studios/question-atelier.svg',
  './assets/teacher-studios/lesson-atelier.svg',
  './payamresan.html',
  './css/messenger-workspace.css',
  './assets/messenger/conversation-orbit.svg',
  './assets/messenger/stardust.svg',
  './panels/teacher.html',
  './css/teacher-workspace.css',
  './assets/teacher/learning-garden.svg',
  './404.html',
  './assessment/decimals-check.html'
];

/* ── آزمایشگاه‌های تعاملی بازی lab2d و دارایی‌های پس‌زمینه ─────
   این فایل‌ها سنگین‌اند و برای نصب اولیهٔ PWA مسدودکننده نیستند
   تا نصب روی اینترنت ضعیف کند نشود؛ وقتی مرورگر بی‌کار می‌شود
   در پس‌زمینه کش می‌شوند تا آفلاین هم کار کنند. */
const LAB_APPS = [
  './games/lab2d-apps/hakim-gosh.html',
  './games/lab2d-apps/hakim-goosh.html',
  './games/lab2d-apps/hakim-pulley.html',
  './games/lab2d-apps/hakim-incline.html',
  './games/audio/mission-time-stage-1.mp3',
  './games/audio/mission-time-stage-2.mp3',
  './games/audio/mission-time-stage-3.mp3',
  './games/audio/mission-time-stage-4.mp3',
  './games/audio/mission-time-stage-5.mp3',
  './games/audio/mission-time-stage-6.mp3',
  './games/audio/mission-time-stage-7.mp3',
  './games/audio/mission-time-stage-8.mp3',
  './assets/audio/games-lab2d-voice-1.mp3',
  './assets/audio/games-lab2d-voice-2.mp3',
  './assets/audio/games-lab2d-voice-3.mp3',
  './assets/audio/games-lab2d-voice-4.mp3',
  './assets/audio/games-lab2d-voice-5.mp3',
  './assets/fonts/aref-ruqaa-400.woff2',
  './assets/fonts/aref-ruqaa-700.woff2',
  './assets/fonts/estedad-400.woff2',
  './assets/fonts/estedad-700.woff2',
  './assets/fonts/gandom-400.woff2',
  './assets/fonts/gulzar-400.woff2',
  './assets/fonts/harmattan-400.woff2',
  './assets/fonts/harmattan-700.woff2',
  './assets/fonts/iran-nastaliq-400.woff2',
  './assets/fonts/katibeh-400.woff2',
  './assets/fonts/markazi-text-400.woff2',
  './assets/fonts/markazi-text-700.woff2',
  './assets/fonts/mirza-400.woff2',
  './assets/fonts/mirza-700.woff2',
  './assets/fonts/noto-naskh-arabic-400.woff2',
  './assets/fonts/noto-naskh-arabic-700.woff2',
  './assets/fonts/noto-nastaliq-urdu-400.woff2',
  './assets/fonts/noto-nastaliq-urdu-700.woff2',
  './assets/fonts/parastoo-400.woff2',
  './assets/fonts/parastoo-700.woff2',
  './assets/fonts/sahel-vf.woff2',
  './assets/fonts/samim-400.woff2',
  './assets/fonts/samim-700.woff2',
  './assets/fonts/scheherazade-new-400.woff2',
  './assets/fonts/scheherazade-new-700.woff2',
  './assets/fonts/shabnam-400.woff2',
  './assets/fonts/shabnam-700.woff2',
  './assets/vendor/html2canvas.min.js',
  './assets/vendor/pdf.min.js',
  './assets/vendor/pdf.worker.min.js'
];

const EXTRACTED_IMAGES = [
  './assets/img/cert-frames/eslimi-gold.webp',
  './assets/img/cert-frames/eslimi-lajvard.webp',
  './assets/img/cert-frames/firouzeh.webp',
  './assets/img/cert-frames/gol-morgh.webp',
  './assets/img/cert-frames/kashi.webp',
  './assets/img/cert-frames/lacquer.webp',
  './assets/img/cert-frames/lajvard.webp',
  './assets/img/cert-frames/shahane.webp',
  './assets/img/cert-frames/toranj.webp',
  './assets/img/cert-frames/zomorrod.webp',
  './assets/img/cert-frames/eslimi-firouzeh.webp',
  './assets/img/cert-frames/eslimi-zereshki.webp',
  './assets/img/cert-frames/eslimi-sabz.webp',
  './assets/img/cert-frames/eslimi-siah.webp',
  './assets/img/cert-frames/eslimi-nili.webp',
  './assets/img/cert-frames/eslimi-golbahi.webp',
  './assets/img/cert-frames/eslimi-zar-lachak.webp',
  './assets/img/cert-frames/eslimi-banafsh.webp',
  './assets/img/cert-frames/eslimi-ghahvei.webp',
  './assets/img/cert-frames/eslimi-chandrang.webp',
  './assets/img/cert-frames/thumb/eslimi-gold.webp',
  './assets/img/cert-frames/thumb/eslimi-lajvard.webp',
  './assets/img/cert-frames/thumb/firouzeh.webp',
  './assets/img/cert-frames/thumb/gol-morgh.webp',
  './assets/img/cert-frames/thumb/kashi.webp',
  './assets/img/cert-frames/thumb/lacquer.webp',
  './assets/img/cert-frames/thumb/lajvard.webp',
  './assets/img/cert-frames/thumb/shahane.webp',
  './assets/img/cert-frames/thumb/toranj.webp',
  './assets/img/cert-frames/thumb/zomorrod.webp',
  './assets/img/cert-frames/thumb/eslimi-firouzeh.webp',
  './assets/img/cert-frames/thumb/eslimi-zereshki.webp',
  './assets/img/cert-frames/thumb/eslimi-sabz.webp',
  './assets/img/cert-frames/thumb/eslimi-siah.webp',
  './assets/img/cert-frames/thumb/eslimi-nili.webp',
  './assets/img/cert-frames/thumb/eslimi-golbahi.webp',
  './assets/img/cert-frames/thumb/eslimi-zar-lachak.webp',
  './assets/img/cert-frames/thumb/eslimi-banafsh.webp',
  './assets/img/cert-frames/thumb/eslimi-ghahvei.webp',
  './assets/img/cert-frames/thumb/eslimi-chandrang.webp',
  './assets/img/games-hakim-quest-art.png',
  './assets/img/games-hakim-quest-art-2.png',
  './assets/img/games-kohan-diyar-art.png',
  './assets/img/games-kohan-diyar-art-2.png',
  './assets/img/games-kohan-diyar-art-3.png',
  './assets/img/games-kohan-diyar-art-4.png',
  './assets/img/games-math-time-mission-art.jpeg',
  './assets/img/mission-time-history-sundial.jpg',
  './assets/img/mission-time-history-waterclock.jpg',
  './assets/img/mission-time-history-maragha.jpg',
  './assets/img/hamava-page-tazhib.webp',
  './assets/img/hamava-cover.webp'
];

/** پیش‌بارگذاری آرام در زمان بی‌کاری مرورگر */
function prefetchLabApps() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const run = () => {
    (async () => {
      const cache = await caches.open(ASSETS_CACHE);
      for (const url of LAB_APPS) {
        try {
          const hit = await matchSafe(url);
          if (hit) continue;
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (err) { /* اختیاری: در فرصت بعدی */ }
      }
      const imgCache = await caches.open(IMAGES_CACHE);
      for (const url of EXTRACTED_IMAGES) {
        try {
          const hit = await matchSafe(url);
          if (hit) continue;
          await imgCache.add(new Request(url, { cache: 'reload' }));
        } catch (err) { /* اختیاری */ }
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
// Storage can be unavailable even when the network is healthy.
async function matchSafe(key, options) {
  try { return await caches.match(key, options); } catch { return undefined; }
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
  if (!response || response.status !== 200 || response.redirected ||
      /(?:^|,)\s*(?:no-store|private)\b/i.test(response.headers.get('cache-control') || '')) return false;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    return true;
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
    if (!new URL(request.url).search) await putSafe(PAGES_CACHE, request, response);
    return response;
  } catch (err) {
    const cached = await matchSafe(request);
    if (cached) return cached;
    // A query may contain a class or invitation ID. Use only the plain public HTML as fallback.
    const page = new URL(request.url);
    if (page.search && /\.html?$/i.test(page.pathname)) {
      page.search = '';
      const base = await matchSafe(page.href);
      if (base) return base;
    }

    const offline = await matchSafe('./offline.html');
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
async function handleAsset(event) {
  const request = event.request;
  // ignoreSearch عمداً حذف شده: لینک‌های نسخه‌دار (مثل lobby.css?v=...)
  // باید نسخهٔ تازه را بیاورند، نه نسخهٔ کهنهٔ کش‌شده را.
  // A refreshed runtime entry takes precedence over the original install-time copy.
  const cached = await matchSafe(request, { cacheName: ASSETS_CACHE }) || await matchSafe(request);
  if (cached) {
    // به‌روزرسانی در پس‌زمینه
    event.waitUntil(fetch(request).then((res) => putSafe(ASSETS_CACHE, request, res)).catch(() => {}));
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
  const cached = await matchSafe(request);
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
  return url.origin===prefix.origin&&url.pathname.startsWith(prefix.pathname)&&/^(?:tenths|place|line|compare|add|subtract|repeat|multiply|product-column|scale|market)\.mp3$/.test(url.pathname.slice(prefix.pathname.length));
}
function isTimeMissionAudio(url) {
  const prefix=new URL('games/audio/',self.registration.scope);
  return url.origin===prefix.origin&&url.pathname.startsWith(prefix.pathname)&&/^mission-time-stage-[1-8]\.mp3$/.test(url.pathname.slice(prefix.pathname.length));
}
function isExtractedAudio(url) {
  const prefix=new URL('assets/audio/',self.registration.scope);
  return url.origin===prefix.origin&&url.pathname.startsWith(prefix.pathname)&&/^games-lab2d-voice-[1-5]\.mp3$/.test(url.pathname.slice(prefix.pathname.length));
}
// گفتار فارسی حکیم در درسنامه‌های هم‌آواستان و ایران‌گرد کوچک
function isPhase5Audio(url) {
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return false;
  const rel = url.pathname.slice(scope.pathname.length);
  return /^games\/iran-geography\/audio\/m[1-6]-[a-z]+\.mp3$/.test(rel) || /^games\/farsi5-hamava\/audio\/ch[1-6]-[a-z-]+\.mp3$/.test(rel);
}
async function handleGeometryAudio(request) {
  let full = await matchSafe(request.url);
  if (!full || full.status !== 200) {
    const plainReq = new Request(request.url);
    const net = await fetch(plainReq);
    if (net && net.status === 200) {
      await putSafe(ASSETS_CACHE, plainReq, net);
      full = net;
    } else {
      return fetch(request);
    }
  }
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

  // External APIs and explicitly private requests must never use app storage.
  if (url.origin !== new URL(self.registration.scope).origin || request.cache === 'no-store' || request.headers.has('authorization')) return;

  if (isGeometryAudio(url) || isDecimalAudio(url) || isTimeMissionAudio(url) || isExtractedAudio(url) || isPhase5Audio(url)) { event.respondWith(handleGeometryAudio(request).catch(() => new Response('', {status:503}))); return; }
  // سایر Rangeها بدون تغییر به شبکه می‌روند.
  if (request.headers.get('range')) return;

  // ویدیو، صدا و PDF: همیشه شبکه (حجم بالا، پشتیبانی Range)
  if (isMedia(url)) return;

  event.respondWith((async () => {
    try {
      if (isNavigationRequest(request, url)) {
        return await handleNavigation(event);
      }
      if (request.destination === 'image' || isImage(url)) {
        return await handleImage(request);
      }
      if (isStaticAsset(request, url)) {
        return await handleAsset(event);
      }
      // بقیه: شبکه با فالبک کش
      try {
        const res = await fetch(request);
        return res;
      } catch (err) {
        const cached = await matchSafe(request);
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
          if (typeof data.url !== 'string') throw new Error('Invalid page');
          const scope = new URL(self.registration.scope);
          const url = new URL(data.url, scope);
          if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) ||
              url.search || (url.pathname !== scope.pathname && !/\.html?$/i.test(url.pathname))) throw new Error('Invalid page');
          const req = new Request(url.href, { cache: 'reload', redirect: 'error' });
          const response = await fetch(req);
          if (!await putSafe(PAGES_CACHE, req, response)) throw new Error('Page not cacheable');
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
