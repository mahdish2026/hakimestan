/*!
 * hakim-worlds.js — لایهٔ گرافیکی مشترک «دنیاهای» بازی‌های فاز ۵ حکیمستان
 * (پیمانه‌ستان، آمارستان، هم‌آواستان، ایران‌گرد کوچک)
 *
 *  • art(world, opts)        تصویرسازی برداری صفحهٔ اول هر دنیا + حکیم + برچسب‌های شناور
 *  • journey(units, opts)    «مسیر سفر» مرحله‌ای با گره‌های کامل/فعلی/بعدی
 *  • card(solved,total,i,n)  وضعیت، رنگ، نشان و نوار پیشرفت هر کارت ایستگاه
 *  • certBanner(opts)        بنر پایانی گواهی‌نامه با حلقهٔ پیشرفت
 *  • celebrate(opts)         جشن پایان هر ایستگاه (ستاره‌ها، نشان، کاغذرنگی، ادامهٔ مسیر)
 *  • isLocked/toast/steps     قفل مرحله‌ای «اول درسنامه»، پیام حکیم و گام‌شمار درسنامه
 *  • audioCard/bindAudio     پخش‌کنندهٔ گفتار فارسی حکیم با متن کامل (بدون پخش خودکار)
 *  • seal/signature/certHakim/certStats  مهر طلایی، امضا، چهرهٔ حکیم و کارت‌های آمار گواهی‌نامه
 *
 * بدون وابستگی؛ اگر بارگذاری نشود، بازی‌ها با ظاهر سادهٔ قبلی کار می‌کنند.
 */
