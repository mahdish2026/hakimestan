/*!
 * back-to-lobby.js — دکمه‌ای که فقط توی صفحهٔ اول دیده می‌شه
 * نسخه: 6.0.0
 * ساخته مهدی شریفیان
 */
(function () {
  'use strict';

  var LOBBY_URL = '/hakimestan/index.html';

  var path = location.pathname.replace(/\/$/, '');
  if (path === '/hakimestan' || path === '/hakimestan/index.html' || path === '' || path === '/') {
    return;
  }

  // ── کلماتی که نشون می‌ده کاربر می‌خواد بازی رو شروع کنه ──
  var START_WORDS = [
    'شروع بازی', 'شروع ماجرا', 'شروع سفر', 'شروع کنیم', 'شروع کن',
    'آغاز بازی', 'آغاز سفر',
    'بزن بریم', 'بریم بازی', 'بریم شروع',
    'بازی رو شروع',
    'start game', 'play game', 'start'
  ];

  // ── کلماتی که نشون می‌ده کاربر برگشته به صفحهٔ اول ──
  var BACK_WORDS = [
    'بازی دوباره', 'بازی مجدد', 'دوباره بازی', 'از نو بازی',
    'دوباره شروع', 'شروع دوباره',
    'منوی اصلی', 'صفحه اصلی', 'به منو', 'بازگشت به منو', 'برگشت به خانه',
    'خروج از بازی', 'پایان بازی', 'خانه',
    'replay', 'again', 'restart', 'menu', 'home', 'back to menu'
  ];

  // ── CSS ──
  var css = ''
    + '.btl-btn{'
    +   'position:fixed;'
    +   'top:calc(14px + env(safe-area-inset-top,0px));'
    +   'left:calc(14px + env(safe-area-inset-left,0px));'
    +   'z-index:99999;'
    +   'width:44px;height:44px;'
    +   'display:flex;align-items:center;justify-content:center;'
    +   'background:linear-gradient(145deg,#8b5cf6,#6d28d9);'
    +   'color:#fff;'
    +   'font-size:1.2rem;'
    +   'text-decoration:none;'
    +   'border-radius:50%;'
    +   'border:2px solid rgba(255,255,255,.35);'
    +   'box-shadow:0 8px 24px rgba(109,40,217,.5);'
    +   'cursor:pointer;'
    +   'transition:opacity .3s ease,transform .3s ease,box-shadow .2s;'
    + '}'
    + '.btl-btn:hover{transform:translateY(-2px) scale(1.08);box-shadow:0 12px 30px rgba(109,40,217,.7)}'
    + '.btl-btn:active{transform:translateY(0) scale(.95)}'
    + '.btl-btn.btl-hide{'
    +   'opacity:0;'
    +   'transform:scale(.7);'
    +   'pointer-events:none;'
    + '}'
    + '@media(max-width:520px){'
    +   '.btl-btn{width:38px;height:38px;font-size:1rem;top:calc(10px + env(safe-area-inset-top,0px));left:calc(10px + env(safe-area-inset-left,0px))}'
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

    var btn = document.createElement('a');
    btn.className = 'btl-btn';
    btn.href = LOBBY_URL;
    btn.setAttribute('aria-label', 'بازگشت به لابی حکیمستان');
    btn.setAttribute('title', 'بازگشت به لابی');
    btn.innerHTML = '🏠';
    document.body.appendChild(btn);

    var hidden = false;

    function show() {
      if (!hidden) return;
      hidden = false;
      btn.classList.remove('btl-hide');
    }

    function hide() {
      if (hidden) return;
      hidden = true;
      btn.classList.add('btl-hide');
    }

    // ── API سراسری برای کنترل دستی ──
    window.btlControl = {
      show: show,
      hide: hide,
      isHidden: function () { return hidden; }
    };

    // ── متن دکمه رو نرمال‌سازی کن ──
    function normalize(s) {
      return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }
    function matchesAny(text, words) {
      for (var i = 0; i < words.length; i++) {
        if (text.indexOf(words[i].toLowerCase()) !== -1) return true;
      }
      return false;
    }

    // ── رصد کلیک کاربر روی دکمه‌های داخل صفحه ──
    document.addEventListener('click', function (e) {
      var target = e.target.closest(
        'button, a, [role="button"], [role="menuitem"], input[type="button"], input[type="submit"], .btn, .button, [data-action]'
      );
      if (!target) return;
      if (target === btn || target.classList.contains('btl-btn')) return;

      var text = normalize(target.textContent || target.value || '');
      if (!text || text.length > 60) return;

      // اول چک کن دکمهٔ برگشت (چون ممکنه با کلمات شروع همپوشانی داشته باشه)
      if (matchesAny(text, BACK_WORDS)) {
        show();
        return;
      }
      if (matchesAny(text, START_WORDS)) {
        hide();
      }
    }, true);

    // ── پشتیبانی از رویدادهای سفارشی ──
    window.addEventListener('btl:hide', hide);
    window.addEventListener('btl:show', show);
  }

  attach();
})();
