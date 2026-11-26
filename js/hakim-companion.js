/*
 * حکیم همراه — اتصال یکسان بازی‌های مرحله‌ای به حکیم کور (hakim-core.js)
 * ─────────────────────────────────────────────────────────────────────
 * ۱) شخصیت حکیم: چهرهٔ SVG در نشان بالای صفحه + پنل گفت‌وگوی شناور که به
 *    پاسخ درست/نادرست، پایان ایستگاه و پایان کل بازی واکنش نشان می‌دهد.
 * ۲) ردیاب پنل معلم: نگاشت فیلدها به قالب استاندارد Hakim.saveAnswer /
 *    Hakim.saveSession (game_id، student_name، is_correct، …) تا نتیجه‌ها
 *    با نام درست بازی و دانش‌آموز در پنل معلم ثبت شوند؛ گزارش هر ایستگاه
 *    در هر نوبت بازی فقط یک بار فرستاده می‌شود.
 * بدون hakim-core هیچ خطایی رخ نمی‌دهد و بازی عادی کار می‌کند.
 */
(function (global) {
  'use strict';

  var H = function () { return global.Hakim; };
  var state = { ready: false, profile: null, taskStartedAt: Date.now(), gameId: '', sentSessions: {}, lastStageSaid: '' };

  function injectStyles() {
    if (document.getElementById('hkCompanionStyles')) return;
    var css = [
      '.hk-companion{position:fixed;z-index:70;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));',
      'width:min(430px,calc(100vw - 84px));pointer-events:none}',
      '.hk-companion .hakim-panel,.hk-companion .hakim-panel *{pointer-events:none!important}',
      '.hk-companion .hakim-panel{margin:0;opacity:.97}',
      '.hk-companion .hakim-text{font-size:.95rem;line-height:1.85}',
      '@media (max-width:560px){.hk-companion{width:min(340px,calc(100vw - 84px))}.hk-companion .hakim-avatar{width:48px;height:48px}',
      '.hk-companion .hakim-panel{padding:8px 10px;gap:8px;border-radius:16px}.hk-companion .hakim-name{display:none}',
      '.hk-companion .hakim-text{font-size:.86rem;line-height:1.7}}',
      '@media print{.hk-companion{display:none!important}}',
      '.brand-badge.hk-face-badge{padding:0;overflow:hidden;font-size:0;',
      'background:radial-gradient(circle at 30% 28%,#ffe9b0 0%,#e9b44c 45%,#8a5a1a 100%)!important;',
      'box-shadow:0 4px 14px rgba(138,90,26,.35),inset 0 -3px 6px rgba(0,0,0,.25)}',
      '.brand-badge.hk-face-badge svg{width:118%;height:118%;margin-top:6%}',
      '.hk-guide{display:flex;gap:12px;align-items:center;margin:14px 0 0;padding:10px 14px;border-radius:16px;',
      'background:linear-gradient(135deg,rgba(91,74,158,.10),rgba(233,180,76,.14));border:1px solid rgba(91,74,158,.22)}',
      '.hk-guide-face{width:56px;height:56px;flex-shrink:0;border-radius:50%;overflow:hidden;',
      'background:radial-gradient(circle at 30% 28%,#ffe9b0 0%,#e9b44c 45%,#8a5a1a 100%);box-shadow:0 4px 12px rgba(91,74,158,.25)}',
      '.hk-guide-face svg{width:118%;height:118%;margin:-4% 0 0 -9%}',
      '.hk-guide p{margin:0;font-size:.92rem;line-height:1.8}',
      '.hk-guide b{color:#5b4a9e}',
      'html[data-theme="night"] .hk-guide b,body.night .hk-guide b,.theme-night .hk-guide b{color:#c4b5fd}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'hkCompanionStyles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /** چهرهٔ حکیم را داخل یک عنصر می‌کشد (مثلاً نشان برند). */
  function face(el, mood) {
    var h = H();
    if (!el || !h || typeof h.renderFace !== 'function') return false;
    try {
      h.renderFace(mood || 'wise', el);
      var svg = el.querySelector('svg');
      if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('role'); }
      return true;
    } catch (_) { return false; }
  }

  /** کارت کوچک «حکیم می‌گوید» برای صفحه‌های خانه و درسنامه. */
  function guideHtml(text) {
    return '<div class="hk-guide" role="note"><div class="hk-guide-face" data-hk-face="wise" aria-hidden="true"></div>' +
      '<p><b>حکیم:</b> ' + String(text || '').replace(/[<>&]/g, function (c) { return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'; }) + '</p></div>';
  }

  /** همهٔ جای‌خالی‌های چهره را (پس از هر رندر) پر می‌کند. */
  function paintFaces(root) {
    var scope = root || document;
    var list = scope.querySelectorAll ? scope.querySelectorAll('[data-hk-face]') : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute('data-hk-painted') === '1') continue;
      if (face(list[i], list[i].getAttribute('data-hk-face'))) list[i].setAttribute('data-hk-painted', '1');
    }
  }

  /** کارت «حکیم می‌گوید» را زیر دکمه‌های قهرمان صفحهٔ خانه می‌گذارد. */
  function decorateHome(container, text) {
    if (typeof document === 'undefined' || !container || !text) return;
    injectStyles();
    var anchor = container.querySelector('.hero-actions');
    if (!anchor || container.querySelector('.hk-guide')) return;
    anchor.insertAdjacentHTML('afterend', guideHtml(text));
    paintFaces(container);
  }

  function mount(opts) {
    opts = opts || {};
    state.gameId = opts.gameId || state.gameId;
    var h = H();
    if (!h || typeof h.init !== 'function' || typeof document === 'undefined') return false;
    injectStyles();
    try {
      var host = document.getElementById('hkCompanion');
      if (!host) {
        host = document.createElement('div');
        host.id = 'hkCompanion';
        host.className = 'hk-companion';
        document.body.appendChild(host);
      }
      h.init({ container: host, name: opts.name || 'دوست من', font: false, autoHideMs: 5200 });
      if (h.setName && opts.name) h.setName(opts.name);
      state.profile = typeof h.createProfile === 'function' ? h.createProfile() : null;
      state.ready = true;
      // پنل هرگز جلوی کلیک را نمی‌گیرد؛ هر لمس روی صفحه پیام را می‌بندد و به دکمهٔ زیرین می‌رسد.
      if (!state.dismissBound) {
        state.dismissBound = true;
        document.addEventListener('pointerdown', function () {
          var p = document.querySelector('#hkCompanion .hakim-panel.active');
          if (p && h.hide) h.hide();
        }, { capture: true, passive: true });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && h.hide) h.hide(); });
      }
      var badge = document.querySelector('.brand-badge');
      if (badge && face(badge, 'wise')) badge.classList.add('hk-face-badge');
      if (opts.intro) {
        var key = 'hk_companion_intro_' + state.gameId;
        var seen = false;
        try { seen = global.sessionStorage && sessionStorage.getItem(key) === '1'; } catch (_) {}
        if (!seen) {
          setTimeout(function () { say(opts.intro, 'wise'); }, 900);
          try { sessionStorage.setItem(key, '1'); } catch (_) {}
        }
      }
      paintFaces(document);
      return true;
    } catch (_) { return false; }
  }

  function say(text, mood) {
    var h = H();
    if (!state.ready || !h || typeof h.say !== 'function') return;
    try { h.say(String(text || ''), { mood: mood || 'normal' }); } catch (_) {}
  }

  function setName(name) {
    var h = H();
    if (h && h.setName && name) { try { h.setName(name); } catch (_) {} }
  }

  function taskStart() { state.taskStartedAt = Date.now(); streak.wrong = 0; }

  var PHRASES = {
    correct: ['آفرین {name}! درست بود.', 'کارت درسته؛ خوب فکر کردی.', 'درست گفتی! معلومه که خوب یاد گرفتی.', 'عالی بود {name}! برو سراغ بعدی.'],
    correctFast: ['چه سریع و دقیق! آفرین {name} ⚡', 'هم تند، هم درست؛ عالیه!'],
    correctSlow: ['آفرین که با حوصله فکر کردی؛ دقت از سرعت مهم‌تره.', 'کمی طول کشید ولی کاملاً درست بود؛ همین‌طور با دقت ادامه بده.'],
    recovery: ['آفرین {name}! بعد از اشتباه، محکم برگشتی 💪', 'دیدی؟ از اشتباه یاد گرفتی و درستش کردی!'],
    streak3: ['سه پاسخ درست پشت سر هم! داری گرم می‌شی {name} 🔥', 'سه تا پشت هم! عالیه، ادامه بده!'],
    streak5: ['پنج پاسخ درست پیاپی! {name}، تو استاد این بخشی 👑', 'بی‌نظیر! پنج تا پشت سر هم!'],
    wrong: ['اشکالی نداره {name}؛ اشتباه هم بخشی از یادگیریه.', 'نزدیک بودی! نکتهٔ زیر سؤال رو بخون و دوباره امتحان کن.', 'نگران نباش؛ یه بار دیگه با دقت نگاه کن.'],
    wrongAgain: ['دکمهٔ راهنما رو بزن؛ با هم قدم‌به‌قدم حلش می‌کنیم.', 'بیا یه بار دیگه درسنامه رو مرور کنیم؛ جواب همون‌جاست!'],
    stage: ['ایستگاه «{stage}» کامل شد! یک ستارهٔ دیگه در آسمان دانشت روشن شد 🌟', 'آفرین {name}! «{stage}» رو تموم کردی؛ برو سراغ ایستگاه بعدی.'],
    stagePerfect: ['«{stage}» رو بدون حتی یک راهنمایی تموم کردی! این یعنی تسلط واقعی 👑']
  };
  var streak = { ok: 0, wrong: 0, wasWrong: false, recoveries: 0 };

  function pick(arr, vars) {
    var txt = arr[Math.floor(Math.random() * arr.length)] || '';
    var h = H();
    var name = (vars && vars.name) || (h && h.getName ? h.getName() : '') || 'دوست من';
    return txt.replace(/\{name\}/g, name).replace(/\{stage\}/g, (vars && vars.stage) || '');
  }

  /** واکنش حکیم به پاسخ (عبارت‌های عمومی و مناسب همهٔ درس‌ها). */
  function answer(correct) {
    var h = H();
    if (!state.ready || !h) return;
    var secs = Math.max(1, Math.round((Date.now() - state.taskStartedAt) / 1000));
    try {
      if (correct) {
        streak.ok++;
        streak.wrong = 0;
        if (streak.ok === 5) { say(pick(PHRASES.streak5), 'excited'); if (h.burstConfetti) h.burstConfetti(document.querySelector('#hkCompanion .hakim-panel')); }
        else if (streak.ok === 3) say(pick(PHRASES.streak3), 'excited');
        else if (streak.wasWrong && streak.recoveries < 3) { streak.recoveries++; say(pick(PHRASES.recovery), 'happy'); }
        else if (secs <= 8) say(pick(PHRASES.correctFast), 'wink');
        else if (secs >= 60) say(pick(PHRASES.correctSlow), 'wise');
        else say(pick(PHRASES.correct), 'happy');
        streak.wasWrong = false;
      } else {
        streak.ok = 0;
        streak.wrong++;
        streak.wasWrong = true;
        say(pick(streak.wrong >= 2 ? PHRASES.wrongAgain : PHRASES.wrong), 'thinking');
      }
    } catch (_) {}
  }

  function stageDone(title, perfect) {
    var h = H();
    if (!state.ready || !h || state.lastStageSaid === title) return;
    state.lastStageSaid = title;
    try {
      if (perfect && h.burstConfetti) h.burstConfetti(document.querySelector('#hkCompanion .hakim-panel'));
      say(pick(perfect ? PHRASES.stagePerfect : PHRASES.stage, { stage: String(title || '').replace(/^[^:]*:\s*/, '') }), perfect ? 'excited' : 'happy');
    } catch (_) {}
  }

  function finish(text) {
    var h = H();
    if (!state.ready || !h) return;
    try {
      if (text) {
        if (h.burstConfetti) h.burstConfetti(document.querySelector('#hkCompanion .hakim-panel'));
        say(text, 'excited');
      } else if (h.celebrate) h.celebrate('win');
    } catch (_) {}
  }

  /* ───────────── ردیاب پنل معلم ───────────── */

  function reportAnswer(o) {
    var h = H();
    if (!h || typeof h.saveAnswer !== 'function' || !o) return;
    try {
      h.saveAnswer({
        student_name: o.name || 'دانش‌آموز',
        game_id: o.gameId || state.gameId,
        stage: o.stage || '',
        question_id: o.questionId || '',
        question_num: o.questionNum != null ? o.questionNum : undefined,
        question_text: o.questionText || '',
        student_answer: o.studentAnswer != null ? String(o.studentAnswer) : '',
        correct_answer: o.correctAnswer != null ? String(o.correctAnswer) : '',
        is_correct: !!o.isCorrect,
        attempts: o.attempts || 1,
        time_taken: Math.max(0, Math.round((Date.now() - state.taskStartedAt) / 1000)),
        diagnostic: o.diagnostic || ''
      });
    } catch (_) {}
  }

  /** گزارش پایان ایستگاه — در هر نوبت بازی برای هر ایستگاه فقط یک بار. */
  function reportStage(o) {
    var h = H();
    if (!h || typeof h.saveSession !== 'function' || !o) return false;
    var key = (o.gameId || state.gameId) + '|' + (o.stageId || o.stage) + '|' + o.solved;
    if (state.sentSessions[key]) return false;
    state.sentSessions[key] = true;
    var total = Math.max(1, Number(o.total) || 1);
    var solved = Math.max(0, Number(o.solved) || 0);
    try {
      h.saveSession({
        student_name: o.name || 'دانش‌آموز',
        game_id: o.gameId || state.gameId,
        experiment_id: o.stageId || '',
        duration: Math.max(1, Math.round(o.durationSec || 0)),
        score: Math.round((solved / total) * 100),
        stars: Math.round(o.stars || 0),
        completed: solved >= total,
        attempts: 1,
        details: { stage: o.stage || '', solved: solved, total: total, xp: o.xp || 0, guided: o.guided || 0 },
        started_at: o.startedAt ? new Date(o.startedAt).toISOString() : undefined
      });
      return true;
    } catch (_) { return false; }
  }

  global.HakimCompanion = {
    mount: mount,
    say: say,
    setName: setName,
    taskStart: taskStart,
    answer: answer,
    stageDone: stageDone,
    finish: finish,
    face: face,
    guideHtml: guideHtml,
    decorateHome: decorateHome,
    paintFaces: paintFaces,
    reportAnswer: reportAnswer,
    reportStage: reportStage
  };
})(typeof window !== 'undefined' ? window : this);
