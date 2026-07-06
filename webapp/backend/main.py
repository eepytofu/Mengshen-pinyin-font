# -*- coding: utf-8 -*-
"""FastAPI application for the Mengshen Font Studio webapp.

Run from the repository root:
    uvicorn webapp.backend.main:app --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import settings
from .api import build, meta, preview, projects
from .api.deps import tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_directories()
    tasks.recover_stale_tasks()
    yield
    tasks.executor.shutdown(wait=False, cancel_futures=True)


def create_app() -> FastAPI:
    app = FastAPI(title="Mengshen Font Studio", lifespan=lifespan)

    # Local-only app; allow the Vite dev server origin
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(meta.router)
    app.include_router(projects.router)
    app.include_router(preview.router)
    app.include_router(build.router)

    if settings.FRONTEND_DIST.exists():
        app.mount(
            "/",
            StaticFiles(directory=settings.FRONTEND_DIST, html=True),
            name="frontend",
        )

    return app


app = create_app()
