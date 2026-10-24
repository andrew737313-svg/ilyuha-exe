"""Asset analysis harness for ILYUHA.EXE.

Pure-Pillow (no numpy) image forensics: dimensions, palette, brightness,
warm/cool balance, skin-tone blob detection (people/faces), coarse layout map.
Run: python tools/analyze_assets.py
"""
import json
import colorsys
import sys
from pathlib import Path
from collections import Counter, deque

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"


def load(path: Path) -> Image.Image:
    im = Image.open(path)
    return im.convert("RGB")


def palette_info(im: Image.Image, k: int = 12):
    small = im.resize((160, max(1, int(160 * im.height / im.width))), Image.Resampling.NEAREST)
    q = small.quantize(colors=k, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette() or []
    counts = Counter(q.getdata())
    total = sum(counts.values()) or 1
    out = []
    for idx, cnt in counts.most_common(k):
        r, g, b = pal[idx * 3: idx * 3 + 3]
        out.append({
            "hex": "#%02x%02x%02x" % (r, g, b),
            "rgb": [r, g, b],
            "pct": round(100 * cnt / total, 1),
        })
    return out


def tone_stats(im: Image.Image):
    small = im.resize((200, max(1, int(200 * im.height / im.width))), Image.Resampling.BILINEAR)
    stat = ImageStat.Stat(small.convert("L"))
    gray = small.convert("L").getdata()
    n = len(gray)
    dark = sum(1 for v in gray if v < 60) / n
    mid = sum(1 for v in gray if 60 <= v < 160) / n
    bright = sum(1 for v in gray if v >= 160) / n
    hsv_stat = ImageStat.Stat(small.convert("HSV"))
    return {
        "mean_luma": round(stat.mean[0], 1),
        "luma_stddev": round(stat.stddev[0], 1),
        "mean_sat": round(hsv_stat.mean[1], 1),
        "dark_share": round(dark, 3),
        "mid_share": round(mid, 3),
        "bright_share": round(bright, 3),
    }


def warm_cool(im: Image.Image):
    small = im.resize((160, max(1, int(160 * im.height / im.width))), Image.Resampling.BILINEAR)
    warm = cool = 0
    for r, g, b in small.getdata():
        if r - b > 18:
            warm += 1
        elif b - r > 18:
            cool += 1
    total = small.width * small.height
    return {"warm_pct": round(100 * warm / total, 1), "cool_pct": round(100 * cool / total, 1)}


def is_skin(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == 0 or mx - mn < 18:
        return False
    v = mx / 255.0
    s = (mx - mn) / mx
    h, _, _ = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    hd = h * 360
    hue_ok = hd <= 42 or hd >= 335
    return hue_ok and 0.22 <= s <= 0.72 and 0.34 <= v <= 0.97 and r > g > b


def skin_blobs(im: Image.Image, target_w: int = 240):
    scale = target_w / im.width
    small = im.resize((target_w, max(1, int(im.height * scale))), Image.Resampling.BILINEAR)
    w, h = small.size
    px = small.load()
    mask = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if is_skin(*px[x, y]):
                mask[y * w + x] = 1
    seen = bytearray(w * h)
    blobs = []
    min_area = max(18, int(w * h * 0.0004))
    for y0 in range(h):
        for x0 in range(w):
            i0 = y0 * w + x0
            if not mask[i0] or seen[i0]:
                continue
            q = deque([(x0, y0)])
            seen[i0] = 1
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if mask[ni] and not seen[ni]:
                            seen[ni] = 1
                            q.append((nx, ny))
            if len(pts) < min_area:
                continue
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            bw = max(xs) - min(xs) + 1
            bh = max(ys) - min(ys) + 1
            fill = len(pts) / (bw * bh)
            blobs.append({
                "cx_pct": round(100 * (min(xs) + max(xs)) / 2 / w, 1),
                "cy_pct": round(100 * (min(ys) + max(ys)) / 2 / h, 1),
                "w_pct": round(100 * bw / w, 1),
                "h_pct": round(100 * bh / h, 1),
                "aspect": round(bw / bh, 2),
                "area_px": len(pts),
                "fill": round(fill, 2),
            })
    blobs.sort(key=lambda b: b["area_px"], reverse=True)
    return blobs[:8], (w, h)


def layout_map(im: Image.Image, cols: int = 32):
    rows = max(6, int(cols * im.height / im.width))
    g = im.resize((cols, rows), Image.Resampling.BILINEAR)
    px = g.load()
    ramp = " .:-=+*#%@"
    lines = []
    for y in range(rows):
        line = ""
        for x in range(cols):
            r, gg, b = px[x, y]
            l = (0.299 * r + 0.587 * gg + 0.114 * b) / 255
            ch = ramp[min(len(ramp) - 1, int(l * len(ramp)))]
            if is_skin(r, gg, b):
                ch = "S"
            line += ch
        lines.append(line)
    return lines


def hue_map(im: Image.Image, cols: int = 32):
    """Coarse hue map: R=red/orange, Y=yellow, G=green, C=cyan, B=blue, M=magenta, .=neutral-dark, ' '=neutral-light"""
    rows = max(6, int(cols * im.height / im.width))
    g = im.resize((cols, rows), Image.Resampling.BILINEAR)
    px = g.load()
    lines = []
    for y in range(rows):
        line = ""
        for x in range(cols):
            r, gg, b = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r / 255, gg / 255, b / 255)
            if s < 0.16:
                line += "." if v < 0.45 else (":" if v < 0.75 else " ")
                continue
            hd = h * 360
            if hd < 18 or hd >= 335:
                c = "R"
            elif hd < 45:
                c = "O"
            elif hd < 70:
                c = "Y"
            elif hd < 160:
                c = "G"
            elif hd < 200:
                c = "C"
            elif hd < 260:
                c = "B"
            elif hd < 300:
                c = "P"
            else:
                c = "M"
            line += c.lower() if v < 0.4 else c
        lines.append(line)
    return lines


def main():
    out = {}
    for path in sorted(ASSETS.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
            continue
        im = load(path)
        rel = path.relative_to(ROOT).as_posix()
        blobs, small_size = skin_blobs(im)
        out[rel] = {
            "size": list(im.size),
            "aspect": round(im.width / im.height, 3),
            "palette": palette_info(im),
            "tone": tone_stats(im),
            "color_temp": warm_cool(im),
            "skin_blobs": blobs,
            "skin_scale": list(small_size),
        }
        print("=" * 78)
        print(rel, im.size, "aspect", round(im.width / im.height, 3))
        print("tone", out[rel]["tone"], "temp", out[rel]["color_temp"])
        print("palette", ", ".join(f'{c["hex"]}:{c["pct"]}%' for c in out[rel]["palette"]))
        print(f"skin blobs ({len(blobs)}):")
        for b in blobs:
            print("   ", b)
        print("-- layout (light->dark .:-=+*#%@, S=skin) --")
        for line in layout_map(im):
            print("   " + line)
        print("-- hue map --")
        for line in hue_map(im):
            print("   " + line)

    (ROOT / "tools" / "asset-analysis.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nwrote tools/asset-analysis.json")


if __name__ == "__main__":
    main()