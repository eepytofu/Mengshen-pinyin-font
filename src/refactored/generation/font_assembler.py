# -*- coding: utf-8 -*-
"""Font assembly and metadata management."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, cast

from ..config import (
    VERSION,
    FontConstants,
    FontMetadata,
    FontType,
    FontWeight,
    ProjectPaths,
    font_name_tables,
)

# Import comprehensive type definitions
from ..font_types import FontData, HeadTable, NameTable
from ..utils.logging_config import get_logger


class FontAssembler:
    """Handles font assembly, metadata, and output generation."""

    def __init__(
        self,
        font_config: FontMetadata,
        paths: ProjectPaths,
        weight: FontWeight = FontWeight.REGULAR,
    ):
        """Initialize font assembler.

        Args:
            font_config: Font metadata configuration (FontMetadata type)
            paths: Project paths configuration
            weight: Font weight being generated
        """
        self.font_config: FontMetadata = font_config
        self.paths = paths
        self.weight = weight
        self.logger = get_logger("mengshen.font_assembler")

    def _get_current_font_timestamp(self) -> int:
        """Get current time as TrueType font timestamp.

        TrueType fonts use 1904/01/01 00:00 GMT as epoch (not Unix epoch 1970).

        Returns:
            Current time as seconds since 1904/01/01 00:00 GMT
        """
        # Font epoch: 1904/01/01 00:00 GMT (UTC)
        base_date = datetime.strptime(
            FontConstants.FONT_EPOCH_BASE_DATE, FontConstants.DATE_FORMAT
        ).replace(tzinfo=timezone.utc)
        base_time = base_date.timestamp()

        # Current time in UTC
        generation_time = datetime.now(timezone.utc).timestamp()
        return round(generation_time - base_time)

    def set_font_metadata(self, font_data: FontData, font_type: FontType) -> None:
        """Set font metadata including version and creation date."""

        # Set font revision
        head_table = cast(HeadTable, font_data[FontConstants.HEAD_TABLE])
        if isinstance(head_table, dict):
            head_table["fontRevision"] = VERSION

        # Set creation and modification dates to current generation time
        font_timestamp = self._get_current_font_timestamp()
        head_table["created"] = font_timestamp
        head_table["modified"] = font_timestamp

        # Optional: Add generation timestamp info for debugging
        generation_time = datetime.now()
        self.logger.info(
            "Font metadata set - Version: %s, Generated: %s",
            VERSION,
            generation_time.strftime("%Y-%m-%d %H:%M:%S"),
        )

        if font_type == FontType.HAN_SERIF:
            style_key = "HAN_SERIF"
        elif font_type == FontType.HANDWRITTEN:
            style_key = "HANDWRITTEN"
        else:
            raise ValueError(f"Unsupported font type: {font_type}")

        font_data[FontConstants.NAME_TABLE] = cast(
            NameTable, font_name_tables.build_name_table(style_key, self.weight)
        )
        self.set_weight_attributes(font_data)

    def set_weight_attributes(self, font_data: FontData) -> None:
        """Set OS/2 and head fields that describe the weight.

        These are inherited from the source font, which is already correct when
        the matching Source Han Serif cut is used. They are set explicitly so
        the output is right regardless of what the source font declares.
        """
        # otfcc writes these bit fields as objects holding only the set flags,
        # so unset flags are removed rather than written as false.
        os2_raw = font_data.get(FontConstants.OS2_TABLE)
        if isinstance(os2_raw, dict):
            os2_table = cast(Dict[str, Any], os2_raw)
            os2_table["usWeightClass"] = self.weight.weight_class
            # fsSelection bit 5 = BOLD, bit 6 = REGULAR; they are exclusive.
            fs_selection = os2_table.get("fsSelection")
            if isinstance(fs_selection, dict):
                self._set_flag(fs_selection, "bold", self.weight.is_bold)
                self._set_flag(fs_selection, "regular", not self.weight.is_bold)

        head_raw = font_data.get(FontConstants.HEAD_TABLE)
        if isinstance(head_raw, dict):
            mac_style = cast(Dict[str, Any], head_raw).get("macStyle")
            if isinstance(mac_style, dict):
                self._set_flag(mac_style, "bold", self.weight.is_bold)

        self.logger.info(
            "Weight attributes set - %s (usWeightClass=%d)",
            self.weight.style_name,
            self.weight.weight_class,
        )

    @staticmethod
    def _set_flag(flags: Dict[str, Any], name: str, enabled: bool) -> None:
        """Set or remove a boolean flag, following otfcc's sparse convention."""
        if enabled:
            flags[name] = True
        else:
            flags.pop(name, None)
