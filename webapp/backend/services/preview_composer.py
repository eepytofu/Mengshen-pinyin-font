# -*- coding: utf-8 -*-
"""Lightweight SVG preview of hanzi + positioned pinyin.

Outlines come from the selected TTFs via fonttools; the placement math is
the production code itself (PinyinGlyphGenerator), so slider previews match
the built font exactly — including tracking clamp, centering, and the
avoid-overlap x-scale reduction. No otfcc round-trip, works before prepare.
"""

from __future__ import annotations

import threading
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

from src.refactored.config.font_config import FontType
from src.refactored.data import PinyinDataManager
from src.refactored.generation.glyph_manager import PinyinGlyphGenerator
from src.refactored.scripts.retrieve_latin_alphabet import ALPHABET
from src.refactored.utils.pinyin_utils import simplification_pronunciation

from ..schemas import CanvasModel, PreviewItem, PreviewResponse, Project
from .pipeline import font_metadata_from_project

_font_lock = threading.Lock()


@lru_cache(maxsize=8)
def _load_font(path: str, sha256: str) -> TTFont:
    # sha256 keys the cache so a replaced file at the same path reloads
    del sha256
    return TTFont(path, lazy=True)


class _FontOutlines:
    """Cached outline/metric access for one TTF."""

    def __init__(self, path: str, sha256: str):
        self.font = _load_font(path, sha256)
        self.cmap = self.font.getBestCmap()
        self.glyph_set = self.font.getGlyphSet()
        self.hmtx = self.font["hmtx"]
        self.upem = int(self.font["head"].unitsPerEm)

    def glyph_name(self, char: str) -> Optional[str]:
        return self.cmap.get(ord(char))

    def svg_path(self, glyph_name: str) -> str:
        pen = SVGPathPen(self.glyph_set)
        self.glyph_set[glyph_name].draw(pen)
        return pen.getCommands()

    def advance_width(self, glyph_name: str) -> float:
        return float(self.hmtx[glyph_name][0])


def _alphabet_metric_glyphs(outlines: _FontOutlines) -> Dict[str, dict]:
    """Metric-only glyph dicts keyed by py_alphabet_* names.

    Only advanceWidth/advanceHeight are consumed by the placement math.
    """
    glyphs: Dict[str, dict] = {}
    for char in ALPHABET:
        glyph_name = outlines.glyph_name(char)
        if glyph_name is None:
            continue
        width = outlines.advance_width(glyph_name)
        simplified = simplification_pronunciation(char)
        glyphs[f"py_alphabet_{simplified}"] = {
            "advanceWidth": width,
            "advanceHeight": float(outlines.upem),
        }
    return glyphs


def _pinyin_references(
    pronunciation: str,
    hanzi_advance_width: float,
    hanzi_advance_height: float,
    canvas: CanvasModel,
    project: Project,
    alphabet_glyphs: Dict[str, dict],
) -> List[dict]:
    """Run the production placement math for one pronunciation."""
    working = project.model_copy(update={"canvas": canvas})
    font_metadata = font_metadata_from_project(working)

    generator = PinyinGlyphGenerator(FontType.CUSTOM, font_metadata)
    generator.set_alphabet_glyphs(alphabet_glyphs)
    generator.generate_pronunciation_glyphs(
        hanzi_advance_width=hanzi_advance_width,
        hanzi_advance_height=hanzi_advance_height,
        pinyin_canvas_width=canvas.pinyin.width,
        pinyin_canvas_height=canvas.pinyin.height,
        pinyin_canvas_base_line=canvas.pinyin.base_line,
        all_pronunciations={pronunciation},
    )
    simplified = simplification_pronunciation(pronunciation)
    glyph = generator.get_pronunciation_glyphs().get(simplified)
    if glyph is None:
        return []
    return list(glyph.get("references", []))


_pinyin_data = PinyinDataManager()


