/*!
 * hakim-a11y.js — ماژول دسترس‌پذیری حکیمستان
 * نسخه: 1.0.0
 * ساخته مهدی شریفیان
 *
 * کارها:
 *   ۱) لینک پرش به محتوای اصلی (Bypass Blocks)
 *   ۲) نام قابل‌دسترس برای دکمه‌های فقط-آیکون
 *   ۳) مخفی‌کردن آیکون‌های تزئینی از صفحه‌خوان
 *   ۴) نقش‌ها و برچسب‌های ARIA برای مدیا و کانواس
 *   ۵) بزرگ‌کردن ناحیهٔ لمس عناصر کوچک (WCAG 2.5.8)
 *   ۶) ناحیهٔ اعلان زنده + API عمومی HakimA11y.announce()
 *   ۷) بستن با کلید Escape برای پنجره‌های شناور
 *   ۸) ترجیحات کاربر: کنتراست بالا، کاهش حرکت، بزرگ‌نمایی متن
 *   ۹) ابزار بررسی خودکار (HakimA11y.audit)
 *
 * بدون وابستگی. تمام عملیات در try/catch است تا هرگز صفحه را نشکند.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'hakim.a11y.prefs.v1';
  var DEBUG = /(?:\?|&)a11y=debug(?:&|$)/.test(location.search);

  /* ── ترجیحات کاربر ─────────────────────────────────────── */
  var prefs = {
    contrast: false,
    reduceMotion: false,
    textScale: 1
  };

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      prefs.contrast = !!saved.contrast;
      prefs.reduceMotion = !!saved.reduceMotion;
      prefs.textScale = Math.min(Math.max(Number(saved.textScale) || 1, 0.9), 1.6);
    }
  } catch (e) {
    /* localStorage در حالت خصوصی ممکن است خطا بدهد */
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function applyPrefs() {
    var root = document.documentElement;
    root.classList.toggle('hk-high-contrast', prefs.contrast);
    root.classList.toggle('hk-reduce-motion', prefs.reduceMotion);
    root.style.setProperty('--hk-text-scale', String(prefs.textScale));
    if (prefs.textScale !== 1) {
      root.style.fontSize = (prefs.textScale * 100) + '%';
    } else {
      root.style.removeProperty('font-size');
    }
    var btns = document.querySelectorAll('#a11y-toolbar button[data-pref]');
    for (var i = 0; i < btns.length; i++) {
      var p = btns[i].getAttribute('data-pref');
      var on = p === 'contrast' ? prefs.contrast : prefs.reduceMotion;
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ── نام‌های جایگزین برای آیکون‌های رایج ─────────────────── */
  var EMOJI_NAMES = {
    '🏠': 'بازگشت به لابی',
    '🏡': 'خانه',
    '🔙': 'بازگشت',
    '⬅️': 'قبلی',
    '➡️': 'بعدی',
    '⬅': 'قبلی',
    '➡': 'بعدی',
    '◀': 'قبلی',
    '▶': 'بعدی',
    '◀️': 'قبلی',
    '▶️': 'بعدی',
    '🔄': 'بازنشانی',
    '♻️': 'بازنشانی',
    '🗑': 'حذف',
    '🗑️': 'حذف',
    '❌': 'بستن',
    '✖️': 'بستن',
    '✖': 'بستن',
    '✕': 'بستن',
    '×': 'بستن',
    '➕': 'افزودن',
    '＋': 'افزودن',
    '➖': 'کاهش',
    '⚙️': 'تنظیمات',
    '⚙': 'تنظیمات',
    '🔧': 'ابزار',
    '🔍': 'جست‌وجو',
    '🔎': 'جست‌وجو',
    '🔊': 'صدا روشن',
    '🔇': 'صدا خاموش',
    '🔈': 'صدا',
    '🔉': 'صدا',
    '▶︎': 'پخش',
    '⏸': 'توقف',
    '⏸️': 'توقف',
    '⏹': 'ایست',
    '⏹️': 'ایست',
    '🌙': 'حالت شب',
    '☀️': 'حالت روز',
    '☀': 'حالت روز',
    '💾': 'ذخیره',
    '📥': 'بارگیری',
    '📤': 'بارگذاری',
    '🖨': 'چاپ',
    '🖨️': 'چاپ',
    '📋': 'رونوشت',
    '📄': 'سند',
    '📁': 'پوشه',
    '📂': 'پوشه',
    '✏️': 'ویرایش',
    '📝': 'یادداشت',
    '✅': 'تأیید',
    '✔️': 'تأیید',
    '⭐': 'ستاره',
    '🏆': 'جام',
    '🎮': 'بازی',
    '❓': 'راهنما',
    'ℹ️': 'اطلاعات',
    'ℹ': 'اطلاعات',
    '↩️': 'واگرد',
    '↪️': 'ازنو',
    '🔗': 'پیوند',
    '👤': 'کاربر',
    '🚪': 'خروج',
    '⏭️': 'پرش',
    '⏮️': 'شروع'
  };

  /* ── نام‌های دکمه‌های آیکونی بر پایهٔ شناسهٔ نماد SVG ────── */
  var ICON_LABELS = {
    'i-close': 'بستن',
    'i-x': 'بستن',
    'i-eye': 'نمایش / پنهان‌کردن',
    'i-eye-off': 'نمایش / پنهان‌کردن',
    'i-plus': 'افزودن',
    'i-minus': 'کاهش',
    'i-trash': 'حذف',
    'i-copy': 'رونوشت',
    'i-edit': 'ویرایش',
    'i-pencil': 'ویرایش',
    'i-download': 'بارگیری',
    'i-upload': 'بارگذاری',
    'i-print': 'چاپ',
    'i-image': 'تصویر',
    'i-play': 'پخش',
    'i-pause': 'توقف',
    'i-check': 'تأیید',
    'i-check-circle': 'تأیید',
    'i-up': 'بالا',
    'i-down': 'پایین',
    'i-home': 'خانه',
    'i-back': 'بازگشت',
    'i-search': 'جست‌وجو',
    'i-settings': 'تنظیمات',
    'i-menu': 'فهرست',
    'i-sun': 'حالت روز',
    'i-moon': 'حالت شب',
    'i-star': 'ستاره',
    'i-heart': 'قلب',
    'i-volume': 'صدا',
    'i-volume-off': 'بی‌صدا',
    'i-save': 'ذخیره',
    'i-file': 'سند',
    'i-book': 'کتاب',
    'i-calendar': 'تقویم',
    'i-chart': 'نمودار',
    'i-users': 'کاربران',
    'i-user': 'کاربر',
    'i-refresh': 'بازنشانی',
    'i-undo': 'واگرد',
    'i-redo': 'ازنو',
    'i-link': 'پیوند',
    'i-info': 'اطلاعات',
    'i-help': 'راهنما',
    'i-lock': 'قفل',
    'i-unlock': 'بازکردن قفل',
    'i-filter': 'پالایش',
    'i-grid': 'شبکه',
    'i-list': 'فهرست',
    'i-fullscreen': 'تمام‌صفحه',
    'i-exit-fullscreen': 'خروج از تمام‌صفحه',
    'i-camera': 'دوربین',
    'i-photo': 'عکس',
    'i-send': 'ارسال',
    'i-logout': 'خروج',
    'i-login': 'ورود'
  };

  /** برچسب را از نماد SVG درون دکمه استخراج می‌کند */
  function labelFromIcon(el) {
    var use = el.querySelector('use');
    if (!use) return '';
    var href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
    var id = href.replace(/^.*#/, '').trim();
    if (!id) return '';
    var direct = ICON_LABELS[id];
    if (direct) return direct;
    // تلاش با شناسهٔ کامل («i-close» → «بستن» یا «close» → «بستن»)
    var stripped = id.replace(/^i-/, '');
    return ICON_LABELS['i-' + stripped] || '';
  }

  var EMOJI_RE = /[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2B00-\u2BFF\uFE0F\u200D\u20E3]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g;

  function stripEmoji(s) {
    return (s || '').replace(EMOJI_RE, '').replace(/[\s\u200f\u200e.,،؛:!؟\-–—_|/\\()[\]]+/g, '');
  }

  function labelFromEmoji(text) {
    var found = (text || '').match(EMOJI_RE);
    if (!found) return '';
    var names = [];
    for (var i = 0; i < found.length; i++) {
      var n = EMOJI_NAMES[found[i]];
      if (n && names.indexOf(n) === -1) names.push(n);
    }
    return names.join(' و ');
  }

  function hasAccessibleName(el) {
    if (el.getAttribute('aria-label')) return true;
    if (el.getAttribute('aria-labelledby')) return true;
    if (el.getAttribute('title')) return true;
    if (el.tagName === 'INPUT') {
      var t = el.getAttribute('type') || 'text';
      if (t === 'submit' || t === 'button' || t === 'reset') return !!(el.value || '').trim();
    }
    var text = stripEmoji(el.textContent);
    if (text.length > 0) return true;
    // برچسب از طریق <label for> برای فیلدهای فرم
    if (el.id) {
      try {
        if (document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) return true;
      } catch (e) {}
    }
    if (el.closest && el.closest('label')) return true;
    return false;
  }

  /** حدس برچسب از شناسهٔ عنصر: btnCancelEdit → «لغو ویرایش» */
  var ID_PATTERNS = [
    [/close|cancel|dismiss/i, 'بستن'],
    [/edit/i, 'ویرایش'],
    [/delete|remove|trash/i, 'حذف'],
    [/save|submit|confirm|ok/i, 'ذخیره'],
    [/add|new|create|plus/i, 'افزودن'],
    [/search|find|query/i, 'جست‌وجو'],
    [/upload|import|load/i, 'بارگذاری'],
    [/download|export/i, 'بارگیری'],
    [/print|pdf/i, 'چاپ'],
    [/refresh|reload|reset/i, 'بازنشانی'],
    [/theme|dark|light/i, 'تغییر پوسته'],
    [/sound|audio|music|volume/i, 'صدا'],
    [/share|copy/i, 'هم‌رسانی'],
    [/photo|camera|image/i, 'تصویر'],
    [/send|post/i, 'ارسال'],
    [/login|signin/i, 'ورود'],
    [/logout|signout/i, 'خروج'],
    [/play|start|begin/i, 'شروع'],
    [/pause|stop/i, 'توقف'],
    [/prev|back/i, 'قبلی'],
    [/next|forward/i, 'بعدی'],
    [/menu|nav/i, 'فهرست'],
    [/filter/i, 'پالایش'],
    [/help|info|about/i, 'راهنما']
  ];

  function labelFromId(id) {
    if (!id || id.length < 4) return '';
    for (var i = 0; i < ID_PATTERNS.length; i++) {
      if (ID_PATTERNS[i][0].test(id)) return ID_PATTERNS[i][1];
    }
    return '';
  }

  function labelFromClass(cls) {
    var s = String(cls || '');
    if (!s) return '';
    return labelFromId(s) || '';
  }

  var ICON_SELECTOR = 'button, a, [role="button"], summary, [data-act], input[type="button"], input[type="submit"], input[type="reset"]';

  function nameIcons() {
    var els = document.querySelectorAll(ICON_SELECTOR);
    var count = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-a11y-named')) continue;
      if (el.getAttribute('aria-hidden') === 'true') continue;
      if (hasAccessibleName(el)) {
        el.setAttribute('data-a11y-named', 'ok');
        continue;
      }
      var fromEmoji = labelFromEmoji(el.textContent);
      if (!fromEmoji) fromEmoji = labelFromIcon(el);
      if (!fromEmoji) {
        // آخرین تلاش: از data-* یا نام کلاس
        var alt = el.getAttribute('data-label') || el.getAttribute('data-title') ||
                  el.getAttribute('data-action') || el.getAttribute('data-act') || '';
        if (alt) fromEmoji = alt;
      }
      if (!fromEmoji && el.id) {
        var guess = labelFromId(el.id);
        if (guess) fromEmoji = guess;
      }
      if (!fromEmoji && el.classList.length) {
        var guess2 = labelFromClass(el.className);
        if (guess2) fromEmoji = guess2;
      }
      if (!fromEmoji) {
        if (DEBUG) console.warn('[a11y] نامی برای عنصر پیدا نشد:', el);
        el.setAttribute('data-a11y-named', 'missing');
        continue;
      }
      el.setAttribute('aria-label', fromEmoji);
      el.setAttribute('data-a11y-named', 'auto');
      count++;
    }
    return count;
  }

  /* ── برچسب‌گذاری فیلدهای فرم ────────────────────────────── */
  var FIELD_LABELS = {
    name: 'نام',
    username: 'نام کاربری',
    user: 'نام کاربری',
    regUser: 'نام کاربری',
    loginUser: 'نام کاربری',
    password: 'گذرواژه',
    pass: 'گذرواژه',
    regPass: 'گذرواژه',
    regPass2: 'تکرار گذرواژه',
    newPass: 'گذرواژهٔ جدید',
    newPass2: 'تکرار گذرواژهٔ جدید',
    loginPass: 'گذرواژه',
    regTeacherCode: 'رمز مخصوص معلم',
    email: 'ایمیل',
    phone: 'شمارهٔ تلفن',
    nationalId: 'کد ملی',
    grade: 'پایه',
    subject: 'درس',
    lesson: 'درس',
    class: 'کلاس',
    school: 'مدرسه',
    title: 'عنوان',
    description: 'توضیح',
    date: 'تاریخ',
    time: 'زمان',
    file: 'انتخاب فایل',
    fileIn: 'انتخاب فایل',
    importFile: 'انتخاب فایل برای بارگذاری',
    photoInput: 'انتخاب تصویر',
    cameraInput: 'عکس‌برداری با دوربین',
    imgbbKey: 'کلید سرویس میزبانی تصویر',
    suggestion: 'پیشنهاد شما',
    student: 'نام دانش‌آموز',
    fStudent: 'جست‌وجوی دانش‌آموز'
  };

  function labelFormFields() {
    var els = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    var fixed = 0, missing = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-a11y-field')) continue;
      if (hasAccessibleName(el)) { el.setAttribute('data-a11y-field', 'ok'); continue; }

      var label = '';
      // ۱) از placeholder (کمترین کیفیت اما بهتر از هیچ)
      label = (el.getAttribute('placeholder') || '').trim();
      // ۲) از شناسه یا نام فیلد
      if (!label || /^[•*.\s]+$/.test(label)) {
        var key = el.id || el.getAttribute('name') || '';
        label = FIELD_LABELS[key] || labelFromId(key) || '';
      }
      // ۳) از برچسب والد بدون for
      if (!label) {
        var wrap = el.closest('label, .field, .form-group, .input-group, .control');
        if (wrap) {
          var clone = wrap.cloneNode(true);
          var junk = clone.querySelectorAll('input, select, textarea, button, svg, script, style');
          for (var j = 0; j < junk.length; j++) junk[j].remove();
          label = (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        }
      }
      // ۴) از نوع فیلد
      if (!label) {
        var t = (el.getAttribute('type') || el.tagName.toLowerCase());
        label = ({ text: 'ورودی متن', search: 'جست‌وجو', number: 'عدد',
                   email: 'ایمیل', tel: 'شمارهٔ تلفن', url: 'نشانی اینترنتی',
                   date: 'تاریخ', time: 'زمان', file: 'انتخاب فایل',
                   password: 'گذرواژه', checkbox: 'انتخاب', radio: 'انتخاب',
                   color: 'انتخاب رنگ', range: 'مقدار', select: 'انتخاب از فهرست',
                   textarea: 'ورودی متن' })[t] || '';
      }

      if (label) {
        el.setAttribute('aria-label', label);
        el.setAttribute('data-a11y-field', 'auto');
        fixed++;
      } else {
        el.setAttribute('data-a11y-field', 'missing');
        missing++;
        if (DEBUG) console.warn('[a11y] فیلد بدون برچسب:', el);
      }
    }
    return { fixed: fixed, missing: missing };
  }

  /* ── تضمین وجود h1 ─────────────────────────────────────── */
  var HEADING_ID = 'hk-a11y-heading';
  var headingObserver = null;

  function pageTitle() {
    var t = (document.title || '').trim();
    var h = document.querySelector('h1');
    if (h && h.textContent.trim()) return h.textContent.trim();
    return t.replace(/\s*[|—–-]\s*.+$/, '').trim() || t || 'حکیمستان';
  }

  function ensureHeading() {
    var existing = document.querySelector('h1');
    if (existing) {
      // h1 واقعی پیدا شد → جای‌گزین را حذف کن
      var ph = document.getElementById(HEADING_ID);
      if (ph && ph !== existing) ph.remove();
      return;
    }
    if (document.getElementById(HEADING_ID)) return;

    var host = document.querySelector('main, [role="main"]') || document.body;
    var h = document.createElement('h1');
    h.id = HEADING_ID;
    h.className = 'sr-only';
    h.textContent = pageTitle();
    host.insertBefore(h, host.firstChild);
  }

  function watchHeading() {
    if (headingObserver || typeof MutationObserver === 'undefined' || !document.body) return;
    headingObserver = new MutationObserver(function () {
      if (!document.getElementById(HEADING_ID)) return;
      var real = Array.prototype.slice.call(document.querySelectorAll('h1'))
        .some(function (h) { return h.id !== HEADING_ID && h.textContent.trim(); });
      if (real) {
        var ph = document.getElementById(HEADING_ID);
        if (ph) ph.remove();
        headingObserver.disconnect();
        headingObserver = null;
      }
    });
    headingObserver.observe(document.body, { childList: true, subtree: true });
  }

  /* ── مخفی‌کردن آیکون‌های تزئینی ─────────────────────────── */
  function hideDecorativeIcons() {
    var svgs = document.querySelectorAll('svg:not([role]):not([aria-label])');
    for (var i = 0; i < svgs.length; i++) {
      var s = svgs[i];
      if (s.hasAttribute('aria-hidden')) continue;
      // اگر داخل عنصری با نام باشد، تزئینی است
      var host = s.closest(ICON_SELECTOR);
      var decorative = host ? hasAccessibleName(host) : !s.querySelector('title');
      if (decorative) s.setAttribute('aria-hidden', 'true');
      else s.setAttribute('role', 'img');
    }
  }

  /* ── ARIA برای مدیا، کانواس و تصاویر ────────────────────── */
  function mediaAria() {
    var imgs = document.querySelectorAll('img:not([alt])');
    for (var i = 0; i < imgs.length; i++) {
      // تصویری که alt ندارد یا تزئینی است یا فراموش شده — هر دو با alt="" امن‌ترند
      imgs[i].setAttribute('alt', '');
      if (DEBUG) console.warn('[a11y] تصویر بدون alt:', imgs[i].src);
    }

    var canvases = document.querySelectorAll('canvas:not([role])');
    for (var c = 0; c < canvases.length; c++) {
      canvases[c].setAttribute('role', 'img');
      if (!canvases[c].getAttribute('aria-label')) {
        var label = canvases[c].getAttribute('data-label') || 'بوم گرافیکی تعاملی';
        canvases[c].setAttribute('aria-label', label);
      }
    }

    var vids = document.querySelectorAll('video:not([aria-label])');
    for (var v = 0; v < vids.length; v++) {
      var src = vids[v].getAttribute('src') || '';
      var name = src.split('/').pop().replace(/\.[a-z0-9]+$/i, '') || 'ویدیو';
      vids[v].setAttribute('aria-label', 'ویدیوی ' + name);
      if (!vids[v].hasAttribute('controls')) vids[v].setAttribute('controls', '');
    }

    var auds = document.querySelectorAll('audio:not([aria-label])');
    for (var a = 0; a < auds.length; a++) {
      auds[a].setAttribute('aria-label', 'پخش‌کنندهٔ صوتی حکیمستان');
    }

    var iframes = document.querySelectorAll('iframe:not([title])');
    for (var f = 0; f < iframes.length; f++) {
      iframes[f].setAttribute('title', 'قاب محتوای حکیمستان');
    }
  }

  /* ── ناحیهٔ لمس بزرگ‌تر برای عناصر کوچک ─────────────────── */
  function enlargeHitTargets() {
    var els = document.querySelectorAll('button, a[href], [role="button"], summary');
    var changed = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList.contains('a11y-hit')) continue;
      if (el.closest && el.closest('#a11y-toolbar')) continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.width >= 44 && r.height >= 44) continue;
      // عناصر پرکنندهٔ تمام‌عرض (مثل ردیف‌های لینک) نیازی ندارند
      if (r.width >= 200) continue;
      try {
        if (getComputedStyle(el, '::after').content !== 'none') continue;
        if (getComputedStyle(el, '::before').position === 'absolute') continue;
      } catch (e) {}
      el.classList.add('a11y-hit');
      changed++;
    }
    return changed;
  }

  /* ── ساختار صفحه: main / landmark / لینک پرش ───────────── */
  function ensureSkipLink() {
    if (document.querySelector('.skip-link, a.skip, a[href^="#main"]')) return;
    var body = document.body;
    if (!body) return;

    // هدف پرش: اولین main یا اولین ناحیهٔ محتوایی
    var target = document.querySelector('main, [role="main"], #app, #game, .wrap, .container, .page');
    if (!target) {
      target = body.children.length ? body.children[0] : null;
    }
    if (!target) return;
    if (!target.id) target.id = 'main-content';
    if (target === body.children[0] && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }

    var link = document.createElement('a');
    link.className = 'skip-link';
    link.href = '#' + target.id;
    link.textContent = 'پرش به محتوای اصلی';
    link.addEventListener('click', function () {
      // اطمینان از انتقال فوکوس در مرورگرهایی که فقط اسکرول می‌کنند
      setTimeout(function () {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); } catch (e) {}
      }, 10);
    });
    body.insertBefore(link, body.firstChild);
  }

  function ensureLandmarks() {
    if (document.querySelector('main, [role="main"]')) return;
    if (!document.body) return;

    // ۱) شناسه‌های شناخته‌شده
    var byId = document.querySelector('#app, #game, #root, #stage, #screen, #main');
    if (byId) {
      byId.setAttribute('role', 'main');
      byId.setAttribute('aria-label', pageTitle());
      return;
    }

    // ۲) بزرگ‌ترین ناحیهٔ محتوایی در سطح بالای body
    var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, SVG: 1, HEADER: 1, FOOTER: 1, NAV: 1, TEMPLATE: 1, NOSCRIPT: 1 };
    var best = null, bestSize = 0;
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (SKIP[el.tagName]) continue;
      if (el.tagName === 'A' && el.classList.contains('skip-link')) continue;
      if (el.hasAttribute('role') && el.getAttribute('role') !== 'presentation') continue;
      var size = (el.textContent || '').replace(/\s+/g, '').length;
      var rectHeight = 0;
      try { rectHeight = el.getBoundingClientRect().height; } catch (e) {}
      if (size > bestSize && (rectHeight > 120 || rectHeight === 0)) {
        best = el; bestSize = size;
      }
    }
    if (best && bestSize > 40) {
      best.setAttribute('role', 'main');
      if (!best.hasAttribute('aria-label')) best.setAttribute('aria-label', pageTitle());
    }

    // ۳) پیوندهای پراکنده در یک ظرف → ناوبری
    var as = document.querySelectorAll('a[href]');
    for (var k = 0; k < as.length; k++) {
      if (as[k].closest('nav, header, footer, [role="navigation"]')) continue;
      var p = as[k].parentElement;
      if (p && p.tagName !== 'NAV' && p.children.length > 3 && !p.hasAttribute('role')) {
        p.setAttribute('role', 'navigation');
        p.setAttribute('aria-label', 'پیوندهای صفحه');
        break;
      }
    }
  }

  /* ── اعلان زنده ────────────────────────────────────────── */
  var liveRegion = null;
  function getLiveRegion() {
    if (liveRegion && document.body.contains(liveRegion)) return liveRegion;
    if (document.body) {
      var found = document.getElementById('hk-live-region');
      if (found) { liveRegion = found; return liveRegion; }
    }
    liveRegion = document.createElement('div');
    liveRegion.className = 'hk-live';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.id = 'hk-live-region';
    (document.body || document.documentElement).appendChild(liveRegion);
    return liveRegion;
  }

  function announce(message, urgent) {
    if (!message) return;
    var region = getLiveRegion();
    region.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
    region.textContent = '';
    setTimeout(function () {
      region.textContent = String(message);
    }, 60);
  }

  /* ── بستن با Escape برای لایه‌های شناور ─────────────────── */
  function escapeCloses() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      var dlg = document.querySelector('dialog[open]');
      if (dlg) return; // مرورگر خودش می‌بندد
      var overlays = document.querySelectorAll('.modal, .overlay, .popup, .lightbox, .sheet, [data-close-on-esc]');
      for (var i = overlays.length - 1; i >= 0; i--) {
        var o = overlays[i];
        var cs = getComputedStyle(o);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        var closer = o.querySelector('[data-close], .close, .btn-close, button[aria-label*="بستن"]');
        if (closer) {
          closer.click();
          announce('پنجره بسته شد');
        }
        break;
      }
    }, true);
  }

  /* ── نقشهٔ کلیدهای میان‌بر ─────────────────────────────── */
  function keyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
      // Alt+H → لینک پرش
      if (e.altKey && (e.key === 'h' || e.key === 'H' || e.key === 'ا')) {
        e.preventDefault();
        var s = document.querySelector('.skip-link');
        if (s) s.focus();
      }
      // Alt+1 → کنتراست بالا
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        togglePref('contrast');
      }
      // Alt+2 → کاهش حرکت
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        togglePref('reduceMotion');
      }
    });
  }

  function togglePref(name) {
    if (name === 'contrast') {
      prefs.contrast = !prefs.contrast;
      announce(prefs.contrast ? 'حالت کنتراست بالا روشن شد' : 'حالت کنتراست بالا خاموش شد');
    } else if (name === 'reduceMotion') {
      prefs.reduceMotion = !prefs.reduceMotion;
      announce(prefs.reduceMotion ? 'انیمیشن‌ها کاهش یافت' : 'انیمیشن‌ها بازگشت');
    }
    savePrefs();
    applyPrefs();
    document.dispatchEvent(new CustomEvent('hakim:a11y-pref', { detail: { name: name, prefs: prefs } }));
  }

  /* ── نوار ابزار دسترس‌پذیری (اختیاری) ─────────────────────
     یک دکمهٔ کوچک جمع‌شونده (FAB) در گوشهٔ پایین؛ گروه ابزارها
     فقط وقتی باز شود دیده می‌شوند تا چیدمان صفحه را اشغال نکند
     و با دکمه‌های ثابت دیگر (مثل دکمهٔ تم لابی) تلاقی نداشته باشد. */
  function buildToolbar() {
    if (document.getElementById('a11y-toolbar')) return;
    if (document.body.getAttribute('data-a11y-toolbar') === 'off') return;

    var bar = document.createElement('div');
    bar.id = 'a11y-toolbar';

    /* گروه ابزارها — پیش‌فرض جمع‌شده */
    var tools = document.createElement('div');
    tools.id = 'a11y-tools';
    tools.setAttribute('role', 'toolbar');
    tools.setAttribute('aria-label', 'ابزارهای دسترس‌پذیری');
    tools.hidden = true;

    var items = [
      { pref: 'contrast', icon: '◐', label: 'کنتراست بالا' },
      { pref: 'reduceMotion', icon: '⏯', label: 'کاهش انیمیشن' },
      { zoom: 1.15, icon: 'A+', label: 'A+ بزرگ‌کردن متن' },
      { zoom: 0.87, icon: 'A−', label: 'A− کوچک‌کردن متن' },
      { reset: true, icon: '↺', label: '↺ بازنشانی تنظیمات' }
    ];

    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.icon;
      b.setAttribute('aria-label', it.label);
      b.title = it.label;
      if (it.pref) {
        b.setAttribute('data-pref', it.pref);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { togglePref(it.pref); });
      } else if (it.zoom) {
        b.addEventListener('click', function () {
          prefs.textScale = Math.min(Math.max(prefs.textScale * it.zoom, 0.9), 1.6);
          savePrefs();
          applyPrefs();
          announce('اندازهٔ متن: ' + Math.round(prefs.textScale * 100) + ' درصد');
        });
      } else if (it.reset) {
        b.addEventListener('click', function () {
          prefs = { contrast: false, reduceMotion: false, textScale: 1 };
          savePrefs();
          applyPrefs();
          announce('تنظیمات دسترس‌پذیری بازنشانی شد');
        });
      }
      tools.appendChild(b);
    });

    /* دکمهٔ اصلی جمع‌شونده */
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'a11y-fab';
    fab.textContent = '♿';
    fab.setAttribute('aria-label', 'ابزارهای دسترس‌پذیری');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'a11y-tools');
    fab.title = 'ابزارهای دسترس‌پذیری';

    function setOpen(open) {
      bar.classList.toggle('open', open);
      tools.hidden = !open;
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    fab.addEventListener('click', function () {
      setOpen(!bar.classList.contains('open'));
    });

    /* بستن با Escape و کلیک بیرون از نوار */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar.classList.contains('open')) {
        setOpen(false);
        fab.focus();
      }
    });
    document.addEventListener('pointerdown', function (e) {
      if (bar.classList.contains('open') && !bar.contains(e.target)) {
        setOpen(false);
      }
    });

    bar.appendChild(tools);
    bar.appendChild(fab);
    document.body.appendChild(bar);
    applyPrefs();

    /* ── جابه‌جایی هوشمند: اگر دکمهٔ ثابت دیگری (مثل دکمهٔ موسیقی
       بازی‌ها) همین گوشه را گرفته باشد، نوار کمی بالاتر می‌نشیند. ── */
    var BASE_OFFSET = 14;
    var liftRaf = 0;

    function collidingTops() {
      var fr = fab.getBoundingClientRect();
      var tops = [];
      var els = document.querySelectorAll('body *');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.closest && el.closest('#a11y-toolbar')) continue;
        if (!el.matches || !el.matches('button, a[href], input, select, textarea, [role="button"], [contenteditable="true"]')) continue;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
        if (cs.pointerEvents === 'none' || cs.visibility === 'hidden' || cs.display === 'none' || el.disabled) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        if (!(r.right < fr.left || r.left > fr.right || r.bottom < fr.top || r.top > fr.bottom)) {
          tops.push(r.top);
        }
      }
      return tops;
    }

    function positionToolbar() {
      if (liftRaf) cancelAnimationFrame(liftRaf);
      liftRaf = requestAnimationFrame(function () {
        liftRaf = 0;
        bar.style.removeProperty('inset-block-end');
        var tops = collidingTops();
        if (!tops.length) return;
        var fr = fab.getBoundingClientRect();
        var lift = fr.bottom - (Math.min.apply(null, tops) - 10);
        if (lift > 0) {
          bar.style.setProperty('inset-block-end', (BASE_OFFSET + lift) + 'px');
        }
      });
    }

    if (document.readyState === 'complete') positionToolbar();
    else window.addEventListener('load', positionToolbar, { once: true });
    setTimeout(positionToolbar, 2000);
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(positionToolbar, 200);
    });
  }

  /* ── بررسی خودکار ──────────────────────────────────────── */
  function audit() {
    var report = { errors: [], warnings: [], notes: [], passed: 0 };

    if (!document.documentElement.getAttribute('lang')) {
      report.errors.push('تگ <html> صفت lang ندارد (WCAG 3.1.1)');
    } else report.passed++;

    if (!document.querySelector('main, [role="main"]')) {
      report.warnings.push('ناحیهٔ main تعریف نشده است (WCAG 1.3.6)');
    } else report.passed++;

    if (!document.querySelector('.skip-link, a.skip')) {
      report.errors.push('لینک پرش به محتوا وجود ندارد (WCAG 2.4.1)');
    } else report.passed++;

    report.passed += nameIcons();

    var unnamed = document.querySelectorAll('[data-a11y-named="missing"]');
    if (unnamed.length) {
      report.errors.push(unnamed.length + ' عنصر تعاملی بدون نام قابل‌دسترس (WCAG 4.1.2)');
    } else report.passed++;

    var imgsNoAlt = document.querySelectorAll('img:not([alt])');
    if (imgsNoAlt.length) {
      report.errors.push(imgsNoAlt.length + ' تصویر بدون alt (WCAG 1.1.1)');
    } else report.passed++;

    var emptyLinks = 0;
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      if (!hasAccessibleName(links[i])) emptyLinks++;
    }
    if (emptyLinks) report.errors.push(emptyLinks + ' پیوند بدون متن (WCAG 2.4.4)');
    else report.passed++;

    var h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) report.errors.push('صفحه h1 ندارد (WCAG 1.3.1)');
    else if (h1s.length > 1) report.warnings.push(h1s.length + ' عدد h1 در صفحه وجود دارد؛ بهتر است یکی باشد');
    else {
      report.passed++;
      if (h1s[0].id === HEADING_ID) report.notes.push('h1 جای‌گزین (پنهان از دید، خوانده‌شده توسط صفحه‌خوان) افزوده شد');
    }

    var unlabeled = document.querySelectorAll('[data-a11y-field="missing"]').length;
    var fixedFields = document.querySelectorAll('[data-a11y-field="auto"]').length;
    if (unlabeled) {
      report.errors.push(unlabeled + ' فیلد فرم بدون برچسب (WCAG 3.3.2)');
    } else {
      report.passed++;
      if (fixedFields) report.notes.push(fixedFields + ' فیلد فرم برچسب خودکار گرفت');
    }

    var positiveTab = document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
    if (positiveTab.length) report.errors.push(positiveTab.length + ' عنصر با tabindex مثبت (WCAG 2.4.3)');
    else report.passed++;

    var btns = document.querySelectorAll('button, [role="button"]');
    var tiny = 0;
    for (var b = 0; b < btns.length; b++) {
      var r = btns[b].getBoundingClientRect();
      if (r.width && r.height && (r.width < 24 || r.height < 24)) tiny++;
    }
    if (tiny) report.warnings.push(tiny + ' عنصر تعاملی کوچک‌تر از ۲۴×۲۴ پیکسل (WCAG 2.5.8)');
    else if (btns.length) report.passed++;

    if (!document.querySelector('[aria-live], .hk-live')) {
      report.warnings.push('ناحیهٔ اعلان زنده وجود ندارد؛ پیام‌های پویا خوانده نمی‌شوند');
    } else report.passed++;

    if (DEBUG || global.HAKIM_A11Y_VERBOSE) {
      console.group('%c[حکیمستان a11y] گزارش بررسی خودکار', 'color:#8b5cf6;font-weight:700');
      console.log('✔ موارد قبول‌شده:', report.passed);
      if (report.notes.length) console.info('ℹ اصلاح‌های خودکار:\n  • ' + report.notes.join('\n  • '));
      if (report.warnings.length) console.warn('⚠ هشدارها:\n  • ' + report.warnings.join('\n  • '));
      if (report.errors.length) console.error('✖ خطاها:\n  • ' + report.errors.join('\n  • '));
      if (!report.errors.length && !report.warnings.length) console.log('%c🎉 هیچ مشکلی پیدا نشد', 'color:#2ecc71');
      console.groupEnd();
    }

    global.__hakimA11yReport = report;
    return report;
  }

  /* ── راه‌اندازی ────────────────────────────────────────── */
  var observerStarted = false;

  function run(light) {
    try {
      if (!light) {
        ensureLandmarks();
        mediaAria();
        escapeCloses();
      }
      ensureSkipLink();
      nameIcons();
      labelFormFields();
      hideDecorativeIcons();
      ensureHeading();
      if (!light) watchHeading();
      enlargeHitTargets();
    } catch (e) {
      if (DEBUG) console.error('[a11y] خطا در اجرا:', e);
    }
  }

  function watch() {
    if (observerStarted || typeof MutationObserver === 'undefined' || !document.body) return;
    observerStarted = true;
    var timer = null;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { run(true); }, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    applyPrefs();
    getLiveRegion();          // ناحیهٔ اعلان باید پیش از بازرسی وجود داشته باشد
    run(false);
    buildToolbar();
    keyboardShortcuts();
    watch();

    // گزارش را پس از اتمام چیدمان بگیر تا اندازهٔ عناصر واقعی باشد
    var runAudit = function () { try { audit(); } catch (e) {} };
    if (global.requestAnimationFrame) {
      requestAnimationFrame(function () { setTimeout(runAudit, 0); });
    } else {
      setTimeout(runAudit, 60);
    }

    setTimeout(function () {
      announce('صفحهٔ حکیمستان بارگذاری شد. برای پرش به محتوا کلید Alt و H را بزنید.');
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  global.HakimA11y = {
    version: '1.0.0',
    announce: announce,
    audit: audit,
    nameIcons: nameIcons,
    enlargeHitTargets: enlargeHitTargets,
    get prefs() { return JSON.parse(JSON.stringify(prefs)); },
    setTextScale: function (v) {
      prefs.textScale = Math.min(Math.max(Number(v) || 1, 0.9), 1.6);
      savePrefs(); applyPrefs();
    },
    toggleContrast: function () { togglePref('contrast'); },
    toggleReduceMotion: function () { togglePref('reduceMotion'); },
    reset: function () {
      prefs = { contrast: false, reduceMotion: false, textScale: 1 };
      savePrefs(); applyPrefs();
    }
  };
})(typeof window !== 'undefined' ? window : this);
