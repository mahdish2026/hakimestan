/* هم‌آواستان — موتور تعاملی درسنامهٔ یادیار، فرهنگ‌نامهٔ هم‌آواها و ۳۶ چالش املایی فارسی پنجم */
(function () {
  'use strict';

  const D = window.HamavaData;
  const GAME_ID = 'farsi5-hamava';
  const HC = () => window.HakimCompanion || null;
  const W = () => window.HakimWorlds || null;
  const ALL_UNITS = () => D.chapters;
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
    const word = 'فصل';
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
  const STORAGE_KEY = 'hakim.hamava.v1';
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

  const allTasks = D.chapters.flatMap((c) => c.tasks);

  // Deterministic option permutation so correct answers appear evenly across positions 1, 2, 3
  function getOrderedOptions(task) {
    let hash = 0;
    for (let i = 0; i < task.id.length; i++) hash = (hash * 31 + task.id.charCodeAt(i)) >>> 0;
    const perms = [
      [0, 1, 2],
      [1, 0, 2],
      [2, 1, 0],
      [1, 2, 0],
      [0, 2, 1],
      [2, 0, 1]
    ];
    const p = perms[hash % perms.length];
    return p.map((origIdx) => ({
      text: task.options[origIdx],
      isCorrect: origIdx === task.answer
    }));
  }

  function defaultState() {
    return {
      version: 1,
      name: 'ادیب جوان',
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
      base.name = String(raw.name || 'ادیب جوان').trim().slice(0, 36) || 'ادیب جوان';
      if (raw.done && typeof raw.done === 'object') {
        for (const t of allTasks) {
          if (raw.done[t.id]?.ok) base.done[t.id] = { ok: true, guided: Boolean(raw.done[t.id].guided) };
        }
      }
      if (raw.lessons && typeof raw.lessons === 'object') {
        for (const c of D.chapters) {
          if (raw.lessons[c.id]) base.lessons[c.id] = true;
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
  let ci = 0;
  let qi = 0;
  let stageStartedAt = Date.now();
  let selectedIdx = null;
  let taskSolved = false;
  let taskGuided = false;
  let taskAttempts = 0;
  let searchQuery = '';

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
      const notes = kind === 'win' ? [523.25, 659.25, 783.99] : kind === 'err' ? [250, 200] : [440];
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

  function chapterSolved(ch) {
    return ch.tasks.filter((t) => profile.done[t.id]?.ok).length;
  }
  function totalSolved() {
    return allTasks.filter((t) => profile.done[t.id]?.ok).length;
  }
  function chapterStars(ch) {
    const s = chapterSolved(ch);
    if (s === ch.tasks.length) return 3;
    if (s >= 4) return 2;
    if (s >= 1) return 1;
    return 0;
  }
  function totalStars() {
    return D.chapters.reduce((a, c) => a + chapterStars(c), 0);
  }
  function rankTitle() {
    const pct = (totalSolved() / allTasks.length) * 100;
    if (pct >= 100) return 'سخن‌سرای حکیمِ هم‌آواستان 👑';
    if (pct >= 70) return 'ویراستار ماهر پارسی 🌟';
    if (pct >= 35) return 'پژوهشگر واژه‌های هم‌آوا 📜';
    return 'رهگذر تالار ادب 🌱';
  }

  function updateHud() {
    if ($('hudStars')) $('hudStars').textContent = `⭐ ${fa(totalStars())} / ${fa(D.chapters.length * 3)}`;
    if ($('hudXp')) $('hudXp').textContent = `💎 ${fa(profile.xp)} امتیاز`;
    if ($('hudCombo')) $('hudCombo').textContent = `🔥 کمبو: ${fa(profile.combo)} (رکورد: ${fa(profile.bestCombo)})`;
  }

  function renderMap() {
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const nextIdx = Math.max(0, D.chapters.findIndex((c) => chapterSolved(c) < c.tasks.length));

    main.innerHTML = `
      <section class="hero-card hw-hero-split">
        <div>
        <span class="hero-kicker">فارسی و نگارش پایهٔ پنجم دبستان · هم‌آواها و درست‌نویسی</span>
        <h2 class="hero-title">به تالار ادب <span class="hw-accent">«هم‌آواستان»</span> خوش آمدی!</h2>
        <p class="hero-sub">چرا «نمازگزار» با «ز» نوشته می‌شود ولی «کتاب را روی میز گذارد» با «ذ»؟ در ۶ فصل جذاب، اول با «رمزهای یادیار» راز هر جفت هم‌آوا را یاد بگیر، بعد در داستان‌ها و میزِ ویراستاری استادت را نشان بده!</p>
        <div class="hero-actions">
          <button type="button" class="btn-primary" id="btnStartNext">🚀 ${done === 0 ? 'شروع فصل اول' : 'ادامهٔ ماجراجویی'}</button>
          <button type="button" class="btn-soft" id="btnOpenLexicon">📖 فرهنگ‌نامهٔ جیبی هم‌آواها</button>
          <button type="button" class="btn-gold" id="btnOpenCert">🏆 گواهی‌نامهٔ من</button>
        </div>
        </div>
        ${W() ? W().art('hamava', { chips: ['📜 ' + fa(D.chapters.length) + ' فصل', '✍️ ' + fa(allTasks.length) + ' چالش', '📖 ' + fa(D.lexicon.length) + ' جفت هم‌آوا'] }) : ''}
      </section>

      <section class="profile-bar" aria-label="پروفایل ادیب جوان">
        <form class="profile-form" id="nameForm">
          <label for="studentNameInput"><b>نام دانش‌آموز:</b></label>
          <input id="studentNameInput" type="text" maxlength="36" value="${esc(profile.name)}" autocomplete="off">
          <button type="submit" class="btn-soft">ثبت نام</button>
        </form>
        <div class="progress-meter-wrap">
          <div class="progress-meter-label">
            <span>رتبه: ${esc(rankTitle())}</span>
            <span>${fa(done)} از ${fa(allTasks.length)} چالش (${fa(pct)}٪)</span>
          </div>
          <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت کل هم‌آواستان">
            <span style="width:${pct}%"></span>
          </div>
        </div>
      </section>

      ${W() ? W().journey(D.chapters.map((u, i) => ({ title: u.title, solved: chapterSolved(u), total: u.tasks.length, locked: isLocked(i) })), { word: 'فصل', attr: 'data-lesson', nextIdx, done, total: allTasks.length }) : ''}

      <section aria-labelledby="chaptersHeading">
        <h2 id="chaptersHeading" class="hw-section-title" style="margin:0 0 12px;font-size:1.2rem">📚 شش فصل املا و واژه‌شناسی پایهٔ پنجم</h2>
        <div class="chapters-grid">
          ${D.chapters.map((c, idx) => {
            const s = chapterSolved(c);
            const st = chapterStars(c);
            const full = s === c.tasks.length;
            const locked = isLocked(idx);
            const seen = Boolean(profile.lessons[c.id]) || s > 0;
            const hw = W() ? W().card(s, c.tasks.length, idx, nextIdx, locked) : null;
            return `<article class="chapter-card ${full ? 'done' : ''} ${hw ? 'hw-card' : ''}" ${hw ? hw.attrs : ''}>
              <div class="chapter-top">
                <span class="chapter-icon" aria-hidden="true">${c.icon}${hw ? hw.num : ''}</span>
                <span class="chapter-stars" aria-label="${fa(st)} از ۳ ستاره">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
              </div>
              <h3 style="margin:0;font-size:1.05rem">${esc(c.title)}</h3>
              ${hw ? hw.badge : ''}
              <p style="margin:0;font-size:0.84rem;color:var(--muted)">${esc(c.subtitle)}</p>
              ${hw ? hw.bar : ''}
              <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px dashed var(--line)">
                <small><b>${fa(s)} / ${fa(c.tasks.length)}</b> چالش</small>
                <div style="display:flex;gap:6px">
                  ${locked ? `<button type="button" class="btn-soft" data-lesson="${idx}" aria-label="فصل ${fa(idx + 1)} قفل است؛ اول فصل قبلی را کامل کن">🔒 قفل</button>` :
                    seen ? `<button type="button" class="btn-soft" data-lesson="${idx}">📖 درسنامه</button>
                  <button type="button" class="btn-primary" data-play="${idx}">${full ? 'مرور چالش‌ها' : '🎯 چالش‌ها ←'}</button>` :
                    `<button type="button" class="btn-primary" data-lesson="${idx}">📖 شروع با درسنامه ←</button>`}
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>

      ${W() ? W().certBanner({ done, total: allTasks.length, word: 'فصل', taskWord: 'چالش', attr: 'data-lesson', nextIdx }) : ''}
    `;

    $('btnStartNext').onclick = () => openLesson(nextIdx);
    $('btnOpenLexicon').onclick = renderLexicon;
    $('btnOpenCert').onclick = renderCertificate;
    W()?.bind(main, { cert: renderCertificate });
    $('nameForm').onsubmit = (e) => {
      e.preventDefault();
      profile.name = String($('studentNameInput').value || '').trim().slice(0, 36) || 'ادیب جوان';
      HC()?.setName(profile.name);
      saveState();
      renderMap();
    };
    main.querySelectorAll('[data-lesson]').forEach((b) => {
      b.onclick = () => openLesson(Number(b.dataset.lesson));
    });
    main.querySelectorAll('[data-play]').forEach((b) => {
      b.onclick = () => openTask(Number(b.dataset.play), 0);
    });
  }

  function unitsInfo() {
    return D.chapters.map((c) => ({ solved: chapterSolved(c), total: c.tasks.length, seen: Boolean(profile.lessons[c.id]) }));
  }
  function isLocked(idx) {
    const w = W();
    const u = unitsInfo();
    if (w && w.isLocked) return w.isLocked(u, idx);
    return idx > 0 && !u[idx].seen && !u[idx].solved && u[idx - 1].solved < u[idx - 1].total;
  }
  function lockedNotice(idx) {
    const msg = 'این فصل هنوز قفل است؛ اول فصل «' + (W() ? W().shortTitle(D.chapters[idx - 1].title) : D.chapters[idx - 1].title) + '» را کامل کن 🔒';
    if (W()?.toast) W().toast(msg); else HC()?.say?.(msg);
  }
  const DIACRITICS = /[\u064B-\u0652\u0670]/;
  function markWord(word, other) {
    const A = Array.from(String(word)), B = Array.from(String(other || ''));
    if (A.length === B.length) return A.map((ch, i) => (ch !== B[i] && !DIACRITICS.test(ch) && /[\u0600-\u06FF]/.test(ch) ? `<mark class="hm-diff">${esc(ch)}</mark>` : esc(ch))).join('');
    const otherSet = new Set(B);
    return A.map((ch) => (!DIACRITICS.test(ch) && ch.trim() && !otherSet.has(ch) && /[\u0600-\u06FF]/.test(ch) ? `<mark class="hm-diff">${esc(ch)}</mark>` : esc(ch))).join('');
  }

  let lessonStep = 0;
  let lessonSeenMax = 0;
  let lessonChecks = {};
  const STEP_LABELS = ['بشنو و مقایسه کن', 'رمز تصویری و هم‌خانواده‌ها', 'خودآزمایی کوتاه'];

  function openLesson(chapterIdx, step) {
    if (isLocked(chapterIdx)) { lockedNotice(chapterIdx); renderMap(); return; }
    if (chapterIdx !== ci || step === undefined) { lessonChecks = {}; lessonSeenMax = profile.lessons[D.chapters[chapterIdx].id] ? 2 : 0; }
    ci = chapterIdx;
    lessonStep = Math.max(0, Math.min(2, step || 0));
    lessonSeenMax = Math.max(lessonSeenMax, lessonStep);
    stageStartedAt = Date.now();
    const ch = D.chapters[ci];
    const L = (window.HamavaLessons || {})[ch.id];
    const w = W();
    if (!L) return openLessonLegacy(ch);
    const seen = Boolean(profile.lessons[ch.id]);
    const allChecked = L.check.every((q, i) => lessonChecks[i] === 'ok');
    const canGo = seen || allChecked;

    let body = '';
    if (lessonStep === 0) {
      body = `
        <div class="hm-concept">
          <div class="hm-letters" aria-hidden="true">${L.letters.map((l, i) => `<span class="hm-tile" style="--d:${i * 0.12}s">${esc(l)}</span>${i < L.letters.length - 1 ? '<span class="hm-eq">=</span>' : ''}`).join('')}<span class="hm-wave">🔊 «${esc(L.sound)}»</span></div>
          <p>${esc(L.concept)}</p>
        </div>
        ${w ? w.audioCard({ src: L.audio || '', text: L.narration, title: 'حکیم رمزهای این فصل را می‌گوید', sub: (L.audio ? 'صدای فارسی حکیم' : 'صدای مرورگر') + ' · فصل ' + fa(ci + 1) }) : ''}
        <h3 class="hw-stage-title">${L.steps ? 'چهار گام سرویراستار' : 'جفت‌های هم‌آوای این فصل را مقایسه کن'}</h3>
        ${L.steps ? `<ol class="hm-editor-steps">${L.steps.map((s) => `<li><span aria-hidden="true">${s.i}</span><b>${esc(s.t)}</b><small>${esc(s.d)}</small></li>`).join('')}</ol>` : ''}
        <div class="hm-pairs">${L.pairs.map((p) => `
          <article class="hm-pair">
            <div class="hm-word"><span class="hm-ic" aria-hidden="true">${p.a.icon}</span><b class="hm-w">${markWord(p.a.w, p.b.w)}</b><small>${esc(p.a.m)}</small></div>
            <span class="hm-vs" aria-hidden="true">≠</span>
            <div class="hm-word"><span class="hm-ic" aria-hidden="true">${p.b.icon}</span><b class="hm-w">${markWord(p.b.w, p.a.w)}</b><small>${esc(p.b.m)}</small></div>
          </article>`).join('')}</div>
        <p class="hm-legend-note">حرف‌هایی که <mark class="hm-diff">رنگی</mark> شده‌اند، تفاوت املای دو واژه است؛ صدایشان یکی است!</p>`;
    } else if (lessonStep === 1) {
      body = `
        <h3 class="hw-stage-title">رمز تصویری هر واژه و خانوادهٔ آن</h3>
        <div class="hm-mnemo">${L.pairs.map((p, i) => `
          <article class="hm-mcard" style="--hw-c:${w ? w.color(i) : 'var(--primary)'}">
            <div class="hm-mside"><span class="hm-big" aria-hidden="true">${p.a.icon}</span><b>${esc(p.a.w)}</b><small>${esc(p.a.m)}</small>
              ${p.a.fam.length ? `<div class="hm-fam" aria-label="هم‌خانواده‌ها">${p.a.fam.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}</div>
            <div class="hm-mside"><span class="hm-big" aria-hidden="true">${p.b.icon}</span><b>${esc(p.b.w)}</b><small>${esc(p.b.m)}</small>
              ${p.b.fam.length ? `<div class="hm-fam" aria-label="هم‌خانواده‌ها">${p.b.fam.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}</div>
            <p class="hm-hint">💡 ${esc(p.hint)}</p>
          </article>`).join('')}</div>
        <div class="hw-exam" style="margin-top:12px"><h3>📏 ${esc(L.rule.t)}</h3><p style="margin:0;line-height:2.1">${esc(L.rule.d)}</p></div>
        <details class="hm-more"><summary>📚 رمزهای کتاب برای این فصل (${fa(ch.pairs.length)} جفت)</summary>
          <ul>${ch.pairs.map((p) => `<li><b>${esc(p.a)}</b> ⚡ <b>${esc(p.b)}</b><br><small>${esc(p.tip)}</small></li>`).join('')}</ul></details>`;
    } else {
      body = `
        <div class="hw-exam"><h3>📝 پیش از چالش‌ها یادت باشد</h3><ol>
          <li>اوّل معنای جمله را بفهم؛ بعد سراغ املا برو.</li>
          <li>برای واژهٔ مشکوک یک هم‌خانواده بساز تا حرف ریشه معلوم شود.</li>
          <li>${esc(L.rule.d)}</li></ol></div>
        <h3 class="hw-stage-title" style="margin-top:16px">✅ خودآزمایی کوتاه (برای باز شدن چالش‌ها)</h3>
        <div class="hw-check">${L.check.map((q, qn) => `
          <div class="hw-q" data-q="${qn}"><p>${fa(qn + 1)}) ${esc(q.q)}</p>
            <div class="opts" role="group" aria-label="گزینه‌های پرسش ${fa(qn + 1)}">${q.o.map((o, oi) => `<button type="button" data-lq="${qn}" data-lo="${oi}"${lessonChecks[qn] === 'ok' && oi === q.a ? ' data-res="ok"' : ''}${lessonChecks[qn] === 'ok' ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>
            <p class="why" role="status" aria-live="polite">${lessonChecks[qn] === 'ok' ? '✅ ' + esc(q.why) : lessonChecks[qn] === 'no' ? '🔁 دوباره فکر کن؛ رمز و هم‌خانواده را به یاد بیاور.' : ''}</p>
          </div>`).join('')}</div>`;
    }

    main.innerHTML = `
      <div class="paper-box hm-lesson">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div class="hw-lhero">
            <span class="hw-lhero-icon" aria-hidden="true">${ch.icon}</span>
            <div><span class="hw-lno">درسنامهٔ یادیار · فصل ${fa(ci + 1)} از ${fa(D.chapters.length)}</span><h2>${esc(w ? w.shortTitle(ch.title) : ch.title)}</h2></div>
          </div>
          <button type="button" id="lessonBackMap">🗺️ بازگشت به نقشهٔ فصل‌ها</button>
        </div>
        ${w ? w.steps(STEP_LABELS, lessonStep, lessonSeenMax) : ''}
        ${body}
        <div class="hw-lnav">
          ${lessonStep > 0 ? '<button type="button" class="btn-soft" id="btnLessonPrev">→ گام قبل</button>' : '<span></span>'}
          ${lessonStep < 2 ? '<button type="button" class="btn-primary" id="btnLessonNext">گام بعد ←</button>' :
            `<span style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${canGo ? '' : '<span class="hw-unlock-note">🔒 به هر دو پرسش درست پاسخ بده تا چالش‌ها باز شوند.</span>'}
             <button type="button" class="btn-primary" id="btnStartChapterTasks"${canGo ? '' : ' disabled'}>🎯 یاد گرفتم! ورود به ${fa(ch.tasks.length)} چالش این فصل ←</button></span>`}
        </div>
      </div>`;

    $('lessonBackMap').onclick = renderMap;
    w?.bind(main, {});
    w?.bindAudio(main);
    main.querySelectorAll('[data-hw-step]').forEach((b) => { b.onclick = () => openLesson(ci, Number(b.dataset.hwStep)); });
    if ($('btnLessonPrev')) $('btnLessonPrev').onclick = () => openLesson(ci, lessonStep - 1);
    if ($('btnLessonNext')) $('btnLessonNext').onclick = () => { openLesson(ci, lessonStep + 1); main.scrollIntoView?.({ block: 'start' }); };
    main.querySelectorAll('[data-lq]').forEach((b) => {
      b.onclick = () => {
        const qn = Number(b.dataset.lq), on = Number(b.dataset.lo);
        const q = L.check[qn];
        lessonChecks[qn] = on === q.a ? 'ok' : 'no';
        playTone(on === q.a ? 'win' : 'err');
        if (L.check.every((_, i) => lessonChecks[i] === 'ok') && !profile.lessons[ch.id]) {
          profile.lessons[ch.id] = true;
          saveState();
          HC()?.say?.('آفرین! رمزهای این فصل را یاد گرفتی؛ حالا چالش‌ها باز شد 🎯');
        }
        openLesson(ci, 2);
      };
    });
    if ($('btnStartChapterTasks')) $('btnStartChapterTasks').onclick = () => {
      if (!profile.lessons[ch.id]) { profile.lessons[ch.id] = true; saveState(); }
      const firstOpen = Math.max(0, ch.tasks.findIndex((t) => !profile.done[t.id]?.ok));
      openTask(ci, firstOpen);
    };
  }

  function openLessonLegacy(ch) {
    profile.lessons[ch.id] = true;
    saveState();
    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <div><small style="color:var(--muted)">درسنامهٔ یادیار · فصل ${fa(ci + 1)}</small><h2 style="margin:2px 0 0">${esc(ch.title)}</h2></div>
          <button type="button" id="lessonBackMap">🗺️ بازگشت به نقشهٔ فصل‌ها</button>
        </div>
        <div class="pairs-grid">${ch.pairs.map((p) => `<article class="pair-card"><div class="pair-words">${esc(p.a)}<br>⚡ ${esc(p.b)}</div><span class="mnemonic-pill">💡 ${esc(p.tip)}</span></article>`).join('')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button type="button" class="btn-primary" id="btnStartChapterTasks">🎯 یاد گرفتم! ورود به ${fa(ch.tasks.length)} چالش این فصل ←</button>
          <button type="button" class="btn-soft" id="btnReadPairs">🔊 شنیدن رمزهای این فصل</button>
        </div>
      </div>`;
    $('lessonBackMap').onclick = renderMap;
    $('btnStartChapterTasks').onclick = () => openTask(ci, Math.max(0, ch.tasks.findIndex((t) => !profile.done[t.id]?.ok)));
    $('btnReadPairs').onclick = () => speakText(ch.pairs.map((p) => `${p.a} در برابر ${p.b}. ${p.tip}`).join(' '));
  }

  function openTask(chapterIdx, taskIdx) {
    if (isLocked(chapterIdx)) { lockedNotice(chapterIdx); renderMap(); return; }
    const uc = D.chapters[chapterIdx];
    if (!profile.lessons[uc.id] && chapterSolved(uc) === 0) {
      W()?.toast?.('اول درسنامهٔ این فصل را ببین؛ بعد چالش‌ها باز می‌شوند 📖');
      openLesson(chapterIdx, 0);
      return;
    }
    W()?.stopAudio?.();
    ci = chapterIdx;
    qi = taskIdx;
    selectedIdx = null;
    taskSolved = false;
    taskGuided = false;
    taskAttempts = 0;
    drawTask();
  }

  function drawTask(fbHtml, fbClass) {
    const ch = D.chapters[ci];
    const t = ch.tasks[qi];
    const opts = getOrderedOptions(t);
    const chosenWord = selectedIdx !== null ? opts[selectedIdx].text : '___';
    const renderedSentence = esc(t.sentence).replace('___', `<span class="blank-slot">${esc(chosenWord)}</span>`);

    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <div>
            <small style="color:var(--muted)">${esc(ch.title)} · چالش ${fa(qi + 1)} از ${fa(ch.tasks.length)}</small>
            <h2 style="margin:2px 0 0;font-size:1.1rem">واژه یا گزینهٔ درست را برای جملهٔ زیر انتخاب کن:</h2>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn-soft" id="btnBackLesson">📖 رمزهای فصل</button>
            <button type="button" id="btnBackMap">🗺️ نقشه</button>
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          ${ch.tasks.map((item, idx) => `<button type="button" data-qjump="${idx}" style="min-width:44px;padding:4px 10px;font-size:0.82rem;${idx === qi ? 'background:var(--primary);color:var(--on-primary);border-color:var(--primary)' : ''}">${profile.done[item.id]?.ok ? '✓ ' : ''}${fa(idx + 1)}</button>`).join('')}
        </div>

        <div class="sentence-card">
          ${renderedSentence}
          <div style="margin-top:8px">
            <button type="button" class="btn-soft" id="btnSpeakSentence" style="min-height:36px;padding:4px 10px;font-size:0.8rem">🔊 خواندن جمله</button>
          </div>
        </div>

        <div class="choices-row" role="group" aria-label="گزینه‌های املایی">
          ${opts.map((o, idx) => `<button type="button" class="choice-word-btn" data-opt="${idx}" aria-pressed="${selectedIdx === idx}" ${taskSolved ? 'disabled' : ''}>${fa(idx + 1)}) ${esc(o.text)}</button>`).join('')}
        </div>

        <div id="taskFb" class="feedback-box ${fbClass || ''}" role="status" aria-live="polite">
          ${fbHtml || 'یکی از گزینه‌ها را انتخاب کن و دکمهٔ «بررسی پاسخ» را بزن!'}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="button" class="btn-primary" id="btnCheck" ${taskSolved ? 'disabled' : ''}>✓ بررسی پاسخ</button>
          <button type="button" class="btn-soft" id="btnHint" ${taskSolved ? 'disabled' : ''}>💡 راهنمای ریشه و معنی</button>
          ${taskSolved ? `<button type="button" class="btn-gold" id="btnNext">${qi < ch.tasks.length - 1 ? 'چالش بعدی ←' : ci < D.chapters.length - 1 ? '🎉 فصل بعدی ←' : '🏆 دریافت گواهی‌نامهٔ هم‌آواستان!'}</button>` : ''}
        </div>
      </div>
    `;

    $('btnBackLesson').onclick = () => openLesson(ci);
    $('btnBackMap').onclick = renderMap;
    $('btnSpeakSentence').onclick = () => speakText(t.sentence.replace('___', 'جای خالی'));
    main.querySelectorAll('[data-qjump]').forEach((b) => {
      b.onclick = () => openTask(ci, Number(b.dataset.qjump));
    });
    main.querySelectorAll('[data-opt]').forEach((b) => {
      b.onclick = () => {
        selectedIdx = Number(b.dataset.opt);
        drawTask();
      };
    });

    $('btnHint').onclick = () => {
      taskGuided = true;
      $('taskFb').className = 'feedback-box';
      $('taskFb').innerHTML = `<b>💡 راهنمایی:</b> ${esc(t.hint)}`;
    };

    $('btnCheck').onclick = () => {
      if (selectedIdx === null) {
        drawTask('<b>ابتدا یکی از گزینه‌ها را انتخاب کن!</b>', 'err');
        return;
      }
      taskAttempts++;
      const chosen = opts[selectedIdx];
      const correctOpt = opts.find((o) => o.isCorrect);

      HC()?.reportAnswer({
        gameId: GAME_ID,
        name: profile.name,
        stage: ch.title,
        questionId: t.id,
        questionNum: qi + 1,
        questionText: t.sentence,
        studentAnswer: chosen.text,
        correctAnswer: correctOpt ? correctOpt.text : '',
        isCorrect: chosen.isCorrect,
        attempts: taskAttempts
      });
      HC()?.answer(chosen.isCorrect);

      if (chosen.isCorrect) {
        playTone('win');
        const already = Boolean(profile.done[t.id]?.ok);
        profile.done[t.id] = { ok: true, guided: already ? profile.done[t.id].guided : taskGuided };
        profile.combo += 1;
        if (profile.combo > profile.bestCombo) profile.bestCombo = profile.combo;
        if (!already) profile.xp += taskGuided ? 15 : 25 + Math.min(15, profile.combo * 3);
        taskSolved = true;
        saveState();
        drawTask(`<b>🌟 آفرین ادیب جوان! درست نوشتی.</b><br>${esc(t.why)}`, 'ok');
        companionAfterSolve(ch, already);
      } else {
        playTone('err');
        profile.combo = 0;
        saveState();
        drawTask(`<b>🤔 دوباره به معنی واژه در جمله دقت کن:</b><br>${esc(t.hint)}`, 'err');
      }
    };

    if ($('btnNext')) {
      $('btnNext').onclick = () => {
        if (qi < ch.tasks.length - 1) {
          openTask(ci, qi + 1);
        } else {
          reportUnit(ch);
          if (ci < D.chapters.length - 1) openLesson(ci + 1);
          else renderCertificate();
        }
      };
    }
  }

  function renderLexicon() {
    W()?.stopAudio?.();
    const q = searchQuery.trim();
    const list = D.lexicon.filter((item) => !q || item.a.includes(q) || item.b.includes(q) || item.tip.includes(q));

    main.innerHTML = `
      <div class="paper-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <h2 style="margin:0">📖 فرهنگ‌نامهٔ جیبی واژگان هم‌آوای پایهٔ پنجم</h2>
          <button type="button" class="btn-primary" id="lexBackMap">🗺️ بازگشت به نقشهٔ فصل‌ها</button>
        </div>
        <div style="margin-bottom:14px">
          <label for="lexSearchInput"><b>جستجوی سریع واژه (مثلاً گزاردن، حیاط، خوار، ثواب):</b></label><br>
          <input id="lexSearchInput" type="search" value="${esc(searchQuery)}" placeholder="نام واژه را بنویس..." style="margin-top:6px;min-height:44px;padding:8px 14px;border-radius:12px;border:1px solid var(--line);width:min(360px,100%);background:var(--bg)">
        </div>
        <div class="pairs-grid">
          ${list.map((p) => `
            <article class="pair-card">
              <div class="pair-words">${esc(p.a)}<br>⚡ ${esc(p.b)}</div>
              <span class="mnemonic-pill">💡 ${esc(p.tip)}</span>
            </article>
          `).join('')}
        </div>
      </div>
    `;

    $('lexBackMap').onclick = renderMap;
    $('lexSearchInput').oninput = (e) => {
      searchQuery = e.target.value;
      renderLexicon();
      const inp = $('lexSearchInput');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    };
  }

  function renderCertificate() {
    const done = totalSolved();
    const pct = Math.round((done / allTasks.length) * 100);
    const stars = totalStars();
    const w = W();
    w?.stopAudio?.();
    const lessonsRead = D.chapters.filter((c) => profile.lessons[c.id]).length;
    const guidedCount = allTasks.filter((t) => profile.done[t.id]?.guided).length;
    const fullChapters = D.chapters.filter((c) => chapterSolved(c) === c.tasks.length).length;
    main.innerHTML = `
      <div class="no-print" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <button type="button" id="certBackMap">🗺️ بازگشت به تالار فصل‌ها</button>
        <button type="button" class="btn-primary" id="btnPrintCert">🖨️ چاپ استاندارد A4 / ذخیرهٔ PDF</button>
      </div>
      <article class="cert-sheet hw-cert" aria-label="گواهی‌نامهٔ مهارت هم‌آواستان">
        <div class="hw-cert-top" style="border-bottom:2px dashed #e5d3a5;padding-bottom:14px;margin-bottom:6px">
          ${w ? w.seal('هم‌آواستان', done === allTasks.length ? 'مهر استادی املا' : 'مهر پیشرفت') : ''}
          <div style="text-align:center">
            <div style="font-size:0.85rem;font-weight:800;color:#615041">حکیمستان · تالار فارسی و نگارش پایهٔ پنجم</div>
            <h2 style="margin:6px 0;font-size:1.7rem">${done === allTasks.length ? 'گواهی‌نامهٔ استادی هم‌آواها و درست‌نویسی' : 'گواهی‌نامهٔ پیشرفت هم‌آواستان'}</h2>
            <div style="font-size:.9rem;color:#5a4a2a">این گواهی‌نامه با افتخار تقدیم می‌شود به</div>
            <div class="cert-student-name" style="color:#8c3b19;margin:4px 0">${esc(profile.name)}</div>
            <div>رتبهٔ ادبی: <b>${esc(rankTitle())}</b> · پیشرفت: <b>${fa(pct)}٪</b></div>
          </div>
          ${w ? w.certHakim('') : ''}
        </div>
        ${w ? w.certStats([
          { icon: '⭐', value: fa(stars) + ' / ' + fa(D.chapters.length * 3), label: 'ستاره' },
          { icon: '✍️', value: fa(done) + ' / ' + fa(allTasks.length), label: 'چالش حل‌شده' },
          { icon: '📜', value: fa(fullChapters) + ' / ' + fa(D.chapters.length), label: 'فصل کامل' },
          { icon: '💎', value: fa(profile.xp), label: 'امتیاز' }
        ]) : ''}
        <h3 style="margin:0 0 8px;font-size:1rem">فهرست مهارت‌های شش‌گانهٔ هم‌آواها و درست‌نویسی پنجم:</h3>
        <ul class="cert-skills-grid">
          ${D.chapters.map((c) => {
            const s = chapterSolved(c);
            const full = s === c.tasks.length;
            return `<li class="${full ? 'mastered' : ''}"><b>${full ? '☑' : '☐'} ${esc(c.title)}</b><br><small>${fa(s)} از ${fa(c.tasks.length)} چالش (${esc(c.badge)})</small></li>`;
          }).join('')}
        </ul>
        <div class="hw-cert-quote"><span class="hw-cert-hakim-face" data-hk-face="happy" aria-hidden="true"></span>
          <p><b>حکیم:</b> ${done === allTasks.length ? 'آفرین سرویراستار! حالا فرق «گذاردن» و «گزاردن» و همهٔ هم‌آواهای پنجم را می‌دانی. قلمت همیشه درست‌نویس باشد!' : 'هر فصلی که کامل شود، یک نشان 🏅 کنار مهارتش می‌نشیند. با رمزها و هم‌خانواده‌ها ادامه بده!'}</p></div>
        <div class="hw-cert-foot">
          <div class="hw-cert-date"><span>تاریخ صدور: <b>${new Date().toLocaleDateString('fa-IR')}</b></span><span>${fa(lessonsRead)} درسنامهٔ کامل · ${fa(guidedCount)} پاسخ با راهنما</span></div>
          ${w ? w.signature('مهدی شریفیان', 'طراح آموزشی و توسعه‌دهنده · حکیمستان') : '<span>طراحی آموزشی: مهدی شریفیان · حکیمستان</span>'}
        </div>
        <p class="hw-cert-note">این گواهی بر پایهٔ پیشرفت ذخیره‌شده در همین دستگاه صادر شده و مدرک رسمی نیست.</p>
      </article>
    `;
    w?.bind(main, {});
    $('certBackMap').onclick = renderMap;
    $('btnPrintCert').onclick = () => window.print();
  }

  if ($('mapNavBtn')) $('mapNavBtn').onclick = renderMap;
  if ($('lexNavBtn')) $('lexNavBtn').onclick = renderLexicon;
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
      ? 'از فصل اول شروع کن؛ اول درسنامه را با دقت ببین، بعد تمرین‌ها را حل کن. هر جا گیر کردی، دکمهٔ راهنما را بزن!'
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
  HC()?.mount({ gameId: GAME_ID, music: 'music6.mp3', name: profile.name, intro: "سلام ادیب جوان! من حکیمم. هر جفت هم‌آوا یک «رمز یادیار» دارد؛ اول رمز را بخوان، بعد واژهٔ درست را در جمله پیدا کن." });
  renderMap();

  window.HamavaApp = {
    getState: () => profile,
    openLesson,
    openTask,
    renderLexicon,
    renderCertificate
  };
})();
