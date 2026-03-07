#!/usr/bin/env python3

from pathlib import Path
import re

src = Path(__file__).resolve().parent.parent / "content" / "_index.md"
dst = Path(__file__).resolve().parent.parent.parent / "myl7" / "README.md"

text = src.read_text()

# Extract front matter
fm_match = re.match(r"^---\n(.*?)---\n+", text, re.DOTALL)
if not fm_match:
    raise ValueError("No front matter found")
front_matter = fm_match.group(1)

# Extract title from front matter
title_match = re.search(r"^title:\s*(.+)$", front_matter, re.MULTILINE)
if not title_match:
    raise ValueError("No title found in front matter")
raw = title_match.group(1).strip()

if raw.startswith(("'", '"')):
    title = raw[1:-1]
elif raw.startswith(("|", ">")):
    raise ValueError("Multiline YAML strings for title are not supported")
else:
    title = raw

body = text[fm_match.end() :]

dst.write_text(f"# {title}\n\n{body}")
