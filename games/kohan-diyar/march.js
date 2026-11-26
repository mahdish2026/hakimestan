/* 🐎 لشکرکشی فتح کهن — نقشهٔ مسیر یادگیری با سپاه سواره
   ------------------------------------------------------------------
   الگوگرفته از «سفر جاده‌ای» ایران‌گرد (games/iran-geography/roadtrip.js):
   به‌جای ماشین، سپاهی با درفش و سه سوار از شهری به شهر دیگر می‌تازد؛
   دوربین سپاه را دنبال می‌کند، گردوخاک بلند می‌شود، جاده پشت سر سپاه
   طلایی می‌شود و شهر مقصد با انفجار نور باز می‌شود.
   صدا: طبل جنگی + سم اسب + کرنای آغاز حرکت، همه با Web Audio (بدون فایل).
   نقشه از دادهٔ دقیق Natural Earth همان بازی ایران‌گرد (map-geo.js) ساخته می‌شود.

   API:
     KohanMarch.march(from, to, opts) → Promise   (پس از ورود سپاه یا رد شدن)
     KohanMarch.view(at, opts)        → Promise   (فقط نمایش نقشه و جایگاه سپاه)
   opts: { conquered:number[], getAudioCtx:()=>AudioContext, duck:(on)=>void }
*/
(function (global) {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const SOUND_KEY = 'kohan_march_sound';
  const G = global.IranGeoMap || null;

  /* مختصات شهرها روی همان تصویر مرکاتور نقشهٔ ایران‌گرد
     (برازش‌شده با پایتخت‌های استان‌ها؛ خطای کمتر از یک واحد) */
  const STOPS = [
    { name: 'ری', icon: '🏛️', x: 247.5, y: 152.4, tag: 'left',
      fact: 'ری، از کهن‌ترین شهرهای ایران و زادگاه زکریای رازی، کاشف الکل.' },
    { name: 'نیشابور', icon: '📚', x: 375.0, y: 139.0, tag: 'below',
      fact: 'نیشابور، شهر خیام و عطار؛ سر راه بزرگ خراسان در جادهٔ ابریشم.' },
    { name: 'اصفهان', icon: '🕌', x: 251.7, y: 214.1, tag: 'below',
      fact: 'اصفهان، جایی که ابن‌سینا سال‌ها در آن درس داد و کتاب نوشت.' },
    { name: 'مراغه', icon: '🔭', x: 157.5, y: 113.5, tag: 'below',
      fact: 'مراغه، شهر رصدخانهٔ بزرگ خواجه نصیرالدین طوسی.' },
    { name: 'سمرقند', icon: '🏟️', x: 512.0, y: 63.2, tag: 'belowleft', park: 'left',
      fact: 'سمرقند در ماوراءالنهر، شهر رصدخانهٔ الغ‌بیگ و جمشید کاشانی.' },
    { name: 'نبرد پایانی', icon: '⚔️', x: 252.0, y: 178.0, tag: 'right', final: true,
      fact: 'میدان نبرد پایانی: همهٔ دانسته‌هایت را به میدان بیاور!' }
  ];

  /* جاده‌ها؛ مسیر مراغه ← سمرقند از جنوب دریای خزر و راه خراسان می‌گذرد */
  const ROADS = [
    'M247.5,152.4 Q312,166 375,139',
    'M375,139 Q338,206 251.7,214.1',
    'M251.7,214.1 Q176,188 157.5,113.5',
    'M157.5,113.5 C222,160 410,160 512,63.2',
    'M512,63.2 C452,126 336,196 252,178'
  ];

  const BASE_VB = [114, 28, 410, 330];

  /* ───────────── ابزارها ───────────── */
  const reduced = () => !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const soundPref = () => { try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch (_) { return true; } };
  const setSoundPref = (on) => { try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch (_) {} };
  const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function mountains(points, cls, step) {
    if (!points) return '';
    const pts = String(points).trim().split(/\s+/).map((p) => p.split(',').map(Number));
    let out = '';
    for (let i = 0; i < pts.length; i += step) {
      const [x, y] = pts[i];
      if (!isFinite(x) || !isFinite(y)) continue;
      const h = 5 + (i % 3) * 1.4;
      out += `<path class="${cls}" d="M${(x - 5).toFixed(1)},${(y + 3).toFixed(1)} L${x.toFixed(1)},${(y + 3 - h).toFixed(1)} L${(x + 5).toFixed(1)},${(y + 3).toFixed(1)} Z"/>`;
    }
    return out;
  }

  /* ───────────── سپاه (درفش + سه سوار) ───────────── */
  /* سوار و اسب با SVG (مستقل از فونت ایموجی)؛ رو به راست، مبدأ = زیر سم‌ها */
  function horseman(cls, dx, dy, sc, lance, extra) {
    return `<g class="km-rider ${cls}" transform="translate(${dx} ${dy}) scale(${sc})"><g class="km-bob">
      <path class="km-tail" d="M-6.2,-8.6 C-9,-8.4 -10,-6 -9.6,-3.4 C-8.6,-5.2 -7.6,-6.4 -6,-6.8 Z"/>
      <line class="km-leg km-leg-b1" x1="-4.6" y1="-6.5" x2="-5.4" y2="0"/>
      <line class="km-leg km-leg-f1" x1="3.6" y1="-6.5" x2="4.4" y2="0"/>
      <ellipse class="km-horse-body" cx="-0.6" cy="-8.2" rx="6.2" ry="3.1"/>
      <path class="km-horse-body" d="M3.2,-10.2 L6.4,-15.6 L8.6,-14.8 L6.6,-8.6 Z"/>
      <path class="km-horse-body" d="M6.2,-15.8 C7.4,-16.8 9.4,-15.6 10.8,-13.6 C11.1,-13 10.6,-12.4 10,-12.6 L7.2,-13.4 Z"/>
      <path class="km-mane" d="M3.4,-10.6 L6,-15.9 L6.9,-15.8 L4.6,-10.2 Z"/>
      <path class="km-horse-body" d="M6.4,-16 L6.9,-17.6 L7.6,-15.9 Z"/>
      <line class="km-leg km-leg-b2" x1="-3.4" y1="-6.5" x2="-2.8" y2="0"/>
      <line class="km-leg km-leg-f2" x1="2.4" y1="-6.5" x2="1.8" y2="0"/>
      <path class="km-saddle" d="M-2.6,-11.1 L1.6,-11.1 L1.2,-8.8 L-2.2,-8.8 Z"/>
      <path class="km-cloak" d="M-0.8,-11 L-4.2,-10.2 L-1.2,-15.6 Z"/>
      <path class="km-tunic" d="M-1.6,-10.8 L1.2,-10.8 L0.9,-15.6 L-0.9,-15.6 Z"/>
      <circle class="km-face-skin" cx="0" cy="-17" r="1.5"/>
      <path class="km-helmet" d="M-1.6,-17.1 C-1.5,-19 1.5,-19 1.6,-17.1 Z M0,-19.6 L-0.4,-18.6 L0.4,-18.6 Z"/>
      ${lance ? '<line class="km-lance" x1="-3" y1="-9.5" x2="5.5" y2="-24"/><path class="km-lance-tip" d="M5.5,-24 L6.6,-26.6 L4.6,-24.6 Z"/>' : ''}
      ${extra || ''}
    </g></g>`;
  }

  /* ───────────── سپاه (درفش‌دار + دو سوار) ───────────── */
  function armySvg() {
    return `<g class="km-army" id="kmArmy" aria-hidden="true">
      <ellipse class="km-army-shadow" cx="-2" cy="0.6" rx="16" ry="2.6"/>
      <g class="km-face" id="kmFace">
        ${horseman('km-r3', -10, -3.2, 0.72, true)}
        ${horseman('km-r1', 0, 0, 1, false, `<g class="km-flag">
          <line x1="1.2" y1="-12" x2="-1" y2="-31" class="km-pole"/>
          <circle cx="-1.05" cy="-31.6" r="1.2" class="km-pole-top"/>
          <path class="km-banner" d="M-0.8,-30 L-12,-27.2 L-0.3,-23.6 Z"/>
          <path class="km-banner-stripe" d="M-0.7,-28.4 L-6.6,-26.9 L-0.5,-25.2 Z"/>
        </g>`)}
        ${horseman('km-r2', -11, 2.4, 0.72, true)}
      </g>
    </g>`;
  }

  function stopSvg(i) {
    const s = STOPS[i];
    const lw = s.name.length * 4.6 + 12;
    let tx = 0, ty = 19, anchor = 'middle';
    if (s.tag === 'left') { tx = -14 - lw / 2; ty = 4; }
    if (s.tag === 'right') { tx = 14 + lw / 2; ty = 4; }
    if (s.tag === 'belowleft') { tx = 8 - lw / 2; ty = 19; }
    return `<g class="km-stop" id="kmStop${i}" data-stop="${i}" transform="translate(${s.x} ${s.y})">
      <circle class="km-stop-glow" r="16"/>
      <circle class="km-stop-ring" r="10.5"/>
      <circle class="km-stop-dot" r="9"/>
      <text class="km-stop-icon" text-anchor="middle" y="3.6">${s.icon}</text>
      <g class="km-stop-lock" transform="translate(7.5 -7.5)"><circle r="4.6"/><path class="km-lock-shackle" d="M-1.5,-0.6 V-1.9 A1.5,1.5 0 0 1 1.5,-1.9 V-0.6"/><rect class="km-lock-body" x="-2.3" y="-0.7" width="4.6" height="3.4" rx=".6"/></g>
      <g class="km-stop-crown" transform="translate(0 -13)"><path d="M-5,2.4 L-5.6,-2.6 L-2.6,0 L0,-3.8 L2.6,0 L5.6,-2.6 L5,2.4 Z"/><circle cx="0" cy="-4.4" r=".9"/><circle cx="-5.6" cy="-3.2" r=".7"/><circle cx="5.6" cy="-3.2" r=".7"/></g>
      <g class="km-stop-num" transform="translate(-8 -8)"><circle r="4"/><text text-anchor="middle" y="1.7">${fa(i + 1)}</text></g>
      <g class="km-tag" transform="translate(${tx} ${ty})"><rect x="${-lw / 2}" y="-6.5" width="${lw}" height="12" rx="6"/><text text-anchor="${anchor}" y="2.6">${esc(s.name)}</text></g>
    </g>`;
  }

  function mapSvg() {
    const W = G ? G.W : 520, H = G ? G.H : 400;
    const land = G ? `
        <path class="km-neighbors" d="${G.neighbors}"/>
        <path class="km-land-shadow" d="${G.iran}" transform="translate(1.4 2.2)"/>
        <path class="km-land" d="${G.iran}"/>
        ${G.kavir ? `<ellipse class="km-desert" cx="${G.kavir[0]}" cy="${G.kavir[1]}" rx="38" ry="16"/>` : ''}
        ${G.lut ? `<ellipse class="km-desert" cx="${G.lut[0]}" cy="${G.lut[1]}" rx="21" ry="31"/>` : ''}
        <g class="km-rivers">${['karun', 'zayandeh', 'sefidrud', 'aras'].filter((r) => G[r]).map((r) => `<polyline class="km-river" points="${G[r]}"/>`).join('')}</g>
        <g class="km-mts">${mountains(G.zagros, 'km-mt', 2)}${mountains(G.alborz, 'km-mt km-mt-snow', 2)}</g>`
      : `<rect class="km-land" x="120" y="60" width="335" height="300" rx="40"/>`;
    const roads = ROADS.map((d, k) => `
        <path class="km-road-bed" d="${d}"/>
        <path class="km-road" id="kmRoad${k}" d="${d}"/>
        <path class="km-road-done" id="kmRoadDone${k}" d="${d}"/>`).join('');
    const tents = [[229, 139], [237, 136], [233, 144]].map(([x, y]) => `<path class="km-tent" d="M${x - 3.5},${y + 2.5} L${x},${y - 3} L${x + 3.5},${y + 2.5} Z"/>`).join('');
    return `<svg class="km-svg" id="kmSvg" viewBox="${BASE_VB.join(' ')}" role="img" aria-label="نقشهٔ لشکرکشی فتح کهن: ری، نیشابور، اصفهان، مراغه، سمرقند و نبرد پایانی">
      <defs>
        <radialGradient id="kmVignette" cx="50%" cy="50%" r="70%"><stop offset=".62" stop-color="#3a2108" stop-opacity="0"/><stop offset="1" stop-color="#3a2108" stop-opacity=".55"/></radialGradient>
        <linearGradient id="kmSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6f86"/><stop offset="1" stop-color="#1d4c63"/></linearGradient>
        <linearGradient id="kmLandG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e2b3"/><stop offset=".6" stop-color="#ecd49a"/><stop offset="1" stop-color="#e2c27e"/></linearGradient>
        <radialGradient id="kmGlowG"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".95"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
      </defs>
      <g id="kmWorld">
        <rect class="km-sea" x="${BASE_VB[0] - 20}" y="${BASE_VB[1] - 20}" width="${W - BASE_VB[0] + 40}" height="${H}"/>
        ${land}
        <text class="km-sea-label" x="240" y="62" text-anchor="middle">دریای خزر</text>
        <text class="km-sea-label" x="234" y="318" text-anchor="middle">خلیج فارس</text>
        <text class="km-area" x="468" y="46" text-anchor="middle">ماوراءالنهر</text>
        <text class="km-area" x="338" y="200" text-anchor="middle">دشت کویر</text>
        <g class="km-tents" aria-hidden="true">${tents}</g>
        <g class="km-roads">${roads}</g>
        <g id="kmFx"></g>
        <g class="km-stops">${STOPS.map((_, i) => stopSvg(i)).join('')}</g>
        <g id="kmPuffs"></g>
        ${armySvg()}
        <g class="km-compass" transform="translate(146 330)" aria-hidden="true"><circle r="12"/><path d="M0,-10 L2.8,0 L0,10 L-2.8,0 Z" class="km-compass-n"/><text y="-14" text-anchor="middle">ش</text></g>
      </g>
      <rect class="km-vignette" x="${BASE_VB[0]}" y="${BASE_VB[1]}" width="${BASE_VB[2]}" height="${BASE_VB[3]}" fill="url(#kmVignette)" pointer-events="none"/>
    </svg>`;
  }

  /* ───────────── پوسته (مودال) ───────────── */
  let root = null, svg = null, busy = false, finish = null, raf = 0, timers = [];
  let lastFocus = null;

  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.className = 'km-overlay';
    root.id = 'kohanMarch';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'kmTitle');
    root.hidden = true;
    root.innerHTML = `
      <div class="km-box">
        <div class="km-head">
          <h2 class="km-title" id="kmTitle">🐎 لشکرکشی</h2>
          <button type="button" class="km-sound" id="kmSound" aria-pressed="true" title="صدای طبل و سم اسب">🔊</button>
        </div>
        <div class="km-stage" id="kmStage">${mapSvg()}<div class="km-arrive" id="kmArrive" aria-hidden="true"></div></div>
        <p class="km-caption" id="kmCaption" aria-live="polite"></p>
        <div class="km-legs" id="kmLegs" aria-hidden="true">${STOPS.map((s, i) => `<span class="km-leg" data-leg="${i}">${s.icon}</span>`).join('<i></i>')}</div>
        <div class="km-actions">
          <button type="button" class="km-btn km-skip" id="kmSkip">⏭ رد شدن</button>
          <button type="button" class="km-btn km-go" id="kmGo" hidden>⚔️ ورود به شهر</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    svg = root.querySelector('#kmSvg');
    root.querySelector('#kmSkip').addEventListener('click', () => skip());
    root.querySelector('#kmGo').addEventListener('click', () => close());
    const sb = root.querySelector('#kmSound');
    const paint = () => { const on = soundPref(); sb.textContent = on ? '🔊' : '🔇'; sb.setAttribute('aria-pressed', String(on)); sb.setAttribute('aria-label', on ? 'خاموش کردن صدای سپاه' : 'روشن کردن صدای سپاه'); };
    paint();
    sb.addEventListener('click', () => { setSoundPref(!soundPref()); paint(); if (!soundPref()) audio.stop(); });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (busy) skip(); else close(); }
      if (e.key === 'Tab') {
        const f = Array.from(root.querySelectorAll('button:not([hidden])'));
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    return root;
  }

  function q(sel) { return root.querySelector(sel); }
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* وضعیت شهرها و جاده‌ها */
  function paintState(at, conquered, revealUpTo) {
    const done = new Set(conquered || []);
    STOPS.forEach((_, i) => {
      const g = q('#kmStop' + i);
      if (!g) return;
      g.classList.toggle('is-conquered', done.has(i));
      g.classList.toggle('is-current', i === at);
      g.classList.toggle('is-passed', i < at && !done.has(i));
      g.classList.toggle('is-locked', i > at);
    });
    ROADS.forEach((_, k) => {
      const p = q('#kmRoadDone' + k);
      if (!p) return;
      const L = p.getTotalLength();
      p.style.strokeDasharray = L + ' ' + L;
      p.style.strokeDashoffset = k < revealUpTo ? '0' : String(L);
      q('#kmRoad' + k).classList.toggle('is-open', k < revealUpTo + 1);
    });
    root.querySelectorAll('.km-leg').forEach((el) => {
      const i = Number(el.dataset.leg);
      el.classList.toggle('is-done', done.has(i));
      el.classList.toggle('is-now', i === at);
    });
  }

  function placeArmy(x, y, faceRight) {
    const a = q('#kmArmy');
    if (a) a.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    const f = q('#kmFace');
    // سواران رو به راست کشیده شده‌اند؛ هنگام حرکت به چپ قرینه می‌شوند
    if (f) f.setAttribute('transform', faceRight ? '' : 'scale(-1 1)');
  }
  function parkAt(i) {
    const s = STOPS[i];
    const right = s.park === 'left';
    placeArmy(s.x + (right ? -22 : 22), s.y + 6, right);
    q('#kmArmy').classList.add('is-parked');
  }

  function puff(x, y) {
    const layer = q('#kmPuffs');
    if (!layer || layer.childNodes.length > 26) return;
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', (x + (Math.random() - 0.5) * 4).toFixed(1));
    c.setAttribute('cy', (y + 4 + Math.random() * 2).toFixed(1));
    c.setAttribute('r', (1.6 + Math.random() * 1.4).toFixed(1));
    c.setAttribute('class', 'km-puff');
    layer.appendChild(c);
    setTimeout(() => c.remove(), 1000);
  }
  function burst(x, y, final) {
    const fx = q('#kmFx');
    if (!fx) return;
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('transform', `translate(${x} ${y})`);
    g.setAttribute('class', 'km-burst' + (final ? ' is-final' : ''));
    let inner = '<circle r="16" class="km-burst-ring"/><circle r="16" class="km-burst-ring km-burst-ring2"/>';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      inner += `<circle class="km-spark" r="1.7" style="--dx:${(Math.cos(a) * 28).toFixed(1)}px;--dy:${(Math.sin(a) * 28).toFixed(1)}px;--c:${['#f5c842', '#fff3b0', '#e74c3c', '#2ecc71'][k % 4]}"/>`;
    }
    g.innerHTML = inner;
    fx.appendChild(g);
    setTimeout(() => g.remove(), 1400);
  }

  /* ───────────── دوربین ───────────── */
  let cam = [0, 0, 1], camLast = 0;
  function applyCam() {
    if (!svg) return;
    if (Math.abs(cam[2] - 1) < 0.002 && Math.abs(cam[0]) < 0.01 && Math.abs(cam[1]) < 0.01) { svg.style.transform = ''; return; }
    svg.style.transform = `translate(${cam[0].toFixed(3)}%, ${cam[1].toFixed(3)}%) scale(${cam[2].toFixed(4)})`;
  }
  function camTarget(x, y, zoom) {
    const fx = (x - BASE_VB[0]) / BASE_VB[2], fy = (y - BASE_VB[1]) / BASE_VB[3];
    const clamp = (v) => Math.min(0, Math.max((1 - zoom) * 100, v));
    return [clamp((0.5 - fx * zoom) * 100), clamp((0.5 - fy * zoom) * 100), zoom];
  }
  function camEase(target, now, tau) {
    const dt = camLast ? Math.min(100, now - camLast) : 16;
    camLast = now;
    const k = 1 - Math.exp(-dt / (tau || 220));
    for (let n = 0; n < 3; n++) cam[n] += (target[n] - cam[n]) * k;
    applyCam();
  }
  function camTo(target, dur) {
    return new Promise((resolve) => {
      if (reduced()) { cam = target.slice(); applyCam(); resolve(); return; }
      const from = cam.slice(), t0 = performance.now();
      const step = (now) => {
        if (!root || root.hidden) { resolve(); return; }
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
        cam = from.map((v, n) => v + (target[n] - v) * e);
        applyCam();
        if (t < 1) raf = requestAnimationFrame(step); else resolve();
      };
      raf = requestAnimationFrame(step);
    });
  }

  /* ───────────── صدا: طبل جنگی + سم اسب + کرنا ───────────── */
  const audio = (function () {
    let opts = null, ac = null, master = null, noise = null, sched = 0, nextT = 0, step = 0, hoofT = 0;
    function ctx() {
      if (!soundPref()) return null;
      try {
        ac = (opts && opts.getAudioCtx) ? opts.getAudioCtx() : (ac || new (global.AudioContext || global.webkitAudioContext)());
        if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
        return ac;
      } catch (_) { return null; }
    }
    function noiseBuf(a) {
      if (noise && noise.sampleRate === a.sampleRate) return noise;
      const len = Math.floor(a.sampleRate * 0.6);
      noise = a.createBuffer(1, len, a.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return noise;
    }
    function bus(a) {
      if (master && master.context === a) return master;
      master = a.createGain();
      master.gain.value = 0.9;
      const comp = a.createDynamicsCompressor();
      master.connect(comp); comp.connect(a.destination);
      return master;
    }
    function drum(a, t, v) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(118, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(bus(a)); o.start(t); o.stop(t + 0.45);
      const n = a.createBufferSource(), f = a.createBiquadFilter(), ng = a.createGain();
      n.buffer = noiseBuf(a); f.type = 'lowpass'; f.frequency.value = 900;
      ng.gain.setValueAtTime(0.22 * v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      n.connect(f); f.connect(ng); ng.connect(bus(a)); n.start(t, Math.random() * 0.4, 0.12);
    }
    function hoof(a, t, v) {
      const n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      n.buffer = noiseBuf(a); f.type = 'bandpass'; f.frequency.value = 1300 + Math.random() * 500; f.Q.value = 2.2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      n.connect(f); f.connect(g); g.connect(bus(a)); n.start(t, Math.random() * 0.5, 0.08);
      const o = a.createOscillator(), og = a.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.05);
      og.gain.setValueAtTime(0.09 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(og); og.connect(bus(a)); o.start(t); o.stop(t + 0.07);
    }
    function horn(a, t, notes) {
      notes.forEach(([fq, d, off]) => {
        [1, 1.004].forEach((det) => {
          const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
          o.type = 'sawtooth'; o.frequency.value = fq * det;
          lfo.frequency.value = 5.5; lg.gain.value = fq * 0.012; lfo.connect(lg); lg.connect(o.frequency);
          f.type = 'lowpass'; f.frequency.setValueAtTime(700, t + off); f.frequency.linearRampToValueAtTime(1500, t + off + 0.12);
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.exponentialRampToValueAtTime(0.06, t + off + 0.06);
          g.gain.setValueAtTime(0.06, t + off + d - 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + d);
          o.connect(f); f.connect(g); g.connect(bus(a));
          o.start(t + off); lfo.start(t + off); o.stop(t + off + d + 0.02); lfo.stop(t + off + d + 0.02);
        });
      });
    }
    function cymbal(a, t) {
      const n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      n.buffer = noiseBuf(a); f.type = 'highpass'; f.frequency.value = 5200;
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      n.connect(f); f.connect(g); g.connect(bus(a)); n.start(t);
    }
    // الگوی طبل رژه (هشتم‌ها): دووم . . دم دم . دم .
    const PATTERN = [1, 0, 0, 0.55, 0.65, 0, 0.55, 0];
    const EIGHTH = 0.2;
    function tick() {
      if (!ac) return;
      while (nextT < ac.currentTime + 0.25) {
        const v = PATTERN[step % PATTERN.length];
        if (v) drum(ac, nextT, v);
        nextT += EIGHTH; step++;
      }
      // تاخت سه‌ضربی سم اسب‌ها
      while (hoofT < ac.currentTime + 0.25) {
        hoof(ac, hoofT, 0.9); hoof(ac, hoofT + 0.075, 0.6); hoof(ac, hoofT + 0.15, 0.75);
        hoofT += 0.36 + Math.random() * 0.03;
      }
    }
    return {
      setOpts(o) { opts = o || null; },
      start() {
        const a = ctx(); if (!a) return;
        try {
          if (opts && opts.duck) opts.duck(true);
          const t = a.currentTime + 0.03;
          horn(a, t, [[196, 0.32, 0], [262, 0.62, 0.34]]);
          nextT = t + 0.9; hoofT = t + 0.95; step = 0;
          clearInterval(sched); sched = setInterval(tick, 60); tick();
        } catch (_) {}
      },
      stop() {
        clearInterval(sched); sched = 0;
        if (opts && opts.duck) opts.duck(false);
      },
      arrive(final) {
        this.stop();
        const a = ctx(); if (!a) return;
        try {
          const t = a.currentTime + 0.02;
          drum(a, t, 1); drum(a, t + 0.14, 0.7); drum(a, t + 0.28, 1);
          cymbal(a, t + 0.28);
          horn(a, t + 0.3, final ? [[196, 0.25, 0], [247, 0.25, 0.26], [294, 0.7, 0.52]] : [[262, 0.22, 0], [330, 0.5, 0.24]]);
        } catch (_) {}
      }
    };
  })();

  /* ───────────── لشکرکشی ───────────── */
  function marchLeg(k) {
    return new Promise((resolve) => {
      const path = q('#kmRoad' + k), done = q('#kmRoadDone' + k);
      if (!path) { resolve(); return; }
      const L = path.getTotalLength();
      const dur = Math.min(4600, Math.max(2600, L * 13));
      const army = q('#kmArmy');
      army.classList.remove('is-parked');
      army.classList.add('is-marching');
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const t0 = performance.now();
      let lastPuff = 0;
      camLast = 0;
      const frame = (now) => {
        if (!root || root.hidden) { resolve(); return; }
        const t = Math.min(1, (now - t0) / dur), e = ease(t);
        const pos = L * e;
        const p = path.getPointAtLength(pos);
        const a = path.getPointAtLength(Math.max(0, pos - 2)), b = path.getPointAtLength(Math.min(L, pos + 2));
        placeArmy(p.x, p.y + 1.5, b.x - a.x > 0.05);
        done.style.strokeDashoffset = String(L * (1 - e));
        if (now - lastPuff > 70 && t > 0.02 && t < 0.97) { lastPuff = now; puff(p.x - (b.x - a.x) * 3, p.y - (b.y - a.y) * 3); }
        camEase(camTarget(p.x, p.y, 1.9), now, 240);
        if (t < 1) raf = requestAnimationFrame(frame);
        else { army.classList.remove('is-marching'); resolve(); }
      };
      raf = requestAnimationFrame(frame);
    });
  }

  function showArrival(to) {
    const s = STOPS[to];
    const g = q('#kmStop' + to);
    if (g) { g.classList.add('is-unlocking'); later(() => g.classList.remove('is-unlocking'), 1300); }
    burst(s.x, s.y, s.final);
    audio.arrive(!!s.final);
    const ban = q('#kmArrive');
    ban.textContent = s.final ? '⚔️ سپاه به میدان نبرد پایانی رسید!' : `🚩 سپاه به ${s.name} رسید!`;
    ban.classList.remove('show'); void ban.offsetWidth; ban.classList.add('show');
  }

  function open(title, caption) {
    ensureRoot();
    clearAll();
    lastFocus = document.activeElement;
    q('#kmTitle').textContent = title;
    q('#kmCaption').textContent = caption;
    q('#kmArrive').classList.remove('show');
    q('#kmPuffs').innerHTML = '';
    q('#kmFx').innerHTML = '';
    cam = [0, 0, 1]; applyCam();
    root.hidden = false;
    document.body.classList.add('km-open');
    requestAnimationFrame(() => root.classList.add('show'));
  }

  function close() {
    if (!root || root.hidden) return;
    clearAll();
    audio.stop();
    busy = false;
    root.classList.remove('show');
    root.hidden = true;
    document.body.classList.remove('km-open');
    const f = finish; finish = null;
    if (lastFocus && lastFocus.focus && lastFocus.isConnected) { try { lastFocus.focus({ preventScroll: true }); } catch (_) {} }
    if (f) f();
  }

  let skipTo = null;
  function skip() { if (skipTo) skipTo(); else close(); }

  function arrivedUI(to, conquered) {
    busy = false;
    skipTo = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    paintState(to, conquered, to);
    parkAt(to);
    cam = [0, 0, 1]; applyCam();
    q('#kmSkip').hidden = true;
    const go = q('#kmGo');
    go.hidden = false;
    go.textContent = STOPS[to].final ? '⚔️ آغاز نبرد پایانی' : `⚔️ ورود به ${STOPS[to].name}`;
    go.focus({ preventScroll: true });
    // اگر بازیکن دکمه را نزند، پس از چند ثانیه خودکار وارد شهر می‌شود
    later(close, 6500);
  }

  function march(from, to, opts) {
    opts = opts || {};
    if (!document.body || to < 0 || to >= STOPS.length) return Promise.resolve();
    if (busy) close();
    audio.setOpts(opts);
    const conquered = opts.conquered || [];
    const dest = STOPS[to];
    open(dest.final ? '⚔️ لشکرکشی به میدان نبرد پایانی' : `🐎 لشکرکشی به ${dest.name}`, dest.fact);
    q('#kmSkip').hidden = false;
    q('#kmGo').hidden = true;
    paintState(from, conquered, from);
    // شهر مقصد تا رسیدن سپاه قفل می‌ماند
    const destG = q('#kmStop' + to);
    destG.classList.add('is-locked'); destG.classList.remove('is-current');
    parkAt(from);
    q('#kmSkip').focus({ preventScroll: true });
    busy = true;
    return new Promise((resolve) => {
      finish = resolve;
      skipTo = () => { if (busy) { audio.stop(); arrivedUI(to, conquered); showArrival(to); } else close(); };
      if (reduced() || from === to || from < 0) {
        // بدون حرکت: سپاه مستقیم در مقصد ظاهر می‌شود
        later(() => { if (!busy) return; arrivedUI(to, conquered); showArrival(to); }, 350);
        return;
      }
      const k = Math.min(from, to);
      later(async () => {
        if (!busy) return;
        const s = STOPS[from];
        await camTo(camTarget(s.x, s.y, 1.9), 700);
        if (!busy) return;
        audio.start();
        await marchLeg(k);
        if (!busy) return;
        audio.stop();
        showArrival(to);
        await camTo([0, 0, 1], 700);
        if (!busy) return;
        arrivedUI(to, conquered);
      }, 450);
    });
  }

  function view(at, opts) {
    opts = opts || {};
    if (!document.body) return Promise.resolve();
    if (busy) close();
    audio.setOpts(opts);
    const conquered = opts.conquered || [];
    const i = Math.max(0, Math.min(STOPS.length - 1, at | 0));
    const n = conquered.length;
    open('🐎 مسیر لشکرکشی', `${fa(n)} شهر از ${fa(STOPS.length)} شهر فتح شده است. سپاه اکنون در ${STOPS[i].name} است: ${STOPS[i].fact}`);
    paintState(i, conquered, i);
    parkAt(i);
    q('#kmSkip').hidden = true;
    const go = q('#kmGo');
    go.hidden = false;
    go.textContent = '↩️ بازگشت به نبرد';
    go.focus({ preventScroll: true });
    return new Promise((resolve) => { finish = resolve; });
  }

  global.KohanMarch = { march, view, close, STOPS, ROADS, get busy() { return busy; } };
})(window);
