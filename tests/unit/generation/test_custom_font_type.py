# -*- coding: utf-8 -*-
"""Tests for FontType.CUSTOM against the fork's weight handling.

FontType.CUSTOM comes from the webapp, which supplies its own FontMetadata and
name table and builds from an arbitrary uploaded font. The fork adds per-weight
name tables and OS/2 stamping for the built-in styles. These tests hold the
line between the two: a custom font must build, and it must keep the weight of
the font it came from.
"""

from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from refactored.config import FontType, ProjectPaths
from refactored.config.font_config import FontMetadata, HanziCanvas, PinyinCanvas
from refactored.config.font_weights import FontWeight
from refactored.data import CharacterDataManager, MappingDataManager, PinyinDataManager
from refactored.generation.font_assembler import FontAssembler
from refactored.generation.font_builder import ExternalToolInterface, FontBuilder

CUSTOM_CONFIG = FontMetadata(
    pinyin_canvas=PinyinCanvas(
        width=800.0, height=300.0, base_line=880.0, tracking=5.0
    ),
    hanzi_canvas=HanziCanvas(width=1000.0, height=1000.0),
    is_avoid_overlapping_mode=False,
    x_scale_reduction_for_avoid_overlapping=0.1,
)

CUSTOM_NAME_TABLE = [
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 1,
        "nameString": "Custom Family",
    }
]


def _font_data_with_weight(weight_class: int) -> dict:
    """Minimal font data carrying the weight fields the assembler touches."""
    return {
        "head": {"fontRevision": 1.0, "macStyle": {"bold": True}},
        "OS_2": {"usWeightClass": weight_class, "fsSelection": {"bold": True}},
    }


class TestCustomFontTypeBuild:
    """A webapp-defined font must build without the weight presets."""

    @pytest.mark.unit
    def test_font_builder_accepts_custom_font_type(self):
        """FontBuilder must not validate weights for FontType.CUSTOM.

        CUSTOM has no entry in SUPPORTED_WEIGHTS, so a plain lookup raises
        KeyError and every webapp build fails before it starts.
        """
        with patch(
            "refactored.tables.cmap_manager.CmapTableManager.from_path"
        ) as mock_cmap_from_path:
            mock_cmap_manager = Mock()
            mock_cmap_manager.get_cmap_table.return_value = {"20013": "cid00001"}
            mock_cmap_from_path.return_value = mock_cmap_manager

            builder = FontBuilder(
                font_type=FontType.CUSTOM,
                template_main_path=Path("/mock/template_main.json"),
                template_glyf_path=Path("/mock/template_glyf.json"),
                alphabet_pinyin_path=Path("/mock/alphabet.json"),
                pattern_one_path=Path("/mock/pattern_one.txt"),
                pattern_two_path=Path("/mock/pattern_two.json"),
                exception_pattern_path=Path("/mock/exception.json"),
                pinyin_manager=Mock(spec=PinyinDataManager),
                character_manager=Mock(spec=CharacterDataManager),
                mapping_manager=Mock(spec=MappingDataManager),
                external_tool=Mock(spec=ExternalToolInterface),
                paths=Mock(spec=ProjectPaths),
                font_config=CUSTOM_CONFIG,
                name_table=CUSTOM_NAME_TABLE,
            )

        assert builder.font_config is CUSTOM_CONFIG
        assert builder.name_table is CUSTOM_NAME_TABLE


class TestInjectedNameTableKeepsSourceWeight:
    """An injected name table means the caller owns the weight fields."""

    @pytest.mark.unit
    def test_injected_name_table_does_not_stamp_weight(self):
        """The uploaded font's weight must survive.

        set_weight_attributes() writes the fork's own weight, which defaults to
        Regular. Applying it to a custom font would relabel a Bold upload as
        Regular (usWeightClass 700 -> 400) and clear the bold flags.
        """
        assembler = FontAssembler(
            font_config=CUSTOM_CONFIG, paths=Mock(spec=ProjectPaths)
        )
        font_data = _font_data_with_weight(700)

        assembler.set_font_metadata(
            font_data, FontType.CUSTOM, name_table=CUSTOM_NAME_TABLE
        )

        assert font_data["name"] is CUSTOM_NAME_TABLE
        assert font_data["OS_2"]["usWeightClass"] == 700
        assert font_data["OS_2"]["fsSelection"].get("bold") is True
        assert font_data["head"]["macStyle"].get("bold") is True

    @pytest.mark.unit
    def test_builder_copyright_step_keeps_injected_weight(self):
        """FontBuilder._set_copyright() must follow the same rule."""
        with patch(
            "refactored.tables.cmap_manager.CmapTableManager.from_path"
        ) as mock_cmap_from_path:
            mock_cmap_manager = Mock()
            mock_cmap_manager.get_cmap_table.return_value = {"20013": "cid00001"}
            mock_cmap_from_path.return_value = mock_cmap_manager

            builder = FontBuilder(
                font_type=FontType.CUSTOM,
                template_main_path=Path("/mock/template_main.json"),
                template_glyf_path=Path("/mock/template_glyf.json"),
                alphabet_pinyin_path=Path("/mock/alphabet.json"),
                pattern_one_path=Path("/mock/pattern_one.txt"),
                pattern_two_path=Path("/mock/pattern_two.json"),
                exception_pattern_path=Path("/mock/exception.json"),
                pinyin_manager=Mock(spec=PinyinDataManager),
                character_manager=Mock(spec=CharacterDataManager),
                mapping_manager=Mock(spec=MappingDataManager),
                external_tool=Mock(spec=ExternalToolInterface),
                paths=Mock(spec=ProjectPaths),
                font_config=CUSTOM_CONFIG,
                name_table=CUSTOM_NAME_TABLE,
            )

        builder._font_data = _font_data_with_weight(700)
        builder._set_copyright()

        assert builder._font_data["name"] is CUSTOM_NAME_TABLE
        assert builder._font_data["OS_2"]["usWeightClass"] == 700

    @pytest.mark.unit
    def test_preset_path_still_stamps_the_requested_weight(self):
        """Regression guard: the built-in styles keep per-weight stamping."""
        assembler = FontAssembler(
            font_config=CUSTOM_CONFIG,
            paths=Mock(spec=ProjectPaths),
            weight=FontWeight.BOLD,
        )
        font_data = _font_data_with_weight(400)

        assembler.set_font_metadata(font_data, FontType.HAN_SERIF)

        assert font_data["OS_2"]["usWeightClass"] == FontWeight.BOLD.weight_class
        assert font_data["OS_2"]["fsSelection"].get("bold") is True
        assert "regular" not in font_data["OS_2"]["fsSelection"]
