/*!
 * hakim-sw-register.js — ثبت Service Worker و منطق نصب PWA
 * نسخه: 1.0.0
 * ساخته مهدی شریفیان
 *
 * کارها:
 *   • ثبت sw.js با مسیر درست (ریشه یا زیرپوشه)
 *   • دکمهٔ «نصب برنامه» فقط در جایگاه صریح [data-pwa-install] صفحه
 *   • بنر پیشنهاد نصب در پایین صفحه (تأخیر ۴ ثانیه، قابل بستن برای ۷ روز)
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

  /* ── دکمهٔ نصب / پیشنهاد نصب ────────────────────────────── */
  var INSTALL_DISMISS_KEY = 'hakim.pwa.installDismissedAt';
  var DAY_MS = 24 * 60 * 60 * 1000;
  var DISMISS_MS = 7 * DAY_MS;   // «فعلاً نه» → هفت روز سکوت
  var SUGGEST_DELAY = 4000;      // بنر با ۴ ثانیه تأخیر می‌آید تا مزاحم ورود نشود

  /* مهلتِ «دیگر نشان نده» را می‌خواند/می‌نویسد.
     ساختار ذخیره‌شده: { t: زمانِ ثبت، ms: مدت مهلت } */
  function readDismissRecord() {
    var v = null;
    if (global.HakimSec && global.HakimSec.store) {
      v = global.HakimSec.store.get('pwa.installDismissedAt', null);
    } else {
      try { v = JSON.parse(localStorage.getItem(INSTALL_DISMISS_KEY)); } catch (e) { v = null; }
    }
    return (v && typeof v.t === 'number') ? v : null;
  }

  function rememberDismiss(ms) {
    var record = { t: Date.now(), ms: ms };
    if (global.HakimSec && global.HakimSec.store) {
      global.HakimSec.store.set('pwa.installDismissedAt', record);
      return;
    }
    try { localStorage.setItem(INSTALL_DISMISS_KEY, JSON.stringify(record)); } catch (e) {}
  }

  function installDismissed() {
    var v = readDismissRecord();
    if (!v) return false;
    var ms = (typeof v.ms === 'number' && v.ms > 0) ? v.ms : DISMISS_MS;
    return (Date.now() - v.t) < ms;
  }

  function removeInstallSuggestion() {
    var bar = document.getElementById('hk-install-banner');
    if (bar) bar.remove();
  }

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

  /* دکمهٔ برچسب‌دار — فقط اگر صفحه جایگاه صریح [data-pwa-install] داشته باشد
     همان‌جا نشانده می‌شود؛ وگرنه هیچ دکمه‌ای به هدر صفحه‌ها تزریق نمی‌کنیم
     (دایرهٔ بنفش مبهم گوشهٔ صفحه حذف شد). */
  function showInstallButton() {
    if (isStandalone) return;
    if (document.getElementById('hk-install-btn')) return;

    var host = document.querySelector('[data-pwa-install]');
    if (!host || host.querySelector('#hk-install-btn')) return;

    var b = makeInstallButton();
    if (!b) return;

    injectStyle();
    host.appendChild(b);
  }

  /* بنر پیشنهاد نصب — نوار ثابت پایین صفحه، با تأخیر ۴ ثانیه.
     اگر کاربر «فعلاً نه» بزند تا هفت روز و اگر «نصب» بزند تا یک روز
     دیگر نشان داده نمی‌شود (کلید hakim.pwa.installDismissedAt). */
  function showInstallSuggestion() {
    if (isStandalone) return;
    if (document.getElementById('hk-install-banner')) return;
    if (installDismissed()) return;
    if (!document.body) return;

    injectStyle();

    var bar = document.createElement('div');
    bar.id = 'hk-install-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'پیشنهاد نصب برنامهٔ حکیمستان');

    var text = document.createElement('div');
    text.className = 'hk-ib-text';
    var title = document.createElement('strong');
    title.textContent = 'نصب حکیمستان روی این دستگاه';
    var sub = document.createElement('span');
    sub.textContent = 'مثل یک اپ واقعی — آفلاین، سریع و بدون فروشگاه';
    text.appendChild(title);
    text.appendChild(sub);

    var yes = document.createElement('button');
    yes.type = 'button';
    yes.id = 'hk-ib-yes';
    yes.textContent = '⬇️ نصب برنامه';

    var no = document.createElement('button');
    no.type = 'button';
    no.id = 'hk-ib-no';
    no.setAttribute('aria-label', 'فعلاً نه');
    no.title = 'فعلاً نه';
    no.textContent = '✕';

    yes.addEventListener('click', function () {
      // همان مهلت، این بار یک روز (تا مزاحم نشود ولی فرصت نصب بماند)
      rememberDismiss(DAY_MS);
      removeInstallSuggestion();
      doInstall();
    });

    no.addEventListener('click', function () {
      rememberDismiss(DISMISS_MS);
      removeInstallSuggestion();
      if (global.HakimA11y) global.HakimA11y.announce('پیشنهاد نصب بسته شد. تا هفت روز دیگر نشان داده نمی‌شود.');
    });

    bar.appendChild(text);
    bar.appendChild(yes);
    bar.appendChild(no);
    document.body.appendChild(bar);

    if (global.HakimA11y) {
      global.HakimA11y.announce('می‌توانید حکیمستان را مثل یک برنامهٔ واقعی روی این دستگاه نصب کنید.');
    }
  }

  /* پیشنهاد نصب را با تأخیر نشان می‌دهد (اگر جایگاه صریحی وجود ندارد) */
  function scheduleInstallSuggestion() {
    if (isStandalone) return;
    if (document.querySelector('[data-pwa-install]')) return;
    global.setTimeout(showInstallSuggestion, SUGGEST_DELAY);
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
      /* بنر پیشنهاد نصب: نوار تیرهٔ ثابت پایین صفحه */
      '#hk-install-banner{position:fixed;inset-inline:0;inset-block-end:0;z-index:2147482000;',
      'display:flex;align-items:center;gap:10px;flex-wrap:wrap;direction:rtl;',
      'padding:12px 14px;padding-block-end:calc(12px + env(safe-area-inset-bottom,0px));',
      'background:#141033;color:#f1ecff;border-block-start:1px solid rgba(255,255,255,.22);',
      'box-shadow:0 -10px 30px rgba(0,0,0,.45);',
      'font:600 .86rem/1.7 Vazirmatn,Tahoma,sans-serif;',
      'animation:hk-ib-in .35s ease-out both}',
      '.hk-ib-text{display:flex;flex-direction:column;gap:2px;flex:1 1 220px;min-width:0}',
      '.hk-ib-text strong{color:#ffffff;font-size:.95rem}',
      '.hk-ib-text span{color:#cfc6f2}',
      '#hk-ib-yes{padding:9px 16px;border:0;border-radius:11px;cursor:pointer;white-space:nowrap;',
      'background:#f5c76a;color:#1b1035;font:800 .85rem Vazirmatn,Tahoma,sans-serif}',
      '#hk-ib-yes:hover{filter:brightness(1.08)}',
      '#hk-ib-no{padding:4px 8px;border:0;border-radius:8px;background:transparent;color:inherit;',
      'cursor:pointer;font-size:1.05rem;line-height:1}',
      '#hk-ib-yes:focus-visible,#hk-ib-no:focus-visible{outline:3px solid #5eead4;outline-offset:3px}',
      '@keyframes hk-ib-in{from{transform:translateY(110%);opacity:0}to{transform:translateY(0);opacity:1}}',
      '@media print{#hk-install-banner,.hk-install-btn{display:none!important}}'
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
      // جایگاه صریح → دکمهٔ برچسب‌دار همان‌جا؛ وگرنه بنر پیشنهاد پایین صفحه
      if (document.querySelector('[data-pwa-install]')) showInstallButton();
      else scheduleInstallSuggestion();
    });

    global.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      var btn = document.getElementById('hk-install-btn');
      if (btn) btn.remove();
      removeInstallSuggestion();
      if (global.HakimA11y) global.HakimA11y.announce('برنامهٔ حکیمستان نصب شد.');
    });

    // در iOS رویداد beforeinstallprompt وجود ندارد → راهنمای دستی
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !global.MSStream;
    if (isIOS && !isStandalone) {
      global.setTimeout(function () {
        if (document.querySelector('[data-pwa-install]')) showInstallButton();
        else scheduleInstallSuggestion();
      }, 1200);
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
    showInstallSuggestion: showInstallSuggestion,
    hideInstallSuggestion: removeInstallSuggestion,
    clearCaches: function () { return tellSW({ type: 'CLEAR_CACHES' }); },
    getCacheStats: function () { return tellSW({ type: 'CACHE_STATS' }); },
    cachePage: function (u) { return tellSW({ type: 'CACHE_PAGE', url: u }); }
  };
})(typeof window !== 'undefined' ? window : this);
