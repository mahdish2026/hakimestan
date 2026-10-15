/*!
 * hakim-sw-register.js — ثبت Service Worker و منطق نصب PWA
 * نسخه: 1.0.0
 * ساخته مهدی شریفیان
 *
 * کارها:
 *   • ثبت sw.js با مسیر درست (ریشه یا زیرپوشه)
 *   • نمایش دکمهٔ «نصب برنامه» در صورت پشتیبانی مرورگر
 *   • اعلان «نسخهٔ جدید آماده است» + به‌روزرسانی با یک کلیک
 *   • نمایش وضعیت آنلاین/آفلاین به کاربر
 *   • API عمومی HakimPWA
 */
(function (global) {
  'use strict';

  if (!('serviceWorker' in navigator)) {
    if (global.HakimA11y && global.HakimA11y.announce) {
      // در مرورگرهای قدیمی PWA در دسترس نیست — سکوت می‌کنیم
    }
    global.HakimPWA = { supported: false, installable: false };
    return;
  }

  var isStandalone = global.matchMedia('(display-mode: standalone)').matches ||
                     global.navigator.standalone === true ||
                     document.referrer.indexOf('android-app://') === 0;

  var deferredPrompt = null;
  var registration = null;
  var updateReady = false;

  /* ── مسیر ریشه را از روی محل اسکریپت پیدا می‌کنیم ────────── */
  function basePath() {
    var scripts = document.querySelectorAll('script[src*="hakim-sw-register"]');
    var src = scripts.length ? scripts[scripts.length - 1].getAttribute('src') : 'js/hakim-sw-register.js';
    // 'js/...' یا '../js/...' → پیشوند ریشه
    var dir = src.replace(/[?#].*$/, '').replace(/js\/hakim-sw-register\.js.*$/, '');
    return dir;
  }

  var BASE = basePath();

  function url(rel) {
    return (BASE || '') + rel;
  }

  /* ── ثبت ────────────────────────────────────────────────── */
  function register() {
    navigator.serviceWorker.register(url('sw.js'), {
      scope: BASE || './',
      updateViaCache: 'none'
    }).then(function (reg) {
      registration = reg;
      if (global.HakimSec) global.HakimSec.store.set('pwa.registered', true);

      // اگر از قبل نسخهٔ جدید آماده بود
      if (reg.waiting) offerUpdate(reg);

      reg.addEventListener('updatefound', function () {
        var installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            offerUpdate(reg);
          }
        });
      });

      // بررسی به‌روزرسانی هر ۶ ساعت
      setInterval(function () { reg.update().catch(function () {}); }, 6 * 60 * 60 * 1000);

      if (baseDebug()) console.log('[PWA] Service Worker ثبت شد:', reg.scope);
    }).catch(function (err) {
      if (baseDebug()) console.warn('[PWA] ثبت Service Worker ناموفق:', err.message);
    });
  }

  function baseDebug() {
    return /(?:\?|&)pwa=debug(?:&|$)/.test(location.search);
  }

  /* ── پیام به SW ─────────────────────────────────────────── */
  function tellSW(msg) {
    return new Promise(function (resolve) {
      if (!navigator.serviceWorker.controller) return resolve(null);
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) { resolve(e.data); };
      navigator.serviceWorker.controller.postMessage(msg, [ch.port2]);
      setTimeout(function () { resolve(null); }, 1500);
    });
  }

  /* ── اعلان به‌روزرسانی ──────────────────────────────────── */
  function offerUpdate(reg) {
    if (updateReady) return;
    updateReady = true;

    var bar = document.createElement('div');
    bar.id = 'hk-update-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.style.cssText = [
      'position:fixed', 'inset-block-end:18px', 'inset-inline-end:18px',
      'z-index:2147483000', 'display:flex', 'align-items:center', 'gap:12px',
      'padding:12px 16px', 'border-radius:16px', 'max-width:min(420px,92vw)',
      'background:#141033', 'color:#f1ecff', 'font:600 .88rem/1.7 Vazirmatn,Tahoma,sans-serif',
      'border:1px solid rgba(255,255,255,.2)', 'box-shadow:0 14px 40px rgba(0,0,0,.5)',
      'direction:rtl'
    ].join(';');

    var text = document.createElement('span');
    text.textContent = 'نسخهٔ جدید حکیمستان آماده است.';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'به‌روزرسانی';
    btn.style.cssText = [
      'padding:8px 16px', 'border-radius:10px', 'border:0', 'cursor:pointer',
      'background:#f5c76a', 'color:#1b1035', 'font:800 .85rem Vazirmatn,Tahoma,sans-serif'
    ].join(';');

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'بستن پیام به‌روزرسانی');
    close.textContent = '✕';
    close.style.cssText = 'background:transparent;border:0;color:inherit;cursor:pointer;font-size:1rem';

    btn.addEventListener('click', function () {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      bar.remove();
      setTimeout(function () { location.reload(); }, 200);
    });
    close.addEventListener('click', function () { bar.remove(); });

    bar.appendChild(text);
    bar.appendChild(btn);
    bar.appendChild(close);
    document.body.appendChild(bar);

    if (global.HakimA11y) global.HakimA11y.announce('نسخهٔ جدید حکیمستان آماده است. برای به‌روزرسانی دکمهٔ به‌روزرسانی را بزنید.');
  }

  /* ── دکمهٔ نصب ─────────────────────────────────────────── */
  function makeInstallButton() {
    if (document.getElementById('hk-install-btn')) return null;
    var b = document.createElement('button');
    b.id = 'hk-install-btn';
    b.type = 'button';
    b.className = 'hk-install-btn';
    b.setAttribute('aria-label', 'نصب برنامهٔ حکیمستان روی دستگاه');
    b.innerHTML = '<span aria-hidden="true">⬇️</span> <span class="hk-install-text">نصب برنامه</span>';
    b.addEventListener('click', doInstall);
    return b;
  }

  function showInstallButton() {
    if (isStandalone) return;
    if (document.getElementById('hk-install-btn')) return;

    var b = makeInstallButton();
    if (!b) return;

    // جایگاه‌های ترجیحی برای قرارگیری دکمه
    var hosts = [
      '[data-pwa-install]',
      '.topbar .toptools',
      'header .nav',
      'header .actions',
      '.hero .row',
      '.hero-actions',
      'header',
      '.topbar'
    ];
    var host = null;
    for (var i = 0; i < hosts.length; i++) {
      var found = document.querySelector(hosts[i]);
      if (found && !found.querySelector('#hk-install-btn')) { host = found; break; }
    }

    injectStyle();

    if (host) {
      host.appendChild(b);
    } else {
      b.classList.add('hk-install-floating');
      document.body.appendChild(b);
    }
  }

  function injectStyle() {
    if (document.getElementById('hk-install-style')) return;
    var s = document.createElement('style');
    s.id = 'hk-install-style';
    s.textContent = [
      '.hk-install-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;',
      'padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.28);',
      'background:linear-gradient(145deg,#6d28d9,#4c1d95);color:#ffe9a8;',
      'font:800 .85rem Vazirmatn,Tahoma,sans-serif;cursor:pointer;white-space:nowrap}',
      '.hk-install-btn:hover{filter:brightness(1.12)}',
      '.hk-install-btn:focus-visible{outline:3px solid #5eead4;outline-offset:3px}',
      '.hk-install-floating{position:fixed;inset-block-start:76px;inset-inline-end:16px;z-index:9997}',
      '@media(max-width:600px){.hk-install-btn .hk-install-text{display:none}',
      '.hk-install-btn{padding:10px;border-radius:50%;width:44px;height:44px}}',
      '@media print{.hk-install-btn{display:none!important}}'
    ].join('');
    document.head.appendChild(s);
  }

  function doInstall() {
    if (!deferredPrompt) {
      // راهنمای دستی نصب
      var path = url('install-pwa.html');
      location.href = path;
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      if (baseDebug()) console.log('[PWA] انتخاب کاربر:', choice.outcome);
      deferredPrompt = null;
      var btn = document.getElementById('hk-install-btn');
      if (btn && choice.outcome === 'accepted') {
        btn.remove();
        if (global.HakimA11y) global.HakimA11y.announce('حکیمستان روی دستگاه شما نصب شد.');
      }
    });
  }

  /* ── وضعیت آنلاین/آفلاین ───────────────────────────────── */
  function onlineStatus() {
    function update() {
      var offline = !navigator.onLine;
      var banner = document.getElementById('hk-offline-banner');

      if (offline && !banner) {
        banner = document.createElement('div');
        banner.id = 'hk-offline-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.style.cssText = [
          'position:fixed', 'inset-block-start:0', 'inset-inline:0', 'z-index:9999',
          'padding:9px 16px', 'text-align:center', 'direction:rtl',
          'background:#7c2d12', 'color:#fff7ed',
          'font:700 .82rem Vazirmatn,Tahoma,sans-serif'
        ].join(';');
        banner.textContent = '📴 اتصال اینترنت قطع است — محتواهای ذخیره‌شده در دسترس‌اند.';
        document.body.appendChild(banner);
        if (global.HakimA11y) global.HakimA11y.announce('اتصال اینترنت قطع شد. حالت آفلاین فعال است.');
      } else if (!offline && banner) {
        banner.textContent = '✅ اتصال برقرار شد.';
        setTimeout(function () { banner.remove(); }, 2500);
        if (global.HakimA11y) global.HakimA11y.announce('اتصال اینترنت برقرار شد.');
      }
    }
    global.addEventListener('online', update);
    global.addEventListener('offline', update);
    update();
  }

  /* ── کنترل به‌روزرسانی خودکار ──────────────────────────── */
  function autoReloadOnUpdate() {
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      if (baseDebug()) console.log('[PWA] کنترلر تغییر کرد');
    });
  }

  /* ── راه‌اندازی ────────────────────────────────────────── */
  function init() {
    register();
    autoReloadOnUpdate();
    onlineStatus();

    global.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton();
    });

    global.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      var btn = document.getElementById('hk-install-btn');
      if (btn) btn.remove();
      if (global.HakimA11y) global.HakimA11y.announce('برنامهٔ حکیمستان نصب شد.');
    });

    // در iOS رویداد beforeinstallprompt وجود ندارد → راهنمای دستی
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !global.MSStream;
    if (isIOS && !isStandalone) {
      setTimeout(showInstallButton, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  global.HakimPWA = {
    version: '1.0.0',
    supported: true,
    get installable() { return !!deferredPrompt; },
    get standalone() { return isStandalone; },
    get registration() { return registration; },
    promptInstall: doInstall,
    showInstallButton: showInstallButton,
    clearCaches: function () { return tellSW({ type: 'CLEAR_CACHES' }); },
    getCacheStats: function () { return tellSW({ type: 'CACHE_STATS' }); },
    cachePage: function (u) { return tellSW({ type: 'CACHE_PAGE', url: u }); }
  };
})(typeof window !== 'undefined' ? window : this);
