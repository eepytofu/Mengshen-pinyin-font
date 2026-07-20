# -*- coding: utf-8 -*-
"""Tests for multi-weight font generation support."""

from __future__ import annotations

import pytest

from src.refactored.config import (
    HAN_SERIF,
    HANDWRITTEN,
    FontConfig,
    FontType,
    FontWeight,
    build_name_table,
)
from src.refactored.config.font_weights import (
    SUPPORTED_WEIGHTS,
    needs_overlap_avoidance,
)


class TestFontWeight:
    """Weight enum behaviour."""

    def test_all_weights_have_unique_keys(self):
        keys = FontWeight.keys()
        assert len(keys) == len(set(keys))

    def test_weight_classes_are_ascending(self):
        classes = [w.weight_class for w in FontWeight]
        assert classes == sorted(classes)

    def test_from_key_round_trip(self):
        for weight in FontWeight:
            assert FontWeight.from_key(weight.key) is weight

    def test_from_key_rejects_unknown(self):
        with pytest.raises(ValueError, match="Unknown weight"):
            FontWeight.from_key("ultrablack")

    def test_only_bold_sets_bold_bits(self):
        bold = [w for w in FontWeight if w.is_bold]
        assert bold == [FontWeight.BOLD]

    def test_ribbi_weights(self):
        ribbi = [w for w in FontWeight if w.is_ribbi]
        assert set(ribbi) == {FontWeight.REGULAR, FontWeight.BOLD}


class TestWeightSourceFonts:
    """Source font selection per weight."""

    def test_regular_paths_unchanged(self):
        """The default build must still use the files it always used."""
        assert (
            FontConfig.get_font_path(FontType.HAN_SERIF).name
            == "SourceHanSerifCN-Regular.ttf"
        )
        assert (
            FontConfig.get_alphabet_font_path(FontType.HAN_SERIF).name
            == "mplus-1m-medium.ttf"
        )

    def test_each_weight_maps_to_its_own_source(self):
        names = {
            FontConfig.get_font_path(FontType.HAN_SERIF, w).name for w in FontWeight
        }
        assert len(names) == len(list(FontWeight))

    # M+ 1m is monospaced and ships these five cuts only; heavy/black exist for
    # the proportional M+ families but not for 1m.
    MPLUS_1M_WEIGHTS = {
        "mplus-1m-thin.ttf": 100,
        "mplus-1m-light.ttf": 300,
        "mplus-1m-regular.ttf": 400,
        "mplus-1m-medium.ttf": 500,
        "mplus-1m-bold.ttf": 700,
    }

    def test_pinyin_font_actually_exists_upstream(self):
        """Guard against pairing a weight with an M+ cut that is not published."""
        for weight in FontWeight:
            alphabet = FontConfig.get_alphabet_font_path(FontType.HAN_SERIF, weight)
            assert (
                alphabet.name in self.MPLUS_1M_WEIGHTS
            ), f"{weight.key} refers to {alphabet.name}, which M+ 1m does not ship"

    def test_pinyin_is_never_lighter_than_hanzi(self):
        """拼音は漢字より軽くしない。

        The pinyin renders small, so it uses a Latin cut at least as heavy as
        the hanzi it sits above -- until M+ 1m runs out of weights at bold.
        """
        for weight in FontWeight:
            alphabet = FontConfig.get_alphabet_font_path(FontType.HAN_SERIF, weight)
            pinyin_class = self.MPLUS_1M_WEIGHTS[alphabet.name]
            heaviest = max(self.MPLUS_1M_WEIGHTS.values())
            expected = min(weight.weight_class, heaviest)
            assert (
                pinyin_class >= expected
            ), f"{weight.key} pairs with a lighter pinyin face"

    def test_heaviest_weights_saturate_at_mplus_bold(self):
        """Above bold there is nothing heavier to pair with, so it caps."""
        for weight in (FontWeight.SEMIBOLD, FontWeight.BOLD, FontWeight.HEAVY):
            alphabet = FontConfig.get_alphabet_font_path(FontType.HAN_SERIF, weight)
            assert alphabet.name == "mplus-1m-bold.ttf"

    def test_handwritten_supports_regular_only(self):
        assert SUPPORTED_WEIGHTS["handwritten"] == [FontWeight.REGULAR]

    def test_handwritten_rejects_other_weights(self):
        with pytest.raises(ValueError, match="not available for handwritten"):
            FontConfig.get_font_path(FontType.HANDWRITTEN, FontWeight.LIGHT)


class TestVariantKeys:
    """Intermediate file naming."""

    def test_regular_keeps_bare_style_key(self):
        assert FontConfig.get_variant_key(FontType.HAN_SERIF) == "han_serif"

    def test_other_weights_are_suffixed(self):
        assert (
            FontConfig.get_variant_key(FontType.HAN_SERIF, FontWeight.BOLD)
            == "han_serif_bold"
        )

    def test_variant_keys_are_unique(self):
        keys = {FontConfig.get_variant_key(FontType.HAN_SERIF, w) for w in FontWeight}
        assert len(keys) == len(list(FontWeight))


