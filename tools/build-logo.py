#!/usr/bin/env python3
"""build-logo — builds the official Hakimestan logo.

The output is a pure vector logo: the wordmark is real paths, not font text.
  assets/img/hakimestan-emblem.svg        emblem (round mark): favicon, stamp, small icon
  assets/img/hakimestan-logo.svg          horizontal (emblem + wordmark): site header
  assets/img/hakimestan-logo-stacked.svg  stacked: signature and stamp spot on certificates
  assets/img/hakimestan-logo-light.svg    horizontal, for dark backgrounds
  js/hakim-logo.js                        window.HakimLogo for drawing inline in pages and games

Emblem idea: a gold شمسه with an eight-pointed «خاتم» star (the geometry of
Iranian art), an open book (learning) and a flame above the book (the light
of knowledge, the «حکیم»).
Wordmark: «حکیمستان» in Nastaliq (Noto Nastaliq Urdu Bold, OFL) plus the
tagline «سرزمین یادگیری» in Vazirmatn.

usage: python3 tools/build-logo.py
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from text2path import shape  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = lambda n: os.path.join(ROOT, 'assets', 'fonts', n)

INK = '#2a1f52'
GOLD_D = '#a8741f'


def star_path(cx, cy, ro, n=8):
    ri = ro * math.cos(math.radians(45)) / math.cos(math.radians(22.5))
    pts = []
    for k in range(n * 2):
        a = math.radians(-90 + k * 22.5)
        r = ro if k % 2 == 0 else ri
        pts.append('%.2f %.2f' % (cx + r * math.cos(a), cy + r * math.sin(a)))
    return 'M' + 'L'.join(pts) + 'Z'


def emblem_body(p):
    """p = id prefix; returns the inner SVG of a 200×200 emblem."""
    dots = ''.join('<circle cx="%.2f" cy="%.2f" r="1.6"/>' % (100 + 93.5 * math.cos(math.radians(a)), 100 + 93.5 * math.sin(math.radians(a))) for a in range(0, 360, 15))
    return (
        '<defs>'
        '<linearGradient id="{p}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#e6b24a"/><stop offset="1" stop-color="#9c6a1c"/></linearGradient>'
        '<radialGradient id="{p}b" cx=".5" cy=".36" r=".72"><stop offset="0" stop-color="#43327f"/><stop offset=".7" stop-color="#271b57"/><stop offset="1" stop-color="#170f38"/></radialGradient>'
        '<linearGradient id="{p}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbf1"/><stop offset="1" stop-color="#efdcb2"/></linearGradient>'
        '<radialGradient id="{p}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a6" stop-opacity=".95"/><stop offset=".55" stop-color="#f3c45a" stop-opacity=".28"/><stop offset="1" stop-color="#f3c45a" stop-opacity="0"/></radialGradient>'
        '<linearGradient id="{p}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".5" stop-color="#f6c34f"/><stop offset="1" stop-color="#d9861f"/></linearGradient>'
        '</defs>'
        '<circle cx="100" cy="100" r="98" fill="url(#{p}g)"/>'
        '<circle cx="100" cy="100" r="98" fill="none" stroke="' + GOLD_D + '" stroke-width="1.2"/>'
        '<g fill="#7a5216" opacity=".55">' + dots + '</g>'
        '<circle cx="100" cy="100" r="88.5" fill="url(#{p}b)" stroke="#7a5216" stroke-width="1.2"/>'
        '<circle cx="100" cy="100" r="82" fill="none" stroke="url(#{p}g)" stroke-width="1" stroke-dasharray="1.5 3.5" opacity=".8"/>'
        '<path d="' + star_path(100, 100, 72) + '" fill="#f3c45a" fill-opacity=".09" stroke="url(#{p}g)" stroke-width="2.4" stroke-linejoin="round"/>'
        '<path d="' + star_path(100, 100, 58) + '" fill="none" stroke="#f3c45a" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"/>'
        '<circle cx="100" cy="80" r="34" fill="url(#{p}l)"/>'
        '<path d="M100 50c9 12 15.5 20.5 15.5 31.5a15.5 15.5 0 0 1-31 0C84.5 70.5 91 62 100 50z" fill="url(#{p}f)" stroke="#b9781c" stroke-width="1"/>'
        '<path d="M100 66c4.6 6.3 7.6 10.6 7.6 16a7.6 7.6 0 0 1-15.2 0c0-5.4 3-9.7 7.6-16z" fill="#fffbe8" opacity=".92"/>'
        '<g stroke="' + GOLD_D + '" stroke-width="1.4" stroke-linejoin="round">'
        '<path d="M100 112c-11-7.5-25-9-41-5.5v32c16-3.5 30-2 41 5.5z" fill="url(#{p}p)"/>'
        '<path d="M100 112c11-7.5 25-9 41-5.5v32c-16-3.5-30-2-41 5.5z" fill="url(#{p}p)"/>'
        '<path d="M57 110.5v31.5c17-3.6 31-1.6 43 6 12-7.6 26-9.6 43-6v-31.5" fill="none" stroke="url(#{p}g)" stroke-width="2.2"/>'
        '</g>'
        '<g stroke="#c39a52" stroke-width="1" stroke-linecap="round" fill="none" opacity=".85">'
        '<path d="M66 115.5c9-1.6 17-.8 26 3"/><path d="M66 122c9-1.6 17-.8 26 3"/><path d="M66 128.5c9-1.6 17-.8 26 3"/>'
        '<path d="M134 115.5c-9-1.6-17-.8-26 3"/><path d="M134 122c-9-1.6-17-.8-26 3"/><path d="M134 128.5c-9-1.6-17-.8-26 3"/>'
        '</g>'
        '<path d="M100 112v32.5" stroke="' + GOLD_D + '" stroke-width="1.6"/>'
        '<path d="M86 160h28" stroke="url(#{p}g)" stroke-width="2" stroke-linecap="round" opacity=".9"/>'
        '<path d="M100 155l3.2 5-3.2 5-3.2-5z" fill="url(#{p}g)"/>'
    ).replace('{p}', p)


def main():
    wm = shape(F('noto-nastaliq-urdu-700.woff2'), 'حکیمستان', 100)
    tg = shape(F('vazirmatn-700.woff2'), 'سرزمین یادگیری', 100)
    words = {}
    for key, txt in (('basmala', 'بسمه تعالی'), ('cert', 'گواهی‌نامه'), ('taqdir', 'تقدیرنامه'), ('loh', 'لوح تقدیر')):
        r = shape(F('noto-nastaliq-urdu-700.woff2'), txt, 100)
        words[key] = {'d': r['d'], 'bbox': r['bbox']}
    data = {'words': words, 'emblem': emblem_body('__P__'), 'wm': {'d': wm['d'], 'bbox': wm['bbox']}, 'tg': {'d': tg['d'], 'bbox': tg['bbox']}}

    def path_at(src, x, y, h, fill):
        b = src['bbox']
        sc = h / (b[3] - b[1])
        return ('<path transform="translate(%.2f %.2f) scale(%.4f) translate(%s %s)" fill="%s" d="%s"/>'
                % (x, y, sc, -b[0], -b[1], fill, src['d'])), (b[2] - b[0]) * sc

    H, TH = 150, 150 * 0.17
    WW = (wm['bbox'][2] - wm['bbox'][0]) * H / (wm['bbox'][3] - wm['bbox'][1])
    TW = (tg['bbox'][2] - tg['bbox'][0]) * TH / (tg['bbox'][3] - tg['bbox'][1])

    def svg(vb_w, vb_h, body, label='لوگوی حکیمستان'):
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" role="img" aria-label="%s">'
                '<title>%s</title>%s</svg>\n') % (vb_w, vb_h, label, label, body)

    out_dir = os.path.join(ROOT, 'assets', 'img')
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, 'hakimestan-emblem.svg'), 'w').write(svg(200, 200, emblem_body('e')))
    for name, ink, tag in (('hakimestan-logo.svg', INK, '#8a6420'), ('hakimestan-logo-light.svg', '#fff6dc', '#f3c45a')):
        W = 10 + WW + 26 + 206
        body = (path_at(wm, 10, 18, H, ink)[0] + path_at(tg, 10 + (WW - TW) / 2, 18 + H + TH * 0.55, TH, tag)[0]
                + '<g transform="translate(%.2f 6)">%s</g>' % (W - 206, emblem_body('h')))
        open(os.path.join(out_dir, name), 'w').write(svg(W, 212, body))
    W = max(WW, 200) + 20
    y = 186
    body = ('<g transform="translate(%.2f 4) scale(.85)">%s</g>' % ((W - 170) / 2, emblem_body('s'))
            + path_at(wm, (W - WW) / 2, y, H, INK)[0] + path_at(tg, (W - TW) / 2, y + H + TH * 0.55, TH, '#8a6420')[0])
    open(os.path.join(out_dir, 'hakimestan-logo-stacked.svg'), 'w').write(svg(W, y + H + TH * 1.55 + 6, body))

    # 4) JS
    js = r'''/* حکیمستان — لوگوی رسمی (ساخته‌شده با tools/build-logo.py؛ دستی ویرایش نکنید)
   HakimLogo.emblem({size})       → نشان گرد (شمسه، کتاب و چراغ دانش)
   HakimLogo.horizontal({tone})   → نشان + نوشتار نستعلیق «حکیمستان» (افقی)
   HakimLogo.stacked({tone})      → نشان بالای نوشتار؛ برای جای «امضا و مهر» گواهی‌ها
   tone: 'ink' (پیش‌فرض، روی زمینهٔ روشن) | 'light' (روی زمینهٔ تیره) */
(function (g) {
  'use strict';
  var D = __DATA__;
  var seq = 0;
  function emb(p) { return D.emblem.split('__P__').join(p); }
  function pathAt(src, x, y, h, fill) {
    var b = src.bbox, s = h / (b[3] - b[1]);
    return { svg: '<path transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s.toFixed(4) + ') translate(' + (-b[0]) + ' ' + (-b[1]) + ')" fill="' + fill + '" d="' + src.d + '"/>', w: (b[2] - b[0]) * s };
  }
  function wrap(w, h, body, o) {
    var label = (o && o.label) || 'لوگوی حکیمستان';
    var cls = 'hk-logo' + (o && o.className ? ' ' + o.className : '');
    var size = o && o.size ? ' width="' + o.size + '"' : '';
    return '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Math.round(w) + ' ' + Math.round(h) + '"' + size + ' role="img" aria-label="' + label + '" focusable="false"><title>' + label + '</title>' + body + '</svg>';
  }
  function tones(o) {
    var light = o && o.tone === 'light';
    return { ink: light ? '#fff6dc' : '#2a1f52', tag: light ? '#f3c45a' : '#8a6420' };
  }
  function emblem(o) { var p = 'hkl' + (++seq) + '_'; return wrap(200, 200, emb(p), o); }
  function measure() {
    var wb = D.wm.bbox, tb = D.tg.bbox, h = 150, th = h * 0.17;
    return { ww: (wb[2] - wb[0]) * h / (wb[3] - wb[1]), tw: (tb[2] - tb[0]) * th / (tb[3] - tb[1]), h: h, th: th };
  }
  function horizontal(o) {
    var t = tones(o), m = measure(), p = 'hkl' + (++seq) + '_';
    var W = 10 + m.ww + 26 + 206;
    var body = pathAt(D.wm, 10, 18, m.h, t.ink).svg + pathAt(D.tg, 10 + (m.ww - m.tw) / 2, 18 + m.h + m.th * 0.55, m.th, t.tag).svg +
      '<g transform="translate(' + (W - 206).toFixed(2) + ' 6)">' + emb(p) + '</g>';
    return wrap(W, 212, body, o);
  }
  function stacked(o) {
    var t = tones(o), m = measure(), p = 'hkl' + (++seq) + '_';
    var W = Math.max(m.ww, 200) + 20, y = 186;
    var body = '<g transform="translate(' + ((W - 170) / 2).toFixed(2) + ' 4) scale(.85)">' + emb(p) + '</g>' +
      pathAt(D.wm, (W - m.ww) / 2, y, m.h, t.ink).svg +
      ((o && o.tagline === false) ? '' : pathAt(D.tg, (W - m.tw) / 2, y + m.h + m.th * 0.55, m.th, t.tag).svg);
    return wrap(W, y + m.h + m.th * 1.55 + 6, body, o);
  }
  /* نوشتار نستعلیق برداری: word('basmala'|'cert'|'taqdir'|'loh', {fill, label}) */
  function word(key, o) {
    var src = D.words[key]; if (!src) return '';
    var b = src.bbox, fill = (o && o.fill) || '#2a1f52', label = (o && o.label) || '';
    return '<svg class="hk-word hk-word-' + key + '" xmlns="http://www.w3.org/2000/svg" viewBox="' + b[0] + ' ' + b[1] + ' ' + (b[2] - b[0]).toFixed(1) + ' ' + (b[3] - b[1]).toFixed(1) + '"' +
      (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + ' focusable="false"><path fill="' + fill + '" d="' + src.d + '"/></svg>';
  }
  g.HakimLogo = { emblem: emblem, horizontal: horizontal, stacked: stacked, word: word };
})(typeof window !== 'undefined' ? window : this);
'''
    js = js.replace('__DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    open(os.path.join(ROOT, 'js', 'hakim-logo.js'), 'w').write(js)
    print('ok', len(js))


if __name__ == '__main__':
    main()
