/* ═══════════════════════════════════════════════════════════════
   جعبه‌ابزار صحنه‌های حکیمستان (HakimScene)
   ابزار مشترک «دنیاهای» متحرک بازی‌ها: افکت‌های صوتی ساخته‌شده با
   WebAudio (بدون فایل)، کارت ایستگاه، بنر رسیدن، کاغذرنگی و قاب صحنه.
   هر بازی استعارهٔ تصویری خودش را می‌سازد و فقط از این ابزارها کمک می‌گیرد.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const fa = (v) => String(v ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const faNum = (n) => fa(Math.round(n).toLocaleString('en-US').replace(/,/g, '٬'));
  const faDec = (n, d = 1) => fa((Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', '٫'));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => { try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  const shortTitle = (t) => String(t || '').replace(/^[^:]*:\s*/, '').replace(/\s*\((?:درس|مرور)[^)]*\)\s*$/, '');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ───────────── افکت‌های صوتی (فقط وقتی صدای بازی روشن است) ───────────── */
  let AC = null;
  function ac() {
    if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return AC; }
    const C = global.AudioContext || global.webkitAudioContext;
    if (!C) return null;
    try { AC = new C(); } catch (_) { AC = null; }
    return AC;
  }
  function noiseBuf(a, sec) {
    const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * sec)), a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function tone(a, { type = 'sine', f = 440, f2 = null, t = 0, dur = 0.15, vol = 0.12, attack = 0.005 }) {
    const o = a.createOscillator(), g = a.createGain();
    const t0 = a.currentTime + t;
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(a, { t = 0, dur = 0.2, vol = 0.12, type = 'bandpass', f = 1200, f2 = null, q = 0.8 }) {
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    const t0 = a.currentTime + t;
    s.buffer = noiseBuf(a, dur + 0.05);
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl).connect(g).connect(a.destination);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  function sfx(enabled) {
    const on = () => { try { return Boolean(enabled && enabled()); } catch (_) { return false; } };
    const run = (fn) => { if (!on()) return; const a = ac(); if (a) try { fn(a); } catch (_) {} };
    let motor = null;
    return {
      tick: () => run((a) => tone(a, { type: 'square', f: 1900, dur: 0.025, vol: 0.05 })),
      pop: () => run((a) => tone(a, { f: 520, f2: 980, dur: 0.12, vol: 0.12 })),
      clank: () => run((a) => { tone(a, { type: 'triangle', f: 330, f2: 180, dur: 0.22, vol: 0.14 }); tone(a, { type: 'square', f: 880, f2: 600, dur: 0.06, vol: 0.05 }); noise(a, { dur: 0.08, vol: 0.08, f: 3000 }); }),
      hammer: (n = 3) => run((a) => { for (let i = 0; i < n; i++) { tone(a, { type: 'triangle', f: 260, f2: 140, t: i * 0.16, dur: 0.1, vol: 0.13 }); noise(a, { t: i * 0.16, dur: 0.05, vol: 0.07, f: 2500 }); } }),
      thump: () => run((a) => { tone(a, { f: 150, f2: 45, dur: 0.3, vol: 0.28 }); noise(a, { dur: 0.08, vol: 0.06, type: 'lowpass', f: 600 }); }),
      whoosh: () => run((a) => noise(a, { dur: 0.45, vol: 0.09, f: 400, f2: 2600, q: 0.6 })),
      paper: () => run((a) => { noise(a, { dur: 0.22, vol: 0.12, f: 900, f2: 3800, q: 0.5 }); noise(a, { t: 0.12, dur: 0.16, vol: 0.07, type: 'highpass', f: 2500 }); }),
      scratch: (n = 5) => run((a) => { for (let i = 0; i < n; i++) noise(a, { t: i * 0.09 + Math.random() * 0.03, dur: 0.06, vol: 0.045, type: 'highpass', f: 3500 + Math.random() * 1500 }); }),
      chime: () => run((a) => [1046.5, 1318.5, 1568].forEach((f, i) => tone(a, { f, t: i * 0.09, dur: 0.5, vol: 0.09 }))),
      lock: () => run((a) => { tone(a, { type: 'square', f: 196, dur: 0.12, vol: 0.07 }); tone(a, { type: 'square', f: 147, t: 0.13, dur: 0.18, vol: 0.07 }); }),
      fanfare: () => run((a) => [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tone(a, { type: 'triangle', f, t: i * 0.12, dur: i === 5 ? 0.6 : 0.16, vol: 0.12 }))),
      motorStart: (base = 70) => {
        if (!on() || motor) return;
        const a = ac(); if (!a) return;
        try {
          const o = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain();
          o.type = 'sawtooth'; o.frequency.value = base; fl.type = 'lowpass'; fl.frequency.value = 420;
          g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 0.15);
          o.connect(fl).connect(g).connect(a.destination); o.start();
          motor = { o, g, a, base };
        } catch (_) { motor = null; }
      },
      motorPitch: (v) => { if (motor) try { motor.o.frequency.setTargetAtTime(motor.base * (1 + v), motor.a.currentTime, 0.08); } catch (_) {} },
      motorStop: () => {
        if (!motor) return;
        const m = motor; motor = null;
        try { m.g.gain.setTargetAtTime(0.0001, m.a.currentTime, 0.06); m.o.stop(m.a.currentTime + 0.3); } catch (_) {}
      }
    };
  }

  /* ───────────── کاغذرنگی و جرقه ───────────── */
  function confetti(host, xPct, yPct, opts = {}) {
    if (!host || reduced()) return;
    const box = document.createElement('div');
    box.className = 'hs-confetti';
    box.setAttribute('aria-hidden', 'true');
    box.style.left = xPct + '%'; box.style.top = yPct + '%';
    const colors = opts.colors || ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#fde047'];
    const n = opts.count || 26;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 50 + Math.random() * (opts.spread || 80);
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist - 30 + 'px');
      s.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.08 + 's';
      if (opts.glyph) { s.textContent = opts.glyph[i % opts.glyph.length]; s.className = 'is-glyph'; s.style.background = 'none'; }
      box.appendChild(s);
    }
    host.appendChild(box);
    setTimeout(() => box.remove(), 1600);
  }

  /* ───────────── کارت ایستگاه ─────────────
     u = { solved, total, stars, seen, locked, full, idx }  */
  function unitActions(u, labels = {}) {
    const lessonWord = labels.lesson || 'درسنامه';
    const taskWord = labels.tasks || 'تمرین‌ها';
    if (u.locked) return `<p class="hs-lock-note">🔒 ${esc(labels.lockedMsg || 'این مرحله هنوز قفل است؛ اول مرحلهٔ قبلی را کامل کن.')}</p>`;
    if (!u.seen) return `<button type="button" class="btn-primary hs-go" data-hs-lesson="${u.idx}">📖 شروع با ${esc(lessonWord)} ←</button>`;
    return `<div class="hs-btns"><button type="button" class="btn-soft" data-hs-lesson="${u.idx}">📖 ${esc(lessonWord)}</button>
      <button type="button" class="btn-primary" data-hs-play="${u.idx}">${u.full ? 'مرور ' + esc(taskWord) : '🎯 ' + esc(taskWord) + ' ←'}</button></div>`;
  }
  function card(o) {
    const pct = o.total ? Math.round((o.solved / o.total) * 100) : 0;
    return `<div class="hs-card ${o.locked ? 'is-locked' : ''} ${o.full ? 'is-full' : ''} ${o.cls || ''}">
      ${o.stamp ? `<div class="hs-stamp" aria-hidden="true">${esc(o.stamp)}</div>` : ''}
      <div class="hs-card-top"><span class="hs-card-icon" aria-hidden="true">${o.icon || ''}</span><div><small>${esc(o.kicker || '')}</small><h3>${esc(o.title || '')}</h3></div></div>
      ${o.sub ? `<p class="hs-card-sub">${esc(o.sub)}</p>` : ''}
      ${o.why ? `<p class="hs-card-why"><span aria-hidden="true">💡</span> ${esc(o.why)}</p>` : ''}
      ${o.extra || ''}
      ${o.total != null ? `<div class="hs-card-prog"><span class="hs-bar"><i style="width:${pct}%"></i></span><small>${fa(o.solved)} از ${fa(o.total)} ${esc(o.unitWord || 'تمرین')} · <span class="hs-stars" aria-label="${fa(o.stars || 0)} از ۳ ستاره">${'★'.repeat(o.stars || 0)}${'☆'.repeat(3 - (o.stars || 0))}</span></small></div>` : ''}
      ${o.actions || ''}
    </div>`;
  }
  function bindCard(el, ctx) {
    if (!el) return;
    el.querySelectorAll('[data-hs-lesson]').forEach((b) => { b.onclick = () => ctx.openLesson(Number(b.dataset.hsLesson)); });
    el.querySelectorAll('[data-hs-play]').forEach((b) => { b.onclick = () => ctx.openTask(Number(b.dataset.hsPlay)); });
  }

  /* ───────────── قاب صحنه ───────────── */
  function shell(o) {
    return `<section class="hs-wrap ${o.cls || ''}" id="${o.id}" aria-labelledby="${o.id}Title">
      <div class="hs-head">
        <div>
          <span class="hs-eyebrow">${o.eyebrow}</span>
          <h2 id="${o.id}Title" class="hs-title">${esc(o.title)}</h2>
          <p class="hs-sub">${esc(o.sub)}</p>
        </div>
        <div class="hs-dash" aria-label="${esc(o.dashLabel || 'پیشرفت')}">
          ${(o.gauges || []).map((g) => `<div class="hs-gauge"><span aria-hidden="true">${g.icon}</span><b${g.id ? ` id="${g.id}"` : ''}>${g.val}</b><small>${esc(g.label)}</small></div>`).join('')}
        </div>
      </div>
      <div class="hs-body">
        <div class="hs-stage">${o.stage}<div class="hs-banner" data-hs-banner hidden></div></div>
        <aside class="hs-side" data-hs-card aria-live="polite"></aside>
      </div>
      ${o.after || ''}
      <p class="hs-sr" data-hs-live aria-live="polite"></p>
    </section>`;
  }
  function banner(root, html, ms = 1700) {
    const b = root && root.querySelector('[data-hs-banner]');
    if (!b) return;
    clearTimeout(b._t);
    b.innerHTML = html;
    b.hidden = false;
    b.classList.remove('is-out');
    void b.offsetWidth;
    b.classList.add('is-in');
    b._t = setTimeout(() => { b.classList.add('is-out'); b._t = setTimeout(() => { b.hidden = true; b.classList.remove('is-in', 'is-out'); }, 380); }, ms);
  }
  function live(root, msg) { const l = root && root.querySelector('[data-hs-live]'); if (l) l.textContent = msg; }

  // دکمه‌های SVG: کلیک، Enter و فاصله
  function bindKeys(root, sel, fn) {
    root.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('click', (e) => { e.preventDefault(); fn(el); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(el); } });
    });
  }

  // نمونه‌برداری نرم: انیمیشن با requestAnimationFrame و تابع نرمی
  const ease = { out: (t) => 1 - Math.pow(1 - t, 3), inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  function tween(dur, fn, easeFn = ease.inOut) {
    return new Promise((resolve) => {
      if (reduced() || dur <= 0) { fn(1, 1); resolve(); return; }
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        fn(easeFn(t), t);
        if (t < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  global.HakimScene = { fa, faNum, faDec, esc, reduced, shortTitle, wait, sfx, confetti, card, unitActions, bindCard, shell, banner, live, bindKeys, tween, ease };
})(window);
