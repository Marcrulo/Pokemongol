#!/usr/bin/env python3
"""
Normalise raw artwork in sprites/ into app-ready assets in assets/sprites/.

Not part of the app build — this is asset prep, run by hand when artwork
changes. Needs Python with Pillow, which the Node toolchain does not.

Two things it fixes, both of which show up badly on a card:

  scale     Source art centres the figure in a large canvas with whatever
            margin the drawing happened to need. Across the seven examples
            the figure occupied between 6% and 27% of the frame, which on
            screen is a 2.7x difference in how big the haunt looks. Trimming
            to the alpha bounding box makes every sprite's *subject* the same
            size, which is the thing the eye compares.

  crispness These are pixel art, and React Native has no nearest-neighbour
            hint. Resampling is therefore done here, with NEAREST, to exactly
            twice the display width, so the only scaling left at runtime is a
            clean 2:1 downsample.

Run: python3 tools/prep-sprites.py
"""

import os
import sys
from PIL import Image

SRC = "sprites"
DST = os.path.join("assets", "sprites")

# Twice HauntSprite's 146pt column, so the device does an exact 2:1 reduction.
BOX = 292

def main():
    if not os.path.isdir(SRC):
        sys.exit(f"no {SRC}/ directory")
    os.makedirs(DST, exist_ok=True)

    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".png"))
    if not files:
        sys.exit(f"no PNGs in {SRC}/")

    for name in files:
        im = Image.open(os.path.join(SRC, name)).convert("RGBA")
        bbox = im.getchannel("A").getbbox()
        if bbox is None:
            print(f"  skip {name}: fully transparent")
            continue

        art = im.crop(bbox)
        w, h = art.size
        # Fit inside the box on the longer edge; never distort the aspect.
        scale = BOX / max(w, h)
        size = (max(1, round(w * scale)), max(1, round(h * scale)))
        out = art.resize(size, Image.Resampling.NEAREST)

        dst = os.path.join(DST, name)
        out.save(dst, optimize=True)
        print(f"  {name:<12} {im.size[0]}x{im.size[1]} → trim {w}x{h} → {out.size[0]}x{out.size[1]}")

    print(f"\nwrote {len(files)} sprite(s) to {DST}/")
    print("Remember: each one still has to be named in src/ui/sprites.js.")

if __name__ == "__main__":
    main()
