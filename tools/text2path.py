#!/usr/bin/env python3
"""text2path — Persian/Arabic text → SVG path, shaped with HarfBuzz.

Used to build the vector wordmark of the Hakimestan logo
(assets/img/hakimestan-logo*.svg), so the logo looks the same in every
browser, in print and in html2canvas, with no dependence on installed fonts.

usage: python3 tools/text2path.py FONT.woff2 "متن" [size]
prints JSON: {"d": "...", "w": width, "asc": ascender, "desc": descender}
"""
import io, json, re, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen


def shape(font_path, text, size=100.0):
    tt = TTFont(font_path)
    buf_io = io.BytesIO()
    tt.flavor = None
    tt.save(buf_io)
    data = buf_io.getvalue()
    face = hb.Face(data)
    font = hb.Font(face)
    upem = face.upem
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    scale = size / upem
    pen = SVGPathPen(gs)
    bp = BoundsPen(gs)
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        # flip Y: font units are y-up, SVG is y-down
        tp = TransformPen(pen, (scale, 0, 0, -scale, (x + pos.x_offset) * scale, -pos.y_offset * scale))
        gs[name].draw(tp)
        gs[name].draw(TransformPen(bp, (scale, 0, 0, -scale, (x + pos.x_offset) * scale, -pos.y_offset * scale)))
        x += pos.x_advance
    hhea = tt["hhea"]
    d = re.sub(r"-?\d+\.\d+", lambda m: ("%.1f" % float(m.group())).rstrip("0").rstrip("."), pen.getCommands())
    return {"d": d, "w": round(x * scale, 2),
            "asc": round(hhea.ascent * scale, 2), "desc": round(-hhea.descent * scale, 2),
            "bbox": [round(v, 2) for v in (bp.bounds or (0, 0, 0, 0))]}


if __name__ == "__main__":
    f, t = sys.argv[1], sys.argv[2]
    s = float(sys.argv[3]) if len(sys.argv) > 3 else 100.0
    print(json.dumps(shape(f, t, s)))
