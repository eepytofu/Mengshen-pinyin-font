# -*- coding: utf-8 -*-
"""Glyph index and thumbnail SVGs for the glyph browser screen.

The index is built once per font selection from the TTFs via fonttools and
cached as tmp/projects/<id>/glyph_index.json; thumbnails are rendered on
demand with the same outline mechanism as the preview.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Dict, List, Optional

from ..schemas import Project
from .preview_composer import _FontOutlines
from .project_store import ProjectStore

INDEX_FILENAME = "glyph_index.json"

_index_lock = threading.Lock()
_index_cache: Dict[str, tuple[str, List[dict]]] = {}


def _categorize(name: str, char: Optional[str]) -> str:
    if name.startswith("py_alphabet_"):
        return "pinyin_alphabet"
    if name.startswith("py_"):
        return "pronunciation"
    if char is not None and 0x2E80 <= ord(char) <= 0x9FFF or (
        char is not None and 0x3400 <= ord(char) <= 0x4DBF
    ):
        return "hanzi"
    return "other"


def _build_index(project: Project) -> List[dict]:
    entries: List[dict] = []
    seen: set[str] = set()

    for role, font_ref in (("base", project.base_font), ("pinyin", project.pinyin_font)):
        if font_ref is None:
            continue
        outlines = _FontOutlines(font_ref.path, font_ref.sha256)
        reverse_cmap: Dict[str, List[int]] = {}
        for codepoint, glyph_name in outlines.cmap.items():
            reverse_cmap.setdefault(glyph_name, []).append(codepoint)

        for glyph_name in outlines.font.getGlyphOrder():
            if glyph_name in seen:
                continue
            seen.add(glyph_name)
            codepoints = sorted(reverse_cmap.get(glyph_name, []))
            char = chr(codepoints[0]) if codepoints else None
            category = _categorize(glyph_name, char)
            if role == "pinyin" and category == "other" and char and char.isalpha():
                category = "pinyin_alphabet"
            entries.append(
                {
                    "name": glyph_name,
                    "font": role,
                    "char": char,
                    "codepoints": [f"U+{cp:04X}" for cp in codepoints],
                    "advance_width": outlines.advance_width(glyph_name),
                    "category": category,
                    "overridden": bool(
                        char and char in project.glyph_overrides.readings
                    ),
                }
            )
    return entries


def _index_path(store: ProjectStore, project: Project) -> Path:
    return store.project_dir(project.id) / INDEX_FILENAME


def _fonts_key(project: Project) -> str:
    base = project.base_font.sha256 if project.base_font else "-"
    pinyin = project.pinyin_font.sha256 if project.pinyin_font else "-"
    overrides = ",".join(sorted(project.glyph_overrides.readings))
    return f"{base}:{pinyin}:{overrides}"


def get_index(store: ProjectStore, project: Project) -> List[dict]:
    """Load (or build) the glyph index for the project."""
    key = _fonts_key(project)
    with _index_lock:
        cached = _index_cache.get(project.id)
        if cached is not None and cached[0] == key:
            return cached[1]

        index_path = _index_path(store, project)
        if index_path.exists():
            data = json.loads(index_path.read_text(encoding="utf-8"))
            if data.get("key") == key:
                _index_cache[project.id] = (key, data["glyphs"])
                return data["glyphs"]

        entries = _build_index(project)
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_path.write_text(
            json.dumps({"key": key, "glyphs": entries}, ensure_ascii=False),
            encoding="utf-8",
        )
        _index_cache[project.id] = (key, entries)
        return entries


def search(
    entries: List[dict],
    query: str = "",
    category: str = "",
    page: int = 1,
    size: int = 200,
) -> dict:
    filtered = entries
    if category:
        filtered = [e for e in filtered if e["category"] == category]
    if query:
        q = query.strip()
        q_upper = q.upper()
        if q_upper.startswith("U+"):
            filtered = [e for e in filtered if q_upper in e["codepoints"]]
        elif len(q) == 1 and not q.isascii():
            filtered = [e for e in filtered if e["char"] == q]
        else:
            q_lower = q.lower()
            filtered = [
                e
                for e in filtered
                if q_lower in e["name"].lower() or e["char"] == q
            ]

    total = len(filtered)
    start = max(page - 1, 0) * size
    return {
        "total": total,
        "page": page,
        "size": size,
        "glyphs": filtered[start : start + size],
    }


def find_glyph(entries: List[dict], name: str) -> Optional[dict]:
    for entry in entries:
        if entry["name"] == name:
            return entry
    return None


def thumbnail_svg(project: Project, entry: dict) -> Optional[str]:
    font_ref = project.base_font if entry["font"] == "base" else project.pinyin_font
    if font_ref is None:
        return None
    outlines = _FontOutlines(font_ref.path, font_ref.sha256)
    try:
        path_d = outlines.svg_path(entry["name"])
    except KeyError:
        return None
    upem = outlines.upem
    descent = abs(float(outlines.font["hhea"].descender))
    height = upem + descent
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {entry["advance_width"]:.0f} {height:.0f}">'
        # Fixed fill: these render via <img>, where currentColor
        # would resolve to black and vanish on the dark background
        f'<g transform="translate(0 {upem}) scale(1 -1)">'
        f'<path d="{path_d}" fill="#cbd5e1"/></g></svg>'
    )
