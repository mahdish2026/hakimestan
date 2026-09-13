/*!
 * hakim-core.js — هسته‌ی شخصیت «حکیم» برای پروژه‌ی حکیمستان
 * نسخه: 3.0.0 (Universal)
 * ساخته مهدی شریفیان
 *
 * ─── تغییرات v3 ───────────────────────────────────────────────
 *  • چهره‌ی SVG کاملاً بازطراحی‌شده: کلاه جادوگر بنفش، ریش سفید،
 *    عصای چوبی با سر طلایی، گوش، بینی، سایه‌ی زمین و جزئیات بیشتر
 *  • ۹ حالت چهره: normal, happy, thinking, sad, excited,
 *    surprised, sleepy, wise, wink
 *    (اسم‌های قدیمی calm/amazed/concerned/… همچنان به‌عنوان alias کار می‌کنن)
 *  • انیمیشن‌ها: نفس کشیدن، پلک زدن، تکان کلاه، جرقه دور عصا،
 *    ورود/خروج نرم، درخشش ستاره و کاغذ رنگی (confetti)
 *  • افکت‌ها: sparkle در حالت wise، ستاره در excited،
 *    کاغذ رنگی در Hakim.react('win')
 *  • حباب دیالوگ مدرن با دم (tail)، موبایل‌اول، فارسی RTL
 *  • بدون فریم‌ورک / بدون CDN (فونت Google اختیاری و قابل غیرفعال‌کردن)
 *
 * ─── سه حالت استفاده (مثل قبل) ────────────────────────────────
 *  1) پنل در HTML هست → خودش پیدا می‌کنه
 *     <div class="hakim-panel">...</div>
 *     Hakim.init();
 *  2) یه کانتینر می‌دی، پنل رو داخلش می‌سازه
 *     <div id="hakim-container"></div>
 *     Hakim.init({ container: '#hakim-container' });
 *  3) هیچی نمی‌دی → پنل رو به بالای body اضافه می‌کنه
 *     Hakim.init();
 *
 * ─── API (بدون تغییر) ─────────────────────────────────────────
 *  Hakim.init, say, setMood, react, track, buildReport,
 *  createProfile, utils, moods, show, hide, reset,
 *  setName, getName, isReady, renderFace, onCityConquered,
 *  onLowHearts, sayRandom, celebrate
 */
