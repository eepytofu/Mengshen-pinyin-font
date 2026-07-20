# -*- coding: utf-8 -*-
"""Glyph-name collisions in the pinyin alphabet.

Glyph names use "v" for the ü family (v/v1..v4 = ü/ǖ/ǘ/ǚ/ǜ). Any second
character mapping onto one of those names silently overwrites it, which is how
略 lüè once rendered as "lvè".
"""

from __future__ import annotations

from src.refactored.scripts.retrieve_latin_alphabet import ALPHABET
from src.refactored.utils.pinyin_utils import (
    PINYIN_TONE_TO_NUMERIC,
    simplification_pronunciation,
)


class TestAlphabetGlyphNames:
    """The extracted alphabet must map one-to-one onto glyph names."""

    def test_no_two_characters_share_a_glyph_name(self):
        seen: dict = {}
        for char in ALPHABET:
            name = simplification_pronunciation(char)
            assert name not in seen, (
                f"{char!r} and {seen[name]!r} both map to glyph name {name!r}; "
                "one would silently overwrite the other"
            )
            seen[name] = char

    def test_umlaut_u_owns_the_v_glyph_name(self):
        """ü must keep py_alphabet_v, otherwise lüè renders as lvè."""
        assert PINYIN_TONE_TO_NUMERIC["ü"] == "v"
        assert "ü" in ALPHABET

    def test_latin_v_is_not_extracted(self):
        """Pinyin never uses a literal v, and including it caused the clash."""
        assert "v" not in ALPHABET

    def test_toned_umlauts_are_present(self):
        for char in ("ǖ", "ǘ", "ǚ", "ǜ"):
            assert char in ALPHABET

    def test_every_reading_character_can_be_resolved(self):
        """Characters used by real readings must all have a glyph name."""
        for char in ALPHABET:
            assert simplification_pronunciation(char) != "", char
