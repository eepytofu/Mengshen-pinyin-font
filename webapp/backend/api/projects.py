# -*- coding: utf-8 -*-
"""Project CRUD, builtin font selection, and license acknowledgment."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import (
    BuiltinSelectRequest,
    FontRole,
    LicenseAcknowledgeRequest,
    LicenseInfo,
    Project,
    ProjectCreateRequest,
    ProjectPatchRequest,
)
from ..services import font_inspector
from ..services.pipeline import BUILTIN_FONTS
from ..services.project_store import default_canvas
from .deps import get_project_or_404, store

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", status_code=201)
def create_project(body: ProjectCreateRequest) -> Project:
    return store.create(body.name)


@router.get("")
def list_projects() -> list[Project]:
    return store.list()


@router.get("/{project_id}")
def get_project(project_id: str) -> Project:
    return get_project_or_404(project_id)


@router.patch("/{project_id}")
def patch_project(project_id: str, body: ProjectPatchRequest) -> Project:
    project = get_project_or_404(project_id)
    if body.name is not None:
        project.name = body.name
    if body.step is not None:
        project.step = body.step
    if body.canvas is not None:
        project.canvas = body.canvas
    if body.output is not None:
        project.output = body.output
    return store.save(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str) -> None:
    if not store.delete(project_id):
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")


def _set_font(project: Project, role: FontRole, path: Path, source: str) -> Project:
    """Attach a font to the project and refresh its license state."""
    font_ref = font_inspector.inspect_font(path, source, path.name)
    entries = font_inspector.read_license_entries(path)

    if role == "base":
        project.base_font = font_ref
    else:
        project.pinyin_font = font_ref

    # Changing a font always invalidates its previous acknowledgment
    project.license[role] = LicenseInfo(
        entries=entries,
        acknowledged=False,
        font_sha256=font_ref.sha256,
    )

    # Templates prepared for the previous font are stale now
    project.tasks["prepare"] = project.tasks["prepare"].model_copy(
        update={"status": "idle", "stage": None, "progress": 0.0, "error": None}
    )
    return project


@router.put("/{project_id}/fonts/{role}/builtin")
def select_builtin_font(
    project_id: str, role: FontRole, body: BuiltinSelectRequest
) -> Project:
    project = get_project_or_404(project_id)
    info = BUILTIN_FONTS[body.style]
    path_key = "base_path" if role == "base" else "pinyin_path"
    path = Path(str(info[path_key]))
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"Bundled font missing: {path}")

    project = _set_font(project, role, path, f"builtin:{body.style}")

    # Selecting a builtin base font seeds its tuned canvas defaults
    if role == "base":
        project.canvas = default_canvas(body.style)

    return store.save(project)


@router.post("/{project_id}/license/acknowledge")
def acknowledge_license(project_id: str, body: LicenseAcknowledgeRequest) -> Project:
    project = get_project_or_404(project_id)
    font_ref = project.base_font if body.role == "base" else project.pinyin_font
    if font_ref is None:
        raise HTTPException(status_code=409, detail=f"No {body.role} font selected yet")

    info = project.license[body.role]
    info.acknowledged = body.acknowledged
    info.acknowledged_at = (
        datetime.now(timezone.utc).isoformat(timespec="seconds")
        if body.acknowledged
        else None
    )
    info.font_sha256 = font_ref.sha256
    return store.save(project)
