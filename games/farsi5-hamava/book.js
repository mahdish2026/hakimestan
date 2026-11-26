/* ═══════════════════════════════════════════════════════════════
   کتاب جادویی هم‌آواستان
   یک کتاب تذهیب‌شدهٔ ایرانی که روی میز باز می‌شود. صفحهٔ راست
   فهرست فصل‌هاست و صفحهٔ چپ تصویرِ فصل: جفتِ هم‌آوا با قلمِ پر
   نوشته می‌شود و با کامل شدن فصل، مُهر ویراستار پای صفحه می‌خورد.
   با لمس هر فصل، برگ‌ها مثل کتاب فارسی (از چپ به راست) ورق می‌خورند.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const K = global.HakimScene;
  if (!K) return;
  const { fa, esc } = K;

  const ORD = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم'];
  const INK = ['#1e3a8a', '#7c2d12', '#065f46', '#6b21a8', '#9f1239', '#0f172a'];

  let ctx = null, root = null, sfx = null, page = 0, flipping = false, opened = false;

  function unit(i) {
    const ch = ctx.chapters[i];
    const solved = ctx.solved(i), total = ch.tasks.length;
    return { idx: i, ch, solved, total, stars: ctx.stars(i), seen: ctx.seen(i) || solved > 0, locked: ctx.locked(i), full: solved >= total };
  }
  const n = () => ctx.chapters.length;
  function nextIdx() { const k = ctx.chapters.findIndex((c, i) => unit(i).solved < c.tasks.length); return k < 0 ? n() - 1 : k; }
  const word = (s) => String(s || '').replace(/\s*\(.*$/, '').trim();
  const meaning = (s) => { const m = String(s || '').match(/\(([^)]*)\)/); return m ? m[1] : ''; };
  const chTitle = (c) => K.shortTitle(c.title).replace(/\s*\([^)]*\)\s*$/, '');

  /* ───────────── صفحهٔ فهرست ───────────── */
  function tocHtml() {
    return `<div class="hb-toc-in">
      <h3 class="hb-toc-title">فهرست کتاب</h3>
      <ol class="hb-toc-list">
        ${ctx.chapters.map((c, i) => {
          const u = unit(i);
          const dots = Array.from({ length: u.total }, (_, k) => `<i class="${k < u.solved ? 'on' : ''}"></i>`).join('');
          const label = `فصل ${ORD[i]}: ${chTitle(c)} — ${u.locked ? 'قفل' : u.full ? 'کامل و مُهرشده' : fa(u.solved) + ' از ' + fa(u.total) + ' چالش'}`;
          return `<li><div class="hb-row ${u.locked ? 'is-locked' : ''} ${u.full ? 'is-full' : ''} ${i === page ? 'is-current' : ''}" data-hb-ch="${i}" role="button" tabindex="0" aria-label="${esc(label)}">
            <span class="hb-row-ic" aria-hidden="true">${u.locked ? '🔒' : c.icon}</span>
            <span class="hb-row-t"><b>فصل ${ORD[i]}</b><small>${esc(chTitle(c))}</small></span>
            <span class="hb-row-end" aria-hidden="true">${u.full ? '<span class="hb-mini-seal">✓</span>' : `<span class="hb-dots">${dots}</span>`}</span>
          </div></li>`;
        }).join('')}
      </ol>
    </div>`;
  }

  /* ───────────── صفحهٔ تصویرِ فصل ───────────── */
  function artHtml(i, animate) {
    const u = unit(i);
    const c = u.ch;
    const p = c.pairs && c.pairs[0] ? c.pairs[0] : { a: '', b: '' };
    const more = (c.pairs || []).slice(1, 4).map((q) => `<li><b>${esc(word(q.a))}</b> / <b>${esc(word(q.b))}</b></li>`).join('');
    const ink = INK[i % INK.length];
    const drops = Array.from({ length: u.total }, (_, k) => `<i class="${k < u.solved ? 'on' : ''}"></i>`).join('');
    return `<div class="hb-art-in ${animate ? 'is-writing' : ''} ${u.locked ? 'is-locked' : ''}" style="--ink:${ink}">
      <div class="hb-sarlowh"><span aria-hidden="true">${c.icon}</span> فصل ${ORD[i]}</div>
      <h3 class="hb-ch-title">${esc(chTitle(c))}</h3>
      <div class="hb-pair" aria-label="جفت هم‌آوا: ${esc(word(p.a))} و ${esc(word(p.b))}">
        <div class="hb-w hb-w1"><span class="hb-word">${esc(word(p.a))}</span><small>${esc(meaning(p.a))}</small></div>
        <div class="hb-amp" aria-hidden="true">≈</div>
        <div class="hb-w hb-w2"><span class="hb-word">${esc(word(p.b))}</span><small>${esc(meaning(p.b))}</small></div>
        <span class="hb-quill" aria-hidden="true">🪶</span>
      </div>
      <p class="hb-hint">هم‌صدا، امّا با دو املا و دو معنی!</p>
      ${more ? `<ul class="hb-more">${more}</ul>` : ''}
      <div class="hb-ink" aria-label="${fa(u.solved)} از ${fa(u.total)} چالش"><span>جوهر فصل:</span><span class="hb-drops">${drops}</span></div>
      ${u.full ? `<div class="hb-seal ${animate ? 'is-stamp' : ''}" aria-label="مُهر استادی این فصل"><span>مُهر<br>ویراستار</span><b>${'★'.repeat(u.stars || 0)}</b></div>` : ''}
      ${u.locked ? `<div class="hb-veil"><span class="hb-clasp" aria-hidden="true">🔒</span><p>این فصل با کامل شدن فصل ${ORD[i - 1] || ''} باز می‌شود.</p></div>` : ''}
    </div>`;
  }

  function bookHtml() {
    return `<div class="hb-desk">
      <div class="hb-book ${opened || K.reduced() ? '' : 'is-closed'}" id="hbBook">
        <div class="hb-page hb-page-r" id="hbToc">${tocHtml()}</div>
        <div class="hb-page hb-page-l">
          <div class="hb-art" id="hbArt">${artHtml(page, false)}</div>
          <div class="hb-leaves" id="hbLeaves" aria-hidden="true"></div>
          <div class="hb-cover" aria-hidden="true"><div class="hb-cover-face"></div><div class="hb-cover-back"></div></div>
        </div>
        <div class="hb-spine" aria-hidden="true"></div>
        <div class="hb-ribbon" aria-hidden="true"></div>
      </div>
      <div class="hb-candle" aria-hidden="true"><i class="hb-flame"></i></div>
      <div class="hb-inkpot" aria-hidden="true">🖋️</div>
    </div>`;
  }

  function render(c) {
    ctx = c;
    sfx = K.sfx(ctx.sound);
    page = nextIdx();
    const units = ctx.chapters.map((x, i) => unit(i));
    const sealed = units.filter((u) => u.full).length;
    const solved = units.reduce((a, u) => a + u.solved, 0), total = units.reduce((a, u) => a + u.total, 0);
    return K.shell({
      id: 'hbWrap', cls: 'hb-wrap', eyebrow: '📜 کتاب جادویی هم‌آواها',
      title: 'هر فصل، یک برگ از کتاب تذهیب‌شده',
      sub: 'از فهرست، فصلی را انتخاب کن تا برگ‌ها ورق بخورند. هر چالش درست، یک قطره جوهر به فصل می‌دهد و با کامل شدن فصل، مُهر ویراستار پای صفحه می‌خورد.',
      gauges: [
        { icon: '🔏', val: `${fa(sealed)} / ${fa(units.length)}`, label: 'فصل مُهرشده' },
        { icon: '💧', val: `${fa(solved)} / ${fa(total)}`, label: 'قطرهٔ جوهر' }
      ],
      stage: bookHtml()
    });
  }

  function showCard(i) {
    const card = root.querySelector('[data-hs-card]');
    if (!card) return;
    const u = unit(i);
    const p = u.ch.pairs && u.ch.pairs[0];
    card.innerHTML = K.card({
      stamp: u.full ? 'مُهر شد ✓' : u.locked ? 'قفل' : 'فصل ' + ORD[i],
      icon: u.ch.icon, kicker: `فصل ${ORD[i]} از ${fa(n())} · نشان «${u.ch.badge || ''}»`,
      title: chTitle(u.ch), sub: u.ch.subtitle, why: p && p.tip ? p.tip : '',
      solved: u.solved, total: u.total, stars: u.stars, unitWord: 'چالش', locked: u.locked, full: u.full,
      actions: K.unitActions(u, { tasks: 'چالش‌ها', lockedMsg: `این فصل هنوز قفل است؛ اول فصل ${ORD[i - 1] || ''} را کامل کن.` })
    });
    K.bindCard(card, ctx);
  }

  function setPage(i, animate) {
    page = i;
    const art = root.querySelector('#hbArt');
    if (art) art.innerHTML = artHtml(i, animate && !K.reduced());
    root.querySelectorAll('.hb-row').forEach((r) => r.classList.toggle('is-current', Number(r.dataset.hbCh) === i));
    if (animate && !K.reduced()) {
      sfx.scratch(7);
      if (unit(i).full) setTimeout(() => sfx.thump(), 1500);
    }
  }

  // ورق خوردن برگ‌ها: جلو = از چپ به راست (مثل کتاب فارسی)
  async function flipTo(i) {
    const steps = Math.min(4, Math.abs(i - page)) || 1;
    const fwd = i >= page;
    const host = root.querySelector('#hbLeaves');
    if (!host || K.reduced()) { setPage(i, false); return; }
    host.innerHTML = '';
    const leaves = [];
    for (let k = 0; k < steps; k++) {
      const lf = document.createElement('div');
      lf.className = 'hb-leaf ' + (fwd ? 'is-fwd' : 'is-back');
      lf.innerHTML = '<div class="hb-leaf-f"></div><div class="hb-leaf-b"></div>';
      lf.style.animationDelay = k * 0.14 + 's';
      lf.style.zIndex = String(10 + (fwd ? steps - k : k));
      host.appendChild(lf);
      leaves.push(lf);
      setTimeout(() => sfx.paper(), k * 140);
    }
    if (fwd) setPage(i, false);
    await K.wait(620 + steps * 140);
    if (!fwd) setPage(i, false);
    host.innerHTML = '';
    setPage(i, true);
  }

  async function select(i) {
    if (flipping) return;
    const u = unit(i);
    if (u.locked) {
      sfx.lock();
      const r = root.querySelector(`[data-hb-ch="${i}"]`);
      if (r) { r.classList.remove('is-shake'); void r.offsetWidth; r.classList.add('is-shake'); }
      showCard(i);
      ctx.lockedNotice(i);
      return;
    }
    flipping = true;
    root.classList.add('is-busy');
    showCard(i);
    K.live(root, `ورق زدن به فصل ${ORD[i]}`);
    if (i !== page) await flipTo(i); else setPage(i, true);
    flipping = false;
    root.classList.remove('is-busy');
    if (!u.seen) {
      K.banner(root, `🪶 فصل ${ORD[i]} نوشته شد؛ درسنامه باز می‌شود…`, 1500);
      setTimeout(() => { if (root && root.isConnected) ctx.openLesson(i); }, K.reduced() ? 300 : 1700);
    } else {
      K.banner(root, u.full ? `🔏 فصل ${ORD[i]} مُهر استادی خورده؛ برای مرور آماده‌ای؟` : `💧 ${fa(u.total - u.solved)} قطرهٔ جوهر دیگر تا مُهر فصل ${ORD[i]}`, 1800);
    }
  }

  // مُهرِ تازه برای فصلی که تازه کامل شده
  function sealPending() {
    const b = ctx.book;
    if (!b) return;
    if (!b.sealed || typeof b.sealed !== 'object') b.sealed = {};
    const s = b.sealed;
    const fresh = ctx.chapters.map((c, i) => i).filter((i) => unit(i).full && !s[ctx.chapters[i].id]);
    // بار اول فقط وضعیت فعلی ثبت می‌شود تا پیشرفت قدیمی یک‌جا جشن گرفته نشود
    const firstRun = !b.init;
    b.init = true;
    fresh.forEach((i) => { s[ctx.chapters[i].id] = true; });
    if (firstRun || !fresh.length) { if (firstRun || fresh.length) ctx.save(); return; }
    ctx.save();
    const i = fresh[fresh.length - 1];
    setTimeout(async () => {
      if (!root || !root.isConnected) return;
      if (page !== i) await flipTo(i); else setPage(i, true);
      setTimeout(() => {
        sfx.fanfare();
        K.confetti(root.querySelector('.hs-stage'), 30, 55, { count: 30, glyph: ['✦', '★', '❀', '✿'], colors: ['#b45309'] });
        K.banner(root, `🔏 مُهر ویراستار خورد! فصل ${ORD[i]} کامل شد و نشان «${esc(ctx.chapters[i].badge || '')}» مال توست.`, 2800);
        ctx.say?.(`آفرین ادیب! فصل ${ORD[i]} مُهر استادی خورد.`);
      }, 1500);
    }, opened ? 400 : 1500);
  }

  function mount(el, c) {
    ctx = c;
    sfx = K.sfx(ctx.sound);
    root = (el || document).querySelector('#hbWrap');
    if (!root) return;
    flipping = false;
    K.bindKeys(root, '[data-hb-ch]', (r) => select(Number(r.dataset.hbCh)));
    showCard(page);
    const book = root.querySelector('#hbBook');
    if (book && book.classList.contains('is-closed')) {
      setTimeout(() => { sfx.whoosh(); book.classList.add('is-opening'); }, 450);
      setTimeout(() => { book.classList.remove('is-closed', 'is-opening'); setPage(page, true); }, 1650);
      opened = true;
    } else {
      setPage(page, !opened);
      opened = true;
    }
    sealPending();
  }
  function goNext() {
    const i = nextIdx();
    if (root && root.isConnected) { root.scrollIntoView({ behavior: K.reduced() ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => select(i), K.reduced() ? 0 : 450); }
    else ctx.openLesson(i);
  }

  global.HamavaBook = { render, mount, goNext };
})(window);
