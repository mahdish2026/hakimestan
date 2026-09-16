/*!
 * back-to-lobby.js — دکمهٔ بازگشت به لابی (رنگ لابی)
 * نسخه: 9.0.0
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  var LOBBY_URL = '/hakimestan/index.html';

  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  // ── لیست دکمه‌هایی که باید زیرشون دکمهٔ لابی بیاد ──
  var TARGET_BUTTONS = [
    'بازنشانی کامل',
    'بارگذاری سؤال‌ها',
    'بارگذاری سوال‌ها',
    'سؤال‌های خودت را بازی کن',
    'سوال‌های خودت را بازی کن',
    'ورود به اتاق',
    'تست با مثال آماده'
  ];

  // ── CSS: دقیقاً مثل تم لابی (بنفش + طلایی) ──
  var css = ''
    + '.btl-lobby-btn{'
    +   'display:inline-flex;align-items:center;justify-content:center;gap:9px;'
    +   'padding:12px 24px;'
    +   'margin:10px 0;'
    +   /* پس‌زمینهٔ بنفش عمیق مثل لابی */
    +   'background:linear-gradient(145deg, #2a1a4a 0%, #1a0f33 100%);'
    +   /* متن طلایی روشن مثل لابی */
    +   'color:#ffd98a;'
    +   'font-size:.9rem;font-weight:800;'
    +   'font-family:Vazirmatn,Tahoma,sans-serif;'
    +   'letter-spacing:.3px;'
    +   'text-decoration:none;'
    +   'border-radius:14px;'
    +   /* حاشیهٔ طلایی-بنفش مثل کارت‌های لابی */
    +   'border:1.5px solid rgba(167,139,250,.55);'
    /* درخشش بنفش و طلایی مثل لابی */
    +   'box-shadow:0 6px 20px rgba(109,40,217,.35), 0 0 0 0 rgba(245,199,106,.3);'
    +   'cursor:pointer;'
    +   'transition:transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s, border-color .3s, background .3s;'
    +   'direction:rtl;'
    +   'position:relative;'
    +   'overflow:hidden;'
    + '}'
    /* هالهٔ طلایی مثل کارت‌های لابی */
    + '.btl-lobby-btn::before{'
    +   'content:"";'
    +   'position:absolute;'
    +   'top:0;right:0;left:0;'
    +   'height:3px;'
    +   'background:linear-gradient(90deg, transparent, #a78bfa, #ffd98a, #a78bfa, transparent);'
    +   'opacity:.85;'
    + '}'
    + '.btl-lobby-btn:hover{'
    +   'transform:translateY(-3px);'
    +   'border-color:#ffd98a;'
    +   'background:linear-gradient(145deg, #34205c 0%, #221540 100%);'
    +   'box-shadow:0 12px 30px rgba(109,40,217,.55), 0 0 30px rgba(245,199,106,.35);'
    + '}'
    + '.btl-lobby-btn:active{'
    +   'transform:translateY(0) scale(.97);'
    + '}'
    + '.btl-lobby-btn .btl-icon{'
    +   'font-size:1.15rem;'
    +   'filter:drop-shadow(0 0 6px rgba(245,199,106,.5));'
    + '}'
    + '@media(max-width:480px){'
    +   '.btl-lobby-btn{padding:10px 18px;font-size:.82rem;border-radius:12px}'
    +   '.btl-lobby-btn .btl-icon{font-size:1rem}'
    + '}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── نرمال‌سازی متن ──
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
    btn.innerHTML = '<span class="btl-icon">🏠</span><span>بازگشت به لابی</span>';
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

      // اگه دکمهٔ اصلی block/flex هست، دکمهٔ ما رو توی یه wrapper وسط‌چین بذار
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
