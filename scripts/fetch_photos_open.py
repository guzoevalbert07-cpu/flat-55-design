"""Фотореференсы без API-ключа: Openverse (CC-лицензии, api.openverse.org) + Wikimedia Commons.
Фаза 1 — кандидаты: python3 scripts/fetch_photos_open.py candidates   → превью и контакт-листы в <scratch>/photos_cand/
Фаза 2 — финал:     python3 scripts/fetch_photos_open.py finalize picks.json
   picks.json: {"eco": [<id>, ...], "std": [...], "prem": [...]} — id из контакт-листа.
   Скачивает оригиналы, ужимает до 1200 px (JPEG), пишет public/photos/*.jpg и src/data/photos.json с атрибуцией.
Все запросы — через curl (urllib в этой среде не проходит TLS).
"""
import io
import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = Path(os.environ.get("PHOTO_SCRATCH", "/tmp/photos_cand"))
UA = "flat-55-design/1.0 (photo references; contact via GitHub guzoevalbert07-cpu)"

# (запрос, источники): ov = Openverse, wc = Wikimedia Commons
QUERIES = {
    "eco": [("white kitchen interior", "ov"), ("modern kitchen white cabinets", "wc"), ("scandinavian interior apartment", "wc"),
            ("living room sofa gray modern", "wc"), ("bedroom white minimal interior", "wc"), ("bathroom white shower modern", "wc")],
    "std": [("living room interior design sofa", "wc"), ("living room beige sofa", "ov"), ("modern bedroom neutral tones", "wc"),
            ("kitchen grey cabinets modern", "wc"), ("bathroom modern vanity shower", "wc"), ("bedroom headboard interior", "ov")],
    "prem": [("walnut kitchen modern", "wc"), ("kitchen island wood modern interior", "wc"), ("japandi", "wc"), ("wood interior living room", "ov"),
             ("bedroom hotel suite wood linen", "wc"), ("bathroom marble modern interior", "wc"), ("brass bathroom fixtures", "wc")],
}


def curl(url, out=None, timeout=40):
    cmd = ["curl", "-sL", "--max-time", str(timeout), "-A", UA, url]
    if out:
        cmd += ["-o", str(out)]
    r = subprocess.run(cmd, capture_output=True)
    return r.stdout if not out else (out if r.returncode == 0 else None)


def openverse(q, n=10):
    url = f"https://api.openverse.org/v1/images/?q={quote(q)}&license_type=commercial&category=photograph&page_size={n}&mature=false"
    try:
        d = json.loads(curl(url) or b"{}")
    except json.JSONDecodeError:
        return []
    out = []
    for r in d.get("results", []):
        out.append({
            "id": r["id"][:8],
            "provider": "openverse",
            "title": r.get("title") or q,
            "creator": r.get("creator") or "автор не указан",
            "creator_url": r.get("creator_url") or r.get("foreign_landing_url"),
            "source": (r.get("source") or r.get("provider") or "").replace("_", " ").title(),
            "source_url": r.get("foreign_landing_url"),
            "license": (r.get("license") or "").upper(),
            "license_version": r.get("license_version"),
            "license_url": r.get("license_url"),
            "url": r.get("url"),
            "thumb": r.get("thumbnail") or r.get("url"),
            "width": r.get("width"),
            "height": r.get("height"),
            "query": q,
        })
    return out


def commons(q, n=8):
    url = (f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={quote(q + ' filetype:bitmap')}"
           f"&gsrnamespace=6&gsrlimit={n}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1200&format=json")
    try:
        d = json.loads(curl(url) or b"{}")
    except json.JSONDecodeError:
        return []
    out = []
    for p in d.get("query", {}).get("pages", {}).values():
        ii = p["imageinfo"][0]
        if ii.get("mime") not in ("image/jpeg", "image/png") or (ii.get("width") or 0) < 1000:
            continue
        em = ii.get("extmetadata", {})
        lic = em.get("LicenseShortName", {}).get("value", "")
        if not any(k in lic for k in ("CC BY", "CC0", "Public domain")):
            continue
        import re
        artist = re.sub(r"<[^>]+>", "", em.get("Artist", {}).get("value", "")).strip() or "автор не указан"
        out.append({
            "id": f"c{p['pageid']}",
            "provider": "commons",
            "title": p["title"][5:],
            "creator": artist[:60],
            "creator_url": ii.get("descriptionurl"),
            "source": "Wikimedia Commons",
            "source_url": ii.get("descriptionurl"),
            "license": lic,
            "license_version": "",
            "license_url": em.get("LicenseUrl", {}).get("value", ""),
            "url": ii.get("thumburl") or ii.get("url"),
            "thumb": ii.get("thumburl") or ii.get("url"),
            "width": ii.get("thumbwidth") or ii.get("width"),
            "height": ii.get("thumbheight") or ii.get("height"),
            "query": q,
        })
    return out


