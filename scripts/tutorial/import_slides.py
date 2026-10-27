# -*- coding: utf-8 -*-
"""Copy PowerPoint PNG exports into the project with stable names.

    python scripts/tutorial/import_slides.py <stagingDir> <destDir>

"Slide3.PNG" -> "slide_03.png" (zero padded, sorted by slide number).
"""
import os
import re
import shutil
import sys

src = sys.argv[1] if len(sys.argv) > 1 else r"C:\temptest\slides_hd"
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join("tutorial", "slides_png")

os.makedirs(dst, exist_ok=True)
files = [f for f in os.listdir(src) if f.lower().endswith(".png")]

def num(f):
    m = re.search(r"(\d+)", f)
    return int(m.group(1)) if m else 0

files.sort(key=num)
for f in files:
    n = num(f)
    out = os.path.join(dst, f"slide_{n:02d}.png")
    shutil.copyfile(os.path.join(src, f), out)

print(f"copied {len(files)} slides -> {dst}")
