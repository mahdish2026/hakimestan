/*!
 * back-to-lobby.js — دکمهٔ شناور بازگشت به لابی
 * نسخه: 1.0.0
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  // مسیر لابی در GitHub Pages
  var LOBBY_URL = '/hakimestan/index.html';

  // اگه خودمون توی لابی هستیم، دکمه رو نشون نده
  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  // استایل دکمه
  var css = ''
    + '.btl-btn{'
    +   'position:fixed;'
    +   'bottom:calc(20px + env(safe-area-inset-bottom,0px));'
    +   'right:calc(20px + env(safe-area-inset-right,0px));'
    +   'z-index:9999;'
    +   'display:flex;align-items:center;justify-content:center;'
    +   'width:56px;height:56px;border-radius:50%;'
    +   'background:linear-gradient(145deg,#8b5cf6,#6d28d9);'
    +   'color:#fff;font-size:1.5rem;text-decoration:none;'
    +   'box-shadow:0 8px 24px rgba(109,40,217,.45),0 0 0 0 rgba(139,92,246,.5);'
    +   'transition:transform .25s cubic-bezier(.175,.885,.32,1.275),box-shadow .3s;'
    +   'border:2px solid rgba(255,255,255,.3);'
    +   'animation:btlPulse 2.6s ease-in-out infinite;'
    + '}'
    + '.btl-btn:hover{transform:scale(1.12) rotate(-8deg);box-shadow:0 12px 32px rgba(109,40,217,.65),0 0 0 8px rgba(139,92,246,.15);}'
    + '.btl-btn:active{transform:scale(.94);}'
    + '.btl-btn .btl-label{'
    +   'position:absolute;right:calc(100% + 12px);'
    +   'background:rgba(20,14,40,.92);color:#ffd98a;'
    +   'padding:8px 14px;border-radius:12px;font-size:.82rem;font-weight:800;'
    +   'white-space:nowrap;font-family:Vazirmatn,Tahoma,sans-serif;'
    +   'opacity:0;transform:translateX(8px);pointer-events:none;'
    +   'transition:opacity .25s,transform .25s;'
    +   'border:1px solid rgba(245,199,106,.35);'
    + '}'
    + '.btl-btn:hover .btl-label{opacity:1;transform:translateX(0);}'
    + '@keyframes btlPulse{'
    +   '0%,100%{box-shadow:0 8px 24px rgba(109,40,217,.45),0 0 0 0 rgba(139,92,246,.5);}'
    +   '50%{box-shadow:0 8px 24px rgba(109,40,217,.45),0 0 0 14px rgba(139,92,246,0);}'
    + '}'
    + '@media(max-width:480px){'
    +   '.btl-btn{width:50px;height:50px;font-size:1.3rem;bottom:calc(16px + env(safe-area-inset-bottom,0px));right:calc(16px + env(safe-area-inset-right,0px));}'
    +   '.btl-btn .btl-label{display:none;}'
    + '}'
    + '@media (prefers-reduced-motion:reduce){'
    +   '.btl-btn{animation:none;}'
    + '}';

  // تزریق استایل
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ساخت دکمه
  var btn = document.createElement('a');
  btn.className = 'btl-btn';
  btn.href = LOBBY_URL;
  btn.setAttribute('aria-label', 'بازگشت به لابی حکیمستان');
  btn.setAttribute('title', 'بازگشت به لابی');
  btn.innerHTML = '🏠<span class="btl-label">بازگشت به لابی</span>';

  // اضافه کن به صفحه (صبر کن تا body آماده بشه)
  function attach() {
    if (document.body) {
      document.body.appendChild(btn);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(btn);
      });
    }
  }
  attach();

})();
