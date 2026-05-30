# Repo Guide

## Working Rules

- Markdown 中中英文中每遇句号“。”/"." 需要换行。
- 从外部来源提取代码时，直接从原文复制，不要凭理解重写。
- 精确值（如 `0.704583em`）必须保持原样。
- `themes/blowfish/` 是依赖，不准修改。
- 需要覆盖主题行为时，用项目根目录的 `layouts/`、`assets/`、`static/` 等目录。
- Use uv to manage deps.
- When a change alters repo architecture, update this file in the same change.
- Architecture changes include moving content roots, changing Hugo config ownership, changing theme override locations, adding deploy targets, or changing script pipelines.

## Architecture

- This repo is a Hugo static site for `myl7.org`.
- Blowfish is the Hugo theme and lives as a Git submodule at `themes/blowfish/`.
- Root `hugo.toml` holds site-level settings that must apply in every environment, including `baseURL`, language code, title, and time zone.
- `config/_default/` holds the Hugo and Blowfish configuration split by concern.
- `config/_default/hugo.toml` selects the Blowfish theme, taxonomy, output, sitemap, analytics, and build behavior.
- `config/_default/params.toml` controls Blowfish theme behavior and article/list/homepage presentation.
- `config/_default/languages.en.toml` owns the English site title, copyright, author identity, and author links.
- `config/_default/menus.en.toml` owns header and footer navigation.
- `config/_default/markup.toml` owns Markdown, syntax highlighting, table of contents, and math delimiter behavior.
- `content/_index.md` is the homepage body.
- `content/posts/` holds posts and post bundles.
- `content/privacy.md` is the privacy page linked from the footer.
- `static/` holds files that should be copied to the site root as static assets, such as paper PDFs and archives.
- `layouts/` contains local Hugo template overrides for the Blowfish theme.
- `layouts/partials/extend-head.html` injects fonts, code block CSS, browser text spacing CSS, and production-only Vercel analytics scripts.
- `assets/` contains Hugo pipeline assets owned by this site.
- `assets/js/katex-render.js` supports KaTeX rendering after the KaTeX script loads.
- `scripts/` contains local automation and is managed with `uv`.
- `scripts/index_to_github_profile.py` copies the rendered homepage Markdown body into the sibling GitHub profile repo.
- `public/` and `resources/` are generated build artifacts.
- `vercel.json` contains deploy-time redirects.

## Common Commands

- Start local Hugo server: `hugo server`.
- Build the static site: `hugo`.
- Install Python dev deps: `uv sync --dev`.
- Run formatting: `make format`.
- Check formatting: `make format_check`.

## Change Boundaries

- Do not edit `themes/blowfish/`.
- Do not edit generated `public/` or `resources/` unless the task is explicitly about generated output.
- Prefer local overrides in root `layouts/`, `assets/`, or `static/` over theme edits.
- Keep Hugo content changes under `content/`.
- Keep deploy routing changes in `vercel.json`.
