/*!
 * back-to-lobby.js — دکمهٔ بازگشت که فقط توی صفحهٔ اول دیده می‌شه
 * نسخه: 3.0.0
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

  var css = ''
    + '.btl-wrap{'
    +   'position:fixed;'
    +   'bottom:calc(20px + env(safe-area-inset-bottom,0px));'
    +   'right:calc(20px + env(safe-area-inset-right,0px));'
    +   'z-index:9999;'
    +   'font-family:Vazirmatn,Tahoma,sans-serif;'
    +   'direction:rtl;'
    +   'transition:opacity .5s ease,transform .5s ease;'
    +   'opacity:1;transform:translateY(0);'
    + '}'
    + '.btl-wrap.btl-hidden{'
    +   'opacity:0;'
    +   'transform:translateY(20px);'
    +   'pointer-events:none;'
    + '}'
    + '.btl-btn{'
    +   'display:inline-flex;align-items:center;justify-content:center;gap:8px;'
    +   'padding:12px 20px;'
    +   'background:linear-gradient(145deg,#8b5cf6,#6d28d9);'
    +   'color:#fff;'
    +   'font-size:.85rem;font-weight:800;'
    +   'text-decoration:none;'
    +   'border-radius:99px;'
    +   'border:2px solid rgba(255,255,255,.35);'
    +   'box-shadow:0 10px 30px rgba(109,40,217,.5);'
    +   'cursor:pointer;'
    +   'transition:transform .2s,box-shadow .2s;'
    +   'animation:btlPulse 2.5s ease-in-out infinite;'
    + '}'
    + '.btl-btn:hover{'
    +   'transform:translateY(-2px) scale(1.03);'
    +   'box-shadow:0 14px 36px rgba(109,40,217,.7);'
    + '}'
    + '.btl-btn:active{transform:translateY(0) scale(.97)}'
    + '@keyframes btlPulse{'
    +   '0%,100%{box-shadow:0 10px 30px rgba(109,40,217,.5),0 0 0 0 rgba(139,92,246,.45)}'
    +   '50%{box-shadow:0 10px 30px rgba(109,40,217,.5),0 0 0 12px rgba(139,92,246,0)}'
    + '}'
    + '@media(max-width:480px){'
    +   '.btl-wrap{bottom:calc(14px + env(safe-area-inset-bottom,0px));right:calc(14px + env(safe-area-inset-right,0px))}'
    +   '.btl-btn{padding:10px 16px;font-size:.78rem}'
    + '}'
    + '@media (prefers-reduced-motion:reduce){'
    +   '.btl-btn{animation:none}'
    + '}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function attach() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', attach);
      return;
    }
    if (document.querySelector('.btl-wrap')) return;

    var wrap = document.createElement('div');
    wrap.className = 'btl-wrap';
    var link = document.createElement('a');
    link.className = 'btl-btn';
    link.href = LOBBY_URL;
    link.setAttribute('aria-label', 'بازگشت به لابی حکیمستان');
    link.innerHTML = '🏠 بازگشت به لابی';
    wrap.appendChild(link);
    document.body.appendChild(wrap);

    // ── مخفی کردن دکمه وقتی کاربر با صفحه تعامل می‌کنه ──
    var hidden = false;
    function hideOnce() {
      if (hidden) return;
      hidden = true;
      wrap.classList.add('btl-hidden');
      // پاک‌کردن listener ها بعد از اولین تعامل
      document.removeEventListener('click', hideOnce, true);
      document.removeEventListener('touchstart', hideOnce, true);
      document.removeEventListener('keydown', hideOnce, true);
    }

    // با اولین کلیک، لمس، یا کلید → محو شو
    // ولی اگه کاربر روی خود دکمه کلیک کرد، محو نشو (که کار کنه)
    document.addEventListener('click', function (e) {
      if (e.target.closest('.btl-wrap')) return;
      hideOnce();
    }, true);
    document.addEventListener('touchstart', function (e) {
      if (e.target.closest('.btl-wrap')) return;
      hideOnce();
    }, true);
    document.addEventListener('keydown', function (e) {
      // کلیدهای حرکتی رو نادیده بگیر
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      hideOnce();
    }, true);

    // اگه کاربر اسکرول کرد، هم محو شو
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      if (Math.abs(window.scrollY - lastY) > 60) {
        hideOnce();
      }
    }, { passive: true });
  }

  attach();
})();