(function (global) {
  'use strict';

  var fa = function (v) { return String(v == null ? '' : v).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var PALETTE = ['#7c5cff', '#14a597', '#ef9a2c', '#f0567a', '#2f9df4', '#9b6bff', '#22a861', '#f47b4f', '#25b9cc', '#e8b21c', '#e9579f'];
  function color(i) { return PALETTE[i % PALETTE.length]; }

  function shortTitle(t) {
    var s = String(t || '');
    var c = s.indexOf(':');
    if (c > -1 && c < 22) s = s.slice(c + 1);
    s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return s;
  }

  function stateOf(solved, total, idx, nextIdx, locked) {
    if (total && solved >= total) return 'done';
    if (locked) return 'locked';
    if (idx === nextIdx) return 'current';
    if (solved > 0) return 'progress';
    return 'todo';
  }

  /* ───────────── حلقهٔ پیشرفت ───────────── */
  var ringSeq = 0;
  function ring(pct, size, label) {
    var gid = 'hwRingGrad' + (++ringSeq);
    pct = Math.max(0, Math.min(100, Math.round(pct || 0)));
    size = size || 96;
    var r = 42, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<div class="hw-ring" style="--hw-ring:' + size + 'px" role="img" aria-label="' + esc((label || 'پیشرفت') + ': ' + fa(pct) + ' درصد') + '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f5a524"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="' + r + '" class="hw-ring-track"/>' +
      '<circle cx="50" cy="50" r="' + r + '" class="hw-ring-fill" stroke="url(#' + gid + ')" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/></svg>' +
      '<span class="hw-ring-num">' + fa(pct) + '٪</span>' + (label ? '<small>' + esc(label) + '</small>' : '') + '</div>';
  }

  /* ───────────── مسیر سفر ───────────── */
  function journey(units, o) {
    o = o || {};
    var n = units.length;
    var word = o.word || 'ایستگاه';
    var attr = o.attr || 'data-open-lesson';
    var doneCount = 0;
    units.forEach(function (u) { if (u.total && u.solved >= u.total) doneCount++; });
    var allDone = doneCount === n;
    var nextIdx = allDone ? n - 1 : Math.max(0, o.nextIdx || 0);
    var fill = n > 1 ? (allDone ? 100 : (nextIdx / (n - 1)) * 100) : 100;
    var pct = o.total ? (o.done / o.total) * 100 : (doneCount / n) * 100;
    var nodes = units.map(function (u, i) {
      var st = stateOf(u.solved, u.total, i, allDone ? -1 : nextIdx, u.locked);
      var title = shortTitle(u.title);
      var status = st === 'locked' ? 'قفل؛ اول ' + word + ' قبلی را کامل کن' : st === 'done' ? 'کامل شد' : st === 'current' ? 'پیشنهاد حکیم برای ادامه' : st === 'progress' ? fa(u.solved) + ' از ' + fa(u.total) + ' حل شده' : 'هنوز شروع نشده';
      return '<li class="hw-node" data-state="' + st + '" style="--hw-c:' + color(i) + '">' +
        (st === 'current' ? '<span class="hw-here" aria-hidden="true">تو اینجایی</span>' : '') +
        '<button type="button" ' + attr + '="' + i + '" aria-label="' + esc(word + ' ' + fa(i + 1) + ': ' + title + ' — ' + status) + '">' +
        '<span class="hw-dot" aria-hidden="true">' + (st === 'done' ? '✓' : st === 'locked' ? '🔒' : fa(i + 1)) + '</span></button>' +
        '<span class="hw-node-label" aria-hidden="true">' + esc(title) + '</span></li>';
    }).join('');
    return '<section class="hw-journey" aria-labelledby="hwJourneyTitle">' +
      '<div class="hw-journey-head"><div>' +
      '<span class="hw-eyebrow">مسیر سفر مرحله‌به‌مرحله</span>' +
      '<h2 id="hwJourneyTitle">' + esc(o.title || ('نقشهٔ ' + fa(n) + ' ' + word)) + '</h2>' +
      '<p>' + (allDone ? 'همهٔ ' + word + '‌ها را فتح کردی! هر وقت خواستی برای مرور برگرد.' :
        fa(doneCount) + ' از ' + fa(n) + ' ' + word + ' کامل شده · ' + word + ' پیشنهادی: «' + esc(shortTitle(units[nextIdx].title)) + '»') + '</p>' +
      '</div>' + ring(pct, 92, 'کل مسیر') + '</div>' +
      '<div class="hw-track-wrap"><ol class="hw-track" style="--hw-n:' + n + ';--hw-fill:' + fill.toFixed(1) + '%">' + nodes + '</ol></div>' +
      '</section>';
  }

  /* ───────────── اجزای کارت ایستگاه ───────────── */
  function card(solved, total, idx, nextIdx, locked) {
    var st = stateOf(solved, total, idx, nextIdx, locked);
    var pct = total ? Math.round((solved / total) * 100) : 0;
    var badge = st === 'locked' ? '<span class="hw-badge hw-badge-locked">🔒 قفل · اول مرحلهٔ قبل</span>' : st === 'done' ? '<span class="hw-badge hw-badge-done">✓ کامل شد</span>' :
      st === 'current' ? '<span class="hw-badge hw-badge-next">✨ پیشنهاد حکیم</span>' :
      st === 'progress' ? '<span class="hw-badge hw-badge-progress">در حال انجام</span>' : '';
    return {
      state: st,
      attrs: 'data-state="' + st + '" style="--hw-c:' + color(idx) + '"',
      num: '<span class="hw-num" aria-hidden="true">' + fa(idx + 1) + '</span>',
      badge: badge,
      bar: '<div class="hw-card-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div>'
    };
  }

  /* ───────────── بنر گواهی‌نامه ───────────── */
  function certBanner(o) {
    o = o || {};
    var left = Math.max(0, (o.total || 0) - (o.done || 0));
    var pct = o.total ? (o.done / o.total) * 100 : 0;
    var unit = o.taskWord || 'تمرین';
    var title = left === 0 ? 'تبریک! گواهی‌نامه‌ات آماده است' : (o.done ? 'فقط ' + fa(left) + ' ' + unit + ' تا گواهی‌نامه' : 'گواهی‌نامهٔ حکیم منتظر توست');
    var sub = left === 0 ? 'گواهی‌نامه را ببین، چاپ کن و به معلم و خانواده‌ات نشان بده.' : 'هر ' + (o.word || 'ایستگاه') + ' که کامل شود، یک نشان و ستاره به گواهی‌نامه‌ات اضافه می‌شود. عجله لازم نیست؛ فهمیدن مهم است.';
    return '<section class="hw-cert-banner" aria-labelledby="hwCertTitle">' +
      '<div class="hw-cert-trophy" aria-hidden="true">' + trophySvg() + '</div>' +
      '<div class="hw-cert-text"><span class="hw-eyebrow">پایان مسیر · گواهی‌نامهٔ حکیمستان</span>' +
      '<h2 id="hwCertTitle">' + esc(title) + '</h2><p>' + esc(sub) + '</p>' +
      '<div class="hw-cert-actions"><button type="button" class="hw-btn-gold" data-hw-cert>🏆 دیدن گواهی‌نامهٔ من</button>' +
      (left > 0 ? '<button type="button" class="hw-btn-ghost" ' + (o.attr || 'data-open-lesson') + '="' + (o.nextIdx || 0) + '">ادامهٔ مسیر ←</button>' : '') +
      '</div></div>' + ring(pct, 116, 'پیشرفت کل') + '</section>';
  }

  function trophySvg() {
    return '<svg viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="hwTro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset="1" stop-color="#e6a417"/></linearGradient></defs>' +
      '<path d="M18 8h28v10c0 9-6 16-14 16S18 27 18 18z" fill="url(#hwTro)" stroke="#a86f05" stroke-width="2"/>' +
      '<path d="M18 12H9c0 9 5 14 11 15M46 12h9c0 9-5 14-11 15" fill="none" stroke="#e6a417" stroke-width="3.5" stroke-linecap="round"/>' +
      '<rect x="28" y="34" width="8" height="10" fill="#e6a417"/><rect x="19" y="44" width="26" height="8" rx="3" fill="#8a5a06"/>' +
      '<path d="M32 14l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" fill="#fff6d0"/></svg>';
  }

  /* ───────────── تصویرسازی صفحهٔ اول ───────────── */
  function isoCubes(nx, ny, nz, s, ox, oy, colors) {
    var P = function (i, j, k) { return [ox + (i - j) * s * 0.866, oy + (i + j) * s * 0.5 - k * s]; };
    var pts = function (arr) { return arr.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
    var cubes = [];
    for (var k = 0; k < nz; k++) for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) cubes.push([i, j, k]);
    cubes.sort(function (a, b) { return a[2] - b[2] || (a[0] + a[1]) - (b[0] + b[1]); });
    return cubes.map(function (c) {
      var i = c[0], j = c[1], k = c[2];
      var top = [P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)];
      var left = [P(i, j + 1, k), P(i + 1, j + 1, k), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)];
      var right = [P(i + 1, j, k), P(i + 1, j + 1, k), P(i + 1, j + 1, k + 1), P(i + 1, j, k + 1)];
      var st = ' stroke="' + (colors[3] || 'rgba(0,0,0,.35)') + '" stroke-width="1.4" stroke-linejoin="round"';
      return '<polygon points="' + pts(left) + '" fill="' + colors[1] + '"' + st + '/>' +
        '<polygon points="' + pts(right) + '" fill="' + colors[2] + '"' + st + '/>' +
        '<polygon points="' + pts(top) + '" fill="' + colors[0] + '"' + st + '/>';
    }).join('');
  }

  var SCENES = {
    measure: function () {
      var grid = '';
      for (var x = 20; x < 400; x += 20) grid += '<line x1="' + x + '" y1="14" x2="' + x + '" y2="286" />';
      for (var y = 20; y < 290; y += 20) grid += '<line x1="14" y1="' + y + '" x2="396" y2="' + y + '" />';
      var ticks = '';
      for (var t = 0; t <= 30; t++) ticks += '<line x1="' + (52 + t * 10) + '" y1="306" x2="' + (52 + t * 10) + '" y2="' + (t % 5 === 0 ? 320 : 313) + '"/>';
      return '<svg class="hw-scene" direction="rtl" viewBox="0 0 410 340" role="img" aria-label="تصویر مکعب‌های واحد، لوزی، ذوزنقه و خط‌کش">' +
        '<rect x="8" y="8" width="394" height="284" rx="22" class="hw-paper"/>' +
        '<g class="hw-grid">' + grid + '</g>' +
        isoCubes(3, 3, 2, 26, 128, 92, ['#8ff0e1', '#22a596', '#137a6f', '#0b4f48']) +
        '<text x="128" y="250" class="hw-svg-cap" text-anchor="middle">۳ × ۳ × ۲ = ۱۸ مکعب واحد</text>' +
        '<g transform="translate(300 92)"><polygon points="0,-58 44,0 0,58 -44,0" fill="#ffd56b" stroke="#c9931a" stroke-width="3"/>' +
        '<line x1="0" y1="-58" x2="0" y2="58" class="hw-dash"/><line x1="-44" y1="0" x2="44" y2="0" class="hw-dash"/>' +
        '<text x="0" y="82" class="hw-svg-cap" text-anchor="middle">لوزی: قطر × قطر ÷ ۲</text></g>' +
        '<g transform="translate(300 214)"><polygon points="-56,32 56,32 30,-26 -26,-26" fill="#ff9c86" stroke="#c4553e" stroke-width="3"/>' +
        '<line x1="14" y1="-26" x2="14" y2="32" class="hw-dash"/></g>' +
        '<rect x="40" y="298" width="330" height="30" rx="8" fill="#ffcf5a" stroke="#c9931a" stroke-width="2"/>' +
        '<g stroke="#7a5200" stroke-width="2">' + ticks + '</g></svg>';
    },
    stats: function () {
      var bars = [62, 104, 82, 140, 118];
      var bx = 70;
      var barSvg = bars.map(function (h, i) {
        var x = bx + i * 52;
        return '<rect x="' + x + '" y="' + (250 - h) + '" width="34" height="' + h + '" rx="7" fill="url(#hwBar)"/>';
      }).join('');
      var line = bars.map(function (h, i) { return (bx + 17 + i * 52) + ',' + (250 - h - 22); }).join(' ');
      var dots = bars.map(function (h, i) { return '<circle cx="' + (bx + 17 + i * 52) + '" cy="' + (250 - h - 22) + '" r="7" fill="#fff" stroke="#f0567a" stroke-width="4"/>'; }).join('');
      return '<svg class="hw-scene" direction="rtl" viewBox="0 0 410 340" role="img" aria-label="تصویر نمودار ستونی، نمودار خط شکسته، خط میانگین، نمودار دایره‌ای و تاس">' +
        '<defs><linearGradient id="hwBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a48bff"/><stop offset="1" stop-color="#5b3fd1"/></linearGradient></defs>' +
        '<rect x="8" y="8" width="394" height="300" rx="22" class="hw-paper"/>' +
        '<text x="222" y="46" class="hw-svg-title" text-anchor="middle">فروش بستنی در یک هفته</text>' +
        '<line x1="52" y1="250" x2="352" y2="250" stroke="#4a3b7a" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="52" y1="250" x2="52" y2="70" stroke="#4a3b7a" stroke-width="3" stroke-linecap="round"/>' +
        barSvg +
        '<line x1="52" y1="148" x2="352" y2="148" stroke="#e8a20c" stroke-width="3" stroke-dasharray="8 6"/>' +
        '<rect x="282" y="132" width="66" height="22" rx="11" fill="#ffe7a3"/><text x="315" y="148" class="hw-svg-cap" text-anchor="middle">میانگین</text>' +
        '<polyline points="' + line + '" fill="none" stroke="#f0567a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>' + dots +
        '<g transform="translate(300 280) rotate(-12) scale(.78)"><rect x="-30" y="-30" width="60" height="60" rx="14" fill="#fff" stroke="#5b3fd1" stroke-width="3"/>' +
        '<circle cx="-14" cy="-14" r="6" fill="#5b3fd1"/><circle cx="14" cy="14" r="6" fill="#5b3fd1"/><circle cx="0" cy="0" r="6" fill="#f0567a"/>' +
        '<circle cx="14" cy="-14" r="6" fill="#5b3fd1"/><circle cx="-14" cy="14" r="6" fill="#5b3fd1"/></g>' +
        '<g transform="translate(58 62) scale(.82)"><circle r="34" fill="#25b9cc"/><path d="M0 0 L0 -34 A34 34 0 0 1 32.3 10.5 Z" fill="#ffcf5a"/>' +
        '<path d="M0 0 L32.3 10.5 A34 34 0 0 1 -20 27.5 Z" fill="#f0567a"/><circle r="10" fill="#fff"/></g></svg>';
    },
    hamava: function () {
      var tiles = [['ز', 46, 70, -10, '#ffd56b'], ['ذ', 92, 36, 8, '#fff2d4'], ['ض', 352, 54, 12, '#ffd56b'], ['ظ', 380, 120, -8, '#fff2d4'],
        ['ص', 30, 160, 6, '#fff2d4'], ['ث', 372, 214, -14, '#ffd56b'], ['ط', 58, 250, 10, '#ffd56b'], ['ح', 330, 276, 6, '#fff2d4']];
      var tileSvg = tiles.map(function (t) {
        return '<g transform="translate(' + t[1] + ' ' + t[2] + ') rotate(' + t[3] + ')"><rect x="-22" y="-22" width="44" height="44" rx="11" fill="' + t[4] + '" stroke="#b07a12" stroke-width="2.5"/>' +
          '<text y="10" text-anchor="middle" class="hw-tile-letter">' + t[0] + '</text></g>';
      }).join('');
      return '<svg class="hw-scene" direction="rtl" viewBox="0 0 410 340" role="img" aria-label="تصویر کتاب باز با دو واژهٔ هم‌آوای حلیم و هلیم و کاشی‌های حرف">' +
        '<ellipse cx="205" cy="292" rx="150" ry="16" fill="rgba(0,0,0,.18)"/>' +
        '<path d="M205 92 C160 70 100 70 62 84 L62 272 C100 258 160 258 205 282 Z" fill="#fffaf0" stroke="#c9a46a" stroke-width="3"/>' +
        '<path d="M205 92 C250 70 310 70 348 84 L348 272 C310 258 250 258 205 282 Z" fill="#fff6e6" stroke="#c9a46a" stroke-width="3"/>' +
        '<path d="M205 92 L205 282" stroke="#b98a4a" stroke-width="4"/>' +
        '<g class="hw-book-lines">' + [130, 214, 234, 250].map(function (y) { return '<path d="M84 ' + y + ' C120 ' + (y - 8) + ' 160 ' + (y - 8) + ' 190 ' + y + '"/><path d="M220 ' + y + ' C250 ' + (y - 8) + ' 290 ' + (y - 8) + ' 326 ' + y + '"/>'; }).join('') + '</g>' +
        '<text x="276" y="166" text-anchor="middle" class="hw-book-word" fill="#8c3b19">حلیم</text>' +
        '<text x="276" y="206" text-anchor="middle" class="hw-svg-cap">بردبار و صبور</text>' +
        '<text x="134" y="166" text-anchor="middle" class="hw-book-word" fill="#1f6f8b">هلیم</text>' +
        '<text x="134" y="206" text-anchor="middle" class="hw-svg-cap">خوراک گندم</text>' +
        '<g transform="translate(330 30) rotate(32)"><path d="M0 0 C18 22 20 70 6 118 C-10 74 -14 30 0 0 Z" fill="#fff" stroke="#8c3b19" stroke-width="2.5"/>' +
        '<path d="M2 10 L4 118" stroke="#8c3b19" stroke-width="2"/></g>' + tileSvg + '</svg>';
    }
  };

  function compassSvg() {
    return '<svg viewBox="0 0 80 80" width="78" height="78" aria-hidden="true"><circle cx="40" cy="40" r="36" fill="#fffaf0" stroke="#c9931a" stroke-width="3"/>' +
      '<path d="M40 8 L47 40 L40 72 L33 40 Z" fill="#e8f3f1" stroke="#0d6859" stroke-width="2"/><path d="M40 8 L47 40 L33 40 Z" fill="#e23b3b"/>' +
      '<path d="M8 40 L40 34 L72 40 L40 46 Z" fill="#cfe8e3"/><circle cx="40" cy="40" r="5" fill="#0d6859"/>' +
      '<text x="40" y="22" text-anchor="middle" font-size="9" font-weight="900" fill="#7a1f1f" dy="-6">ش</text></svg>';
  }

  function art(world, o) {
    o = o || {};
    var chips = (o.chips || []).map(function (c, i) { return '<span class="hw-chip hw-chip-' + (i + 1) + '">' + esc(c) + '</span>'; }).join('');
    var inner = world === 'geo' ? (o.mapHtml || '') + '<span class="hw-compass">' + compassSvg() + '</span>' : (SCENES[world] ? SCENES[world]() : '');
    return '<div class="hw-art hw-art-' + world + '">' + (world === 'geo' ? '<div class="iran-map-box hw-map-frame" aria-hidden="true">' + inner + '</div>' : '<div class="hw-scene-wrap">' + inner + '</div>') +
      chips + '<span class="hw-art-hakim" data-hk-face="happy" aria-hidden="true"></span></div>';
  }

  function bind(root, handlers) {
    handlers = handlers || {};
    if (!root || !root.querySelectorAll) return;
    if (!root.querySelector('[data-hw-audio]')) stopAudio();
    root.querySelectorAll('[data-hw-cert]').forEach(function (b) { if (handlers.cert) b.onclick = handlers.cert; });
    try { if (global.HakimCompanion && global.HakimCompanion.paintFaces) global.HakimCompanion.paintFaces(root); } catch (_) {}
  }

  /* ───────────── جشن پایان ایستگاه ───────────── */
  var celebrated = {};
  function celebrate(o) {
    o = o || {};
    if (typeof document === 'undefined') return null;
    var key = o.key || o.title;
    if (key && celebrated[key]) return null;
    if (key) celebrated[key] = true;
    var old = document.querySelector('.hw-celebrate');
    if (old) old.remove();
    var stars = Math.max(0, Math.min(3, o.stars || 0));
    var starHtml = [0, 1, 2].map(function (i) { return '<span class="hw-star' + (i < stars ? ' on' : '') + '" style="--d:' + (0.25 + i * 0.22) + 's">★</span>'; }).join('');
    var confetti = '';
    for (var i = 0; i < 28; i++) {
      confetti += '<i style="--x:' + (Math.random() * 100).toFixed(1) + '%;--c:' + PALETTE[i % PALETTE.length] + ';--t:' + (1.4 + Math.random() * 1.4).toFixed(2) + 's;--dl:' + (Math.random() * 0.5).toFixed(2) + 's;--r:' + Math.round(Math.random() * 360) + 'deg"></i>';
    }
    var wrap = document.createElement('div');
    wrap.className = 'hw-celebrate';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'hwCelTitle');
    wrap.setAttribute('aria-describedby', 'hwCelDesc');
    wrap.innerHTML = '<div class="hw-cel-card">' +
      '<div class="hw-cel-confetti" aria-hidden="true">' + confetti + '</div>' +
      '<div class="hw-cel-rays" aria-hidden="true"></div>' +
      '<span class="hw-cel-hakim" data-hk-face="happy" aria-hidden="true"></span>' +
      '<p class="hw-eyebrow">' + esc(o.isFinal ? 'همهٔ مسیر فتح شد!' : (o.word || 'ایستگاه') + ' کامل شد!') + '</p>' +
      '<h2 id="hwCelTitle">' + esc(o.isFinal ? 'تو قهرمان این سرزمین شدی!' : shortTitle(o.title)) + '</h2>' +
      '<div class="hw-cel-stars" role="img" aria-label="' + fa(stars) + ' از ۳ ستاره">' + starHtml + '</div>' +
      '<p id="hwCelDesc" class="hw-cel-text">' + esc(o.text || '') + '</p>' +
      (o.badge ? '<p class="hw-cel-badge">🏅 نشان «' + esc(o.badge) + '» به گنجینه‌ات اضافه شد</p>' : '') +
      '<div class="hw-cel-actions">' +
      (o.isFinal ? '<button type="button" class="hw-btn-gold" data-act="cert">🏆 دیدن گواهی‌نامه</button>' :
        (o.onNext ? '<button type="button" class="hw-btn-gold" data-act="next">' + esc(o.nextLabel || ((o.word || 'ایستگاه') + ' بعدی ←')) + '</button>' : '')) +
      '<button type="button" class="hw-btn-ghost" data-act="review">دیدن توضیح پاسخ</button>' +
      (o.onMap ? '<button type="button" class="hw-btn-ghost" data-act="map">نقشهٔ سفر</button>' : '') +
      '</div></div>';
    var prevFocus = document.activeElement;
    function close(after) {
      wrap.classList.add('hw-out');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 180);
      if (typeof after === 'function') { try { after(); } catch (_) {} }
      else if (prevFocus && prevFocus.focus && document.contains(prevFocus)) { try { prevFocus.focus(); } catch (_) {} }
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = wrap.querySelectorAll('button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { close(); return; }
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'next') close(o.onNext);
      else if (act === 'map') close(o.onMap);
      else if (act === 'cert') close(o.onCert);
      else close();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(wrap);
    try { if (global.HakimCompanion && global.HakimCompanion.paintFaces) global.HakimCompanion.paintFaces(wrap); } catch (_) {}
    var primary = wrap.querySelector('.hw-btn-gold') || wrap.querySelector('button');
    if (primary) setTimeout(function () { try { primary.focus(); } catch (_) {} }, 60);
    return wrap;
  }


  /* ───────────── قفل مرحله‌ای (درسنامه اول، بعد تمرین؛ ایستگاه‌ها به ترتیب) ─────────────
     units: [{solved,total,seen}] — ایستگاهی که قبلاً شروع/دیده شده همیشه باز می‌ماند (سازگاری با پیشرفت قدیمی). */
  function isLocked(units, i) {
    if (i <= 0) return false;
    var u = units[i] || {};
    if (u.seen || u.solved > 0) return false;
    var prev = units[i - 1] || {};
    return !(prev.total && prev.solved >= prev.total);
  }

  var toastTimer = null;
  function toast(msg) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('hwToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hwToast';
      el.className = 'hw-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.innerHTML = '<span class="hw-toast-face" data-hk-face="wise" aria-hidden="true"></span><span>' + esc(msg) + '</span>';
    try { if (global.HakimCompanion && global.HakimCompanion.paintFaces) global.HakimCompanion.paintFaces(el); } catch (_) {}
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4200);
  }

  /* ───────────── گام‌شمار درسنامه ───────────── */
  function steps(labels, cur, seenMax) {
    var max = Math.max(cur, seenMax || 0);
    return '<nav class="hw-steps" aria-label="گام‌های درسنامه"><ol>' + labels.map(function (l, i) {
      var st = i < cur ? 'done' : i === cur ? 'current' : 'todo';
      return '<li data-state="' + st + '"><button type="button" data-hw-step="' + i + '"' + (i > max ? ' disabled' : '') +
        (i === cur ? ' aria-current="step"' : '') + '><span class="hw-step-dot" aria-hidden="true">' + (st === 'done' ? '✓' : fa(i + 1)) + '</span>' +
        '<span class="hw-step-label">' + esc(l) + '</span></button></li>';
    }).join('') + '</ol></nav>';
  }

  /* ───────────── پخش‌کنندهٔ گفتار حکیم (بدون پخش خودکار، با متن کامل) ───────────── */
  var player = { audio: null, btn: null, raf: 0, speaking: false };
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    return fa(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
  }
  function audioCard(o) {
    o = o || {};
    return '<div class="hw-audio" data-hw-audio data-src="' + esc(o.src || '') + '">' +
      '<span class="hw-audio-face" data-hk-face="wise" aria-hidden="true"></span>' +
      '<div class="hw-audio-main">' +
      '<div class="hw-audio-head"><b>' + esc(o.title || 'درسنامهٔ صوتی حکیم') + '</b><small>' + esc(o.sub || 'صدای فارسی · بدون پخش خودکار') + '</small></div>' +
      '<div class="hw-audio-row"><button type="button" class="hw-audio-play" aria-pressed="false">▶ گوش کن</button>' +
      '<div class="hw-audio-bar" aria-hidden="true"><span></span></div><span class="hw-audio-time" aria-hidden="true">' + fmtTime(0) + '</span></div>' +
      '<details class="hw-audio-tx"><summary>📜 متن کامل گفتار حکیم</summary><p>' + esc(o.text || '') + '</p></details>' +
      '</div></div>';
  }
  function stopAudio() {
    try { if (player.audio) { player.audio.pause(); } } catch (_) {}
    try { if (player.speaking && global.speechSynthesis) global.speechSynthesis.cancel(); } catch (_) {}
    player.speaking = false;
    cancelAnimationFrame(player.raf);
    if (player.btn) { player.btn.textContent = '▶ گوش کن'; player.btn.setAttribute('aria-pressed', 'false'); }
  }
  function bindAudio(root) {
    stopAudio();
    player.btn = null;
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-hw-audio]').forEach(function (box) {
      var btn = box.querySelector('.hw-audio-play');
      var bar = box.querySelector('.hw-audio-bar span');
      var time = box.querySelector('.hw-audio-time');
      var src = box.getAttribute('data-src');
      var text = (box.querySelector('.hw-audio-tx p') || {}).textContent || '';
      function speakFallback() {
        if (!global.speechSynthesis || !text) { toast('پخش صدا در این مرورگر ممکن نیست؛ متن کامل گفتار را باز کن و بخوان.'); return; }
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'fa-IR'; u.rate = 0.95;
        u.onend = function () { player.speaking = false; btn.textContent = '▶ گوش کن'; btn.setAttribute('aria-pressed', 'false'); };
        global.speechSynthesis.cancel();
        global.speechSynthesis.speak(u);
        player.speaking = true;
        btn.textContent = '⏸ توقف'; btn.setAttribute('aria-pressed', 'true');
      }
      function tick() {
        var a = player.audio;
        if (!a || player.btn !== btn) return;
        if (a.duration) bar.style.width = (100 * a.currentTime / a.duration).toFixed(1) + '%';
        time.textContent = fmtTime(a.currentTime) + (a.duration ? ' / ' + fmtTime(a.duration) : '');
        if (!a.paused) player.raf = requestAnimationFrame(tick);
      }
      btn.onclick = function () {
        var playing = btn.getAttribute('aria-pressed') === 'true';
        if (playing) { stopAudio(); return; }
        stopAudio();
        player.btn = btn;
        if (!src || typeof Audio === 'undefined') { speakFallback(); return; }
        if (!player.audio) { player.audio = new Audio(); player.audio.preload = 'none'; }
        var a = player.audio;
        if (a.getAttribute('data-src') !== src) { a.src = src; a.setAttribute('data-src', src); }
        a.onended = function () { stopAudio(); bar.style.width = '100%'; };
        a.onerror = function () { if (player.btn === btn && !player.speaking) { stopAudio(); player.btn = btn; speakFallback(); } };
        var p = a.play();
        btn.textContent = '⏸ توقف'; btn.setAttribute('aria-pressed', 'true');
        if (p && p.catch) p.catch(function (err) {
          if (player.btn !== btn || !a.paused || player.speaking) return;
          stopAudio();
          // فایل صوتی پیدا نشد یا پشتیبانی نشد ← گفتار فارسی مرورگر
          if (err && err.name === 'NotSupportedError') { player.btn = btn; speakFallback(); }
        });
        player.raf = requestAnimationFrame(tick);
      };
      box.querySelector('.hw-audio-bar').parentNode.onclick = function (e) {
        var a = player.audio;
        if (!a || player.btn !== btn || !a.duration || !e.target.closest('.hw-audio-bar')) return;
        var r = e.target.closest('.hw-audio-bar').getBoundingClientRect();
        a.currentTime = a.duration * Math.min(1, Math.max(0, (r.right - e.clientX) / r.width));
        tick();
      };
    });
  }

  /* ───────────── اجزای گرافیکی گواهی‌نامه ───────────── */
  var sealSeq = 0;
  function seal(label, sub) {
    var id = 'hwSeal' + (++sealSeq);
    var rays = '';
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2, a2 = a + Math.PI / 24;
      rays += (i ? 'L' : 'M') + (70 + 58 * Math.cos(a)).toFixed(1) + ' ' + (66 + 58 * Math.sin(a)).toFixed(1) + 'L' + (70 + 50 * Math.cos(a2)).toFixed(1) + ' ' + (66 + 50 * Math.sin(a2)).toFixed(1);
    }
    return '<div class="hw-seal" role="img" aria-label="' + esc('مهر طلایی ' + (label || 'حکیمستان')) + '"><svg viewBox="0 0 140 170" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1bf"/><stop offset=".45" stop-color="#f1c453"/><stop offset="1" stop-color="#b9822a"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d64545"/><stop offset="1" stop-color="#8e1f1f"/></linearGradient></defs>' +
      '<path d="M48 104l-16 58 24-11 12 20 14-60z" fill="url(#' + id + 'r)"/><path d="M92 104l16 58-24-11-12 20-14-60z" fill="url(#' + id + 'r)"/>' +
      '<path d="' + rays + 'Z" fill="url(#' + id + 'g)" stroke="#9a6a1f" stroke-width="1.2"/>' +
      '<circle cx="70" cy="66" r="44" fill="url(#' + id + 'g)" stroke="#8a5f1c" stroke-width="2"/>' +
      '<circle cx="70" cy="66" r="36" fill="none" stroke="#fff6dc" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<path d="M70 38l7.6 15.4 17 2.5-12.3 12 2.9 16.9L70 76.8 54.8 84.8l2.9-16.9-12.3-12 17-2.5z" fill="#7a5214"/>' +
      '<text x="70" y="100" text-anchor="middle" font-size="9.5" font-weight="900" fill="#5a3b0c">' + esc(label || 'حکیمستان') + '</text>' +
      '</svg>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }
  function signature(name, role) {
    return '<div class="hw-sign"><svg viewBox="0 0 160 46" aria-hidden="true" focusable="false"><path d="M8 32c14-22 22-26 26-14s-6 18 2 10 14-24 22-18-4 22 6 16 12-18 20-12 2 14 12 10 14-12 22-8 12 6 30-2" fill="none" stroke="#1f3a68" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="hw-sign-line"></span><b>' + esc(name || 'مهدی شریفیان') + '</b><small>' + esc(role || 'طراح و توسعه‌دهنده · حکیمستان') + '</small></div>';
  }
  function certHakim(text) {
    return '<div class="hw-cert-hakim"><span class="hw-cert-hakim-face" data-hk-face="happy" aria-hidden="true"></span>' +
      (text ? '<p><b>حکیم:</b> ' + esc(text) + '</p>' : '') + '</div>';
  }
  function certStats(items) {
    return '<div class="hw-cert-stats">' + (items || []).map(function (it, i) {
      return '<div class="hw-cert-stat" style="--hw-c:' + color(i + 1) + '"><span aria-hidden="true">' + esc(it.icon || '⭐') + '</span><b>' + esc(it.value) + '</b><small>' + esc(it.label) + '</small></div>';
    }).join('') + '</div>';
  }

  global.HakimWorlds = {
    art: art,
    journey: journey,
    card: card,
    certBanner: certBanner,
    ring: ring,
    bind: bind,
    celebrate: celebrate,
    shortTitle: shortTitle,
    color: color,
    isLocked: isLocked,
    toast: toast,
    steps: steps,
    audioCard: audioCard,
    bindAudio: bindAudio,
    stopAudio: stopAudio,
    seal: seal,
    signature: signature,
    certHakim: certHakim,
    certStats: certStats
  };
})(typeof window !== 'undefined' ? window : this);
