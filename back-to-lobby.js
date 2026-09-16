/*!
 * back-to-lobby.js — دکمهٔ بازگشت به لابی (مقاوم به تداخل)
 * نسخه: 10.0.0
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  var LOBBY_URL = '/hakimestan/index.html';

  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  var TARGET_BUTTONS = [
    'بازنشانی کامل',
    'بارگذاری سؤال‌ها',
    'بارگذاری سوال‌ها',
    'خروج',
    'بزن بریم کشف کنیم',
    'پشتیبان',
    'ورود به اتاق',
    'تست با مثال آماده'
  ];

  // ── CSS با !important برای غلبه بر تداخل ──
  var css = ''
    + '.btl-lobby-btn{'
    +   'display:inline-flex !important;'
    +   'align-items:center !important;'
    +   'justify-content:center !important;'
    +   'gap:9px !important;'
    +   'padding:12px 24px !important;'
    +   'margin:10px 0 !important;'
    +   'background:#2a1a4a !important;'
    +   'background-image:linear-gradient(145deg, #2a1a4a 0%, #1a0f33 100%) !important;'
    +   'color:#ffd98a !important;'
    +   'font-size:.9rem !important;'
    +   'font-weight:800 !important;'
    +   'font-family:Vazirmatn,Tahoma,sans-serif !important;'
    +   'letter-spacing:.3px !important;'
    +   'text-decoration:none !important;'
    +   'border-radius:14px !important;'
    +   'border:2px solid #a78bfa !important;'
    +   'box-shadow:0 6px 20px rgba(109,40,217,.45), inset 0 0 20px rgba(245,199,106,.08) !important;'
    +   'cursor:pointer !important;'
    +   'transition:transform .25s, box-shadow .3s, border-color .3s !important;'
    +   'direction:rtl !important;'
    +   'position:relative !important;'
    +   'opacity:1 !important;'
    +   'visibility:visible !important;'
    +   'text-shadow:none !important;'
    +   'overflow:hidden !important;'
    +   'line-height:1.4 !important;'
    +   'box-sizing:border-box !important;'
    +   'min-height:auto !important;'
    +   'min-width:auto !important;'
    +   'width:auto !important;'
    +   'height:auto !important;'
    + '}'
    + '.btl-lobby-btn:hover{'
    +   'transform:translateY(-3px) !important;'
    +   'border-color:#ffd98a !important;'
    +   'box-shadow:0 12px 32px rgba(109,40,217,.6), 0 0 30px rgba(245,199,106,.4) !important;'
    + '}'
    + '.btl-lobby-btn:active{transform:translateY(0) scale(.97) !important}'
    + '.btl-lobby-btn .btl-icon{'
    +   'font-size:1.15rem !important;'
    +   'filter:drop-shadow(0 0 6px rgba(245,199,106,.6)) !important;'
    +   'line-height:1 !important;'
    + '}'
    + '@media(max-width:480px){'
    +   '.btl-lobby-btn{padding:10px 18px !important;font-size:.82rem !important;border-radius:12px !important}'
    +   '.btl-lobby-btn .btl-icon{font-size:1rem !important}'
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
    var selector = 'button, a, [role="button"], input[type="button"], input[type="submit"], .btn';
    var all = document.querySelectorAll(selector);
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
    btn.setAttribute('title', 'بازگشت به لابی حکیمستان');

    // ── استایل اینلاین به عنوان پشتیبان (اگه CSS مسدود شد) ──
    btn.style.cssText = ''
      + 'display:inline-flex;'
      + 'align-items:center;'
      + 'justify-content:center;'
      + 'gap:9px;'
      + 'padding:12px 24px;'
      + 'margin:10px 0;'
      + 'background:#2a1a4a;'
      + 'background-image:linear-gradient(145deg, #2a1a4a 0%, #1a0f33 100%);'
      + 'color:#ffd98a;'
      + 'font-size:.9rem;'
      + 'font-weight:800;'
      + 'font-family:Vazirmatn,Tahoma,sans-serif;'
      + 'text-decoration:none;'
      + 'border-radius:14px;'
      + 'border:2px solid #a78bfa;'
      + 'box-shadow:0 6px 20px rgba(109,40,217,.45);'
      + 'cursor:pointer;'
      + 'direction:rtl;'
      + 'position:relative;'
      + 'opacity:1;'
      + 'visibility:visible;'
      + 'line-height:1.4;'
      + 'box-sizing:border-box;';

    btn.innerHTML = '<span class="btl-icon" style="font-size:1.15rem;line-height:1;">🏠</span><span>بازگشت به لابی</span>';
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
      var marginTop = parseFloat(cs.marginBottom) || 10;
      lobbyBtn.style.marginTop = marginTop + 'px';

      if (cs.display.indexOf('block') !== -1 || cs.display.indexOf('flex') !== -1) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;';
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
      var observer = new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(attachButtons, 200);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) setupObserver();
    else document.addEventListener('DOMContentLoaded', setupObserver);
  }
})();
