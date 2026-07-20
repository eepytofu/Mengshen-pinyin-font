# -*- coding: utf-8 -*-
# !/usr/bin/env python
# pylint: disable=line-too-long

"""
Font name table definitions migrated from legacy src/legacy/name_table.py

This module contains all font name table definitions with complete preservation
of original comments, copyright information, and Japanese documentation.
Migrated to work independently in the refactored architecture.
"""

from __future__ import annotations

from typing import Dict, List, TypedDict, Union

from ..utils.version_utils import get_project_version, parse_version_to_float
from .font_weights import FontWeight

# from .font_config import FontType

VERSION = parse_version_to_float(get_project_version())


class FontNameEntry(TypedDict):
    """Typed dictionary for font name table entries."""

    platformID: int
    encodingID: int
    languageID: int
    nameID: int
    nameString: str


# Font name table constants reference:
#
# platformID:
#   0: Unicode
#   1: Macintosh
#   2: ISO
#   3: Microsoft
#   4: カスタム
#
# encodingID:
#   0: シンボル
#   1: Unicode BMP面のみ
#
# nameID:
#   0:  著作権注釈
#   1:  フォントファミリ名
#   2:  フォントサブファミリ名
#   3:  フォント識別子
#   4:  完全なフォント名
#   5:  バージョン文字列
#   6:  PostScript名
#   7:  商標
#   8:  製造社名
#   9:  デザイナーの名前
#   10: 説明
#   11: ベンダーの URL
#   12: デザイナーの URL
#   13: ライセンス説明
#   14: ライセンス情報の URL

HAN_SERIF: List[FontNameEntry] = [
    # Macintosh
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 0,
        # 著作権注釈
        "nameString": "Copyright © 2017 Adobe Systems Incorporated (http://www.adobe.com/), with Reserved Font Name 'Source'.\n[萌神PROJECT] Copyright(c) 2020 mengshen project",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 1,
        # フォントファミリ名
        "nameString": "Mengshen-HanSerif",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 2,
        # フォントサブファミリ名
        "nameString": "Regular",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 3,
        # フォント識別子
        "nameString": f"{VERSION};MENGSHEN;Mengshen-HanSerif",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 4,
        # 完全なフォント名
        "nameString": "Mengshen-HanSerif",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 5,
        # バージョン文字列
        "nameString": f"Version {VERSION}",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 6,
        # PostScript名
        "nameString": "Mengshen-HanSerif-CN",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 7,
        # 商標
        "nameString": "Source is a trademark of Adobe Systems Incorporated in the United States and/or other countries.",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 8,
        # 製造社名
        "nameString": "Adobe Systems Incorporated",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 9,
        # デザイナーの名前
        "nameString": "[Source Han Sans]\nRyoko NISHIZUKA  (kana & ideographs); Frank Grießhammer (Latin, Greek & Cyrillic); Wenlong ZHANG  (bopomofo); Sandoll Communications , Soohyun PARK , Yejin WE  & Donghoon HAN  (hangul elements, letters & syllables)\n[mengshen project] Yuya Maruyama",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 10,
        # 説明
        "nameString": "Dr. Ken Lunde (project architect, glyph set definition & overall production); Masataka HATTORI  (production & ideograph elements)",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 11,
        # ベンダーの URL
        "nameString": "http://www.mengshen-project.com/",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 13,
        # ライセンス説明
        "nameString": 'This Font Software is licensed under the SIL Open Font License, Version 1.1. This Font Software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the SIL Open Font License for the specific language, permissions and limitations governing your use of this Font Software.',
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 14,
        # ライセンス情報の URL
        "nameString": "http://scripts.sil.org/OFL",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 0,
        # 著作権注釈
        "nameString": "Copyright © 2017 Adobe Systems Incorporated (http://www.adobe.com/), with Reserved Font Name 'Source'.\n[萌神PROJECT] Copyright(c) 2020 mengshen project",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 1,
        # フォントファミリ名
        "nameString": "Mengshen-Regular",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 2,
        # フォントサブファミリ名
        "nameString": "Regular",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 3,
        # フォント識別子
        "nameString": f"{VERSION};MENGSHEN;Mengshen-HanSerif",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 4,
        # 完全なフォント名
        "nameString": "Mengshen-HanSerif",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 5,
        # バージョン文字列
        "nameString": f"Version {VERSION}",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 6,
        # PostScript名
        "nameString": "Mengshen-HanSerif-CN",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 7,
        # 商標
        "nameString": "Source is a trademark of Adobe Systems Incorporated in the United States and/or other countries.",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 9,
        # デザイナーの名前
        "nameString": "[Source Han Sans]\nRyoko NISHIZUKA 西塚涼子 (kana & ideographs); Paul D. Hunt (Latin, Greek & Cyrillic); Wenlong ZHANG 张文龙 (bopomofo); Sandoll Communication 산돌커뮤니케이션, Soo-young JANG 장수영 & Joo-yeon KANG 강주연 (hangul elements, letters & syllables)\n[mengshen project] Yuya Maruyama 丸山裕也 (Tama)",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 10,
        # 説明
        "nameString": "Dr. Ken Lunde (project architect, glyph set definition & overall production); Masataka HATTORI 服部正貴 (production & ideograph elements)",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 11,
        # ベンダーの URL
        "nameString": "http://www.mengshen-project.com/",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 13,
        # ライセンス説明
        "nameString": 'This Font Software is licensed under the SIL Open Font License, Version 1.1. This Font Software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the SIL Open Font License for the specific language, permissions and limitations governing your use of this Font Software.',
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 14,
        # ライセンス情報の URL
        "nameString": "http://scripts.sil.org/OFL",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1041,
        "nameID": 1,
        "nameString": "萌神 明朝体 CN",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1041,
        "nameID": 4,
        "nameString": "萌神 明朝体 CN",
    },
]

