/*!
 * hakim-theme.js — هستهٔ هماهنگی تم و فضای لابی برای زیرصفحه‌های حکیمستان
 * نسخه: 1.0.0
 * ساخته مهدی شریفیان
 *
 * همان قراردادِ لابی (index.html) را این‌جا هم اجرا می‌کند تا انتخاب کاربر
 * بین همهٔ صفحه‌ها بماند و هویت بصری یکدست باشد:
 *   ۱) تم مشترک با کلید hakimestan_lobby_theme (kashi / ocean / sunny)
 *      و نگاشت تم‌های قدیمی به نزدیک‌ترین تمِ تازه — دقیقاً مثل لابی.
 *   ۲) بوم ستاره‌های «شبِ کاشی» (سبک و ۶۰fps؛ احترام به prefers-reduced-motion)
 *   ۳) هالهٔ نور دنبال‌کنندهٔ موس (فقط اشاره‌گر دقیق)
 *   ۴) حالت is-scrolled هدر + دکمهٔ بازگشت به بالا
 *   ۵) ورود پلکانی .reveal ها
 *
 * استفاده: <script src="js/hakim-theme.js" defer></script>
 * هر عنصری نباشد، بی‌سروصدا رد می‌شود؛ پس روی هر صفحه‌ای بی‌خطر است.
 */
