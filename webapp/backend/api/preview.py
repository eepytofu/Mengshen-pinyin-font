# -*- coding: utf-8 -*-
"""SVG preview endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from ..schemas import PreviewRequest, PreviewResponse
from ..services import preview_composer
from .deps import get_project_or_404

router = APIRouter(prefix="/api/projects/{project_id}", tags=["preview"])


@router.post("/preview")
def preview(project_id: str, body: PreviewRequest) -> PreviewResponse:
    project = get_project_or_404(project_id)
    canvas = body.canvas or project.canvas
    return preview_composer.compose_preview(project, body.text, canvas)
