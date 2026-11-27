/* ═══════════════════════════════════════════════════════════════════════
   حکیمستان — حرکت نقشهٔ یادگیری (HakimMapMotion)
   یک مسیر رنگی پشت کارت‌های مرحله می‌کشد و یک «مسافر» هم‌موضوع با بازی را
   از ایستگاه قبلی تا ایستگاه فعلی حرکت می‌دهد (مثل ماشین آمارستان و برج‌های پیمانه‌ستان).
   ─ بدون وابستگی؛ CSS خودش را تزریق می‌کند؛ aria-hidden و بدون گرفتن کلیک.
   ─ با «کاهش حرکت» فقط در ایستگاه فعلی پارک می‌شود.
   استفاده:
     HakimMapMotion.watch({ key, container, item, done(el), current(el)?, theme, label })
   ═══════════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';
  if (g.HakimMapMotion) return;
  var doc = g.document;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = function () {
    try {
      return (g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
        doc.documentElement.getAttribute('data-motion') === 'reduced' || doc.body.getAttribute('data-motion') === 'reduced';
    } catch (e) { return false; }
  };

  /* ── themes: rider svg (faces left = direction of RTL progress), route colours, ambient glyphs ── */
  var THEMES = {
    fraction: {
      label: 'چرخ کسری', color: '#d97706', soft: 'rgba(217,119,6,.18)', glyphs: ['½', '¾', '⅓', '¼', '⅔'], roll: true,
      svg: '<circle cx="20" cy="20" r="17" fill="#fff7d6" stroke="#b45309" stroke-width="2.4"/>' +
        '<path d="M20 20 L20 3 A17 17 0 0 1 37 20 Z" fill="#f97316"/><path d="M20 20 L37 20 A17 17 0 0 1 20 37 Z" fill="#fbbf24"/>' +
        '<path d="M20 3 V37 M3 20 H37" stroke="#b45309" stroke-width="2"/><circle cx="20" cy="20" r="3.2" fill="#7c2d12"/>'
    },
    balloon: {
      label: 'بالن نسبت', color: '#0e7490', soft: 'rgba(14,116,144,.16)', glyphs: ['۱:۲', '۳:۴', '٪', '۲:۵', '='], bob: true,
      svg: '<path d="M20 2 C8 2 4 11 4 16 C4 24 13 29 16 31 H24 C27 29 36 24 36 16 C36 11 32 2 20 2 Z" fill="#fb7185"/>' +
        '<path d="M20 2 C14 4 12 12 12 17 C12 24 15 29 16 31 H20 Z" fill="#fde68a"/><path d="M20 2 C26 4 28 12 28 17 C28 24 25 29 24 31 H20 Z" fill="#38bdf8"/>' +
        '<path d="M16 31 L17 34 M24 31 L23 34" stroke="#7c2d12" stroke-width="1.4"/><rect x="15.5" y="34" width="9" height="5" rx="1.5" fill="#a16207"/>'
    },
    pattern: {
      label: 'کرم الگو', color: '#7c3aed', soft: 'rgba(124,58,237,.16)', glyphs: ['▲', '●', '■', '◆', '★'], wiggle: true, flip: true,
      svg: '<circle class="b" cx="33" cy="25" r="5.5" fill="#22c55e"/><circle class="b" cx="25" cy="23" r="6" fill="#f59e0b"/>' +
        '<circle class="b" cx="16.5" cy="25" r="6.2" fill="#22c55e"/><circle cx="8" cy="21" r="7" fill="#f59e0b" stroke="#92400e" stroke-width="1.2"/>' +
        '<circle cx="5.6" cy="19.5" r="1.6" fill="#1f2937"/><circle cx="10" cy="19" r="1.6" fill="#1f2937"/>' +
        '<path d="M6 13 L4 9 M10 13 L11.5 9" stroke="#92400e" stroke-width="1.3" stroke-linecap="round"/><path d="M5.5 24 Q8 26 10.5 24" stroke="#92400e" stroke-width="1.2" fill="none"/>'
    },
    hammer: {
      label: 'چکش تقسیم', color: '#0369a1', soft: 'rgba(3,105,161,.16)', glyphs: ['÷', '۱۲', '۴', '۳', '='], hop: true,
      svg: '<g class="hk-mm-swing"><rect x="18" y="12" width="5" height="25" rx="2.2" fill="#a16207" stroke="#713f12" stroke-width="1"/>' +
        '<rect x="7" y="5" width="27" height="11" rx="3" fill="#64748b" stroke="#334155" stroke-width="1.4"/><rect x="7" y="5" width="6" height="11" rx="2" fill="#94a3b8"/>' +
        '<text x="22" y="14" text-anchor="middle" font-size="8" font-weight="900" fill="#fff" font-family="Vazirmatn,Tahoma,sans-serif">÷</text></g>'
    },
    time: {
      label: 'ساعت زمان‌پیما', color: '#b45309', soft: 'rgba(180,83,9,.16)', glyphs: ['⏳', '۱۲', '۳', '۶', '۹'], spin: true,
      svg: '<path d="M3 15 Q0 20 3 25 M6 12 Q2 20 6 28" stroke="#f59e0b" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<circle cx="22" cy="20" r="15" fill="#fffbeb" stroke="#b45309" stroke-width="2.6"/>' +
        '<g fill="#b45309"><circle cx="22" cy="7.5" r="1.3"/><circle cx="34.5" cy="20" r="1.3"/><circle cx="22" cy="32.5" r="1.3"/><circle cx="9.5" cy="20" r="1.3"/></g>' +
        '<g class="hk-mm-hand-l"><path d="M22 20 L22 9.5" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/></g>' +
        '<g class="hk-mm-hand-s"><path d="M22 20 L29 20" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round"/></g><circle cx="22" cy="20" r="2.2" fill="#1f2937"/>'
    },
    boat: {
      label: 'قایق ممیز', color: '#7a3d8f', soft: 'rgba(122,61,143,.16)', glyphs: ['۰٫۱', '۰٫۵', '٫', '۲٫۵', '۰٫۰۱'], rock: true, flip: true,
      svg: '<path d="M21 4 V27" stroke="#7c2d12" stroke-width="1.8"/><path d="M21 5 L36 25 H21 Z" fill="#fde68a" stroke="#b45309" stroke-width="1.2"/>' +
        '<path d="M20 9 L8 25 H20 Z" fill="#e9d5ff" stroke="#7a3d8f" stroke-width="1.2"/>' +
        '<text x="27" y="22" text-anchor="middle" font-size="6.5" font-weight="900" fill="#7c2d12" font-family="Vazirmatn,Tahoma,sans-serif">۰٫۵</text>' +
        '<path d="M3 28 H38 L33 35 H8 Z" fill="#7a3d8f"/><path d="M1 37 Q6 34 11 37 T21 37 T31 37 T40 37" stroke="#38bdf8" stroke-width="1.8" fill="none"/>'
    },
    plane: {
      label: 'هواپیمای کاغذی هندسه', color: '#1f6f8b', soft: 'rgba(31,111,139,.16)', glyphs: ['△', '□', '◯', '⬠', '∠'], hover: true, flip: true,
      svg: '<path d="M2 20 L38 6 L26 34 L19 24 Z" fill="#e0f2fe" stroke="#1f6f8b" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M38 6 L19 24 L17 33 L22 26" fill="#bae6fd" stroke="#1f6f8b" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M2 20 L19 24" stroke="#1f6f8b" stroke-width="1.2"/>'
    },
    simorgh: {
      label: 'سیمرغ حکمت', color: '#d99a26', soft: 'rgba(245,199,106,.24)', glyphs: ['✦', '🕯️', '📜', '✧', '🪶'], hover: true, flip: true,
      svg: '<defs><linearGradient id="hkMmSg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4cc"/><stop offset=".55" stop-color="#f5c76a"/><stop offset="1" stop-color="#c97a16"/></linearGradient></defs>' +
        '<path d="M22 21 C30 10 37 8 39 4 C36 13 31 18 24 22 Z" fill="url(#hkMmSg)" stroke="#7c4a08" stroke-width="1"/>' +
        '<path d="M22 23 C31 18 36 19 39 17 C35 23 29 25 23 25 Z" fill="#fde68a" stroke="#7c4a08" stroke-width=".9"/>' +
        '<path d="M23 25 C29 29 34 33 38 37 C31 35 26 31 21 26 Z" fill="#f59e0b" stroke="#7c4a08" stroke-width=".9"/>' +
        '<path d="M8 20 C12 15 18 16 24 20 C26 23 23 27 17 27 C12 27 9 24 8 20 Z" fill="url(#hkMmSg)" stroke="#7c4a08" stroke-width="1.2"/>' +
        '<circle cx="10.5" cy="19" r="4" fill="#fde68a" stroke="#7c4a08" stroke-width="1.1"/>' +
        '<path d="M7 19.5 L3.2 21 L7.2 21.8 Z" fill="#ea580c"/>' +
        '<path d="M11 15 C12 11 15 9 18 8 M13 15.5 C15 12.5 17.5 11.5 20 11" stroke="#f59e0b" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
        '<circle cx="9.6" cy="18.8" r="1.1" fill="#1e1b4b"/>'
    }
  };

  var CSS = '' +
    '.hk-mm-host{position:relative}' +
    '.hk-mm-item{position:relative;z-index:1}' +
    '.hk-mm-back,.hk-mm-front{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}' +
    '.hk-mm-back{z-index:0}.hk-mm-front{z-index:6}' +
    '.hk-mm-route-base{fill:none;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;opacity:.9}' +
    '.hk-mm-route-dash{fill:none;stroke:#fff;stroke-width:2;stroke-dasharray:2 9;stroke-linecap:round;opacity:.75}' +
    '.hk-mm-route-done{fill:none;stroke-width:9;stroke-linecap:round;stroke-linejoin:round}' +
    '.hk-mm-glyph{font:900 22px Vazirmatn,Tahoma,sans-serif;opacity:.22;animation:hkMmFloat 7s ease-in-out infinite}' +
    '.hk-mm-glyph:nth-child(2n){animation-duration:9s;animation-delay:-2s}.hk-mm-glyph:nth-child(3n){animation-duration:11s;animation-delay:-5s}' +
    '@keyframes hkMmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}' +
    '.hk-mm-rider{position:absolute;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;will-change:transform;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}' +
    '.hk-mm-rider svg{width:100%;height:100%;display:block;overflow:visible}' +
    '.hk-mm-body{transform-origin:50% 50%}' +
    '.hk-mm-rider.flip .hk-mm-face{transform:scaleX(-1);transform-origin:50% 50%}' +
    '.hk-mm-rider.idle.t-bob .hk-mm-body{animation:hkMmBob 2.6s ease-in-out infinite}' +
    '.hk-mm-rider.idle.t-rock .hk-mm-body{animation:hkMmRock 2.4s ease-in-out infinite}' +
    '.hk-mm-rider.idle.t-hover .hk-mm-body{animation:hkMmBob 2s ease-in-out infinite}' +
    '.hk-mm-rider.idle.t-hop .hk-mm-swing{animation:hkMmSwing 1.6s ease-in-out infinite;transform-origin:20px 34px}' +
    '.hk-mm-rider.idle.t-wiggle .b{animation:hkMmWig 1.2s ease-in-out infinite}.hk-mm-rider.idle.t-wiggle .b:nth-of-type(2){animation-delay:.2s}.hk-mm-rider.idle.t-wiggle .b:nth-of-type(3){animation-delay:.4s}' +
    '.hk-mm-rider.t-spin .hk-mm-hand-l{animation:hkMmTurn 6s linear infinite;transform-origin:22px 20px}.hk-mm-rider.t-spin .hk-mm-hand-s{animation:hkMmTurn 1.4s linear infinite;transform-origin:22px 20px}' +
    '.hk-mm-rider.moving.t-spin .hk-mm-hand-l{animation-duration:.8s}.hk-mm-rider.moving.t-spin .hk-mm-hand-s{animation-duration:.25s}' +
    '.hk-mm-rider.idle.t-roll .hk-mm-body{animation:hkMmBob 2.2s ease-in-out infinite}' +
    '@keyframes hkMmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
    '@keyframes hkMmRock{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}' +
    '@keyframes hkMmSwing{0%,70%,100%{transform:rotate(0)}80%{transform:rotate(-28deg)}90%{transform:rotate(6deg)}}' +
    '@keyframes hkMmWig{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
    '@keyframes hkMmTurn{to{transform:rotate(360deg)}}' +
    '.hk-mm-tag{position:absolute;left:0;top:0;transform:translate(-50%,-48px);white-space:nowrap;font:800 11px/1.6 Vazirmatn,Tahoma,sans-serif;color:#fff;padding:1px 9px;border-radius:999px;box-shadow:0 3px 8px rgba(0,0,0,.2)}' +
    '.hk-mm-burst{position:absolute;left:0;top:0;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;animation:hkMmBurst .9s ease-out forwards}' +
    '@keyframes hkMmBurst{from{box-shadow:0 0 0 0 rgba(250,204,21,.9);opacity:1}to{box-shadow:0 0 0 34px rgba(250,204,21,0);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){.hk-mm-glyph,.hk-mm-rider *,.hk-mm-burst{animation:none!important}}' +
    '[data-motion="reduced"] .hk-mm-glyph,[data-motion="reduced"] .hk-mm-rider *{animation:none!important}' +
    '@media print{.hk-mm-back,.hk-mm-front{display:none!important}}';

  function injectCss() {
    if (doc.getElementById('hk-mm-css')) return;
    var st = doc.createElement('style');
    st.id = 'hk-mm-css';
    st.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(st);
  }
  function shown(el) { return !!(el && (el.offsetWidth || el.offsetHeight) && el.getClientRects().length); }
  function el(tag, attrs, ns) {
    var e = ns ? doc.createElementNS(NS, tag) : doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function segPath(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      var my = (a.y + b.y) / 2;
      return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + a.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    var mx = (a.x + b.x) / 2, bend = Math.min(26, Math.abs(dx) * 0.12);
    return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + mx.toFixed(1) + ' ' + (a.y - bend).toFixed(1) + ' ' + mx.toFixed(1) + ' ' + (b.y - bend).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  function Watcher(cfg) {
    this.cfg = cfg;
    this.theme = THEMES[cfg.theme] || THEMES.fraction;
    this.sig = '';
    this.anim = 0;
    this.pos = null;
    this.storeKey = 'hk-mm:' + (cfg.key || cfg.theme || 'map');
    var self = this;
    this.sched = function () {
      if (self.t) return;
      self.t = setTimeout(function () { self.t = 0; self.sync(); }, 140);
    };
    this.mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var tg = list[i].target;
        if (tg && tg.closest && tg.closest('.hk-mm-back,.hk-mm-front')) continue;
        self.sched();
        return;
      }
    });
    this.mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    g.addEventListener('resize', function () { self.sig = ''; self.sched(); });
    if (g.ResizeObserver) this.ro = new ResizeObserver(function () { self.sched(); });
    this.sync();
  }

  Watcher.prototype.teardown = function () {
    if (this.back && this.back.parentNode) this.back.parentNode.removeChild(this.back);
    if (this.front && this.front.parentNode) this.front.parentNode.removeChild(this.front);
    this.back = this.front = null;
    this.host = null;
    this.sig = '';
    cancelAnimationFrame(this.anim);
  };

  Watcher.prototype.sync = function () {
    var cfg = this.cfg;
    var host = typeof cfg.container === 'string' ? doc.querySelector(cfg.container) : cfg.container;
    if (!host || !shown(host)) { if (this.host) this.teardown(); return; }
    var items = Array.prototype.filter.call(host.querySelectorAll(cfg.item), function (n) { return n.parentElement === host || cfg.deep; }).filter(shown);
    if (items.length < 2) { if (this.host) this.teardown(); return; }
    var doneFlags = items.map(function (n) { try { return !!cfg.done(n); } catch (e) { return false; } });
    var cur = -1;
    if (cfg.current) items.some(function (n, i) { var c = false; try { c = !!cfg.current(n); } catch (e) {} if (c) cur = i; return c; });
    if (cur < 0) { cur = doneFlags.indexOf(false); if (cur < 0) cur = items.length - 1; }
    var hr = host.getBoundingClientRect();
    var pts = items.map(function (n) {
      var r = n.getBoundingClientRect();
      return { x: r.left - hr.left + host.scrollLeft + Math.min(16, r.width * 0.1), y: r.top - hr.top + host.scrollTop + Math.min(6, r.height * 0.05) };
    });
    var sig = [Math.round(hr.width), Math.round(host.scrollHeight), cur, doneFlags.join('')].concat(pts.map(function (p) { return Math.round(p.x) + ',' + Math.round(p.y); })).join('|');
    if (sig === this.sig && this.host === host && this.back && this.back.isConnected) return;
    this.sig = sig;
    if (this.host !== host || !this.back || !this.back.isConnected) {
      this.teardown();
      this.host = host;
      if (g.getComputedStyle(host).position === 'static') host.classList.add('hk-mm-host');
      if (this.ro) { this.ro.disconnect(); this.ro.observe(host); }
    }
    items.forEach(function (n) { if (g.getComputedStyle(n).position === 'static') n.classList.add('hk-mm-item'); });
    this.draw(host, pts, doneFlags, cur);
  };

  Watcher.prototype.draw = function (host, pts, doneFlags, cur) {
    var th = this.theme, self = this;
    var W = Math.max(host.scrollWidth, host.clientWidth), H = Math.max(host.scrollHeight, host.clientHeight);
    this.mo.disconnect();
    if (!this.back) {
      this.back = el('svg', { 'class': 'hk-mm-back', 'aria-hidden': 'true', focusable: 'false' }, true);
      host.appendChild(this.back); /* appended (not prepended) so :nth-child rules of the game stay intact */
      this.front = el('div', { 'class': 'hk-mm-front', 'aria-hidden': 'true' });
      host.appendChild(this.front);
    }
    var back = this.back;
    back.setAttribute('width', W); back.setAttribute('height', H);
    back.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    back.style.width = W + 'px'; back.style.height = H + 'px';
    this.front.style.width = W + 'px'; this.front.style.height = H + 'px';
    while (back.firstChild) back.removeChild(back.firstChild);

    /* ambient glyphs (deterministic positions) */
    var gl = el('g', null, true);
    var seed = 7;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var count = Math.min(14, Math.max(6, Math.round((W * H) / 70000)));
    for (var k = 0; k < count; k++) {
      var t = el('text', { 'class': 'hk-mm-glyph', x: (rnd() * (W - 30) + 15).toFixed(0), y: (rnd() * (H - 30) + 25).toFixed(0), fill: th.color }, true);
      t.textContent = th.glyphs[k % th.glyphs.length];
      gl.appendChild(t);
    }
    back.appendChild(gl);

    var segs = [];
    for (var i = 0; i < pts.length - 1; i++) segs.push(segPath(pts[i], pts[i + 1]));
    var full = segs.map(function (d, i) { return i ? d.replace(/^M[^C]+/, '') : d; }).join(' ');
    back.appendChild(el('path', { d: full, 'class': 'hk-mm-route-base', stroke: th.soft }, true));
    var doneD = segs.slice(0, Math.max(0, cur)).map(function (d, i) { return i ? d.replace(/^M[^C]+/, '') : d; }).join(' ');
    if (doneD) back.appendChild(el('path', { d: doneD, 'class': 'hk-mm-route-done', stroke: th.color, opacity: '.55' }, true));
    back.appendChild(el('path', { d: full, 'class': 'hk-mm-route-dash' }, true));
    pts.forEach(function (p, i) {
      back.appendChild(el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: i === cur ? 8 : 6, fill: doneFlags[i] ? th.color : '#fff', stroke: th.color, 'stroke-width': '2.5' }, true));
    });

    /* measuring path for the rider */
    var meas = el('path', { d: full, fill: 'none', stroke: 'none' }, true);
    back.appendChild(meas);
    var lens = [0];
    var tmp = el('path', { fill: 'none', stroke: 'none' }, true);
    back.appendChild(tmp);
    for (var s = 0; s < segs.length; s++) { tmp.setAttribute('d', segs[s]); lens.push(lens[s] + tmp.getTotalLength()); }
    back.removeChild(tmp);

    /* rider */
    var rider = this.front.querySelector('.hk-mm-rider');
    if (!rider) {
      rider = el('div', { 'class': 'hk-mm-rider idle' });
      var mods = ['roll', 'bob', 'wiggle', 'hop', 'spin', 'rock', 'hover'].filter(function (m) { return th[m]; });
      mods.forEach(function (m) { rider.classList.add('t-' + m); });
      rider.innerHTML = '<svg viewBox="0 0 40 40"><g class="hk-mm-face"><g class="hk-mm-body">' + th.svg + '</g></g></svg>';
      var tag = el('span', { 'class': 'hk-mm-tag' });
      tag.style.background = th.color;
      tag.textContent = this.cfg.tag || 'اینجایی!';
      rider.appendChild(tag);
      this.front.appendChild(rider);
    }
    this.mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });

    var prev = -1;
    try { prev = parseInt(g.localStorage.getItem(this.storeKey), 10); } catch (e) {}
    if (isNaN(prev) || prev < 0 || prev >= pts.length) prev = this.pos == null ? Math.max(0, cur - 1) : this.pos;
    if (this.pos != null) prev = this.pos;
    try { g.localStorage.setItem(this.storeKey, String(cur)); } catch (e) {}
    this.pos = cur;
    cancelAnimationFrame(this.anim);

    var place = function (dist, moving, dir) {
      var p = meas.getPointAtLength(Math.max(0, Math.min(lens[lens.length - 1], dist)));
      rider.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
      if (th.flip && dir) rider.classList.toggle('flip', dir > 0);
      if (th.roll) {
        var body = rider.querySelector('.hk-mm-body');
        if (body) body.style.transform = moving ? 'rotate(' + (-dist * 2.2).toFixed(1) + 'deg)' : '';
      }
    };
    var from = lens[prev], to = lens[cur];
    if (reduce() || prev === cur || Math.abs(to - from) < 2) {
      place(to, false, 0);
      rider.classList.add('idle'); rider.classList.remove('moving');
      return;
    }
    var dur = Math.min(4200, 1100 + Math.abs(cur - prev) * 520);
    var t0 = performance.now();
    var lastX = null;
    rider.classList.remove('idle'); rider.classList.add('moving');
    var ease = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
    var step = function (now) {
      var k = Math.min(1, (now - t0) / dur);
      var d = from + (to - from) * ease(k);
      var p = meas.getPointAtLength(d);
      var dir = lastX == null ? 0 : (p.x - lastX);
      lastX = p.x;
      place(d, k < 1, Math.abs(dir) > 0.3 ? dir : 0);
      if (k < 1) { self.anim = requestAnimationFrame(step); return; }
      rider.classList.remove('moving'); rider.classList.add('idle');
      if (cur > prev) {
        var b = el('span', { 'class': 'hk-mm-burst' });
        b.style.transform = rider.style.transform;
        self.front.appendChild(b);
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1000);
      }
    };
    this.anim = requestAnimationFrame(step);
  };

  var watchers = [];
  function watch(cfg) {
    if (!cfg || !cfg.container || !cfg.item || typeof cfg.done !== 'function') return null;
    var start = function () { injectCss(); var w = new Watcher(cfg); watchers.push(w); return w; };
    if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', start, { once: true }); return null; }
    return start();
  }

  g.HakimMapMotion = { watch: watch, themes: THEMES, _watchers: watchers };
})(window);
