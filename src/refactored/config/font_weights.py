# -*- coding: utf-8 -*-
"""Font weight definitions for multi-weight generation.

The pipeline itself is weight-agnostic: it copies OS/2 and head straight from
the source font and only replaces the name table. This module supplies the
per-weight source files and metadata so a full family can be generated instead
of Regular alone.

拼音部分は漢字より一段階太いウェイトを使う。
The pinyin is rendered at roughly a quarter of the hanzi height, so a same-weight
Latin face looks anemic above it. Upstream already paired SourceHanSerif-Regular
with mplus-1m-*medium* for that reason; the alphabet_font entries below keep that
one-step offset across the range.

The offset saturates at the top: M+ 1m, the monospaced family this font uses,
ships thin/light/regular/medium/bold only. Heavy and black exist for the
proportional M+ families (1p, 1c) but not for 1m. So SemiBold and above all take
mplus-1m-bold, which means the pinyin above a Heavy hanzi is relatively lighter
than it is above a Regular one. Switching those weights to a proportional M+ cut
would fix the weight but break the letterform consistency of the family, so the
cap is deliberate.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List


@dataclass(frozen=True)
class WeightMetadata:
    """Metadata describing a single font weight."""

    key: str  # CLI value, e.g. "semibold"
    style_name: str  # Typographic style name, e.g. "SemiBold"
    weight_class: int  # OS/2 usWeightClass
    source_han_suffix: str  # Source Han Serif file suffix
    alphabet_font: str  # M+ 1m file used for the pinyin


class FontWeight(Enum):
    """Supported weights, mirroring Source Han Serif's seven weights."""

    EXTRALIGHT = WeightMetadata(
        "extralight", "ExtraLight", 200, "ExtraLight", "mplus-1m-light.ttf"
    )
    LIGHT = WeightMetadata("light", "Light", 300, "Light", "mplus-1m-regular.ttf")
    REGULAR = WeightMetadata(
        "regular", "Regular", 400, "Regular", "mplus-1m-medium.ttf"
    )
    MEDIUM = WeightMetadata("medium", "Medium", 500, "Medium", "mplus-1m-bold.ttf")
    SEMIBOLD = WeightMetadata(
        "semibold", "SemiBold", 600, "SemiBold", "mplus-1m-bold.ttf"
    )
    BOLD = WeightMetadata("bold", "Bold", 700, "Bold", "mplus-1m-bold.ttf")
    HEAVY = WeightMetadata("heavy", "Heavy", 900, "Heavy", "mplus-1m-bold.ttf")

    @property
    def key(self) -> str:
        """CLI/filename key for this weight."""
        return self.value.key

    @property
    def style_name(self) -> str:
        """Typographic style name for the name table."""
        return self.value.style_name

    @property
    def weight_class(self) -> int:
        """OS/2 usWeightClass value."""
        return self.value.weight_class

    @property
    def is_bold(self) -> bool:
        """Whether the bold bits in OS/2.fsSelection and head.macStyle apply."""
        return self is FontWeight.BOLD

    @property
    def is_ribbi(self) -> bool:
        """Whether this weight fits the four-style RIBBI naming model.

        Regular and Bold can share a family name and be style-linked by the OS.
        Everything else needs its own family name plus nameID 16/17.
        """
        return self in (FontWeight.REGULAR, FontWeight.BOLD)

    @classmethod
    def from_key(cls, key: str) -> "FontWeight":
        """Look up a weight by its CLI key."""
        for weight in cls:
            if weight.key == key:
                return weight
        raise ValueError(f"Unknown weight: {key}. Choose from: {', '.join(cls.keys())}")

    @classmethod
    def keys(cls) -> List[str]:
        """All CLI keys, lightest first."""
        return [weight.key for weight in cls]


# Weights available per style. Xiaolai and SetoFont ship a single weight only,
# so the handwritten style stays Regular-only.
SUPPORTED_WEIGHTS: Dict[str, List[FontWeight]] = {
    "han_serif": list(FontWeight),
    "handwritten": [FontWeight.REGULAR],
}


# 太いウェイトでも拼音の重なり回避は不要。M+ 1m は等幅なので字送りが変わらない。
#
# Overlap avoidance (`is_avoid_overlapping_mode`) stays off for every han_serif
# weight, matching upstream. It looks like heavier weights ought to need it, but
# they do not: M+ 1m is *monospaced*, so bold letterforms carry exactly the same
# advance width as medium ones and the pinyin never crowds horizontally as the
# weight increases.
#
# Turning it on actively hurts. At six letters the mode widens the pinyin canvas
# from 850 to the full 1000-unit hanzi advance (see GlyphManager), which pushes
# adjacent syllables together until the word boundaries disappear -- rendering
# 双床装 as "shuāngchuángzhuāng" instead of "shuāng chuáng zhuāng". Verified by
# building Heavy both ways and comparing the output.
#
# The handwritten style keeps it enabled, since SetoFont SP is proportional and
# genuinely does overlap.
def needs_overlap_avoidance(weight: FontWeight) -> bool:
    """Whether pinyin overlap avoidance should be enabled for this weight.

    Always False: see the note above on M+ 1m being monospaced. Kept as a
    function so a future proportional pinyin font can reintroduce the rule.
    """
    del weight  # currently weight-independent
    return False
