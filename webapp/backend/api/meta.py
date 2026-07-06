# -*- coding: utf-8 -*-
"""Health check and builtin font listing."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

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


@router.get("/builtin-fonts/{style}/{role}/file")
def builtin_font_file(
    style: str, role: Literal["base", "pinyin"]
) -> FileResponse:
    """Serve a bundled font binary (for in-browser name preview)."""
    if style not in BUILTIN_FONTS:
        raise HTTPException(status_code=404, detail=f"Unknown style: {style}")
    key = "base_path" if role == "base" else "pinyin_path"
    path = Path(str(BUILTIN_FONTS[style][key]))
    if not path.exists():
        raise HTTPException(status_code=404, detail="Bundled font missing")
    return FileResponse(
        path,
        media_type="font/ttf",
        headers={"Cache-Control": "max-age=86400"},
    )
