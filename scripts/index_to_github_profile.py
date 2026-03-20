#!/usr/bin/env python3

from pathlib import Path
import re


def parse_yaml_str_field(raw: str) -> str:
    if raw.startswith(("'", '"')):
        return raw[1:-1]
    elif raw.startswith(("|", ">")):
        raise ValueError("Multiline YAML strings are not supported")
    else:
        return raw


src = Path(__file__).resolve().parent.parent / "content" / "_index.md"
dst = Path(__file__).resolve().parent.parent.parent / "myl7" / "README.md"
text = src.read_text()

# Extract front matter
fm_match = re.match(r"^---\n(.*?)---\n+", text, re.DOTALL)
if not fm_match:
    raise ValueError("No front matter found")
_front_matter = fm_match.group(1)

body = text[fm_match.end() :]

stats_cards = """
![GitHub Stats](https://github-readme-stats.vercel.app/api?username=myl7&show_icons=true&theme=radical)
![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=myl7&layout=compact&theme=radical)
![Streak Stats](https://github-readme-streak-stats.herokuapp.com/?user=myl7&theme=radical)
"""

dst.write_text(body + stats_cards)
