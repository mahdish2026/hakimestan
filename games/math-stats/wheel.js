/* ═══════════════════════════════════════════════════════════════
   چرخ‌وفلکِ شانس و داشبورد آماری آمارستان
   ایستگاه‌ها برش‌های یک چرخندهٔ رنگی‌اند. شعاعِ رنگیِ هر برش به
   اندازهٔ پیشرفت همان ایستگاه است (نمودار گل‌سرخی)؛ با لمس برش،
   چرخنده می‌چرخد، تق‌تق می‌کند و روی همان ایستگاه می‌ایستد.
   زیر چرخنده، داده‌های خودِ بازیکن با همان نمودارهای کتاب کشیده
   می‌شود: ستونی با خط میانگین، خط شکسته، دایره‌ای و چوب‌خط.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const K = global.HakimScene;
  if (!K) return;
  const { fa, faDec, esc } = K;

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
  const LIGHT = ['#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3'];
  const LINKS = [
    'چوب‌خط و جدول داده، اولین ابزار آمارشناس‌هاست.',
    'نمودار ستونی برای مقایسه و نمودار دایره‌ای برای سهم هر بخش از کل.',
    'نمودار خط شکسته روند افزایشی، کاهشی یا ثابتِ داده‌ها را نشان می‌دهد.',
    'برای «تغییر در زمان» خط شکسته، برای «مقایسه» ستونی و برای «سهم از کل» دایره‌ای.',
    'میانگین یعنی ستون‌ها را هم‌قد کنیم: از بلندها برداریم و به کوتاه‌ها بدهیم.',
    'میانگین = مجموع داده‌ها ÷ تعداد داده‌ها؛ و صفر هم یک داده است!',
    'اگر میانگین و تعداد را بدانیم، مجموع را داریم و عدد گم‌شده پیدا می‌شود.',
    'هرچه سهم یک رنگ در چرخنده بیشتر باشد، احتمال ایستادن روی آن بیشتر است.',
    'در پرتاب دو تاس، مجموع ۷ بیشترین حالت را دارد؛ بازی عادلانه یعنی شانس برابر.'
  ];
  const CX = 210, CY = 222, R = 166, R0 = 38;

  let ctx = null, root = null, sfx = null, angle = 0, spinning = false;

  function unit(i) {
    const st = ctx.stages[i];
    const solved = ctx.solved(i), total = st.tasks.length;
    return { idx: i, st, solved, total, stars: ctx.stars(i), seen: ctx.seen(i) || solved > 0, locked: ctx.locked(i), full: solved >= total };
  }
  const n = () => ctx.stages.length;
  const step = () => 360 / n();
  function nextIdx() { const k = ctx.stages.findIndex((s, i) => unit(i).solved < s.tasks.length); return k < 0 ? n() - 1 : k; }
  const pol = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
  function wedge(r1, r2, a1, a2) {
    const [x1, y1] = pol(r2, a1), [x2, y2] = pol(r2, a2), [x3, y3] = pol(r1, a2), [x4, y4] = pol(r1, a1);
    const big = a2 - a1 > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r2} ${r2} 0 ${big} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${r1} ${r1} 0 ${big} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
  }

  /* ───────────── چرخنده ───────────── */
  function sliceSvg(i) {
    const u = unit(i), s = step();
    const a1 = i * s - s / 2 + 0.6, a2 = i * s + s / 2 - 0.6;
    const rr = R0 + (R - 12 - R0) * (u.solved / u.total);
    const [ix, iy] = pol(R - 34, i * s), [nx, ny] = pol(R - 64, i * s);
    const label = `ایستگاه ${fa(i + 1)}: ${K.shortTitle(u.st.title)} — ${u.locked ? 'قفل' : fa(u.solved) + ' از ' + fa(u.total) + ' تمرین'}`;
    return `<g class="aw-slice ${u.locked ? 'is-locked' : ''} ${u.full ? 'is-full' : ''} ${i === nextIdx() && !u.full ? 'is-next' : ''}" data-aw-slice="${i}" role="button" tabindex="0" aria-label="${esc(label)}">
      <path class="aw-bg" d="${wedge(R0, R - 12, a1, a2)}" fill="${u.locked ? 'url(#awHatch)' : LIGHT[i]}"/>
      ${u.solved ? `<path class="aw-fill" d="${wedge(R0, rr, a1, a2)}" fill="${COLORS[i]}" style="--d:${i * 0.06}s"/>` : ''}
      <path class="hs-focus" d="${wedge(R0, R - 12, a1, a2)}"/>
      <text class="aw-icon" x="${ix.toFixed(1)}" y="${(iy + 7).toFixed(1)}" text-anchor="middle" transform="rotate(${i * s} ${ix.toFixed(1)} ${iy.toFixed(1)})">${u.locked ? '🔒' : u.st.icon}</text>
      <text class="aw-num" x="${nx.toFixed(1)}" y="${(ny + 5).toFixed(1)}" text-anchor="middle" transform="rotate(${i * s} ${nx.toFixed(1)} ${ny.toFixed(1)})">${fa(i + 1)}</text>
      ${u.full ? `<text class="aw-star" x="${pol(R - 92, i * s)[0].toFixed(1)}" y="${(pol(R - 92, i * s)[1] + 5).toFixed(1)}" text-anchor="middle">${'★'.repeat(u.stars)}</text>` : ''}
    </g>`;
  }
  function wheelSvg() {
    const s = step();
    const pegs = Array.from({ length: n() }, (_, i) => { const [x, y] = pol(R - 4, i * s + s / 2); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="aw-peg"/>`; }).join('');
    const bulbs = Array.from({ length: 36 }, (_, i) => { const [x, y] = pol(R + 12, i * 10); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="aw-bulb ${i % 2 ? 'b' : 'a'}"/>`; }).join('');
    const rings = [0.25, 0.5, 0.75, 1].map((f) => `<circle cx="${CX}" cy="${CY}" r="${(R0 + (R - 12 - R0) * f).toFixed(1)}" class="aw-ring"/>`).join('');
    return `<svg class="aw-svg" viewBox="0 0 420 430" role="group" aria-label="چرخندهٔ ایستگاه‌ها: نه برش رنگی؛ روی هر برش بزن تا چرخنده بچرخد و آن ایستگاه باز شود" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="awHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#e2e8f0"/><rect width="3" height="8" fill="#cbd5e1"/></pattern>
        <radialGradient id="awHub" cx=".35" cy=".3"><stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
      </defs>
      <circle cx="${CX}" cy="${CY + 8}" r="${R + 20}" class="aw-shadow"/>
      <circle cx="${CX}" cy="${CY}" r="${R + 20}" class="aw-rim"/>
      ${bulbs}
      <g id="awRotor" transform="rotate(${angle.toFixed(2)} ${CX} ${CY})">
        <circle cx="${CX}" cy="${CY}" r="${R - 10}" class="aw-face"/>
        ${ctx.stages.map((_, i) => sliceSvg(i)).join('')}
        <g class="aw-rings" aria-hidden="true">${rings}</g>
        ${pegs}
      </g>
      <g class="aw-hub" data-aw-hub role="button" tabindex="0" aria-label="چرخاندن به سوی ایستگاه بعدی">
        <circle cx="${CX}" cy="${CY}" r="${R0 - 2}" fill="url(#awHub)" class="aw-hub-c"/>
        <circle cx="${CX}" cy="${CY}" r="${R0 + 3}" class="hs-focus"/>
        <text x="${CX}" y="${CY - 2}" text-anchor="middle" class="aw-hub-t">بچرخان</text>
        <text x="${CX}" y="${CY + 15}" text-anchor="middle" class="aw-hub-i">🎯</text>
      </g>
      <g id="awFlap" class="aw-flap" transform="rotate(0 ${CX} 30)">
        <path d="M${CX - 15} 18 h30 l-15 34 Z" class="aw-flap-p"/><circle cx="${CX}" cy="22" r="6" class="aw-flap-c"/>
      </g>
      <text x="${CX}" y="424" text-anchor="middle" class="aw-caption">شعاع رنگی هر برش = سهم تمرین‌های حل‌شدهٔ همان ایستگاه</text>
    </svg>`;
  }

  /* ───────────── نمودارهای داشبورد (داده‌های خود بازیکن) ───────────── */
  function barChart() {
    const W = 300, H = 160, pad = 26, bw = (W - pad - 8) / n();
    const stars = ctx.stages.map((_, i) => unit(i).stars);
    const mean = stars.reduce((a, b) => a + b, 0) / stars.length;
    const y = (v) => H - 22 - (v / 3) * (H - 44);
    const bars = stars.map((v, i) => `<rect class="aw-bar" style="--d:${i * 0.07}s" x="${(pad + i * bw + 3).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${Math.max(0, H - 22 - y(v)).toFixed(1)}" rx="3" fill="${COLORS[i]}"/>
      <text x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="aw-ax">${fa(i + 1)}</text>`).join('');
    const grid = [0, 1, 2, 3].map((v) => `<line x1="${pad}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" class="aw-grid"/><text x="${pad - 6}" y="${y(v) + 4}" text-anchor="end" class="aw-ax">${fa(v)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="نمودار ستونی ستاره‌های هر ایستگاه؛ میانگین ${faDec(mean)} ستاره">
      ${grid}${bars}
      <line class="aw-mean" x1="${pad}" x2="${W - 4}" y1="${y(mean).toFixed(1)}" y2="${y(mean).toFixed(1)}"/>
      <text class="aw-mean-t" x="${(pad + W) / 2}" y="${(y(mean) - 5).toFixed(1)}" text-anchor="middle">میانگین = ${faDec(mean)}</text>
    </svg>`;
  }
  const WD = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  function lineChart() {
    const W = 300, H = 160, pad = 26;
    const daily = ctx.daily || {};
    const days = Object.keys(daily).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-7);
    if (days.length < 2) {
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="نمودار خط شکسته هنوز دادهٔ کافی ندارد">
        <polyline class="aw-ghost" points="30,120 75,96 120,104 165,70 210,78 255,44 290,52"/>
        <text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" class="aw-empty">در دو روز مختلف تمرین حل کن</text>
        <text x="${W / 2}" y="${H / 2 + 24}" text-anchor="middle" class="aw-empty">تا نمودار روند تو کشیده شود 📈</text>
      </svg>`;
    }
    const vals = days.map((d) => Number(daily[d]) || 0);
    const max = Math.max(3, ...vals);
    const x = (k) => pad + 8 + (k * (W - pad - 22)) / (days.length - 1);
    const y = (v) => H - 26 - (v / max) * (H - 50);
    const pts = vals.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const lab = days.map((d, k) => { const wd = WD[new Date(d + 'T12:00:00').getDay()]; return `<text x="${x(k).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="aw-ax aw-ax-day">${esc(wd)}</text>`; }).join('');
    const dots = vals.map((v, k) => `<circle cx="${x(k).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" class="aw-dot" style="--d:${0.3 + k * 0.12}s"/><text x="${x(k).toFixed(1)}" y="${(y(v) - 9).toFixed(1)}" text-anchor="middle" class="aw-val">${fa(v)}</text>`).join('');
    const trend = vals[vals.length - 1] > vals[vals.length - 2] ? 'افزایشی ↗' : vals[vals.length - 1] < vals[vals.length - 2] ? 'کاهشی ↘' : 'ثابت →';
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="نمودار خط شکسته تمرین‌های حل‌شده در ${fa(days.length)} روز اخیر؛ روند ${trend}">
      <line x1="${pad}" x2="${W - 4}" y1="${H - 26}" y2="${H - 26}" class="aw-grid"/>
      <polyline class="aw-line" points="${pts}" pathLength="1"/>
      ${dots}${lab}
      <text x="${W / 2}" y="14" text-anchor="middle" class="aw-trend">روند: ${trend}</text>
    </svg>`;
  }
  function pieChart() {
    const all = ctx.stages.reduce((a, s) => a + s.tasks.length, 0);
    const solved = ctx.stages.reduce((a, s, i) => a + unit(i).solved, 0);
    const guided = Math.min(solved, ctx.guided ? ctx.guided() : 0);
    const self = solved - guided;
    const C = 2 * Math.PI * 50;
    const seg = (v, off, cls) => `<circle cx="80" cy="80" r="50" class="aw-pie ${cls}" style="--len:${((v / all) * C).toFixed(2)};--off:${(-(off / all) * C).toFixed(2)}" stroke-dasharray="${((v / all) * C).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-(off / all) * C).toFixed(2)}"/>`;
    const pct = Math.round((solved / all) * 100);
    return `<svg viewBox="0 0 300 160" role="img" aria-label="نمودار دایره‌ای: ${fa(self)} تمرین بدون راهنما، ${fa(guided)} با راهنما و ${fa(all - solved)} باقی‌مانده از ${fa(all)}">
      <circle cx="80" cy="80" r="50" class="aw-pie-bg"/>
      <g transform="rotate(-90 80 80)">${seg(self, 0, 'p1')}${seg(guided, self, 'p2')}</g>
      <text x="80" y="86" text-anchor="middle" class="aw-pct">${fa(pct)}٪</text>
      <g class="aw-legend"><rect x="276" y="40" width="14" height="14" rx="3" class="p1f"/><text x="212" y="52" text-anchor="middle">بدون راهنما: ${fa(self)}</text>
      <rect x="276" y="70" width="14" height="14" rx="3" class="p2f"/><text x="212" y="82" text-anchor="middle">با راهنما: ${fa(guided)}</text>
      <rect x="276" y="100" width="14" height="14" rx="3" class="p3f"/><text x="212" y="112" text-anchor="middle">مانده: ${fa(all - solved)}</text></g>
    </svg>`;
  }
  function tally() {
    const solved = ctx.stages.reduce((a, s, i) => a + unit(i).solved, 0);
    const groups = Math.ceil(solved / 5);
    let out = '';
    for (let g = 0; g < Math.max(1, groups); g++) {
      const gx = 14 + (g % 6) * 46, gy = 22 + Math.floor(g / 6) * 52;
      const inG = Math.min(5, solved - g * 5);
      for (let k = 0; k < Math.min(4, inG); k++) out += `<line class="aw-tally" style="--d:${(g * 5 + k) * 0.03}s" x1="${gx + k * 8}" y1="${gy}" x2="${gx + k * 8 + 1}" y2="${gy + 34}" pathLength="1"/>`;
      if (inG === 5) out += `<line class="aw-tally aw-tally-x" style="--d:${(g * 5 + 4) * 0.03}s" x1="${gx - 4}" y1="${gy + 28}" x2="${gx + 30}" y2="${gy + 6}" pathLength="1"/>`;
    }
    if (!solved) out = `<text x="150" y="80" text-anchor="middle" class="aw-empty">هر پاسخ درست، یک خط چوب‌خط ✏️</text>`;
    const h = Math.max(160, 22 + Math.ceil(Math.max(1, groups) / 6) * 52 + 12);
    return `<svg viewBox="0 0 300 ${h}" role="img" aria-label="چوب‌خط ${fa(solved)} پاسخ درست">${out}</svg>`;
  }
  function dashboard() {
    const box = (icon, title, link, svg, cls = '') => `<figure class="aw-chart ${cls}"><figcaption><b>${icon} ${esc(title)}</b><small>${esc(link)}</small></figcaption>${svg}</figure>`;
    return `<div class="aw-dash" aria-label="داشبورد آماری من">
      <h3 class="aw-dash-title">📊 داشبورد آماری من <small>— نمودارهای کتاب، این بار با داده‌های خودت!</small></h3>
      <div class="aw-dash-grid">
        ${box('📊', 'ستاره‌های هر ایستگاه', 'نمودار ستونی + خط میانگین (ایستگاه ۲ و ۵)', barChart())}
        ${box('📈', 'تمرین‌های حل‌شده در روزهای اخیر', 'نمودار خط شکسته و روند (ایستگاه ۳)', lineChart())}
        ${box('🥧', 'سهم هر بخش از کل تمرین‌ها', 'نمودار دایره‌ای (ایستگاه ۲)', pieChart())}
        ${box('✏️', 'چوب‌خطِ پاسخ‌های درست', 'شمارش با چوب‌خط (ایستگاه ۱)', tally(), 'aw-chart-tally')}
      </div>
    </div>`;
  }

  /* ───────────── قاب ───────────── */
  function render(c) {
    ctx = c;
    sfx = K.sfx(ctx.sound);
    const units = ctx.stages.map((s, i) => unit(i));
    const done = units.filter((u) => u.full).length;
    const stars = units.reduce((a, u) => a + u.stars, 0);
    angle = -nextIdx() * step();
    return K.shell({
      id: 'awWrap', cls: 'aw-wrap', eyebrow: '🎡 چرخندهٔ شانس آمارستان',
      title: 'بچرخان، بایست، کشف کن!',
      sub: 'هر برش این چرخنده یک ایستگاه است و هرچه بیشتر تمرین حل کنی، رنگش بلندتر می‌شود (نمودار گل‌سرخی!). روی یک برش بزن تا چرخنده بچرخد و همان ایستگاه باز شود.',
      gauges: [
        { icon: '🎯', val: `${fa(done)} / ${fa(units.length)}`, label: 'ایستگاه کامل' },
        { icon: '⭐', val: `${fa(stars)}`, label: 'ستارهٔ جمع‌شده' }
      ],
      stage: wheelSvg(),
      after: dashboard()
    });
  }

  function showCard(i) {
    const card = root.querySelector('[data-hs-card]');
    if (!card) return;
    const u = unit(i);
    card.innerHTML = K.card({
      stamp: u.full ? 'کامل ✓' : u.locked ? 'قفل' : 'ایستگاه ' + fa(i + 1),
      icon: u.st.icon, kicker: `ایستگاه ${fa(i + 1)} از ${fa(n())} · نشان «${u.st.badge || ''}»`,
      title: K.shortTitle(u.st.title), sub: u.st.topic, why: LINKS[i] || '',
      solved: u.solved, total: u.total, stars: u.stars, locked: u.locked, full: u.full,
      actions: K.unitActions(u, { lockedMsg: `این برش هنوز قفل است؛ اول ایستگاه ${fa(i)} را کامل کن.` }),
      cls: 'aw-card'
    });
    card.querySelector('.hs-card').style.setProperty('--aw-c', COLORS[i]);
    root.querySelectorAll('.aw-slice').forEach((g) => g.classList.toggle('is-selected', Number(g.dataset.awSlice) === i));
    K.bindCard(card, ctx);
  }

  function setAngle(a) {
    angle = a;
    const r = root.querySelector('#awRotor');
    if (r) r.setAttribute('transform', `rotate(${a.toFixed(2)} ${CX} ${CY})`);
  }
  let flapT = 0;
  function kickFlap() {
    const f = root.querySelector('#awFlap');
    if (!f) return;
    f.setAttribute('transform', `rotate(-22 ${CX} 22)`);
    clearTimeout(flapT);
    flapT = setTimeout(() => f.setAttribute('transform', `rotate(0 ${CX} 22)`), 70);
  }
  async function spinTo(i) {
    const s = step();
    const target = -i * s;
    let delta = ((target - angle) % 360 + 360) % 360;
    if (delta < 1) delta = 0;
    const turns = K.reduced() ? 0 : 360;
    const from = angle, to = angle + delta + turns;
    let lastPeg = Math.floor((from + s / 2) / s);
    await K.tween(K.reduced() ? 0 : 1300 + (delta + turns) * 1.2, (e) => {
      const a = from + (to - from) * e;
      setAngle(a);
      const peg = Math.floor((a + s / 2) / s);
      if (peg !== lastPeg) { lastPeg = peg; sfx.tick(); kickFlap(); }
    }, K.ease.out);
    setAngle(((to % 360) + 360) % 360);
  }

  async function select(i) {
    if (spinning) return;
    const u = unit(i);
    if (u.locked) {
      sfx.lock();
      const g = root.querySelector(`[data-aw-slice="${i}"]`);
      if (g) { g.classList.remove('is-shake'); void g.getBBox(); g.classList.add('is-shake'); }
      showCard(i);
      ctx.lockedNotice(i);
      return;
    }
    spinning = true;
    root.classList.add('is-busy');
    K.live(root, `چرخنده به سوی ایستگاه ${fa(i + 1)} می‌چرخد`);
    sfx.whoosh();
    await spinTo(i);
    spinning = false;
    root.classList.remove('is-busy');
    showCard(i);
    const g = root.querySelector(`[data-aw-slice="${i}"]`);
    if (g) { g.classList.remove('is-landed'); void g.getBBox(); g.classList.add('is-landed'); }
    sfx.chime();
    K.confetti(root.querySelector('.hs-stage'), 50, 12, { count: 18, colors: [COLORS[i], '#fde047', '#fff'] });
    if (!u.seen) {
      K.banner(root, `🎯 روی «${esc(K.shortTitle(u.st.title))}» ایستاد! درسنامه باز می‌شود…`, 1300);
      setTimeout(() => { if (root && root.isConnected) ctx.openLesson(i); }, K.reduced() ? 300 : 1300);
    } else {
      K.banner(root, u.full ? `🏆 ایستگاه ${fa(i + 1)} کامل است؛ برای مرور آماده‌ای؟` : `🎯 ایستگاه ${fa(i + 1)}: ${fa(u.total - u.solved)} تمرین دیگر تا تکمیل برش`, 1800);
    }
  }

  function mount(el, c) {
    ctx = c;
    sfx = K.sfx(ctx.sound);
    root = (el || document).querySelector('#awWrap');
    if (!root) return;
    spinning = false;
    K.bindKeys(root, '[data-aw-slice]', (g) => select(Number(g.dataset.awSlice)));
    K.bindKeys(root, '[data-aw-hub]', () => select(nextIdx()));
    showCard(nextIdx());
    // نمودارها وقتی دیده شوند، با انیمیشن کشیده می‌شوند
    const dash = root.querySelector('.aw-dash');
    if (dash && 'IntersectionObserver' in global && !K.reduced()) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { dash.classList.add('is-drawn'); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(dash);
    } else if (dash) dash.classList.add('is-drawn');
  }
  function goNext() {
    const i = nextIdx();
    if (root && root.isConnected) { root.scrollIntoView({ behavior: K.reduced() ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => select(i), K.reduced() ? 0 : 450); }
    else ctx.openLesson(i);
  }

  global.AmarWheel = { render, mount, goNext, COLORS };
})(window);
