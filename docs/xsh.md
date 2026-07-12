# md-to-xhs.js — Astro post → Xiaohongshu (小红书) 长文

Converts a post under `src/content/posts/` into a single Markdown file ready to
paste/upload into a Xiaohongshu long post. It is a Markdown → Markdown transform
built on the same remark/unified libraries Astro's Markdown pipeline uses (no new
parser), so it round-trips the source faithfully and only adjusts what Xiaohongshu
cannot handle.

The exact per-feature transforms (headings, strikethrough, bold/italic, sub/sup,
links, task lists, math, images) are documented in the header comment of
[`scripts/md-to-xhs.js`](../scripts/md-to-xhs.js).

## Usage

```sh
pnpm to-xhs <slug-or-path> [--out <file>] [--img-format png|jpeg|webp|original]

# examples
pnpm to-xhs connect-eduroam-using-openwrt-luci
pnpm to-xhs mhcast --out /tmp/mhcast.md
pnpm to-xhs p2rag --img-format original   # keep source format (default is png)
```

Output defaults to `xhs-out/<slug>.md` (gitignored). A summary (title length,
embedded image count/size, MARKER count) is printed to stderr.

## Notes

- **Image formats:** Xiaohongshu's Markdown import renders base64 **PNG and JPG**
  data URLs only. **webp, bmp, and svg do not render** (all verified). So local
  images are transcoded to PNG by default; use `--img-format original` to keep
  source formats, or `jpeg` for smaller photo-heavy posts. Because svg is out,
  block math is rasterized to PNG rather than inlined as svg.
- Transcoding uses `sharp`; block math uses `mathjax-full` + `sharp`. Tune the
  math resolution via `MATH_PX_PER_EX` in the script.
