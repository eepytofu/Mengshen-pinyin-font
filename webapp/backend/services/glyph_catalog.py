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

from .. import settings
from ..schemas import Project
from .preview_composer import _FontOutlines
from .project_store import ProjectStore

INDEX_FILENAME = "glyph_index.json"
# Bump when index build logic changes so cached glyph_index.json regenerates
_INDEX_VERSION = "v2"

_index_lock = threading.Lock()
_index_cache: Dict[str, tuple[str, List[dict]]] = {}
_standard_tables_cache: Optional[Dict[str, frozenset[int]]] = None

STANDARD_TABLE_LABELS = {
    "tgscc": "通用规范汉字表",
    "big5": "Big5 (2003)",
    "joyo": "常用漢字表",
}

# CJK blocks considered "hanzi" (incl. radicals, ext A/B+, compatibility)
_CJK_RANGES = (
    (0x2E80, 0x2FDF),
    (0x3400, 0x4DBF),
    (0x4E00, 0x9FFF),
    (0xF900, 0xFAFF),
    (0x20000, 0x2FA1F),
)


def _is_cjk(codepoint: int) -> bool:
    return any(start <= codepoint <= end for start, end in _CJK_RANGES)


def standard_tables() -> Dict[str, frozenset[int]]:
    """Per-table codepoint sets parsed from res/download_unicode_tables/."""
    global _standard_tables_cache
    if _standard_tables_cache is not None:
        return _standard_tables_cache

    tables_dir = settings.PATHS.resources_dir / "download_unicode_tables"

    # TGSCC-Unicode.txt: "<index>\tU+XXXX"
    tgscc: set[int] = set()
    for line in _table_lines(tables_dir / "TGSCC-Unicode.txt"):
        parts = line.split()
        if len(parts) >= 2 and parts[1].startswith("U+"):
            tgscc.add(int(parts[1][2:], 16))

    # big5_2003-u2b.txt: "0xA1B1 0x00A7" (2nd column is Unicode; keep CJK only)
    big5: set[int] = set()
    for line in _table_lines(tables_dir / "big5_2003-u2b.txt"):
        parts = line.split()
        if len(parts) >= 2 and parts[1].startswith("0x"):
            codepoint = int(parts[1], 16)
            if _is_cjk(codepoint):
                big5.add(codepoint)

    # joyokanjihyo_20101130.txt: "04E00: 一"
    joyo: set[int] = set()
    for line in _table_lines(tables_dir / "joyokanjihyo_20101130.txt"):
        head = line.split(":", 1)[0].strip()
        if head and all(c in "0123456789ABCDEFabcdef" for c in head):
            joyo.add(int(head, 16))

    _standard_tables_cache = {
        "tgscc": frozenset(tgscc),
        "big5": frozenset(big5),
        "joyo": frozenset(joyo),
    }
    return _standard_tables_cache


def allowed_hanzi() -> frozenset[int]:
    """Union of 通用规范汉字表 (TGSCC), Big5 (2003), and 常用漢字表 (2010).

    The glyph browser only lists hanzi from these standard tables;
    everything else in the fonts' CJK blocks is noise for this UI.
    """
    tables = standard_tables()
    return tables["tgscc"] | tables["big5"] | tables["joyo"]


def tables_for(codepoints: List[int]) -> List[str]:
    """Which standard tables the glyph's codepoints belong to."""
    return [
        name
        for name, members in standard_tables().items()
        if any(cp in members for cp in codepoints)
    ]


def _table_lines(path: Path) -> List[str]:
    if not path.exists():
        return []
    return [
        line
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


def _categorize(name: str, char: Optional[str]) -> str:
    if name.startswith("py_alphabet_"):
        return "pinyin_alphabet"
    if name.startswith("py_"):
        return "pronunciation"
    if char is not None and _is_cjk(ord(char)):
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

        allowed = allowed_hanzi()
        for glyph_name in outlines.font.getGlyphOrder():
            if glyph_name in seen:
                continue
            seen.add(glyph_name)
            codepoints = sorted(reverse_cmap.get(glyph_name, []))
            char = chr(codepoints[0]) if codepoints else None
            category = _categorize(glyph_name, char)
            # Hanzi are restricted to the standard tables
            # (通用规范汉字表 / Big5 / 常用漢字表)
            if category == "hanzi" and not any(cp in allowed for cp in codepoints):
                continue
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
    return f"{_INDEX_VERSION}:{base}:{pinyin}:{overrides}"


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
