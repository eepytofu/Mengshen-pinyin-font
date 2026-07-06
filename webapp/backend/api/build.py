# -*- coding: utf-8 -*-
"""Prepare/build background tasks and font download."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from .. import settings
from ..schemas import Project, TaskKind, TaskState
from ..services import pipeline
from .deps import get_project_or_404, store, tasks

router = APIRouter(prefix="/api/projects/{project_id}", tags=["build"])


def _require_acknowledgments(project: Project) -> None:
    for role in ("base", "pinyin"):
        info = project.license.get(role)
        font_ref = project.base_font if role == "base" else project.pinyin_font
        if font_ref is None:
            raise HTTPException(status_code=409, detail=f"No {role} font selected")
        if info is None or not info.acknowledged:
            raise HTTPException(
                status_code=409,
                detail=f"License for {role} font not acknowledged",
            )
        if info.font_sha256 != font_ref.sha256:
            raise HTTPException(
                status_code=409,
                detail=f"License acknowledgment for {role} font is stale",
            )


def _require_tools() -> None:
    missing = settings.missing_tools()
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Required tools missing from PATH: {missing}",
        )


@router.post("/prepare")
def start_prepare(project_id: str) -> TaskState:
    project = get_project_or_404(project_id)
    _require_acknowledgments(project)
    _require_tools()
    if project.tasks["prepare"].status == "running":
        raise HTTPException(status_code=409, detail="Prepare already running")

    # Regenerating templates makes any previously built TTF stale
    if project.tasks["build"].status != "idle":
        project.tasks["build"] = TaskState()
        store.save(project)

    def job(current: Project, on_progress) -> None:
        artifacts = pipeline.run_prepare(current, on_progress)
        fresh = store.get(current.id)
        if fresh is not None:
            fresh.artifacts.update(artifacts)
            store.save(fresh)

    return tasks.submit(project_id, "prepare", job)


@router.post("/build")
def start_build(project_id: str) -> TaskState:
    project = get_project_or_404(project_id)
    _require_acknowledgments(project)
    _require_tools()
    if project.tasks["prepare"].status != "done":
        raise HTTPException(status_code=409, detail="Prepare has not completed")
    if project.tasks["build"].status == "running":
        raise HTTPException(status_code=409, detail="Build already running")

    def job(current: Project, on_progress) -> None:
        pinyin_manager = None
        if (
            current.glyph_overrides.readings
            or current.glyph_overrides.excluded_characters
        ):
            from src.refactored.data import PinyinDataManager

            from ..services.overlay_pinyin_source import OverlayPinyinDataSource

            pinyin_manager = PinyinDataManager(
                data_source=OverlayPinyinDataSource(current)
            )
        output_path = pipeline.run_build(current, on_progress, pinyin_manager)
        fresh = store.get(current.id)
        if fresh is not None:
            fresh.artifacts["output_ttf"] = str(
                output_path.relative_to(settings.PATHS.project_root)
            )
            store.save(fresh)

    return tasks.submit(project_id, "build", job)


@router.get("/tasks/{kind}")
def get_task(project_id: str, kind: TaskKind) -> TaskState:
    project = get_project_or_404(project_id)
    return project.tasks[kind]


@router.get("/download")
def download(project_id: str) -> FileResponse:
    project = get_project_or_404(project_id)
    # A leftover TTF from before a font/canvas/readings change must not be
    # served — only a build of the current settings counts
    if project.tasks["build"].status != "done":
        raise HTTPException(
            status_code=409, detail="Font has not been built for the current settings"
        )
    output_path = pipeline.output_path_for(project)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Font has not been built yet")
    return FileResponse(
        output_path,
        media_type="font/ttf",
        filename=output_path.name,
    )
