"""Prepare game media from the original assets.

Rules honoured here:
  * originals in assets/ are never modified;
  * every derivative lands in public/media/ with a stable, ASCII file name;
  * pixel art keeps nearest-neighbour geometry (no smoothing, no stretch);
  * the profile portrait is a pure crop of the provided illustration, so the
    face is never redrawn or "improved" by a generator.

Run: .tools\\venv\\Scripts\\python.exe tools\\prepare_media.py
"""
from pathlib import Path
import json

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ROOT / "public" / "media"
OUT.mkdir(parents=True, exist_ok=True)

# Screen map: source file -> (output stem, max width, optional crop in % (l, t, r, b))
PLAN = [
    ("Ретро-фотография в пиксельном парке.png", "park-friends", 1200, None),
    ("Пиксельные одноклассники в солнечном классе.png", "classroom", 1200, None),
    ("Ночная игровая комната в стиле ретро.png", "night-room-retro", 1200, None),
    ("Ночная пиксельная игровая уютная комната.png", "night-room-cozy", 1200, None),
    ("Тёплый семейный портрет в пиксель-арте(2).png", "family-portrait", 1200, None),
    ("Пиксельный геймер с лисой чашкой.png", "gamer-full", 1200, None),
    # Head-and-shoulders crop for the RPG character profile. The face blob in the
    # source sits around x 47% / y 42% and covers ~30% x 39% of the frame, so this
    # window keeps the whole head plus shoulders and a safety margin of hair.
    ("Пиксельный геймер с лисой чашкой.png", "portrait-ilyuha", 1000, (20.0, 8.0, 76.0, 64.0)),
]


def edge_stats(im: Image.Image, band: int = 4):
    """Detect whether the artwork already carries a painted border/vignette."""
    w, h = im.size
    px = im.convert("RGB").load()
    rows = []
    for y in (band // 2, h // 2):
        line = [px[x, y] for x in range(0, w, 7)]
        rows.append(sum(sum(c) / 3 for c in line) / len(line))
    edge = (rows[0] + rows[1]) / 2
    inner = 0
    cnt = 0
    for y in range(h // 3, 2 * h // 3, 5):
        for x in range(w // 3, 2 * w // 3, 5):
            inner += sum(px[x, y]) / 3
            cnt += 1
    return {"edge_luma": round(edge, 1), "inner_luma": round(inner / cnt, 1)}


def main():
    manifest = []
    for src_name, stem, max_w, crop in PLAN:
        src = ASSETS / src_name
        if not src.exists():
            raise SystemExit(f"missing asset: {src}")
        im = Image.open(src).convert("RGB")
        original_size = im.size

        if crop:
            l, t, r, b = crop
            w, h = im.size
            box = (round(w * l / 100), round(h * t / 100), round(w * r / 100), round(h * b / 100))
            im = im.crop(box)

        if im.width > max_w:
            nh = round(im.height * max_w / im.width)
            im = im.resize((max_w, nh), Image.Resampling.NEAREST)

        webp_path = OUT / f"{stem}.webp"
        im.save(webp_path, format="WEBP", quality=90, method=6)

        stats = edge_stats(Image.open(src).convert("RGB"))
        manifest.append({
            "stem": stem,
            "source": f"assets/{src_name}",
            "width": im.width,
            "height": im.height,
            "aspect": round(im.width / im.height, 4),
            "crop_pct": crop,
            "original_size": list(original_size),
            "webp_kb": round(webp_path.stat().st_size / 1024),
            **stats,
        })
        print(f"{stem:16s} {im.size[0]}x{im.size[1]}  webp {manifest[-1]['webp_kb']}kB  "
              f"edge_luma {stats['edge_luma']} inner {stats['inner_luma']}")

    (ROOT / "src" / "game" / "media-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nwrote src/game/media-manifest.json")


if __name__ == "__main__":
    main()