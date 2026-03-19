#!/usr/bin/env -S uv run python

"""
Split a long screenshot into 3:4 pages.

Finds clean split points (avoiding text/lines) and adds padding at split
edges so every page has consistent margins.

Usage:
    uv run python scripts/split_post.py < input.png
    uv run python scripts/split_post.py --name coding-tips --output-dir screenshots < input.png
    cat input.png | uv run python scripts/split_post.py --padding 60

Dependencies:
    uv add --dev pillow numpy
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def row_content_score(img_array, row, bg_color, band=5):
    """Score how much content is near a row (lower = cleaner, better for splitting).

    Averages over a small band of rows for robustness.
    """
    h = img_array.shape[0]
    lo = max(0, row - band // 2)
    hi = min(h, row + band // 2 + 1)
    band_pixels = img_array[lo:hi].astype(float)
    diff = np.abs(band_pixels - bg_color.astype(float))
    return np.mean(diff)


def find_clean_split(img_array, target, search_range, bg_color):
    """Find the cleanest row near target within search_range.

    Among equally clean rows, prefer the one closest to target.
    """
    h = img_array.shape[0]
    lo = max(0, target - search_range)
    hi = min(h - 1, target + search_range)

    best_row = target
    best_score = float("inf")

    for r in range(lo, hi + 1):
        score = row_content_score(img_array, r, bg_color)
        # Prefer cleaner rows; break ties by proximity to target
        if score < best_score - 0.5:
            best_score = score
            best_row = r
        elif abs(score - best_score) <= 0.5 and abs(r - target) < abs(best_row - target):
            best_row = r

    return best_row


def detect_bg_color(img_array):
    """Detect background color by sampling edges of the image."""
    samples = []
    # Sample from top, bottom, and side edges
    for row in [0, 1, 2, -3, -2, -1]:
        samples.append(img_array[row, :10])
        samples.append(img_array[row, -10:])
    return np.median(np.concatenate(samples, axis=0), axis=0).astype(np.uint8)


def split_image(img, name, output_dir, padding, search_ratio, ratio):
    w, h = img.size
    img_array = np.array(img)

    rw, rh = ratio
    page_height = int(w * rh / rw)
    bg_color = detect_bg_color(img_array)
    search_range = int(page_height * search_ratio)

    # Content height per page (minus padding on split edges)
    content_step = page_height - 2 * padding

    print(f"Image size: {w} x {h} px", file=sys.stderr)
    print(f"Page size: {w} x {page_height} px ({rw}:{rh})", file=sys.stderr)
    print(f"Background color: {tuple(bg_color)}", file=sys.stderr)

    # Find split points
    splits = [0]
    pos = 0

    while pos + content_step + padding < h:
        target = pos + content_step
        if target + content_step > h:
            # Remaining content fits in the last page
            break
        candidate = find_clean_split(img_array, target, search_range, bg_color)
        splits.append(candidate)
        pos = candidate

    splits.append(h)

    print(f"Split points: {splits}", file=sys.stderr)
    print(f"Pages: {len(splits) - 1}", file=sys.stderr)

    # Generate pages
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    pages = []
    n_pages = len(splits) - 1

    for i in range(n_pages):
        top = splits[i]
        bottom = splits[i + 1]
        content = img.crop((0, top, w, bottom))
        content_h = bottom - top

        # Add padding at split edges
        pad_top = padding if i > 0 else 0
        pad_bottom = padding if i < n_pages - 1 else 0

        new_h = content_h + pad_top + pad_bottom

        # Pad last page to full page height with background color
        if i == n_pages - 1 and new_h < page_height:
            new_h = page_height

        page = Image.new(img.mode, (w, new_h), tuple(bg_color))
        page.paste(content, (0, pad_top))

        out_path = output_dir / f"{name}_{i + 1:02d}.png"
        page.save(out_path)
        pages.append(out_path)
        print(f"  Page {i + 1}: {w} x {new_h} px -> {out_path}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Split a long screenshot into 3:4 pages")
    parser.add_argument("--name", default="page", help="Output file name stem (default: page)")
    parser.add_argument(
        "--padding", type=int, default=80, help="Padding at split edges in px (default: 80)"
    )
    parser.add_argument(
        "--output-dir", default="screenshots", help="Output directory (default: screenshots)"
    )
    parser.add_argument(
        "--ratio",
        default="3:4",
        help="Page aspect ratio as W:H (default: 3:4)",
    )
    parser.add_argument(
        "--search",
        type=float,
        default=0.15,
        help="Search range as ratio of page height (default: 0.15)",
    )
    args = parser.parse_args()

    img = Image.open(sys.stdin.buffer)

    rw, rh = (int(x) for x in args.ratio.split(":"))
    split_image(img, args.name, args.output_dir, args.padding, args.search, (rw, rh))


if __name__ == "__main__":
    main()
