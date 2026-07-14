#!/usr/bin/env node
// Convert an Astro Markdown post into a Xiaohongshu (小红书) "长文" Markdown file.
//
// This reuses the same remark/unified stack that Astro's Markdown pipeline is
// built on (a Markdown -> Markdown transform), so it needs no new parser.
//
// Usage:
//   node scripts/md-to-xhs.js <slug-or-path> [--out <file>] [--img-format png|jpeg|webp|original]
//
// Examples:
//   node scripts/md-to-xhs.js connect-eduroam-using-openwrt-luci
//   node scripts/md-to-xhs.js src/content/posts/mhcast.md --out /tmp/mhcast.md
//   node scripts/md-to-xhs.js p2rag --img-format original   # keep source format
//
// What it does (per the Xiaohongshu 长文 constraints):
//   - Prepends the frontmatter `title` as a plain leading paragraph (copy it
//     into the title box; warns if it exceeds 64 chars, CJK/ASCII each = 1).
//   - Prepends the frontmatter `description` as the next paragraph (there is no
//     description field on Xiaohongshu).
//   - Demotes headings: `##` -> `#`, `###`+ -> `##` (only H1/H2 render on
//     import; deeper levels are flattened to H2, not to bold, since imported
//     bold text is not styled).
//   - Strikethrough (~~x~~ / <del> / <s> / <strike>) is unsupported: the text is
//     kept, wrapped as `MARKER(x)` for you to handle by hand. Tables (also
//     unsupported) are removed and replaced by an empty `MARKER()` paragraph.
//   - Converts bold (**x**) to <mark>x</mark> highlight, the one inline style
//     import keeps; italic (*x*) is left as-is since Xiaohongshu has no italic
//     and reusing <mark> for it would make everything look bold. Also converts
//     <sub>/<sup> to unicode (H₂O, x²).
//   - Wraps every link in `MARKER(...)`, leaving the link itself untouched
//     (Xiaohongshu rejects links; the MARKER just makes them easy to purge).
//   - Marks task-list items with a visible symbol (⬜/✅) since import drops the
//     checkbox. Blockquotes and lists pass through unchanged.
//   - Renders block math ($$...$$) to a PNG data URL (MathJax -> sharp); inline
//     math ($...$) is left as-is. Import renders base64 PNG/JPG only (not webp/
//     bmp/svg), so both images and math end up as PNG.
//   - Inlines local images as base64 data URLs, transcoded to PNG by default
//     because import renders base64 PNG but not webp (Markdown upload carries no
//     images). External/site-absolute URLs are left untouched.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { visit, SKIP } from "unist-util-visit";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(REPO_ROOT, "src/content/posts");

// Xiaohongshu drops task-list checkboxes (renders them as a plain bullet), so
// inject a visible symbol instead.
const TASK_TODO = "⬜";
const TASK_DONE = "✅";

// Word left next to content that needs manual handling: strikethrough, tables,
// and links (Xiaohongshu is extremely hostile to links, so we only flag them).
const MARKER = "MARKER";

// Bold styling is dropped on import; <mark> highlight is the one inline style
// that survives, so bold is converted to it (italic is left as-is).
const HIGHLIGHT_OPEN = "<mark>";
const HIGHLIGHT_CLOSE = "</mark>";

