/* ============================================================
   حکیمستان — HakimCert: گواهی‌نامهٔ استاندارد A4 و چاپ تک‌صفحه‌ای
   ------------------------------------------------------------
   HakimCert.render(o) → HTML string of a standard certificate (see css/hakim-cert.css)
   HakimCert.mount(el, o) → render + fit the content to the sheet
   HakimCert.print()     → print only the certificate, on exactly one A4 page

   Print guard: on any page that loads this file, window.print() or Ctrl+P
   (via the beforeprint event) shows only the visible certificate. Old
   certificates (.cert-sheet, .certificate, ...) are scaled with zoom so
   they never spill onto a second page.

   Main fields of o:
     world, kind ('cert' | 'taqdir'), subtitle, name, grade, learnerCode,
     number, date, attachment, course, achievement, bodyHtml,
     stats[{icon,value,label}], skillsTitle, skills[{title,sub,done}],
     quote, seal{label,sub}, accent, accent2, note, ariaLabel
   ============================================================ */
(function (g) {
  'use strict';
  var doc = g.document;
  var fa = function (v) { return String(v == null ? '' : v).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var PAL = ['#4b3a8f', '#1f8a6e', '#d9822b', '#c2416b', '#2f6fb3'];

  function hash(s) {
    var h = 2166136261;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  /* stable learner code derived from the name (per device; not an official identifier) */
  function learnerCode(name) { return 'HK-' + String(hash(name) % 1000000).padStart(6, '0'); }
  function today() {
    try { return new Date().toLocaleDateString('fa-IR-u-nu-arabext', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch (_) { return new Date().toLocaleDateString('fa-IR'); }
  }

  var CORNER = '<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-linecap="round">' +
    '<path d="M58 6H14a8 8 0 0 0-8 8v44" stroke-width="1.6"/>' +
    '<path d="M50 11H17a6 6 0 0 0-6 6v33" stroke-width=".8" opacity=".8"/>' +
    '<path d="M24 6c0 10 8 18 18 18M6 24c10 0 18 8 18 18" stroke-width="1" opacity=".75"/>' +
    '</g><path d="M14 4l2.6 6.3L23 13l-6.4 2.6L14 22l-2.6-6.4L5 13l6.4-2.7z" fill="currentColor"/>' +
    '<circle cx="14" cy="13" r="2.2" fill="#fffcf3"/></svg>';

  function seal(label, sub, id) {
    var rays = '';
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2, a2 = a + Math.PI / 24;
      rays += (i ? 'L' : 'M') + (70 + 58 * Math.cos(a)).toFixed(1) + ' ' + (66 + 58 * Math.sin(a)).toFixed(1) + 'L' + (70 + 50 * Math.cos(a2)).toFixed(1) + ' ' + (66 + 50 * Math.sin(a2)).toFixed(1);
    }
    return '<div class="hk-a4-seal"><svg viewBox="0 0 140 170" role="img" aria-label="' + esc('نشان ' + label) + '" focusable="false"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1bf"/><stop offset=".45" stop-color="#f1c453"/><stop offset="1" stop-color="#b9822a"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d64545"/><stop offset="1" stop-color="#8e1f1f"/></linearGradient></defs>' +
      '<path d="M48 104l-16 58 24-11 12 20 14-60z" fill="url(#' + id + 'r)"/><path d="M92 104l16 58-24-11-12 20-14-60z" fill="url(#' + id + 'r)"/>' +
      '<path d="' + rays + 'Z" fill="url(#' + id + 'g)" stroke="#9a6a1f" stroke-width="1.2"/>' +
      '<circle cx="70" cy="66" r="44" fill="url(#' + id + 'g)" stroke="#8a5f1c" stroke-width="2"/>' +
      '<circle cx="70" cy="66" r="36" fill="none" stroke="#fff6dc" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<path d="M70 38l7.6 15.4 17 2.5-12.3 12 2.9 16.9L70 76.8 54.8 84.8l2.9-16.9-12.3-12 17-2.5z" fill="#7a5214"/>' +
      '<text x="70" y="101" text-anchor="middle" font-size="10" font-weight="900" font-family="Vazirmatn, Tahoma, sans-serif" fill="#5a3b0c">' + esc(label) + '</text>' +
      '</svg>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }

  var seq = 0;
  function render(o) {
    o = o || {};
    var L = g.HakimLogo;
    var id = 'hkc' + (++seq);
    var name = String(o.name || 'دانش‌آموز مهمان').trim();
    var kind = o.kind === 'taqdir' ? 'taqdir' : 'cert';
    var kindText = kind === 'taqdir' ? 'تقدیرنامه' : 'گواهی‌نامه';
    var grade = o.grade || 'پنجم دبستان';
    var code = o.learnerCode || learnerCode(name);
    var number = o.number || ('HK/' + fa(String(hash(name + (o.world || '')) % 9000 + 1000)));
    var date = o.date || today();
    var accent = o.accent || '#4b3a8f';
    var accent2 = o.accent2 || '#9a6a16';
    var body = o.bodyHtml || (
      '<p class="hk-a4-salute">با سلام و احترام،</p>' +
      '<p>بدین‌وسیله گواهی می‌شود دانش‌آموز گرامی <b class="hk-a4-name">' + esc(name) + '</b>، پایهٔ ' + esc(grade) +
      '، در ' + esc(o.course || ('دورهٔ آموزشی تعاملی «' + (o.world || 'حکیمستان') + '»')) + ' شرکت نموده و ' +
      esc(o.achievement || 'مراحل آن را با موفقیت پشت سر گذاشته') + ' است.</p>' +
      '<p>این ' + kindText + ' به پاس تلاش، پشتکار و روحیهٔ یادگیری ایشان صادر و تقدیم می‌گردد. امید است همواره در مسیر دانایی موفق و سربلند باشند.</p>'
    );
    var stats = (o.stats || []).slice(0, 4).map(function (s, i) {
      return '<div class="hk-a4-stat" style="--hk-c:' + PAL[(i + 1) % PAL.length] + '"><b>' + esc((s.icon ? s.icon + ' ' : '') + s.value) + '</b><small>' + esc(s.label) + '</small></div>';
    }).join('');
    var skills = (o.skills || []).map(function (s) {
      return '<li class="' + (s.done ? 'done' : '') + '"><i aria-hidden="true">' + (s.done ? '✔' : '○') + '</i><span><b>' + esc(s.title) + '</b>' +
        (s.sub ? '<small>' + esc(s.sub) + '</small>' : '') + '</span><span class="hk-sr">' + (s.done ? ' (کامل شده)' : ' (هنوز کامل نشده)') + '</span></li>';
    }).join('');
    var corners = ['tr', 'tl', 'br', 'bl'].map(function (c) { return '<span class="hk-a4-corner ' + c + '">' + CORNER + '</span>'; }).join('');

    return '<div class="hk-a4-wrap" data-hk-cert>' +
      '<article class="hk-a4" style="--hk-accent:' + accent + ';--hk-accent-2:' + accent2 + '" aria-label="' + esc(o.ariaLabel || (kindText + ' ' + (o.world || 'حکیمستان') + ' — ' + name)) + '">' +
      '<div class="hk-a4-frame" aria-hidden="true">' + corners + '</div>' +
      (L ? '<div class="hk-a4-mark" aria-hidden="true">' + L.emblem({ label: '' }).replace('role="img"', 'aria-hidden="true"') + '</div>' : '') +
      '<div class="hk-a4-in">' +
        '<header class="hk-a4-head">' +
          '<div class="hk-a4-box hk-a4-who"><div class="hk-a4-box-t">مشخصات دانش‌آموز</div><dl>' +
            '<div><dt>نام و نام خانوادگی:</dt><dd>' + esc(name) + '</dd></div>' +
            '<div><dt>پایه:</dt><dd>' + esc(grade) + '</dd></div>' +
            '<div><dt>کد یادگیرنده:</dt><dd class="ltr">' + esc(code) + '</dd></div>' +
          '</dl></div>' +
          '<div class="hk-a4-mid">' +
            '<span class="hk-a4-basmala">' + (L ? L.word('basmala', { fill: '#3a2c14', label: 'بسمه تعالی' }) : 'بسمه تعالی') + '</span>' +
            '<span class="hk-a4-emblem">' + (L ? L.emblem({ label: 'نشان حکیمستان' }) : '') + '</span>' +
            '<h2 class="hk-a4-title">' + (L ? L.word(kind, { fill: accent, label: kindText }) : kindText) + '</h2>' +
            (o.subtitle ? '<div class="hk-a4-sub">' + esc(o.subtitle) + '</div>' : '') +
          '</div>' +
          '<div class="hk-a4-box hk-a4-meta"><div class="hk-a4-box-t">مشخصات ' + kindText + '</div><dl>' +
            '<div><dt>تاریخ:</dt><dd>' + esc(date) + '</dd></div>' +
            '<div><dt>شماره:</dt><dd class="ltr">' + esc(number) + '</dd></div>' +
            '<div><dt>پیوست:</dt><dd>' + esc(o.attachment || (skills ? 'کارنامهٔ مهارت‌ها' : 'ندارد')) + '</dd></div>' +
          '</dl></div>' +
        '</header>' +
        '<div class="hk-a4-rule" aria-hidden="true"></div>' +
        '<section class="hk-a4-body">' + body + '</section>' +
        (stats ? '<div class="hk-a4-stats">' + stats + '</div>' : '') +
        (skills ? '<section class="hk-a4-skills"><h3>' + esc(o.skillsTitle || 'کارنامهٔ مهارت‌ها') + '</h3><ul>' + skills + '</ul></section>' : '') +
        '<div class="hk-a4-spacer"></div>' +
        (o.quote ? '<p class="hk-a4-quote"><b>حکیم:</b> ' + esc(o.quote) + '</p>' : '') +
        '<footer class="hk-a4-foot">' +
          seal((o.seal && o.seal.label) || o.world || 'حکیمستان', (o.seal && o.seal.sub) || '', id + 's') +
          '<div class="hk-a4-sign"><span class="hk-a4-sign-t">مهر و امضا</span>' +
            (L ? L.stacked({ label: 'لوگوی حکیمستان — مهر و امضای سامانه' }) : '') +
            '<b>سامانهٔ آموزشی حکیمستان</b><small>' + esc(o.program || 'سرزمین یادگیری') + '</small></div>' +
        '</footer>' +
        '<p class="hk-a4-note">' + esc(o.note || 'این گواهی بر پایهٔ پیشرفت ذخیره‌شده در همین دستگاه صادر شده و جنبهٔ تشویقی دارد؛ مدرک رسمی نیست.') + '</p>' +
      '</div></article></div>';
  }

  /* shrink the content (--hk-k) until it fits the sheet */
  function fit(root) {
    var list = root && root.classList && root.classList.contains('hk-a4') ? [root] : (root || doc).querySelectorAll('.hk-a4');
    Array.prototype.forEach.call(list, function (sheet) {
      var inner = sheet.querySelector('.hk-a4-in');
      if (!inner || !inner.clientHeight) return;
      var k = 1;
      sheet.style.setProperty('--hk-k', '1');
      for (var i = 0; i < 14 && inner.scrollHeight > inner.clientHeight + 1; i++) {
        k -= 0.035;
        sheet.style.setProperty('--hk-k', k.toFixed(3));
      }
    });
  }

  var ro = null;
  function mount(el, o) {
    if (!el) return null;
    el.innerHTML = render(o);
    var sheet = el.querySelector('.hk-a4');
    fit(sheet);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fit(sheet); });
    if (g.ResizeObserver) {
      if (!ro) ro = new ResizeObserver(function (en) { en.forEach(function (e) { fit(e.target); }); });
      ro.observe(sheet);
    }
    return sheet;
  }

  /* ───────────── Print guard ───────────── */
  var LEGACY = '.hk-a4-wrap, [data-hk-cert], .cert-sheet, .certificate, .cert-paper, .cert-card, .certificate-card, #certificate, #cert, .cert';
  function shown(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function findTarget() {
    var std = Array.prototype.filter.call(doc.querySelectorAll('.hk-a4-wrap'), shown);
    if (std.length) return std[0];
    var marked = Array.prototype.filter.call(doc.querySelectorAll('[data-hk-cert]'), shown);
    if (marked.length) return marked[0];
    var all = Array.prototype.filter.call(doc.querySelectorAll(LEGACY), function (el) {
      if (!shown(el)) return false;
      var p = el.parentElement;
      while (p) { if (p.matches && p.matches(LEGACY)) return false; p = p.parentElement; }
      return el.offsetHeight > 120;
    });
    all.sort(function (a, b) { return (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight); });
    return all[0] || null;
  }
  var PAGE_ID = 'hk-a4-page-rule';
  function pageRule(on) {
    var st = doc.getElementById(PAGE_ID);
    if (!on) { if (st) st.parentNode.removeChild(st); return; }
    if (!st) { st = doc.createElement('style'); st.id = PAGE_ID; st.textContent = '@page{size:A4 portrait;margin:0}'; }
    (doc.head || doc.documentElement).appendChild(st); /* last in the cascade */
  }
  function cleanup() {
    var h = doc.documentElement;
    pageRule(false);
    h.classList.remove('hk-a4-printing', 'hk-a4-std');
    Array.prototype.forEach.call(doc.querySelectorAll('[data-hk-print-path],[data-hk-print-target]'), function (el) {
      el.removeAttribute('data-hk-print-path');
      if (el.hasAttribute('data-hk-print-target')) { el.removeAttribute('data-hk-print-target'); el.style.removeProperty('--hk-fit'); }
    });
  }
  var preparedAt = 0;
  function prepare() {
    /* If print() prepared a target moments ago, keep it: when beforeprint fires,
       print media may already be active, and the page's own CSS may hide the certificate. */
    var prev = doc.querySelector('[data-hk-print-target]');
    if (prev && prev.isConnected && Date.now() - preparedAt < 4000) return 1;
    cleanup();
    var t = findTarget();
    if (!t) return null;
    var h = doc.documentElement;
    h.classList.add('hk-a4-printing');
    pageRule(true);
    preparedAt = Date.now();
    t.setAttribute('data-hk-print-target', '');
    for (var a = t.parentElement; a && a !== h; a = a.parentElement) a.setAttribute('data-hk-print-path', '');
    if (t.classList.contains('hk-a4-wrap')) { h.classList.add('hk-a4-std'); fit(t); return 1; }
    /* old certificate: measure its height at a width of 190mm and scale to 277mm */
    var c = t.cloneNode(true);
    c.removeAttribute('id');
    Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
    c.style.cssText += ';position:absolute;left:-12000px;top:0;visibility:hidden;width:190mm;max-width:none;min-height:0;height:auto;margin:0;zoom:1;transform:none;animation:none';
    (t.parentElement || doc.body).appendChild(c);
    var mm = c.getBoundingClientRect().width / 190 || 3.78;
    var hgt = Math.max(c.scrollHeight, c.getBoundingClientRect().height);
    c.parentNode.removeChild(c);
    var z = Math.min(1, (277 * mm) / (hgt * 1.04));
    t.style.setProperty('--hk-fit', z.toFixed(3));
    return z;
  }
  function print() { prepare(); g.print(); }

  if (g.addEventListener) {
    g.addEventListener('beforeprint', prepare);
    g.addEventListener('afterprint', function () { preparedAt = 0; setTimeout(cleanup, 50); });
  }

  g.HakimCert = { render: render, mount: mount, fit: fit, print: print, preparePrint: prepare, cleanupPrint: cleanup, learnerCode: learnerCode, fa: fa };
})(typeof window !== 'undefined' ? window : this);
