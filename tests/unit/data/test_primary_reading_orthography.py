# -*- coding: utf-8 -*-
"""The first reading in the mapping table is the one the font draws.

FontConstants.NORMAL_PRONUNCIATION is 0, so index 0 becomes the pinyin above
the character. Every other reading is only reachable through a stylistic set
or an IVS sequence. A reader who never presses anything sees index 0, so index
0 must be the standard modern Mandarin reading.

The readings below were checked against Wiktionary. Several of them are Taiwan
variants that sat in front of the mainland standard, and one (bì for 虑) is not
listed as a Mandarin reading at all.
"""

import pytest

from refactored.data import PinyinDataManager

# character -> the reading a reader must see by default
EXPECTED_PRIMARY = {
    "虑": "lǜ",  # 考虑 kǎolǜ. bì is not a listed Mandarin reading
    "慮": "lǜ",
    "孪": "luán",  # 孪生 luánshēng. lüán is a Taiwan variant
    "孿": "luán",
    "挛": "luán",  # 痉挛 jìngluán
    "攣": "luán",
    "脔": "luán",  # lüǎn is a Taiwan variant
    "臠": "luán",
    "谑": "xuè",  # 戏谑 xìxuè. nüè is a Taiwan variant
    "謔": "xuè",
}

# simplified, traditional. The pair is one word, so it must read the same way.
VARIANT_PAIRS = [
    ("虑", "慮"),
    ("孪", "孿"),
    ("挛", "攣"),
    ("脔", "臠"),
    ("谑", "謔"),
]


@pytest.fixture(scope="module")
def pinyin_manager():
    return PinyinDataManager()


@pytest.mark.unit
@pytest.mark.parametrize("hanzi,expected", sorted(EXPECTED_PRIMARY.items()))
def test_primary_reading_is_the_standard_one(pinyin_manager, hanzi, expected):
    readings = pinyin_manager.get_pinyin(hanzi)
    assert readings, f"{hanzi} has no readings at all"
    assert readings[0] == expected, (
        f"{hanzi} would show {readings[0]!r} above the character, "
        f"but the standard modern Mandarin reading is {expected!r}. "
        f"Full list: {readings}"
    )


@pytest.mark.unit
@pytest.mark.parametrize("simplified,traditional", VARIANT_PAIRS)
def test_variant_pair_agrees_on_the_primary_reading(
    pinyin_manager, simplified, traditional
):
    simplified_readings = pinyin_manager.get_pinyin(simplified)
    traditional_readings = pinyin_manager.get_pinyin(traditional)
    assert simplified_readings and traditional_readings
    assert simplified_readings[0] == traditional_readings[0], (
        f"{simplified} shows {simplified_readings[0]!r} but {traditional} shows "
        f"{traditional_readings[0]!r}. The same word must read the same way."
    )