HANDWRITTEN: List[FontNameEntry] = [
    # Macintosh
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 0,
        # 著作権注釈
        "nameString": "[萌神PROJECT] Copyright(c) 2020 mengshen project with Copyright © 2020 LXGW",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 1,
        # フォントファミリ名
        "nameString": "Mengshen-Handwritten",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 2,
        # フォントサブファミリ名
        "nameString": "Regular",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 3,
        # フォント識別子
        "nameString": f"{VERSION};MENGSHEN;Mengshen-Handwritten",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 4,
        # 完全なフォント名
        "nameString": "Mengshen-Handwritten",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 5,
        # バージョン文字列
        "nameString": f"Version {VERSION}",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 6,
        # PostScript名
        "nameString": "Mengshen-Handwritten-SC",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 7,
        # 商標
        "nameString": "萌神 手写体 SC",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 9,
        # デザイナーの名前
        "nameString": "Nozomi Seto \n Yuya Maruyama",
    },
    {
        "platformID": 1,
        "encodingID": 0,
        "languageID": 0,
        "nameID": 11,
        # ベンダーの URL
        "nameString": "http://www.mengshen-project.com/",
    },
    # Microsoft
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 0,
        # 著作権注釈
        "nameString": "[萌神PROJECT] Copyright © 2020 mengshen project with Copyright © 2020 LXGW",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 1,
        # フォントファミリ名
        "nameString": "Mengshen-Handwritten",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 2,
        # フォントサブファミリ名
        "nameString": "Regular",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 3,
        # フォント識別子
        "nameString": f"{VERSION};MENGSHEN;Mengshen-Handwritten",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 4,
        # 完全なフォント名
        "nameString": "Mengshen-Handwritten",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 5,
        # バージョン文字列
        "nameString": f"Version {VERSION}",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 6,
        # PostScript名
        "nameString": "Mengshen-Handwritten-SC",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 7,
        # 商標
        "nameString": "萌神 手写体 SC",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1033,
        "nameID": 9,
        # デザイナーの名前
        "nameString": "Nozomi Seto 瀬戸のぞみ \n[mengshen project] Yuya Maruyama 丸山裕也",
    },
    {
        "platformID": 3,
        "encodingID": 0,
        "languageID": 1033,
        "nameID": 11,
        # ベンダーの URL
        "nameString": "http://www.mengshen-project.com/",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1041,
        "nameID": 1,
        "nameString": "萌神 手写体 CN",
    },
    {
        "platformID": 3,
        "encodingID": 1,
        "languageID": 1041,
        "nameID": 4,
        "nameString": "萌神 手写体 CN",
    },
]


