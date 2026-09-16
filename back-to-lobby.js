/*!
 * back-to-lobby.js — نوار بازگشت به لابی (بالای صفحه)
 * نسخه: 2.0.0
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  var LOBBY_URL = '/hakimestan/index.html';

  // اگه توی لابی هستیم، کاری نکن
  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  // ── استایل ──
  var css = ''
    + '.btl-bar{'
    +   'position:fixed;'
    +   'top:0;left:0;right:0;'
    +   'z-index:99999;'
    +   'display:flex;align-items:center;'
    +   'padding:8px 14px;'
    +   'padding-top:calc(8px + env(safe-area-inset-top,0px));'
    +   'background:linear-gradient(180deg,rgba(13,10,31,.92),rgba(13,10,31,.78));'
    +   'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);'
    +   'border-bottom:1px solid rgba(245,199,106,.2);'
    +   'font-family:Vazirmatn,Tahoma,sans-serif;'
    +   'direction:rtl;'
    +   'transition:transform .3s,opacity .3s;'
    + '}'
    + '.btl-bar.btl-hidden{transform:translateY(-100%);opacity:0;pointer-events:none}'
    + '.btl-link{'
    +   'display:inline-flex;align-items:center;gap:6px;'
    +   'padding:6px 14px;'
    +   'background:linear-gradient(145deg,rgba(139,92,246,.25),rgba(109,40,217,.15));'
    +   'border:1.5px solid rgba(167,139,250,.5);'
    +   'color:#e0d4ff;'
    +   'border-radius:99px;'
    +   'font-size:.8rem;font-weight:800;'
    +   'text-decoration:none;'
    +   'transition:transform .2s,box-shadow .2s,border-color .2s;'
    +   'cursor:pointer;'
    + '}'
    + '.btl-link:hover{'
    +   'transform:translateY(-1px);'
    +   'border-color:#a78bfa;'
    +   'box-shadow:0 4px 14px rgba(139,92,246,.4);'
    + '}'
    + '.btl-link:active{transform:translateY(0) scale(.97)}'
    + '.btl-title{'
    +   'flex:1;text-align:center;'
    +   'color:#f5c76a;'
    +   'font-size:.82rem;font-weight:800;'
    +   'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
    +   'padding:0 10px;'
    + '}'
    + '.btl-spacer{width:90px;flex-shrink:0}'
    + 'body{padding-top:52px !important}'
    + '@media(max-width:480px){'
    +   '.btl-bar{padding:6px 10px;padding-top:calc(6px + env(safe-area-inset-top,0px))}'
    +   '.btl-link{padding:5px 10px;font-size:.72rem}'
    +   '.btl-title{font-size:.74rem}'
    +   '.btl-spacer{width:70px}'
    +   'body{padding-top:46px !important}'
    + '}';

  // ── تزریق استایل ──
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── ساخت نوار ──
  function makeBar() {
    // اگه body نبود، صبر کن
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', makeBar);
      return;
    }

    // اگه قبلاً اضافه شده، تکرار نکن
    if (document.querySelector('.btl-bar')) return;

    var title = document.title || 'حکیمستان';
    // حذف ایموجی‌های اول عنوان برای تمیزی
    title = title.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, '').trim();
    if (title.length > 40) title = title.slice(0, 38) + '…';

    var bar = document.createElement('div');
    bar.className = 'btl-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'نوار بازگشت به لابی');
    bar.innerHTML =
      '<a class="btl-link" href="' + LOBBY_URL + '" aria-label="بازگشت به لابی حکیمستان">🏠 بازگشت به لابی</a>' +
      '<div class="btl-title">' + title.replace(/[<>&]/g, '') + '</div>' +
      '<div class="btl-spacer"></div>';

    document.body.insertBefore(bar, document.body.firstChild);

    // اگه کاربر اسکرول کرد پایین، نوار محو بشه
    var lastY = 0;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y > 300 && y > lastY) {
          bar.classList.add('btl-hidden');
        } else {
          bar.classList.remove('btl-hidden');
        }
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  makeBar();
})();
