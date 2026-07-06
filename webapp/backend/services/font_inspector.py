# -*- coding: utf-8 -*-
"""Font metadata and license inspection via fonttools (no otfccdump)."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import List, Optional

from fontTools.ttLib import TTFont

from ..schemas import FontRef, LicenseEntry

# nameID semantics follow src/refactored/config/font_name_tables.py
NAME_ID_LABELS = {
    0: "Copyright",
    1: "Font Family",
    2: "Subfamily",
    4: "Full Name",
    5: "Version",
    7: "Trademark",
    8: "Manufacturer",
    13: "License Description",
    14: "License URL",
}
LICENSE_NAME_IDS = [0, 1, 4, 5, 7, 8, 13, 14]


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _best_name(font: TTFont, name_id: int) -> Optional[str]:
    record = font["name"].getDebugName(name_id)
    return record


def read_license_entries(path: Path) -> List[LicenseEntry]:
    font = TTFont(str(path), lazy=True)
    try:
        entries = []
        for name_id in LICENSE_NAME_IDS:
            value = _best_name(font, name_id)
            if value:
                entries.append(
                    LicenseEntry(
                        name_id=name_id,
                        label=NAME_ID_LABELS.get(name_id, f"nameID {name_id}"),
                        value=value,
                    )
                )
        return entries
    finally:
        font.close()


def inspect_font(path: Path, source: str, original_filename: str) -> FontRef:
    font = TTFont(str(path), lazy=True)
    try:
        family = _best_name(font, 1) or _best_name(font, 4) or path.stem
        upem = int(font["head"].unitsPerEm)
        glyph_count = len(font.getGlyphOrder())
    finally:
        font.close()

    return FontRef(
        source=source,
        path=str(path),
        original_filename=original_filename,
        sha256=sha256_of(path),
        family_name=family,
        units_per_em=upem,
        glyph_count=glyph_count,
    )
