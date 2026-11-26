/* ایران‌گرد کوچک — موتور نقشهٔ تعاملی ایران، اطلس آزاد و ۳۶ چالش مطالعات اجتماعی پنجم */
(function () {
  'use strict';

  const D = window.IranGeoData;
  const GAME_ID = 'iran-geography';
  const HC = () => window.HakimCompanion || null;
  const W = () => window.HakimWorlds || null;
  const ALL_UNITS = () => D.missions;
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
    const word = 'مأموریت';
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
      onMap: () => renderHome(),
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
      scale: 1,
      trip: { at: 0, km: 0, paved: 1 }
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
      if (raw.trip && typeof raw.trip === 'object') {
        const at = Number(raw.trip.at), km = Number(raw.trip.km), paved = Number(raw.trip.paved);
        base.trip = {
          at: Number.isInteger(at) && at >= 0 && at <= D.missions.length ? at : 0,
          km: Number.isFinite(km) && km >= 0 ? Math.min(km, 1e6) : 0,
          paved: Number.isInteger(paved) && paved >= 1 && paved <= D.missions.length ? paved : 1
        };
      }
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
      <section class="hero-card${window.IranGeoRoad ? ' ig-hero-road' : ''}">
        <div>
          <span class="hero-kicker">مطالعات اجتماعی پایهٔ پنجم · فصل‌های ۲ و ۳ (درس‌های ۵ تا ۱۱)</span>
          <h2 class="hero-title">به <span class="hw-accent">«ایران‌گرد کوچک»</span> خوش آمدی!</h2>
          <p class="hero-sub">روی نقشهٔ زندهٔ ایران سفر کن! جمعیت و اقلیم، دریای خزر و خلیج فارس، رود کارون و زاینده‌رود، قطب‌های صنعتی، بندر چابهار و کشورهای همسایهٔ ایران را با بازی و کاوش یاد بگیر.</p>
          <div class="hero-actions">
            <button type="button" class="btn-primary" id="btnStartNext">🚗 ${done === 0 ? 'سوار شو؛ شروع سفر!' : done === allTasks.length ? 'گشت دوباره در ایران' : 'ادامهٔ سفر جاده‌ای'}</button>
            <button type="button" class="btn-soft" id="btnOpenAtlas">🗺️ اطلس آزاد ایران‌شناسی</button>
            <button type="button" class="btn-gold" id="btnOpenCert">🏆 گواهی‌نامهٔ من</button>
          </div>
        </div>
        ${W() && !window.IranGeoRoad ? W().art('geo', { chips: ['🧭 ' + fa(D.missions.length) + ' مأموریت', '📍 ' + fa(D.mapPins.length) + ' نقطه روی نقشه', '🏅 ' + fa(allTasks.length) + ' سؤال'], mapHtml: renderIranSvg('tehran', false) }) : ''}
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

      ${window.IranGeoRoad ? window.IranGeoRoad.render(roadCtx()) : W() ? W().journey(D.missions.map((u, i) => ({ title: u.title, solved: missionSolved(u), total: u.tasks.length, locked: isLocked(i) })), { word: 'مأموریت', attr: 'data-lesson', nextIdx, done, total: allTasks.length }) : ''}

      <section aria-labelledby="missionsHeading">
        <h2 id="missionsHeading" class="hw-section-title" style="margin:0 0 12px;font-size:1.2rem">🗺️ شش مأموریت جغرافیای ایران (درس‌های ۵ تا ۱۱ کتاب)</h2>
        <div class="missions-grid">
          ${D.missions.map((m, idx) => {
            const s = missionSolved(m);
            const st = missionStars(m);
            const full = s === m.tasks.length;
            const locked = isLocked(idx);
            const seen = Boolean(profile.lessons[m.id]) || s > 0;
            const hw = W() ? W().card(s, m.tasks.length, idx, nextIdx, locked) : null;
            return `<article class="mission-card ${full ? 'done' : ''} ${hw ? 'hw-card' : ''}" ${hw ? hw.attrs : ''}>
              <div class="mission-top">
                <span class="mission-icon" aria-hidden="true">${m.icon}${hw ? hw.num : ''}</span>
                <span class="mission-stars" aria-label="${fa(st)} از ۳ ستاره">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
              </div>
              <h3 style="margin:0;font-size:1.05rem">${esc(m.title)}</h3>
              ${hw ? hw.badge : ''}
              <p style="margin:0;font-size:0.84rem;color:var(--muted)">${esc(m.subtitle)}</p>
              ${hw ? hw.bar : ''}
              <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px dashed var(--line)">
                <small><b>${fa(s)} / ${fa(m.tasks.length)}</b> چالش</small>
                <div style="display:flex;gap:6px">
                  ${locked ? `<button type="button" class="btn-soft" data-lesson="${idx}" aria-label="مأموریت ${fa(idx + 1)} قفل است؛ اول مأموریت قبلی را کامل کن">🔒 قفل</button>` :
                    seen ? `<button type="button" class="btn-soft" data-lesson="${idx}">📖 درسنامه</button>
                  <button type="button" class="btn-primary" data-play="${idx}">${full ? 'مرور چالش‌ها' : '🎯 چالش‌ها ←'}</button>` :
                    `<button type="button" class="btn-primary" data-lesson="${idx}">📖 شروع با درسنامه ←</button>`}
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>

      ${W() ? W().certBanner({ done, total: allTasks.length, word: 'مأموریت', taskWord: 'سؤال', attr: 'data-lesson', nextIdx }) : ''}
    `;

    $('btnStartNext').onclick = () => (window.IranGeoRoad ? window.IranGeoRoad.goNext() : openLesson(nextIdx));
    $('btnOpenAtlas').onclick = renderAtlas;
    window.IranGeoRoad?.mount(main, roadCtx());
    $('btnOpenCert').onclick = renderCertificate;
    W()?.bind(main, { cert: renderCertificate });
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

  // پیوند نقشهٔ سفر جاده‌ای با وضعیت بازی
  function roadCtx() {
    return {
      missions: D.missions,
      pins: D.mapPins,
      map: window.IranGeoMap,
      trip: profile.trip,
      solved: (i) => missionSolved(D.missions[i]),
      stars: (i) => missionStars(D.missions[i]),
      seen: (i) => Boolean(profile.lessons[D.missions[i].id]),
      locked: (i) => isLocked(i),
      openLesson: (i) => openLesson(i, 0),
      openTask: (i) => openTask(i, Math.max(0, D.missions[i].tasks.findIndex((t) => !profile.done[t.id]?.ok))),
      lockedNotice: (i) => lockedNotice(i),
      save: saveState,
      sound: () => profile.sound,
      tone: playTone,
      toast: (m) => W()?.toast?.(m),
      say: (m) => HC()?.say?.(m, 'happy')
    };
  }

  function unitsInfo() {
    return D.missions.map((m) => ({ solved: missionSolved(m), total: m.tasks.length, seen: Boolean(profile.lessons[m.id]) }));
  }
  function isLocked(idx) {
    const w = W();
    const u = unitsInfo();
    if (w && w.isLocked) return w.isLocked(u, idx);
    return idx > 0 && !u[idx].seen && !u[idx].solved && u[idx - 1].solved < u[idx - 1].total;
  }
  function lockedNotice(idx) {
    const msg = 'این مأموریت هنوز قفل است؛ اول مأموریت «' + (W() ? W().shortTitle(D.missions[idx - 1].title) : D.missions[idx - 1].title) + '» را کامل کن 🔒';
    if (W()?.toast) W().toast(msg); else HC()?.say?.(msg);
  }

  let lessonStep = 0;
  let lessonSeenMax = 0;
  let lessonChecks = {};
  const STEP_LABELS = ['ببین و کشف کن', 'بفهم و یاد بگیر', 'نکتهٔ امتحانی و خودآزمایی'];

  function openLesson(idx, step) {
    if (isLocked(idx)) { lockedNotice(idx); renderHome(); return; }
    if (idx !== mi || step === undefined) { lessonChecks = {}; lessonSeenMax = profile.lessons[D.missions[idx].id] ? 2 : 0; }
    mi = idx;
    lessonStep = Math.max(0, Math.min(2, step || 0));
    lessonSeenMax = Math.max(lessonSeenMax, lessonStep);
    stageStartedAt = Date.now();
    const m = D.missions[mi];
    const L = (window.IranGeoLessons || {})[m.id];
    const V = window.IranGeoLessonView;
    const w = W();
    if (!L || !V) return openLessonLegacy(m);
    const seen = Boolean(profile.lessons[m.id]);
    const allChecked = L.exam.check.every((q, i) => lessonChecks[i] === 'ok');
    const canGo = seen || allChecked;

    let body = '';
    if (lessonStep === 0) {
      const visual = L.see.map ? `<figure class="hw-figure iran-map-box ig-lesson-map">${V.lessonMap(L.see.map, D.mapPins)}<figcaption>${esc(L.see.title)}</figcaption></figure>` : V.visual(L.see.visual);
      body = `
        <div class="hw-hook"><span aria-hidden="true">🤔</span><span>${esc(L.hook)}</span></div>
        ${w ? w.audioCard({ src: L.audio || '', text: L.narration, title: 'حکیم درس را برایت تعریف می‌کند', sub: (L.audio ? 'صدای فارسی حکیم' : 'صدای مرورگر') + ' · ' + L.lessonNo }) : ''}
        <h3 class="hw-stage-title">${esc(L.see.title)}</h3>
        <p style="margin:0 0 10px;color:var(--muted)">${esc(L.see.text)}</p>
        <div class="hw-split">
          ${visual}
          <ul class="hw-legend">${L.see.legend.map((g) => `<li style="--c:${g.c}"><i aria-hidden="true"></i><b>${esc(g.t)}</b><small>${esc(g.d)}</small></li>`).join('')}</ul>
        </div>`;
    } else if (lessonStep === 1) {
      body = `
        <h3 class="hw-stage-title">${esc(L.learn.title)}</h3>
        ${V.visual(L.learn.visual)}
        <div class="hw-cards">${L.learn.cards.map((c, i) => `<article class="hw-ccard" style="--hw-c:${w ? w.color(i) : 'var(--primary)'}"><span class="ic" aria-hidden="true">${c.i}</span><h4>${esc(c.t)}</h4><p>${esc(c.d)}</p></article>`).join('')}</div>
        ${L.learn.compare ? `<h3 class="hw-stage-title">${esc(L.learn.compare.title)}</h3><div class="hw-compare">
          <div class="l"><h4>${esc(L.learn.compare.left.t)}</h4><ul>${L.learn.compare.left.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="vs" aria-hidden="true">⇄</div>
          <div class="r"><h4>${esc(L.learn.compare.right.t)}</h4><ul>${L.learn.compare.right.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}`;
    } else {
      body = `
        <div class="hw-exam"><h3>📝 نکته‌های امتحانی این درس</h3><ol>${L.exam.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>
        <h3 class="hw-stage-title" style="margin-top:16px">✅ خودآزمایی کوتاه (برای باز شدن چالش‌ها)</h3>
        <div class="hw-check">${L.exam.check.map((q, qi2) => `
          <div class="hw-q" data-q="${qi2}"><p>${fa(qi2 + 1)}) ${esc(q.q)}</p>
            <div class="opts" role="group" aria-label="گزینه‌های پرسش ${fa(qi2 + 1)}">${q.o.map((o, oi) => `<button type="button" data-lq="${qi2}" data-lo="${oi}"${lessonChecks[qi2] === 'ok' && oi === q.a ? ' data-res="ok"' : ''}${lessonChecks[qi2] === 'ok' ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>
            <p class="why" role="status" aria-live="polite">${lessonChecks[qi2] === 'ok' ? '✅ ' + esc(q.why) : lessonChecks[qi2] === 'no' ? '🔁 دوباره فکر کن؛ متن درس را مرور کن.' : ''}</p>
          </div>`).join('')}</div>`;
    }

    main.innerHTML = `
      <div class="paper-box ig-lesson">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div class="hw-lhero">
            <span class="hw-lhero-icon" aria-hidden="true">${m.icon}</span>
            <div><span class="hw-lno">${esc(L.lessonNo)} · ${esc(L.pages)}</span><h2>درسنامهٔ مأموریت ${fa(mi + 1)}: ${esc(w ? w.shortTitle(m.title) : m.title)}</h2></div>
          </div>
          <button type="button" id="btnBackHome">🗺️ بازگشت به مأموریت‌ها</button>
        </div>
        ${w ? w.steps(STEP_LABELS, lessonStep, lessonSeenMax) : ''}
        ${body}
        <div class="hw-lnav">
          ${lessonStep > 0 ? '<button type="button" class="btn-soft" id="btnLessonPrev">→ گام قبل</button>' : '<span></span>'}
          ${lessonStep < 2 ? '<button type="button" class="btn-primary" id="btnLessonNext">گام بعد ←</button>' :
            `<span style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${canGo ? '' : '<span class="hw-unlock-note">🔒 به هر دو پرسش درست پاسخ بده تا چالش‌ها باز شوند.</span>'}
             <button type="button" class="btn-primary" id="btnGoTasks"${canGo ? '' : ' disabled'}>🎯 آماده‌ام! شروع ${fa(m.tasks.length)} چالش مأموریت ←</button></span>`}
        </div>
      </div>`;

    $('btnBackHome').onclick = renderHome;
    w?.bindAudio(main);
    w?.bind(main, {});
    main.querySelectorAll('[data-hw-step]').forEach((b) => { b.onclick = () => openLesson(mi, Number(b.dataset.hwStep)); });
    if ($('btnLessonPrev')) $('btnLessonPrev').onclick = () => openLesson(mi, lessonStep - 1);
    if ($('btnLessonNext')) $('btnLessonNext').onclick = () => { openLesson(mi, lessonStep + 1); main.scrollIntoView?.({ block: 'start' }); };
    main.querySelectorAll('[data-lq]').forEach((b) => {
      b.onclick = () => {
        const qn = Number(b.dataset.lq), on = Number(b.dataset.lo);
        const q = L.exam.check[qn];
        lessonChecks[qn] = on === q.a ? 'ok' : 'no';
        playTone(on === q.a ? 'win' : 'err');
        if (L.exam.check.every((_, i) => lessonChecks[i] === 'ok') && !profile.lessons[m.id]) {
          profile.lessons[m.id] = true;
          saveState();
          HC()?.say?.('آفرین! درسنامه را کامل کردی؛ حالا چالش‌های این مأموریت باز شد 🎯');
        }
        openLesson(mi, 2);
        const again = main.querySelector(`[data-q="${qn}"] .why`);
        if (again) again.focus?.();
      };
    });
    if ($('btnGoTasks')) $('btnGoTasks').onclick = () => {
      if (!profile.lessons[m.id]) { profile.lessons[m.id] = true; saveState(); }
      const firstOpen = Math.max(0, m.tasks.findIndex((t) => !profile.done[t.id]?.ok));
      openTask(mi, firstOpen);
    };
  }

  function openLessonLegacy(m) {
    profile.lessons[m.id] = true;
    saveState();
    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <div><small style="color:var(--muted)">درسنامهٔ سفر · مأموریت ${fa(mi + 1)}</small><h2 style="margin:2px 0 0">${esc(m.title)}</h2></div>
          <button type="button" id="btnBackHome">🗺️ بازگشت به مأموریت‌ها</button>
        </div>
        <div style="background:var(--primary-soft);border-right:4px solid var(--primary);padding:14px 16px;border-radius:14px;margin-bottom:14px"><p style="margin:0">${esc(m.summary)}</p></div>
        <div class="iran-map-box">${renderIranSvg('tehran', false)}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="button" class="btn-primary" id="btnGoTasks">🎯 آماده‌ام! شروع ${fa(m.tasks.length)} چالش مأموریت ←</button>
          <button type="button" class="btn-soft" id="btnSpeakLesson">🔊 شنیدن خلاصهٔ درس</button>
        </div>
      </div>`;
    $('btnBackHome').onclick = renderHome;
    $('btnSpeakLesson').onclick = () => speakText(m.summary);
    $('btnGoTasks').onclick = () => openTask(mi, Math.max(0, m.tasks.findIndex((t) => !profile.done[t.id]?.ok)));
  }

  function openTask(missionIdx, taskIdx) {
    if (isLocked(missionIdx)) { lockedNotice(missionIdx); renderHome(); return; }
    const um = D.missions[missionIdx];
    if (!profile.lessons[um.id] && missionSolved(um) === 0) {
      W()?.toast?.('اول درسنامهٔ این مأموریت را ببین؛ بعد چالش‌ها باز می‌شوند 📖');
      openLesson(missionIdx, 0);
      return;
    }
    W()?.stopAudio?.();
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
        companionAfterSolve(m, already);
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
    W()?.stopAudio?.();
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
    const w = W();
    w?.stopAudio?.();
    const lessonsRead = D.missions.filter((m) => profile.lessons[m.id]).length;
    const guidedCount = allTasks.filter((t) => profile.done[t.id]?.guided).length;
    main.innerHTML = `
      <div class="no-print" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <button type="button" id="certBack">🗺️ بازگشت به مأموریت‌ها</button>
        <button type="button" class="btn-primary" id="btnPrintCert">🖨️ چاپ استاندارد A4 / ذخیرهٔ PDF</button>
      </div>
      <article class="cert-sheet hw-cert hk-tazhib" aria-label="گواهی‌نامهٔ ایران‌گرد کوچک">
        <div class="hw-cert-top" style="border-bottom:2px dashed #e5d3a5;padding-bottom:14px;margin-bottom:6px">
          ${w ? w.seal('ایران‌گرد کوچک', done === allTasks.length ? 'مهر پایان سفر' : 'مهر پیشرفت') : ''}
          <div style="text-align:center">
            <div style="font-size:0.85rem;font-weight:800;color:#6b5a3a">حکیمستان · مطالعات اجتماعی پایهٔ پنجم دبستان · درس‌های ۵ تا ۱۱</div>
            <h2 style="margin:6px 0;font-size:1.7rem">${done === allTasks.length ? 'گواهی‌نامهٔ پایان سفر ایران‌گردی' : 'گواهی‌نامهٔ پیشرفت ایران‌گردی'}</h2>
            <div style="font-size:.9rem;color:#5a4a2a">این گواهی‌نامه با افتخار تقدیم می‌شود به</div>
            <div class="cert-student-name" style="color:#0d6859;margin:4px 0">${esc(profile.name)}</div>
            <div>رتبه: <b>${esc(rankTitle())}</b> · پیشرفت: <b>${fa(pct)}٪</b></div>
          </div>
          ${w ? w.certHakim('') : ''}
        </div>
        ${w ? w.certStats([
          { icon: '⭐', value: fa(stars) + ' / ' + fa(D.missions.length * 3), label: 'ستاره' },
          { icon: '🎯', value: fa(done) + ' / ' + fa(allTasks.length), label: 'چالش حل‌شده' },
          { icon: '📖', value: fa(lessonsRead) + ' / ' + fa(D.missions.length), label: 'درسنامهٔ کامل' },
          { icon: '🔥', value: fa(profile.bestCombo), label: 'رکورد پاسخ پیاپی' }
        ]) : ''}
        <h3 style="margin:0 0 8px;font-size:1rem">فهرست مهارت‌های شش‌گانهٔ جغرافیای ایران (درس‌های ۵ تا ۱۱):</h3>
        <ul class="cert-skills-grid">
          ${D.missions.map((m) => {
            const s = missionSolved(m);
            const full = s === m.tasks.length;
            return `<li class="${full ? 'mastered' : ''}"><b>${full ? '☑' : '☐'} ${esc(m.title)}</b><br><small>${fa(s)} از ${fa(m.tasks.length)} چالش (${esc(m.badge)})</small></li>`;
          }).join('')}
        </ul>
        <div class="hw-cert-quote"><span class="hw-cert-hakim-face" data-hk-face="happy" aria-hidden="true"></span>
          <p><b>حکیم:</b> ${done === allTasks.length ? 'آفرین ایران‌گرد کوچک! از کرانهٔ خزر تا بندر چابهار، نقشهٔ ایران را مثل یک جغرافی‌دان خواندی. به تو افتخار می‌کنم!' : 'سفرت خوب پیش می‌رود! هر مأموریتی که کامل شود، یک نشان 🏅 کنار مهارتش می‌نشیند. ادامه بده!'}</p></div>
        <div class="hw-cert-foot">
          <div class="hw-cert-date"><span>تاریخ صدور: <b>${new Date().toLocaleDateString('fa-IR')}</b></span><span>${fa(guidedCount)} پاسخ با راهنمای قطب‌نما</span></div>
          ${w ? w.signature('مهدی شریفیان', 'طراح آموزشی و توسعه‌دهنده · حکیمستان') : '<span>طراحی آموزشی: مهدی شریفیان · حکیمستان</span>'}
        </div>
        <p class="hw-cert-note">این گواهی بر پایهٔ پیشرفت ذخیره‌شده در همین دستگاه صادر شده و مدرک رسمی نیست.</p>
      </article>
    `;
    w?.bind(main, {});
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
