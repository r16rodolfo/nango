# Builds favicon.ico and favicon-dark.ico from the PNGs made by generate.mjs.
# Requires Pillow. Run after generate.mjs:  python branding/scripts/make-ico.py
from pathlib import Path

from PIL import Image

pub = Path(__file__).resolve().parent.parent / "dist" / "webapp-public"

for name, src in (("favicon.ico", "favicon-32x32.png"), ("favicon-dark.ico", "favicon-dark-32x32.png")):
    Image.open(pub / src).save(pub / name, sizes=[(16, 16), (32, 32)])

print("ico files generated")
