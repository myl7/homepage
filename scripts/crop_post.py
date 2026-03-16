#!/usr/bin/env python3

"""
Crop header and footer from a post screenshot.

Usage:
    uv run python scripts/crop_post.py <input> [output]

Examples:
    uv run python scripts/crop_post.py coding-tips-1.png
    uv run python scripts/crop_post.py coding-tips-1.png cropped.png
    uv run python scripts/crop_post.py coding-tips-1.png --top 200 --bottom 150

Dependencies:
    uv add --dev pillow
"""

import argparse

from PIL import Image


def crop_image(
    input_path: str,
    output_path: str,
    top: int = 0,
    bottom: int = 0,
):
    img = Image.open(input_path)
    w, h = img.size
    print(f"Original size: {w} x {h} px")

    if top + bottom >= h:
        raise ValueError(f"Crop total ({top + bottom}px) >= image height ({h}px)")

    cropped = img.crop((0, top, w, h - bottom))
    cropped.save(output_path)

    cw, ch = cropped.size
    print(f"Cropped size: {cw} x {ch} px")
    print(f"Saved: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Crop header and footer from a post screenshot")
    parser.add_argument("input", help="Input image file")
    parser.add_argument(
        "output", nargs="?", default=None, help="Output file (default: overwrites input)"
    )
    parser.add_argument(
        "--top", type=int, default=140, help="Pixels to crop from top (default: 140)"
    )
    parser.add_argument(
        "--bottom", type=int, default=1080, help="Pixels to crop from bottom (default: 1080)"
    )
    args = parser.parse_args()

    output = args.output if args.output else args.input

    crop_image(
        input_path=args.input,
        output_path=output,
        top=args.top,
        bottom=args.bottom,
    )


if __name__ == "__main__":
    main()
