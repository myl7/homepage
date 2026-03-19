# homepage

My homepage at [myl7.org](https://myl7.org/), built with Hugo and the Blowfish theme.

## Features

- Blog posts and pages rendered with Hugo
- Post screenshot pipeline: capture, crop, and split into pages for sharing

## Prerequisites

- [Hugo](https://gohugo.io/)
- [uv](https://docs.astral.sh/uv/) (for screenshot scripts)

## Get Started

Clone the repository and initialize the theme submodule:

```sh
git clone --recurse-submodules https://github.com/myl7/homepage.git
cd homepage
```

Start the development server:

```sh
hugo server
```

The site will be available at `http://localhost:1313/`.

Build for production:

```sh
hugo
```

Output goes to the `public/` directory.

### Deploying on Vercel

Vercel's default Hugo version is too old to recognize the `hugo.toml` config file.
Instead of erroring, it silently builds an empty site.
Set the `HUGO_VERSION` environment variable in your Vercel project settings to a newer version (e.g., `0.157.0`).

## Adding Content

Create a new post:

```sh
hugo new content posts/my-post/index.md
```

Edit the generated file under `content/posts/my-post/index.md`.

## Screenshot Scripts

Three scripts under `scripts/` form a pipeline to capture post screenshots and split them into sharable pages.
Install dependencies first:

```sh
uv sync --dev
uv run playwright install chromium
```

### capture_post.py

Capture a post as a full-page screenshot.
Outputs PNG to stdout by default.

```sh
# Capture from production site
scripts/capture_post.py coding-tips-1 > screenshot.png

# Capture from local dev server
scripts/capture_post.py coding-tips-1 --local > screenshot.png

# Save to a file directly
scripts/capture_post.py coding-tips-1 -o screenshots/coding-tips-1.png

# Custom viewport and scale
scripts/capture_post.py coding-tips-1 --width 440 --scale 3
```

Options:

| Flag             | Default            | Description                     |
| ---------------- | ------------------ | ------------------------------- |
| `slug`           | (required)         | Post slug, e.g. `coding-tips-1` |
| `-o`, `--output` | stdout             | Output file path                |
| `--base-url`     | `https://myl7.org` | Base URL                        |
| `--local`        | off                | Use `http://localhost:1313`     |
| `--width`        | 440                | Viewport width in px            |
| `--scale`        | 3                  | Device scale factor             |
| `--wait`         | 2.0                | Seconds to wait after page load |
| `--no-scroll`    | off                | Skip scrolling for lazy content |

### crop_post.py

Crop header and footer from a screenshot.
Reads PNG from stdin, writes cropped PNG to stdout.

```sh
# Crop with default margins
scripts/crop_post.py < screenshot.png > cropped.png

# Custom crop amounts
scripts/crop_post.py --top 200 --bottom 150 < screenshot.png > cropped.png
```

Options:

| Flag       | Default | Description                |
| ---------- | ------- | -------------------------- |
| `--top`    | 140     | Pixels to crop from top    |
| `--bottom` | 1080    | Pixels to crop from bottom |

### split_post.py

Split a long screenshot into 3:4 aspect ratio pages.
Reads PNG from stdin, writes numbered page files to the output directory.

```sh
# Split with defaults (pages saved to screenshots/)
scripts/split_post.py < cropped.png

# Custom name and output directory
scripts/split_post.py --name coding-tips-1 --output-dir screenshots < cropped.png

# Custom padding and ratio
scripts/split_post.py --padding 60 --ratio 3:4 < cropped.png
```

Options:

| Flag           | Default       | Description                                           |
| -------------- | ------------- | ----------------------------------------------------- |
| `--name`       | `page`        | Output file name stem                                 |
| `--output-dir` | `screenshots` | Output directory (created if needed)                  |
| `--padding`    | 80            | Padding at split edges in px                          |
| `--ratio`      | `3:4`         | Page aspect ratio as `W:H`                            |
| `--search`     | 0.15          | Search range for clean splits as ratio of page height |

### Pipeline

Chain all three scripts together:

```sh
scripts/capture_post.py coding-tips-1 --local \
  | scripts/crop_post.py \
  | scripts/split_post.py --name coding-tips-1
```

This captures a post, crops the browser chrome, and splits the result into `screenshots/coding-tips-1_01.png`, `screenshots/coding-tips-1_02.png`, etc.

## Config

See the [Blowfish documentation](https://blowfish.page/docs/configuration/) for all available theme parameters.

## Licenses

Copyright (C) 2026 Yulong Ming <i@myl7.org>.

Code licensed under Apache License, Version 2.0.

Text content in ./content licensed under CC BY 4.0 License.
