# -*- coding: utf-8 -*-
"""
Tests for issue #16 - 拼音の "z" グリフが欠落する問題

TDD: このテストは z グリフが存在し、z を含む拼音で正しく参照されることを保証する。
"""

import json
import tempfile
from pathlib import Path

import pytest

from refactored.config import FontConfig, FontType
from refactored.generation.glyph_manager import PinyinGlyphGenerator


def _make_alphabet_json(tmp_path: Path, include_z: bool = True) -> Path:
    """テスト用アルファベット JSON を作成する。"""
    # 基本グリフデータ（等幅フォント想定）
    basic_glyph = {
        "advanceWidth": 500,
        "advanceHeight": 1000,
        "verticalOrigin": 880,
        "contours": [
            [
                {"x": 50, "y": 0, "on": True},
                {"x": 450, "y": 0, "on": True},
                {"x": 450, "y": 700, "on": True},
                {"x": 50, "y": 700, "on": True},
            ]
        ],
    }

    alphabet_data = {
        "a": basic_glyph.copy(),
        "ā": basic_glyph.copy(),
        "á": basic_glyph.copy(),
        "ǎ": basic_glyph.copy(),
        "à": basic_glyph.copy(),
        "b": basic_glyph.copy(),
        "c": basic_glyph.copy(),
        "d": basic_glyph.copy(),
        "e": basic_glyph.copy(),
        "ē": basic_glyph.copy(),
        "é": basic_glyph.copy(),
        "ě": basic_glyph.copy(),
        "è": basic_glyph.copy(),
        "f": basic_glyph.copy(),
        "g": basic_glyph.copy(),
        "h": basic_glyph.copy(),
        "i": basic_glyph.copy(),
        "ī": basic_glyph.copy(),
        "í": basic_glyph.copy(),
        "ǐ": basic_glyph.copy(),
        "ì": basic_glyph.copy(),
        "j": basic_glyph.copy(),
        "k": basic_glyph.copy(),
        "l": basic_glyph.copy(),
        "m": basic_glyph.copy(),
        "ḿ": basic_glyph.copy(),
        "n": basic_glyph.copy(),
        "ń": basic_glyph.copy(),
        "ň": basic_glyph.copy(),
        "ǹ": basic_glyph.copy(),
        "o": basic_glyph.copy(),
        "ō": basic_glyph.copy(),
        "ó": basic_glyph.copy(),
        "ǒ": basic_glyph.copy(),
        "ò": basic_glyph.copy(),
        "p": basic_glyph.copy(),
        "q": basic_glyph.copy(),
        "r": basic_glyph.copy(),
        "s": basic_glyph.copy(),
        "t": basic_glyph.copy(),
        "u": basic_glyph.copy(),
        "ū": basic_glyph.copy(),
        "ú": basic_glyph.copy(),
        "ǔ": basic_glyph.copy(),
        "ù": basic_glyph.copy(),
        "ü": basic_glyph.copy(),
        "ǖ": basic_glyph.copy(),
        "ǘ": basic_glyph.copy(),
        "ǚ": basic_glyph.copy(),
        "ǜ": basic_glyph.copy(),
        "v": basic_glyph.copy(),
        "w": basic_glyph.copy(),
        "x": basic_glyph.copy(),
        "y": basic_glyph.copy(),
    }
    if include_z:
        alphabet_data["z"] = basic_glyph.copy()

    path = tmp_path / "alphabet_for_pinyin.json"
    path.write_text(json.dumps(alphabet_data, ensure_ascii=False), encoding="utf-8")
    return path


