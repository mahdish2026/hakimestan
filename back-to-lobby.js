/*!
 * back-to-lobby.js — دکمهٔ بازگشت به لابی (ریسپانسیو)
 * نسخه: 13.0.0
 * ساخته مهدی شریفیان
 *
 * تغییرات نسخهٔ ۱۳:
 *   ۱) آدرس لابی به‌صورت «نسبی» از عمق مسیر محاسبه می‌شود؛ پس روی هر میزبانی
 *      (دامنهٔ ریشه، زیرمسیر GitHub Pages، سرور محلی و…) درست کار می‌کند.
 *   ۲) اگر صفحه هیچ لینک نمایانی به لابی نداشته باشد، یک دکمهٔ بازگشت در
 *      انتهای صفحه اضافه می‌شود تا کاربر هرگز در بازی‌ها/ابزارها گیر نکند.
 */
(function () {
  'use strict';

  /* ── محاسبهٔ نسبی آدرس لابی ──
     ریشهٔ سایت از محل خودِ این فایل مشخص می‌شود (back-to-lobby.js همیشه
     کنار index.html است)، پس آدرس لابی روی هر میزبانی درست در می‌آید:
     دامنهٔ ریشه، زیرمسیر GitHub Pages، سرور محلی و… */
  var segs = location.pathname.split('/').filter(Boolean);
  var last = segs.length ? segs[segs.length - 1] : '';
  var LOBBY_URL = null;
  try {
    var scriptEl = document.currentScript ||
      (function () { /* حالت خاص: اجرای تأخیری */
        var all = document.querySelectorAll('script[src*="back-to-lobby"]');
        return all.length ? all[all.length - 1] : null;
      })();
    if (scriptEl) {
      var rootDir = new URL('.', new URL(scriptEl.src, location.href));
      var pageSegs = location.pathname.split('/').filter(Boolean);
      if (/\.html?$/i.test(pageSegs[pageSegs.length - 1] || '')) pageSegs.pop();
      var rootSegs = rootDir.pathname.split('/').filter(Boolean);
      var common = 0;
      while (common < pageSegs.length && common < rootSegs.length &&
             pageSegs[common] === rootSegs[common]) common++;
      var parts = [];
      for (var up = 0; up < pageSegs.length - common; up++) parts.push('..');
      for (var dn = common; dn < rootSegs.length; dn++) parts.push(rootSegs[dn]);
      parts.push('index.html');
      LOBBY_URL = parts.join('/') || 'index.html';
    }
  } catch (e) { LOBBY_URL = null; }
  if (!LOBBY_URL) {
    /* روش پشتیبان: عمق مسیر نسبت به ریشهٔ سایت */
    var depth = /\.html?$/i.test(last) ? segs.length - 1 : segs.length;
    LOBBY_URL = (depth > 0 ? new Array(depth + 1).join('../') : '') + 'index.html';
  }

  /* خودِ صفحهٔ لابی (index.html) دکمهٔ بازگشت نمی‌خواهد */
  if (last === '' || /^index\.html?$/i.test(last)) return;

  /* ── لیست دکمه‌هایی که باید زیرشون دکمهٔ لابی بیاد ── */
  var TARGET_BUTTONS = [
    'تصحیح و نتایج',
    'حالت شب',
    'بازنشانی کامل',
    'بارگذاری سؤال‌ها',
    'بارگذاری سوال‌ها',
    'ورود به پنل',
    'شروع ماجراجویی',
    'خروج از پنل',
    'ابزار کلاس',
    'بزن بریم کشف کنیم',
    'ادغام دفاتر',
    'ورود به اتاق',
    'تست با مثال آماده'
  ];

  var css = ''
    /* ── حالت پیش‌فرض: آیکون + متن ── */
    + '.btl-lobby-btn{'
    +   'display:inline-flex !important;'
    +   'align-items:center !important;'
    +   'justify-content:center !important;'
    +   'gap:9px !important;'
    +   'padding:12px 24px !important;'
    +   'margin:10px 0 !important;'
    +   'background:linear-gradient(145deg,#2a1a4a 0%,#1a0f33 100%) !important;'
    +   'color:#ffd98a !important;'
    +   'font-size:.9rem !important;'
    +   'font-weight:800 !important;'
    +   'font-family:Vazirmatn,Tahoma,sans-serif !important;'
    +   'text-decoration:none !important;'
    +   'border-radius:14px !important;'
    +   'border:2px solid #a78bfa !important;'
    +   'box-shadow:0 6px 20px rgba(109,40,217,.45) !important;'
    +   'cursor:pointer !important;'
    +   'direction:rtl !important;'
    +   'opacity:1 !important;'
    +   'visibility:visible !important;'
    +   'transition:all .3s cubic-bezier(.175,.885,.32,1.275) !important;'
    +   'white-space:nowrap !important;'
    + '}'
    + '.btl-lobby-btn:hover{'
    +   'transform:translateY(-3px) !important;'
    +   'border-color:#ffd98a !important;'
    +   'box-shadow:0 12px 32px rgba(109,40,217,.6) !important;'
    + '}'
    + '.btl-lobby-btn:active{transform:translateY(0) scale(.97) !important}'

    /* ── اجزای داخلی دکمه ── */
    + '.btl-lobby-btn .btl-icon{'
    +   'font-size:1.15rem !important;'
    +   'line-height:1 !important;'
    +   'display:inline-block !important;'
    + '}'
    + '.btl-lobby-btn .btl-text{'
    +   'display:inline-block !important;'
    +   'line-height:1 !important;'
    + '}'

    /* ── موبایل: فقط آیکون، گرد ── */
    + '@media(max-width:600px){'
    +   '.btl-lobby-btn{'
    +     'width:48px !important;'
    +     'height:48px !important;'
    +     'min-width:48px !important;'
    +     'padding:0 !important;'
    +     'border-radius:50% !important;'
    +     'gap:0 !important;'
    +   '}'
    +   '.btl-lobby-btn .btl-icon{'
    +     'font-size:1.4rem !important;'
    +   '}'
    +   '.btl-lobby-btn .btl-text{'
    +     'display:none !important;'
    +   '}'
    + '}'

    /* ── صفحه‌های خیلی کوچیک: حتی کوچیکتر ── */
    + '@media(max-width:380px){'
    +   '.btl-lobby-btn{'
    +     'width:42px !important;'
    +     'height:42px !important;'
    +     'min-width:42px !important;'
    +   '}'
    +   '.btl-lobby-btn .btl-icon{'
    +     'font-size:1.2rem !important;'
    +   '}'
    + '}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function normalizeText(s) {
    return (s || '')
      .replace(/\s+/g, ' ')
      .replace(/[يى]/g, 'ی')
      .replace(/[كک]/g, 'ک')
      .replace(/[ةه]/g, 'ه')
      .trim()
      .toLowerCase();
  }

  /* ── آیا عنصر الان برای کاربر قابل دیدن است؟ ── */
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var node = el;
    while (node && node !== document.body) {
      var cs = window.getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      node = node.parentElement;
    }
    return true;
  }

  /* ── نرمال‌سازی آدرس برای مقایسهٔ «همین صفحهٔ لابی است؟» ──
     '/index.html' و '/' و '/site/index.html' و '/site/' هم‌ارزش می‌شوند */
  function normPath(u) {
    try {
      var x = new URL(u, location.href);
      if (x.origin !== location.origin) return null; /* لینک بیرونی حساب نمی‌شود */
      return x.pathname.replace(/\/index\.html?$/i, '').replace(/\/$/, '');
    } catch (e) { return null; }
  }

  /* ── آیا هیچ لینک «نمایانی» به لابی روی صفحه هست؟ (جز خودِ دکمه‌های btl)
     دکمه‌های سفارشیِ مبتنی بر جاوااسکریپت می‌توانند با data-lobby-link="آدرس"
     خود را معرفی کنند تا دکمهٔ پشتیبان اضافه نشود ── */
  function hasVisibleLobbyLink() {
    var lobby = normPath(LOBBY_URL);
    if (lobby === null) return true; /* محاسبه نشد؟ دست نگه می‌داریم */
    var links = document.querySelectorAll('a[href], [data-lobby-link]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      /* خودِ دکمهٔ پشتیبان در این بررسی حساب نمی‌شود (وگرنه همیشه می‌ماند!) */
      if (a.id === 'btl-fallback' || (a.closest && a.closest('#btl-fallback'))) continue;
      var u = a.getAttribute('data-lobby-link') || a.getAttribute('href');
      if (normPath(u) !== lobby) continue;
      if (isVisible(a)) return true;
    }
    return false;
  }

  function findTargetButtons() {
    var all = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], .btn');
    var found = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.classList.contains('btl-lobby-btn')) continue;
      if (el.hasAttribute('data-btl-processed')) continue;
      var text = normalizeText(el.textContent || el.value || '');
      if (!text) continue;
      for (var j = 0; j < TARGET_BUTTONS.length; j++) {
        var target = normalizeText(TARGET_BUTTONS[j]);
        if (text === target || text.indexOf(target) !== -1) {
          found.push(el);
          break;
        }
      }
    }
    return found;
  }

  function buildLobbyButton() {
    var btn = document.createElement('a');
    btn.href = LOBBY_URL;
    btn.className = 'btl-lobby-btn';
    btn.setAttribute('aria-label', 'بازگشت به لابی حکیمستان');
    btn.setAttribute('title', 'بازگشت به لابی');
    btn.innerHTML = '<span class="btl-icon">🏠</span><span class="btl-text">بازگشت به لابی</span>';
    return btn;
  }

  /* ── شبکهٔ ایمنی: اگر هیچ راه نمایانی به لابی نبود،
     یک دکمه در انتهای صفحه اضافه کن؛ به محض ظاهرشدن لینک واقعی حذف می‌شود ── */
  function ensureFallback() {
    var existing = document.getElementById('btl-fallback');
    if (hasVisibleLobbyLink()) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    if (existing) return;
    if (!document.body) return;
    var wrap = document.createElement('div');
    wrap.id = 'btl-fallback';
    wrap.style.cssText = 'text-align:center;padding:6px 10px 26px';
    wrap.appendChild(buildLobbyButton());
    document.body.appendChild(wrap);
  }

  function attachButtons() {
    var targets = findTargetButtons();
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      target.setAttribute('data-btl-processed', '1');

      var lobbyBtn = buildLobbyButton();
      var parent = target.parentNode;
      if (!parent) continue;

      var cs = window.getComputedStyle(target);
      lobbyBtn.style.marginTop = (parseFloat(cs.marginBottom) || 10) + 'px';

      if (cs.display.indexOf('block') !== -1 || cs.display.indexOf('flex') !== -1) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%';
        wrapper.appendChild(lobbyBtn);
        if (target.nextSibling) {
          parent.insertBefore(wrapper, target.nextSibling);
        } else {
          parent.appendChild(wrapper);
        }
      } else {
        var br = document.createElement('br');
        if (target.nextSibling) {
          parent.insertBefore(br, target.nextSibling);
          parent.insertBefore(lobbyBtn, br.nextSibling);
        } else {
          parent.appendChild(br);
          parent.appendChild(lobbyBtn);
        }
      }
    }
    ensureFallback();
  }

  function init() { attachButtons(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (typeof MutationObserver !== 'undefined') {
    var timer = null;
    function setupObserver() {
      if (!document.body) return;
      new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(attachButtons, 200);
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    }
    if (document.body) setupObserver();
    else document.addEventListener('DOMContentLoaded', setupObserver);
  }
})();
