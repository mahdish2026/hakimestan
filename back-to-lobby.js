/*!
 * back-to-lobby.js — دکمهٔ بازگشت به لابی (ریسپانسیو)
 * نسخه: 12.0.0
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  var LOBBY_URL = '/hakimestan/index.html';

  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  /* ── لیست دکمه‌هایی که باید زیرشون دکمهٔ لابی بیاد ── */
  var TARGET_BUTTONS = [
    'تصحیح نتایج',
    'حالت شب',
    'بازنشانی کامل',
    'بارگذاری سؤال‌ها',
    'بارگذاری سوال‌ها',
    'ورود به پنل',
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

    /* ── صفحه‌های خیلی کوچیک: حتی کوچیک‌تر ── */
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
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) setupObserver();
    else document.addEventListener('DOMContentLoaded', setupObserver);
  }
})();