def phase_candidates():
    SCRATCH.mkdir(parents=True, exist_ok=True)
    all_c = {}
    for opt, qs in QUERIES.items():
        cands = []
        for q, src in qs:
            cands += openverse(q, 12) if src == "ov" else commons(q, 12)
        # уникальные
        seen = set()
        cands = [c for c in cands if c["thumb"] and not (c["id"] in seen or seen.add(c["id"]))]
        tiles = []
        for c in cands:
            f = SCRATCH / f"{opt}_{c['id']}.jpg"
            if not f.exists():
                curl(c["thumb"], f)
            try:
                im = Image.open(f).convert("RGB")
            except Exception:  # noqa: BLE001
                continue
            im.thumbnail((360, 270))
            tiles.append((c, im))
        all_c[opt] = [c for c, _ in tiles]
        # контакт-лист
        cols = 5
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 370, rows * 300), "white")
        dr = ImageDraw.Draw(sheet)
        for i, (c, im) in enumerate(tiles):
            x, y = (i % cols) * 370 + 5, (i // cols) * 300 + 5
            sheet.paste(im, (x, y))
            dr.rectangle([x, y + 272, x + 360, y + 292], fill="white")
            dr.text((x + 3, y + 274), f"{i}: {c['id']} {c['license']} {c['query'][:22]}", fill="black")
        sheet.save(SCRATCH / f"sheet_{opt}.png")
        print(f"{opt}: {len(tiles)} кандидатов → {SCRATCH}/sheet_{opt}.png")
    json.dump(all_c, open(SCRATCH / "candidates.json", "w"), ensure_ascii=False, indent=1)


def phase_finalize(picks_path):
    picks = json.load(open(picks_path))
    cands = json.load(open(SCRATCH / "candidates.json"))
    out_dir = ROOT / "public" / "photos"
    out_dir.mkdir(parents=True, exist_ok=True)
    photos = []
    for opt, ids in picks.items():
        byid = {c["id"]: c for c in cands[opt]}
        for i, cid in enumerate(ids, 1):
            c = byid[cid]
            raw = SCRATCH / f"{opt}_{cid}_full"
            if not curl(c["url"], raw, timeout=90):
                print("⚠️ не скачался", cid)
                continue
            im = Image.open(raw).convert("RGB")
            im.thumbnail((1200, 1200))
            # приводим к 4:3 обрезкой по центру, как в сетке сайта
            w, h = im.size
            tw, th = (w, int(w * 3 / 4)) if w / h > 4 / 3 else (int(h * 4 / 3), h)
            tw, th = min(tw, w), min(th, h)
            im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th))
            name = f"{opt}-{i}.jpg"
            im.save(out_dir / name, "JPEG", quality=82, optimize=True, progressive=True)
            lic = c["license"] + (f" {c['license_version']}" if c.get("license_version") else "")
            photos.append({
                "option": opt, "src": f"photos/{name}", "width": im.size[0], "height": im.size[1],
                "alt": f"{c['title']} — фотореференс для опции", "author": c["creator"], "authorUrl": c["creator_url"] or c["source_url"],
                "source": c["source"] or "Openverse", "sourceUrl": c["source_url"], "license": lic.strip(), "licenseUrl": c.get("license_url") or "",
                "query": c["query"],
            })
            print(f"✅ {opt} {i}: {c['title'][:40]} — {c['creator']} ({lic})")
    json.dump(photos, open(ROOT / "src" / "data" / "photos.json", "w"), ensure_ascii=False, indent=2)
    print(f"записано {len(photos)} фото → src/data/photos.json")


if __name__ == "__main__":
    if sys.argv[1:2] == ["candidates"]:
        phase_candidates()
    elif sys.argv[1:2] == ["finalize"]:
        phase_finalize(sys.argv[2])
    else:
        print(__doc__)
