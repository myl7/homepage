#!/usr/bin/env -S uv run python

"""
Crop header and footer from a post screenshot.

Usage:
    uv run python scripts/crop_post.py < input.png > output.png
    uv run python scripts/crop_post.py --top 200 --bottom 150 < input.png > output.png
    cat input.png | uv run python scripts/crop_post.py > output.png

Dependencies:
    uv add --dev pillow
"""

import argparse
import sys

from PIL import Image


def crop_image(img: Image.Image, top: int = 0, bottom: int = 0) -> Image.Image:
    w, h = img.size
    print(f"Original size: {w} x {h} px", file=sys.stderr)

    if top + bottom >= h:
        raise ValueError(f"Crop total ({top + bottom}px) >= image height ({h}px)")

    cropped = img.crop((0, top, w, h - bottom))

    cw, ch = cropped.size
    print(f"Cropped size: {cw} x {ch} px", file=sys.stderr)

    return cropped


def main():
    parser = argparse.ArgumentParser(description="Crop header and footer from a post screenshot")
    parser.add_argument(
        "--top", type=int, default=140, help="Pixels to crop from top (default: 140)"
    )
    parser.add_argument(
        "--bottom", type=int, default=1080, help="Pixels to crop from bottom (default: 1080)"
    )
    args = parser.parse_args()

    img = Image.open(sys.stdin.buffer)
    cropped = crop_image(img, top=args.top, bottom=args.bottom)
    cropped.save(sys.stdout.buffer, format="PNG")


if __name__ == "__main__":
    main()
