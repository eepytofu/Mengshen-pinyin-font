# -*- coding: utf-8 -*-
"""Health check and builtin font listing."""

from __future__ import annotations

from fastapi import APIRouter

from .. import settings
from ..services.pipeline import BUILTIN_FONTS
from ..services.project_store import default_canvas

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health() -> dict:
    missing = settings.missing_tools()
    return {
        "status": "ok" if not missing else "degraded",
        "missing_tools": missing,
    }


@router.get("/builtin-fonts")
def builtin_fonts() -> dict:
    fonts = {}
    for style, info in BUILTIN_FONTS.items():
        fonts[style] = {
            "style": style,
            "label": info["label"],
            "base_path": str(info["base_path"]),
            "pinyin_path": str(info["pinyin_path"]),
            "default_canvas": default_canvas(style).model_dump(),
        }
    return {"fonts": fonts}
