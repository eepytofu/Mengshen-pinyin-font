# -*- coding: utf-8 -*-
# !/usr/bin/env python

from __future__ import annotations

import argparse
import json
import os
from typing import Dict, List, Optional

from ..config.font_config import FontConfig, FontType, FontWeight
from ..config.paths import DIR_TEMP
from ..font_types import GlyphData
from ..utils.logging_config import get_logger, setup_logging
from ..utils.shell_utils import ShellExecutor

# Font glyph data types - using font_types.py definitions
FontTable = Dict[str, GlyphData]


# 呣 m̀, 嘸 m̄ を使うが、これは unicode ではないので除外する。グリフが収録されていない事が多い。
ALPHABET = [
    "a",
    "ā",
    "á",
    "ǎ",
    "à",
    "b",
    "c",
    "d",
    "e",
    "ē",
    "é",
    "ě",
    "è",
    "f",
    "g",
    "h",
    "i",
    "ī",
    "í",
    "ǐ",
    "ì",
    "j",
    "k",
    "l",
    "m",
    "ḿ",
    "n",
    "ń",
    "ň",
    "ǹ",
    "o",
    "ō",
    "ó",
    "ǒ",
    "ò",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "ū",
    "ú",
    "ǔ",
    "ù",
    "ü",
    "ǖ",
    "ǘ",
    "ǚ",
    "ǜ",
    "v",
    "w",
    "x",
    "y",
    "z",
]

UNICODE_ALPHABET = [ord(c) for c in ALPHABET]

ALPHABET_FOR_PINYIN_JSON = "alphabet4pinyin.json"
OUTPUT_JSON = "output_for_pinyin.json"


class LatinAlphabetRetriever:
    """Retrieves Latin alphabet glyphs for pinyin display from fonts."""

    def __init__(self, shell_executor: Optional[ShellExecutor] = None):
        self.shell = shell_executor or ShellExecutor()

    def convert_otf2json(self, source_font_name: str, output_json: str) -> None:
        """Convert OpenType font to JSON format."""
        cmd = ["otfccdump", "-o", output_json, "--pretty", source_font_name]
        try:
            self.shell.execute(cmd)
        except (OSError, RuntimeError) as e:
            logger = get_logger("mengshen.scripts.retrieve_alphabet")
            logger.error("Error converting font to JSON: %s", e)
            raise

    def get_cmap_table(self, source_font_json: str) -> Dict[str, str]:
        """Extract cmap table from font JSON."""
        # Use jq to extract cmap table
        cmd = ["jq", ".cmap", source_font_json]
        try:
            result = self.shell.execute(cmd)
            # Handle both direct output and MockResult objects
            output_str: str
            if hasattr(result, "stdout"):
                output_raw = result.stdout
                if isinstance(output_raw, bytes):
                    output_str = output_raw.decode("utf-8")
                elif isinstance(output_raw, str):
                    output_str = output_raw
                else:
                    raise ValueError(f"Unexpected output type: {type(output_raw)}")
            else:
                if isinstance(result, str):
                    output_str = result
                else:
                    raise ValueError(f"Unexpected result type: {type(result)}")
            result_dict = json.loads(output_str)
            if isinstance(result_dict, dict):
                # Return the original dict since type conversion is handled elsewhere
                return result_dict
            return {}
        except (OSError, ValueError, RuntimeError, KeyError, TypeError) as e:
            logger = get_logger("mengshen.scripts.retrieve_alphabet")
            logger.error("Error extracting cmap table: %s", e)
            return {}

    def get_glyf_table(self, source_font_json: str) -> FontTable:
        """Extract glyf table from font JSON."""
        # Use jq to extract glyf table
        cmd = ["jq", ".glyf", source_font_json]
        try:
            result = self.shell.execute(cmd)
            # Handle both direct output and MockResult objects
            output_str: str
            if hasattr(result, "stdout"):
                output_raw = result.stdout
                if isinstance(output_raw, bytes):
                    output_str = output_raw.decode("utf-8")
                elif isinstance(output_raw, str):
                    output_str = output_raw
                else:
                    raise ValueError(f"Unexpected output type: {type(output_raw)}")
            else:
                if isinstance(result, str):
                    output_str = result
                else:
                    raise ValueError(f"Unexpected result type: {type(result)}")
            result_dict = json.loads(output_str)
            if isinstance(result_dict, dict):
                # Return the original dict since type conversion is handled elsewhere
                return result_dict
            return {}
        except (OSError, ValueError, RuntimeError, KeyError, TypeError) as e:
            logger = get_logger("mengshen.scripts.retrieve_alphabet")
            logger.error("Error extracting glyf table: %s", e)
            return {}

    def filter_alphabet_glyphs(
        self, cmap_table: Dict[str, str], glyf_table: FontTable
    ) -> FontTable:
        """Filter alphabet glyphs for pinyin display.

        Missing characters are reported rather than silently skipped: the
        accented vowels (ā á ǎ à ǹ ḿ ...) are not covered by every weight of
        every Latin font, and a silent drop produces pinyin with holes in it.
        """
        result = {}
        missing = []

        for unicode_code in UNICODE_ALPHABET:
            unicode_str = str(unicode_code)
            char = chr(unicode_code)
            cid = cmap_table.get(unicode_str)
            if cid is not None and cid in glyf_table:
                result[char] = glyf_table[cid]
            else:
                missing.append(char)

        if missing:
            logger = get_logger("mengshen.scripts.retrieve_alphabet")
            logger.warning(
                "Pinyin font is missing %d of %d required glyphs: %s. "
                "Pinyin using these will not render; pick a different weight "
                "of the alphabet font.",
                len(missing),
                len(UNICODE_ALPHABET),
                " ".join(missing),
            )

        return result

    def save_alphabet_json(self, alphabet_glyphs: FontTable, output_path: str) -> None:
        """Save filtered alphabet glyphs to JSON file."""
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(alphabet_glyphs, f, ensure_ascii=False, indent=2)
        except (OSError, ValueError, RuntimeError, KeyError, TypeError) as e:
            logger = get_logger("mengshen.scripts.retrieve_alphabet")
            logger.error("Error saving alphabet JSON: %s", e)
            raise

    def retrieve_alphabet(self, source_font_name: str, style: str) -> None:
        """Main process to retrieve alphabet glyphs."""
        # Setup file paths
        temp_font_json = os.path.join(DIR_TEMP, f"temp_font_{style}.json")
        output_json_path = os.path.join(DIR_TEMP, f"alphabet_for_pinyin_{style}.json")

        try:
            # Convert font to JSON
            self.convert_otf2json(source_font_name, temp_font_json)

            # Extract tables
            cmap_table = self.get_cmap_table(temp_font_json)
            glyf_table = self.get_glyf_table(temp_font_json)

            # Filter alphabet glyphs
            alphabet_glyphs = self.filter_alphabet_glyphs(cmap_table, glyf_table)

            # Save result
            self.save_alphabet_json(alphabet_glyphs, output_json_path)

            logger = get_logger("mengshen.scripts.retrieve_alphabet")
            logger.info(
                "Successfully extracted %d alphabet glyphs for %s style",
                len(alphabet_glyphs),
                style,
            )

        finally:
            # Clean up temporary file
            if os.path.exists(temp_font_json):
                os.remove(temp_font_json)