class TestZGlyphInAlphabet:
    """Issue #16: py_alphabet_z がアルファベットグリフに含まれること。"""

    @pytest.mark.unit
    def test_z_glyph_is_loaded_from_alphabet_json(self, tmp_path):
        """alphabet JSON から z グリフが py_alphabet_z としてロードされる。"""
        alphabet_path = _make_alphabet_json(tmp_path)
        font_config = FontConfig.get_config(FontType.HAN_SERIF)
        generator = PinyinGlyphGenerator(FontType.HAN_SERIF, font_config)

        generator.load_alphabet_glyphs(alphabet_path)

        alphabets = generator.get_pinyin_alphabets()
        assert (
            "py_alphabet_z" in alphabets
        ), "py_alphabet_z が _pinyin_alphabets に存在しない (issue #16)"

    @pytest.mark.unit
    def test_z_glyph_has_contour_data(self, tmp_path):
        """py_alphabet_z グリフに contours が含まれること。"""
        alphabet_path = _make_alphabet_json(tmp_path)
        font_config = FontConfig.get_config(FontType.HAN_SERIF)
        generator = PinyinGlyphGenerator(FontType.HAN_SERIF, font_config)

        generator.load_alphabet_glyphs(alphabet_path)

        alphabets = generator.get_pinyin_alphabets()
        z_glyph = alphabets["py_alphabet_z"]
        contours = z_glyph.get("contours", [])
        assert len(contours) > 0, "py_alphabet_z の contours が空 (issue #16)"

    @pytest.mark.unit
    def test_all_basic_alphabets_for_pinyin_are_loaded(self, tmp_path):
        """拼音に使う a-z のグリフが全てロードされること。"""
        alphabet_path = _make_alphabet_json(tmp_path)
        font_config = FontConfig.get_config(FontType.HAN_SERIF)
        generator = PinyinGlyphGenerator(FontType.HAN_SERIF, font_config)

        generator.load_alphabet_glyphs(alphabet_path)

        alphabets = generator.get_pinyin_alphabets()
        # 拼音に使う子音・半母音（a, e, i, o, u, v は声調バリアントでテスト済み）
        consonants = [
            "b",
            "c",
            "d",
            "f",
            "g",
            "h",
            "j",
            "k",
            "l",
            "m",
            "n",
            "p",
            "q",
            "r",
            "s",
            "t",
            "w",
            "x",
            "y",
            "z",
        ]
        required = ["py_alphabet_" + c for c in consonants]
        for name in required:
            assert name in alphabets, f"{name} がロードされていない"


class TestZGlyphInPronunciation:
    """Issue #16: z を含む発音グリフが py_alphabet_z を参照すること。"""

    def _make_generator(self, tmp_path: Path) -> PinyinGlyphGenerator:
        alphabet_path = _make_alphabet_json(tmp_path)
        font_config = FontConfig.get_config(FontType.HAN_SERIF)
        generator = PinyinGlyphGenerator(FontType.HAN_SERIF, font_config)
        generator.load_alphabet_glyphs(alphabet_path)
        return generator

    @pytest.mark.unit
    def test_z_pronunciation_references_py_alphabet_z(self, tmp_path):
        """z を含む発音グリフの references に py_alphabet_z が存在する。"""
        generator = self._make_generator(tmp_path)

        # z を含む拼音のサンプル
        z_pronunciations = {"zī", "zā", "zhōng", "zài", "zuò"}

        generator.generate_pronunciation_glyphs(
            hanzi_advance_width=1000.0,
            hanzi_advance_height=1000.0,
            pinyin_canvas_width=850.0,
            pinyin_canvas_height=283.0,
            pinyin_canvas_base_line=935.0,
            all_pronunciations=z_pronunciations,
        )

        pronunciation_glyphs = generator.get_pronunciation_glyphs()

        for pronunciation in z_pronunciations:
            from refactored.utils.pinyin_utils import simplification_pronunciation

            simplified = simplification_pronunciation(pronunciation)
            assert (
                simplified in pronunciation_glyphs
            ), f"発音グリフ '{simplified}' ({pronunciation}) が生成されていない"
            refs = pronunciation_glyphs[simplified].get("references", [])
            glyph_names = [r.get("glyph", "") for r in refs]
            assert (
                "py_alphabet_z" in glyph_names
            ), f"'{pronunciation}' の references に py_alphabet_z が含まれない (issue #16)"

    @pytest.mark.unit
    def test_z_glyph_a_d_scale_differs_to_prevent_disappearance(self, tmp_path):
        """py_alphabet_z 参照の a と d (x/y スケール) が異なること。

        otfccbuild で a == d のとき グリフが消失するため (DELTA_4_REFLECTION)。
        """
        generator = self._make_generator(tmp_path)

        generator.generate_pronunciation_glyphs(
            hanzi_advance_width=1000.0,
            hanzi_advance_height=1000.0,
            pinyin_canvas_width=850.0,
            pinyin_canvas_height=283.0,
            pinyin_canvas_base_line=935.0,
            all_pronunciations={"zī"},
        )

        pronunciation_glyphs = generator.get_pronunciation_glyphs()
        refs = pronunciation_glyphs["zi1"].get("references", [])
        z_ref = next((r for r in refs if r.get("glyph") == "py_alphabet_z"), None)

        assert z_ref is not None, "zi1 に py_alphabet_z 参照が見つからない"
        assert z_ref["a"] != z_ref["d"], (
            f"py_alphabet_z 参照の a={z_ref['a']} と d={z_ref['d']} が同値: "
            "グリフが消失する可能性がある (DELTA_4_REFLECTION)"
        )