def get_pronunciations(project: Project, char: str) -> List[str]:
    """Effective readings: base data merged with project overrides."""
    override = project.glyph_overrides.readings.get(char)
    base = _pinyin_data.get_pinyin(char) or []
    if override is None:
        return base
    if override.mode == "replace":
        return list(override.pronunciations)
    merged = base + [p for p in override.pronunciations if p not in base]
    return merged


def compose_preview(
    project: Project, text: str, canvas: CanvasModel
) -> PreviewResponse:
    if project.base_font is None or project.pinyin_font is None:
        return PreviewResponse(
            items=[], warnings=["Select both base and pinyin fonts first"]
        )

    warnings: List[str] = []
    items: List[PreviewItem] = []

    with _font_lock:
        base = _FontOutlines(project.base_font.path, project.base_font.sha256)
        pinyin = _FontOutlines(project.pinyin_font.path, project.pinyin_font.sha256)
        alphabet_glyphs = _alphabet_metric_glyphs(pinyin)

        if "py_alphabet_v3" not in alphabet_glyphs:
            warnings.append(
                "Pinyin font is missing tone glyphs (ǚ); placement uses fallback"
            )

        # Placement math sizes everything against ǚ (the tallest glyph)
        pinyin_paths: Dict[str, Tuple[str, float]] = {}

        for char in text:
            if char.isspace():
                continue
            base_glyph_name = base.glyph_name(char)
            if base_glyph_name is None:
                warnings.append(f"Base font has no glyph for '{char}'")
                continue

            pronunciations = get_pronunciations(project, char)
            pronunciation = pronunciations[0] if pronunciations else ""

            hanzi_width = base.advance_width(base_glyph_name)
            hanzi_height = float(base.upem)
            canvas_height_scale = hanzi_height / canvas.hanzi.height
            total_height = hanzi_height + canvas.pinyin.height * canvas_height_scale
            descent = abs(float(base.font["hhea"].descender))

            svg_parts = [
                f'<svg xmlns="http://www.w3.org/2000/svg" '
                f'viewBox="0 0 {hanzi_width:.0f} {total_height + descent:.0f}">',
                # Font coordinates are Y-up; flip so the pinyin zone
                # (above the em box) and the descender both stay visible
                f'<g transform="translate(0 {total_height:.0f}) scale(1 -1)">',
                f'<path d="{base.svg_path(base_glyph_name)}" fill="currentColor"/>',
            ]

            if pronunciation and "py_alphabet_v3" in alphabet_glyphs:
                references = _pinyin_references(
                    pronunciation,
                    hanzi_width,
                    hanzi_height,
                    canvas,
                    project,
                    alphabet_glyphs,
                )
                for ref in references:
                    glyph_key = str(ref["glyph"])
                    if glyph_key not in pinyin_paths:
                        # py_alphabet_{simplified} -> original toned char
                        target = None
                        for char_candidate in ALPHABET:
                            simplified = simplification_pronunciation(char_candidate)
                            if f"py_alphabet_{simplified}" == glyph_key:
                                target = char_candidate
                                break
                        if target is None:
                            continue
                        glyph_name = pinyin.glyph_name(target)
                        if glyph_name is None:
                            continue
                        pinyin_paths[glyph_key] = (
                            pinyin.svg_path(glyph_name),
                            0.0,
                        )
                    path_d = pinyin_paths[glyph_key][0]
                    svg_parts.append(
                        f'<path d="{path_d}" fill="currentColor" '
                        f'transform="matrix({ref["a"]} 0 0 {ref["d"]} '
                        f'{ref["x"]} {ref["y"]})"/>'
                    )
            elif not pronunciation:
                warnings.append(f"No pinyin reading found for '{char}'")

            svg_parts.append("</g></svg>")
            items.append(
                PreviewItem(char=char, pinyin=pronunciation, svg="".join(svg_parts))
            )

    return PreviewResponse(items=items, warnings=warnings)
