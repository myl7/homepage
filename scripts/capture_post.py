#!/usr/bin/env -S uv run python

"""
Capture a post as a full-page long screenshot.

Usage:
    uv run python scripts/capture_post.py <slug> > screenshot.png
    uv run python scripts/capture_post.py <slug> -o output.png
    uv run python scripts/capture_post.py coding-tips-1 | python scripts/crop_post.py > cropped.png
    uv run python scripts/capture_post.py coding-tips-1 --local

Dependencies:
    uv add --dev playwright
    uv run playwright install chromium
"""

import argparse
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright


async def auto_scroll(page, scroll_step: int = 500, delay: float = 0.3):
    """Scroll to bottom step by step to trigger lazy-loaded content."""
    prev_height = 0
    while True:
        curr_height = await page.evaluate("document.body.scrollHeight")
        scroll_pos = await page.evaluate("window.scrollY")

        if scroll_pos + 800 >= curr_height:
            if curr_height == prev_height:
                break
            prev_height = curr_height
            await asyncio.sleep(delay)
            continue

        await page.evaluate(f"window.scrollBy(0, {scroll_step})")
        await asyncio.sleep(delay)

    # Scroll back to top
    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(0.5)


async def take_full_screenshot(
    url: str,
    output_path: str | None = None,
    viewport_width: int = 1200,
    wait_after_load: float = 2.0,
    scroll_to_bottom: bool = True,
    device_scale_factor: int = 2,
):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": viewport_width, "height": 800},
            device_scale_factor=device_scale_factor,
        )

        print(f"Loading: {url}", file=sys.stderr)
        await page.goto(url, wait_until="networkidle")

        # Force the inline TOC open
        await page.evaluate("document.querySelector('.toc-inside')?.setAttribute('open', '')")

        if scroll_to_bottom:
            print("Scrolling to trigger lazy-loaded content...", file=sys.stderr)
            await auto_scroll(page)

        if wait_after_load > 0:
            print(f"Waiting {wait_after_load}s for rendering...", file=sys.stderr)
            await asyncio.sleep(wait_after_load)

        total_height = await page.evaluate("document.body.scrollHeight")
        print(f"Page height: {total_height}px", file=sys.stderr)

        if output_path:
            await page.screenshot(path=output_path, full_page=True)
            print(f"Screenshot saved: {output_path}", file=sys.stderr)
        else:
            data = await page.screenshot(full_page=True)
            sys.stdout.buffer.write(data)

        print(
            f"Image size: {viewport_width * device_scale_factor}"
            f" x {total_height * device_scale_factor} px",
            file=sys.stderr,
        )

        await browser.close()


def main():
    parser = argparse.ArgumentParser(description="Capture a post as a full-page screenshot")
    parser.add_argument("slug", help="Post slug (e.g. coding-tips-1)")
    parser.add_argument("-o", "--output", default=None, help="Output file (default: stdout)")
    parser.add_argument(
        "--base-url", default="https://myl7.org", help="Base URL (default: https://myl7.org)"
    )
    parser.add_argument(
        "--local",
        action="store_true",
        help="Use local dev server (http://localhost:1313)",
    )
    parser.add_argument("--width", type=int, default=440, help="Viewport width (default: 440)")
    parser.add_argument("--scale", type=int, default=3, help="Device scale factor (default: 3)")
    parser.add_argument(
        "--wait", type=float, default=2.0, help="Wait seconds after load (default: 2.0)"
    )
    parser.add_argument("--no-scroll", action="store_true", help="Skip scrolling")
    args = parser.parse_args()

    if args.local:
        base_url = "http://localhost:1313"
    else:
        base_url = args.base_url

    url = f"{base_url}/posts/{args.slug}/"
    output = args.output
    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)

    asyncio.run(
        take_full_screenshot(
            url=url,
            output_path=output,
            viewport_width=args.width,
            wait_after_load=args.wait,
            scroll_to_bottom=not args.no_scroll,
            device_scale_factor=args.scale,
        )
    )


if __name__ == "__main__":
    main()
