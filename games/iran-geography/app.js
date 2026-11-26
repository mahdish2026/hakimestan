/* ایران‌گرد کوچک — موتور نقشهٔ تعاملی ایران، اطلس آزاد و ۳۶ چالش مطالعات اجتماعی پنجم */
(function () {
  'use strict';

  const D = window.IranGeoData;
  const GAME_ID = 'iran-geography';
  const HC = () => window.HakimCompanion || null;
  const ALL_UNITS = () => D.missions;
  function companionAfterSolve(unit) {
    const hc = HC();
    if (!hc) return;
    const solvedHere = unit.tasks.filter((x) => profile.done[x.id]?.ok).length;
    if (solvedHere === unit.tasks.length) {
      const perfect = unit.tasks.every((x) => profile.done[x.id]?.ok && !profile.done[x.id].guided);
      const allDone = ALL_UNITS().every((u) => u.tasks.every((x) => profile.done[x.id]?.ok));
      if (allDone) hc.finish('شگفت‌انگیز بود ' + profile.name + '! همهٔ تمرین‌ها را حل کردی؛ گواهی‌نامه‌ات آماده است 🏆');
      else hc.stageDone(unit.title, perfect);
      reportUnit(unit);
    }
  }
  function reportUnit(unit) {
    const hc = HC();
    if (!hc) return;
    const solved = unit.tasks.filter((x) => profile.done[x.id]?.ok).length;
    const guided = unit.tasks.filter((x) => profile.done[x.id]?.guided).length;
    const stars = solved === unit.tasks.length ? (guided === 0 ? 3 : guided <= 2 ? 2 : 1) : solved > 0 ? 1 : 0;
    hc.reportStage({ gameId: GAME_ID, name: profile.name, stage: unit.title, stageId: unit.id, solved, total: unit.tasks.length, stars, guided, xp: profile.xp, durationSec: (Date.now() - stageStartedAt) / 1000, startedAt: stageStartedAt });
  }
  const STORAGE_KEY = 'hakim.irangeo.v1';
  const $ = (id) => document.getElementById(id);
  const main = $('main');

  const fa = (v) => String(v ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const allTasks = D.missions.flatMap((m) => m.tasks);

  function defaultState() {
    return {
      version: 1,
      name: 'ایران‌گرد جوان',
      done: {},
      lessons: {},
      xp: 0,
      combo: 0,
      bestCombo: 0,
      sound: false,
      theme: 'light',
      scale: 1
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return defaultState();
      const base = defaultState();
      base.name = String(raw.name || 'ایران‌گرد جوان').trim().slice(0, 36) || 'ایران‌گرد جوان';
      if (raw.done && typeof raw.done === 'object') {
        for (const t of allTasks) {
          if (raw.done[t.id]?.ok) base.done[t.id] = { ok: true, guided: Boolean(raw.done[t.id].guided) };
        }
      }
      if (raw.lessons && typeof raw.lessons === 'object') {
        for (const m of D.missions) {
          if (raw.lessons[m.id]) base.lessons[m.id] = true;
        }
      }
      base.xp = Number.isFinite(raw.xp) ? Math.max(0, Math.round(raw.xp)) : 0;
      base.bestCombo = Number.isFinite(raw.bestCombo) ? Math.max(0, Math.round(raw.bestCombo)) : 0;
      base.sound = Boolean(raw.sound);
      base.theme = raw.theme === 'night' ? 'night' : 'light';
      base.scale = [0.92, 1, 1.1, 1.2].includes(raw.scale) ? raw.scale : 1;
      return base;
    } catch {
      return defaultState();
    }
  }

  let profile = loadState();
  let mi = 0;
  let qi = 0;
  let stageStartedAt = Date.now();
  let selectedPin = null;
  let selectedChoice = null;
  let atlasSelectedPin = 'tehran';
  let taskSolved = false;
  let taskGuided = false;
  let taskAttempts = 0;

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
      const notes = kind === 'win' ? [523.25, 659.25, 783.99] : kind === 'err' ? [250, 200] : [450];
      notes.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.06, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.16);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.17);
      });
    } catch {}
  }

  function speakText(txt) {
    try {
      if (window.speechSynthesis && txt) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = 'fa-IR';
        u.rate = 0.94;
        window.speechSynthesis.speak(u);
      }
    } catch {}
  }

  function missionSolved(m) {
    return m.tasks.filter((t) => profile.done[t.id]?.ok).length;
  }
  function totalSolved() {
    return allTasks.filter((t) => profile.done[t.id]?.ok).length;
  }
  function missionStars(m) {
    const s = missionSolved(m);
    if (s === m.tasks.length) return 3;
    if (s >= 4) return 2;
    if (s >= 1) return 1;
    return 0;
  }
  function totalStars() {
    return D.missions.reduce((a, m) => a + missionStars(m), 0);
  }
  function rankTitle() {
    const pct = (totalSolved() / allTasks.length) * 100;
    if (pct >= 100) return 'جهان‌دیده و ایران‌شناس بزرگ 👑';
    if (pct >= 70) return 'نقشه‌خوان ماهر ایران 🌟';
    if (pct >= 35) return 'رهنورد البرز و زاگرس 🧭';
    return 'مسافر تازه‌نفس ایران 🌱';
  }

  function updateHud() {
    if ($('hudStars')) $('hudStars').textContent = `⭐ ${fa(totalStars())} / ${fa(D.missions.length * 3)}`;
    if ($('hudXp')) $('hudXp').textContent = `💎 ${fa(profile.xp)} امتیاز`;
    if ($('hudCombo')) $('hudCombo').textContent = `🔥 کمبو: ${fa(profile.combo)} (رکورد: ${fa(profile.bestCombo)})`;
  }

  function renderIranSvg(activePinId, hideLabels) {
    const pinColor = (kind) => {
      if (kind === 'sea') return '#0284c7';
      if (kind === 'neighbor') return '#7c3aed';
      if (kind === 'desert') return '#d97706';
      if (kind === 'port') return '#0d9488';
      return '#0f766e';
    };

    const G = window.IranGeoMap;
    const pins = D.mapPins.map((p) => {
      const isSel = activePinId === p.id;
      const lbl = p.label || p.name;
      return `<g class="map-pin ${isSel ? 'selected' : ''}" data-pin-id="${p.id}">
          <circle cx="${p.x}" cy="${p.y}" r="${isSel ? 10 : 7}" fill="${isSel ? '#dc2626' : pinColor(p.kind)}" stroke="#ffffff" stroke-width="2"/>
          ${!hideLabels ? `<text class="pin-label" x="${p.x}" y="${p.y - 11}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#132826" paint-order="stroke" stroke="#ffffff" stroke-width="3" stroke-linejoin="round">${esc(lbl)}</text>` : ''}
        </g>`;
    }).join('');
    if (!G) {
      return `<svg viewBox="0 0 520 400" role="img" aria-label="نقشهٔ تعاملی ایران"><rect width="520" height="400" rx="16" fill="#e0f2fe"/>${pins}</svg>`;
    }
    const featLabel = (x, y, txt, color) => (hideLabels ? '' : `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" font-weight="700" fill="${color}" opacity="0.85" paint-order="stroke" stroke="#ffffff" stroke-width="2.5">${txt}</text>`);
    return `<svg viewBox="0 0 ${G.W} ${G.H}" role="img" aria-label="نقشهٔ تعاملی جغرافیای ایران، دریاها، شهرها و همسایگان">
      <defs>
        <linearGradient id="igSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdeefc"/><stop offset="1" stop-color="#a5dcf5"/></linearGradient>
        <linearGradient id="igLand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcfce7"/><stop offset="1" stop-color="#bbf7d0"/></linearGradient>
        <pattern id="igSand" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fde68a"/><circle cx="2" cy="2" r="0.9" fill="#d97706" opacity="0.45"/></pattern>
        <filter id="igShadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0d6859" flood-opacity="0.28"/></filter>
      </defs>
      <rect width="${G.W}" height="${G.H}" fill="url(#igSea)"/>
      <path d="${G.neighbors}" fill="#f5eedd" stroke="#c4b393" stroke-width="0.8" stroke-linejoin="round"/>
      <path d="${G.iran}" fill="url(#igLand)" stroke="#0d6859" stroke-width="2.4" stroke-linejoin="round" filter="url(#igShadow)"/>
      <ellipse cx="${G.kavir[0]}" cy="${G.kavir[1]}" rx="40" ry="19" fill="url(#igSand)" opacity="0.8"/>
      <ellipse cx="${G.lut[0]}" cy="${G.lut[1]}" rx="24" ry="34" fill="url(#igSand)" opacity="0.8"/>
      <polyline points="${G.alborz}" fill="none" stroke="#92400e" stroke-width="4.5" stroke-dasharray="1.5 5" stroke-linecap="round" opacity="0.7"/>
      <polyline points="${G.zagros}" fill="none" stroke="#92400e" stroke-width="4.5" stroke-dasharray="1.5 5" stroke-linecap="round" opacity="0.7"/>
      <polyline points="${G.karun}" fill="none" stroke="#0284c7" stroke-width="2.4" stroke-linecap="round"/>
      <polyline points="${G.zayandeh}" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round"/>
      <polyline points="${G.sefidrud}" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round"/>
      <polyline points="${G.aras}" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round"/>
      ${featLabel(G.kavir[0], G.kavir[1] + 3, 'دشت کویر', '#92400e')}
      ${featLabel(300, 120, 'البرز', '#78350f')}
      ${featLabel(205, 188, 'زاگرس', '#78350f')}
      ${pins}
    </svg>`;
  }

  function renderHome() {
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const nextIdx = Math.max(0, D.missions.findIndex((m) => missionSolved(m) < m.tasks.length));

    main.innerHTML = `
      <section class="hero-card">
        <div>
          <span class="hero-kicker">مطالعات اجتماعی پایهٔ پنجم · فصل‌های ۲ و ۳ (درس‌های ۵ تا ۱۱)</span>
          <h2 class="hero-title">به «ایران‌گرد کوچک» خوش آمدی!</h2>
          <p class="hero-sub">روی نقشهٔ زندهٔ ایران سفر کن! جمعیت و اقلیم، دریای خزر و خلیج فارس، رود کارون و زاینده‌رود، قطب‌های صنعتی، بندر چابهار و کشورهای همسایهٔ ایران را با بازی و کاوش یاد بگیر.</p>
          <div class="hero-actions">
            <button type="button" class="btn-primary" id="btnStartNext">🧭 ${done === 0 ? 'شروع مأموریت اول' : 'ادامهٔ ایران‌گردی'}</button>
            <button type="button" class="btn-soft" id="btnOpenAtlas">🗺️ اطلس آزاد ایران‌شناسی</button>
            <button type="button" class="btn-gold" id="btnOpenCert">🏆 گواهی‌نامهٔ من</button>
          </div>
        </div>
        <div class="iran-map-box" aria-hidden="true" style="margin:0">
          ${renderIranSvg('tehran', false)}
        </div>
      </section>

      <section class="profile-bar" aria-label="پروفایل ایران‌گرد کوچک">
        <form class="profile-form" id="nameForm">
          <label for="studentNameInput"><b>نام ایران‌گرد:</b></label>
          <input id="studentNameInput" type="text" maxlength="36" value="${esc(profile.name)}" autocomplete="off">
          <button type="submit" class="btn-soft">ثبت نام</button>
        </form>
        <div class="progress-meter-wrap">
          <div class="progress-meter-label">
            <span>رتبه: ${esc(rankTitle())}</span>
            <span>${fa(done)} از ${fa(allTasks.length)} مأموریت‌سؤال (${fa(pct)}٪)</span>
          </div>
          <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت کل ایران‌گرد کوچک">
            <span style="width:${pct}%"></span>
          </div>
        </div>
      </section>

      <section aria-labelledby="missionsHeading">
        <h2 id="missionsHeading" style="margin:0 0 12px;font-size:1.2rem">🗺️ شش مأموریت جغرافیای ایران (درس‌های ۵ تا ۱۱ کتاب)</h2>
        <div class="missions-grid">
          ${D.missions.map((m, idx) => {
            const s = missionSolved(m);
            const st = missionStars(m);
            const full = s === m.tasks.length;
            return `<article class="mission-card ${full ? 'done' : ''}">
              <div class="mission-top">
                <span class="mission-icon" aria-hidden="true">${m.icon}</span>
                <span class="mission-stars" aria-label="${fa(st)} از ۳ ستاره">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
              </div>
              <h3 style="margin:0;font-size:1.05rem">${esc(m.title)}</h3>
              <p style="margin:0;font-size:0.84rem;color:var(--muted)">${esc(m.subtitle)}</p>
              <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px dashed var(--line)">
                <small><b>${fa(s)} / ${fa(m.tasks.length)}</b> چالش</small>
                <div style="display:flex;gap:6px">
                  <button type="button" class="btn-soft" data-lesson="${idx}">📖 مرور درس</button>
                  <button type="button" class="btn-primary" data-play="${idx}">${full ? 'مرور' : 'شروع ←'}</button>
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>
    `;

    $('btnStartNext').onclick = () => openLesson(nextIdx);
    $('btnOpenAtlas').onclick = renderAtlas;
    $('btnOpenCert').onclick = renderCertificate;
    $('nameForm').onsubmit = (e) => {
      e.preventDefault();
      profile.name = String($('studentNameInput').value || '').trim().slice(0, 36) || 'ایران‌گرد جوان';
      HC()?.setName(profile.name);
      saveState();
      renderHome();
    };
    main.querySelectorAll('[data-lesson]').forEach((b) => {
      b.onclick = () => openLesson(Number(b.dataset.lesson));
    });
    main.querySelectorAll('[data-play]').forEach((b) => {
      b.onclick = () => openTask(Number(b.dataset.play), 0);
    });
  }

  function openLesson(idx) {
    mi = idx;
    stageStartedAt = Date.now();
    const m = D.missions[mi];
    profile.lessons[m.id] = true;
    saveState();

    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <div>
            <small style="color:var(--muted)">درسنامهٔ سفر · مأموریت ${fa(mi + 1)}</small>
            <h2 style="margin:2px 0 0">${esc(m.title)}</h2>
          </div>
          <button type="button" id="btnBackHome">🗺️ بازگشت به مأموریت‌ها</button>
        </div>
        <div style="background:var(--primary-soft);border-right:4px solid var(--primary);padding:14px 16px;border-radius:14px;margin-bottom:14px">
          <p style="margin:0">${esc(m.summary)}</p>
        </div>
        <div class="iran-map-box">
          ${renderIranSvg('tehran', false)}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="button" class="btn-primary" id="btnGoTasks">🎯 آماده‌ام! شروع ۶ چالش مأموریت ←</button>
          <button type="button" class="btn-soft" id="btnSpeakLesson">🔊 شنیدن خلاصهٔ درس</button>
        </div>
      </div>
    `;

    $('btnBackHome').onclick = renderHome;
    $('btnSpeakLesson').onclick = () => speakText(m.summary);
    $('btnGoTasks').onclick = () => {
      const firstOpen = Math.max(0, m.tasks.findIndex((t) => !profile.done[t.id]?.ok));
      openTask(mi, firstOpen);
    };
  }

  function openTask(missionIdx, taskIdx) {
    mi = missionIdx;
    qi = taskIdx;
    selectedPin = null;
    selectedChoice = null;
    taskSolved = false;
    taskGuided = false;
    taskAttempts = 0;
    drawTask();
  }

  function drawTask(fbHtml, fbClass) {
    const m = D.missions[mi];
    const t = m.tasks[qi];
    const selPinObj = D.mapPins.find((p) => p.id === selectedPin);

    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <small style="color:var(--muted)">${esc(m.title)} · سؤال ${fa(qi + 1)} از ${fa(m.tasks.length)}</small>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn-soft" id="btnToLesson">📖 مرور درس</button>
            <button type="button" id="btnToHome">🗺️ مأموریت‌ها</button>
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${m.tasks.map((item, idx) => `<button type="button" data-qjump="${idx}" style="min-width:44px;padding:4px 10px;font-size:0.82rem;${idx === qi ? 'background:var(--primary);color:var(--on-primary);border-color:var(--primary)' : ''}">${profile.done[item.id]?.ok ? '✓ ' : ''}${fa(idx + 1)}</button>`).join('')}
        </div>

        <div style="background:var(--surface-soft);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:0.8rem;font-weight:800;color:var(--primary)">${t.kind === 'map' ? '📍 مأموریت مکان‌یابی روی نقشهٔ ایران' : '🧠 پرسش مفهومی مطالعات اجتماعی'}</span>
            <button type="button" class="btn-soft" id="btnSpeakQ" style="min-height:36px;padding:4px 10px;font-size:0.8rem">🔊 خواندن سؤال</button>
          </div>
          <h2 style="margin:6px 0 0;font-size:1.1rem">${esc(t.prompt)}</h2>
        </div>

        ${t.kind === 'map' ? `
          <div class="iran-map-box">
            ${renderIranSvg(selectedPin, true)}
            <p style="margin:8px 0 4px;font-size:0.88rem;font-weight:800">
              ${selPinObj ? `مکان انتخابی تو: <span style="color:var(--primary)">${esc(selPinObj.name)}</span>` : 'روی نقطهٔ درست در نقشه (یا از دکمه‌های زیر) کلیک کن:'}
            </p>
            <div class="pin-buttons-bar" role="group" aria-label="فهرست مکان‌های نقشه برای انتخاب با صفحه‌کلید یا لمس">
              ${D.mapPins.map((p) => `<button type="button" class="pin-btn" data-select-pin="${p.id}" aria-pressed="${selectedPin === p.id}" ${taskSolved ? 'disabled' : ''}>${esc(p.name)}</button>`).join('')}
            </div>
          </div>
        ` : `
          <div class="choices-grid" role="group" aria-label="گزینه‌های پاسخ">
            ${t.options.map((opt, idx) => `<button type="button" class="choice-btn" data-choice="${idx}" aria-pressed="${selectedChoice === idx}" ${taskSolved ? 'disabled' : ''}>${fa(idx + 1)}) ${esc(opt)}</button>`).join('')}
          </div>
        `}

        <div id="taskFb" class="feedback-box ${fbClass || ''}" role="status" aria-live="polite">
          ${fbHtml || 'انتخابت را انجام بده و «بررسی پاسخ» را بزن!'}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="button" class="btn-primary" id="btnCheck" ${taskSolved ? 'disabled' : ''}>✓ بررسی پاسخ</button>
          <button type="button" class="btn-soft" id="btnHint" ${taskSolved ? 'disabled' : ''}>💡 راهنمای قطب‌نما</button>
          ${taskSolved ? `<button type="button" class="btn-gold" id="btnNext">${qi < m.tasks.length - 1 ? 'سؤال بعدی ←' : mi < D.missions.length - 1 ? '🎉 مأموریت بعدی ←' : '🏆 دریافت گواهی‌نامهٔ ایران‌گردی!'}</button>` : ''}
        </div>
      </div>
    `;

    $('btnToLesson').onclick = () => openLesson(mi);
    $('btnToHome').onclick = renderHome;
    $('btnSpeakQ').onclick = () => speakText(t.prompt);
    main.querySelectorAll('[data-qjump]').forEach((b) => {
      b.onclick = () => openTask(mi, Number(b.dataset.qjump));
    });

    const selectPinFn = (pinId) => {
      if (taskSolved) return;
      selectedPin = pinId;
      playTone('tap');
      drawTask();
    };
    main.querySelectorAll('[data-pin-id]').forEach((g) => {
      g.onclick = () => selectPinFn(g.getAttribute('data-pin-id'));
    });
    main.querySelectorAll('[data-select-pin]').forEach((b) => {
      b.onclick = () => selectPinFn(b.dataset.selectPin);
    });

    main.querySelectorAll('[data-choice]').forEach((b) => {
      b.onclick = () => {
        selectedChoice = Number(b.dataset.choice);
        drawTask();
      };
    });

    $('btnHint').onclick = () => {
      taskGuided = true;
      $('taskFb').className = 'feedback-box';
      $('taskFb').innerHTML = `<b>🧭 راهنمای قطب‌نما:</b> ${esc(t.hint)}`;
    };

    $('btnCheck').onclick = () => {
      if (t.kind === 'map' && !selectedPin) {
        drawTask('<b>ابتدا یک نقطه را روی نقشهٔ ایران انتخاب کن!</b>', 'err');
        return;
      }
      if (t.kind === 'choice' && selectedChoice === null) {
        drawTask('<b>ابتدا یکی از گزینه‌ها را انتخاب کن!</b>', 'err');
        return;
      }
      taskAttempts++;
      const isOk = t.kind === 'map' ? selectedPin === t.targetPin : selectedChoice === t.answer;
      const userAnswerText =
        t.kind === 'map'
          ? (D.mapPins.find((p) => p.id === selectedPin)?.name || selectedPin)
          : t.options[selectedChoice];
      const correctText =
        t.kind === 'map'
          ? (D.mapPins.find((p) => p.id === t.targetPin)?.name || t.targetPin)
          : t.options[t.answer];

      HC()?.reportAnswer({
        gameId: GAME_ID,
        name: profile.name,
        stage: m.title,
        questionId: t.id,
        questionNum: qi + 1,
        questionText: t.prompt,
        studentAnswer: userAnswerText,
        correctAnswer: correctText,
        isCorrect: isOk,
        attempts: taskAttempts
      });
      HC()?.answer(isOk);

      if (isOk) {
        playTone('win');
        const already = Boolean(profile.done[t.id]?.ok);
        profile.done[t.id] = { ok: true, guided: already ? profile.done[t.id].guided : taskGuided };
        profile.combo += 1;
        if (profile.combo > profile.bestCombo) profile.bestCombo = profile.combo;
        if (!already) profile.xp += taskGuided ? 15 : 25 + Math.min(15, profile.combo * 3);
        taskSolved = true;
        saveState();
        drawTask(`<b>🌟 آفرین ایران‌گرد کوچک! کاملاً درست است.</b><br>${esc(t.why)}`, 'ok');
        companionAfterSolve(m);
      } else {
        playTone('err');
        profile.combo = 0;
        saveState();
        drawTask(`<b>🧭 نزدیک شدی! به این نشانه توجه کن:</b><br>${esc(t.hint)}`, 'err');
      }
    };

    if ($('btnNext')) {
      $('btnNext').onclick = () => {
        if (qi < m.tasks.length - 1) {
          openTask(mi, qi + 1);
        } else {
          reportUnit(m);
          if (mi < D.missions.length - 1) openLesson(mi + 1);
          else renderCertificate();
        }
      };
    }
  }

  function renderAtlas() {
    const active = D.mapPins.find((p) => p.id === atlasSelectedPin) || D.mapPins[0];
    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <h2 style="margin:0">🗺️ اطلس آزاد ایران‌شناسی (کاوش آزاد روی نقشه)</h2>
          <button type="button" class="btn-primary" id="atlasBack">🗺️ بازگشت به مأموریت‌ها</button>
        </div>
        <p style="margin-top:0;color:var(--muted)">روی هر شهر، دریا، بیابان، بندر یا کشور همسایه کلیک کن تا شناسنامهٔ جغرافیایی آن باز شود:</p>
        <div class="iran-map-box">
          ${renderIranSvg(active.id, false)}
          <div class="pin-buttons-bar" style="margin-top:12px">
            ${D.mapPins.map((p) => `<button type="button" class="pin-btn" data-atlas-pin="${p.id}" aria-pressed="${active.id === p.id}">${esc(p.name)}</button>`).join('')}
          </div>
        </div>
        <div class="feedback-box ok" style="margin-top:14px">
          <h3 style="margin:0 0 6px">📍 ${esc(active.name)}</h3>
          <p style="margin:0">${esc(active.info)}</p>
        </div>
      </div>
    `;

    $('atlasBack').onclick = renderHome;
    const pick = (id) => {
      atlasSelectedPin = id;
      playTone('tap');
      renderAtlas();
    };
    main.querySelectorAll('[data-pin-id]').forEach((g) => {
      g.onclick = () => pick(g.getAttribute('data-pin-id'));
    });
    main.querySelectorAll('[data-atlas-pin]').forEach((b) => {
      b.onclick = () => pick(b.dataset.atlasPin);
    });
  }

  function renderCertificate() {
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const stars = totalStars();
    main.innerHTML = `
      <div class="no-print" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <button type="button" id="certBack">🗺️ بازگشت به مأموریت‌ها</button>
        <button type="button" class="btn-primary" id="btnPrintCert">🖨️ چاپ استاندارد A4 / ذخیرهٔ PDF</button>
      </div>
      <article class="cert-sheet" aria-label="گواهی‌نامهٔ ایران‌گرد کوچک">
        <div style="text-align:center;border-bottom:2px dashed #c7dedb;padding-bottom:14px;margin-bottom:16px">
          <div style="font-size:0.85rem;font-weight:800;color:#46615e">حکیمستان · مطالعات اجتماعی پایهٔ پنجم دبستان</div>
          <h2 style="margin:6px 0;font-size:1.55rem">گواهی‌نامهٔ مهارت جغرافیای ایران («ایران‌گرد کوچک»)</h2>
          <div style="font-size:1.65rem;font-weight:900;color:#0d6859;margin:8px 0">${esc(profile.name)}</div>
          <div>رتبه: <b>${esc(rankTitle())}</b> · ستاره: <b>${fa(stars)} / ${fa(D.missions.length * 3)}</b> · پیشرفت: <b>${fa(pct)}٪</b></div>
        </div>
        <h3 style="margin:0 0 8px;font-size:1rem">فهرست مهارت‌های شش‌گانهٔ جغرافیای ایران (درس‌های ۵ تا ۱۱):</h3>
        <ul class="cert-skills-grid">
          ${D.missions.map((m) => {
            const s = missionSolved(m);
            const full = s === m.tasks.length;
            return `<li class="${full ? 'mastered' : ''}"><b>${full ? '☑' : '☐'} ${esc(m.title)}</b><br><small>${fa(s)} از ${fa(m.tasks.length)} چالش (${esc(m.badge)})</small></li>`;
          }).join('')}
        </ul>
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid #c7dedb;padding-top:10px;font-size:0.82rem;color:#46615e">
          <span>تاریخ صدور: ${new Date().toLocaleDateString('fa-IR')}</span>
          <span>طراحی آموزشی: مهدی شریفیان · حکیمستان</span>
        </div>
      </article>
    `;
    $('certBack').onclick = renderHome;
    $('btnPrintCert').onclick = () => window.print();
  }

  if ($('mapNavBtn')) $('mapNavBtn').onclick = renderHome;
  if ($('atlasNavBtn')) $('atlasNavBtn').onclick = renderAtlas;
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
      profile.scale = steps[Math.min(steps.length - 1, steps.indexOf(profile.scale) + 1)];
      applyPrefs();
      saveState();
    };
  }
  if ($('fontSmaller')) {
    $('fontSmaller').onclick = () => {
      const steps = [0.92, 1, 1.1, 1.2];
      profile.scale = steps[Math.max(0, steps.indexOf(profile.scale) - 1)];
      applyPrefs();
      saveState();
    };
  }
  if ($('helpBtn') && $('helpDialog')) $('helpBtn').onclick = () => $('helpDialog').showModal?.();
  if ($('closeHelpBtn') && $('helpDialog')) $('closeHelpBtn').onclick = () => $('helpDialog').close?.();

  window.addEventListener('pagehide', saveState);
  applyPrefs();
  updateHud();
  const baseHome = renderHome;
  renderHome = function () {
    baseHome();
    const hc = HC();
    if (!hc) return;
    const units = ALL_UNITS();
    const total = units.reduce((n, u) => n + u.tasks.length, 0);
    const done = units.reduce((n, u) => n + u.tasks.filter((x) => profile.done[x.id]?.ok).length, 0);
    const next = units.find((u) => u.tasks.some((x) => !profile.done[x.id]?.ok));
    const fa2 = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
    const msg = done === 0
      ? 'از مأموریت اول شروع کن؛ اول درسنامه را با دقت ببین، بعد تمرین‌ها را حل کن. هر جا گیر کردی، دکمهٔ راهنما را بزن!'
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
  HC()?.mount({ gameId: GAME_ID, music: 'music8.mp3', name: profile.name, intro: "سلام ایران‌گرد کوچک! من حکیمم. روی نقشهٔ واقعی ایران سفر می‌کنیم؛ اول درسنامهٔ هر مأموریت را بخوان، بعد نقطهٔ درست را روی نقشه پیدا کن." });
  renderHome();

  window.IranGeoApp = {
    getState: () => profile,
    openLesson,
    openTask,
    renderAtlas,
    renderCertificate
  };
})();
