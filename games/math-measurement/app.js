/* پیمانه‌ستان — موتور تعاملی درسنامه، کارگاه دست‌ورزی، مراحل گام‌به‌گام و گواهی‌نامهٔ قهرمانی */
(function () {
  'use strict';

  const D = window.MeasurementData;
  const GAME_ID = 'math-measurement';
  const HC = () => window.HakimCompanion || null;
  const W = () => window.HakimWorlds || null;
  const ALL_UNITS = () => D.stages;
  function companionAfterSolve(unit, wasSolvedBefore) {
    const hc = HC();
    const solvedHere = unit.tasks.filter((x) => profile.done[x.id]?.ok).length;
    if (solvedHere !== unit.tasks.length) return;
    const perfect = unit.tasks.every((x) => profile.done[x.id]?.ok && !profile.done[x.id].guided);
    const allDone = ALL_UNITS().every((u) => u.tasks.every((x) => profile.done[x.id]?.ok));
    if (hc) {
      if (allDone) hc.finish('شگفت‌انگیز بود ' + profile.name + '! همهٔ تمرین‌ها را حل کردی؛ گواهی‌نامه‌ات آماده است 🏆');
      else hc.stageDone(unit.title, perfect);
      reportUnit(unit);
    }
    const w = W();
    if (!w || wasSolvedBefore) return;
    const units = ALL_UNITS();
    const guided = unit.tasks.filter((x) => profile.done[x.id]?.guided).length;
    const stars = guided === 0 ? 3 : guided <= 2 ? 2 : 1;
    const nextIdx = units.findIndex((u) => u.tasks.some((x) => !profile.done[x.id]?.ok));
    const word = 'ایستگاه';
    setTimeout(() => w.celebrate({
      key: GAME_ID + ':' + unit.id,
      word,
      title: unit.title,
      stars,
      badge: unit.badge || '',
      isFinal: allDone,
      text: allDone ? 'همهٔ ' + word + '‌ها را کامل کردی و گواهی‌نامه‌ات آماده است. به خودت افتخار کن!' :
        stars === 3 ? 'بی‌نقص! همهٔ سؤال‌های این ' + word + ' را خودت و بدون راهنما حل کردی.' :
        'آفرین! این ' + word + ' را کامل کردی. اگر بدون راهنما حل کنی، ستاره‌های بیشتری می‌گیری.',
      onNext: nextIdx > -1 ? () => openLesson(nextIdx) : null,
      nextLabel: nextIdx > -1 ? word + ' بعدی ←' : '',
      onMap: () => renderMap(),
      onCert: () => renderCertificate()
    }), 700);
  }
  function reportUnit(unit) {
    const hc = HC();
    if (!hc) return;
    const solved = unit.tasks.filter((x) => profile.done[x.id]?.ok).length;
    const guided = unit.tasks.filter((x) => profile.done[x.id]?.guided).length;
    const stars = solved === unit.tasks.length ? (guided === 0 ? 3 : guided <= 2 ? 2 : 1) : solved > 0 ? 1 : 0;
    hc.reportStage({ gameId: GAME_ID, name: profile.name, stage: unit.title, stageId: unit.id, solved, total: unit.tasks.length, stars, guided, xp: profile.xp, durationSec: (Date.now() - stageStartedAt) / 1000, startedAt: stageStartedAt });
  }
  const STORAGE_KEY = 'hakim.measurement.v1';
  const $ = (id) => document.getElementById(id);
  const main = $('main');

  const fa = (v) =>
    String(v ?? '')
      .replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
      .replace(/\./g, '٫');

  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const allTasks = D.stages.flatMap((s) => s.tasks);

  function defaultState() {
    return {
      version: 1,
      name: 'معمار جوان',
      done: {},
      lessons: {},
      xp: 0,
      combo: 0,
      bestCombo: 0,
      sound: false,
      theme: 'light',
      scale: 1,
      city: { shown: [] }
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return defaultState();
      const base = defaultState();
      base.name = String(raw.name || 'معمار جوان').trim().slice(0, 36) || 'معمار جوان';
      if (raw.done && typeof raw.done === 'object') {
        for (const t of allTasks) {
          if (raw.done[t.id]?.ok) {
            base.done[t.id] = { ok: true, guided: Boolean(raw.done[t.id].guided) };
          }
        }
      }
      if (raw.lessons && typeof raw.lessons === 'object') {
        for (const s of D.stages) {
          if (raw.lessons[s.id]) base.lessons[s.id] = true;
        }
      }
      base.xp = Number.isFinite(raw.xp) ? Math.max(0, Math.min(99999, Math.round(raw.xp))) : 0;
      base.bestCombo = Number.isFinite(raw.bestCombo) ? Math.max(0, Math.min(999, Math.round(raw.bestCombo))) : 0;
      base.sound = Boolean(raw.sound);
      base.theme = raw.theme === 'night' ? 'night' : 'light';
      base.scale = [0.92, 1, 1.1, 1.2].includes(raw.scale) ? raw.scale : 1;
      if (raw.city && Array.isArray(raw.city.shown)) {
        base.city.shown = D.stages.map((s, i) => {
          const v = Number(raw.city.shown[i]);
          return Number.isInteger(v) && v >= 0 && v <= s.tasks.length ? v : 0;
        });
      }
      return base;
    } catch {
      return defaultState();
    }
  }

  let profile = loadState();
  let view = 'map'; // 'map' | 'lesson' | 'task' | 'studio' | 'cert'
  let si = 0;
  let qi = 0;
  let lessonStep = 0; // 0: story+interactive, 1: formula+worked, 2: exam trap
  let demoToggle = false;
  let stageStartedAt = Date.now();
  let taskSolved = false;
  let taskGuided = false;
  let taskAttempts = 0;
  let selectedChoice = null;
  let answerDraft = '';
  let labState = { d1: 6, d2: 4, a: 6, b: 4, h: 4, d: 6, l: 3, w: 3, ml: 250 };
  let studioState = { shape: 'rhombus', d1: 8, d2: 6, a: 9, b: 5, h: 4, d: 10, l: 4, w: 3, ch: 3, ml: 500 };

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      if ($('saveStatus')) $('saveStatus').textContent = 'ذخیرهٔ خودکار روی این دستگاه فعال است';
    } catch {
      if ($('saveStatus')) $('saveStatus').textContent = 'ذخیرهٔ مرورگر محدود است';
    }
    updateHud();
  }

  function applyPrefs() {
    if (profile.theme === 'night') {
      document.documentElement.setAttribute('data-theme', 'night');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    document.documentElement.style.setProperty('--fs-scale', String(profile.scale));
    if ($('themeBtn')) {
      $('themeBtn').setAttribute('aria-pressed', String(profile.theme === 'night'));
      $('themeBtn').textContent = profile.theme === 'night' ? '☀ روز' : '☾ شب';
    }
    if ($('soundBtn')) {
      $('soundBtn').setAttribute('aria-pressed', String(profile.sound));
      $('soundBtn').textContent = profile.sound ? '🔊 صدا: روشن' : '🔇 صدا: خاموش';
    }
  }

  function playTone(kind) {
    if (!profile.sound) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      const ctx = playTone._ctx || (playTone._ctx = new Ctx());
      const now = ctx.currentTime;
      const notes = kind === 'win' ? [523.25, 659.25, 783.99] : kind === 'err' ? [260, 220] : [440];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.17);
      });
    } catch {}
  }

  function speakText(txt) {
    if (!txt) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = 'fa-IR';
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }

  function stageSolvedCount(stage) {
    return stage.tasks.filter((t) => profile.done[t.id]?.ok).length;
  }

  function totalSolved() {
    return allTasks.filter((t) => profile.done[t.id]?.ok).length;
  }

  function stageStars(stage) {
    const c = stageSolvedCount(stage);
    const tot = stage.tasks.length;
    if (c === tot) return 3;
    if (c >= Math.ceil(tot * 0.6)) return 2;
    if (c >= 1) return 1;
    return 0;
  }

  function totalStars() {
    return D.stages.reduce((sum, s) => sum + stageStars(s), 0);
  }

  function rankTitle() {
    const pct = (totalSolved() / allTasks.length) * 100;
    if (pct >= 100) return 'استاد بزرگ پیمانه‌ستان 👑';
    if (pct >= 70) return 'مهندس ارشد اندازه‌گیری 🌟';
    if (pct >= 35) return 'معمار شکل‌ها و حجم‌ها 🛠️';
    return 'پژوهشگر نوآموز پیمانه‌ستان 🌱';
  }

  function updateHud() {
    if ($('hudStars')) $('hudStars').textContent = `⭐ ${fa(totalStars())} / ${fa(D.stages.length * 3)}`;
    if ($('hudXp')) $('hudXp').textContent = `💎 ${fa(profile.xp)} امتیاز`;
    if ($('hudCombo')) {
      $('hudCombo').textContent = `🔥 کمبو: ${fa(profile.combo)} (رکورد: ${fa(profile.bestCombo)})`;
      $('hudCombo').classList.toggle('combo-hot', profile.combo >= 3);
    }
  }

  /* ── SVG Generators for Interactive Lessons & Manipulatives ── */
  function svgRhombus(d1, d2, cutMode) {
    const w = d1 * 22;
    const h = d2 * 22;
    const cx = 200;
    const cy = 115;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    const x1 = cx + w / 2;
    const y1 = cy + h / 2;
    return `<svg viewBox="0 0 400 230" role="img" aria-label="نمایش لوزی با قطرهای ${fa(d1)} و ${fa(d2)}">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${cutMode ? '#fde68a' : 'none'}" stroke="#0b6460" stroke-width="2" stroke-dasharray="${cutMode ? 'none' : '5 4'}" rx="4"/>
      <polygon points="${cx},${y0} ${x1},${cy} ${cx},${y1} ${x0},${cy}" fill="#14b8a6" fill-opacity="0.42" stroke="#0b6460" stroke-width="2.5"/>
      <line x1="${x0}" y1="${cy}" x2="${x1}" y2="${cy}" stroke="#b45309" stroke-width="2"/>
      <line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y1}" stroke="#7c3aed" stroke-width="2"/>
      <text x="${cx}" y="${y1 + 20}" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">قطر اول: ${fa(d1)}   |   قطر دوم: ${fa(d2)}${cutMode ? `   ← مستطیل دو لوزی: ${fa(d1 * d2)}` : ''}</text>
    </svg>`;
  }

  function svgTrapezoid(a, b, h, doubled) {
    const scale = 16;
    const wa = a * scale;
    const wb = b * scale;
    const hh = h * scale;
    const yTop = 110 - hh / 2;
    const yBot = 110 + hh / 2;
    const xStart = doubled ? 200 - (wa + wb) / 2 : 200 - Math.max(wa, wb) / 2;
    const diff = (wa - wb) / 2;
    const p1 = `${xStart + Math.max(0, diff)},${yTop} ${xStart + Math.max(0, diff) + wb},${yTop} ${xStart + wa},${yBot} ${xStart},${yBot}`;
    const second = doubled
      ? `<polygon points="${xStart + Math.max(0, diff) + wb},${yTop} ${xStart + Math.max(0, diff) + wb + wa},${yTop} ${xStart + wa + wb},${yBot} ${xStart + wa},${yBot}" fill="#f59e0b" fill-opacity="0.38" stroke="#b45309" stroke-width="2.2"/>`
      : '';
    return `<svg viewBox="0 0 400 220" role="img" aria-label="ذوزنقه با قاعده‌های ${fa(a)} و ${fa(b)} و ارتفاع ${fa(h)}">
      <polygon points="${p1}" fill="#14b8a6" fill-opacity="0.42" stroke="#0b6460" stroke-width="2.5"/>
      ${second}
      <line x1="${xStart + Math.max(0, diff)}" y1="${yTop}" x2="${xStart + Math.max(0, diff)}" y2="${yBot}" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="200" y="202" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">قاعده‌ها: ${fa(a)} و ${fa(b)} · ارتفاع: ${fa(h)}${doubled ? ` ← متوازی‌الاضلاع با قاعدهٔ ${fa(a + b)}` : ''}</text>
    </svg>`;
  }

  function svgCircle(d, unrolled) {
    const r = Math.min(48, Math.max(18, d * 3.8));
    const circ = Number((d * 3.14).toFixed(2));
    const lineLen = Math.min(310, r * 6.28 * 0.9);
    return `<svg viewBox="0 0 400 215" role="img" aria-label="دایره با قطر ${fa(d)} سانتی‌متر">
      <circle cx="${unrolled ? 75 : 200}" cy="90" r="${r}" fill="#38bdf8" fill-opacity="0.28" stroke="#0284c7" stroke-width="3"/>
      <line x1="${(unrolled ? 75 : 200) - r}" y1="90" x2="${(unrolled ? 75 : 200) + r}" y2="90" stroke="#b45309" stroke-width="2.5"/>
      ${unrolled ? `<line x1="55" y1="158" x2="${55 + lineLen}" y2="158" stroke="#0b6460" stroke-width="5" stroke-linecap="round"/>
      <text x="${55 + lineLen / 2}" y="182" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">نخِ بازشدهٔ دور دایره ≈ ${fa(d)} × ۳٫۱۴ = ${fa(circ)} سانتی‌متر</text>` : `<text x="200" y="182" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">قطر = ${fa(d)} سانتی‌متر (شعاع = ${fa(d / 2)})</text>`}
    </svg>`;
  }

  function svgCubes(l, w, h) {
    const cubes = [];
    const size = 14;
    const ox = 200;
    const oy = 152;
    for (let z = 0; z < h; z++) {
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < l; x++) {
          const sx = ox + (x - y) * size * 1.15;
          const sy = oy + (x + y) * size * 0.58 - z * size * 1.15;
          const dx = size * 1.15;
          const dy = size * 0.58;
          const dz = size * 1.15;
          cubes.push(`<g stroke="#0f3d3e" stroke-width="0.9">
            <polygon points="${sx},${sy - dz} ${sx + dx},${sy - dz + dy} ${sx},${sy - dz + 2 * dy} ${sx - dx},${sy - dz + dy}" fill="#fde68a"/>
            <polygon points="${sx - dx},${sy - dz + dy} ${sx},${sy - dz + 2 * dy} ${sx},${sy + 2 * dy} ${sx - dx},${sy + dy}" fill="#2dd4bf"/>
            <polygon points="${sx + dx},${sy - dz + dy} ${sx},${sy - dz + 2 * dy} ${sx},${sy + 2 * dy} ${sx + dx},${sy + dy}" fill="#0d9488"/>
          </g>`);
        }
      }
    }
    return `<svg viewBox="0 0 400 230" role="img" aria-label="مکعب‌مستطیل با طول ${fa(l)}، عرض ${fa(w)} و ارتفاع ${fa(h)}">
      ${cubes.join('')}
      <text x="200" y="218" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">طول ${fa(l)} × عرض ${fa(w)} × ارتفاع ${fa(h)} = ${fa(l * w * h)} مکعب واحد</text>
    </svg>`;
  }

  function svgBeaker(ml) {
    const clamped = Math.max(0, Math.min(1000, ml));
    const fillH = Math.round((clamped / 1000) * 130);
    const yWater = 170 - fillH;
    const liters = Number((clamped / 1000).toFixed(3));
    return `<svg viewBox="0 0 400 220" role="img" aria-label="استوانهٔ مدرج با ${fa(clamped)} میلی‌لیتر مایع">
      <rect x="145" y="36" width="110" height="136" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>
      ${fillH > 0 ? `<rect x="148" y="${yWater}" width="104" height="${fillH}" rx="4" fill="#38bdf8" fill-opacity="0.65"/>` : ''}
      ${[250, 500, 750, 1000].map((mark) => {
        const ym = 170 - Math.round((mark / 1000) * 130);
        return `<line x1="145" y1="${ym}" x2="165" y2="${ym}" stroke="currentColor" stroke-width="1.8"/>
          <text x="136" y="${ym + 4}" text-anchor="end" font-size="11" font-weight="700" fill="currentColor">${fa(mark)}</text>`;
      }).join('')}
      <text x="200" y="202" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${fa(clamped)} میلی‌لیتر = ${fa(clamped)} سی‌سی = ${fa(liters)} لیتر</text>
    </svg>`;
  }

  function renderDemoVisual(kind, toggled) {
    if (kind === 'rhombus') return svgRhombus(8, 5, toggled);
    if (kind === 'trapezoid') return svgTrapezoid(8, 4, 4, toggled);
    if (kind === 'circle') return svgCircle(8, toggled);
    if (kind === 'cubes') return svgCubes(4, 3, toggled ? 3 : 1);
    return svgBeaker(toggled ? 1000 : 250);
  }

  /* ── Screens ── */
  function renderMap() {
    view = 'map';
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const nextIdx = Math.max(0, D.stages.findIndex((s) => stageSolvedCount(s) < s.tasks.length));

    main.innerHTML = `
      <section class="hero-card${window.PeymanCity ? ' hs-hero' : ''}">
        <div>
          <span class="hero-kicker">فصل ششم ریاضی پنجم · پوشش ۱۰۰٪ کتاب درسی</span>
          <h2 class="hero-title">به سرزمین <span class="hw-accent">«پیمانه‌ستان»</span> خوش آمدی!</h2>
          <p class="hero-sub">در ۱۰ ایستگاه داستانی، اول با درسنامهٔ تصویری و تعاملی راز هر شکل و حجم را کشف کن، بعد مرحله‌به‌مرحله تمرین‌های کتاب را حل کن، کمبو بزن و گواهی‌نامهٔ استادی بگیر!</p>
          <div class="hero-actions">
            <button type="button" class="btn-primary" id="btnStartNext">${window.PeymanCity ? '🏗️' : '🚀'} ${done === 0 ? 'شروع از ایستگاه اول' : done === allTasks.length ? 'مرور ایستگاه‌ها' : window.PeymanCity ? 'ادامهٔ ساخت شهرک' : 'ادامهٔ مسیر یادگیری'}</button>
            <button type="button" class="btn-soft" id="btnOpenStudio">🛠️ کارگاه آزاد ساخت و کشف</button>
            <button type="button" class="btn-gold" id="btnOpenCert">🏆 گواهی‌نامهٔ من</button>
          </div>
        </div>
        ${W() && !window.PeymanCity ? W().art('measure', { chips: ['📐 ' + fa(D.stages.length) + ' ایستگاه', '🧊 ' + fa(allTasks.length) + ' تمرین', '🏅 ' + fa(D.stages.length) + ' نشان'] }) : ''}
      </section>

      <section class="profile-bar" aria-label="پروفایل و پیشرفت قهرمان">
        <form class="profile-form" id="nameForm">
          <label for="studentNameInput"><b>نام قهرمان:</b></label>
          <input id="studentNameInput" type="text" maxlength="36" value="${esc(profile.name)}" autocomplete="off">
          <button type="submit" class="btn-soft">ثبت نام</button>
        </form>
        <div class="progress-meter-wrap">
          <div class="progress-meter-label">
            <span>رتبه: ${esc(rankTitle())}</span>
            <span>${fa(done)} از ${fa(allTasks.length)} تمرین (${fa(pct)}٪)</span>
          </div>
          <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت کل فصل ششم">
            <span style="width:${pct}%"></span>
          </div>
        </div>
      </section>

      ${window.PeymanCity ? window.PeymanCity.render(cityCtx()) : W() ? W().journey(D.stages.map((u, i) => ({ title: u.title, solved: stageSolvedCount(u), total: u.tasks.length, locked: isLocked(i) })), { word: 'ایستگاه', attr: 'data-open-lesson', nextIdx, done, total: allTasks.length }) : ''}

      <section aria-labelledby="stationsHeading">
        <h2 id="stationsHeading" class="hw-section-title" style="margin:0 0 12px;font-size:1.2rem">🗺️ نقشهٔ ۱۰ ایستگاه فصل ششم (از مساحت تا حجم و گنجایش)</h2>
        <div class="stations-grid">
          ${D.stages.map((s, idx) => {
            const solved = stageSolvedCount(s);
            const stars = stageStars(s);
            const complete = solved === s.tasks.length;
            const locked = isLocked(idx);
            const seen = Boolean(profile.lessons[s.id]) || solved > 0;
            const hw = W() ? W().card(solved, s.tasks.length, idx, nextIdx, locked) : null;
            return `<article class="station-card ${complete ? 'done' : ''} ${hw ? 'hw-card' : ''}" ${hw ? hw.attrs : ''}>
              <div class="station-top">
                <span class="station-icon" aria-hidden="true">${s.icon}${hw ? hw.num : ''}</span>
                <span class="station-stars" aria-label="${fa(stars)} از ۳ ستاره">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
              </div>
              <span class="station-pages">ایستگاه ${fa(idx + 1)} · ${esc(s.pages)}</span>
              <h3>${esc(s.title)}</h3>
              ${hw ? hw.badge : ''}
              <p class="station-topic">${esc(s.topic)}</p>
              ${hw ? hw.bar : ''}
              <div class="station-foot">
                <small><b>${fa(solved)}</b> از <b>${fa(s.tasks.length)}</b> تمرین ${profile.lessons[s.id] ? '· 📖 درس دیده شد' : ''}</small>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  ${locked ? `<button type="button" class="btn-soft" data-open-lesson="${idx}" aria-label="ایستگاه ${fa(idx + 1)} قفل است؛ اول ایستگاه قبلی را کامل کن">🔒 قفل</button>` :
                    seen ? `<button type="button" class="btn-soft" data-open-lesson="${idx}">📖 درسنامه</button>
                  <button type="button" class="btn-primary" data-open-tasks="${idx}">${complete ? 'مرور تمرین‌ها' : '🎯 تمرین‌ها ←'}</button>` :
                    `<button type="button" class="btn-primary" data-open-lesson="${idx}">📖 شروع با درسنامه ←</button>`}
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>

      ${W() ? W().certBanner({ done, total: allTasks.length, word: 'ایستگاه', taskWord: 'تمرین', attr: 'data-open-lesson', nextIdx }) : ''}
    `;

    $('btnStartNext').onclick = () => (window.PeymanCity ? window.PeymanCity.goNext() : openLesson(nextIdx));
    window.PeymanCity?.mount(main, cityCtx());
    $('btnOpenStudio').onclick = renderStudio;
    $('btnOpenCert').onclick = renderCertificate;
    W()?.bind(main, { cert: renderCertificate });
    $('nameForm').onsubmit = (e) => {
      e.preventDefault();
      profile.name = String($('studentNameInput').value || '').trim().slice(0, 36) || 'معمار جوان';
      HC()?.setName(profile.name);
      saveState();
      renderMap();
    };
    main.querySelectorAll('[data-open-lesson]').forEach((b) => {
      b.onclick = () => openLesson(Number(b.dataset.openLesson));
    });
    main.querySelectorAll('[data-open-tasks]').forEach((b) => {
      b.onclick = () => openTask(Number(b.dataset.openTasks), 0);
    });
  }

  function renderStageShell(innerHtml, activeTab) {
    const s = D.stages[si];
    const solved = stageSolvedCount(s);
    const stars = stageStars(s);
    return `
      <div class="stage-shell">
        <aside class="stage-side">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="station-icon" aria-hidden="true">${s.icon}</span>
            <div>
              <small style="color:var(--muted)">ایستگاه ${fa(si + 1)} از ${fa(D.stages.length)}</small>
              <h2 style="margin:0;font-size:1.05rem">${esc(s.title)}</h2>
            </div>
          </div>
          <p style="margin:0;font-size:0.84rem;color:var(--muted)">${esc(s.pages)}</p>
          <div class="progress-bar" aria-hidden="true"><span style="width:${Math.round((solved / s.tasks.length) * 100)}%"></span></div>
          <div style="display:flex;justify-content:space-between;font-size:0.84rem">
            <span>پیشرفت: <b>${fa(solved)} / ${fa(s.tasks.length)}</b></span>
            <span>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
          </div>
          <div class="lesson-card-box" style="margin:4px 0;font-size:0.83rem">
            <b>🏅 نشان این ایستگاه:</b><br>${esc(s.badge)} ${solved === s.tasks.length ? '✅ باز شد!' : '(با حل همهٔ تمرین‌ها باز می‌شود)'}
          </div>
          <button type="button" id="sideBackMap">🗺️ بازگشت به نقشهٔ ایستگاه‌ها</button>
          <button type="button" class="btn-soft" id="sideStudio">🛠️ کارگاه آزاد</button>
        </aside>
        <section class="stage-paper">
          <div class="mode-tabs" role="tablist" aria-label="بخش‌های ایستگاه">
            <button type="button" role="tab" class="mode-tab" id="tabLesson" aria-selected="${activeTab === 'lesson'}">📖 ۱. درسنامهٔ تعاملی (اول یاد بگیر)</button>
            <button type="button" role="tab" class="mode-tab" id="tabTasks" aria-selected="${activeTab === 'task'}">🎯 ۲. چالش‌های مرحله (${fa(solved)}/${fa(s.tasks.length)})</button>
          </div>
          ${innerHtml}
        </section>
      </div>
    `;
  }

  // پیوند شهرک معمارها با وضعیت بازی
  function cityCtx() {
    return {
      stages: D.stages,
      city: profile.city,
      solved: (i) => stageSolvedCount(D.stages[i]),
      stars: (i) => stageStars(D.stages[i]),
      seen: (i) => Boolean(profile.lessons[D.stages[i].id]),
      locked: (i) => isLocked(i),
      openLesson: (i) => openLesson(i),
      openTask: (i) => openTask(i, Math.max(0, D.stages[i].tasks.findIndex((t) => !profile.done[t.id]?.ok))),
      lockedNotice: (i) => lockedNotice(i),
      save: saveState,
      sound: () => profile.sound,
      say: (m) => HC()?.say?.(m, 'happy')
    };
  }

  function unitsInfo() {
    return D.stages.map((st) => ({ solved: stageSolvedCount(st), total: st.tasks.length, seen: Boolean(profile.lessons[st.id]) }));
  }
  function isLocked(idx) {
    const u = unitsInfo();
    if (W() && W().isLocked) return W().isLocked(u, idx);
    return idx > 0 && !u[idx].seen && !u[idx].solved && u[idx - 1].solved < u[idx - 1].total;
  }
  function lockedNotice(idx) {
    const msg = 'این ایستگاه هنوز قفل است؛ اول ایستگاه «' + (W() ? W().shortTitle(D.stages[idx - 1].title) : D.stages[idx - 1].title) + '» را کامل کن 🔒';
    if (W()?.toast) W().toast(msg); else HC()?.say?.(msg);
  }

  function openLesson(stageIndex) {
    if (isLocked(stageIndex)) { lockedNotice(stageIndex); renderMap(); return; }
    si = stageIndex;
    view = 'lesson';
    lessonStep = 0;
    demoToggle = false;
    stageStartedAt = Date.now();
    drawLesson();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function drawLesson() {
    const s = D.stages[si];
    const toggleLabels = {
      rhombus: demoToggle ? '↩ نمایش لوزی تنها' : '✂️ برش لوزی دوم و ساخت مستطیل!',
      trapezoid: demoToggle ? '↩ نمایش یک ذوزنقه' : '🔄 چسباندن ذوزنقهٔ دوم و ساخت متوازی‌الاضلاع!',
      circle: demoToggle ? '↩ جمع کردن نخ دور دایره' : '📏 باز کردن نخِ دور دایره روی خط‌کش!',
      cubes: demoToggle ? '↩ نمایش لایهٔ اول (کف)' : '🧊 چیدن ۳ لایه روی هم و ساخت حجم!',
      beaker: demoToggle ? '↩ ریختن ۱ لیوان (۲۵۰ سی‌سی)' : '🫗 پر کردن کامل ۱ لیتر (۱۰۰۰ سی‌سی)!'
    };

    let stepHtml = '';
    if (lessonStep === 0) {
      stepHtml = `
        <div class="lesson-card-box">
          <h3 style="margin:0 0 6px">🎬 گام اول: داستان و کشف شهودی</h3>
          <p style="margin:0">${esc(s.lesson.story)}</p>
        </div>
        <div class="lesson-visual-box">
          ${renderDemoVisual(s.demoKind, demoToggle)}
          <div class="lesson-controls">
            <button type="button" class="btn-gold" id="btnDemoToggle">${toggleLabels[s.demoKind]}</button>
            <button type="button" class="btn-soft" id="btnSpeakLesson">🔊 شنیدن درسنامه</button>
          </div>
        </div>
      `;
    } else if (lessonStep === 1) {
      stepHtml = `
        <div class="lesson-card-box">
          <h3 style="margin:0 0 6px">🔑 گام دوم: راز طلایی و نمونهٔ کتاب درسی</h3>
          <div class="formula-badge">${esc(s.lesson.formula)}</div>
          <p style="margin:8px 0 0">${esc(s.lesson.worked)}</p>
        </div>
        <div class="lesson-visual-box">
          ${renderDemoVisual(s.demoKind, true)}
          <div class="lesson-controls">
            <button type="button" class="btn-soft" id="btnSpeakLesson">🔊 شنیدن فرمول و مثال</button>
          </div>
        </div>
      `;
    } else {
      stepHtml = `
        <div class="trap-box">
          <h3 style="margin:0 0 6px">⚠️ گام سوم: حواست به این دام امتحانی باشد!</h3>
          <p style="margin:0">${esc(s.lesson.trap)}</p>
        </div>
        <div class="lesson-card-box">
          <b>خلاصهٔ سریع قبل از شروع چالش:</b><br>
          <span>${esc(s.lesson.formula)}</span>
        </div>
      `;
    }

    main.innerHTML = renderStageShell(
      `
      <div class="lesson-stepper" role="group" aria-label="گام‌های درسنامه">
        <button type="button" class="step-pill ${lessonStep === 0 ? 'active' : ''}" data-lstep="0">۱. کشف تصویری</button>
        <button type="button" class="step-pill ${lessonStep === 1 ? 'active' : ''}" data-lstep="1">۲. فرمول و مثال کتاب</button>
        <button type="button" class="step-pill ${lessonStep === 2 ? 'active' : ''}" data-lstep="2">۳. نکتهٔ امتحانی</button>
      </div>
      ${stepHtml}
      <div class="action-row">
        <button type="button" id="btnPrevLesson" ${lessonStep === 0 ? 'disabled' : ''}>→ گام قبلی</button>
        <button type="button" class="btn-primary" id="btnNextLesson">${lessonStep < 2 ? 'گام بعدی درسنامه ←' : '🎯 یاد گرفتم! شروع تمرین‌های ایستگاه ←'}</button>
      </div>
      `,
      'lesson'
    );

    bindShellButtons();
    main.querySelectorAll('[data-lstep]').forEach((b) => {
      b.onclick = () => {
        lessonStep = Number(b.dataset.lstep);
        drawLesson();
      };
    });
    if ($('btnDemoToggle')) {
      $('btnDemoToggle').onclick = () => {
        demoToggle = !demoToggle;
        playTone('tap');
        drawLesson();
      };
    }
    if ($('btnSpeakLesson')) {
      $('btnSpeakLesson').onclick = () => {
        speakText(lessonStep === 0 ? s.lesson.story : `${s.lesson.formula}. ${s.lesson.worked}`);
      };
    }
    $('btnPrevLesson').onclick = () => {
      if (lessonStep > 0) {
        lessonStep--;
        drawLesson();
      }
    };
    $('btnNextLesson').onclick = () => {
      if (lessonStep < 2) {
        lessonStep++;
        drawLesson();
      } else {
        if (!profile.lessons[s.id]) {
          profile.lessons[s.id] = true;
          profile.xp += 15;
          saveState();
        }
        const firstUnsolved = Math.max(0, s.tasks.findIndex((t) => !profile.done[t.id]?.ok));
        openTask(si, firstUnsolved);
      }
    };
  }

  function initLabForTask(t) {
    if (t.kind !== 'lab') return;
    if (t.labType === 'rhombus') labState = { ...labState, d1: 4, d2: 4 };
    if (t.labType === 'trapezoid') labState = { ...labState, a: 6, b: 4, h: 3 };
    if (t.labType === 'circle') labState = { ...labState, d: 4 };
    if (t.labType === 'cubes') labState = { ...labState, l: 2, w: 2, h: 2 };
    if (t.labType === 'beaker') labState = { ...labState, ml: 250 };
  }

  function openTask(stageIndex, taskIndex) {
    if (isLocked(stageIndex)) { lockedNotice(stageIndex); renderMap(); return; }
    const us = D.stages[stageIndex];
    if (!profile.lessons[us.id] && stageSolvedCount(us) === 0) {
      W()?.toast?.('اول درسنامهٔ این ایستگاه را ببین؛ بعد تمرین‌ها باز می‌شوند 📖');
      openLesson(stageIndex);
      return;
    }
    si = stageIndex;
    qi = taskIndex;
    view = 'task';
    taskSolved = false;
    taskGuided = false;
    taskAttempts = 0;
    selectedChoice = null;
    answerDraft = '';
    initLabForTask(D.stages[si].tasks[qi]);
    drawTask();
  }

  function renderTaskWorkbench(t) {
    if (t.kind === 'lab') {
      if (t.labType === 'rhombus') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgRhombus(labState.d1, labState.d2, true)}</div>
          <div class="slider-row"><label for="slD1">قطر بزرگ: <b id="lblD1">${fa(labState.d1)}</b></label><input id="slD1" type="range" min="2" max="12" value="${labState.d1}" ${taskSolved ? 'disabled' : ''}></div>
          <div class="slider-row"><label for="slD2">قطر کوچک: <b id="lblD2">${fa(labState.d2)}</b></label><input id="slD2" type="range" min="2" max="10" value="${labState.d2}" ${taskSolved ? 'disabled' : ''}></div>
        </div>`;
      }
      if (t.labType === 'trapezoid') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgTrapezoid(labState.a, labState.b, labState.h, true)}</div>
          <div class="slider-row"><label for="slA">قاعدهٔ بزرگ: <b id="lblA">${fa(labState.a)}</b></label><input id="slA" type="range" min="3" max="12" value="${labState.a}" ${taskSolved ? 'disabled' : ''}></div>
          <div class="slider-row"><label for="slB">قاعدهٔ کوچک: <b id="lblB">${fa(labState.b)}</b></label><input id="slB" type="range" min="2" max="10" value="${labState.b}" ${taskSolved ? 'disabled' : ''}></div>
          <div class="slider-row"><label for="slH">ارتفاع: <b id="lblH">${fa(labState.h)}</b></label><input id="slH" type="range" min="2" max="8" value="${labState.h}" ${taskSolved ? 'disabled' : ''}></div>
        </div>`;
      }
      if (t.labType === 'circle') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgCircle(labState.d, true)}</div>
          <div class="slider-row"><label for="slD">قطر دایره: <b id="lblD">${fa(labState.d)}</b> سانتی‌متر</label><input id="slD" type="range" min="2" max="14" step="2" value="${labState.d}" ${taskSolved ? 'disabled' : ''}></div>
        </div>`;
      }
      if (t.labType === 'cubes') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgCubes(labState.l, labState.w, labState.h)}</div>
          <div class="slider-row"><label for="slL">طول: <b id="lblL">${fa(labState.l)}</b></label><input id="slL" type="range" min="1" max="6" value="${labState.l}" ${taskSolved ? 'disabled' : ''}></div>
          <div class="slider-row"><label for="slW">عرض: <b id="lblW">${fa(labState.w)}</b></label><input id="slW" type="range" min="1" max="5" value="${labState.w}" ${taskSolved ? 'disabled' : ''}></div>
          <div class="slider-row"><label for="slCH">ارتفاع: <b id="lblCH">${fa(labState.h)}</b></label><input id="slCH" type="range" min="1" max="5" value="${labState.h}" ${taskSolved ? 'disabled' : ''}></div>
        </div>`;
      }
      if (t.labType === 'beaker') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgBeaker(labState.ml)}</div>
          <div class="lesson-controls">
            <button type="button" class="btn-soft" data-pour="250" ${taskSolved ? 'disabled' : ''}>+ پیمانهٔ ۲۵۰ میلی‌لیتری</button>
            <button type="button" class="btn-soft" data-pour="100" ${taskSolved ? 'disabled' : ''}>+ پیمانهٔ ۱۰۰ میلی‌لیتری</button>
            <button type="button" data-pour="-250" ${taskSolved ? 'disabled' : ''}>− کم کردن ۲۵۰</button>
            <button type="button" data-pour="0" ${taskSolved ? 'disabled' : ''}>خالی کردن ظرف</button>
          </div>
        </div>`;
      }
    }

    if (t.diagram) {
      if (t.diagram.type === 'rhombus') {
        return `<div class="workbench">${svgRhombus(typeof t.diagram.d1 === 'number' ? t.diagram.d1 : 8, t.diagram.d2, false)}</div>`;
      }
      if (t.diagram.type === 'trapezoid') {
        return `<div class="workbench">${svgTrapezoid(t.diagram.a, t.diagram.b, t.diagram.h, false)}</div>`;
      }
    }

    if (t.kind === 'choice') {
      return `<div class="choices-grid" role="group" aria-label="گزینه‌های پاسخ">
        ${t.options.map((opt, idx) => `<button type="button" class="choice-btn" data-choice="${idx}" aria-pressed="${selectedChoice === idx}" ${taskSolved ? 'disabled' : ''}>${fa(idx + 1)}) ${esc(opt)}</button>`).join('')}
      </div>`;
    }

    return '';
  }

  function drawTask(feedbackHtml, feedbackClass) {
    const s = D.stages[si];
    const t = s.tasks[qi];
    const needsNumeric = t.kind === 'number' || t.kind === 'lab';

    main.innerHTML = renderStageShell(
      `
      <nav class="task-dots" aria-label="فهرست تمرین‌های ایستگاه">
        ${s.tasks.map((item, idx) => `<button type="button" class="task-dot ${profile.done[item.id]?.ok ? 'solved' : ''}" data-goto-task="${idx}" aria-current="${idx === qi ? 'step' : 'false'}">${profile.done[item.id]?.ok ? '✓ ' : ''}سؤال ${fa(idx + 1)}</button>`).join('')}
      </nav>

      <div class="task-prompt-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <small style="color:var(--primary);font-weight:800">تمرین ${fa(qi + 1)} از ${fa(s.tasks.length)}</small>
          <button type="button" class="btn-soft" id="btnReadPrompt" style="min-height:36px;padding:4px 10px;font-size:0.8rem">🔊 خواندن صورت سؤال</button>
        </div>
        <h2 id="taskPromptText">${esc(t.prompt)}</h2>
      </div>

      ${renderTaskWorkbench(t)}

      ${needsNumeric ? `
        <div class="answer-entry">
          <label for="numAnswerInput"><b>پاسخ عددی تو:</b></label>
          <input id="numAnswerInput" type="text" inputmode="decimal" autocomplete="off" maxlength="16" placeholder="مثلاً ۲۴" value="${esc(answerDraft)}" ${taskSolved ? 'disabled' : ''}>
        </div>
        <div class="mini-keypad" role="group" aria-label="صفحه‌کلید سریع ارقام">
          ${['۱','۲','۳','۴','۵','۶','۷','۸','۹','۰','٫'].map((k) => `<button type="button" data-pad="${k}" ${taskSolved ? 'disabled' : ''}>${k}</button>`).join('')}
          <button type="button" data-pad="back" aria-label="پاک کردن رقم آخر" ${taskSolved ? 'disabled' : ''}>⌫</button>
        </div>
      ` : ''}

      <div id="taskFeedback" class="feedback-box ${feedbackClass || ''}" role="status" aria-live="polite">
        ${feedbackHtml || (profile.done[t.id]?.ok ? '✅ این تمرین را قبلاً حل کرده‌ای؛ می‌توانی دوباره تمرین کنی یا به سراغ تمرین بعدی بروی.' : 'پاسخت را آماده کن و دکمهٔ «بررسی پاسخ» را بزن!')}
      </div>

      <div class="action-row">
        <button type="button" class="btn-primary" id="btnCheckTask" ${taskSolved ? 'disabled' : ''}>✓ بررسی پاسخ</button>
        <button type="button" class="btn-soft" id="btnHintTask" ${taskSolved ? 'disabled' : ''}>💡 راهنمایی گام‌به‌گام</button>
        ${taskSolved ? `<button type="button" class="btn-gold" id="btnNextTask">${qi < s.tasks.length - 1 ? 'تمرین بعدی ←' : si < D.stages.length - 1 ? '🎉 ایستگاه بعدی ←' : '🏆 مشاهدهٔ گواهی‌نامهٔ استادی!'}</button>` : ''}
      </div>
      `,
      'task'
    );

    bindShellButtons();
    main.querySelectorAll('[data-goto-task]').forEach((b) => {
      b.onclick = () => openTask(si, Number(b.dataset.gotoTask));
    });
    $('btnReadPrompt').onclick = () => speakText(t.prompt);

    // Bind lab controls
    if ($('slD1')) {
      const upd = () => {
        labState.d1 = Number($('slD1').value);
        labState.d2 = Number($('slD2').value);
        $('lblD1').textContent = fa(labState.d1);
        $('lblD2').textContent = fa(labState.d2);
        $('labSvgWrap').innerHTML = svgRhombus(labState.d1, labState.d2, true);
      };
      $('slD1').oninput = upd;
      $('slD2').oninput = upd;
    }
    if ($('slA')) {
      const upd = () => {
        labState.a = Number($('slA').value);
        labState.b = Number($('slB').value);
        labState.h = Number($('slH').value);
        $('lblA').textContent = fa(labState.a);
        $('lblB').textContent = fa(labState.b);
        $('lblH').textContent = fa(labState.h);
        $('labSvgWrap').innerHTML = svgTrapezoid(labState.a, labState.b, labState.h, true);
      };
      $('slA').oninput = upd;
      $('slB').oninput = upd;
      $('slH').oninput = upd;
    }
    if ($('slD')) {
      $('slD').oninput = () => {
        labState.d = Number($('slD').value);
        $('lblD').textContent = fa(labState.d);
        $('labSvgWrap').innerHTML = svgCircle(labState.d, true);
      };
    }
    if ($('slL')) {
      const upd = () => {
        labState.l = Number($('slL').value);
        labState.w = Number($('slW').value);
        labState.h = Number($('slCH').value);
        $('lblL').textContent = fa(labState.l);
        $('lblW').textContent = fa(labState.w);
        $('lblCH').textContent = fa(labState.h);
        $('labSvgWrap').innerHTML = svgCubes(labState.l, labState.w, labState.h);
      };
      $('slL').oninput = upd;
      $('slW').oninput = upd;
      $('slCH').oninput = upd;
    }
    main.querySelectorAll('[data-pour]').forEach((b) => {
      b.onclick = () => {
        const delta = Number(b.dataset.pour);
        labState.ml = delta === 0 ? 0 : Math.max(0, Math.min(1000, labState.ml + delta));
        $('labSvgWrap').innerHTML = svgBeaker(labState.ml);
      };
    });

    main.querySelectorAll('[data-choice]').forEach((b) => {
      b.onclick = () => {
        selectedChoice = Number(b.dataset.choice);
        main.querySelectorAll('[data-choice]').forEach((el) => {
          el.setAttribute('aria-pressed', String(el === b));
        });
      };
    });

    if ($('numAnswerInput')) {
      $('numAnswerInput').oninput = (e) => {
        answerDraft = e.target.value;
      };
      $('numAnswerInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCheckTask();
        }
      };
      main.querySelectorAll('[data-pad]').forEach((b) => {
        b.onclick = () => {
          const k = b.dataset.pad;
          if (k === 'back') answerDraft = answerDraft.slice(0, -1);
          else if (answerDraft.length < 16) answerDraft += k;
          $('numAnswerInput').value = answerDraft;
          $('numAnswerInput').focus();
        };
      });
    }

    $('btnHintTask').onclick = () => {
      taskGuided = true;
      $('taskFeedback').className = 'feedback-box';
      $('taskFeedback').innerHTML = `<b>💡 راهنمای حکیم:</b> ${esc(t.hint)}`;
    };

    $('btnCheckTask').onclick = handleCheckTask;

    if ($('btnNextTask')) {
      $('btnNextTask').onclick = () => {
        if (qi < s.tasks.length - 1) {
          openTask(si, qi + 1);
        } else {
          reportStageSession(s);
          if (si < D.stages.length - 1) openLesson(si + 1);
          else renderCertificate();
        }
      };
    }
  }

  function reportAnswer(stage, task, userVal, isCorrect) {
    HC()?.reportAnswer({
      gameId: GAME_ID,
      name: profile.name,
      stage: stage.title,
      questionId: task.id,
      questionNum: qi + 1,
      questionText: task.prompt,
      studentAnswer: userVal ?? '',
      correctAnswer: task.kind === 'choice' ? task.options[task.answer] : String(task.answer),
      isCorrect: Boolean(isCorrect),
      attempts: taskAttempts
    });
    HC()?.answer(Boolean(isCorrect));
  }

  function reportStageSession(stage) {
    reportUnit(stage);
  }

  function handleCheckTask() {
    if (taskSolved) return;
    const s = D.stages[si];
    const t = s.tasks[qi];
    taskAttempts++;

    const rawVal = t.kind === 'choice' ? selectedChoice : answerDraft;
    if (t.kind === 'choice' && selectedChoice === null) {
      drawTask('<b>ابتدا یکی از گزینه‌ها را انتخاب کن!</b>', 'err');
      return;
    }
    if (t.kind !== 'choice' && !String(answerDraft || '').trim()) {
      drawTask('<b>ابتدا پاسخ عددی‌ات را در کادر بنویس!</b>', 'err');
      return;
    }

    const res = D.checkAnswer(t, rawVal, labState);
    if (res === 'lab-incomplete') {
      playTone('err');
      drawTask('<b>پاسخ عددی‌ات درست است، اما اول ابزار کارگاه بالا را هم روی اندازه‌های خواسته‌شدهٔ صورت سؤال تنظیم کن!</b>', 'err');
      return;
    }

    reportAnswer(s, t, t.kind === 'choice' ? t.options[selectedChoice] : answerDraft, res === true);

    if (res === true) {
      playTone('win');
      const already = Boolean(profile.done[t.id]?.ok);
      profile.done[t.id] = { ok: true, guided: already ? profile.done[t.id].guided : taskGuided };
      profile.combo += 1;
      if (profile.combo > profile.bestCombo) profile.bestCombo = profile.combo;
      if (!already) {
        profile.xp += taskGuided ? 15 : 25 + Math.min(20, profile.combo * 3);
      }
      taskSolved = true;
      saveState();
      drawTask(
        `<b>🌟 آفرین قهرمان! کاملاً درست است.</b><br>${esc(t.why)}${profile.combo >= 2 ? `<br><small>🔥 ${fa(profile.combo)} پاسخ درست پیاپی!</small>` : ''}`,
        'ok'
      );
      companionAfterSolve(s, already);
      return;
    }

    playTone('err');
    profile.combo = 0;
    saveState();

    let customReason = t.hint;
    if (t.kind === 'choice' && t.whyWrong && t.whyWrong[selectedChoice]) {
      customReason = t.whyWrong[selectedChoice];
    } else if (t.commonErrors) {
      const parsed = D.normNum(answerDraft);
      const match = t.commonErrors.find((ce) => D.closeEq(parsed, ce.val));
      if (match) customReason = match.msg;
    }
    drawTask(`<b>🤔 هنوز دقیق نشده! به این نکته دقت کن:</b><br>${esc(customReason)}`, 'err');
  }

  function bindShellButtons() {
    if ($('sideBackMap')) $('sideBackMap').onclick = renderMap;
    if ($('sideStudio')) $('sideStudio').onclick = renderStudio;
    if ($('tabLesson')) $('tabLesson').onclick = () => openLesson(si);
    if ($('tabTasks')) $('tabTasks').onclick = () => openTask(si, qi);
  }

  /* ── Free Workshop Studio ── */
  function renderStudio() {
    view = 'studio';
    main.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <h2 style="margin:0">🛠️ کارگاه آزاد ساخت و کشف پیمانه‌ستان</h2>
        <button type="button" class="btn-primary" id="studioBackMap">🗺️ بازگشت به نقشهٔ ایستگاه‌ها</button>
      </div>
      <div class="studio-grid">
        <section class="studio-card">
          <h3 style="margin-top:0">۱) آزمایشگاه لوزی و مستطیل محیطی</h3>
          <div id="stRhombus">${svgRhombus(studioState.d1, studioState.d2, true)}</div>
          <div class="slider-row"><label for="stD1">قطر اول: <b id="stLblD1">${fa(studioState.d1)}</b></label><input id="stD1" type="range" min="2" max="12" value="${studioState.d1}"></div>
          <div class="slider-row"><label for="stD2">قطر دوم: <b id="stLblD2">${fa(studioState.d2)}</b></label><input id="stD2" type="range" min="2" max="10" value="${studioState.d2}"></div>
          <p id="stRhombusRes" style="font-weight:800;margin:8px 0 0">مساحت لوزی = (${fa(studioState.d1)} × ${fa(studioState.d2)}) ÷ ۲ = ${fa((studioState.d1 * studioState.d2) / 2)}</p>
        </section>

        <section class="studio-card">
          <h3 style="margin-top:0">۲) مکعب‌چین سه‌بعدی حجم</h3>
          <div id="stCubes">${svgCubes(studioState.l, studioState.w, studioState.ch)}</div>
          <div class="slider-row"><label for="stL">طول: <b id="stLblL">${fa(studioState.l)}</b></label><input id="stL" type="range" min="1" max="6" value="${studioState.l}"></div>
          <div class="slider-row"><label for="stW">عرض: <b id="stLblW">${fa(studioState.w)}</b></label><input id="stW" type="range" min="1" max="5" value="${studioState.w}"></div>
          <div class="slider-row"><label for="stCH">ارتفاع: <b id="stLblCH">${fa(studioState.ch)}</b></label><input id="stCH" type="range" min="1" max="5" value="${studioState.ch}"></div>
        </section>

        <section class="studio-card">
          <h3 style="margin-top:0">۳) آزمایشگاه لیتر، سی‌سی و سانتی‌متر مکعب</h3>
          <div id="stBeaker">${svgBeaker(studioState.ml)}</div>
          <div class="slider-row"><label for="stML">مقدار مایع: <b id="stLblML">${fa(studioState.ml)}</b> میلی‌لیتر</label><input id="stML" type="range" min="0" max="1000" step="50" value="${studioState.ml}"></div>
        </section>
      </div>
    `;

    $('studioBackMap').onclick = renderMap;
    const updR = () => {
      studioState.d1 = Number($('stD1').value);
      studioState.d2 = Number($('stD2').value);
      $('stLblD1').textContent = fa(studioState.d1);
      $('stLblD2').textContent = fa(studioState.d2);
      $('stRhombus').innerHTML = svgRhombus(studioState.d1, studioState.d2, true);
      $('stRhombusRes').textContent = `مساحت لوزی = (${fa(studioState.d1)} × ${fa(studioState.d2)}) ÷ ۲ = ${fa((studioState.d1 * studioState.d2) / 2)}`;
    };
    $('stD1').oninput = updR;
    $('stD2').oninput = updR;

    const updC = () => {
      studioState.l = Number($('stL').value);
      studioState.w = Number($('stW').value);
      studioState.ch = Number($('stCH').value);
      $('stLblL').textContent = fa(studioState.l);
      $('stLblW').textContent = fa(studioState.w);
      $('stLblCH').textContent = fa(studioState.ch);
      $('stCubes').innerHTML = svgCubes(studioState.l, studioState.w, studioState.ch);
    };
    $('stL').oninput = updC;
    $('stW').oninput = updC;
    $('stCH').oninput = updC;

    $('stML').oninput = () => {
      studioState.ml = Number($('stML').value);
      $('stLblML').textContent = fa(studioState.ml);
      $('stBeaker').innerHTML = svgBeaker(studioState.ml);
    };
  }

  /* ── World-Class Mastery Certificate ── */
  function renderCertificate() {
    view = 'cert';
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const stars = totalStars();
    const masteredStages = D.stages.filter((s) => stageSolvedCount(s) === s.tasks.length).length;
    const certCode = `HK-M6-${fa(done)}-${fa(stars)}`;

    main.innerHTML = `
      <div class="action-row no-print" style="justify-content:space-between;margin-bottom:16px">
        <button type="button" id="certBackMap">🗺️ بازگشت به نقشهٔ سفر</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn-primary" id="btnPrintCert">🖨️ چاپ استاندارد A4 / ذخیرهٔ PDF</button>
        </div>
      </div>

      <article class="cert-sheet hw-cert" aria-label="گواهی‌نامهٔ مهارت پیمانه‌ستان">
        <div class="hw-cert-top">
        ${W() ? W().seal('پیمانه‌ستان', done === allTasks.length ? 'مهر استادی' : 'مهر پیشرفت') : ''}
        <div class="cert-header">
          <div style="font-size:0.85rem;font-weight:800;color:#47585c">حکیمستان · مدرسهٔ ریاضی پایهٔ پنجم دبستان</div>
          <h2 style="margin:6px 0;font-size:1.55rem;color:#142429">${done === allTasks.length ? 'گواهی‌نامهٔ استادی کامل فصل ششم (پیمانه‌ستان)' : 'گواهی‌نامهٔ پیشرفت یادگیری فصل ششم (پیمانه‌ستان)'}</h2>
          <span class="cert-rank-badge">${esc(rankTitle())}</span>
          <div class="cert-student-name">${esc(profile.name)}</div>
          <p style="margin:0;font-size:0.9rem;color:#47585c">با تلاش، کشف شهودی و حل مسئله‌های مساحت لوزی و ذوزنقه، محیط دایره، حجم مکعب‌مستطیل و گنجایش (لیتر و سی‌سی)</p>
        </div>
        ${W() ? W().certHakim('') : ''}
        </div>

        <div class="cert-stats-row">
          <div class="cert-stat"><b>${fa(done)} / ${fa(allTasks.length)}</b><small>تمرین حل‌شده (${fa(pct)}٪)</small></div>
          <div class="cert-stat"><b>${fa(stars)} / ${fa(D.stages.length * 3)}</b><small>ستارهٔ مهارت</small></div>
          <div class="cert-stat"><b>${fa(masteredStages)} / ${fa(D.stages.length)}</b><small>نشان ایستگاه</small></div>
          <div class="cert-stat"><b>🔥 ${fa(profile.bestCombo)}</b><small>رکورد کمبوی پیاپی</small></div>
        </div>

        <h3 style="margin:12px 0 8px;font-size:1rem;color:#142429">فهرست مهارت‌های دهگانهٔ فصل ششم کتاب ریاضی پنجم:</h3>
        <ul class="cert-skills-grid">
          ${D.stages.map((s) => {
            const c = stageSolvedCount(s);
            const full = c === s.tasks.length;
            return `<li class="${full ? 'mastered' : ''}">
              <b>${full ? '☑' : '☐'} ${esc(s.title)}</b> (${esc(s.badge)})<br>
              <small>${esc(s.topic)} — ${fa(c)} از ${fa(s.tasks.length)} تمرین</small>
            </li>`;
          }).join('')}
        </ul>

        <div class="hw-cert-quote"><span class="hw-cert-hakim-face" data-hk-face="happy" aria-hidden="true"></span>
          <p><b>حکیم:</b> ${done === allTasks.length ? 'آفرین معمار کوچک! حالا مساحت لوزی و ذوزنقه، محیط دایره، حجم و گنجایش را مثل یک مهندس حساب می‌کنی.' : 'هر ایستگاهی که کامل شود، یک نشان 🏅 کنار مهارتش می‌نشیند. اول درسنامه، بعد تمرین؛ ادامه بده!'}</p></div>
        <div class="hw-cert-foot">
          <div class="hw-cert-date"><span>تاریخ صدور: <b>${new Date().toLocaleDateString('fa-IR')}</b></span><span>شناسهٔ کارنامه: <b class="ltr">${certCode}</b></span></div>
          ${W() ? W().signature('مهدی شریفیان', 'طراح آموزشی و توسعه‌دهنده · حکیمستان') : '<span>طراحی آموزشی: مهدی شریفیان · حکیمستان</span>'}
        </div>
        <p class="hw-cert-note">این گواهی بر پایهٔ پیشرفت ذخیره‌شده در همین دستگاه صادر شده و مدرک رسمی نیست.</p>
      </article>
    `;

    W()?.bind(main, {});
    $('certBackMap').onclick = renderMap;
    $('btnPrintCert').onclick = () => window.print();
  }

  /* ── Topbar & Global Controls ── */
  if ($('mapNavBtn')) $('mapNavBtn').onclick = renderMap;
  if ($('studioNavBtn')) $('studioNavBtn').onclick = renderStudio;
  if ($('certNavBtn')) $('certNavBtn').onclick = renderCertificate;
  if ($('themeBtn')) {
    $('themeBtn').onclick = () => {
      profile.theme = profile.theme === 'night' ? 'light' : 'night';
      applyPrefs();
      saveState();
    };
  }
  if ($('soundBtn')) {
    $('soundBtn').onclick = () => {
      profile.sound = !profile.sound;
      applyPrefs();
      saveState();
      if (profile.sound) playTone('tap');
    };
  }
  if ($('fontBigger')) {
    $('fontBigger').onclick = () => {
      const steps = [0.92, 1, 1.1, 1.2];
      const idx = Math.min(steps.length - 1, steps.indexOf(profile.scale) + 1);
      profile.scale = steps[idx >= 0 ? idx : 1];
      applyPrefs();
      saveState();
    };
  }
  if ($('fontSmaller')) {
    $('fontSmaller').onclick = () => {
      const steps = [0.92, 1, 1.1, 1.2];
      const idx = Math.max(0, steps.indexOf(profile.scale) - 1);
      profile.scale = steps[idx >= 0 ? idx : 1];
      applyPrefs();
      saveState();
    };
  }
  if ($('helpBtn') && $('helpDialog')) {
    $('helpBtn').onclick = () => $('helpDialog').showModal?.();
  }
  if ($('closeHelpBtn') && $('helpDialog')) {
    $('closeHelpBtn').onclick = () => $('helpDialog').close?.();
  }

  window.addEventListener('pagehide', saveState);
  applyPrefs();
  updateHud();
  const baseHome = renderMap;
  renderMap = function () {
    baseHome();
    const hc = HC();
    if (!hc) return;
    const units = ALL_UNITS();
    const total = units.reduce((n, u) => n + u.tasks.length, 0);
    const done = units.reduce((n, u) => n + u.tasks.filter((x) => profile.done[x.id]?.ok).length, 0);
    const next = units.find((u) => u.tasks.some((x) => !profile.done[x.id]?.ok));
    const fa2 = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
    const msg = done === 0
      ? 'از ایستگاه اول شروع کن؛ اول درسنامه را با دقت ببین، بعد تمرین‌ها را حل کن. هر جا گیر کردی، دکمهٔ راهنما را بزن!'
      : done >= total
        ? 'همهٔ ' + fa2(total) + ' تمرین را حل کرده‌ای! گواهی‌نامه‌ات را چاپ کن و به دوستانت هم یاد بده.'
        : fa2(done) + ' تمرین از ' + fa2(total) + ' را حل کرده‌ای. ادامهٔ سفر: «' + String(next ? next.title : '').replace(/^[^:]*:\s*/, '') + '».';
    hc.decorateHome(main, msg);
  };
  const baseOpenTask = openTask;
  openTask = function (a, b) {
    HC()?.taskStart();
    baseOpenTask(a, b);
  };
  HC()?.mount({ gameId: GAME_ID, music: 'music9.mp3', name: profile.name, intro: "سلام! من حکیمم. در پیمانه‌ستان با هم راز مساحت لوزی و ذوزنقه، محیط دایره و حجم را کشف می‌کنیم. اول درسنامهٔ هر ایستگاه را ببین، بعد سراغ تمرین برو!" });
  renderMap();

  window.PeymanestanApp = {
    getState: () => profile,
    openLesson,
    openTask,
    renderStudio,
    renderCertificate
  };
})();
