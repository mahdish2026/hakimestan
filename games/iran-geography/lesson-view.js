/* ایران‌گرد کوچک — نقشه‌های موضوعی و نمودارهای درسنامه (بدون وابستگی؛ SVG درون‌خطی) */
(function () {
  'use strict';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = (v) => String(v ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" font-size="${o.fs || 11}" font-weight="${o.fw || 800}" fill="${o.c || '#132826'}"${o.halo === false ? '' : ' paint-order="stroke" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"'}>${esc(s)}</text>`;

  /* ───────────── نقشهٔ موضوعی هر مأموریت ───────────── */
  const OVERLAYS = {
    population(G) {
      return `
        <circle cx="247" cy="150" r="30" fill="#dc2626" opacity=".28"/><circle cx="247" cy="150" r="16" fill="#dc2626" opacity=".35"/>
        <polyline points="192,92 212,112 244,124 280,128 314,122 336,112" fill="none" stroke="#16a34a" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".38"/>
        <ellipse cx="${G.kavir[0]}" cy="${G.kavir[1]}" rx="46" ry="24" fill="#d97706" opacity=".28"/>
        <ellipse cx="${G.lut[0]}" cy="${G.lut[1]}" rx="30" ry="40" fill="#d97706" opacity=".28"/>
        <polyline points="${G.alborz}" fill="none" stroke="#7c3aed" stroke-width="12" stroke-linecap="round" opacity=".22"/>
        <polyline points="${G.zagros}" fill="none" stroke="#7c3aed" stroke-width="14" stroke-linecap="round" opacity=".22"/>
        <circle cx="158" cy="99" r="16" fill="#7c3aed" opacity=".25"/><circle cx="389" cy="137" r="16" fill="#7c3aed" opacity=".25"/>
        ${T(247, 186, '۱ تهران', { c: '#b91c1c' })}${T(300, 107, '۲ کرانهٔ خزر', { c: '#15803d' })}
        ${T(G.kavir[0], G.kavir[1] + 34, '۳ کویر', { c: '#b45309' })}${T(G.lut[0] + 34, G.lut[1] + 6, '۳ لوت', { c: '#b45309' })}
        ${T(190, 222, '۴ زاگرس', { c: '#6d28d9' })}${T(158, 127, '۴', { c: '#6d28d9' })}${T(389, 165, '۴', { c: '#6d28d9' })}`;
    },
    water(G) {
      const river = (pts, name, x, y) => `<polyline points="${pts}" fill="none" stroke="#0369a1" stroke-width="6" stroke-linecap="round" opacity=".28"/><polyline class="ig-flow" points="${pts}" fill="none" stroke="#0284c7" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="6 5"/>${T(x, y, name, { c: '#0369a1', fs: 11 })}`;
      return `
        <polyline points="${G.alborz}" fill="none" stroke="#92400e" stroke-width="9" stroke-linecap="round" opacity=".35"/>
        <polyline points="${G.zagros}" fill="none" stroke="#92400e" stroke-width="9" stroke-linecap="round" opacity=".35"/>
        ${river(G.karun, 'کارون', 178, 222)}${river(G.zayandeh, 'زاینده‌رود', 262, 236)}${river(G.sefidrud, 'سفیدرود', 196, 140)}${river(G.aras, 'ارس', 150, 66)}
        ${T(330, 120, 'البرز ⛰', { c: '#78350f' })}${T(150, 175, 'زاگرس ⛰', { c: '#78350f' })}`;
    },
    industry() {
      const ic = (x, y, e, label, c) => `<circle cx="${x}" cy="${y}" r="14" fill="#ffffff" stroke="${c}" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14">${e}</text>${T(x, y + 28, label, { c, fs: 10 })}`;
      return `
        <path d="M316 236 C 296 228, 272 222, 256 216" fill="none" stroke="#b45309" stroke-width="2.5" stroke-dasharray="5 4"/>
        ${ic(252, 214, '🔥', 'ذوب‌آهن اصفهان', '#dc2626')}${ic(316, 236, '⛏️', 'سنگ آهن بافق یزد', '#b45309')}
        ${ic(325, 272, '⛏️', 'مس سرچشمه', '#b45309')}${ic(218, 184, '🧪', 'پتروشیمی شازند', '#7c3aed')}
        ${ic(209, 262, '🧪', 'پتروشیمی ماهشهر', '#7c3aed')}${ic(270, 322, '🧪', 'عسلویه', '#7c3aed')}
        ${ic(158, 99, '⚙️', 'ماشین‌سازی تبریز', '#0f766e')}${ic(247, 150, '🏭', 'صنایع مصرفی تهران', '#334155')}`;
    },
    transport() {
      const rail = (pts) => `<polyline points="${pts}" fill="none" stroke="#1e293b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 5" stroke-linejoin="round"/>`;
      const port = (x, y, label, dy = 0) => `<g><circle cx="${x}" cy="${y}" r="7" fill="#0d9488" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8" fill="#fff">⚓</text>${T(x, y - 10 + dy, label, { c: '#0f766e', fs: 9.5 })}</g>`;
      return `
        ${rail('278,126 247,150 238,173 218,184 200,241 209,258')}${rail('247,150 300,140 389,137')}${rail('247,150 200,120 158,99 140,78')}
        ${rail('238,173 262,200 299,230 316,236 331,324')}${rail('316,236 330,262 362,300')}
        ${port(203, 92, 'آستارا', -2)}${port(214, 113, 'انزلی', 26)}${port(249, 130, 'نوشهر', 26)}${port(278, 126, 'امیرآباد')}
        ${port(209, 258, 'امام خمینی', 26)}${port(237, 291, 'بوشهر')}${port(331, 324, 'شهید رجایی', 26)}${port(407, 360, 'چابهار')}
        <text x="252" y="146" text-anchor="middle" font-size="16">✈️</text>
        ${T(130, 388, '━ راه‌آهن   |   ⚓ بندر   |   ✈️ فرودگاه بین‌المللی', { fs: 10, c: '#1e293b' })}`;
    },
    neighbors(G) {
      const n = (x, y, label) => T(x, y, label, { c: '#6d28d9', fs: 11.5, fw: 900 });
      return `
        <path d="${G.iran}" fill="#fde68a" opacity=".35"/>
        ${n(78, 60, 'ترکیه')}${n(108, 222, 'عراق')}${n(170, 46, 'آذربایجان')}${n(116, 66, 'ارمنستان')}${n(150, 86, 'نخجوان')}${T(240, 70, 'دریای خزر', { c: '#075985', fs: 10 })}${T(360, 392, 'دریای عمان', { c: '#075985', fs: 10 })}${T(240, 330, 'خلیج فارس', { c: '#075985', fs: 10 })}
        ${n(380, 54, 'ترکمنستان')}${n(462, 214, 'افغانستان')}${n(474, 300, 'پاکستان')}
        ${T(252, 210, 'ایران', { c: '#0d6859', fs: 22, fw: 900 })}
        <g transform="translate(470,48)"><circle r="22" fill="#ffffff" stroke="#0d6859" stroke-width="2"/><path d="M0 -18 L5 0 L0 18 L-5 0Z" fill="#dc2626"/><path d="M0 -18 L5 0 L-5 0Z" fill="#0d6859"/>${T(0, -26, 'شمال', { fs: 9, c: '#0d6859' })}</g>`;
    }
  };

  function lessonMap(spec, pins) {
    const G = window.IranGeoMap;
    if (!G) return '';
    const show = new Set(spec.pins || []);
    const pinHtml = (pins || []).filter((p) => show.has(p.id)).map((p) =>
      `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#0f172a" stroke="#fff" stroke-width="1.6"/>${spec.overlay === 'neighbors' || spec.overlay === 'transport' && p.kind === 'port' ? '' : T(p.x, p.y - 8, p.label || p.name, { fs: 9.5, c: '#0f172a' })}`).join('');
    const ov = OVERLAYS[spec.overlay] ? OVERLAYS[spec.overlay](G) : '';
    return `<svg viewBox="0 0 ${G.W} ${G.H}" role="img" aria-label="نقشهٔ موضوعی درسنامه">
      <defs><linearGradient id="lmSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7f1fd"/><stop offset="1" stop-color="#b0e0f6"/></linearGradient>
      <pattern id="lmSand" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fde68a"/><circle cx="2" cy="2" r=".9" fill="#d97706" opacity=".45"/></pattern></defs>
      <rect width="${G.W}" height="${G.H}" fill="url(#lmSea)"/>
      <path d="${G.neighbors}" fill="${spec.overlay === 'neighbors' ? '#ede9fe' : '#f5eedd'}" stroke="${spec.overlay === 'neighbors' ? '#7c3aed' : '#c4b393'}" stroke-width="${spec.overlay === 'neighbors' ? 1.4 : 0.8}" stroke-linejoin="round"/>
      <path d="${G.iran}" fill="#e7f8ec" stroke="#0d6859" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="${G.kavir[0]}" cy="${G.kavir[1]}" rx="40" ry="19" fill="url(#lmSand)" opacity=".7"/>
      <ellipse cx="${G.lut[0]}" cy="${G.lut[1]}" rx="24" ry="34" fill="url(#lmSand)" opacity=".7"/>
      ${ov}${pinHtml}
    </svg>`;
  }

  /* ───────────── نمودارها و تصویرسازی‌ها ───────────── */
  const VISUALS = {
    popChart() {
      const data = [[1335, 19], [1345, 25.5], [1355, 32.5], [1365, 49.5], [1375, 60], [1385, 70], [1390, 75], [1395, 80], [1400, 85]];
      const bw = 40, gap = 12, x0 = 44, base = 210, k = 2.1;
      const bars = data.map(([y, v], i) => {
        const x = x0 + i * (bw + gap), h = v * k;
        let people = '';
        for (let r = 0; r < Math.floor(h / 22); r++) people += `<text x="${x + bw / 2}" y="${base - 6 - r * 22}" text-anchor="middle" font-size="12" opacity=".75">🧍</text>`;
        return `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="8" fill="#f6b21a"/>${people}
          ${T(x + bw / 2, base - h - 6, fa(String(v).replace('.', '/')), { fs: 11, c: '#7c4a03' })}${T(x + bw / 2, base + 16, fa(y), { fs: 10.5, c: '#334155' })}`;
      }).join('');
      return `<figure class="hw-figure"><svg viewBox="0 0 520 240" role="img" aria-label="نمودار جمعیت ایران از ۱۳۳۵ تا ۱۴۰۰ (میلیون نفر)">
        <line x1="36" y1="${base}" x2="510" y2="${base}" stroke="#94a3b8" stroke-width="1.5"/>${bars}
        ${T(480, 18, 'میلیون نفر', { fs: 10, c: '#475569' })}</svg>
        <figcaption>نمودار جمعیت ایران (کتاب، صفحهٔ ۲۶): از ۱۹ میلیون در ۱۳۳۵ به ۸۵ میلیون در ۱۴۰۰</figcaption></figure>`;
    },
    riverQanat() {
      return `<div class="hw-split">
        <figure class="hw-figure"><svg viewBox="0 0 320 210" role="img" aria-label="مراحل تشکیل رود از سرچشمه تا دهانه">
          <rect width="320" height="210" fill="#eff9ff"/>
          <path d="M0 120 L50 40 L80 70 L110 30 L160 110 L160 210 L0 210Z" fill="#a8a29e"/><path d="M42 54 L50 40 L58 52Z M102 42 L110 30 L118 44Z" fill="#fff"/>
          <path d="M160 110 C 200 140, 240 150, 320 150 L320 210 L160 210Z" fill="#bbf7d0"/>
          <rect x="262" y="150" width="58" height="60" fill="#38bdf8"/>
          <path d="M108 40 C 112 70, 96 84, 120 104 S 170 130, 200 150 S 250 160, 268 170" fill="none" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
          <path d="M60 60 C 70 80, 90 92, 120 104" fill="none" stroke="#38bdf8" stroke-width="3"/>
          <path d="M150 70 C 140 90, 130 96, 122 104" fill="none" stroke="#38bdf8" stroke-width="3"/>
          <text x="96" y="20" font-size="16">🌨️</text><text x="140" y="24" font-size="16">🌧️</text>
          ${['۱', '۲', '۳', '۴'].map((n, i) => { const p = [[110, 44], [70, 76], [176, 140], [270, 166]][i]; return `<circle cx="${p[0]}" cy="${p[1]}" r="10" fill="#0f172a"/><text x="${p[0]}" y="${p[1] + 4}" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">${n}</text>`; }).join('')}
          <rect x="20" y="184" width="280" height="22" rx="11" fill="#ffffff" opacity=".92"/>${T(160, 199, '۱ سرچشمه ← ۲ جویبار ← ۳ رود ← ۴ دهانه', { fs: 10.5, halo: false })}
        </svg><figcaption>مراحل تشکیل رود (کتاب، صفحهٔ ۳۰)</figcaption></figure>
        <figure class="hw-figure"><svg viewBox="0 0 320 210" role="img" aria-label="برش قنات: مادرچاه، میله‌چاه‌ها، کوره و مظهر قنات">
          <rect width="320" height="210" fill="#fffbeb"/>
          <path d="M0 40 L60 30 L140 60 L320 90 L320 210 L0 210Z" fill="#e7c9a0"/>
          <path d="M0 120 L320 150 L320 175 L0 145Z" fill="#7dd3fc" opacity=".7"/>
          <path d="M0 145 L320 175 L320 210 L0 210Z" fill="#a16207" opacity=".55"/>
          <path d="M40 128 L290 92" stroke="#0369a1" stroke-width="5" stroke-linecap="round"/>
          ${[40, 95, 150, 205, 255].map((x, i) => { const top = x < 60 ? 32 : x < 140 ? 30 + (x - 60) * 0.375 : 60 + (x - 140) * 0.167; const bot = 128 - (x - 40) * 0.144; return `<rect x="${x - 3}" y="${top}" width="6" height="${bot - top}" fill="#57534e"/>${i === 0 ? '' : `<ellipse cx="${x}" cy="${top}" rx="9" ry="3" fill="#78716c"/>`}`; }).join('')}
          <text x="298" y="88" font-size="16">🌾</text>
          ${T(42, 22, 'مادرچاه', { fs: 10 })}${T(150, 50, 'میله‌چاه‌ها', { fs: 10 })}${T(170, 122, 'کوره (تونل)', { fs: 10, c: '#075985' })}${T(282, 74, 'مظهر قنات', { fs: 10, c: '#166534' })}
          ${T(90, 152, 'آب زیرزمینی', { fs: 9.5, c: '#075985' })}${T(110, 190, 'لایهٔ نفوذناپذیر', { fs: 9.5, c: '#fff', halo: false })}
        </svg><figcaption>قنات: ابتکار ایرانیان · تبخیر و آلودگی کم</figcaption></figure></div>`;
    },
    factory() {
      const inputs = [['🌿', 'موادّ اوّلیه'], ['💰', 'سرمایه'], ['👷', 'نیروی کار'], ['🛠️', 'ماشین‌آلات و ابزار'], ['💡', 'دانش و فناوری']];
      return `<figure class="hw-figure"><svg viewBox="0 0 520 220" role="img" aria-label="پنج نیاز کارخانه و تبدیل پنبه به پارچه">
        <rect width="520" height="220" rx="16" fill="#f8fafc"/>
        ${inputs.map(([e, l], i) => { const y = 24 + i * 38; return `<rect x="350" y="${y}" width="150" height="30" rx="15" fill="#ffffff" stroke="#cbd5e1"/><text x="485" y="${y + 21}" text-anchor="middle" font-size="15">${e}</text>${T(420, y + 20, l, { fs: 11 })}<path d="M348 ${y + 15} C 320 ${y + 15}, 300 110, 268 110" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#fArr)"/>`; }).join('')}
        <defs><marker id="fArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#64748b"/></marker></defs>
        <path d="M150 150 L150 90 L180 70 L180 90 L210 70 L210 90 L240 70 L240 90 L268 90 L268 150Z" fill="#0f766e"/><rect x="158" y="40" width="14" height="40" fill="#334155"/><text x="165" y="34" text-anchor="middle" font-size="14">💨</text>
        <rect x="190" y="112" width="18" height="16" fill="#fde68a"/><rect x="222" y="112" width="18" height="16" fill="#fde68a"/>
        ${T(209, 170, 'کارخانه', { fs: 13, fw: 900, c: '#0f766e' })}
        <path d="M148 120 L96 120" stroke="#0f766e" stroke-width="4" marker-end="url(#fArr)"/>
        <text x="62" y="112" text-anchor="middle" font-size="30">👕</text>${T(62, 146, 'کالا', { fs: 12, fw: 900 })}
        ${T(260, 206, 'مثال کتاب: پنبه ← نخ ← پارچه ← لباس', { fs: 11, c: '#334155' })}
      </svg><figcaption>هر کارخانه برای تولید کالا به این پنج چیز نیاز دارد</figcaption></figure>`;
    },
    transport() {
      const modes = [['🚚', 'کامیون (جاده)', 3, 2, 2], ['🚆', 'قطار (راه‌آهن)', 3, 1, 4], ['🚢', 'کشتی (دریا)', 1, 1, 5], ['✈️', 'هواپیما', 5, 5, 1]];
      const bar = (x, y, n, c) => Array.from({ length: 5 }, (_, i) => `<rect x="${x + i * 14}" y="${y}" width="11" height="11" rx="3" fill="${i < n ? c : '#e2e8f0'}"/>`).join('');
      return `<figure class="hw-figure"><svg viewBox="0 0 520 210" role="img" aria-label="مقایسهٔ سرعت، هزینه و مقدار بار در چهار وسیلهٔ حمل‌ونقل">
        <rect width="520" height="210" rx="16" fill="#f8fafc"/>
        ${T(290, 26, 'سرعت', { fs: 11.5, fw: 900, c: '#0369a1' })}${T(180, 26, 'هزینه', { fs: 11.5, fw: 900, c: '#b91c1c' })}${T(70, 26, 'مقدار بار سنگین', { fs: 11.5, fw: 900, c: '#15803d' })}
        ${modes.map(([e, l, sp, co, ld], i) => { const y = 44 + i * 40; return `<rect x="10" y="${y - 6}" width="500" height="34" rx="12" fill="${i % 2 ? '#ffffff' : '#f1f5f9'}"/><text x="490" y="${y + 17}" text-anchor="middle" font-size="18">${e}</text>${T(415, y + 16, l, { fs: 11.5 })}${bar(256, y + 5, sp, '#0ea5e9')}${bar(146, y + 5, co, '#ef4444')}${bar(36, y + 5, ld, '#22c55e')}`; }).join('')}
      </svg><figcaption>کشتی: ارزان و پربار امّا آهسته · هواپیما: سریع امّا گران · قطار: بار سنگین ارزان‌تر از کامیون</figcaption></figure>`;
    },
    camp() {
      const box = (x, c, e, t1, t2) => `<rect x="${x}" y="40" width="150" height="86" rx="16" fill="#ffffff" stroke="${c}" stroke-width="3"/><text x="${x + 75}" y="70" text-anchor="middle" font-size="22">${e}</text>${T(x + 75, 96, t1, { fs: 11, c })}${T(x + 75, 114, t2, { fs: 10, c: '#475569' })}
        <path d="M${x + 75} 128 L${x + 75} 150" stroke="${c}" stroke-width="3" marker-end="url(#cArr)"/>`;
      return `<figure class="hw-figure"><svg viewBox="0 0 520 220" role="img" aria-label="نقش‌های اردوی مدرسه و سه قوهٔ کشور">
        <defs><marker id="cArr" viewBox="0 0 10 10" refX="5" refY="8" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 0 L5 10z" fill="#475569"/></marker></defs>
        <rect width="520" height="220" rx="16" fill="#f0fdf4"/>${T(260, 24, '🏕️ اردوی مدرسه', { fs: 13, fw: 900, c: '#166534' })}
        ${box(350, '#2563eb', '✍️', 'نوشتن قوانین', 'مدیر و نمایندگان')}${box(185, '#16a34a', '🛠️', 'کارهای اجرایی', 'غذا، زباله، حضور')}${box(20, '#b45309', '⚖️', 'حل اختلاف', 'آقای علوی')}
        <rect x="350" y="160" width="150" height="40" rx="12" fill="#2563eb"/>${T(425, 185, 'قوهٔ مقننه', { fs: 12.5, c: '#fff', halo: false })}
        <rect x="185" y="160" width="150" height="40" rx="12" fill="#16a34a"/>${T(260, 185, 'قوهٔ مجریه', { fs: 12.5, c: '#fff', halo: false })}
        <rect x="20" y="160" width="150" height="40" rx="12" fill="#b45309"/>${T(95, 185, 'قوهٔ قضائیه', { fs: 12.5, c: '#fff', halo: false })}
      </svg><figcaption>همان‌طور که اردو به نقش‌ها و مقرّرات نیاز داشت، کشور هم به حکومت نیاز دارد</figcaption></figure>`;
    },
    govTree() {
      const br = (x, c, e, t, s1, s2) => `<rect x="${x}" y="104" width="156" height="98" rx="16" fill="#ffffff" stroke="${c}" stroke-width="3"/><rect x="${x}" y="104" width="156" height="30" rx="14" fill="${c}"/>${T(x + 78, 124, e + ' ' + t, { fs: 12, c: '#fff', halo: false })}${T(x + 78, 156, s1, { fs: 10.5 })}${T(x + 78, 178, s2, { fs: 10, c: '#475569' })}`;
      return `<figure class="hw-figure"><svg viewBox="0 0 520 260" role="img" aria-label="ساختار حکومت جمهوری اسلامی ایران: رهبری و سه قوه">
        <rect width="520" height="260" rx="16" fill="#f8fafc"/>
        <rect x="170" y="14" width="180" height="44" rx="22" fill="#0d6859"/>${T(260, 41, '🕌 مقام رهبری · نظارت و هدایت', { fs: 11.5, c: '#fff', halo: false })}
        <path d="M260 58 L260 80 M86 80 L434 80 M86 80 L86 104 M260 80 L260 104 M434 80 L434 104" stroke="#64748b" stroke-width="2.5" fill="none"/>
        ${br(356, '#2563eb', '🏛️', 'مقننه', 'مجلس شورای اسلامی', 'قانون‌گذاری')}${br(182, '#16a34a', '🏢', 'مجریه (دولت)', 'رئیس‌جمهور + وزیران', 'اجرای قانون، رفاه')}${br(8, '#b45309', '⚖️', 'قضائیه', 'دادگاه‌ها', 'رسیدگی به شکایت')}
        <rect x="150" y="218" width="220" height="32" rx="16" fill="#fef3c7" stroke="#f59e0b"/>${T(260, 239, '🗳️ مردم با رأی خود انتخاب می‌کنند', { fs: 11 })}
        <path d="M330 218 C 380 214, 420 210, 434 202" stroke="#f59e0b" stroke-width="2" fill="none" stroke-dasharray="4 3"/><path d="M260 218 L260 202" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>
      </svg><figcaption>قانون اساسی مهم‌ترین قانون کشور است · نمایندگان مجلس هر ۴ سال یک بار انتخاب می‌شوند</figcaption></figure>`;
    },
    neighborsTable() {
      const rows = window.IranGeoNeighborsTable || [];
      const maxPop = 231.4;
      return `<div class="ig-ntable-wrap"><table class="ig-ntable"><caption>جدول کشورهای همسایهٔ خشکی ایران (کتاب، صفحهٔ ۶۶)</caption>
        <thead><tr><th scope="col">کشور</th><th scope="col">جهت</th><th scope="col">وسعت (کیلومتر مربع)</th><th scope="col">جمعیت (میلیون نفر)</th><th scope="col">پایتخت</th></tr></thead>
        <tbody>${rows.map((r) => {
          const pop = parseFloat(String(r.pop).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace('٫', '.'));
          return `<tr><th scope="row">${esc(r.n)}</th><td>${esc(r.dir)}</td><td>${esc(r.area)}</td><td><span class="ig-popbar" style="--w:${Math.max(4, Math.round((pop / maxPop) * 100))}%"></span>${esc(r.pop)}</td><td>${esc(r.cap)}</td></tr>`;
        }).join('')}</tbody></table></div>`;
    }
  };

  window.IranGeoLessonView = { lessonMap, visual: (k) => (VISUALS[k] ? VISUALS[k]() : '') };
})();
