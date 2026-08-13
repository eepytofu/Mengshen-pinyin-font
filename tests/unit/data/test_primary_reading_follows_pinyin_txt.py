# -*- coding: utf-8 -*-
"""The drawn reading must be the mainland standard one.

pinyin.txt leads with the Unihan kMandarin reading, which is the mainland
standard. overwrite.txt is applied after it and replaces the whole line, and it
demoted the standard reading for thousands of characters. 来 was drawn as lài,
达 as tà, 离 as chī.

The override still owns which readings exist, because it supplies the
alternates the IVS and stylistic sets need. It no longer owns which one comes
first. Where pinyin.txt has an opinion about the primary reading, and the
override still carries that reading somewhere in its list, the primary reading
wins.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import pytest

TONE_MARKS = "̄́̌̀"  # macron, acute, caron, grave


def has_tone_mark(syllable: str) -> bool:
    return any(ch in TONE_MARKS for ch in unicodedata.normalize("NFD", syllable))


REPO_ROOT = Path(__file__).resolve().parents[3]
PINYIN_TXT = REPO_ROOT / "res" / "pinyin-data" / "pinyin.txt"
MERGED = REPO_ROOT / "outputs" / "merged-mapping-table.txt"

# One per fault class found in the sweep. Every one of these was drawn wrong.
KNOWN_VICTIMS = {
    "来": "lái",
    "达": "dá",
    "虽": "suī",
    "离": "lí",
    "邓": "dèng",
    "币": "bì",
    "写": "xiě",
    "敌": "dí",
    "触": "chù",
    "陕": "shǎn",
}

# pinyin.txt leads with a neutral tone for these, which belongs to a compound,
# not to the character on its own. The override was right and must be kept.
NEUTRAL_TONE_GUARDS = {
    "子": "zǐ",  # zi belongs to 儿子
    "卜": "bǔ",  # bo belongs to 萝卜
    "匙": "chí",  # shi belongs to 钥匙
    "呀": "yā",  # Wiktionary lists yā first, ya is a separate etymology
}

# Grammatical particles invert the rule above: the neutral tone is the citation
# reading and the toned one is rare. Checked against Wiktionary.
PARTICLES = {
    "么": "me",  # 什么. yāo is a rare variant of 幺
    "嘛": "ma",  # discourse particle. má is dialectal
}


def _load(path: Path) -> dict[str, list[str]]:
    table: dict[str, list[str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^U\+([0-9A-F]+):\s*([^#]+)", line)
        if not match:
            continue
        char = chr(int(match.group(1), 16))
        readings = [r for r in match.group(2).strip().split(",") if r]
        if readings:
            table[char] = readings
    return table


@pytest.fixture(scope="module")
def tables() -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    assert PINYIN_TXT.exists(), f"submodule not checked out: {PINYIN_TXT}"
    assert MERGED.exists(), f"run make_unicode_pinyin_map_table.py first: {MERGED}"
    return _load(PINYIN_TXT), _load(MERGED)


@pytest.mark.unit
@pytest.mark.parametrize("hanzi,expected", sorted(KNOWN_VICTIMS.items()))
def test_common_character_keeps_its_standard_reading(tables, hanzi, expected):
    _, merged = tables
    assert merged[hanzi][0] == expected, (
        f"{hanzi} would be drawn as {merged[hanzi][0]!r}, not {expected!r}. "
        f"Full list: {merged[hanzi]}"
    )


@pytest.mark.unit
@pytest.mark.parametrize("hanzi,expected", sorted(NEUTRAL_TONE_GUARDS.items()))
def test_neutral_tone_never_leads(tables, hanzi, expected):
    """A 轻声 reading must not become the drawn one."""
    _, merged = tables
    assert merged[hanzi][0] == expected, (
        f"{hanzi} would be drawn as {merged[hanzi][0]!r}, a neutral tone that "
        f"only occurs inside a compound. Expected {expected!r}."
    )


@pytest.mark.unit
@pytest.mark.parametrize("hanzi,expected", sorted(PARTICLES.items()))
def test_particle_keeps_its_neutral_tone(tables, hanzi, expected):
    """For a particle the neutral tone is the reading, not a compound artefact."""
    _, merged = tables
    assert merged[hanzi][0] == expected, (
        f"{hanzi} would be drawn as {merged[hanzi][0]!r}, but as a particle it "
        f"reads {expected!r}."
    )


@pytest.mark.unit
def test_no_character_demotes_its_standard_reading(tables):
    """Sweep the whole table, not just the characters someone happened to check.

    A character is only judged when pinyin.txt knows it and the override kept
    the standard reading in its list. A neutral-tone candidate is skipped, for
    the reason given on NEUTRAL_TONE_GUARDS. Anything else is a deliberate
    editorial choice and is left alone.
    """
    pinyin, merged = tables

    violations = []
    for char, merged_readings in merged.items():
        standard = pinyin.get(char)
        if not standard:
            continue
        if standard[0] not in merged_readings:
            continue
        if (
            not has_tone_mark(standard[0])
            and has_tone_mark(merged_readings[0])
            and char not in PARTICLES
        ):
            continue
        if merged_readings[0] != standard[0]:
            violations.append((char, merged_readings[0], standard[0]))

    sample = ", ".join(
        f"{c} drawn {got!r} want {want!r}" for c, got, want in violations[:15]
    )
    assert (
        not violations
    ), f"{len(violations)} characters are drawn with a demoted reading. {sample}"