def parse_args(args: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Extract Latin alphabet glyphs for pinyin display"
    )
    parser.add_argument(
        "--style",
        required=True,
        choices=["han_serif", "handwritten"],
        help="Font style to process.",
    )
    parser.add_argument(
        "--weight",
        default=FontWeight.REGULAR.key,
        choices=FontWeight.keys(),
        help="Font weight to process (default: regular).",
    )
    return parser.parse_args(args)


def retrieve_alphabet_main(args: Optional[List[str]] = None) -> None:
    """Main function for alphabet retrieval."""
    # Setup logging
    setup_logging(level="INFO", verbose=False, quiet=False)

    options = parse_args(args)

    # Get font config based on style
    if options.style == "han_serif":
        font_type = FontType.HAN_SERIF
    else:
        font_type = FontType.HANDWRITTEN

    weight = FontWeight.from_key(options.weight)
    FontConfig.validate_weight(font_type, weight)

    # Get alphabet font path from configuration. The pinyin uses a heavier cut
    # than the hanzi, see PINYIN offset note in config/font_weights.py.
    source_font = str(FontConfig.get_alphabet_font_path(font_type, weight))
    if not os.path.exists(source_font):
        raise FileNotFoundError(
            f"Pinyin (alphabet) font not found: {source_font}. "
            "Download the matching M+ 1m cut from "
            "https://mplus-fonts.osdn.jp/about.html and place it there."
        )

    variant = FontConfig.get_variant_key(font_type, weight)

    # Create retriever and process
    retriever = LatinAlphabetRetriever()
    retriever.retrieve_alphabet(source_font, variant)

    logger = get_logger("mengshen.scripts.retrieve_alphabet")
    logger.info(
        "Latin alphabet extraction completed for %s style (%s)",
        options.style,
        weight.style_name,
    )


if __name__ == "__main__":
    retrieve_alphabet_main()
