/*!
 * hakim-security.js — لایهٔ امنیتی سمت کلاینت حکیمستان
 * نسخه: 1.0.0
 * ساخته مهدی شریفیان
 *
 * این ماژول ابزارهای دفاعی در اختیار بقیهٔ کدها می‌گذارد:
 *   • پاک‌سازی HTML و جلوگیری از XSS
 *   • اعتبارسنجی ورودی (نام، ایمیل، تلفن، کد ملی، عدد)
 *   • توکن CSRF برای فرم‌های محلی
 *   • محافظت از URL در برابر javascript: و data:text/html
 *   • محدودکنندهٔ نرخ (Rate Limit) برای عملیات حساس
 *   • ذخیره‌سازی ایمن در localStorage با طرح‌واره
 *   • گزارش‌دهی نقض CSP
 *
 * ⚠ توجه: امنیت واقعی در سرور اعمال می‌شود؛ این لایه فقط
 * دفاع در عمق (Defense in Depth) است.
 */
(function (global) {
  'use strict';

  var DEBUG = /(?:\?|&)sec=debug(?:&|$)/.test(location.search);

  /* ══════════════════════════════════════════════════════════
     ۱) پاک‌سازی و فرار دادن متن
     ══════════════════════════════════════════════════════════ */
  var HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '=': '&#61;'
  };

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"'`=]/g, function (ch) {
      return HTML_ESCAPES[ch];
    });
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/[\r\n\t]/g, ' ');
  }

  /** حذف کاراکترهای کنترلی و نویسه‌های دوطرفه‌ساز (حملهٔ Trojan Source) */
  function stripDangerousChars(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  }

  /* ══════════════════════════════════════════════════════════
     ۲) پاک‌سازی HTML (نقشهٔ سفید)
     ══════════════════════════════════════════════════════════ */
  var ALLOWED_TAGS = {
    B: 1, I: 1, U: 1, EM: 1, STRONG: 1, SPAN: 1, DIV: 1, P: 1, BR: 1,
    UL: 1, OL: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
    A: 1, SMALL: 1, SUB: 1, SUP: 1, MARK: 1, CODE: 1, PRE: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, CAPTION: 1,
    SVG: 1, PATH: 1, CIRCLE: 1, RECT: 1, G: 1, LINE: 1, POLYLINE: 1, POLYGON: 1,
    IMG: 1, HR: 1, BLOCKQUOTE: 1
  };

  var ALLOWED_ATTRS = {
    'class': 1, 'id': 1, 'title': 1, 'alt': 1, 'src': 1, 'href': 1,
    'width': 1, 'height': 1, 'viewBox': 1, 'd': 1, 'fill': 1, 'stroke': 1,
    'stroke-width': 1, 'stroke-linecap': 1, 'stroke-linejoin': 1, 'cx': 1,
    'cy': 1, 'r': 1, 'x': 1, 'y': 1, 'rx': 1, 'ry': 1, 'x1': 1, 'y1': 1,
    'x2': 1, 'y2': 1, 'points': 1, 'transform': 1,
    'data-state': 1, 'data-index': 1, 'data-value': 1, 'data-id': 1,
    'aria-label': 1, 'aria-hidden': 1, 'role': 1, 'colspan': 1, 'rowspan': 1,
    'dir': 1, 'lang': 1, 'loading': 1, 'decoding': 1
  };

  var SAFE_URL_RE = /^(?:https?:|mailto:|tel:|#|\/|\.\.\/|\.\/|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,)/i;

  function isSafeURL(url) {
    if (!url) return false;
    var s = String(url).trim();
    // حذف کاراکترهای پنهان که می‌توانند javascript: را پنهان کنند
    s = s.replace(/[\u0000-\u001F\u007F\s]/g, '').toLowerCase();
    if (s.indexOf('javascript:') === 0) return false;
    if (s.indexOf('vbscript:') === 0) return false;
    if (s.indexOf('data:text/html') === 0) return false;
    if (s.indexOf('data:application/') === 0) return false;
    return true;
  }

  function sanitizeHTML(dirty) {
    if (dirty === null || dirty === undefined) return '';
    var doc;
    try {
      doc = new DOMParser().parseFromString('<div>' + String(dirty) + '</div>', 'text/html');
    } catch (e) {
      return escapeHTML(dirty);
    }
    var root = doc.body.firstChild;
    if (!root) return '';

    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    var toRemove = [];

    while (walker.nextNode()) {
      var el = walker.currentNode;
      if (!ALLOWED_TAGS[el.tagName]) {
        toRemove.push(el);
        continue;
      }
      var attrs = Array.prototype.slice.call(el.attributes);
      for (var i = 0; i < attrs.length; i++) {
        var name = attrs[i].name;
        var lower = name.toLowerCase();
        var value = attrs[i].value;

        if (lower.indexOf('on') === 0) { el.removeAttribute(name); continue; }
        if (lower === 'style' || lower === 'srcdoc' || lower === 'formaction') {
          el.removeAttribute(name); continue;
        }
        if (!ALLOWED_ATTRS[name]) { el.removeAttribute(name); continue; }
        if ((lower === 'href' || lower === 'src') && !isSafeURL(value)) {
          el.removeAttribute(name);
        }
      }
      if (el.tagName === 'A') {
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }

    for (var k = 0; k < toRemove.length; k++) {
      var node = toRemove[k];
      if (node.parentNode) {
        // محتوای متنی فرزندان را نگه می‌داریم
        while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
        node.parentNode.removeChild(node);
      }
    }
    return root.innerHTML;
  }

  function setHTML(el, dirty) {
    if (!el) return;
    el.innerHTML = sanitizeHTML(dirty);
  }

  /* ══════════════════════════════════════════════════════════
     ۳) اعتبارسنجی ورودی
     ══════════════════════════════════════════════════════════ */
  var PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  var ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  function toEnDigits(input) {
    return String(input === null || input === undefined ? '' : input)
      .replace(/[۰-۹]/g, function (d) { return String(PERSIAN_DIGITS.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String(ARABIC_DIGITS.indexOf(d)); });
  }

  function normalizePersian(input) {
    return toEnDigits(input)
      .replace(/[يىﻯﻰ]/g, 'ی')
      .replace(/[كﻙ]/g, 'ک')
      .replace(/[ۀهٔ]/g, 'ه')
      .replace(/[\u064B-\u0652\u0670]/g, '') // اعراب
      .replace(/\u200C{2,}/g, '\u200C')      // نیم‌فاصلهٔ تکراری
      .replace(/\s+/g, ' ')
      .trim();
  }

  var validators = {
    required: function (v) {
      return normalizePersian(v).length > 0 || 'این فیلد الزامی است.';
    },

    text: function (v, min, max) {
      var s = normalizePersian(v);
      min = min || 1;
      max = max || 2000;
      if (s.length < min) return 'حداقل ' + min + ' نویسه لازم است.';
      if (s.length > max) return 'حداکثر ' + max + ' نویسه مجاز است.';
      if (/[<>]/.test(s)) return 'کاراکترهای < و > مجاز نیستند.';
      return true;
    },

    /** نام فارسی/انگلیسی: حرف، فاصله، نیم‌فاصله، آپاستروف */
    name: function (v) {
      var s = normalizePersian(v);
      if (!s) return 'نام را وارد کنید.';
      if (s.length < 2) return 'نام باید حداقل ۲ حرف باشد.';
      if (s.length > 60) return 'نام بیش از حد بلند است.';
      if (!/^[\u0600-\u06FFa-zA-Z\u200c' .-]+$/.test(s)) return 'نام فقط می‌تواند شامل حرف و فاصله باشد.';
      return true;
    },

    number: function (v, min, max) {
      var s = toEnDigits(v).replace(/[,\s]/g, '');
      if (s === '') return 'عدد را وارد کنید.';
      if (!/^-?\d+(\.\d+)?$/.test(s)) return 'فقط رقم مجاز است.';
      var n = Number(s);
      if (min !== undefined && n < min) return 'عدد باید بزرگ‌تر یا مساوی ' + min + ' باشد.';
      if (max !== undefined && n > max) return 'عدد باید کوچک‌تر یا مساوی ' + max + ' باشد.';
      return true;
    },

    email: function (v) {
      var s = toEnDigits(v).trim();
      if (!s) return 'ایمیل را وارد کنید.';
      if (s.length > 254) return 'ایمیل بیش از حد بلند است.';
      if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(s)) return 'قالب ایمیل درست نیست.';
      return true;
    },

    phone: function (v) {
      var s = toEnDigits(v).replace(/[-\s()]/g, '');
      if (!s) return 'شمارهٔ تلفن را وارد کنید.';
      if (/^(?:\+98|0098|98)9\d{9}$/.test(s)) return true;
      if (/^09\d{9}$/.test(s)) return true;
      if (/^0\d{9,10}$/.test(s)) return true;
      return 'شمارهٔ تلفن معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹).';
    },

    /** کد ملی ایران با رقم کنترلی */
    nationalId: function (v) {
      var s = toEnDigits(v).replace(/\D/g, '');
      if (s.length !== 10) return 'کد ملی باید ۱۰ رقم باشد.';
      if (/^(\d)\1{9}$/.test(s)) return 'کد ملی معتبر نیست.';
      var sum = 0;
      for (var i = 0; i < 9; i++) sum += Number(s.charAt(i)) * (10 - i);
      var r = sum % 11;
      var check = Number(s.charAt(9));
      if (!((r < 2 && check === r) || (r >= 2 && check === 11 - r))) return 'کد ملی معتبر نیست.';
      return true;
    },

    url: function (v, allowRelative) {
      var s = String(v || '').trim();
      if (!s) return 'نشانی را وارد کنید.';
      if (allowRelative && /^[.#/]/.test(s)) return true;
      if (!isSafeURL(s)) return 'این نشانی مجاز نیست.';
      if (!/^https?:\/\//i.test(s) && !allowRelative) return 'نشانی باید با http یا https شروع شود.';
      return true;
    },

    /** بررسی سادهٔ قدرت گذرواژه (فقط برای ابزارهای محلی) */
    password: function (v, min) {
      var s = String(v || '');
      min = min || 8;
      if (s.length < min) return 'گذرواژه باید حداقل ' + min + ' نویسه باشد.';
      if (!/[a-z]/.test(s) || !/[A-Z]/.test(s) && !/[0-9]/.test(s) && !/[^a-zA-Z0-9]/.test(s)) {
        return 'گذرواژه باید ترکیبی از حرف، رقم یا نماد باشد.';
      }
      return true;
    }
  };

  function validate(value, rules) {
    var list = Array.isArray(rules) ? rules : [rules];
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      var res = typeof fn === 'function' ? fn(value) : fn(value);
      if (res !== true) return { valid: false, message: res };
    }
    return { valid: true, message: '' };
  }

  function cleanText(value, maxLen) {
    return stripDangerousChars(normalizePersian(value)).slice(0, maxLen || 5000);
  }

  /* ══════════════════════════════════════════════════════════
     ۴) توکن CSRF برای فرم‌های محلی
     ══════════════════════════════════════════════════════════ */
  function randomToken(bytes) {
    bytes = bytes || 32;
    try {
      var arr = new Uint8Array(bytes);
      (global.crypto || global.msCrypto).getRandomValues(arr);
      return Array.prototype.map.call(arr, function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    } catch (e) {
      // جایگزین ضعیف‌تر (فقط برای محیط‌های قدیمی)
      var s = '';
      for (var i = 0; i < bytes * 2; i++) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    }
  }

  var CSRF_KEY = 'hakim.csrf.v1';

  function csrfToken() {
    var t = null;
    try { t = sessionStorage.getItem(CSRF_KEY); } catch (e) {}
    if (!t || t.length < 32) {
      t = randomToken(32);
      try { sessionStorage.setItem(CSRF_KEY, t); } catch (e) {}
    }
    return t;
  }

  function csrfField() {
    return '<input type="hidden" name="_csrf" value="' + escapeAttr(csrfToken()) + '">';
  }

  /** به همهٔ فرم‌های صفحه فیلد CSRF اضافه می‌کند */
  function protectForms() {
    var forms = document.querySelectorAll('form');
    var n = 0;
    for (var i = 0; i < forms.length; i++) {
      if (forms[i].querySelector('input[name="_csrf"]')) continue;
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_csrf';
      input.value = csrfToken();
      forms[i].appendChild(input);
      n++;
    }
    return n;
  }

  /* ══════════════════════════════════════════════════════════
     ۵) محدودکنندهٔ نرخ
     ══════════════════════════════════════════════════════════ */
  var buckets = {};

  function rateLimit(key, maxCalls, windowMs) {
    maxCalls = maxCalls || 5;
    windowMs = windowMs || 10000;
    var now = Date.now();
    var b = buckets[key];
    if (!b || now - b.start > windowMs) {
      buckets[key] = { start: now, count: 1 };
      return { allowed: true, remaining: maxCalls - 1, retryAfter: 0 };
    }
    b.count++;
    if (b.count > maxCalls) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil((b.start + windowMs - now) / 1000) };
    }
    return { allowed: true, remaining: maxCalls - b.count, retryAfter: 0 };
  }

  function throttle(fn, windowMs) {
    windowMs = windowMs || 400;
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last < windowMs) return undefined;
      last = now;
      return fn.apply(this, arguments);
    };
  }

  /* ══════════════════════════════════════════════════════════
     ۶) ذخیره‌سازی ایمن
     ══════════════════════════════════════════════════════════ */
  function safeStore(prefix) {
    prefix = prefix || 'hakim.';
    return {
      get: function (key, fallback) {
        try {
          var raw = localStorage.getItem(prefix + key);
          if (raw === null) return fallback;
          return JSON.parse(raw);
        } catch (e) {
          return fallback;
        }
      },
      set: function (key, value) {
        try {
          localStorage.setItem(prefix + key, JSON.stringify(value));
          return true;
        } catch (e) {
          if (DEBUG) console.warn('[sec] ذخیره‌سازی ناموفق (شاید حافظه پر است):', key);
          return false;
        }
      },
      remove: function (key) {
        try { localStorage.removeItem(prefix + key); } catch (e) {}
      },
      keys: function () {
        var out = [];
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) out.push(k.slice(prefix.length));
          }
        } catch (e) {}
        return out;
      },
      /** حذف کلیدهایی که با طرح‌واره نمی‌خوانند (جلوگیری از آلودگی داده) */
      prune: function (schema) {
        var removed = 0;
        var ks = this.keys();
        for (var i = 0; i < ks.length; i++) {
          if (schema.indexOf(ks[i]) === -1) { this.remove(ks[i]); removed++; }
        }
        return removed;
      }
    };
  }

  /* ══════════════════════════════════════════════════════════
     ۷) گزارش نقض CSP + پایش
     ══════════════════════════════════════════════════════════ */
  var violations = [];

  function watchCSP() {
    document.addEventListener('securitypolicyviolation', function (e) {
      violations.push({
        directive: e.violatedDirective,
        blocked: e.blockedURI,
        at: new Date().toISOString()
      });
      if (violations.length > 50) violations.shift();
      if (DEBUG) {
        console.warn('[CSP] مسدود شد:', e.violatedDirective, e.blockedURI);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     ۸) محافظت از iframe
     ══════════════════════════════════════════════════════════ */
  function frameGuard() {
    try {
      var allowed = document.documentElement.getAttribute('data-allow-frames');
      if (allowed === 'true') return;
      if (global.top !== global.self) {
        if (DEBUG) console.warn('[sec] این صفحه داخل قاب بارگذاری شده است. اگر عمدی است، data-allow-frames="true" بگذارید.');
      }
    } catch (e) {
      /* دسترسی به top ممکن است خطا بدهد — یعنی cross-origin است */
    }
  }

  /* ══════════════════════════════════════════════════════════
     ۹) بازرسی یکپارچگی اسکریپت‌های بیرونی
     ══════════════════════════════════════════════════════════ */
  function auditExternal() {
    var scripts = document.querySelectorAll('script[src^="http"]');
    var missing = [];
    for (var i = 0; i < scripts.length; i++) {
      if (!scripts[i].hasAttribute('integrity')) {
        missing.push(scripts[i].getAttribute('src'));
      }
    }
    if (missing.length && DEBUG) {
      console.warn('[sec] این اسکریپت‌های بیرونی صفت integrity ندارند:\n  • ' + missing.join('\n  • '));
    }
    return missing;
  }

  /* ══════════════════════════════════════════════════════════
     راه‌اندازی
     ══════════════════════════════════════════════════════════ */
  function init() {
    watchCSP();
    frameGuard();
    try { protectForms(); } catch (e) {}
    auditExternal();
    if (DEBUG) {
      console.log('%c[حکیمستان امنیت] نسخهٔ ۱.۰.۰ فعال شد', 'color:#2ecc71;font-weight:700');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  global.HakimSec = {
    version: '1.0.0',
    escapeHTML: escapeHTML,
    escapeAttr: escapeAttr,
    sanitizeHTML: sanitizeHTML,
    setHTML: setHTML,
    isSafeURL: isSafeURL,
    cleanText: cleanText,
    normalizePersian: normalizePersian,
    toEnDigits: toEnDigits,
    validators: validators,
    validate: validate,
    csrfToken: csrfToken,
    csrfField: csrfField,
    protectForms: protectForms,
    rateLimit: rateLimit,
    throttle: throttle,
    randomToken: randomToken,
    store: safeStore,
    get cspViolations() { return violations.slice(); }
  };
})(typeof window !== 'undefined' ? window : this);
