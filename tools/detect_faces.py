"""Face / person detection for the provided asset illustrations.

Uses OpenCV Haar cascades at several pre-processing passes (pixel art is flat,
so the detector needs upscaling + histogram equalisation to fire at all).
Outputs normalized boxes plus focal points that the UI can use for safe
object-position values. Saves annotated previews for human review.

Run: .tools\\venv\\Scripts\\python.exe tools\\detect_faces.py
"""
from pathlib import Path
import json

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ROOT / "tools" / "faces"
OUT.mkdir(parents=True, exist_ok=True)

# OpenCV cannot read its own cascade XML from a non-ASCII path either (project
# lives under C:\поздравление), so stage the cascades in an ASCII temp folder.
import os
import shutil
import tempfile

CASCADE_DIR = Path(tempfile.gettempdir()) / "ilyuha-haar"
CASCADE_DIR.mkdir(parents=True, exist_ok=True)
for _name in ("haarcascade_frontalface_default.xml", "haarcascade_frontalface_alt2.xml",
              "haarcascade_profileface.xml"):
    _src = Path(cv2.data.haarcascades) / _name
    _dst = CASCADE_DIR / _name
    if _src.exists() and not _dst.exists():
        shutil.copyfile(_src, _dst)

CASCADES = {
    "frontal": str(CASCADE_DIR / "haarcascade_frontalface_default.xml"),
    "frontal_alt": str(CASCADE_DIR / "haarcascade_frontalface_alt2.xml"),
    "profile": str(CASCADE_DIR / "haarcascade_profileface.xml"),
}


def imread_unicode(path: Path):
    """cv2.imread cannot handle non-ASCII paths on Windows; decode bytes instead."""
    data = np.fromfile(str(path), dtype=np.uint8)
    if data.size == 0:
        return None
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


def imwrite_unicode(path: Path, img) -> None:
    ok, buf = cv2.imencode(".png", img)
    if ok:
        buf.tofile(str(path))


def detect(path: Path):
    raw = imread_unicode(path)
    if raw is None:
        return None
    h, w = raw.shape[:2]
    found = []

    for pass_name, scale in (("native", 1.0), ("up2", 2.0)):
        img = raw if scale == 1.0 else cv2.resize(raw, None, fx=scale, fy=scale,
                                                  interpolation=cv2.INTER_NEAREST)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        min_side = int(gray.shape[1] * 0.045)
        for cname in ("frontal", "frontal_alt"):
            cas = cv2.CascadeClassifier(CASCADES[cname])
            boxes = cas.detectMultiScale(gray, scaleFactor=1.06, minNeighbors=4,
                                         minSize=(min_side, min_side))
            for (x, y, bw, bh) in boxes:
                found.append({
                    "cascade": cname, "pass": pass_name,
                    "x_pct": round(100 * x / gray.shape[1], 1),
                    "y_pct": round(100 * y / gray.shape[0], 1),
                    "w_pct": round(100 * bw / gray.shape[1], 1),
                    "h_pct": round(100 * bh / gray.shape[0], 1),
                })
        cas = cv2.CascadeClassifier(CASCADES["profile"])
        boxes = cas.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5,
                                     minSize=(min_side, min_side))
        for (x, y, bw, bh) in boxes:
            found.append({
                "cascade": "profile", "pass": pass_name,
                "x_pct": round(100 * x / gray.shape[1], 1),
                "y_pct": round(100 * y / gray.shape[0], 1),
                "w_pct": round(100 * bw / gray.shape[1], 1),
                "h_pct": round(100 * bh / gray.shape[0], 1),
            })

    # Merge overlapping boxes (IoU > 0.35), prefer larger / more-voted clusters.
    merged = []
    for b in sorted(found, key=lambda d: d["w_pct"] * d["h_pct"], reverse=True):
        duplicate = False
        for m in merged:
            ax1, ay1 = b["x_pct"], b["y_pct"]
            ax2, ay2 = ax1 + b["w_pct"], ay1 + b["h_pct"]
            bx1, by1 = m["x_pct"], m["y_pct"]
            bx2, by2 = bx1 + m["w_pct"], by1 + m["h_pct"]
            ix = max(0, min(ax2, bx2) - max(ax1, bx1))
            iy = max(0, min(ay2, by2) - max(ay1, by1))
            inter = ix * iy
            union = b["w_pct"] * b["h_pct"] + m["w_pct"] * m["h_pct"] - inter
            if union > 0 and inter / union > 0.3:
                m["votes"] += 1
                duplicate = True
                break
        if not duplicate:
            merged.append({**b, "votes": 1})

    # Focus point = centre of the most confident / largest face cluster.
    merged.sort(key=lambda d: (d["votes"], d["w_pct"] * d["h_pct"]), reverse=True)
    focus = None
    if merged:
        m = merged[0]
        focus = {
            "x_pct": round(m["x_pct"] + m["w_pct"] / 2, 1),
            "y_pct": round(m["y_pct"] + m["h_pct"] / 2, 1),
            "box_pct": [m["x_pct"], m["y_pct"], m["w_pct"], m["h_pct"]],
        }

    annotated = raw.copy()
    for m in merged:
        x = int(m["x_pct"] / 100 * w)
        y = int(m["y_pct"] / 100 * h)
        bw = int(m["w_pct"] / 100 * w)
        bh = int(m["h_pct"] / 100 * h)
        cv2.rectangle(annotated, (x, y), (x + bw, y + bh), (60, 255, 60), 3)
    imwrite_unicode(OUT / (path.stem + "-faces.png"), annotated)

    return {"size": [w, h], "faces": merged[:6], "focus": focus}


def main():
    report = {}
    for path in sorted(ASSETS.rglob("*")):
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        r = detect(path)
        if r is None:
            continue
        report[path.relative_to(ROOT).as_posix()] = r
        print("=" * 70)
        print(path.name, r["size"], "faces:", len(r["faces"]))
        for f in r["faces"]:
            print("   ", f)
        print("   focus:", r["focus"])
    (ROOT / "tools" / "face-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()