"""Summarise rendered screenshots so regressions (blank panels, crushed blacks,
missing art) are visible without eyeballing every file."""

from pathlib import Path

from PIL import Image, ImageStat

SHOTS = Path("tools/screenshots")

print(f"{'file':32s} {'size':11s} {'mean':>5s} {'std':>5s} {'dark%':>6s} {'colors':>7s} {'edge':>5s}")
print("-" * 78)

for path in sorted(SHOTS.glob("*.png")):
    im = Image.open(path).convert("RGB")
    small = im.resize((240, int(240 * im.height / im.width)))
    stat = ImageStat.Stat(small)
    mean = sum(stat.mean) / 3
    std = sum(stat.stddev) / 3
    gray = small.convert("L")
    hist = gray.histogram()
    total = sum(hist)
    dark = sum(hist[:24]) / total * 100
    colors = len(set(small.getdata()))
    edges = gray.filter(__import__("PIL.ImageFilter", fromlist=["FIND_EDGES"]).FIND_EDGES)
    edge = ImageStat.Stat(edges).mean[0]
    print(
        f"{path.name:32s} {f'{im.width}x{im.height}':11s} {mean:5.1f} {std:5.1f} "
        f"{dark:6.1f} {colors:7d} {edge:5.1f}"
    )