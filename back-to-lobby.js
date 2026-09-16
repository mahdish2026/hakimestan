/*!
 * back-to-lobby.js — دکمهٔ کوچیک بازگشت به لابی
 * نسخه: 5.0.0 — همیشه در دسترس، کم‌مزاحم
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  var LOBBY_URL = '/hakimestan/index.html';

  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  var css = ''
    + '.btl-btn{'
    +   'position:fixed;'
    +   'top:calc(14px + env(safe-area-inset-top,0px));'
    +   'left:calc(14px + env(safe-area-inset-left,0px));'
    +   'z-index:99999;'
    +   'width:44px;height:44px;'
    +   'display:flex;align-items:center;justify-content:center;'
    +   'background:rgba(20,14,40,.7);'
    +   'color:#ffd98a;'
    +   'font-size:1.15rem;'
    +   'text-decoration:none;'
    +   'border-radius:50%;'
    +   'border:1.5px solid rgba(245,199,106,.3);'
    +   'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'
    +   'box-shadow:0 4px 14px rgba(0,0,0,.25);'
    +   'opacity:.5;'
    +   'transition:opacity .25s,transform .25s,border-color .25s,box-shadow .25s;'
    +   'cursor:pointer;'
    + '}'
    + '.btl-btn:hover,.btl-btn:focus-visible{'
    +   'opacity:1;'
    +   'transform:scale(1.1);'
    +   'border-color:#ffd98a;'
    +   'box-shadow:0 6px 20px rgba(245,199,106,.45);'
    + '}'
    + '.btl-btn:active{transform:scale(.94)}'
    + '.btl-btn::after{'
    +   'content:"بازگشت به لابی";'
    +   'position:absolute;'
    +   'left:calc(100% + 10px);'
    +   'top:50%;'
    +   'transform:translateY(-50%);'
    +   'background:rgba(20,14,40,.95);'
    +   'color:#ffd98a;'
    +   'padding:6px 12px;'
    +   'border-radius:10px;'
    +   'font-family:Vazirmatn,Tahoma,sans-serif;'
    +   'font-size:.75rem;font-weight:800;'
    +   'white-space:nowrap;'
    +   'opacity:0;'
    +   'pointer-events:none;'
    +   'transition:opacity .2s;'
    +   'border:1px solid rgba(245,199,106,.35);'
    + '}'
    + '.btl-btn:hover::after{opacity:1}'
    + '@media(max-width:520px){'
    +   '.btl-btn{width:38px;height:38px;font-size:1rem;top:calc(10px + env(safe-area-inset-top,0px));left:calc(10px + env(safe-area-inset-left,0px))}'
    +   '.btl-btn::after{display:none}'
    + '}'
    + '@media (prefers-reduced-motion:reduce){'
    +   '.btl-btn{transition:none}'
    + '}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function attach() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', attach);
      return;
    }
    if (document.querySelector('.btl-btn')) return;

    var link = document.createElement('a');
    link.className = 'btl-btn';
    link.href = LOBBY_URL;
    link.setAttribute('aria-label', 'بازگشت به لابی حکیمستان');
    link.setAttribute('title', 'بازگشت به لابی');
    link.innerHTML = '🏠';
    document.body.appendChild(link);
  }

  attach();
})();