(function (global) {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ── ۱) تم‌ها — یکسان با لابی ── */
  var THEMES = {
    kashi: { tc:'#fbf8f1', stars:['#008080','#d4af37'], dust:'0,128,128',  shoot:'212,175,55' },
    ocean: { tc:'#030a18', stars:['#67e8f9','#e7dcff'], dust:'103,232,249', shoot:'186,230,253' },
    sunny: { tc:'#eef3fa', stars:['#0d9488','#6366f1'], dust:'13,148,136',  shoot:'99,102,241' }
  };
  var LEGACY = { night:'kashi', lapis:'ocean', rooz:'sunny', forest:'kashi', shad:'kashi', candy:'kashi', modern:'sunny', sky:'sunny' };
  var THEME_KEY = 'hakimestan_lobby_theme';
  var starPal = { a:'#f4cd84', b:'#e7dcff', dust:'244,205,132', shoot:'255,225,170' };
  var current = 'kashi';

  function applyTheme(id, save) {
    if (LEGACY[id]) id = LEGACY[id];
    if (!THEMES[id]) id = 'kashi';
    current = id;
    document.body.setAttribute('data-theme', id);
    var p = THEMES[id];
    starPal = { a:p.stars[0], b:p.stars[1], dust:p.dust, shoot:p.shoot };
    if (global.__rebuildStars) global.__rebuildStars();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.tc);
    var opts = document.querySelectorAll('.theme-opt');
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-theme') === id;
      opts[i].classList.toggle('active', on);
      opts[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (save !== false) { try { localStorage.setItem(THEME_KEY, id); } catch (e) {} }
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme || 'kashi', false);

  /* پنل تم */
  var themeBtn = document.getElementById('themeBtn');
  var themePanel = document.getElementById('themePanel');
  if (themeBtn && themePanel) {
    themeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = themePanel.classList.toggle('open');
      themeBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (themePanel.classList.contains('open') && !themePanel.contains(e.target) && !themeBtn.contains(e.target)) {
        themePanel.classList.remove('open');
        themeBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && themePanel.classList.contains('open')) {
        themePanel.classList.remove('open');
        themeBtn.setAttribute('aria-expanded', 'false');
        themeBtn.focus();
      }
    });
    var themeOpts = themePanel.querySelectorAll('.theme-opt');
    for (var t = 0; t < themeOpts.length; t++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          applyTheme(btn.getAttribute('data-theme'));
          themePanel.classList.remove('open');
          themeBtn.setAttribute('aria-expanded', 'false');
        });
      })(themeOpts[t]);
    }
  }

  /* ── ۲) آسمان ستاره‌دار — پورتِ سبکِ همان موتور لابی ── */
  var canvas = document.getElementById('starsCanvas');
  var ctx = null;
  if (canvas && canvas.getContext) {
    try { ctx = canvas.getContext('2d', { alpha: true }); } catch (e) { ctx = null; }
  }
  if (canvas && ctx) {
    var W = 0, H = 0, dpr = 1, stars = [], dust = [], shoot = null, rafId = 0, running = false;
    var spriteA = null, spriteB = null, spriteDust = null;

    function makeSprite(color) {
      var s = document.createElement('canvas');
      s.width = s.height = 32;
      var c = s.getContext('2d');
      var g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, color);
      g.addColorStop(.35, color.replace(/[\d.]+\)$/, '.45)'));
      g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
      return s;
    }
    function hexToRgb(hex) {
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#ffffff');
      if (!m) return '255,255,255';
      return parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16);
    }
    function buildSprites() {
      spriteA = makeSprite('rgba(' + hexToRgb(starPal.a) + ',1)');
      spriteB = makeSprite('rgba(' + hexToRgb(starPal.b) + ',1)');
      spriteDust = makeSprite('rgba(' + starPal.dust + ',1)');
    }
    function seed() {
      stars = []; dust = [];
      var compact = W < 760;
      var n = compact ? 46 : 86;
      for (var i = 0; i < n; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .4, p: Math.random() * 6.28, s: Math.random() * 1.3 + .4, gold: Math.random() > .74 });
      }
      var nd = compact ? 9 : 16;
      for (var j = 0; j < nd; j++) {
        dust.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + 1, v: Math.random() * .18 + .06, a: Math.random() * 6.28, o: Math.random() * .34 + .12 });
      }
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      dpr = Math.min(W < 760 ? 1 : 1.25, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduceMotion) drawStatic();
    }
    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = .55;
        ctx.drawImage(s.gold ? spriteA : spriteB, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
      ctx.globalAlpha = 1;
    }
    function loop(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var i, s, d;
      for (i = 0; i < stars.length; i++) {
        s = stars[i];
        ctx.globalAlpha = .32 + .6 * Math.abs(Math.sin(t * 0.0011 * s.s + s.p));
        var r2 = s.r * 1.9;
        ctx.drawImage(s.gold ? spriteA : spriteB, s.x - r2, s.y - r2, r2 * 2, r2 * 2);
      }
      for (i = 0; i < dust.length; i++) {
        d = dust[i];
        d.y -= d.v; d.x += Math.sin(t * 0.0008 + d.a) * .18;
        if (d.y < -14) { d.y = H + 14; d.x = Math.random() * W; }
        var rr = d.r * 3;
        ctx.globalAlpha = d.o;
        ctx.drawImage(spriteDust, d.x - rr, d.y - rr, rr * 2, rr * 2);
      }
      if (!shoot && Math.random() < 0.004) {
        shoot = { x: W * (.2 + Math.random() * .7), y: H * Math.random() * .3, vx: -(4 + Math.random() * 4), vy: 2.2 + Math.random() * 2, life: 1 };
      }
      if (shoot) {
        shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life -= .02;
        ctx.globalAlpha = Math.max(0, shoot.life) * .8;
        ctx.strokeStyle = 'rgba(' + starPal.shoot + ',1)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(shoot.x - shoot.vx * 7, shoot.y - shoot.vy * 7); ctx.stroke();
        if (shoot.life <= 0 || shoot.x < -40 || shoot.y > H + 40) shoot = null;
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (running || reduceMotion) return; running = true; rafId = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(rafId); }
    buildSprites();
    global.__rebuildStars = function () { buildSprites(); if (reduceMotion) drawStatic(); };
    resize();
    start();
    window.addEventListener('resize', function () { buildSprites(); resize(); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  }

  /* ── ۳) هالهٔ نور موس ── */
  if (finePointer && !reduceMotion) {
    document.body.classList.add('has-pointer');
    var glow = document.getElementById('cursorGlow');
    if (glow) {
      var mx = window.innerWidth / 2, my = window.innerHeight / 2;
      var gx = mx, gy = my, glowFrame = 0, glowVisible = false;
      function runGlow() {
        glowFrame = 0;
        gx += (mx - gx) * .22;
        gy += (my - gy) * .22;
        glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
        if (Math.abs(mx - gx) + Math.abs(my - gy) > .5) glowFrame = requestAnimationFrame(runGlow);
      }
      document.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!glowVisible) { glowVisible = true; gx = mx; gy = my; }
        if (!glowFrame) glowFrame = requestAnimationFrame(runGlow);
      }, { passive: true });
      document.addEventListener('mouseleave', function () { glowVisible = false; });
    }
  }

  /* ── ۴) هدر و بازگشت به بالا ── */
  var toTop = document.getElementById('toTop');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      document.body.classList.toggle('is-scrolled', y > 24);
      if (toTop) toTop.classList.toggle('show', y > 700);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ── ۵) ورود پلکانی ── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: .06 });
    for (var r = 0; r < reveals.length; r++) {
      reveals[r].style.setProperty('--i', r % 6);
      io.observe(reveals[r]);
    }
  } else {
    for (var q = 0; q < reveals.length; q++) reveals[q].classList.add('in');
  }

  /* API کوچک برای صفحه‌ها */
  global.HakimTheme = {
    apply: applyTheme,
    get: function () { return current; }
  };
})(window);