// <sub>/<sup> tags are stripped on import (leaving e.g. "H2O"), so map their
// text to real unicode sub/superscripts where a codepoint exists, else keep the
// char as-is.
const SUBSCRIPT = {
  ..."0123456789+-=()".split("").reduce((m, c, i) => ((m[c] = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎"[i]), m), {}),
  a: "ₐ", e: "ₑ", o: "ₒ", x: "ₓ", h: "ₕ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ",
  p: "ₚ", s: "ₛ", t: "ₜ", i: "ᵢ", j: "ⱼ", r: "ᵣ", u: "ᵤ", v: "ᵥ",
};
const SUPERSCRIPT = {
  ..."0123456789+-=()".split("").reduce((m, c, i) => ((m[c] = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾"[i]), m), {}),
  a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ",
  j: "ʲ", k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ",
  t: "ᵗ", u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
};
// Xiaohongshu title box limit, counting each CJK or ASCII char as 1.
const TITLE_LIMIT = 64;

const MIME_BY_EXT = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

function parseArgs(argv) {
  // Default to PNG: Xiaohongshu's Markdown import renders base64 PNG data URLs
  // but not webp. Pass `--img-format original` to keep each image's source format.
  const opts = { post: null, out: null, imgFormat: "png" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "-o") opts.out = argv[++i];
    else if (a === "--img-format") opts.imgFormat = argv[++i];
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (!opts.post) opts.post = a;
    else throw new Error(`Unexpected argument: ${a}`);
  }
  if (["original", "none", "keep"].includes(opts.imgFormat)) opts.imgFormat = null;
  else if (opts.imgFormat === "jpg") opts.imgFormat = "jpeg";
  if (opts.imgFormat && !["png", "jpeg", "webp"].includes(opts.imgFormat)) {
    throw new Error(`Unknown --img-format "${opts.imgFormat}" (use png | jpeg | webp | original)`);
  }
  return opts;
}

function resolvePost(arg) {
  const candidates = [
    path.resolve(process.cwd(), arg),
    path.join(POSTS_DIR, arg),
    path.join(POSTS_DIR, `${arg}.md`),
    path.join(POSTS_DIR, `${arg}.mdx`),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  throw new Error(`Post not found. Tried:\n  ${candidates.join("\n  ")}`);
}

function splitFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { data: {}, body: raw };
  return { data: parseYaml(m[1]) ?? {}, body: raw.slice(m[0].length) };
}

const paragraphOf = (value) => ({ type: "paragraph", children: [{ type: "text", value }] });
const collapseWs = (s) => s.replace(/\s+/g, " ").trim();

const HTML_STRIKE_OPEN = /^<(del|s|strike)(?:\s[^>]*)?>$/i;
const HTML_STRIKE_CLOSE = /^<\/(del|s|strike)>$/i;
const HTML_SUBSUP_OPEN = /^<(sub|sup)>$/i;
const HTML_SUBSUP_CLOSE = /^<\/(sub|sup)>$/i;

const nodeText = (nodes) => nodes.map((n) => (typeof n.value === "string" ? n.value : "")).join("");

// Remark keeps raw inline HTML tags as separate `html` nodes. Walk the tree and,
// for each matching <tag>...</tag> pair, replace the whole run with the nodes
// that `render(tag, between)` returns.
function replaceHtmlPairs(tree, openRe, closeRe, render) {
  const walk = (node) => {
    if (!Array.isArray(node.children)) return;
    for (let i = 0; i < node.children.length; i++) {
      const open = node.children[i];
      const m = open.type === "html" && openRe.exec(open.value);
      if (m) {
        const tag = m[1].toLowerCase();
        const close = node.children.findIndex(
          (k, j) => j > i && k.type === "html" && closeRe.exec(k.value)?.[1].toLowerCase() === tag,
        );
        if (close !== -1) {
          const between = node.children.slice(i + 1, close);
          node.children.splice(i, close - i + 1, ...render(tag, between));
          continue;
        }
      }
      walk(node.children[i]);
    }
  };
  walk(tree);
}

// Raw <del>/<s>/<strike>: keep the content, wrapped as `MARKER(...)`.
function markHtmlStrikethrough(tree, stats) {
  replaceHtmlPairs(tree, HTML_STRIKE_OPEN, HTML_STRIKE_CLOSE, (_tag, between) => {
    stats.markers++;
    return [{ type: "text", value: `${MARKER}(` }, ...between, { type: "text", value: ")" }];
  });
}

// Raw <sub>/<sup>: map the text to unicode sub/superscripts where a codepoint
// exists (e.g. `H<sub>2</sub>O` -> `H₂O`, `x<sup>2</sup>` -> `x²`).
function convertHtmlSubSup(tree, stats) {
  replaceHtmlPairs(tree, HTML_SUBSUP_OPEN, HTML_SUBSUP_CLOSE, (tag, between) => {
    stats.subsup++;
    const map = tag === "sub" ? SUBSCRIPT : SUPERSCRIPT;
    const value = [...nodeText(between)].map((c) => map[c] ?? c).join("");
    return [{ type: "text", value }];
  });
}

function transformTree(tree, stats) {
  visit(tree, (node, index, parent) => {
    if (node.type === "heading") {
      // Only H1/H2 render on import, and bold text does not, so flatten deeper
      // levels to H2 rather than to a bold paragraph: `##`->`#`, `###`+->`##`.
      if (node.depth === 2) {
        node.depth = 1;
      } else if (node.depth >= 3) {
        if (node.depth >= 4) stats.flattenedHeadings++;
        node.depth = 2;
      }
      // A body H1 is unusual (the title lives in frontmatter); leave it as-is.
      return;
    }
    if (node.type === "delete" && parent && typeof index === "number") {
      // Strikethrough is unsupported: keep the original text wrapped in `()`
      // with a MARKER in front, so it can be handled by hand.
      parent.children.splice(
        index,
        1,
        { type: "text", value: `${MARKER}(` },
        ...node.children,
        { type: "text", value: ")" },
      );
      stats.markers++;
      return index; // re-visit the kept children (images, emphasis, etc.)
    }
    if (node.type === "strong" && parent && typeof index === "number") {
      // Bold styling is dropped on import, but <mark> highlight survives, so
      // convert bold to it. Italic (emphasis) is left as-is: Xiaohongshu has no
      // italic, and mapping it to <mark> too would make everything look bold.
      parent.children.splice(
        index,
        1,
        { type: "html", value: HIGHLIGHT_OPEN },
        ...node.children,
        { type: "html", value: HIGHLIGHT_CLOSE },
      );
      stats.highlights++;
      return index + 1; // re-visit the wrapped children (nested emphasis, etc.)
    }
    if (node.type === "table" && parent && typeof index === "number") {
      // Tables are unsupported: remove, leaving an empty `MARKER()` (the table
      // structure cannot be preserved inline, so there is nothing to keep).
      parent.children.splice(index, 1, paragraphOf(`${MARKER}()`));
      stats.tables++;
      return [SKIP, index];
    }
    if (node.type === "listItem" && node.checked != null) {
      // Task-list checkboxes are dropped on import: inject a visible symbol and
      // demote the item to a plain bullet.
      const sym = node.checked ? TASK_DONE : TASK_TODO;
      const first = node.children[0];
      if (first && first.type === "paragraph") {
        first.children.unshift({ type: "text", value: `${sym} ` });
      } else {
        node.children.unshift(paragraphOf(sym));
      }
      node.checked = null;
      stats.tasks++;
      return; // descend into the item normally
    }
    if (node.type === "link" && parent && typeof index === "number") {
      // Xiaohongshu is extremely hostile to links. Leave every link exactly as-is
      // (bare url, <url>, or [text](url)) but wrap it in `MARKER(...)` so all of
      // them are easy to find and purge later.
      parent.children.splice(
        index,
        1,
        { type: "text", value: `${MARKER}(` },
        node,
        { type: "text", value: ")" },
      );
      stats.links++;
      return [SKIP, index + 3]; // skip the wrapper and the untouched link
    }
    if (node.type === "math" && parent && typeof index === "number") {
      // Block math -> an image placeholder; the PNG data URL is filled in later
      // (rendering is async). Wrap in a paragraph since images are inline.
      const img = { type: "image", url: "", alt: node.value, title: "" };
      parent.children.splice(index, 1, { type: "paragraph", children: [img] });
      stats.mathImages.push({ img, tex: node.value });
      return [SKIP, index + 1]; // skip the new paragraph (not a real file image)
    }
    if (node.type === "inlineMath") {
      // Left as-is: remark-math re-serializes it back to `$...$` on stringify.
      stats.inlineMath++;
      return;
    }
    if (node.type === "image") {
      stats.images.push(node);
    }
  });
}

function isExternalUrl(url) {
  return /^(https?:|data:|mailto:|tel:)/i.test(url) || url.startsWith("//") || url.startsWith("/");
}

async function embedImages(images, postDir, opts, stats) {
  for (const node of images) {
    const url = node.url ?? "";
    if (isExternalUrl(url)) {
      stats.skippedImages.push(url);
      continue;
    }
    const decoded = decodeURIComponent(url.split(/[?#]/)[0]);
    const abs = path.resolve(postDir, decoded);
    if (!existsSync(abs)) {
      stats.missingImages.push(url);
      continue;
    }
    let buf = await readFile(abs);
    let ext = path.extname(abs).toLowerCase();
    let mime = MIME_BY_EXT[ext] ?? "application/octet-stream";

    if (opts.imgFormat && mime !== "image/svg+xml" && !mime.endsWith(opts.imgFormat)) {
      // Optional transcode using sharp (already a project dependency).
      const sharp = (await import("sharp")).default;
      const fmt = opts.imgFormat === "jpg" ? "jpeg" : opts.imgFormat;
      buf = await sharp(buf)[fmt]().toBuffer();
      mime = fmt === "jpeg" ? "image/jpeg" : `image/${fmt}`;
    }

    node.url = `data:${mime};base64,${buf.toString("base64")}`;
    stats.embedded++;
    stats.embeddedBytes += node.url.length;
  }
}

// Pixels per MathJax `ex` unit when rasterizing formulas. Higher = crisper/larger.
const MATH_PX_PER_EX = 24;

// MathJax is heavy, so build the TeX->SVG renderer lazily and reuse it.
let mathRenderer = null;
async function getMathRenderer() {
  if (mathRenderer) return mathRenderer;
  const [{ mathjax }, { TeX }, { SVG }, { liteAdaptor }, { RegisterHTMLHandler }, { AllPackages }] =
    await Promise.all([
      import("mathjax-full/js/mathjax.js"),
      import("mathjax-full/js/input/tex.js"),
      import("mathjax-full/js/output/svg.js"),
      import("mathjax-full/js/adaptors/liteAdaptor.js"),
      import("mathjax-full/js/handlers/html.js"),
      import("mathjax-full/js/input/tex/AllPackages.js"),
    ]);
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const doc = mathjax.document("", {
    InputJax: new TeX({ packages: AllPackages }),
    // fontCache "none" inlines every glyph as a <path>, so the SVG is fully
    // self-contained and needs no system fonts when sharp rasterizes it.
    OutputJax: new SVG({ fontCache: "none" }),
  });
  mathRenderer = { adaptor, doc };
  return mathRenderer;
}

// Render each collected block-math node to a PNG data URL (Xiaohongshu renders
// base64 PNG/JPG, but not svg/webp/bmp; PNG keeps math edges crisp).
async function renderMathBlocks(mathImages, stats) {
  if (!mathImages.length) return;
  const { adaptor, doc } = await getMathRenderer();
  const sharp = (await import("sharp")).default;
  for (const { img, tex } of mathImages) {
    try {
      let svg = adaptor.innerHTML(doc.convert(tex, { display: true }));
      const w = Math.ceil(parseFloat(svg.match(/width="([\d.]+)ex"/)?.[1] ?? "0") * MATH_PX_PER_EX);
      const h = Math.ceil(parseFloat(svg.match(/height="([\d.]+)ex"/)?.[1] ?? "0") * MATH_PX_PER_EX);
      svg = svg
        .replace(/width="[\d.]+ex"/, `width="${w}"`)
        .replace(/height="[\d.]+ex"/, `height="${h}"`)
        .replace(/currentColor/g, "#111111");
      const png = await sharp(Buffer.from(svg)).flatten({ background: "#ffffff" }).png().toBuffer();
      img.url = `data:image/png;base64,${png.toString("base64")}`;
      stats.mathPng++;
      stats.embeddedBytes += img.url.length;
    } catch (err) {
      // Bad TeX: fall back to a MARKER with the source so it can be fixed by hand.
      Object.assign(img, { type: "text", value: `${MARKER}($$${tex}$$)`, url: undefined, alt: undefined });
      stats.mathErrors.push(String(err.message ?? err));
    }
  }
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.post) {
    process.stderr.write(
      "Usage: node scripts/md-to-xhs.js <slug-or-path> [--out <file>] [--img-format png|jpeg|webp|original]\n",
    );
    process.exit(opts.help ? 0 : 1);
  }

  const postPath = resolvePost(opts.post);
  const postDir = path.dirname(postPath);
  const slug = path.basename(postPath).replace(/\.mdx?$/, "");

  const raw = await readFile(postPath, "utf8");
  const { data, body } = splitFrontmatter(raw);

  const stats = {
    images: [],
    embedded: 0,
    embeddedBytes: 0,
    skippedImages: [],
    missingImages: [],
    mathImages: [],
    mathPng: 0,
    mathErrors: [],
    inlineMath: 0,
    markers: 0,
    tables: 0,
    highlights: 0,
    subsup: 0,
    tasks: 0,
    links: 0,
    flattenedHeadings: 0,
    titleLen: 0,
    titleOver: null,
  };

  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(body);
  markHtmlStrikethrough(tree, stats);
  convertHtmlSubSup(tree, stats);
  transformTree(tree, stats);
  await renderMathBlocks(stats.mathImages, stats);
  await embedImages(stats.images, postDir, opts, stats);

  // Prepend title, then description, as plain leading paragraphs.
  const leading = [];
  if (data.title != null) {
    const title = String(data.title);
    stats.titleLen = [...title].length;
    if (stats.titleLen > TITLE_LIMIT) stats.titleOver = stats.titleLen;
    leading.push(paragraphOf(title));
  }
  if (data.description != null) {
    leading.push(paragraphOf(collapseWs(String(data.description))));
  }
  tree.children.unshift(...leading);

  const output = unified()
    .use(remarkStringify, {
      bullet: "-",
      emphasis: "*",
      strong: "*",
      rule: "-",
      fences: true,
      listItemIndent: "one",
    })
    .use(remarkGfm)
    .use(remarkMath)
    .stringify(tree);

  const outPath = opts.out
    ? path.resolve(process.cwd(), opts.out)
    : path.join(REPO_ROOT, "xhs-out", `${slug}.md`);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, output, "utf8");

  // Report to stderr; the written path goes to stdout for easy scripting.
  const log = (s) => process.stderr.write(`${s}\n`);
  log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  log(`  title: ${stats.titleLen}/${TITLE_LIMIT} chars${stats.titleOver ? "  ⚠ OVER LIMIT" : ""}`);
  log(`  images embedded: ${stats.embedded} (${fmtBytes(stats.embeddedBytes)} of base64)`);
  if (stats.skippedImages.length)
    log(`  images left as URLs: ${stats.skippedImages.length} (${stats.skippedImages.join(", ")})`);
  if (stats.missingImages.length)
    log(`  ⚠ images not found: ${stats.missingImages.join(", ")}`);
  log(`  block math rendered to PNG: ${stats.mathPng}`);
  if (stats.mathErrors.length) log(`  ⚠ math render errors: ${stats.mathErrors.length}`);
  log(`  inline math left as-is ($...$): ${stats.inlineMath}`);
  log(`  strikethrough kept as MARKER(...): ${stats.markers}`);
  log(`  tables removed (MARKER()): ${stats.tables}`);
  log(`  bold -> <mark> highlight: ${stats.highlights}`);
  log(`  sub/sup -> unicode: ${stats.subsup}`);
  log(`  links wrapped as MARKER(...): ${stats.links}`);
  log(`  task-list items marked (${TASK_TODO}/${TASK_DONE}): ${stats.tasks}`);
  log(`  deep headings flattened to H2 (####+): ${stats.flattenedHeadings}`);
  process.stdout.write(`${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.stack ?? err}\n`);
  process.exit(1);
});
