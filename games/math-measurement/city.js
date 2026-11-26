/* ═══════════════════════════════════════════════════════════════
   شهرک معمارهای پیمانه‌ستان
   هر ایستگاه یک زمین ساختمانی است. با لمس زمین، جرثقیل برجی
   به آنجا می‌رود؛ با حل هر تمرین یک «طبقه» از ساختمانِ مخصوص همان
   درس بالا می‌رود (چرخ‌وفلکِ عدد پی، پل طاق‌دار، برج آب و …).
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const K = global.HakimScene;
  if (!K) return;
  const { fa, esc } = K;

  // ردیف عقب از راست به چپ (ایستگاه ۱ تا ۵)، ردیف جلو از چپ به راست (۶ تا ۱۰)
  const POS = [
    { x: 875, y: 318, s: 0.8 }, { x: 715, y: 318, s: 0.8 }, { x: 555, y: 318, s: 0.8 }, { x: 395, y: 318, s: 0.8 }, { x: 235, y: 318, s: 0.8 },
    { x: 175, y: 478, s: 1 }, { x: 340, y: 478, s: 1 }, { x: 505, y: 478, s: 1 }, { x: 670, y: 478, s: 1 }, { x: 838, y: 478, s: 1 }
  ];
  const LOTS = [
    { name: 'کاشی‌خانهٔ لوزی', icon: '❖', fact: 'نمای این عمارت با کاشی‌های لوزی پوشیده شده؛ مساحت هر کاشی = (قطر بزرگ × قطر کوچک) ÷ ۲.' },
    { name: 'انبار سقف‌ذوزنقه', icon: '🏚️', fact: 'دیوارهٔ بام این انبار ذوزنقه است؛ مساحتش = (قاعدهٔ بزرگ + قاعدهٔ کوچک) × ارتفاع ÷ ۲.' },
    { name: 'خانهٔ تکه‌تکه', icon: '🏠', fact: 'این خانه از مستطیل، مثلث و نیم‌دایره ساخته شده؛ مساحت کل = جمع مساحت تکه‌ها.' },
    { name: 'چرخ‌وفلک عدد پی', icon: '🎡', fact: 'هر دور کامل چرخ‌وفلک یعنی پیمودن محیط دایره: قطر × ۳٫۱۴.' },
    { name: 'پل طاق‌دار', icon: '🌉', fact: 'هر طاق این پل یک کمان نیم‌دایره است؛ طول کمان = نصف محیط دایرهٔ کامل.' },
    { name: 'برج مکعب‌های واحد', icon: '🧊', fact: 'حجم یعنی شمارش مکعب‌های واحدی که فضای جسم را پر می‌کنند.' },
    { name: 'برج مکعب‌مستطیل', icon: '🏢', fact: 'حجم این برج = طول × عرض × ارتفاع؛ یعنی کف را حساب کن و در تعداد لایه‌ها ضرب کن.' },
    { name: 'عمارت L شکل', icon: '🏗️', fact: 'روش کوروش: با یک برش فرضی، این عمارت را به دو مکعب‌مستطیل تقسیم کن و حجم‌ها را جمع بزن.' },
    { name: 'برج آب ۱۰۰۰ لیتری', icon: '🚰', fact: 'هر ۱۰۰۰ سانتی‌متر مکعب = ۱ لیتر؛ و هر سی‌سی همان یک میلی‌لیتر است.' },
    { name: 'برج آکواریوم استادی', icon: '🐠', fact: 'آکواریوم سعید و پاکت‌های شیر نیلوفر اینجا منتظرند؛ همهٔ مهارت‌های فصل را با هم به کار ببر!' }
  ];
  const JIB_Y = 78;
  const MAST_X = 60;

  let ctx = null, root = null, busy = false, sfx = null, trolleyX = 520, hookY = 150;

  /* ───────────── ساختمان‌ها (مبدأ: وسطِ پایین) ───────────── */
  const win = (x, y, w = 10, h = 12) => `<rect class="cy-win" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
  function bRhombus() {
    return { h: 172, w: 116, svg: `
      <rect x="-55" y="-110" width="110" height="110" fill="url(#cyRhomb)" stroke="#155e75" stroke-width="2"/>
      <rect x="-60" y="-118" width="120" height="10" rx="3" fill="#0e7490"/>
      <path d="M-14 0 V-34 a14 14 0 0 1 28 0 V0 Z" fill="#7c2d12"/>
      <rect x="-26" y="-138" width="52" height="22" fill="#e9d5a7"/>
      <path d="M-30 -138 C-30 -170 -4 -168 0 -184 C4 -168 30 -170 30 -138 Z" fill="#0891b2" stroke="#155e75" stroke-width="2"/>
      <path d="M-16 -142 C-14 -160 -4 -160 0 -172" fill="none" stroke="#a5f3fc" stroke-width="2" opacity=".7"/>
      <circle cy="-186" r="3" fill="#facc15"/>` };
  }
  function bTrapezoid() {
    return { h: 132, w: 136, svg: `
      <rect x="-58" y="-82" width="116" height="82" fill="#b45309"/>
      <path d="M-58 -82 h116 v82 h-116z" fill="url(#cyBrick)"/>
      <path d="M-68 -80 L68 -80 L40 -130 L-40 -130 Z" fill="#334155" stroke="#1e293b" stroke-width="2"/>
      <path d="M-52 -88 L52 -88 L32 -122 L-32 -122 Z" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/>
      <rect x="-20" y="-50" width="40" height="50" fill="#78350f"/><path d="M-20 -50 L20 0 M20 -50 L-20 0" stroke="#fbbf24" stroke-width="2"/>
      ${win(-48, -66, 16, 14)}${win(32, -66, 16, 14)}` };
  }
  function bComposite() {
    return { h: 140, w: 120, svg: `
      <rect x="40" y="-128" width="14" height="30" fill="#7f1d1d"/>
      <rect x="-50" y="-84" width="100" height="84" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
      <path d="M-60 -82 L0 -132 L60 -82 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <path d="M-14 0 V-36 h28 V0" fill="#92400e"/>
      <path d="M-14 -40 a14 14 0 0 1 28 0 Z" fill="#7dd3fc" stroke="#b45309" stroke-width="2"/>
      ${win(-40, -66, 18, 18)}${win(22, -66, 18, 18)}
      <circle cy="-104" r="9" class="cy-win"/>` };
  }
  function bWheel() {
    const r = 64, cy = -86;
    const cabins = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];
      return `<line x1="0" y1="0" x2="${(Math.cos(a) * r).toFixed(1)}" y2="${(Math.sin(a) * r).toFixed(1)}" stroke="#64748b" stroke-width="2"/>
        <circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="8" fill="${colors[i]}" stroke="#fff" stroke-width="1.5"/>`;
    }).join('');
    return { h: 160, w: 140, svg: `
      <path d="M-44 0 L0 ${cy} L44 0" fill="none" stroke="#475569" stroke-width="6" stroke-linejoin="round"/>
      <g transform="translate(0 ${cy})">
        <g class="cy-spin">
          <circle r="${r}" fill="none" stroke="#94a3b8" stroke-width="4"/>
          <circle r="${r - 10}" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 4"/>
          ${cabins}
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="16s" repeatCount="indefinite"/>
        </g>
        <circle r="8" fill="#f59e0b" stroke="#fff" stroke-width="2"/>
      </g>
      <rect x="-52" y="-6" width="104" height="8" rx="3" fill="#475569"/>` };
  }
  function bBridge() {
    const arches = [-60, -30, 0, 30, 60].map((x) => `<path d="M${x - 12} 0 V-14 a12 12 0 0 1 24 0 V0 Z" fill="#0c4a6e"/>`).join('');
    const small = [-64, -48, -32, -16, 0, 16, 32, 48, 64].map((x) => `<path d="M${x - 5} -34 v-6 a5 5 0 0 1 10 0 v6 Z" fill="#7c2d12" opacity=".75"/>`).join('');
    return { h: 66, w: 156, svg: `
      <path d="M-82 2 q20 -6 40 0 t40 0 t40 0 t40 0 V10 H-82 Z" fill="#38bdf8" opacity=".8"><animate attributeName="d" dur="3s" repeatCount="indefinite" values="M-82 2 q20 -6 40 0 t40 0 t40 0 t40 0 V10 H-82 Z;M-82 2 q20 6 40 0 t40 0 t40 0 t40 0 V10 H-82 Z;M-82 2 q20 -6 40 0 t40 0 t40 0 t40 0 V10 H-82 Z"/></path>
      <rect x="-78" y="-50" width="156" height="50" fill="#d6a76c" stroke="#92400e" stroke-width="2"/>
      ${arches}${small}
      <rect x="-82" y="-58" width="164" height="9" rx="2" fill="#b45309"/>
      <path d="M-74 -14 a14 14 0 0 1 28 0" fill="none" stroke="#fde047" stroke-width="2.5" stroke-dasharray="4 3"/>` };
  }
  function cube(x, y, s, tone) {
    const d = s * 0.45;
    const tones = [['#60a5fa', '#2563eb', '#1d4ed8'], ['#34d399', '#059669', '#047857'], ['#fbbf24', '#d97706', '#b45309']][tone % 3];
    return `<g transform="translate(${x} ${y})"><rect x="0" y="${-s}" width="${s}" height="${s}" fill="${tones[0]}" stroke="#1e293b" stroke-width="1"/>
      <path d="M0 ${-s} l${d} ${-d} h${s} l${-d} ${d} Z" fill="${tones[0]}" opacity=".7" stroke="#1e293b" stroke-width="1"/>
      <path d="M${s} 0 l${d} ${-d} v${-s} l${-d} ${d} Z" fill="${tones[1]}" stroke="#1e293b" stroke-width="1"/></g>`;
  }
  function bCubes() {
    let out = '';
    const s = 26;
    const rows = [3, 3, 2, 2, 1];
    rows.forEach((n, r) => { for (let c = 0; c < n; c++) out += cube(-48 + c * s + r * 4, -r * s, s, r + c); });
    return { h: 150, w: 120, svg: out };
  }
  function bPrism() {
    let wins = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) wins += win(-36 + c * 22, -132 + r * 21, 12, 13);
    return { h: 168, w: 110, svg: `
      <path d="M44 0 l22 -18 v-136 l-22 18 Z" fill="#475569"/>
      <path d="M-46 -136 l22 -18 h90 l-22 18 Z" fill="#94a3b8"/>
      <rect x="-46" y="-136" width="90" height="136" fill="#64748b" stroke="#1e293b" stroke-width="2"/>
      ${wins}
      <rect x="-10" y="-26" width="20" height="26" fill="#0f172a"/>
      <g class="cy-dim"><path d="M-46 10 H44" /><path d="M-56 0 V-136"/><text x="0" y="22" text-anchor="middle">طول</text><text x="-60" y="-66" text-anchor="middle" transform="rotate(-90 -60 -66)">ارتفاع</text></g>` };
  }
  function bLShape() {
    return { h: 160, w: 140, svg: `
      <path d="M-6 0 l20 -16 v-120 l-20 16 Z" fill="#7c3aed" opacity=".85"/>
      <path d="M-66 -120 l20 -16 h60 l-20 16 Z" fill="#c4b5fd"/>
      <rect x="-66" y="-120" width="60" height="120" fill="#8b5cf6" stroke="#3b0764" stroke-width="2"/>
      <path d="M64 0 l20 -16 v-56 l-20 16 Z" fill="#0f766e"/>
      <path d="M-6 -56 l20 -16 h70 l-20 16 Z" fill="#5eead4"/>
      <rect x="-6" y="-56" width="70" height="56" fill="#14b8a6" stroke="#134e4a" stroke-width="2"/>
      ${win(-54, -104, 12, 14)}${win(-32, -104, 12, 14)}${win(-54, -76, 12, 14)}${win(-32, -76, 12, 14)}${win(8, -40, 14, 14)}${win(36, -40, 14, 14)}
      <path d="M-6 6 V-142" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6 4"/>
      <text x="-6" y="-148" text-anchor="middle" class="cy-cut">✂</text>` };
  }
  function bTower() {
    return { h: 176, w: 110, svg: `
      <path d="M-34 0 L-24 -90 M34 0 L24 -90 M-30 -30 L28 -60 M30 -30 L-28 -60" stroke="#475569" stroke-width="5" stroke-linecap="round"/>
      <rect x="-46" y="-168" width="92" height="80" rx="20" fill="#e2e8f0" stroke="#334155" stroke-width="3"/>
      <g clip-path="url(#cyTank)"><rect class="cy-water" x="-50" y="-128" width="100" height="40" fill="#38bdf8">
        <animate attributeName="y" dur="4s" repeatCount="indefinite" values="-122;-140;-122"/></rect></g>
      <path d="M-46 -150 H46 M-46 -108 H46" stroke="#94a3b8" stroke-width="2"/>
      <text y="-122" text-anchor="middle" class="cy-tank-label">۱۰۰۰ لیتر</text>
      <path d="M0 -168 v-10" stroke="#334155" stroke-width="3"/><circle cy="-180" r="4" fill="#ef4444"/>` };
  }
  function bAquarium() {
    const fish = [[-14, -60, '#f97316', 7], [10, -100, '#facc15', 9], [-6, -150, '#ec4899', 6]].map(([x, y, c, d], i) => `<g transform="translate(${x} ${y})"><g>
      <path d="M-8 0 q8 -7 16 0 q-8 7 -16 0 Z M8 0 l6 -5 v10 Z" fill="${c}"/>
      <animateTransform attributeName="transform" type="translate" dur="${d}s" repeatCount="indefinite" values="-12 0;12 0;-12 0" begin="-${i}s"/></g></g>`).join('');
    const bubbles = [-20, 4, 22].map((x, i) => `<circle cx="${x}" cy="-10" r="2.5" fill="#e0f2fe" opacity=".9"><animate attributeName="cy" dur="${3 + i}s" repeatCount="indefinite" values="-10;-190"/><animate attributeName="opacity" dur="${3 + i}s" repeatCount="indefinite" values=".9;0"/></circle>`).join('');
    return { h: 216, w: 100, svg: `
      <rect x="-40" y="-196" width="80" height="196" rx="6" fill="#0ea5e9" opacity=".85" stroke="#075985" stroke-width="3"/>
      <rect x="-40" y="-196" width="80" height="196" rx="6" fill="url(#cyGlass)"/>
      <path d="M-40 -150 H40 M-40 -100 H40 M-40 -50 H40" stroke="#bae6fd" stroke-width="1.5" opacity=".7"/>
      ${fish}${bubbles}
      <path d="M-30 -196 L-20 -214 L-10 -202 L0 -220 L10 -202 L20 -214 L30 -196 Z" fill="#facc15" stroke="#a16207" stroke-width="2"/>
      <path d="M0 -220 V-250" stroke="#475569" stroke-width="2.5"/><path class="cy-flag" d="M0 -250 l26 7 l-26 7 Z" fill="#ef4444"/>` };
  }
  const BUILD = [bRhombus, bTrapezoid, bComposite, bWheel, bBridge, bCubes, bPrism, bLShape, bTower, bAquarium];

  /* ───────────── وضعیت ───────────── */
  function unit(i) {
    const st = ctx.stages[i];
    const solved = ctx.solved(i), total = st.tasks.length;
    return { idx: i, st, solved, total, stars: ctx.stars(i), seen: ctx.seen(i) || solved > 0, locked: ctx.locked(i), full: solved >= total };
  }
  function city() {
    const c = ctx.city || {};
    if (!Array.isArray(c.shown)) c.shown = [];
    return c;
  }
  function shownFrac(i) {
    const u = unit(i);
    const s = city().shown[i];
    const v = Number.isFinite(s) ? Math.min(s, u.solved) : u.solved;
    return v / u.total;
  }
  function nextIdx() { const n = ctx.stages.findIndex((s, i) => unit(i).solved < s.tasks.length); return n < 0 ? ctx.stages.length - 1 : n; }

  /* ───────────── رسم ───────────── */
  function scaffold(w, h, frac) {
    if (frac >= 1) return '';
    const top = -h, from = -h * frac;
    let out = `<g class="cy-scaffold">`;
    const xs = [-w / 2 - 4, 0, w / 2 + 4];
    xs.forEach((x) => { out += `<line x1="${x}" y1="${from + 2}" x2="${x}" y2="${top}"/>`; });
    for (let y = from; y > top; y -= 20) {
      out += `<line x1="${xs[0]}" y1="${y}" x2="${xs[2]}" y2="${y}"/>`;
      out += `<line class="cy-diag" x1="${xs[0]}" y1="${y}" x2="${xs[1]}" y2="${Math.max(top, y - 20)}"/>`;
    }
    return out + '</g>';
  }
  function lotSvg(i) {
    const p = POS[i], u = unit(i), b = BUILD[i]();
    const frac = shownFrac(i);
    const label = LOTS[i].name;
    const cls = ['cy-lot', u.locked ? 'is-locked' : '', u.full ? 'is-full' : '', i === nextIdx() && !u.full ? 'is-next' : ''].join(' ');
    const aria = `ایستگاه ${fa(i + 1)}: ${label} — ${u.locked ? 'قفل' : u.full ? 'ساخته شد' : fa(u.solved) + ' از ' + fa(u.total) + ' طبقه ساخته شده'}`;
    let body;
    if (u.locked) {
      body = `<g class="cy-bp cy-bp-faint">${b.svg}</g>
        <g class="cy-fence">${[-60, -30, 0, 30, 60].map((x) => `<rect x="${x - 3}" y="-34" width="6" height="34" rx="2"/>`).join('')}<rect x="-64" y="-28" width="128" height="6" rx="2"/><rect x="-64" y="-14" width="128" height="6" rx="2"/></g>
        <g transform="translate(0 -58)"><rect x="-16" y="-14" width="32" height="26" rx="6" class="cy-lockbox"/><path d="M-8 -14 v-6 a8 8 0 0 1 16 0 v6" fill="none" stroke="#475569" stroke-width="4"/></g>`;
    } else {
      body = `<g class="cy-bp">${b.svg}</g>
        <clipPath id="cyClip${i}"><rect class="cy-clip" x="-110" y="${(-b.h - 70) * frac}" width="220" height="${(b.h + 70) * frac + 30}"/></clipPath>
        <g class="cy-built" clip-path="url(#cyClip${i})">${b.svg}</g>
        <g class="cy-scaf-wrap">${scaffold(b.w * 0.9, b.h, frac)}</g>`;
    }
    const stars = u.full && u.stars ? `<text class="cy-stars" y="${-b.h - 16}" text-anchor="middle">${'★'.repeat(u.stars)}</text>` : '';
    return `<g class="${cls}" data-cy-lot="${i}" transform="translate(${p.x} ${p.y}) scale(${p.s})" role="button" tabindex="0" aria-label="${esc(aria)}">
      <rect class="cy-hit" x="-80" y="${-b.h - 30}" width="160" height="${b.h + 62}" rx="16"/>
      <rect class="hs-focus" x="-80" y="${-b.h - 30}" width="160" height="${b.h + 62}" rx="16"/>
      <path class="cy-plate ${u.locked ? 'is-dirt' : ''}" d="M-74 0 H74 L82 12 H-66 Z"/>
      <g class="cy-anim">${body}</g>
      ${stars}
      <g transform="translate(-62 6)"><circle r="12" class="cy-num"/><text y="4.5" text-anchor="middle" class="cy-num-t">${fa(i + 1)}</text></g>
      <g transform="translate(8 30)"><rect x="-${label.length * 4 + 12}" y="-11" width="${label.length * 8 + 24}" height="21" rx="10" class="cy-label"/><text y="4" text-anchor="middle" class="cy-label-t">${esc(label)}</text></g>
      ${!u.locked && !u.full && i === nextIdx() ? `<text class="cy-finger" y="${-b.h - 22}" text-anchor="middle">👇</text>` : ''}
    </g>`;
  }
  function craneSvg() {
    let truss = '';
    for (let x = 30; x < 980; x += 22) truss += `<path d="M${x} ${JIB_Y} L${x + 11} ${JIB_Y - 14} L${x + 22} ${JIB_Y}"/>`;
    let mast = '';
    for (let y = 520; y > JIB_Y; y -= 22) mast += `<path d="M${MAST_X - 9} ${y} L${MAST_X + 9} ${y - 22} M${MAST_X + 9} ${y} L${MAST_X - 9} ${y - 22}"/>`;
    return `<g class="cy-crane" aria-hidden="true">
      <g class="cy-truss"><rect x="${MAST_X - 9}" y="${JIB_Y}" width="18" height="${520 - JIB_Y}" class="cy-mast"/>${mast}</g>
      <rect x="10" y="${JIB_Y - 14}" width="975" height="14" class="cy-jib"/>
      <g class="cy-truss">${truss}</g>
      <rect x="0" y="${JIB_Y - 6}" width="40" height="26" rx="3" class="cy-weight"/>
      <path d="M${MAST_X} ${JIB_Y - 14} L${MAST_X} ${JIB_Y - 48} L300 ${JIB_Y - 14} M${MAST_X} ${JIB_Y - 48} L20 ${JIB_Y - 14}" class="cy-tie"/>
      <rect x="${MAST_X + 10}" y="${JIB_Y}" width="30" height="24" rx="4" class="cy-cab"/><rect x="${MAST_X + 15}" y="${JIB_Y + 4}" width="20" height="10" rx="2" class="cy-win"/>
      <g id="cyTrolley" transform="translate(${trolleyX} 0)">
        <rect x="-14" y="${JIB_Y}" width="28" height="9" rx="2" class="cy-trolley"/>
        <line id="cyCable" x1="0" y1="${JIB_Y + 9}" x2="0" y2="${hookY}" class="cy-cable"/>
        <g id="cyHook" transform="translate(0 ${hookY})">
          <rect x="-9" y="0" width="18" height="10" rx="3" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
          <path d="M0 10 v8 a6 6 0 1 1 -6 6" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
          <g id="cyLoad" opacity="0"><rect x="-16" y="28" width="32" height="20" rx="2" fill="#f97316" stroke="#7c2d12" stroke-width="1.5"/><path d="M-16 38 H16 M0 28 V48" stroke="#7c2d12" stroke-width="1.2"/></g>
        </g>
      </g>
    </g>`;
  }
  function sceneSvg() {
    const stars = Array.from({ length: 34 }, (_, k) => `<circle cx="${(k * 137) % 1000}" cy="${12 + ((k * 53) % 200)}" r="${k % 3 ? 1.2 : 2}"/>`).join('');
    return `<svg class="cy-svg" viewBox="0 0 1000 560" role="group" aria-label="شهرک معمارها: ده زمین ساختمانی؛ با لمس هر زمین جرثقیل به آنجا می‌رود" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cy-sky1"/><stop offset=".7" class="cy-sky2"/><stop offset="1" class="cy-sky3"/></linearGradient>
        <linearGradient id="cyGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cy-g1"/><stop offset="1" class="cy-g2"/></linearGradient>
        <linearGradient id="cyGlass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#fff" stop-opacity=".12"/></linearGradient>
        <pattern id="cyRhomb" width="18" height="24" patternUnits="userSpaceOnUse"><rect width="18" height="24" fill="#f5e6c8"/><path d="M9 1 L17 12 L9 23 L1 12 Z" fill="#0891b2" stroke="#155e75" stroke-width="1"/><path d="M9 6 L13 12 L9 18 L5 12 Z" fill="#fef3c7"/></pattern>
        <clipPath id="cyTank"><rect x="-44" y="-166" width="88" height="76" rx="18"/></clipPath>
        <pattern id="cyBrick" width="20" height="12" patternUnits="userSpaceOnUse"><rect width="20" height="12" fill="#c2410c"/><path d="M0 6 H20 M10 0 V6 M0 6 V12 M20 6 V12" stroke="#7c2d12" stroke-width="1"/></pattern>
      </defs>
      <rect width="1000" height="560" fill="url(#cySky)"/>
      <g class="cy-stars-bg">${stars}</g>
      <g class="cy-sun" transform="translate(905 150)"><g class="cy-rays">${Array.from({ length: 12 }, (_, k) => `<rect x="-2" y="-46" width="4" height="12" rx="2" transform="rotate(${k * 30})"/>`).join('')}</g><circle r="26"/></g>
      <g class="cy-moon" transform="translate(905 150)"><circle r="24"/><circle cx="10" cy="-6" r="20" class="cy-moon-cut"/></g>
      <g class="cy-cloud cy-cloud-a"><ellipse cx="200" cy="140" rx="46" ry="16"/><ellipse cx="226" cy="128" rx="30" ry="18"/><ellipse cx="176" cy="132" rx="22" ry="14"/></g>
      <g class="cy-cloud cy-cloud-b"><ellipse cx="640" cy="118" rx="40" ry="13"/><ellipse cx="662" cy="108" rx="24" ry="14"/></g>
      <path class="cy-hill1" d="M0 262 C120 200 220 236 320 214 C430 190 520 240 640 210 C760 182 860 226 1000 196 V560 H0 Z"/>
      <path class="cy-hill2" d="M0 292 C160 262 300 290 460 270 C620 250 760 286 1000 260 V560 H0 Z"/>
      <rect y="300" width="1000" height="260" fill="url(#cyGrass)"/>
      <path class="cy-road" d="M1010 352 H190 C96 352 96 500 190 500 H1010"/>
      <path class="cy-road-line" d="M1010 352 H190 C96 352 96 500 190 500 H1010"/>
      ${craneSvg()}
      <g class="cy-lots-back">${[0, 1, 2, 3, 4].map(lotSvg).join('')}</g>
      <g class="cy-vehicles" aria-hidden="true">
        <g class="cy-truck"><g transform="translate(0 -14)"><rect x="-22" y="-10" width="30" height="16" rx="3" fill="#f59e0b"/><rect x="8" y="-8" width="14" height="14" rx="2" fill="#0ea5e9"/><ellipse cx="-8" cy="-14" rx="14" ry="9" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/><circle cx="-14" cy="8" r="5" fill="#1e293b"/><circle cx="14" cy="8" r="5" fill="#1e293b"/></g>
          <animateMotion dur="26s" repeatCount="indefinite" rotate="auto-reverse" path="M1010 352 H190 C96 352 96 500 190 500 H1010"/></g>
        <g class="cy-truck"><g transform="translate(0 -12)"><rect x="-16" y="-8" width="32" height="13" rx="5" fill="#dc2626"/><rect x="-8" y="-15" width="16" height="8" rx="3" fill="#bae6fd"/><circle cx="-9" cy="6" r="4" fill="#1e293b"/><circle cx="9" cy="6" r="4" fill="#1e293b"/></g>
          <animateMotion dur="26s" begin="-13s" repeatCount="indefinite" rotate="auto-reverse" path="M1010 352 H190 C96 352 96 500 190 500 H1010"/></g>
      </g>
      <g class="cy-lots-front">${[5, 6, 7, 8, 9].map(lotSvg).join('')}</g>
      <g id="cyFx"></g>
    </svg>`;
  }

  function render(c) {
    ctx = c;
    sfx = K.sfx(ctx.sound);
    const units = ctx.stages.map((s, i) => unit(i));
    const built = units.filter((u) => u.full).length;
    const floors = units.reduce((n, u) => n + u.solved, 0);
    const total = units.reduce((n, u) => n + u.total, 0);
    trolleyX = POS[Math.min(nextIdx(), POS.length - 1)].x;
    hookY = 150;
    return K.shell({
      id: 'cyWrap', cls: 'cy-wrap', eyebrow: '🏗️ شهرک معمارهای پیمانه‌ستان',
      title: 'هر تمرین درست، یک طبقهٔ تازه!',
      sub: 'روی یک زمین بزن تا جرثقیل به آنجا برود. با حل تمرین‌های هر ایستگاه، ساختمانِ مخصوص همان درس طبقه‌به‌طبقه بالا می‌رود: چرخ‌وفلک عدد پی، پل طاق‌دار، برج آب و …',
      gauges: [
        { icon: '🏢', val: `${fa(built)} / ${fa(units.length)}`, label: 'ساختمان کامل' },
        { icon: '🧱', val: `${fa(floors)} / ${fa(total)}`, label: 'طبقهٔ ساخته‌شده' }
      ],
      stage: `<div class="cy-scroll">${sceneSvg()}</div><span class="cy-swipe" aria-hidden="true">👈 برای دیدن همهٔ شهرک، صحنه را بکش 👉</span>`
    });
  }

  /* ───────────── کارت ───────────── */
  function showCard(i) {
    const card = root.querySelector('[data-hs-card]');
    if (!card) return;
    const u = unit(i);
    card.innerHTML = K.card({
      stamp: u.full ? 'ساخته شد ✓' : u.locked ? 'زمین بسته' : u.solved ? 'در حال ساخت' : 'نقشه آماده',
      icon: LOTS[i].icon, kicker: `ایستگاه ${fa(i + 1)} از ${fa(ctx.stages.length)} · ${LOTS[i].name}`,
      title: K.shortTitle(u.st.title), sub: u.st.topic, why: LOTS[i].fact,
      solved: u.solved, total: u.total, stars: u.stars, unitWord: 'طبقه', locked: u.locked, full: u.full,
      actions: K.unitActions(u, { lockedMsg: `این زمین هنوز حصارکشی است؛ اول ساختمان ایستگاه ${fa(i)} را کامل کن.` })
    });
    root.querySelectorAll('.cy-lot').forEach((g) => g.classList.toggle('is-selected', Number(g.dataset.cyLot) === i));
    K.bindCard(card, ctx);
  }

  /* ───────────── جرثقیل ───────────── */
  function setCrane(x, y) {
    trolleyX = x; hookY = y;
    const t = root.querySelector('#cyTrolley'), c = root.querySelector('#cyCable'), h = root.querySelector('#cyHook');
    if (t) t.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
    if (c) c.setAttribute('y2', y.toFixed(1));
    if (h) h.setAttribute('transform', `translate(0 ${y.toFixed(1)})`);
  }
  function topOf(i) { const b = BUILD[i](); return POS[i].y - (b.h * shownFrac(i) + 10) * POS[i].s - 60; }
  async function craneTo(i, withLoad) {
    const tx = POS[i].x, x0 = trolleyX, y0 = hookY;
    const load = root.querySelector('#cyLoad');
    if (load) load.setAttribute('opacity', withLoad ? '1' : '0');
    sfx.motorStart(60);
    await K.tween(Math.min(1500, 450 + Math.abs(tx - x0) * 1.3), (e) => { setCrane(x0 + (tx - x0) * e, y0 + (130 - y0) * Math.min(1, e * 2)); sfx.motorPitch(Math.sin(e * Math.PI) * 0.6); });
    const yT = Math.max(130, topOf(i));
    await K.tween(520, (e) => setCrane(tx, 130 + (yT - 130) * e), K.ease.out);
    sfx.motorStop();
  }
  async function craneUp() { const y0 = hookY; await K.tween(420, (e) => setCrane(trolleyX, y0 + (150 - y0) * e)); }
  function dust(i) {
    const fx = root.querySelector('#cyFx'); if (!fx || K.reduced()) return;
    const p = POS[i];
    for (let k = 0; k < 6; k++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x + (k - 2.5) * 22 * p.s); c.setAttribute('cy', p.y + 2); c.setAttribute('r', 8 * p.s);
      c.setAttribute('class', 'cy-dust'); c.style.animationDelay = k * 0.04 + 's';
      fx.appendChild(c); setTimeout(() => c.remove(), 1100);
    }
  }
  function pctPos(i) { const p = POS[i]; return [p.x / 10, ((p.y - BUILD[i]().h * p.s * 0.7) / 560) * 100]; }

  // در موبایل صحنه پهن‌تر از صفحه است و با کشیدن انگشت جابه‌جا می‌شود
  function scrollToLot(i, smooth) {
    const sc = root && root.querySelector('.cy-scroll');
    if (!sc || sc.scrollWidth <= sc.clientWidth + 4) return;
    const svg = sc.querySelector('svg');
    const k = svg.clientWidth / 1000;
    const left = POS[i].x * k - sc.clientWidth / 2;
    // در صفحه‌های راست‌به‌چپ مقدار scrollLeft منفی است
    const rtl = getComputedStyle(sc).direction === 'rtl';
    const max = sc.scrollWidth - sc.clientWidth;
    const target = Math.max(0, Math.min(max, left));
    sc.scrollTo({ left: rtl ? target - max : target, behavior: smooth && !K.reduced() ? 'smooth' : 'auto' });
  }
  async function select(i) {
    if (busy) return;
    scrollToLot(i, true);
    const u = unit(i);
    if (u.locked) {
      sfx.lock();
      const g = root.querySelector(`[data-cy-lot="${i}"]`);
      if (g) { g.classList.remove('is-shake'); void g.getBBox(); g.classList.add('is-shake'); }
      showCard(i);
      ctx.lockedNotice(i);
      return;
    }
    busy = true;
    root.classList.add('is-busy');
    showCard(i);
    K.live(root, `جرثقیل به سوی ${LOTS[i].name} می‌رود`);
    await craneTo(i, false);
    sfx.clank();
    busy = false;
    root.classList.remove('is-busy');
    if (!u.seen) {
      K.banner(root, `📐 نقشهٔ «${esc(LOTS[i].name)}» آماده است؛ درسنامه باز می‌شود…`, 1300);
      setTimeout(() => { if (root && root.isConnected) ctx.openLesson(i); }, K.reduced() ? 300 : 1300);
    } else {
      K.banner(root, u.full ? `🏆 «${esc(LOTS[i].name)}» کامل ساخته شده! برای مرور آماده‌ای؟` : `🧱 ${fa(u.total - u.solved)} طبقهٔ دیگر تا تکمیل «${esc(LOTS[i].name)}»`, 1800);
      craneUp();
    }
  }

  // ساختِ طبقه‌های تازه (پس از برگشت از تمرین‌ها)
  async function buildPending() {
    const c = city();
    const queue = ctx.stages.map((s, i) => i).filter((i) => !unit(i).locked && unit(i).solved > (Number.isFinite(c.shown[i]) ? c.shown[i] : unit(i).solved));
    const first = c.shown.length === 0;
    if (first) { c.shown = ctx.stages.map((s, i) => unit(i).solved); ctx.save(); return; }
    for (const i of queue.slice(0, 2)) {
      if (!root || !root.isConnected) return;
      busy = true; root.classList.add('is-busy');
      const u = unit(i), b = BUILD[i]();
      const from = Math.min(c.shown[i], u.solved) / u.total, to = u.solved / u.total;
      showCard(i);
      scrollToLot(i, true);
      await craneTo(i, true);
      const clip = root.querySelector(`#cyClip${i} .cy-clip`);
      const scafWrap = root.querySelector(`[data-cy-lot="${i}"] .cy-scaf-wrap`);
      sfx.hammer(4);
      dust(i);
      const load = root.querySelector('#cyLoad'); if (load) load.setAttribute('opacity', '0');
      await K.tween(1300, (e) => {
        const f = from + (to - from) * e;
        if (clip) { clip.setAttribute('y', ((-b.h - 70) * f).toFixed(1)); clip.setAttribute('height', ((b.h + 70) * f + 30).toFixed(1)); }
        if (scafWrap) scafWrap.innerHTML = scaffold(b.w * 0.9, b.h, f);
      }, K.ease.out);
      c.shown[i] = u.solved; ctx.save();
      const [px, py] = pctPos(i);
      if (u.full) {
        sfx.fanfare();
        K.confetti(root.querySelector('.hs-stage'), px, py, { count: 34 });
        K.banner(root, `🏆 «${esc(LOTS[i].name)}» کامل ساخته شد! نشان «${esc(u.st.badge || '')}» مال توست.`, 2600);
        ctx.say?.(`آفرین معمار! ${LOTS[i].name} کامل شد.`);
        const g = root.querySelector(`[data-cy-lot="${i}"]`); if (g) g.classList.add('is-full', 'is-celebrate');
      } else {
        sfx.pop();
        K.banner(root, `🧱 ${fa(u.solved - Math.round(from * u.total))} طبقهٔ تازه روی «${esc(LOTS[i].name)}» ساخته شد!`, 1800);
      }
      await craneUp();
      busy = false; root.classList.remove('is-busy');
      await K.wait(400);
    }
    for (const i of queue.slice(2)) c.shown[i] = unit(i).solved;
    if (queue.length > 2) { ctx.save(); }
  }

  function mount(el, c) {
    ctx = c;
    sfx = K.sfx(ctx.sound);
    root = (el || document).querySelector('#cyWrap');
    if (!root) return;
    busy = false;
    const svg = root.querySelector('svg');
    if (K.reduced() && svg && svg.pauseAnimations) svg.pauseAnimations();
    K.bindKeys(root, '[data-cy-lot]', (g) => select(Number(g.dataset.cyLot)));
    showCard(nextIdx());
    scrollToLot(nextIdx(), false);
    setTimeout(() => buildPending(), 500);
  }
  function goNext() {
    const i = nextIdx();
    if (root && root.isConnected) { root.scrollIntoView({ behavior: K.reduced() ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => select(i), K.reduced() ? 0 : 450); }
    else ctx.openLesson(i);
  }

  global.PeymanCity = { render, mount, goNext, LOTS, POS };
})(window);