class TestOverlapAvoidance:
    """Pinyin overlap handling does not vary with weight.

    M+ 1m is monospaced, so heavier cuts keep the same advance width and never
    crowd. Enabling avoidance widens the canvas to 1000 units at six letters,
    which runs adjacent syllables together -- confirmed by building Heavy both
    ways.
    """

    def test_no_han_serif_weight_enables_avoidance(self):
        for weight in FontWeight:
            config = FontConfig.get_config(FontType.HAN_SERIF, weight)
            assert (
                config.is_avoid_overlapping_mode is False
            ), f"{weight.key} would run 6-letter pinyin syllables together"

    def test_needs_overlap_avoidance_is_weight_independent(self):
        assert not any(needs_overlap_avoidance(w) for w in FontWeight)

    def test_handwritten_avoidance_untouched(self):
        """SetoFont SP is proportional and does genuinely overlap."""
        config = FontConfig.get_config(FontType.HANDWRITTEN, FontWeight.REGULAR)
        assert config.is_avoid_overlapping_mode is True


class TestNameTableDerivation:
    """Name table generation per weight."""

    @staticmethod
    def _lookup(table, name_id, platform_id=3, language_id=1033):
        for entry in table:
            if (
                entry["nameID"] == name_id
                and entry["platformID"] == platform_id
                and entry["languageID"] == language_id
            ):
                return entry["nameString"]
        return None

    def test_regular_changes_only_the_windows_family_name(self):
        """Regular is left alone except for the documented style-linking fix."""
        for style_key, shipped in (
            ("HAN_SERIF", HAN_SERIF),
            ("HANDWRITTEN", HANDWRITTEN),
        ):
            built = build_name_table(style_key, FontWeight.REGULAR)
            assert len(built) == len(shipped)
            differences = [
                (before["nameID"], before["nameString"], after["nameString"])
                for before, after in zip(shipped, built)
                if before["nameString"] != after["nameString"]
            ]
            assert all(name_id == 1 for name_id, _, _ in differences), differences

    def test_regular_and_bold_share_a_family_name(self):
        """Windows only style-links the two when nameID 1 matches exactly."""
        regular = build_name_table("HAN_SERIF", FontWeight.REGULAR)
        bold = build_name_table("HAN_SERIF", FontWeight.BOLD)
        assert self._lookup(regular, 1) == self._lookup(bold, 1) == "Mengshen-HanSerif"
        # ...and on Macintosh, which was already consistent upstream.
        assert (
            self._lookup(regular, 1, 1, 0)
            == self._lookup(bold, 1, 1, 0)
            == "Mengshen-HanSerif"
        )

    def test_regular_and_bold_are_distinguishable(self):
        """Same family, different subfamily and PostScript name."""
        regular = build_name_table("HAN_SERIF", FontWeight.REGULAR)
        bold = build_name_table("HAN_SERIF", FontWeight.BOLD)
        assert self._lookup(regular, 2) != self._lookup(bold, 2)
        assert self._lookup(regular, 6) != self._lookup(bold, 6)

    def test_bold_style_links_to_regular_family(self):
        table = build_name_table("HAN_SERIF", FontWeight.BOLD)
        assert self._lookup(table, 1) == "Mengshen-HanSerif"
        assert self._lookup(table, 2) == "Bold"
        assert self._lookup(table, 4) == "Mengshen-HanSerif Bold"

    def test_non_ribbi_weight_gets_own_family(self):
        table = build_name_table("HAN_SERIF", FontWeight.LIGHT)
        assert self._lookup(table, 1) == "Mengshen-HanSerif Light"
        assert self._lookup(table, 2) == "Regular"

    def test_non_ribbi_weight_declares_typographic_family(self):
        table = build_name_table("HAN_SERIF", FontWeight.SEMIBOLD)
        assert self._lookup(table, 16) == "Mengshen-HanSerif"
        assert self._lookup(table, 17) == "SemiBold"

    def test_ribbi_weights_omit_typographic_names(self):
        """nameID 16/17 are only meaningful when 1/2 cannot express the style."""
        for weight in (FontWeight.REGULAR, FontWeight.BOLD):
            table = build_name_table("HAN_SERIF", weight)
            assert self._lookup(table, 16) is None
            assert self._lookup(table, 17) is None

    def test_postscript_names_are_unique_per_weight(self):
        names = {self._lookup(build_name_table("HAN_SERIF", w), 6) for w in FontWeight}
        assert len(names) == len(list(FontWeight))
        assert all(" " not in name for name in names)

    def test_localised_family_name_is_used(self):
        table = build_name_table("HAN_SERIF", FontWeight.BOLD)
        assert self._lookup(table, 1, 3, 1041) == "萌神 明朝体 CN"
        assert self._lookup(table, 4, 3, 1041) == "萌神 明朝体 CN Bold"

    def test_copyright_and_licence_survive_derivation(self):
        regular = build_name_table("HAN_SERIF", FontWeight.REGULAR)
        bold = build_name_table("HAN_SERIF", FontWeight.BOLD)
        for name_id in (0, 7, 8, 11, 13, 14):
            assert self._lookup(bold, name_id) == self._lookup(regular, name_id)
