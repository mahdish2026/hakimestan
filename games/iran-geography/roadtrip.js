/* ═══════════════════════════════════════════════════════════════
   سفر جاده‌ای ایران‌گرد کوچک
   نقشهٔ زندهٔ ایران با ماشینی که روی جاده‌ها از ایستگاهی به
   ایستگاه دیگر می‌رود. هر ایستگاه یک مأموریت است؛ با لمس
   ایستگاه، ماشین راه می‌افتد و با رسیدن، مأموریت باز می‌شود.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const fa = (v) => String(v ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const faNum = (n) => fa(Math.round(n).toLocaleString('en-US').replace(/,/g, '٬'));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // گره ۰ نقطهٔ آغاز سفر است؛ گره‌های ۱ تا ۶ همان شش مأموریت به ترتیب کتاب‌اند.
  const STOPS = [
    { pin: 'tabriz', city: 'تبریز', land: '🏁', start: true, why: 'سفر از تبریز، شهر کوه‌های سردسیر شمال غرب و رود ارس، آغاز می‌شود.' },
    { pin: 'rasht', city: 'رشت', land: '🌧️', why: 'جلگهٔ پرباران و سرسبز خزر یکی از پرجمعیت‌ترین نواحی ایران است؛ بهترین جا برای شناخت اقلیم و جمعیت!' },
    { pin: 'ahvaz', city: 'اهواز', land: '🌊', why: 'کارون، پرآب‌ترین و تنها رود قابل کشتیرانی ایران، از میان اهواز می‌گذرد.' },
    { pin: 'isfahan', city: 'اصفهان', land: '🏭', why: 'ذوب‌آهن و فولاد مبارکه اصفهان را به یکی از قطب‌های بزرگ صنعت ایران تبدیل کرده است.' },
    { pin: 'bandar-abbas', city: 'بندرعباس', land: '⚓', why: 'بزرگ‌ترین بندر بازرگانی ایران؛ کالاها از اینجا با کامیون و قطار به سراسر کشور می‌روند.' },
    { pin: 'tehran', city: 'تهران', land: '🏛️', why: 'پایتخت ایران؛ مجلس شورای اسلامی و دولت در تهران مستقرند.' },
    { pin: 'mashhad', city: 'مشهد', land: '🧭', why: 'در شمال شرق ایران و نزدیک مرز ترکمنستان و افغانستان؛ ایستگاه آشنایی با همسایه‌ها.' }
  ];

  // جادهٔ میان گره i و i+1 (مسیر تقریبی، مسافت‌ها حدودی و گردشده‌اند)
  const ROADS = [
    { d: 'M158.4,98.6 C176,93 197,101 215.4,116.1', km: 450, fact: 'از کنار کوه‌های سردسیر شمال غرب به سوی جلگهٔ سرسبز و پرباران خزر سرازیر می‌شویم.' },
    { d: 'M215.4,116.1 C232,140 194,160 204,188 S196,226 199.6,241.4', km: 950, fact: 'از البرز می‌گذریم و در امتداد زاگرس به جلگهٔ گرم خوزستان می‌رسیم؛ هوا کم‌کم گرم‌تر می‌شود!' },
    { d: 'M199.6,241.4 C210,221 236,234 251.7,214.2', km: 500, fact: 'از دل کوه‌های زاگرس بالا می‌رویم؛ زاینده‌رود از همین کوه‌ها سرچشمه می‌گیرد.' },
    { d: 'M251.7,214.2 C284,230 296,262 310,288 S325,312 331.5,323.7', km: 1000, fact: 'از حاشیهٔ کویر خشک مرکزی می‌گذریم تا به کنار تنگهٔ هرمز و خلیج فارس برسیم.' },
    { d: 'M331.5,323.7 C356,286 318,246 300,212 S262,166 246.8,150.4', km: 1300, fact: 'طولانی‌ترین جادهٔ سفر! کامیون‌ها کالاهای بندر را از همین راه جنوب به شمال، به پایتخت می‌برند.' },
    { d: 'M246.8,150.4 C282,152 320,141 350,140 S376,136 389.2,137.4', km: 900, fact: 'در دامنهٔ جنوبی البرز به سوی شمال شرق می‌رانیم؛ مشهد دومین شهر پرجمعیت ایران است.' }
  ];

  const BASE_VB = [112, 34, 336, 346];
  const reduced = () => { try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };

  let ctx = null;          // پیوند با app.js
  let root = null;
  let driving = false;
  let engine = null;
  let camVB = [0, 0, 1];

  /* ───────────── ساخت نقشه ───────────── */
  function polyPoints(str) {
    return String(str || '').trim().split(/\s+/).map((p) => p.split(',').map(Number));
  }
  function along(points, step) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(len / step));
      for (let k = 0; k < n; k++) out.push([x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n]);
    }
    out.push(points[points.length - 1]);
    return out;
  }
  function mountains(str, snow, seed) {
    return along(polyPoints(str), 13).map(([x, y], i) => {
      const h = 5 + ((i * 7 + seed) % 3);
      const w = 4.2 + ((i * 3 + seed) % 2);
      const dx = ((i % 2) ? 2.5 : -1.5);
      return `<g class="rt-mt" transform="translate(${(x + dx).toFixed(1)} ${(y + ((i % 3) - 1) * 2).toFixed(1)})">
        <path d="M${-w},3 L0,${-h} L${w},3 Z" class="rt-mt-a"/><path d="M0,${-h} L${w},3 L${(w * 0.25).toFixed(1)},3 Z" class="rt-mt-b"/>
        ${snow ? `<path d="M${(-w * 0.36).toFixed(1)},${(-h * 0.45).toFixed(1)} L0,${-h} L${(w * 0.36).toFixed(1)},${(-h * 0.45).toFixed(1)} L0,${(-h * 0.3).toFixed(1)} Z" class="rt-snow"/>` : ''}
      </g>`;
    }).join('');
  }
  function tree(x, y, s) {
    return `<g class="rt-tree" transform="translate(${x} ${y}) scale(${s || 1})"><rect x="-0.7" y="1" width="1.4" height="3" class="rt-trunk"/><circle r="3.4" class="rt-leaf"/><circle cx="-1" cy="-1" r="1.4" class="rt-leaf-hi"/></g>`;
  }
  function palm(x, y) {
    return `<g class="rt-palm" transform="translate(${x} ${y})"><path d="M0,5 Q0.8,0 0,-4" class="rt-palm-trunk"/><path d="M0,-4 q-4,-1 -6,2 M0,-4 q4,-1 6,2 M0,-4 q-2,-3 -5,-3 M0,-4 q2,-3 5,-3" class="rt-palm-leaf"/></g>`;
  }
  function stopXY(i) {
    const p = ctx.pins.find((q) => q.id === STOPS[i].pin);
    return p ? [p.x, p.y] : [0, 0];
  }

  function stopState(i) {
    if (i === 0) return { start: true };
    const mIdx = i - 1;
    const m = ctx.missions[mIdx];
    const solved = ctx.solved(mIdx);
    return {
      m, mIdx, solved, total: m.tasks.length,
      full: solved === m.tasks.length,
      locked: ctx.locked(mIdx),
      seen: ctx.seen(mIdx) || solved > 0,
      stars: ctx.stars(mIdx)
    };
  }
  function roadOpen(k) { return k === 0 || !stopState(k + 1).locked; }
  function nextStop() {
    const idx = ctx.missions.findIndex((m, i) => ctx.solved(i) < m.tasks.length);
    return idx < 0 ? ctx.missions.length : idx + 1;
  }
  function shortTitle(m) { return String(m.title).replace(/^[^:]*:\s*/, '').replace(/\s*\(درس[^)]*\)\s*$/, ''); }

  function stopSvg(i) {
    const [x, y] = stopXY(i);
    const s = stopState(i);
    const st = STOPS[i];
    const here = trip().at === i;
    const isNext = i === nextStop();
    let cls = 'rt-stop';
    let label;
    if (s.start) { cls += ' is-start'; label = 'نقطهٔ آغاز سفر: ' + st.city; }
    else {
      cls += s.locked ? ' is-locked' : s.full ? ' is-done' : ' is-open';
      if (isNext && !s.locked) cls += ' is-next';
      label = `ایستگاه ${fa(i)}: ${st.city} — ${shortTitle(s.m)}؛ ${fa(s.solved)} از ${fa(s.total)} چالش${s.locked ? '؛ قفل' : s.full ? '؛ کامل' : ''}${here ? '؛ ماشین اینجاست' : ''}`;
    }
    const icon = s.start ? '🏁' : s.m.icon;
    return `<g class="${cls}" data-rt-stop="${i}" transform="translate(${x} ${y})" role="button" tabindex="0" aria-label="${esc(label)}"><g class="rt-stop-in">
      ${!s.start && isNext && !s.locked ? '<circle class="rt-pulse" r="13"/><circle class="rt-pulse rt-pulse-2" r="13"/>' : ''}
      <circle class="rt-hit" r="20"/>
      <circle class="rt-ring-shadow" r="12.5" cy="1.6"/>
      <circle class="rt-ring" r="12.5"/>
      <circle class="rt-disc" r="10.5"/>
      <text class="rt-ico" y="4.4" text-anchor="middle" aria-hidden="true">${icon}</text>
      ${s.locked ? '<g class="rt-lock" transform="translate(9 -9)"><circle r="5.4"/><text y="2.4" text-anchor="middle">🔒</text></g>' : ''}
      ${s.full ? '<g class="rt-medal" transform="translate(9 -9)"><circle r="5.4"/><text y="2.5" text-anchor="middle">★</text></g>' : ''}
      ${!s.start ? `<g class="rt-num" transform="translate(-10 -9)"><circle r="4.6"/><text y="1.9" text-anchor="middle">${fa(i)}</text></g>` : ''}
      <g class="rt-tag" transform="translate(0 21)"><rect x="${-(st.city.length * 3 + 7)}" y="-6.5" width="${st.city.length * 6 + 14}" height="12" rx="6"/><text y="2.6" text-anchor="middle">${esc(st.city)}</text></g>
      ${!s.start && s.stars ? `<text class="rt-stars" y="-16" text-anchor="middle" aria-hidden="true">${'★'.repeat(s.stars)}</text>` : ''}
    </g></g>`;
  }

  function carSvg() {
    return `<g id="rtCar" class="rt-car" aria-hidden="true">
      <path class="rt-beam" d="M9,-4 L40,-15 L40,15 L9,4 Z"/>
      <ellipse class="rt-car-shadow" cx="0.5" cy="2" rx="11" ry="6"/>
      <g class="rt-car-body">
        <rect x="-6.5" y="-6.6" width="4" height="2" rx=".8" class="rt-wheel"/><rect x="3" y="-6.6" width="4" height="2" rx=".8" class="rt-wheel"/>
        <rect x="-6.5" y="4.6" width="4" height="2" rx=".8" class="rt-wheel"/><rect x="3" y="4.6" width="4" height="2" rx=".8" class="rt-wheel"/>
        <rect x="-9.5" y="-5.2" width="19" height="10.4" rx="4" class="rt-paint"/>
        <rect x="-3.2" y="-4.2" width="5.6" height="8.4" rx="1.6" class="rt-roof"/>
        <path d="M2.6,-4 L6,-3.2 L6,3.2 L2.6,4 Z" class="rt-glass"/>
        <path d="M-3.6,-3.8 L-6.6,-3 L-6.6,3 L-3.6,3.8 Z" class="rt-glass rt-glass-back"/>
        <circle cx="9" cy="-3" r="1.1" class="rt-light"/><circle cx="9" cy="3" r="1.1" class="rt-light"/>
        <rect x="-9.8" y="-3.6" width="1" height="1.6" class="rt-tail"/><rect x="-9.8" y="2" width="1" height="1.6" class="rt-tail"/>
        <path d="M-1,-0.8 L1.4,0 L-1,0.8 Z" class="rt-arrow"/>
      </g>
    </g>`;
  }

  function mapSvg() {
    const G = ctx.map;
    const roads = ROADS.map((r, k) => {
      const open = roadOpen(k);
      return `<g class="rt-road ${open ? 'is-open' : 'is-locked'}" data-road="${k}">
        <path class="rt-road-edge" d="${r.d}"/>
        <path class="rt-road-base" d="${r.d}" id="rtRoad${k}"/>
        <path class="rt-road-line" d="${r.d}"/>
      </g>`;
    }).join('');
    const kmTags = ROADS.map((r, k) => {
      const txt = roadOpen(k) ? '≈ ' + faNum(r.km) + ' کیلومتر' : '🔒 بسته';
      const w = Math.round(txt.length * 3.1 + 9);
      return `<g class="rt-km ${roadOpen(k) ? '' : 'is-locked'}" data-km="${k}"><rect x="${-w / 2}" y="-5.5" width="${w}" height="11" rx="5.5"/><text y="2.3" text-anchor="middle">${txt}</text></g>`;
    }).join('');
    const clouds = [[150, 60, 1], [300, 90, 1.25], [390, 240, 0.9]].map(([x, y, s], i) => `<g class="rt-cloud rt-cloud-${i}" transform="translate(${x} ${y}) scale(${s})"><ellipse rx="13" ry="5.5"/><ellipse cx="-6" cy="-3" rx="7" ry="5"/><ellipse cx="5" cy="-4" rx="8" ry="6"/></g>`).join('');
    const waves = [[200, 64], [262, 76], [232, 92], [222, 300], [262, 318], [300, 346], [352, 372], [398, 384]].map(([x, y], i) => `<path class="rt-wave rt-wave-${i % 3}" d="M${x},${y} q3,-3 6,0 t6,0 t6,0"/>`).join('');
    const trees = [[203, 109], [226, 121], [240, 127], [254, 131], [268, 131], [282, 128], [296, 125], [214, 125], [232, 112]].map(([x, y], i) => tree(x, y, 0.85 + (i % 3) * 0.12)).join('');
    return `<svg class="rt-svg" id="rtSvg" viewBox="${BASE_VB.join(' ')}" role="group" aria-label="نقشهٔ سفر جاده‌ای ایران: شش ایستگاه مأموریت؛ روی هر ایستگاه باز بزن تا ماشین به آنجا برود">
      <defs>
        <linearGradient id="rtSeaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9fb"/><stop offset="1" stop-color="#7cc8ee"/></linearGradient>
        <linearGradient id="rtSeaN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a44"/><stop offset="1" stop-color="#06192c"/></linearGradient>
        <linearGradient id="rtLandG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3f6d4"/><stop offset=".55" stop-color="#f6efc9"/><stop offset="1" stop-color="#f3dfae"/></linearGradient>
        <linearGradient id="rtLandN" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f3a2e"/><stop offset="1" stop-color="#3a3524"/></linearGradient>
        <pattern id="rtSand" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#c2830f" opacity=".45"/><circle cx="5.5" cy="5" r=".6" fill="#c2830f" opacity=".35"/></pattern>
        <radialGradient id="rtGlow"><stop offset="0" stop-color="#fde68a" stop-opacity=".9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
        <filter id="rtShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0b3b33" flood-opacity=".32"/></filter>
      </defs>
      <g id="rtWorld">
        <rect class="rt-sea" x="0" y="0" width="${G.W}" height="${G.H}"/>
        <g class="rt-waves">${waves}</g>
        <path class="rt-neighbors" d="${G.neighbors}"/>
        <path class="rt-land-shadow" d="${G.iran}" transform="translate(1.5 2.5)"/>
        <path class="rt-land" d="${G.iran}"/>
        <ellipse class="rt-desert" cx="${G.kavir[0]}" cy="${G.kavir[1]}" rx="40" ry="18"/>
        <ellipse class="rt-desert" cx="${G.lut[0]}" cy="${G.lut[1]}" rx="22" ry="33"/>
        <path class="rt-dune" d="M282,182 q6,-4 12,0 M300,174 q6,-4 12,0 M370,246 q5,-4 10,0 M364,262 q5,-4 10,0"/>
        <text class="rt-area" x="${G.kavir[0]}" y="${G.kavir[1] + 3}" text-anchor="middle">دشت کویر</text>
        <text class="rt-area" x="${G.lut[0]}" y="${G.lut[1] + 2}" text-anchor="middle">لوت</text>
        <g class="rt-rivers">
          ${['karun', 'zayandeh', 'sefidrud', 'aras'].map((r) => `<polyline class="rt-river" points="${G[r]}"/>`).join('')}
        </g>
        <g class="rt-mts">${mountains(G.zagros, false, 1)}${mountains(G.alborz, true, 2)}</g>
        <text class="rt-area rt-area-mt" x="300" y="122" text-anchor="middle">البرز</text>
        <text class="rt-area rt-area-mt" x="188" y="206" text-anchor="middle">زاگرس</text>
        <g class="rt-trees">${trees}</g>
        ${palm(186, 254)}${palm(212, 262)}${palm(318, 314)}${palm(344, 318)}
        <g class="rt-deco" transform="translate(266 202)" aria-hidden="true"><rect x="-3" y="-2" width="9" height="6" rx="1" class="rt-factory"/><rect x="3" y="-9" width="2" height="8" class="rt-chimney"/><circle class="rt-smoke" cx="4" cy="-11" r="2"/><circle class="rt-smoke rt-smoke-2" cx="4" cy="-11" r="2"/></g>
        <g class="rt-deco" transform="translate(214 260)" aria-hidden="true"><path d="M-3,5 L0,-6 L3,5 M-2,1 L2,1 M-1.5,-2 L1.5,-2" class="rt-derrick"/></g>
        <g class="rt-ship-track" aria-hidden="true"><g class="rt-ship"><path d="M-6,0 L6,0 L4,3 L-4,3 Z" class="rt-hull"/><rect x="-3" y="-3" width="5" height="3" class="rt-cabin"/><rect x="-1" y="-6" width="1" height="3" class="rt-cabin"/></g></g>
        <text class="rt-sea-label" x="240" y="56" text-anchor="middle">دریای خزر</text>
        <text class="rt-sea-label" x="232" y="318" text-anchor="middle">خلیج فارس</text>
        <text class="rt-sea-label" x="372" y="376" text-anchor="middle">دریای عمان</text>
        <g class="rt-roads">${roads}</g>
        <g class="rt-kms">${kmTags}</g>
        <g class="rt-fx" id="rtFx"></g>
        <g class="rt-stops">${STOPS.map((_, i) => stopSvg(i)).join('')}</g>
        <g class="rt-puffs" id="rtPuffs"></g>
        ${carSvg()}
        <g class="rt-finger" id="rtFinger" aria-hidden="true"><text text-anchor="middle">👇</text></g>
        <g class="rt-clouds" aria-hidden="true">${clouds}</g>
        <g class="rt-compass" transform="translate(140 352)" aria-hidden="true"><circle r="13"/><path d="M0,-11 L3,0 L0,11 L-3,0 Z" class="rt-compass-n"/><text y="-15" text-anchor="middle">ش</text></g>
      </g>
    </svg>`;
  }

  function trip() {
    const t = ctx.trip;
    if (!Number.isInteger(t.at) || t.at < 0 || t.at >= STOPS.length) t.at = 0;
    if (!Number.isFinite(t.km) || t.km < 0) t.km = 0;
    if (!Number.isInteger(t.paved) || t.paved < 1) t.paved = 1;
    // اگر ایستگاهی که ماشین در آن ایستاده دیگر در دسترس نیست، به آغاز برگرد
    if (t.at > 0 && stopState(t.at).locked) t.at = 0;
    return t;
  }

  /* ───────────── HTML بیرونی ───────────── */
  function render(c) {
    ctx = c;
    const t = trip();
    const total = ctx.missions.length;
    const doneStops = ctx.missions.filter((m, i) => ctx.solved(i) === m.tasks.length).length;
    return `<section class="rt-wrap" id="rtWrap" aria-labelledby="rtTitle">
      <div class="rt-head">
        <div>
          <span class="rt-eyebrow">🚗 سفر جاده‌ای ایران‌گرد</span>
          <h2 id="rtTitle" class="rt-title">با ماشین، ایران را ایستگاه به ایستگاه بگرد!</h2>
          <p class="rt-sub">روی یک ایستگاه باز بزن تا ماشین در جاده به آنجا برود و مأموریتش باز شود. با کامل کردن هر مأموریت، جادهٔ بعدی آسفالت می‌شود.</p>
        </div>
        <div class="rt-dash" aria-label="داشبورد سفر">
          <div class="rt-gauge"><span aria-hidden="true">🛣️</span><b id="rtOdo">${faNum(t.km)}</b><small>کیلومتر رانده‌ای</small></div>
          <div class="rt-gauge"><span aria-hidden="true">📍</span><b>${fa(doneStops)} / ${fa(total)}</b><small>ایستگاه کامل</small></div>
        </div>
      </div>
      <div class="rt-body">
        <div class="rt-stage">
          ${mapSvg()}
          <div class="rt-arrive" id="rtArrive" hidden></div>
          <div class="rt-ticker" id="rtTicker" hidden></div>
        </div>
        <aside class="rt-card" id="rtCard" aria-live="polite"></aside>
      </div>
      <p class="rt-sr" id="rtLive" aria-live="polite"></p>
    </section>`;
  }

  /* ───────────── کارت ایستگاه ───────────── */
  function cardHtml(i, mode) {
    const st = STOPS[i];
    const s = stopState(i);
    const here = trip().at === i;
    if (s.start) {
      const n = nextStop();
      return `<div class="rt-pc rt-pc-start">
        <div class="rt-pc-top"><span class="rt-pc-land" aria-hidden="true">🏁</span><div><small>نقطهٔ آغاز</small><h3>${esc(st.city)}</h3></div></div>
        <p class="rt-pc-why">${esc(st.why)}</p>
        ${n <= ctx.missions.length ? `<button type="button" class="btn-primary rt-go" data-rt-go="${n}">🚗 برو به ایستگاه ${fa(n)}: ${esc(STOPS[n].city)} ←</button>` : ''}
      </div>`;
    }
    const pct = Math.round((s.solved / s.total) * 100);
    let actions;
    if (s.locked) {
      actions = `<p class="rt-pc-lock">🔒 این جاده هنوز بسته است. اول مأموریت ایستگاه ${fa(i - 1)} (${esc(STOPS[i - 1].city)}) را کامل کن تا آسفالت شود.</p>`;
    } else if (!here) {
      actions = `<button type="button" class="btn-primary rt-go" data-rt-go="${i}">🚗 رانندگی تا ${esc(st.city)} ←</button>`;
    } else if (!s.seen) {
      actions = `<button type="button" class="btn-primary" data-rt-lesson="${s.mIdx}">📖 ورود به ایستگاه: شروع با درسنامه ←</button>`;
    } else {
      actions = `<div class="rt-pc-btns"><button type="button" class="btn-soft" data-rt-lesson="${s.mIdx}">📖 درسنامه</button>
        <button type="button" class="btn-primary" data-rt-play="${s.mIdx}">${s.full ? 'مرور چالش‌ها' : '🎯 چالش‌ها ←'}</button></div>`;
    }
    return `<div class="rt-pc ${s.locked ? 'is-locked' : ''} ${mode === 'arrived' ? 'is-arrived' : ''}">
      <div class="rt-pc-stamp" aria-hidden="true">${here ? 'اینجا هستی' : 'ایستگاه ' + fa(i)}</div>
      <div class="rt-pc-top"><span class="rt-pc-land" aria-hidden="true">${st.land}</span><div><small>ایستگاه ${fa(i)} از ${fa(ctx.missions.length)} · ${esc(st.city)}</small><h3>${esc(shortTitle(s.m))}</h3></div></div>
      <p class="rt-pc-sub">${esc(s.m.subtitle || '')}</p>
      <p class="rt-pc-why"><span aria-hidden="true">💡</span> ${esc(st.why)}</p>
      <div class="rt-pc-prog"><span class="rt-pc-bar"><i style="width:${pct}%"></i></span><small>${fa(s.solved)} از ${fa(s.total)} چالش · <span class="rt-pc-stars" aria-label="${fa(s.stars)} از ۳ ستاره">${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)}</span></small></div>
      ${actions}
    </div>`;
  }
  function travelCardHtml(from, to, k, kmDone) {
    return `<div class="rt-pc rt-pc-travel">
      <div class="rt-pc-top"><span class="rt-pc-land rt-wheel-spin" aria-hidden="true">🚗</span><div><small>در جاده…</small><h3>${esc(STOPS[from].city)} ← ${esc(STOPS[to].city)}</h3></div></div>
      <p class="rt-pc-why"><span aria-hidden="true">🗺️</span> ${esc(ROADS[k].fact)}</p>
      <div class="rt-pc-prog"><span class="rt-pc-bar"><i id="rtLeg" style="width:0%"></i></span><small id="rtLegKm">≈ ${faNum(kmDone)} کیلومتر</small></div>
    </div>`;
  }

  let selected = null;
  function showCard(i, mode) {
    selected = i;
    const card = root.querySelector('#rtCard');
    if (!card) return;
    card.innerHTML = cardHtml(i, mode);
    root.querySelectorAll('.rt-stop').forEach((g) => g.classList.toggle('is-selected', Number(g.dataset.rtStop) === i));
    bindCard(card);
  }
  function bindCard(card) {
    card.querySelectorAll('[data-rt-go]').forEach((b) => { b.onclick = () => driveTo(Number(b.dataset.rtGo)); });
    card.querySelectorAll('[data-rt-lesson]').forEach((b) => { b.onclick = () => ctx.openLesson(Number(b.dataset.rtLesson)); });
    card.querySelectorAll('[data-rt-play]').forEach((b) => { b.onclick = () => ctx.openTask(Number(b.dataset.rtPlay)); });
  }

  /* ───────────── ماشین ───────────── */
  function placeCar(x, y, deg) {
    const car = root && root.querySelector('#rtCar');
    if (car) car.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(1)})`);
  }
  function parkAt(i) {
    const [x, y] = stopXY(i);
    let deg = 0;
    const k = i < ROADS.length ? i : i - 1;
    const path = root.querySelector('#rtRoad' + k);
    if (path) {
      const L = path.getTotalLength();
      const atEnd = i > k;
      const a = path.getPointAtLength(atEnd ? Math.max(0, L - 3) : 0), b = path.getPointAtLength(atEnd ? L : 3);
      deg = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    }
    // ماشین کمی کنار ایستگاه پارک می‌شود تا روی نشان ایستگاه نیفتد
    placeCar(x + 15, y - 14, deg);
    root.querySelector('#rtCar').classList.add('is-parked');
  }
  function puff(x, y) {
    const layer = root.querySelector('#rtPuffs');
    if (!layer || layer.childNodes.length > 24) return;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', '1.8');
    c.setAttribute('class', 'rt-puff');
    layer.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
  function burst(x, y, cls) {
    const fx = root.querySelector('#rtFx');
    if (!fx) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x} ${y})`);
    g.setAttribute('class', 'rt-burst ' + (cls || ''));
    let inner = '<circle r="14" class="rt-burst-ring"/>';
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      inner += `<circle class="rt-spark" r="1.6" style="--dx:${(Math.cos(a) * 26).toFixed(1)}px;--dy:${(Math.sin(a) * 26).toFixed(1)}px;--c:${['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7'][k % 5]}"/>`;
    }
    g.innerHTML = inner;
    fx.appendChild(g);
    setTimeout(() => g.remove(), 1300);
  }

  /* موتور: صدای ملایم موتور فقط وقتی صدای بازی روشن است */
  function engineStart() {
    if (!ctx.sound()) return;
    try {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      const ac = engineStart._ac || (engineStart._ac = new AC());
      const osc = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = 62;
      lfo.frequency.value = 18; lg.gain.value = 6; lfo.connect(lg); lg.connect(osc.frequency);
      f.type = 'lowpass'; f.frequency.value = 380;
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.035, ac.currentTime + 0.25);
      osc.connect(f); f.connect(g); g.connect(ac.destination);
      osc.start(); lfo.start();
      engine = { ac, osc, lfo, g };
    } catch (_) { engine = null; }
  }
  function engineSpeed(v) { if (engine) try { engine.osc.frequency.setTargetAtTime(60 + v * 55, engine.ac.currentTime, 0.1); } catch (_) {} }
  function engineStop() {
    if (!engine) return;
    const e = engine; engine = null;
    try { e.g.gain.setTargetAtTime(0.0001, e.ac.currentTime, 0.12); setTimeout(() => { try { e.osc.stop(); e.lfo.stop(); } catch (_) {} }, 500); } catch (_) {}
  }
  function horn() {
    if (!ctx.sound()) return;
    try {
      const AC = global.AudioContext || global.webkitAudioContext;
      const ac = engineStart._ac || (engineStart._ac = new AC());
      [0, 0.22].forEach((t0) => {
        [415, 523].forEach((fq) => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'square'; o.frequency.value = fq;
          g.gain.setValueAtTime(0.025, ac.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + 0.16);
          o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + 0.17);
        });
      });
    } catch (_) {}
  }

  /* دوربین: هنگام رانندگی کمی نزدیک می‌شود و ماشین را دنبال می‌کند.
     بزرگ‌نمایی با transform روی خود svg انجام می‌شود تا مرورگر آن را روی GPU
     جابه‌جا کند و نقشهٔ پرجزئیات در هر فریم دوباره کشیده نشود. */
  // camVB = [tx%, ty%, zoom]
  function applyCam() {
    const svg = root && root.querySelector('#rtSvg');
    if (!svg) return;
    if (Math.abs(camVB[2] - 1) < 0.002) { svg.style.transform = ''; svg.classList.remove('is-cam'); return; }
    svg.classList.add('is-cam');
    svg.style.transform = `translate(${camVB[0].toFixed(3)}%, ${camVB[1].toFixed(3)}%) scale(${camVB[2].toFixed(4)})`;
  }
  function camTarget(x, y, zoom) {
    const fx = (x - BASE_VB[0]) / BASE_VB[2], fy = (y - BASE_VB[1]) / BASE_VB[3];
    const clamp = (v) => Math.min(0, Math.max((1 - zoom) * 100, v));
    return [clamp((0.5 - fx * zoom) * 100), clamp((0.5 - fy * zoom) * 100), zoom];
  }
  let camLast = 0;
  function camEase(target, now) {
    const dt = camLast ? Math.min(100, now - camLast) : 16;
    camLast = now;
    const k = 1 - Math.exp(-dt / 170);
    for (let n = 0; n < 3; n++) camVB[n] += (target[n] - camVB[n]) * k;
    applyCam();
  }
  function camHome() {
    camLast = 0;
    return new Promise((resolve) => {
      const svg = root && root.querySelector('#rtSvg');
      if (!svg || reduced()) { camVB = [0, 0, 1]; applyCam(); resolve(); return; }
      const from = camVB.slice(), t0 = performance.now(), dur = 650;
      const step = (now) => {
        if (!svg.isConnected) { resolve(); return; }
        const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
        camVB = [from[0] * (1 - e), from[1] * (1 - e), from[2] + (1 - from[2]) * e];
        applyCam();
        if (t < 1) requestAnimationFrame(step); else { camVB = [0, 0, 1]; applyCam(); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  function legsBetween(from, to) {
    const legs = [];
    if (to > from) for (let k = from; k < to; k++) legs.push({ k, rev: false, a: k, b: k + 1 });
    else for (let k = from - 1; k >= to; k--) legs.push({ k, rev: true, a: k + 1, b: k });
    return legs;
  }

  function driveLeg(leg, kmBefore) {
    return new Promise((resolve) => {
      const path = root.querySelector('#rtRoad' + leg.k);
      const svg = root.querySelector('#rtSvg');
      const car = root.querySelector('#rtCar');
      if (!path || !svg) { resolve(); return; }
      const L = path.getTotalLength();
      const dur = Math.min(3400, Math.max(1500, L * 14));
      const card = root.querySelector('#rtCard');
      card.innerHTML = travelCardHtml(leg.a, leg.b, leg.k, kmBefore);
      const ticker = root.querySelector('#rtTicker');
      ticker.hidden = false;
      ticker.textContent = '🚗 ' + STOPS[leg.a].city + ' ← ' + STOPS[leg.b].city;
      const t0 = performance.now();
      let lastPuff = 0;
      car.classList.remove('is-parked');
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const frame = (now) => {
        if (!svg.isConnected) { resolve(); return; }
        const t = Math.min(1, (now - t0) / dur);
        const e = ease(t);
        const pos = leg.rev ? L * (1 - e) : L * e;
        const p = path.getPointAtLength(pos);
        const ahead = path.getPointAtLength(Math.max(0, Math.min(L, pos + (leg.rev ? -2 : 2))));
        const behind = path.getPointAtLength(Math.max(0, Math.min(L, pos + (leg.rev ? 2 : -2))));
        const deg = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180 / Math.PI;
        placeCar(p.x, p.y, deg);
        const speed = Math.sin(Math.PI * t);
        engineSpeed(speed);
        if (now - lastPuff > 85 && speed > 0.15) {
          lastPuff = now;
          const r = deg * Math.PI / 180;
          puff(p.x - Math.cos(r) * 10, p.y - Math.sin(r) * 10);
        }
        camEase(camTarget(p.x, p.y, 1.5), now);
        const kmNow = kmBefore + ROADS[leg.k].km * e;
        const odo = root.querySelector('#rtOdo');
        if (odo) odo.textContent = faNum(kmNow);
        const bar = root.querySelector('#rtLeg');
        if (bar) bar.style.width = (e * 100).toFixed(1) + '%';
        const lk = root.querySelector('#rtLegKm');
        if (lk) lk.textContent = '≈ ' + faNum(ROADS[leg.k].km * e) + ' از ' + faNum(ROADS[leg.k].km) + ' کیلومتر';
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  async function driveTo(target) {
    if (driving || !root) return;
    const t = trip();
    if (target < 0 || target >= STOPS.length) return;
    const s = stopState(target);
    if (s.locked) {
      selectedLocked(target);
      return;
    }
    if (target === t.at) { arrive(target, false); return; }
    // همهٔ جاده‌های میان راه باید باز باشند
    const legs = legsBetween(t.at, target);
    if (legs.some((l) => !roadOpen(l.k))) { selectedLocked(target); return; }
    driving = true;
    root.classList.add('is-driving');
    const live = root.querySelector('#rtLive');
    if (live) live.textContent = 'ماشین به سوی ' + STOPS[target].city + ' راه افتاد.';
    if (reduced()) {
      legs.forEach((l) => { t.km += ROADS[l.k].km; });
      t.at = target;
      ctx.save();
      parkAt(target);
      driving = false;
      root.classList.remove('is-driving');
      arrive(target, true);
      return;
    }
    const wrap = root;
    wrap.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    engineStart();
    let km = t.km;
    for (const leg of legs) {
      await driveLeg(leg, km);
      if (!wrap.isConnected) { engineStop(); driving = false; return; }
      km += ROADS[leg.k].km;
      t.km = km;
      t.at = leg.b;
      if (leg.b !== target) burst(...stopXY(leg.b), 'is-pass');
    }
    engineStop();
    ctx.save();
    await camHome();
    parkAt(target);
    driving = false;
    root.classList.remove('is-driving');
    root.querySelector('#rtTicker').hidden = true;
    arrive(target, true);
  }

  function selectedLocked(i) {
    horn();
    ctx.tone && ctx.tone('err');
    const g = root.querySelector(`[data-rt-stop="${i}"]`);
    if (g) { g.classList.remove('is-shake'); void g.getBBox(); g.classList.add('is-shake'); setTimeout(() => g.classList.remove('is-shake'), 600); }
    const road = root.querySelector(`[data-road="${Math.max(0, i - 1)}"]`);
    if (road) { road.classList.add('is-flash'); setTimeout(() => road.classList.remove('is-flash'), 1200); }
    showCard(i);
    if (i > 0) ctx.lockedNotice(i - 1);
  }

  function arrive(i, travelled) {
    const s = stopState(i);
    showCard(i, travelled ? 'arrived' : '');
    if (!travelled) return;
    burst(...stopXY(i));
    ctx.tone && ctx.tone('win');
    const live = root.querySelector('#rtLive');
    if (live) live.textContent = 'به ' + STOPS[i].city + ' رسیدی!';
    if (s.start) return;
    const ban = root.querySelector('#rtArrive');
    ban.innerHTML = `<span class="rt-arrive-land" aria-hidden="true">${STOPS[i].land}</span><b>به ${esc(STOPS[i].city)} رسیدی!</b><small>ایستگاه ${fa(i)} · ${esc(shortTitle(s.m))}</small>${!s.seen ? '<em>ورود به ایستگاه…</em>' : ''}`;
    ban.hidden = false;
    ban.classList.remove('is-out');
    if (s.seen) ctx.say && ctx.say('به ' + STOPS[i].city + ' رسیدیم! ' + STOPS[i].why);
    // ایستگاه تازه ← مأموریت خودش باز می‌شود (درسنامه)
    if (!s.seen && !s.locked) {
      setTimeout(() => { if (root && root.isConnected && trip().at === i) ctx.openLesson(s.mIdx); }, reduced() ? 900 : 1700);
    } else {
      setTimeout(() => { if (ban.isConnected) { ban.classList.add('is-out'); setTimeout(() => { ban.hidden = true; }, 400); } }, 1800);
    }
  }

  /* جاده‌های تازه‌بازشده با انیمیشن آسفالت می‌شوند */
  function paveNew() {
    const t = trip();
    let open = 0;
    ROADS.forEach((_, k) => { if (roadOpen(k)) open = k + 1; });
    if (open > t.paved) {
      for (let k = t.paved; k < open; k++) {
        const g = root.querySelector(`[data-road="${k}"]`);
        if (!g) continue;
        if (!reduced()) {
          g.querySelectorAll('path').forEach((p) => {
            const L = p.getTotalLength();
            p.style.setProperty('--len', L.toFixed(1));
          });
          g.classList.add('is-paving');
          setTimeout(() => g.classList.remove('is-paving'), 2600);
        }
        setTimeout(() => burst(...stopXY(k + 1), 'is-unlock'), reduced() ? 0 : 1500);
      }
      ctx.toast && ctx.toast('🛣️ جادهٔ تازه آسفالت شد! ایستگاه ' + fa(open) + ' (' + STOPS[open].city + ') باز شد.');
      t.paved = open;
      ctx.save();
    }
  }

  function placeFinger() {
    const f = root.querySelector('#rtFinger');
    if (!f) return;
    const n = nextStop();
    const t = trip();
    if (n > ctx.missions.length || n === t.at || stopState(n).locked) { f.style.display = 'none'; return; }
    const [x, y] = stopXY(n);
    f.style.display = '';
    f.setAttribute('transform', `translate(${x} ${y - 24})`);
  }

  function mount(el, c) {
    ctx = c || ctx;
    root = el && el.querySelector ? el.querySelector('#rtWrap') : null;
    if (!root) return;
    driving = false;
    camVB = [0, 0, 1];
    camLast = 0;
    const t = trip();
    // برچسب مسافت وسط هر جاده
    ROADS.forEach((_, k) => {
      const p = root.querySelector('#rtRoad' + k), tag = root.querySelector(`[data-km="${k}"]`);
      if (!p || !tag) return;
      const L = p.getTotalLength(), m = p.getPointAtLength(L * 0.5);
      tag.setAttribute('transform', `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`);
    });
    parkAt(t.at);
    placeFinger();
    root.querySelectorAll('.rt-stop').forEach((g) => {
      const go = () => {
        const i = Number(g.dataset.rtStop);
        if (driving) return;
        if (stopState(i).locked) { selectedLocked(i); return; }
        if (i === trip().at) { showCard(i); return; }
        driveTo(i).then(placeFinger);
      };
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    showCard(t.at);
    paveNew();
  }

  // برای دکمهٔ «ادامهٔ سفر» در بالای صفحه
  function goNext() {
    const n = Math.min(nextStop(), ctx.missions.length);
    if (trip().at === n) {
      const s = stopState(n);
      if (!s.seen) ctx.openLesson(s.mIdx); else showCard(n);
      root && root.scrollIntoView?.({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
      return Promise.resolve();
    }
    root && root.scrollIntoView?.({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
    return new Promise((r) => setTimeout(r, reduced() ? 0 : 450)).then(() => driveTo(n)).then(placeFinger);
  }

  global.IranGeoRoad = { render, mount, driveTo, goNext, STOPS, ROADS };
})(typeof window !== 'undefined' ? window : globalThis);
