# -*- coding: utf-8 -*-
"""Configuration management module."""

from __future__ import annotations

from . import font_name_tables
from .font_config import (
    FontConfig,
    FontConstants,
    FontMetadata,
    FontType,
    HanziCanvas,
    PinyinCanvas,
)
from .font_name_tables import (
    HAN_SERIF,
    HANDWRITTEN,
    VERSION,
    FontNameEntry,
    build_name_table,
)
from .font_weights import SUPPORTED_WEIGHTS, FontWeight, WeightMetadata
from .paths import ProjectPaths

__all__ = [
    "FontType",
    "FontWeight",
    "WeightMetadata",
    "SUPPORTED_WEIGHTS",
    "build_name_table",
    "FontConfig",
    "PinyinCanvas",
    "HanziCanvas",
    "FontMetadata",
    "ProjectPaths",
    "FontConstants",
    "FontNameEntry",
    "HAN_SERIF",
    "HANDWRITTEN",
    "VERSION",
    "font_name_tables",
]
