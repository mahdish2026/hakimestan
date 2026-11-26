/* آمارستان — موتور تعاملی درسنامه، نمودار خط شکسته، تراز میانگین، چرخندهٔ شانس و گواهی‌نامه */
(function () {
  'use strict';

  const D = window.StatsData;
  const GAME_ID = 'math-stats';
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
  const STORAGE_KEY = 'hakim.stats.v1';
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
      name: 'تحلیل‌گر جوان',
      done: {},
      lessons: {},
      xp: 0,
      combo: 0,
      bestCombo: 0,
      sound: false,
      theme: 'light',
      scale: 1,
      daily: {}
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return defaultState();
      const base = defaultState();
      base.name = String(raw.name || 'تحلیل‌گر جوان').trim().slice(0, 36) || 'تحلیل‌گر جوان';
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
      if (raw.daily && typeof raw.daily === 'object') {
        Object.keys(raw.daily).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-60).forEach((d) => {
          const v = Number(raw.daily[d]);
          if (Number.isInteger(v) && v > 0) base.daily[d] = Math.min(v, allTasks.length);
        });
      }
      return base;
    } catch {
      return defaultState();
    }
  }

  let profile = loadState();
  let view = 'map';
  let si = 0;
  let qi = 0;
  let lessonStep = 0;
  let demoToggle = false;
  let stageStartedAt = Date.now();
  let taskSolved = false;
  let taskGuided = false;
  let taskAttempts = 0;
  let selectedChoice = null;
  let answerDraft = '';
  let labState = {
    points: [2, 3, 4, 4],
    leveled: false,
    slices: ['blue', 'blue', 'green', 'green', 'yellow', 'yellow', 'blue', 'green']
  };
  let studioState = {
    lineVals: [3, 6, 6, 4, 9],
    diceCounts: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
    diceTotal: 0,
    lastRoll: null
  };

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
    if (profile.theme === 'night') document.documentElement.setAttribute('data-theme', 'night');
    else document.documentElement.removeAttribute('data-theme');
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
      const notes = kind === 'win' ? [523.25, 659.25, 783.99] : kind === 'err' ? [250, 210] : [460];
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
    if (pct >= 100) return 'استاد بزرگ آمارستان 👑';
    if (pct >= 70) return 'دانشمند داده و احتمال 🌟';
    if (pct >= 35) return 'ردیاب نمودارها و میانگین 📈';
    return 'کاوشگر نوآموز آمارستان 🌱';
  }

  function updateHud() {
    if ($('hudStars')) $('hudStars').textContent = `⭐ ${fa(totalStars())} / ${fa(D.stages.length * 3)}`;
    if ($('hudXp')) $('hudXp').textContent = `💎 ${fa(profile.xp)} امتیاز`;
    if ($('hudCombo')) {
      $('hudCombo').textContent = `🔥 کمبو: ${fa(profile.combo)} (رکورد: ${fa(profile.bestCombo)})`;
      $('hudCombo').classList.toggle('combo-hot', profile.combo >= 3);
    }
  }

  /* ── SVG Generators ── */
  function svgBrokenLine(points, labels) {
    const lbs = labels || points.map((_, i) => `هفته ${fa(i + 1)}`);
    const maxV = 10;
    const x0 = 60;
    const y0 = 170;
    const w = 290;
    const h = 135;
    const coords = points.map((v, idx) => {
      const x = x0 + (idx * w) / Math.max(1, points.length - 1);
      const y = y0 - (Math.min(maxV, Math.max(0, v)) / maxV) * h;
      return [x, y, v];
    });
    const poly = coords.map(([x, y]) => `${x},${y}`).join(' ');
    return `<svg viewBox="0 0 400 220" role="img" aria-label="نمودار خط شکسته با مقادیر ${points.map(fa).join('، ')}">
      ${[0, 2, 4, 6, 8, 10].map((g) => {
        const yg = y0 - (g / maxV) * h;
        return `<line x1="${x0}" y1="${yg}" x2="${x0 + w}" y2="${yg}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>
          <text x="${x0 - 10}" y="${yg + 4}" text-anchor="end" font-size="11" fill="currentColor">${fa(g)}</text>`;
      }).join('')}
      <line x1="${x0}" y1="26" x2="${x0}" y2="${y0}" stroke="currentColor" stroke-width="2"/>
      <line x1="${x0}" y1="${y0}" x2="${x0 + w}" y2="${y0}" stroke="currentColor" stroke-width="2"/>
      <polyline points="${poly}" fill="none" stroke="#7c3aed" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${coords.map(([x, y, v], idx) => `
        <circle cx="${x}" cy="${y}" r="6" fill="#eab338" stroke="#51389e" stroke-width="2.5"/>
        <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor">${fa(v)}</text>
        <text x="${x}" y="${y0 + 20}" text-anchor="middle" font-size="11" fill="currentColor">${esc(lbs[idx])}</text>
      `).join('')}
    </svg>`;
  }

  function svgLevelTowers(heights, leveled) {
    const sum = heights.reduce((a, b) => a + b, 0);
    const avg = sum / heights.length;
    const shown = leveled ? heights.map(() => avg) : heights;
    const yBase = 172;
    const unitH = 15;
    return `<svg viewBox="0 0 400 215" role="img" aria-label="برج‌های مکعبی با ارتفاع ${shown.map(fa).join('، ')}">
      <line x1="45" y1="${yBase}" x2="355" y2="${yBase}" stroke="currentColor" stroke-width="2.5"/>
      <line x1="45" y1="${yBase - avg * unitH}" x2="355" y2="${yBase - avg * unitH}" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="358" y="${yBase - avg * unitH + 4}" font-size="11" font-weight="800" fill="#dc2626">تراز = ${fa(avg)}</text>
      ${shown.map((val, idx) => {
        const bx = 75 + idx * 72;
        const bh = val * unitH;
        return `<rect x="${bx}" y="${yBase - bh}" width="42" height="${bh}" rx="6" fill="${leveled ? '#10b981' : '#7c3aed'}" fill-opacity="0.78" stroke="currentColor" stroke-width="1.5"/>
          <text x="${bx + 21}" y="${yBase - bh - 7}" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${fa(val)}</text>
          <text x="${bx + 21}" y="${yBase + 18}" text-anchor="middle" font-size="11" fill="currentColor">ستون ${fa(idx + 1)}</text>`;
      }).join('')}
    </svg>`;
  }

  function svgSpinner(slices, angleDeg) {
    const cx = 200;
    const cy = 105;
    const r = 78;
    const colorMap = { blue: '#2563eb', green: '#16a34a', yellow: '#eab308' };
    const labelMap = { blue: 'آبی', green: 'سبز', yellow: 'زرد' };
    const paths = slices.map((col, i) => {
      const a0 = ((i * 45 - 90) * Math.PI) / 180;
      const a1 = (((i + 1) * 45 - 90) * Math.PI) / 180;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const mid = ((i * 45 + 22.5 - 90) * Math.PI) / 180;
      const tx = cx + r * 0.62 * Math.cos(mid);
      const ty = cy + r * 0.62 * Math.sin(mid);
      return `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0,1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${colorMap[col] || '#2563eb'}" stroke="#ffffff" stroke-width="2" data-slice-idx="${i}" style="cursor:pointer"/>
        <text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#ffffff" pointer-events="none">${labelMap[col]}</text>`;
    });
    const bCount = slices.filter((c) => c === 'blue').length;
    const gCount = slices.filter((c) => c === 'green').length;
    const yCount = slices.filter((c) => c === 'yellow').length;
    const rad = (((angleDeg || 0) - 90) * Math.PI) / 180;
    const px = cx + 52 * Math.cos(rad);
    const py = cy + 52 * Math.sin(rad);
    return `<svg viewBox="0 0 400 220" role="img" aria-label="چرخندهٔ ۸قسمتی: ${fa(bCount)} آبی، ${fa(gCount)} سبز، ${fa(yCount)} زرد">
      ${paths.join('')}
      <line x1="${cx}" y1="${cy}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#1e1b4b" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="8" fill="#ffffff" stroke="#1e1b4b" stroke-width="3"/>
      <text x="200" y="206" text-anchor="middle" font-size="12.5" font-weight="800" fill="currentColor">آبی: ${fa(bCount)} قاچ · سبز: ${fa(gCount)} قاچ · زرد: ${fa(yCount)} قاچ</text>
    </svg>`;
  }

  function svgBarsCompare(scaleTwo) {
    const vals = [4, 6, 8];
    const names = ['امیر', 'مانی', 'پویا'];
    const factor = scaleTwo ? 9 : 16;
    return `<svg viewBox="0 0 400 215" role="img" aria-label="مقایسهٔ مقیاس محور عمودی در نمودار ستونی">
      <line x1="65" y1="25" x2="65" y2="172" stroke="currentColor" stroke-width="2"/>
      <line x1="65" y1="172" x2="345" y2="172" stroke="currentColor" stroke-width="2"/>
      ${vals.map((v, i) => {
        const bh = v * factor;
        const bx = 105 + i * 80;
        return `<rect x="${bx}" y="${172 - bh}" width="44" height="${bh}" rx="6" fill="#7c3aed" fill-opacity="0.78"/>
          <text x="${bx + 22}" y="${172 - bh - 6}" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor">${fa(v)}</text>
          <text x="${bx + 22}" y="192" text-anchor="middle" font-size="12" fill="currentColor">${names[i]}</text>`;
      }).join('')}
      <text x="205" y="210" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">${scaleTwo ? 'مقیاس محور مبین (گام ۲تایی — ستون‌ها کوتاه‌تر دیده می‌شوند ولی اعداد یکی‌اند!)' : 'مقیاس محور مانی (گام ۱تایی)'}</text>
    </svg>`;
  }

  function renderDemoVisual(kind, toggled) {
    if (kind === 'bars') return svgBarsCompare(toggled);
    if (kind === 'line') return svgBrokenLine(toggled ? [2, 5, 5, 9] : [2, 3, 6, 4], ['شنبه', 'دوشنبه', 'چهارشنبه', 'جمعه']);
    if (kind === 'level') return svgLevelTowers([3, 7, 4, 6], toggled);
    return svgSpinner(
      toggled
        ? ['blue', 'blue', 'blue', 'blue', 'green', 'green', 'green', 'green']
        : ['blue', 'blue', 'blue', 'blue', 'blue', 'green', 'green', 'yellow'],
      toggled ? 135 : 25
    );
  }

  /* ── Screens ── */
  function renderMap() {
    view = 'map';
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const nextIdx = Math.max(0, D.stages.findIndex((s) => stageSolvedCount(s) < s.tasks.length));

    main.innerHTML = `
      <section class="hero-card${window.AmarWheel ? ' hs-hero' : ''}">
        <div>
          <span class="hero-kicker">فصل هفتم ریاضی پنجم · پوشش ۱۰۰٪ کتاب درسی</span>
          <h2 class="hero-title">به سرزمین <span class="hw-accent">«آمارستان»</span> خوش آمدی!</h2>
          <p class="hero-sub">در ۹ ایستگاه جذاب، اول با درسنامهٔ تصویری و تعاملی راز نمودار خط شکسته، تراز کردن میانگین و چرخنده‌های شانس را کشف کن، بعد مرحله‌به‌مرحله همهٔ تیپ‌سؤال‌های کتاب را فتح کن!</p>
          <div class="hero-actions">
            <button type="button" class="btn-primary" id="btnStartNext">${window.AmarWheel ? '🎡' : '🚀'} ${done === 0 ? (window.AmarWheel ? 'بچرخان؛ شروع از ایستگاه اول' : 'شروع از ایستگاه اول') : done === allTasks.length ? 'مرور ایستگاه‌ها' : 'ادامهٔ مسیر یادگیری'}</button>
            <button type="button" class="btn-soft" id="btnOpenStudio">🛠️ آزمایشگاه آزاد نمودار و دو تاس</button>
            <button type="button" class="btn-gold" id="btnOpenCert">🏆 گواهی‌نامهٔ من</button>
          </div>
        </div>
        ${W() && !window.AmarWheel ? W().art('stats', { chips: ['📊 ' + fa(D.stages.length) + ' ایستگاه', '🎲 ' + fa(allTasks.length) + ' تمرین', '🏅 ' + fa(D.stages.length) + ' نشان'] }) : ''}
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
          <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت کل فصل هفتم">
            <span style="width:${pct}%"></span>
          </div>
        </div>
      </section>

      ${window.AmarWheel ? window.AmarWheel.render(wheelCtx()) : W() ? W().journey(D.stages.map((u, i) => ({ title: u.title, solved: stageSolvedCount(u), total: u.tasks.length, locked: isLocked(i) })), { word: 'ایستگاه', attr: 'data-open-lesson', nextIdx, done, total: allTasks.length }) : ''}

      <section aria-labelledby="stationsHeading">
        <h2 id="stationsHeading" class="hw-section-title" style="margin:0 0 12px;font-size:1.2rem">🗺️ نقشهٔ ۹ ایستگاه فصل هفتم (نمودارها، میانگین و احتمال)</h2>
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

    $('btnStartNext').onclick = () => (window.AmarWheel ? window.AmarWheel.goNext() : openLesson(nextIdx));
    window.AmarWheel?.mount(main, wheelCtx());
    $('btnOpenStudio').onclick = renderStudio;
    $('btnOpenCert').onclick = renderCertificate;
    W()?.bind(main, { cert: renderCertificate });
    $('nameForm').onsubmit = (e) => {
      e.preventDefault();
      profile.name = String($('studentNameInput').value || '').trim().slice(0, 36) || 'تحلیل‌گر جوان';
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
          <button type="button" class="btn-soft" id="sideStudio">🛠️ آزمایشگاه آزاد</button>
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

  // پیوند چرخندهٔ شانس و داشبورد با وضعیت بازی
  function wheelCtx() {
    return {
      stages: D.stages,
      daily: profile.daily,
      guided: () => allTasks.filter((t) => profile.done[t.id]?.ok && profile.done[t.id].guided).length,
      solved: (i) => stageSolvedCount(D.stages[i]),
      stars: (i) => stageStars(D.stages[i]),
      seen: (i) => Boolean(profile.lessons[D.stages[i].id]),
      locked: (i) => isLocked(i),
      openLesson: (i) => openLesson(i),
      openTask: (i) => openTask(i, Math.max(0, D.stages[i].tasks.findIndex((t) => !profile.done[t.id]?.ok))),
      lockedNotice: (i) => lockedNotice(i),
      sound: () => profile.sound
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
      bars: demoToggle ? '↩ نمایش مقیاس ۱به‌۱ مانی' : '🔍 تغییر به مقیاس ۲به‌۲ مبین!',
      line: demoToggle ? '↩ نمودار نمونهٔ اول' : '📈 نمایش روند افزایشی و بدون تغییر!',
      level: demoToggle ? '↩ برگرداندن ستون‌های نابرابر' : '⚖️ هم‌قد کردن برج‌ها و کشف میانگین!',
      spinner: demoToggle ? '↩ چرخندهٔ نابرابر' : '🎡 تبدیل به چرخندهٔ کاملاً عادلانه (۴ آبی، ۴ سبز)!'
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
          <h3 style="margin:0 0 6px">🔑 گام دوم: قانون طلایی و نمونهٔ کتاب درسی</h3>
          <div class="formula-badge">${esc(s.lesson.formula)}</div>
          <p style="margin:8px 0 0">${esc(s.lesson.worked)}</p>
        </div>
        <div class="lesson-visual-box">
          ${renderDemoVisual(s.demoKind, true)}
          <div class="lesson-controls">
            <button type="button" class="btn-soft" id="btnSpeakLesson">🔊 شنیدن قانون و مثال</button>
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
        <button type="button" class="step-pill ${lessonStep === 1 ? 'active' : ''}" data-lstep="1">۲. قانون و مثال کتاب</button>
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
    if (t.labType === 'line') labState.points = [2, 3, 4, 4];
    if (t.labType === 'level') labState.leveled = false;
    if (t.labType === 'spinner') {
      labState.slices = ['blue', 'blue', 'green', 'yellow', 'yellow', 'green', 'blue', 'yellow'];
    }
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
      if (t.labType === 'line') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgBrokenLine(labState.points)}</div>
          ${labState.points.map((v, idx) => `<div class="slider-row"><label for="ptRange${idx}">هفتهٔ ${fa(idx + 1)}: <b id="ptVal${idx}">${fa(v)}</b> سانتی‌متر</label><input id="ptRange${idx}" data-pt-idx="${idx}" type="range" min="0" max="10" value="${v}" ${taskSolved ? 'disabled' : ''}></div>`).join('')}
        </div>`;
      }
      if (t.labType === 'level') {
        return `<div class="workbench">
          <div id="labSvgWrap">${svgLevelTowers(t.initialTowers, labState.leveled)}</div>
          <div class="lesson-controls">
            <button type="button" class="btn-gold" id="btnDoLevel" ${taskSolved ? 'disabled' : ''}>${labState.leveled ? '↩ نمایش حالت اولیه' : '⚖️ تراز کردن مکعب‌ها و هم‌قد کردن برج‌ها!'}</button>
          </div>
        </div>`;
      }
      if (t.labType === 'spinner') {
        return `<div class="workbench">
          <p style="margin:0 0 8px;font-size:0.86rem;text-align:center">روی قاچ‌های چرخنده (یا دکمه‌های زیر) بزن تا رنگشان بین آبی، سبز و زرد عوض شود:</p>
          <div id="labSvgWrap">${svgSpinner(labState.slices, 0)}</div>
          <div class="lesson-controls">
            ${labState.slices.map((col, idx) => `<button type="button" data-cycle-slice="${idx}" style="min-width:44px;padding:4px 8px;font-size:0.78rem" ${taskSolved ? 'disabled' : ''}>قاچ ${fa(idx + 1)}: ${col === 'blue' ? '🔵 آبی' : col === 'green' ? '🟢 سبز' : '🟡 زرد'}</button>`).join('')}
          </div>
        </div>`;
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
          <input id="numAnswerInput" type="text" inputmode="decimal" autocomplete="off" maxlength="16" placeholder="مثلاً ۱۰" value="${esc(answerDraft)}" ${taskSolved ? 'disabled' : ''}>
        </div>
        <div class="mini-keypad" role="group" aria-label="صفحه‌کلید سریع ارقام">
          ${['۱','۲','۳','۴','۵','۶','۷','۸','۹','۰','٫'].map((k) => `<button type="button" data-pad="${k}" ${taskSolved ? 'disabled' : ''}>${k}</button>`).join('')}
          <button type="button" data-pad="back" aria-label="پاک کردن رقم آخر" ${taskSolved ? 'disabled' : ''}>⌫</button>
        </div>
      ` : ''}

      <div id="taskFeedback" class="feedback-box ${feedbackClass || ''}" role="status" aria-live="polite">
        ${feedbackHtml || (profile.done[t.id]?.ok ? '✅ این تمرین را قبلاً حل کرده‌ای؛ می‌توانی دوباره تمرین کنی یا به تمرین بعدی بروی.' : 'پاسخت را آماده کن و دکمهٔ «بررسی پاسخ» را بزن!')}
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

    main.querySelectorAll('[data-pt-idx]').forEach((inp) => {
      inp.oninput = () => {
        const idx = Number(inp.dataset.ptIdx);
        labState.points[idx] = Number(inp.value);
        $(`ptVal${idx}`).textContent = fa(labState.points[idx]);
        $('labSvgWrap').innerHTML = svgBrokenLine(labState.points);
      };
    });

    if ($('btnDoLevel')) {
      $('btnDoLevel').onclick = () => {
        labState.leveled = !labState.leveled;
        playTone('tap');
        drawTask();
      };
    }

    const cycleSlice = (idx) => {
      if (taskSolved) return;
      const order = ['blue', 'green', 'yellow'];
      const cur = labState.slices[idx];
      labState.slices[idx] = order[(order.indexOf(cur) + 1) % order.length];
      drawTask();
    };
    main.querySelectorAll('[data-cycle-slice]').forEach((b) => {
      b.onclick = () => cycleSlice(Number(b.dataset.cycleSlice));
    });
    main.querySelectorAll('[data-slice-idx]').forEach((p) => {
      p.onclick = () => cycleSlice(Number(p.getAttribute('data-slice-idx')));
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
      drawTask('<b>پاسخ عددی‌ات درست است، اما اول ابزار تعاملی بالای سؤال (نمودار / برج‌ها / چرخنده) را مطابق خواستهٔ سؤال تنظیم کن!</b>', 'err');
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
        // دادهٔ نمودار خط شکسته: تمرین‌های تازه‌حل‌شدهٔ هر روز
        const d = new Date();
        const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        profile.daily[day] = (profile.daily[day] || 0) + 1;
      }
      taskSolved = true;
      saveState();
      drawTask(
        `<b>🌟 آفرین دانشمند جوان! کاملاً درست است.</b><br>${esc(t.why)}${profile.combo >= 2 ? `<br><small>🔥 ${fa(profile.combo)} پاسخ درست پیاپی!</small>` : ''}`,
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
    const sumLine = studioState.lineVals.reduce((a, b) => a + b, 0);
    const avgLine = Number((sumLine / studioState.lineVals.length).toFixed(2));
    const maxDiceFreq = Math.max(1, ...Object.values(studioState.diceCounts));

    main.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <h2 style="margin:0">🛠️ آزمایشگاه آزاد نمودار خط شکسته، میانگین و دو تاس</h2>
        <button type="button" class="btn-primary" id="studioBackMap">🗺️ بازگشت به نقشهٔ ایستگاه‌ها</button>
      </div>
      <div class="studio-grid">
        <section class="studio-card">
          <h3 style="margin-top:0">۱) سازندهٔ نمودار خط شکسته و میانگین زنده</h3>
          <div id="stLineSvg">${svgBrokenLine(studioState.lineVals, ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'])}</div>
          ${studioState.lineVals.map((v, i) => `<div class="slider-row"><label for="stLv${i}">روز ${fa(i + 1)}: <b id="stLvLbl${i}">${fa(v)}</b></label><input id="stLv${i}" data-st-lv="${i}" type="range" min="0" max="10" value="${v}"></div>`).join('')}
          <p id="stLineAvg" style="font-weight:800;margin:8px 0 0">مجموع = ${fa(sumLine)} · میانگین ۵ روز = ${fa(avgLine)}</p>
        </section>

        <section class="studio-card">
          <h3 style="margin-top:0">۲) آزمایشگاه مسابقه با جمع دو تاس (صفحهٔ ۱۹۵ کتاب)</h3>
          <p style="font-size:0.86rem;color:var(--muted);margin-top:0">ببین چرا در بازی کتاب، جمع دو تاس روی عدد <b>۷</b> بیشترین فراوانی را پیدا می‌کند!</p>
          <div class="lesson-controls" style="margin-bottom:12px">
            <button type="button" class="btn-primary" data-roll-dice="1">🎲 ۱ بار پرتاب</button>
            <button type="button" class="btn-soft" data-roll-dice="20">🎲 ۲۰ بار پرتاب</button>
            <button type="button" class="btn-gold" data-roll-dice="100">🚀 ۱۰۰ بار پرتاب سریع</button>
            <button type="button" id="btnResetDice">↺ صفر کردن</button>
          </div>
          <p style="text-align:center;font-weight:800;margin:6px 0">تعداد کل پرتاب‌ها: ${fa(studioState.diceTotal)} ${studioState.lastRoll ? `· آخرین جمع: ${fa(studioState.lastRoll)}` : ''}</p>
          <div style="display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:4px;align-items:end;height:130px;padding-top:12px;border-bottom:2px solid var(--line)">
            ${[2,3,4,5,6,7,8,9,10,11,12].map((sumVal) => {
              const cnt = studioState.diceCounts[sumVal] || 0;
              const hPct = Math.round((cnt / maxDiceFreq) * 95);
              return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                <small style="font-size:0.7rem;font-weight:800">${fa(cnt)}</small>
                <div style="width:100%;height:${Math.max(4, hPct)}px;background:${sumVal === 7 ? 'var(--gold)' : 'var(--primary)'};border-radius:4px 4px 0 0"></div>
              </div>`;
            }).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:4px;text-align:center;font-size:0.75rem;font-weight:800;margin-top:4px">
            ${[2,3,4,5,6,7,8,9,10,11,12].map((sVal) => `<span>${fa(sVal)}</span>`).join('')}
          </div>
        </section>
      </div>
    `;

    $('studioBackMap').onclick = renderMap;
    main.querySelectorAll('[data-st-lv]').forEach((inp) => {
      inp.oninput = () => {
        const idx = Number(inp.dataset.stLv);
        studioState.lineVals[idx] = Number(inp.value);
        $(`stLvLbl${idx}`).textContent = fa(studioState.lineVals[idx]);
        $('stLineSvg').innerHTML = svgBrokenLine(studioState.lineVals, ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه']);
        const sm = studioState.lineVals.reduce((a, b) => a + b, 0);
        $('stLineAvg').textContent = `مجموع = ${fa(sm)} · میانگین ۵ روز = ${fa(Number((sm / 5).toFixed(2)))}`;
      };
    });

    main.querySelectorAll('[data-roll-dice]').forEach((b) => {
      b.onclick = () => {
        const times = Number(b.dataset.rollDice);
        for (let i = 0; i < times; i++) {
          const d1 = 1 + Math.floor(Math.random() * 6);
          const d2 = 1 + Math.floor(Math.random() * 6);
          studioState.lastRoll = d1 + d2;
          studioState.diceCounts[studioState.lastRoll] += 1;
          studioState.diceTotal += 1;
        }
        playTone('tap');
        renderStudio();
      };
    });

    $('btnResetDice').onclick = () => {
      for (let k = 2; k <= 12; k++) studioState.diceCounts[k] = 0;
      studioState.diceTotal = 0;
      studioState.lastRoll = null;
      renderStudio();
    };
  }

  /* ── Certificate ── */
  function renderCertificate() {
    view = 'cert';
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const stars = totalStars();
    const masteredStages = D.stages.filter((s) => stageSolvedCount(s) === s.tasks.length).length;
    const certCode = `HK-M7-${fa(done)}-${fa(stars)}`;

    main.innerHTML = `
      <div class="action-row no-print" style="justify-content:space-between;margin-bottom:16px">
        <button type="button" id="certBackMap">🗺️ بازگشت به نقشهٔ سفر</button>
        <button type="button" class="btn-primary" id="btnPrintCert">🖨️ چاپ استاندارد A4 / ذخیرهٔ PDF</button>
      </div>

      <article class="cert-sheet hw-cert hk-tazhib" aria-label="گواهی‌نامهٔ مهارت آمارستان">
        <div class="hw-cert-top">
        ${W() ? W().seal('آمارستان', done === allTasks.length ? 'مهر استادی' : 'مهر پیشرفت') : ''}
        <div class="cert-header">
          <div style="font-size:0.85rem;font-weight:800;color:#524b69">حکیمستان · مدرسهٔ ریاضی پایهٔ پنجم دبستان</div>
          <h2 style="margin:6px 0;font-size:1.55rem;color:#1c1830">${done === allTasks.length ? 'گواهی‌نامهٔ استادی کامل فصل هفتم (آمارستان)' : 'گواهی‌نامهٔ پیشرفت یادگیری فصل هفتم (آمارستان)'}</h2>
          <span class="cert-rank-badge">${esc(rankTitle())}</span>
          <div class="cert-student-name">${esc(profile.name)}</div>
          <p style="margin:0;font-size:0.9rem;color:#524b69">با تلاش، تحلیل داده‌ها و حل تمرین‌های جدول آماری، نمودار خط شکسته، میانگین و احتمال</p>
        </div>
        ${W() ? W().certHakim('') : ''}
        </div>

        <div class="cert-stats-row">
          <div class="cert-stat"><b>${fa(done)} / ${fa(allTasks.length)}</b><small>تمرین حل‌شده (${fa(pct)}٪)</small></div>
          <div class="cert-stat"><b>${fa(stars)} / ${fa(D.stages.length * 3)}</b><small>ستارهٔ مهارت</small></div>
          <div class="cert-stat"><b>${fa(masteredStages)} / ${fa(D.stages.length)}</b><small>نشان ایستگاه</small></div>
          <div class="cert-stat"><b>🔥 ${fa(profile.bestCombo)}</b><small>رکورد کمبوی پیاپی</small></div>
        </div>

        <h3 style="margin:12px 0 8px;font-size:1rem;color:#1c1830">فهرست مهارت‌های نه‌گانهٔ فصل هفتم کتاب ریاضی پنجم:</h3>
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
          <p><b>حکیم:</b> ${done === allTasks.length ? 'آفرین آمارشناس کوچک! جدول، نمودار خط شکسته، میانگین و احتمال را خوب یاد گرفتی.' : 'هر ایستگاهی که کامل شود، یک نشان 🏅 کنار مهارتش می‌نشیند. اول درسنامه، بعد تمرین؛ ادامه بده!'}</p></div>
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
  if ($('helpBtn') && $('helpDialog')) $('helpBtn').onclick = () => $('helpDialog').showModal?.();
  if ($('closeHelpBtn') && $('helpDialog')) $('closeHelpBtn').onclick = () => $('helpDialog').close?.();

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
  HC()?.mount({ gameId: GAME_ID, music: 'music7.mp3', name: profile.name, intro: "سلام! من حکیمم. در آمارستان یاد می‌گیریم داده‌ها را بخوانیم، نمودار بکشیم، میانگین بگیریم و شانس را بسنجیم. آماده‌ای؟" });
  renderMap();

  window.AmarestanApp = {
    getState: () => profile,
    openLesson,
    openTask,
    renderStudio,
    renderCertificate
  };
})();