# --- Multi-weight name table derivation -------------------------------------
#
# ウェイトごとの name テーブルは Regular の定義から導出する。
# The lists above describe the Regular cut. Rather than duplicating ~30 entries
# per weight, weight variants are derived from them by rewriting the naming IDs
# and leaving copyright, licence, designer and vendor entries untouched.
#
# Windows のファミリ名 (platformID 3, nameID 1) が "Mengshen-Regular" になって
# いるのは上流のバグ。Mac 側は "Mengshen-HanSerif" で、両者が食い違っている。
#
# The shipped Regular declares its family as "Mengshen-HanSerif" on Macintosh
# but "Mengshen-Regular" on Windows. That inconsistency has to be resolved for
# multi-weight builds: Windows style-links Regular and Bold only when both
# declare the *same* nameID 1, so leaving Regular as "Mengshen-Regular" would
# mean Bold never attaches to it and Ctrl+B does nothing.
#
# Normalising Windows to the Macintosh value fixes the linking and makes the two
# platforms agree. The cost is that the Regular's Windows family name changes
# from "Mengshen-Regular" to "Mengshen-HanSerif"; documents that recorded the
# old name may need reselecting. Set to False to keep the upstream behaviour,
# at the price of losing bold style-linking.
NORMALISE_WINDOWS_FAMILY_NAME = True

# Canonical family names, per languageID. 1041 is Japanese; anything else falls
# back to the Latin name.
_DEFAULT_FAMILY_KEY = "default"
_FAMILY_BASES: Dict[str, Dict[Union[str, int], str]] = {
    "HAN_SERIF": {_DEFAULT_FAMILY_KEY: "Mengshen-HanSerif", 1041: "萌神 明朝体 CN"},
    "HANDWRITTEN": {
        _DEFAULT_FAMILY_KEY: "Mengshen-Handwritten",
        1041: "萌神 手写体 CN",
    },
}

# PostScript name (nameID 6) stems.
_POSTSCRIPT_BASES: Dict[str, str] = {
    "HAN_SERIF": "Mengshen-HanSerif-CN",
    "HANDWRITTEN": "Mengshen-Handwritten-SC",
}


def _family_base(style_key: str, language_id: int) -> str:
    """Family name for a style, localised where a localised name exists."""
    bases = _FAMILY_BASES[style_key]
    return bases.get(language_id, bases[_DEFAULT_FAMILY_KEY])


def build_name_table(style_key: str, weight: FontWeight) -> List[FontNameEntry]:
    """Build the name table for a style ("HAN_SERIF"/"HANDWRITTEN") and weight.

    Args:
        style_key: Which base table to derive from.
        weight: A FontWeight member.

    Returns:
        Name table entries for the requested weight.
    """
    base: List[FontNameEntry] = HAN_SERIF if style_key == "HAN_SERIF" else HANDWRITTEN

    # Regular keeps the shipped entries, apart from the Windows family name fix
    # described above, which Bold needs in order to style-link to it.
    if weight is FontWeight.REGULAR:
        regular: List[FontNameEntry] = []
        for entry in base:
            new_entry = dict(entry)
            if (
                NORMALISE_WINDOWS_FAMILY_NAME
                and entry["nameID"] == 1
                and entry["platformID"] == 3
                and entry["languageID"] == 1033
            ):
                new_entry["nameString"] = _family_base(style_key, 1033)
            regular.append(new_entry)  # type: ignore[arg-type]
        return regular

    style = weight.style_name
    postscript_base = _POSTSCRIPT_BASES[style_key]
    postscript_name = f"{postscript_base}-{style}"

    derived: List[FontNameEntry] = []
    for entry in base:
        new_entry = dict(entry)
        name_id = entry["nameID"]
        language_id = entry["languageID"]
        family = _family_base(style_key, language_id)

        if name_id == 1:
            # Bold style-links to Regular, so it keeps the plain family name.
            # Other weights need a family of their own for apps that only
            # understand the four RIBBI styles.
            new_entry["nameString"] = family if weight.is_ribbi else f"{family} {style}"
        elif name_id == 2:
            new_entry["nameString"] = style if weight.is_ribbi else "Regular"
        elif name_id == 3:
            new_entry["nameString"] = f"{VERSION};MENGSHEN;{postscript_name}"
        elif name_id == 4:
            new_entry["nameString"] = f"{family} {style}"
        elif name_id == 6:
            new_entry["nameString"] = postscript_name

        derived.append(new_entry)  # type: ignore[arg-type]

    # Typographic family/subfamily so the whole range groups as one family in
    # applications that read nameID 16/17.
    if not weight.is_ribbi:
        for platform_id, encoding_id, language_id in ((1, 0, 0), (3, 1, 1033)):
            derived.append(
                {
                    "platformID": platform_id,
                    "encodingID": encoding_id,
                    "languageID": language_id,
                    "nameID": 16,
                    "nameString": _family_base(style_key, language_id),
                }
            )
            derived.append(
                {
                    "platformID": platform_id,
                    "encodingID": encoding_id,
                    "languageID": language_id,
                    "nameID": 17,
                    "nameString": style,
                }
            )

    return derived
