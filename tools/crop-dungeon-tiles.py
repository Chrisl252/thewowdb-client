#!/usr/bin/env python3
"""Download official dungeon loading screens and crop to 600x300 tiles.

Crops out the WoW logo (top) and gold letterbox bars so listing banners and
per-dungeon heroes show zone art, not UI chrome. First-party copies land in
assets/dungeon-tiles/{slug}.jpg.
"""

from __future__ import annotations

import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "dungeon-tiles"
SRC = Path("/tmp/mplus-src")
OUT.mkdir(parents=True, exist_ok=True)
SRC.mkdir(parents=True, exist_ok=True)

# Warcraft Wiki file titles (Special:FilePath).
FILES = {
    "altar-of-fangs": "Altar_of_Fangs_loading_screen.jpg",
    "den-of-nalorakk": "Den_of_Nalorakk_loading_screen.jpg",
    "murder-row": "Murder_Row_loading_screen.jpg",
    "voidscar-arena": "Voidscar_Arena_loading_screen.jpg",
    "the-blinding-vale": "Blinding_Vale_loading_screen.jpg",
    "kings-rest": "Kings'_Rest_loading_screen.jpg",
    "ruby-life-pools": "Ruby_Life_Pools_loading_screen.jpg",
    "temple-of-sethraliss": "Temple_of_Sethraliss_loading_screen.jpg",
}

UA = {"User-Agent": "TheWoWDB dungeon-tile cropper (first-party preview assets)"}


def fetch(slug: str, title: str) -> Path:
    dest = SRC / f"{slug}-src.jpg"
    if dest.exists() and dest.stat().st_size > 8000:
        print(f"CACHE {slug} {dest.stat().st_size}B")
        return dest
    quoted = urllib.parse.quote(title)
    urls = [
        f"https://warcraft.wiki.gg/wiki/Special:FilePath/{quoted}",
        f"https://warcraft.wiki.gg/images/{quoted}",
    ]
    last_err = None
    for url in urls:
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = resp.read()
            if len(data) < 8000:
                raise RuntimeError(f"too small ({len(data)})")
            dest.write_bytes(data)
            print(f"OK {slug} {len(data)}B from {url}")
            return dest
        except Exception as err:
            last_err = err
            print(f"FAIL {slug} {url}: {err}")
    raise RuntimeError(f"could not fetch {slug}: {last_err}")


def crop_tile(im: Image.Image) -> Image.Image:
    w, h = im.size
    # Drop the gold letterbox and the Midnight / expansion logo (top-left).
    top = int(h * 0.22)
    bottom = int(h * 0.90)
    mid = im.crop((0, top, w, bottom))
    mw, mh = mid.size
    target_ratio = 2.0
    cur = mw / mh
    if cur > target_ratio:
        new_w = int(mh * target_ratio)
        x0 = (mw - new_w) // 2
        mid = mid.crop((x0, 0, x0 + new_w, mh))
    else:
        new_h = int(mw / target_ratio)
        y0 = (mh - new_h) // 2
        mid = mid.crop((0, y0, mw, y0 + new_h))
    return mid.resize((600, 300), Image.Resampling.LANCZOS).convert("RGB")


def main() -> None:
    for slug, title in FILES.items():
        src = fetch(slug, title)
        im = Image.open(src)
        tile = crop_tile(im)
        dest = OUT / f"{slug}.jpg"
        tile.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
        print(f"TILE {slug} {tile.size} {dest.stat().st_size}B")


if __name__ == "__main__":
    main()