(function (global) {
  'use strict';

  // ============================================================
  // 🎨 رنگ‌های ثابت و پالت
  // ============================================================
  const C = {
    skin:      '#f3c98b',   // پوست هلویی (ثابت)
    skinHi:    '#fadfae',   // هایلایت پوست
    skinMid:   '#e0a86a',   // سایه‌ی پوست
    skinLo:    '#c98a4e',   // سایه‌ی عمیق پوست
    beard:     '#fff7ef',   // ریش سفید (ثابت)
    beard2:    '#e7dcc6',   // سایه‌ی ریش
    hat:       '#5b4a9e',   // کلاه بنفش (ثابت)
    hat2:      '#46377f',   // کلاه بنفش تیره
    hat3:      '#7a68c9',   // کلاه بنفش روشن
    gold:      '#e9b44c',   // طلایی عصا (ثابت)
    gold2:     '#c9922f',   // طلایی تیره
    goldHi:    '#f7d88a',   // طلایی روشن
    wood:      '#8a5a2b',   // چوب عصا
    wood2:     '#6b4219',
    woodHi:    '#c99a5e',
    robe:      '#41306e',   // ردا
    robe2:     '#2a1f52',
    ink:       '#2a1a0a',   // خطوط صورت
    lip:       '#7a3b2e',   // دهان
    blush:     '#f2a68c',   // گونه
    tongue:    '#e98a8a'
  };

  // ============================================================
  // 😀 ۹ حالت چهره (نام جدید + نام‌های قدیمی به‌عنوان alias)
  // ============================================================
  const MOODS = ['normal', 'happy', 'thinking', 'sad', 'excited', 'surprised', 'sleepy', 'wise', 'wink'];

  const MOOD_ALIASES = {
    calm:        'normal',
    listening:   'normal',
    amazed:      'surprised',
    concerned:   'sad',
    celebrating: 'excited',
    curious:     'thinking',
    proud:       'wise'
  };

  // ============================================================
  // 🔧 کمکی‌ها
  // ============================================================
  let __uid = 0;
  function uid() { return ++__uid; }

  // ستاره‌ی چهارپر (برای sparkle و ستاره‌ها)
  function spark(x, y, s, fill, cls) {
    const r = (v) => Math.round(v * 10) / 10;
    const d = 'M ' + x + ' ' + r(y - s) +
      ' Q ' + r(x + s * 0.6) + ' ' + r(y - s * 0.6) + ' ' + r(x + s) + ' ' + y +
      ' Q ' + r(x + s * 0.6) + ' ' + r(y + s * 0.6) + ' ' + x + ' ' + r(y + s) +
      ' Q ' + r(x - s * 0.6) + ' ' + r(y + s * 0.6) + ' ' + r(x - s) + ' ' + y +
      ' Q ' + r(x - s * 0.6) + ' ' + r(y - s * 0.6) + ' ' + x + ' ' + r(y - s) + ' Z';
    return '<path' + (cls ? ' class="' + cls + '"' : '') + ' d="' + d + '" fill="' + fill + '"/>';
  }

  function resolveMood(mood) {
    if (MOODS.indexOf(mood) !== -1) return mood;
    if (MOOD_ALIASES[mood]) return MOOD_ALIASES[mood];
    return 'normal';
  }

  function fillTemplate(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null) ? vars[k] : '');
  }
  function pickPhrase(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function toEnglishNum(s) {
    const map = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
    return String(s).replace(/[۰-۹]/g, d => map[d]);
  }
  function getLessonFromQ(q) {
    const m = String((q && q.explanation) || '').match(/درس\s*([۰-۹]+)/);
    if (!m) return null;
    return parseInt(toEnglishNum(m[1]), 10) || null;
  }

  // ============================================================
  // 🎭 ویژگی‌های هر حالت (ابرو / چشم / دهان / گونه / افکت)
  // ============================================================
  const BROW = (d) => '<path d="' + d + '" stroke="' + C.beard + '" stroke-width="6" stroke-linecap="round" fill="none"/>';

  const MOOD_FEATURES = {
    normal: {
      blink: true,
      brows: BROW('M 74 79 Q 87 73 101 78') + BROW('M 99 78 Q 113 73 126 79'),
      eyes:
        '<ellipse cx="88" cy="94" rx="8" ry="8.5" fill="#fff"/>' +
        '<circle cx="89" cy="95" r="3.5" fill="' + C.ink + '"/>' +
        '<circle cx="86.5" cy="92" r="1.4" fill="#fff"/>' +
        '<ellipse cx="112" cy="94" rx="8" ry="8.5" fill="#fff"/>' +
        '<circle cx="113" cy="95" r="3.5" fill="' + C.ink + '"/>' +
        '<circle cx="110.5" cy="92" r="1.4" fill="#fff"/>',
      mouth: '<path d="M 94 130 Q 100 136 106 130" stroke="' + C.ink + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
      cheeks: '',
      extras: ''
    },

    happy: {
      blink: false,
      brows: BROW('M 75 76 Q 87 70 101 75') + BROW('M 99 75 Q 113 70 125 76'),
      eyes:
        '<path d="M 81 96 Q 88 88 95 96" stroke="' + C.ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<path d="M 105 96 Q 112 88 119 96" stroke="' + C.ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>',
      mouth:
        '<path d="M 92 127 Q 100 140 108 127 Q 100 133 92 127 Z" fill="' + C.lip + '"/>' +
        '<ellipse cx="100" cy="134" rx="3.5" ry="2.6" fill="' + C.tongue + '"/>',
      cheeks:
        '<circle cx="79" cy="104" r="6.5" fill="' + C.blush + '" opacity=".55"/>' +
        '<circle cx="121" cy="104" r="6.5" fill="' + C.blush + '" opacity=".55"/>',
      extras: ''
    },

    thinking: {
      blink: true,
      brows: BROW('M 74 79 Q 87 73 101 78') + BROW('M 99 71 Q 113 62 126 69'),
      eyes:
        '<ellipse cx="88" cy="94" rx="8" ry="8.5" fill="#fff"/>' +
        '<circle cx="91" cy="92" r="3.5" fill="' + C.ink + '"/>' +
        '<circle cx="89" cy="89.5" r="1.4" fill="#fff"/>' +
        '<path d="M 105 95 Q 112 90 119 95" stroke="' + C.ink + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      mouth: '<path d="M 103 132 Q 108 130 113 132" stroke="' + C.ink + '" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
      cheeks: '',
      extras:
        '<circle cx="147" cy="62" r="3" fill="' + C.gold + '" opacity=".8"/>' +
        '<circle cx="159" cy="55" r="4" fill="' + C.gold + '" opacity=".6"/>' +
        '<circle cx="173" cy="50" r="5" fill="' + C.gold + '" opacity=".45"/>'
    },

    sad: {
      blink: true,
      brows: BROW('M 76 84 Q 87 77 100 80') + BROW('M 100 80 Q 113 77 124 84'),
      eyes:
        '<ellipse cx="88" cy="95" rx="7.5" ry="8" fill="#fff"/>' +
        '<circle cx="89" cy="97" r="3" fill="' + C.ink + '"/>' +
        '<circle cx="86" cy="93" r="1.4" fill="#fff"/>' +
        '<path d="M 81 89 Q 88 93 95 89" stroke="' + C.ink + '" stroke-width="1.5" fill="none" opacity=".55"/>' +
        '<ellipse cx="112" cy="95" rx="7.5" ry="8" fill="#fff"/>' +
        '<circle cx="113" cy="97" r="3" fill="' + C.ink + '"/>' +
        '<circle cx="110" cy="93" r="1.4" fill="#fff"/>' +
        '<path d="M 105 89 Q 112 93 119 89" stroke="' + C.ink + '" stroke-width="1.5" fill="none" opacity=".55"/>',
      mouth: '<path d="M 95 135 Q 100 130 105 135" stroke="' + C.ink + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
      cheeks: '',
      extras: '<path class="hk-tear" d="M 88 105 q 4 9 0 14 q -4 -5 0 -14 Z" fill="#7ec8ff" opacity=".9"/>'
    },

    excited: {
      blink: true,
      brows: BROW('M 75 72 Q 87 66 101 71') + BROW('M 99 71 Q 113 66 125 72'),
      eyes:
        '<ellipse cx="88" cy="94" rx="9.5" ry="10.5" fill="#fff"/>' +
        '<circle cx="88" cy="94" r="4.2" fill="' + C.ink + '"/>' +
        '<circle cx="86" cy="91" r="1.7" fill="#fff"/>' + spark(92, 90, 3, C.gold) +
        '<ellipse cx="112" cy="94" rx="9.5" ry="10.5" fill="#fff"/>' +
        '<circle cx="112" cy="94" r="4.2" fill="' + C.ink + '"/>' +
        '<circle cx="110" cy="91" r="1.7" fill="#fff"/>' + spark(116, 90, 3, C.gold),
      mouth:
        '<path d="M 90 126 Q 100 143 110 126 Q 100 133 90 126 Z" fill="' + C.lip + '"/>' +
        '<ellipse cx="100" cy="133" rx="4.5" ry="3" fill="' + C.tongue + '"/>',
      cheeks:
        '<circle cx="79" cy="105" r="7" fill="' + C.blush + '" opacity=".6"/>' +
        '<circle cx="121" cy="105" r="7" fill="' + C.blush + '" opacity=".6"/>',
      extras:
        spark(58, 62, 6, '#f5c842', 'hk-star') +
        spark(142, 56, 5, '#f5c842', 'hk-star') +
        spark(56, 112, 4, '#f5c842', 'hk-star')
    },

    surprised: {
      blink: true,
      brows: BROW('M 75 70 Q 87 64 101 69') + BROW('M 99 69 Q 113 64 125 70'),
      eyes:
        '<ellipse cx="88" cy="94" rx="8.5" ry="9.5" fill="#fff"/>' +
        '<circle cx="88" cy="94" r="2.6" fill="' + C.ink + '"/>' +
        '<circle cx="86.5" cy="91.5" r="1.4" fill="#fff"/>' +
        '<ellipse cx="112" cy="94" rx="8.5" ry="9.5" fill="#fff"/>' +
        '<circle cx="112" cy="94" r="2.6" fill="' + C.ink + '"/>' +
        '<circle cx="110.5" cy="91.5" r="1.4" fill="#fff"/>',
      mouth: '<ellipse cx="100" cy="131" rx="5.5" ry="6.5" fill="' + C.lip + '"/>',
      cheeks: '',
      extras: spark(100, 22, 5, C.gold, 'hk-spark')
    },

    sleepy: {
      blink: false,
      brows: BROW('M 76 80 Q 87 76 100 80') + BROW('M 100 80 Q 113 76 124 80'),
      eyes:
        '<path d="M 81 96 Q 88 101 95 96" stroke="' + C.ink + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
        '<path d="M 105 96 Q 112 101 119 96" stroke="' + C.ink + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      mouth: '<ellipse cx="100" cy="131" rx="4" ry="4.5" fill="' + C.lip + '"/>',
      cheeks: '',
      extras:
        '<text class="hk-zzz" x="140" y="48" font-size="12" font-weight="800" fill="' + C.gold + '" font-family="Verdana, sans-serif" opacity=".85">z</text>' +
        '<text class="hk-zzz" x="152" y="40" font-size="15" font-weight="800" fill="' + C.gold + '" font-family="Verdana, sans-serif" opacity=".7">z</text>' +
        '<text class="hk-zzz" x="166" y="31" font-size="18" font-weight="800" fill="' + C.gold + '" font-family="Verdana, sans-serif" opacity=".55">z</text>'
    },

    wise: {
      blink: false,
      brows: BROW('M 73 80 Q 86 72 100 77') + BROW('M 100 77 Q 114 72 127 80'),
      eyes:
        '<ellipse cx="88" cy="95" rx="8" ry="8" fill="#fff"/>' +
        '<circle cx="89" cy="96" r="3.2" fill="' + C.ink + '"/>' +
        '<ellipse cx="88" cy="90" rx="8.5" ry="6" fill="' + C.skin + '"/>' +
        '<ellipse cx="112" cy="95" rx="8" ry="8" fill="#fff"/>' +
        '<circle cx="113" cy="96" r="3.2" fill="' + C.ink + '"/>' +
        '<ellipse cx="112" cy="90" rx="8.5" ry="6" fill="' + C.skin + '"/>',
      mouth: '<path d="M 94 130 Q 100 135 106 130" stroke="' + C.ink + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
      cheeks: '',
      extras:
        spark(58, 58, 6, '#f5c842', 'hk-spark') +
        spark(142, 52, 5, '#f5c842', 'hk-spark') +
        spark(148, 92, 4, '#f5c842', 'hk-spark')
    },

    wink: {
      blink: false,
      brows: BROW('M 74 79 Q 87 73 101 78') + BROW('M 99 71 Q 113 63 126 70'),
      eyes:
        '<ellipse cx="88" cy="94" rx="8" ry="8.5" fill="#fff"/>' +
        '<circle cx="89" cy="95" r="3.5" fill="' + C.ink + '"/>' +
        '<circle cx="86.5" cy="92" r="1.4" fill="#fff"/>' +
        '<path d="M 105 96 Q 112 100 119 96" stroke="' + C.ink + '" stroke-width="2.8" stroke-linecap="round" fill="none"/>',
      mouth: '<path d="M 96 130 Q 102 135 110 129" stroke="' + C.ink + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
      cheeks: '<circle cx="79" cy="104" r="6" fill="' + C.blush + '" opacity=".5"/>',
      extras: spark(123, 90, 4, C.gold, 'hk-spark')
    }
  };

  // ============================================================
  // 🧙 ساخت SVG چهره (تولید مشترک + ویژگی‌های هر حالت)
  // ============================================================
  function buildFaceSVG(mood) {
    const f = MOOD_FEATURES[mood] || MOOD_FEATURES.normal;
    const id = uid();
    const skinGrad  = 'hkSkin' + id;
    const beardGrad = 'hkBeard' + id;
    const hatGrad   = 'hkHat' + id;
    const robeGrad  = 'hkRobe' + id;
    const goldGrad  = 'hkGold' + id;

    return [
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img">',
      '<defs>',
        '<radialGradient id="' + skinGrad + '" cx="40%" cy="35%" r="70%">',
          '<stop offset="0%" stop-color="' + C.skinHi + '"/>',
          '<stop offset="65%" stop-color="' + C.skin + '"/>',
          '<stop offset="100%" stop-color="' + C.skinMid + '"/>',
        '</radialGradient>',
        '<linearGradient id="' + beardGrad + '" x1="0" y1="0" x2="0" y2="1">',
          '<stop offset="0%" stop-color="#ffffff"/>',
          '<stop offset="100%" stop-color="' + C.beard + '"/>',
        '</linearGradient>',
        '<linearGradient id="' + hatGrad + '" x1="0" y1="0" x2="0" y2="1">',
          '<stop offset="0%" stop-color="' + C.hat3 + '"/>',
          '<stop offset="100%" stop-color="' + C.hat + '"/>',
        '</linearGradient>',
        '<linearGradient id="' + robeGrad + '" x1="0" y1="0" x2="0" y2="1">',
          '<stop offset="0%" stop-color="' + C.robe + '"/>',
          '<stop offset="100%" stop-color="' + C.robe2 + '"/>',
        '</linearGradient>',
        '<radialGradient id="' + goldGrad + '" cx="35%" cy="30%" r="75%">',
          '<stop offset="0%" stop-color="#f9e3a4"/>',
          '<stop offset="55%" stop-color="' + C.gold + '"/>',
          '<stop offset="100%" stop-color="' + C.gold2 + '"/>',
        '</radialGradient>',
      '</defs>',

      '<g class="hk-body">',
        // سایه‌ی زمین
        '<ellipse cx="100" cy="193" rx="66" ry="9" fill="rgba(0,0,0,.28)"/>',

        // ردا (شانه‌ها)
        '<path d="M 32 200 L 36 150 Q 40 138 70 134 L 130 134 Q 160 138 164 150 L 168 200 Z" fill="url(#' + robeGrad + ')"/>',
        '<path d="M 42 156 Q 100 145 158 156" stroke="' + C.robe2 + '" stroke-width="3" fill="none" opacity=".55"/>',

        // عصای چوبی با سر طلایی
        '<rect x="159" y="50" width="9" height="122" rx="4.5" fill="' + C.wood + '"/>',
        '<rect x="160.5" y="50" width="2.5" height="122" rx="1.2" fill="' + C.wood2 + '" opacity=".5"/>',
        '<rect x="162" y="52" width="1.6" height="118" rx="0.8" fill="' + C.woodHi + '" opacity=".6"/>',
        '<circle cx="163.5" cy="46" r="9.5" fill="url(#' + goldGrad + ')"/>',
        '<circle cx="161" cy="43.5" r="3" fill="#fff" opacity=".8"/>',
        spark(146, 40, 4.5, C.goldHi, 'hk-spark'),
        spark(180, 50, 3.5, C.goldHi, 'hk-spark'),
        spark(176, 30, 3, C.goldHi, 'hk-spark'),

        // گوش‌ها
        '<ellipse cx="66" cy="93" rx="7.5" ry="10.5" fill="' + C.skinMid + '"/>',
        '<ellipse cx="66" cy="94" rx="3" ry="5" fill="' + C.skinLo + '" opacity=".55"/>',
        '<ellipse cx="134" cy="93" rx="7.5" ry="10.5" fill="' + C.skinMid + '"/>',
        '<ellipse cx="134" cy="94" rx="3" ry="5" fill="' + C.skinLo + '" opacity=".55"/>',

        // صورت
        '<ellipse cx="100" cy="92" rx="35" ry="37" fill="url(#' + skinGrad + ')"/>',
        '<path d="M 76 120 Q 100 130 124 120" stroke="' + C.skinLo + '" stroke-width="1.5" fill="none" opacity=".3"/>',

        // بینی
        '<ellipse cx="100" cy="105" rx="7.5" ry="9" fill="' + C.skinMid + '"/>',
        '<path d="M 96 112 Q 100 115 104 112" stroke="' + C.skinLo + '" stroke-width="1.6" fill="none" opacity=".7"/>',
        '<ellipse cx="102" cy="101" rx="2.4" ry="2.8" fill="#fff" opacity=".45"/>',

        // ریش سفید
        '<path d="M 66 108 C 62 138 74 162 100 168 C 126 162 138 138 134 108 C 126 120 114 124 100 124 C 86 124 74 120 66 108 Z" fill="url(#' + beardGrad + ')"/>',
        '<path d="M 84 138 Q 100 148 116 138" stroke="' + C.beard2 + '" stroke-width="1.6" fill="none"/>',
        '<path d="M 88 150 Q 100 158 112 150" stroke="' + C.beard2 + '" stroke-width="1.4" fill="none" opacity=".7"/>',
        '<path d="M 76 124 Q 86 130 94 126" stroke="' + C.beard2 + '" stroke-width="1.4" fill="none" opacity=".6"/>',
        '<path d="M 106 126 Q 114 130 124 124" stroke="' + C.beard2 + '" stroke-width="1.4" fill="none" opacity=".6"/>',

        // سبیل
        '<path d="M 74 120 Q 88 110 100 118 Q 112 110 126 120 Q 113 130 100 124 Q 87 130 74 120 Z" fill="' + C.beard + '" stroke="' + C.beard2 + '" stroke-width="1"/>',

        // اجزای وابسته به حالت
        f.cheeks,
        f.mouth,
        '<g' + (f.blink ? ' class="hk-eyes"' : '') + '>' + f.eyes + '</g>',
        f.brows,

        // کلاه جادوگر بنفش
        '<g class="hk-hat">',
          '<ellipse cx="100" cy="57" rx="54" ry="14" fill="' + C.hat2 + '"/>',
          '<ellipse cx="100" cy="55" rx="50" ry="11" fill="' + C.hat3 + '" opacity=".25"/>',
          '<path d="M 54 56 C 60 26 92 13 128 12 C 138 11.6 146 18 147 56 C 126 63 74 63 54 56 Z" fill="url(#' + hatGrad + ')"/>',
          '<path d="M 72 45 C 82 27 96 19 116 16" stroke="' + C.hat3 + '" stroke-width="2.5" fill="none" opacity=".4"/>',
          '<path d="M 58 58 Q 100 48 146 58" stroke="' + C.gold + '" stroke-width="9" fill="none" stroke-linecap="round"/>',
          '<path d="M 62 59 Q 100 51 142 59" stroke="' + C.gold2 + '" stroke-width="1.6" fill="none" opacity=".5"/>',
          '<circle cx="128" cy="12" r="5" fill="url(#' + goldGrad + ')"/>',
          '<circle cx="126.5" cy="10.5" r="1.6" fill="#fff" opacity=".85"/>',
          spark(97, 32, 4.5, C.goldHi, 'hk-spark'),
        '</g>',

        f.extras,
      '</g>',
      '</svg>'
    ].join('');
  }

  // ساخت همه‌ی چهره‌ها (هم نام جدید، هم alias قدیمی)
  const HAKIM_FACES = {};
  MOODS.forEach((m) => { HAKIM_FACES[m] = buildFaceSVG(m); });
  Object.keys(MOOD_ALIASES).forEach((a) => { HAKIM_FACES[a] = HAKIM_FACES[MOOD_ALIASES[a]]; });

  // ============================================================
  // 🎭 ایموجی → حالت
  // ============================================================
  const EMOJI_TO_MOOD = {
    '🧙‍♂️':'wise', '🧙':'wise', '👴':'wise', '✨':'wise', '📿':'wise', '👑':'wise',
    '🤩':'excited', '🎉':'excited', '🥳':'excited', '⭐':'excited', '⚡':'excited', '🔥':'excited', '🏆':'excited',
    '😎':'wink', '😉':'wink',
    '😊':'happy', '😄':'happy', '🤗':'happy', '💪':'happy',
    '🤔':'thinking', '📚':'thinking',
    '😅':'sad', '😢':'sad', '💔':'sad', '⏳':'sad',
    '😴':'sleepy', '💤':'sleepy',
    '❓':'surprised', '😲':'surprised', '👀':'surprised',
    '👂':'normal', '🙂':'normal', '😐':'normal'
  };

  // ============================================================
  // 💬 پیام‌ها
  // ============================================================
  const HAKIM_PHRASES = {
    intro: [
      'سلام {name} جان! من حکیمم، همراه تو در این سفر. هر وقت لازم باشه، راهنماییت می‌کنم.',
      '{name} عزیز، خوش آمدی. من حکیمم. با هم تاریخ رو زنده می‌کنیم.'
    ],
    correctFast: [
      'آفرین {name}! در {t} ثانیه جواب دادی. خیلی سریع بودی ⚡',
      'آفرین! چه سرعتی! انگار این سوال رو از قبل می‌دونستی.',
      '{t} ثانیه؟! عالیه {name}! داری خوب پیش می‌ری 🔥'
    ],
    correctMedium: [
      'آفرین {name}. درست گفتی.',
      'کارت درسته. خوب فکر کردی.',
      'درست بود. حالا مطمئن شدم که یادت مونده.'
    ],
    correctSlow: [
      'آفرین که با دقت فکر کردی {name}. تاریخ جای عجله نداره.',
      'کمی طول کشید ولی درست بود. عجله نکن، یاد می‌گیری.',
      'درست گفتی. حالا مطمئن‌ترم که یادت مونده.'
    ],
    wrong: [
      'اشکالی نداره {name}. همه اول اشتباه می‌کنن.',
      'نگران نباش. این اشتباه خودش یه درس بود.',
      'پاسخ درست رو که خوندی، یه قدم به جلو رفتی.'
    ],
    wrongFast: [
      'عجله کردی {name}! تاریخ جای شتاب نیست.',
      'سرعت خوبه ولی نه وقتی اشتباه می‌کنی. یه نفس بکش.'
    ],
    timeout: [
      'زمان تموم شد. تاریخ عجله نداره {name}. یه نفس عمیق بکش.',
      'اشکالی نداره. دفعه بعد سریع‌تر تصمیم بگیر.'
    ],
    recovery: [
      'آفرین {name}! بعد از اشتباه، محکم برگشتی 💪',
      'همینه! حالا که جبرانش کردی، قوی‌تر ادامه بده.'
    ],
    streak3: [
      'سه تا پشت سر هم! داری گرم می‌شی {name} 🔥',
      'سه تا! عالیه! ادامه بده!'
    ],
    streak5: [
      'پنج تا پشت سر هم! {name}، داری پیشرفت می‌کنی! 👑',
      '👑 بی‌نظیر! پنج پاسخ درست پشت سر هم! عالیه!'
    ],
    win: [
      'آفرین {name} جان! بردی! 🏆',
      'پیروزی از آنِ تو شد {name}! همیشه همین‌طور بدرخش ✨',
      'شیرین‌تر از این نمی‌شد {name}! بردی! 🎉'
    ],
    weakLesson: {
      18: 'می‌بینم که درس ۱۸ کمی اذیتت می‌کنه. قیام سیاه‌جامگان و حکومت‌های ایرانی مثل سامانیان.',
      19: 'درس ۱۹ رو کم‌کم از دست می‌دی {name}. سلجوقیان، وزیران کاردان مثل خواجه نظام‌الملک.',
      20: 'درس ۲۰ تلخه، می‌دونم. حمله مغول و تیمور. حواست به تفاوت چنگیز و هلاکو باشه.',
      21: 'درس ۲۱ امیدوارکننده‌ست {name}: بازسازی. خواجه نصیر و رشیدالدین اینجا نقش دارن.'
    },
    cityConquered: [
      '🏆 {city} فتح شد! یه قدم دیگه به وحدت ایران نزدیک شدیم.',
      '{city} از آنِ ما شد {name}! افتخار کن.'
    ],
    perfectCity: [
      '{city} رو بی‌نقص فتح کردی! حتی بدون یک اشتباه 🤩',
      '👑 {city} بدون خطا! این یعنی تسلط واقعی.'
    ],
    lowHearts: [
      '{name} جان، فقط {h} قلب داری. محتاط باش.',
      'مراقب باش! آخرین فرصت‌هاست.'
    ]
  };

  // ============================================================
  // 🧠 پروفایل (بدون تغییر نسبت به v2)
  // ============================================================
  function createProfile() {
    return {
      lesson: { 18:{c:0,w:0}, 19:{c:0,w:0}, 20:{c:0,w:0}, 21:{c:0,w:0} },
      consecutiveCorrect: 0, consecutiveWrong: 0,
      maxConsecutiveCorrect: 0, maxConsecutiveWrong: 0,
      recovered: 0, lastWasWrong: false,
      fastWins: 0, slowCorrects: 0,
      weakLessonWarned: {}, _shownRecovery: false
    };
  }

  // ============================================================
  // 🎨 CSS (تزریق خودکار + fallback)
  // ============================================================
  function injectStyles() {
    if (document.getElementById('hakim-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'hakim-core-styles';
    style.textContent = [
      // ── پنل ──────────────────────────────────────────────
      '.hakim-panel,.hakim-panel *{box-sizing:border-box}',
      '.hakim-panel{',
        '--hk-gold:#e9b44c;--hk-gold2:#c9922f;--hk-ink:#2a1a0a;',
        '--hk-font:Vazirmatn,"Segoe UI",Tahoma,sans-serif;',
        'display:none;position:relative;max-width:760px;margin:0 auto 16px;',
        'padding:14px 16px;gap:14px;align-items:flex-start;',
        'border-radius:22px;border:1.5px solid rgba(233,180,76,.30);',
        'background:linear-gradient(145deg,rgba(48,32,14,.92),rgba(24,16,6,.94));',
        'box-shadow:0 10px 34px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);',
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
        'overflow:hidden;font-family:var(--hk-font);direction:rtl;text-align:right;',
        'color:#f6edd8',
      '}',
      '.hakim-panel.active{display:flex;animation:hkPanelIn .5s cubic-bezier(.22,1,.36,1)}',
      '.hakim-panel.active.leaving{animation:hkPanelOut .3s ease forwards}',
      '.hakim-panel.speaking{box-shadow:0 10px 40px rgba(233,180,76,.28),inset 0 1px 0 rgba(255,255,255,.08)}',
      '.hakim-panel::before{content:"";position:absolute;top:0;right:-60px;width:260px;height:100%;',
        'background:radial-gradient(ellipse at right,rgba(233,180,76,.12),transparent 65%);pointer-events:none}',

      // ── آواتار ───────────────────────────────────────────
      '.hakim-avatar{position:relative;width:96px;height:96px;flex-shrink:0;border-radius:50%;',
        'background:radial-gradient(circle at 30% 28%,#ffe9b0 0%,var(--hk-gold) 42%,#8a5a1a 100%);',
        'display:flex;align-items:center;justify-content:center;',
        'box-shadow:0 0 22px rgba(233,180,76,.45),inset 0 -4px 10px rgba(0,0,0,.35);',
        'transition:box-shadow .45s,transform .45s}',
      '.hakim-glow{position:absolute;inset:-7px;border-radius:50%;',
        'background:radial-gradient(circle,rgba(233,180,76,.55),transparent 70%);',
        'animation:hkGlow 5s ease-in-out infinite;pointer-events:none;z-index:0}',
      '.hakim-face{position:absolute;inset:4px;border-radius:50%;overflow:visible;z-index:1;',
        'display:flex;align-items:center;justify-content:center;',
        'background:radial-gradient(circle at 42% 30%,#2c2040 0%,#120a1e 100%);',
        'box-shadow:inset 0 0 12px rgba(0,0,0,.75)}',
      '.hakim-face svg{width:100%;height:100%;display:block;overflow:visible}',
      '.hakim-face.face-change{animation:hkFaceChange .55s cubic-bezier(.34,1.56,.64,1)}',

      // هاله‌ی هر حالت
      '.hakim-panel[data-mood="wise"] .hakim-avatar{box-shadow:0 0 32px rgba(245,200,66,.75),inset 0 -4px 10px rgba(0,0,0,.35)}',
      '.hakim-panel[data-mood="excited"] .hakim-avatar{box-shadow:0 0 30px rgba(255,150,60,.65),inset 0 -4px 10px rgba(0,0,0,.35)}',
      '.hakim-panel[data-mood="happy"] .hakim-avatar{box-shadow:0 0 26px rgba(255,200,90,.55),inset 0 -4px 10px rgba(0,0,0,.35)}',
      '.hakim-panel[data-mood="sad"] .hakim-avatar{box-shadow:0 0 24px rgba(120,160,255,.55),inset 0 -4px 10px rgba(0,0,0,.35)}',
      '.hakim-panel[data-mood="surprised"] .hakim-avatar{box-shadow:0 0 26px rgba(120,220,255,.6),inset 0 -4px 10px rgba(0,0,0,.35)}',
      '.hakim-panel[data-mood="sleepy"] .hakim-avatar{box-shadow:0 0 20px rgba(150,150,255,.4),inset 0 -4px 10px rgba(0,0,0,.35)}',

      // ── حباب دیالوگ ─────────────────────────────────────
      '.hakim-bubble{position:relative;flex:1;min-width:0;',
        'background:rgba(255,255,255,.055);border:1px solid rgba(233,180,76,.16);',
        'border-radius:16px 6px 16px 16px;padding:10px 14px 12px;',
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
      '.hakim-bubble::after{content:"";position:absolute;top:18px;right:-7px;width:12px;height:12px;',
        'background:#33220e;border:1px solid rgba(233,180,76,.16);border-left:none;border-bottom:none;transform:rotate(45deg)}',
      '.hakim-name{display:inline-flex;align-items:center;gap:6px;font-size:.7rem;font-weight:800;',
        'color:#f5c842;letter-spacing:.4px;margin-bottom:6px;padding:2px 11px;border-radius:99px;',
        'background:rgba(233,180,76,.10);border:1px solid rgba(233,180,76,.18)}',
      '.hakim-name .hakim-dot{width:7px;height:7px;border-radius:50%;background:#2ecc71;',
        'box-shadow:0 0 8px #2ecc71;animation:hkDot 1.8s infinite}',
      '.hakim-text{font-size:.95rem;color:#f6edd8;line-height:1.9;min-height:1.6em;font-weight:500;white-space:pre-wrap}',
      '.hakim-text.typing::after{content:"▍";color:#f5c842;animation:hkCursor .7s infinite;margin-right:2px}',

      // ── دسترس‌پذیری ─────────────────────────────────────
      '.hakim-sr-only,.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;',
        'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',

      // ── تم‌ها ───────────────────────────────────────────
      'body[data-theme="dark"] .hakim-panel{background:linear-gradient(145deg,rgba(15,28,50,.92),rgba(5,12,24,.94));border-color:rgba(160,200,255,.25)}',
      'body[data-theme="dawn"] .hakim-panel{background:linear-gradient(145deg,rgba(55,21,61,.92),rgba(28,6,32,.94));border-color:rgba(255,157,108,.28)}',
      'body[data-theme="flag"] .hakim-panel{background:linear-gradient(145deg,rgba(13,38,24,.92),rgba(5,18,10,.94));border-color:rgba(46,204,113,.3)}',

      // ── کاغذ رنگی (confetti) ────────────────────────────
      '.hakim-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5}',
      '.hakim-confetti i{position:absolute;top:-16px;display:block;',
        'animation-name:hkConfetti;animation-timing-function:ease-in;animation-fill-mode:forwards}',

      // ── گزارش ───────────────────────────────────────────
      '.hakim-report-line{font-size:.85rem;color:#f6edd8;line-height:1.9;padding:12px 14px;',
        'background:rgba(233,180,76,.07);border-radius:12px;border-right:3px solid #c9922f;',
        'margin-bottom:12px;text-align:right;font-weight:600}',
      '.hakim-lesson-grid{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}',
      '.hakim-lesson-item{padding:10px 12px;background:rgba(0,0,0,.25);',
        'border:1px solid rgba(233,180,76,.15);border-radius:12px}',
      '.hl-name{font-size:.75rem;font-weight:800;color:#fff3b0;margin-bottom:6px;text-align:right}',
      '.hl-bar{height:10px;background:rgba(255,255,255,.06);border-radius:20px;overflow:hidden;margin-bottom:5px}',
      '.hl-fill{height:100%;border-radius:20px;transition:width .6s cubic-bezier(.4,0,.2,1);box-shadow:0 0 8px currentColor}',
      '.hl-stat{font-size:.68rem;font-weight:700;text-align:right}',
      '.hakim-report-sign{text-align:center;font-size:.7rem;color:#f5c842;font-weight:700;',
        'letter-spacing:1px;margin-top:16px;padding-top:12px;border-top:1px dashed rgba(233,180,76,.25)}',

      // ── موبایل ──────────────────────────────────────────
      '@media (max-width:420px){',
        '.hakim-avatar{width:80px;height:80px}',
        '.hakim-text{font-size:.88rem}',
        '.hakim-panel{padding:12px;gap:11px}',
      '}',

      // ── keyframes ───────────────────────────────────────
      '@keyframes hkPanelIn{0%{opacity:0;transform:translateY(16px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes hkPanelOut{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(12px) scale(.97)}}',
      '@keyframes hkBreath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2.5px) scale(1.015)}}',
      '@keyframes hkBlink{0%,90%,100%{transform:scaleY(1)}93%,96%{transform:scaleY(.08)}}',
      '@keyframes hkHatWiggle{0%,100%{transform:rotate(0)}45%{transform:rotate(-2.6deg)}70%{transform:rotate(2.2deg)}}',
      '@keyframes hkTwinkle{0%,100%{transform:scale(.4) rotate(0);opacity:.25}50%{transform:scale(1.15) rotate(20deg);opacity:1}}',
      '@keyframes hkZzz{0%{transform:translate(0,0);opacity:0}20%{opacity:.9}100%{transform:translate(6px,-14px);opacity:0}}',
      '@keyframes hkTear{0%{transform:translateY(0);opacity:0}30%{opacity:.95}100%{transform:translateY(14px);opacity:0}}',
      '@keyframes hkSpeak{0%,100%{transform:scale(1) rotate(0)}30%{transform:scale(1.12) rotate(-6deg)}70%{transform:scale(1.06) rotate(5deg)}}',
      '@keyframes hkGlow{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.85;transform:scale(1.12)}}',
      '@keyframes hkFaceChange{0%{transform:scale(1) rotate(0)}35%{transform:scale(.82) rotate(-7deg)}70%{transform:scale(1.05) rotate(3deg)}100%{transform:scale(1) rotate(0)}}',
      '@keyframes hkDot{0%,100%{opacity:1}50%{opacity:.35}}',
      '@keyframes hkCursor{50%{opacity:0}}',
      '@keyframes hkConfetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(300px) rotate(540deg);opacity:.85}}',

      // انیمیشن‌های داخل SVG
      '.hk-body{transform-box:fill-box;transform-origin:50% 100%;animation:hkBreath 4.2s ease-in-out infinite}',
      '.hk-eyes{transform-box:fill-box;transform-origin:center;animation:hkBlink 4.8s infinite}',
      '.hk-hat{transform-box:fill-box;transform-origin:50% 96%;animation:hkHatWiggle 7s ease-in-out infinite}',
      '.hk-spark{transform-box:fill-box;transform-origin:center;animation:hkTwinkle 2.6s ease-in-out infinite}',
      '.hk-star{transform-box:fill-box;transform-origin:center;animation:hkTwinkle 1.9s ease-in-out infinite}',
      '.hk-zzz{animation:hkZzz 2.8s ease-out infinite}',
      '.hk-zzz:nth-of-type(2){animation-delay:.35s}',
      '.hk-zzz:nth-of-type(3){animation-delay:.7s}',
      '.hk-tear{transform-box:fill-box;animation:hkTear 2.4s ease-in infinite}',
      '.hakim-panel.speaking .hakim-avatar{animation:hkSpeak .7s cubic-bezier(.175,.885,.32,1.275)}',

      // کاهش حرکت (دسترس‌پذیری)
      '@media (prefers-reduced-motion:reduce){',
        '.hakim-panel,.hakim-panel *{animation:none !important;transition:none !important}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  // ============================================================
  // 🧠 state
  // ============================================================
  const state = {
    panelEl: null, faceEl: null, textEl: null, srEl: null,
    typeTimer: null, hideTimer: null, hideAnimTimer: null,
    name: 'دوست من', mood: 'normal',
    autoHideMs: 4200,
    initialized: false
  };

  // ============================================================
  // 🔍 پیدا کردن یا ساخت پنل
  // ============================================================
  function findExistingPanel(containerOption) {
    if (containerOption) {
      const container = typeof containerOption === 'string'
        ? document.querySelector(containerOption)
        : containerOption;
      if (container) {
        if (container.classList && container.classList.contains('hakim-panel')) return container;
        const inside = container.querySelector && container.querySelector('.hakim-panel');
        if (inside) return inside;
      }
    }
    return document.querySelector('.hakim-panel') || document.getElementById('hakimPanel');
  }

  function buildPanelHTML() {
    return (
      '<div class="hakim-panel" id="hakimPanel">' +
        '<div class="hakim-avatar">' +
          '<div class="hakim-glow" aria-hidden="true"></div>' +
          '<div class="hakim-face" id="hakimFace" aria-hidden="true"></div>' +
        '</div>' +
        '<div class="hakim-bubble">' +
          '<div class="hakim-name"><span class="hakim-dot" aria-hidden="true"></span> حکیم، همراه تو</div>' +
          '<div class="hakim-text" id="hakimText" aria-hidden="true"></div>' +
          '<div class="hakim-sr-only" id="hakimSrText" role="status" aria-live="polite"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function bindPanelEls(panelEl) {
    state.panelEl = panelEl;
    state.faceEl = panelEl.querySelector('.hakim-face') || panelEl.querySelector('#hakimFace');
    state.textEl = panelEl.querySelector('.hakim-text') || panelEl.querySelector('#hakimText');
    state.srEl   = panelEl.querySelector('#hakimSrText') || panelEl.querySelector('.hakim-sr-only');
  }

  // ============================================================
  // 🎯 API اصلی
  // ============================================================
  function init(options) {
    options = options || {};
    injectStyles();
    if (options.font !== false) injectFont();
    if (options.name) state.name = String(options.name);
    if (typeof options.autoHideMs === 'number') state.autoHideMs = options.autoHideMs;

    let panelEl = findExistingPanel(options.container);

    if (!panelEl && options.container) {
      const container = typeof options.container === 'string'
        ? document.querySelector(options.container)
        : options.container;
      if (container) {
        container.insertAdjacentHTML('beforeend', buildPanelHTML());
        panelEl = container.querySelector('.hakim-panel');
      }
    }

    if (!panelEl) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'max-width:760px;margin:12px auto 0;padding:0 14px;';
      wrapper.innerHTML = buildPanelHTML();
      document.body.insertBefore(wrapper, document.body.firstChild);
      panelEl = wrapper.querySelector('.hakim-panel');
    }

    bindPanelEls(panelEl);
    setMood('normal');
    state.initialized = true;
    return api;
  }

  function injectFont() {
    if (document.getElementById('hakim-font')) return;
    try {
      const link = document.createElement('link');
      link.id = 'hakim-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800&display=swap';
      document.head.appendChild(link);
    } catch (e) { /* آفلاین: فونت fallback استفاده می‌شود */ }
  }

  function setMood(mood) {
    if (!state.faceEl) return;
    const m = resolveMood(mood);
    if (state.faceEl.dataset.mood === m) return;
    state.mood = m;
    state.faceEl.dataset.mood = m;
    if (state.panelEl) state.panelEl.dataset.mood = m;
    state.faceEl.innerHTML = HAKIM_FACES[m];
    state.faceEl.classList.remove('face-change');
    void state.faceEl.offsetWidth;
    state.faceEl.classList.add('face-change');
  }

  function renderFace(mood, element) {
    if (!element) return;
    const m = resolveMood(mood);
    element.innerHTML = HAKIM_FACES[m];
    element.classList.remove('face-change');
    void element.offsetWidth;
    element.classList.add('face-change');
  }

  function say(text, opts) {
    opts = opts || {};
    if (!state.panelEl || !state.textEl) return;
    const msg = String(text || '');
    if (!msg) return;

    let mood = opts.mood;
    if (!mood && opts.emoji) mood = EMOJI_TO_MOOD[opts.emoji];
    if (mood) setMood(mood);

    if (state.hideAnimTimer) { clearTimeout(state.hideAnimTimer); state.hideAnimTimer = null; }
    state.panelEl.classList.remove('leaving');
    state.panelEl.classList.add('active', 'speaking');
    state.textEl.textContent = '';
    state.textEl.classList.add('typing');
    if (state.srEl) state.srEl.textContent = '';

    clearInterval(state.typeTimer);
    clearTimeout(state.hideTimer);

    const speed = opts.speed || 22;
    let i = 0;
    state.typeTimer = setInterval(() => {
      state.textEl.textContent += msg.charAt(i);
      i++;
      if (i >= msg.length) {
        clearInterval(state.typeTimer);
        state.typeTimer = null;
        state.textEl.classList.remove('typing');
        if (state.srEl) state.srEl.textContent = msg;
      }
    }, speed);

    setTimeout(() => { if (state.panelEl) state.panelEl.classList.remove('speaking'); }, 700);

    const autoHide = opts.autoHide !== false && !opts.permanent;
    if (autoHide) {
      const total = msg.length * speed + state.autoHideMs;
      state.hideTimer = setTimeout(() => hide(), total);
    }
  }

  function sayRandom(category, vars, opts) {
    const arr = HAKIM_PHRASES[category];
    if (!arr) return;
    const msg = fillTemplate(pickPhrase(arr), vars || { name: state.name });
    say(msg, opts);
  }

  function show() {
    if (!state.panelEl) return;
    if (state.hideAnimTimer) { clearTimeout(state.hideAnimTimer); state.hideAnimTimer = null; }
    state.panelEl.classList.remove('leaving');
    state.panelEl.classList.add('active');
  }

  function hide() {
    if (!state.panelEl) return;
    const el = state.panelEl;
    if (el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    state.hideAnimTimer = setTimeout(() => {
      el.classList.remove('active', 'leaving');
      setMood('normal');
    }, 300);
  }

  function reset() {
    clearInterval(state.typeTimer);
    clearTimeout(state.hideTimer);
    if (state.hideAnimTimer) { clearTimeout(state.hideAnimTimer); state.hideAnimTimer = null; }
    if (state.textEl) state.textEl.textContent = '';
    if (state.srEl) state.srEl.textContent = '';
    if (state.panelEl) state.panelEl.classList.remove('active', 'speaking', 'leaving');
    setMood('normal');
  }

  function setName(name) { state.name = String(name || 'دوست من'); }
  function getName() { return state.name; }
  function isReady() { return state.initialized; }

  // ============================================================
  // 📊 track / react
  // ============================================================
  function track(profile, correct, timeUsed, lesson) {
    if (!profile || !profile.lesson) return;
    const p = profile;
    if (lesson && p.lesson[lesson]) {
      if (correct) p.lesson[lesson].c++; else p.lesson[lesson].w++;
    }
    if (correct) {
      p.consecutiveCorrect++;
      p.consecutiveWrong = 0;
      if (p.consecutiveCorrect > p.maxConsecutiveCorrect) p.maxConsecutiveCorrect = p.consecutiveCorrect;
      if (p.lastWasWrong) { p.recovered++; p.lastWasWrong = false; }
      if (timeUsed <= 5) p.fastWins++;
      if (timeUsed >= 10) p.slowCorrects++;
    } else {
      p.consecutiveWrong++;
      p.consecutiveCorrect = 0;
      if (p.consecutiveWrong > p.maxConsecutiveWrong) p.maxConsecutiveWrong = p.consecutiveWrong;
      p.lastWasWrong = true;
    }
  }

  function react(profile, correct, timeUsed, lesson, wasTimeout) {
    // 🎉 کاغذ رنگی برای برد: Hakim.react('win')
    if (profile === 'win') { celebrate('win'); return; }
    if (!profile) return;

    const p = profile;
    const name = state.name;

    if (correct) {
      if (p.consecutiveCorrect === 3) sayRandom('streak3', { name }, { emoji: '🤩' });
      else if (p.consecutiveCorrect === 5) { sayRandom('streak5', { name }, { emoji: '👑' }); burstConfetti(state.panelEl); }
      else if (p.recovered > 0 && p.recovered <= 2 && !p._shownRecovery) {
        sayRandom('recovery', { name }, { emoji: '💪' });
        p._shownRecovery = true;
      }
      else if (timeUsed <= 5) sayRandom('correctFast', { name, t: toEnglishNum(timeUsed) }, { emoji: '😎' });
      else if (timeUsed >= 10) sayRandom('correctSlow', { name }, { emoji: '🤔' });
      else sayRandom('correctMedium', { name }, { emoji: '😊' });
    } else {
      if (wasTimeout) sayRandom('timeout', { name }, { emoji: '⏳' });
      else if (timeUsed <= 4) sayRandom('wrongFast', { name }, { emoji: '😅' });
      else sayRandom('wrong', { name }, { emoji: '🤔' });

      if (lesson && p.lesson[lesson] && p.lesson[lesson].w >= 2 && !p.weakLessonWarned[lesson]) {
        p.weakLessonWarned[lesson] = true;
        const hint = HAKIM_PHRASES.weakLesson[lesson];
        if (hint) setTimeout(() => say(fillTemplate(hint, { name }), { emoji: '📚' }), 3200);
      }
    }
  }

  function onCityConquered(cityName, isPerfect) {
    const name = state.name;
    if (isPerfect) {
      burstConfetti(state.panelEl);
      sayRandom('perfectCity', { city: cityName, name }, { emoji: '👑' });
    } else {
      sayRandom('cityConquered', { city: cityName, name }, { emoji: '🏆' });
    }
  }

  function onLowHearts(hearts) {
    sayRandom('lowHearts', { name: state.name, h: toEnglishNum(hearts) }, { emoji: '💔' });
  }

  // ============================================================
  // 🎉 جشن / کاغذ رنگی
  // ============================================================
  function burstConfetti(panelEl) {
    if (!panelEl) return;
    let layer = panelEl.querySelector('.hakim-confetti');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'hakim-confetti';
      layer.setAttribute('aria-hidden', 'true');
      panelEl.appendChild(layer);
    }
    const colors = ['#f5c842', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#ff7eb9', '#7ef0ff'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      const c = colors[i % colors.length];
      p.style.cssText =
        'left:' + (Math.random() * 100).toFixed(1) + '%;' +
        'background:' + c + ';' +
        'width:' + (6 + Math.random() * 5).toFixed(1) + 'px;' +
        'height:' + (8 + Math.random() * 6).toFixed(1) + 'px;' +
        'animation-duration:' + (1.6 + Math.random() * 1.4).toFixed(2) + 's;' +
        'animation-delay:' + (Math.random() * 0.35).toFixed(2) + 's;' +
        'border-radius:' + (Math.random() > 0.5 ? '2px' : '50%');
      layer.appendChild(p);
    }
    setTimeout(() => { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 3600);
  }

  function celebrate(type) {
    burstConfetti(state.panelEl);
    const name = state.name;
    const phrase = type === 'city'
      ? pickPhrase(HAKIM_PHRASES.cityConquered)
      : pickPhrase(HAKIM_PHRASES.win);
    say(fillTemplate(phrase, { name }), { emoji: '🎉', permanent: true });
  }

  // ============================================================
  // 📜 گزارش (بدون تغییر نسبت به v2)
  // ============================================================
  function buildReport(profile, options) {
    if (!profile || !profile.lesson) return '';
    options = options || {};
    const p = profile;
    const name = state.name;
    const lessonNames = { 18:'قیام و حکومت‌های ایرانی', 19:'سلجوقیان و وزیران کاردان', 20:'حمله مغول و تیمور', 21:'بازسازی ایران' };
    let html = '';
    const totalWrong = [18,19,20,21].reduce((a, l) => a + p.lesson[l].w, 0);
    let personality;
    if (p.fastWins >= 4 && totalWrong <= 3) personality = name + ' جان، تو یه تاریخ‌دان سریع و دقیقی.';
    else if (p.slowCorrects >= 3) personality = name + ' جان، تو با دقت فکر می‌کنی.';
    else if (p.recovered >= 3) personality = name + ' جان، شکست‌ها تو رو متوقف نمی‌کنن.';
    else if (p.maxConsecutiveCorrect >= 5) personality = name + ' جان، وقتی شروع می‌کنی، پشت سر هم درست جواب می‌دی.';
    else personality = name + ' جان، تو یه تاریخ‌آموز کنجکاوی.';
    html += '<div class="hakim-report-line">' + personality + '</div>';

    if (options.commander) {
      const cmd = options.commander;
      html += '<div class="hakim-report-line" style="background:rgba(155,89,182,0.08);border-right-color:#9b59b6;">' +
        (cmd.icon || '') + ' <strong>سردارت:</strong> ' + cmd.name + ' (' + (cmd.title || '') + ') — ' + (cmd.desc || '') +
      '</div>';
    }

    html += '<div class="hakim-lesson-grid">';
    const lessonStats = [];
    for (const lesson of [18,19,20,21]) {
      const l = p.lesson[lesson];
      const total = l.c + l.w;
      if (total === 0) continue;
      const pct = Math.round((l.c / total) * 100);
      let grade, color;
      if (pct >= 80) { grade = 'عالی'; color = '#2ecc71'; }
      else if (pct >= 60) { grade = 'خوب'; color = '#3498db'; }
      else if (pct >= 40) { grade = 'قابل قبول'; color = '#e67e22'; }
      else { grade = 'نیاز به مرور'; color = '#e74c3c'; }
      lessonStats.push({ lesson, pct });
      html += '<div class="hakim-lesson-item"><div class="hl-name">درس ' + toEnglishNum(lesson) + ': ' + lessonNames[lesson] +
        '</div><div class="hl-bar"><div class="hl-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<div class="hl-stat" style="color:' + color + '">' + grade + ' — ' + toEnglishNum(l.c) + ' از ' + toEnglishNum(total) +
        '</div></div>';
    }
    html += '</div>';

    const weakest = lessonStats.slice().sort((a, b) => a.pct - b.pct)[0];
    if (weakest && weakest.pct < 60) {
      html += '<div class="hakim-report-line" style="background:rgba(233,180,76,0.10);border-right-color:#f5c842;">📌 پیشنهاد من: یه بار دیگه درس ' +
        toEnglishNum(weakest.lesson) + ' رو مرور کن.</div>';
    } else if (lessonStats.length > 0) {
      html += '<div class="hakim-report-line" style="background:rgba(46,204,113,0.10);border-right-color:#2ecc71;">🌟 همه‌ی درس‌ها رو خوب بلدی ' + name + '.</div>';
    }
    html += '<div class="hakim-report-sign">✦ حکیم، همراه تو در این سفر</div>';
    return html;
  }

  // ============================================================
  // 🌟 میان‌بُرها (نام جدید + alias قدیمی) + moods
  // ============================================================
  const shortcuts = {};
  MOODS.forEach((m) => { shortcuts[m] = () => setMood(m); });
  Object.keys(MOOD_ALIASES).forEach((a) => { shortcuts[a] = () => setMood(a); });

  const moodsObj = {};
  MOODS.forEach((m) => { moodsObj[m] = shortcuts[m]; });
  Object.keys(MOOD_ALIASES).forEach((a) => { moodsObj[a] = shortcuts[a]; });

  // ============================================================
  // 🎁 API نهایی
  // ============================================================
  const api = Object.assign({
    init, setMood, renderFace,
    say, sayRandom,
    show, hide, reset,
    setName, getName, isReady,
    track, react, onCityConquered, onLowHearts,
    buildReport, createProfile,
    celebrate, burstConfetti,
    FACES: HAKIM_FACES,
    PHRASES: HAKIM_PHRASES,
    EMOJI_TO_MOOD,
    MOODS,
    MOOD_ALIASES,
    utils: { fillTemplate, pickPhrase, toEnglishNum, getLessonFromQ },
    VERSION: '3.0.0'
  }, shortcuts, { moods: moodsObj });

  global.Hakim = api;

})(typeof window !== 'undefined' ? window : this);
