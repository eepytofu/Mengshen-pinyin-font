# -*- coding: utf-8 -*-
"""Homograph list and GSUB (rclt) table endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services import duoyinzi_catalog, glyph_catalog
from .deps import get_project_or_404, store

router = APIRouter(prefix="/api/projects/{project_id}", tags=["duoyinzi"])


@router.get("/duoyinzi")
def list_duoyinzi(
    project_id: str,
    q: str = "",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
) -> dict:
    get_project_or_404(project_id)
    return duoyinzi_catalog.search_duoyinzi(q, page, size)


@router.get("/duoyinzi/{char}")
def duoyinzi_detail(project_id: str, char: str) -> dict:
    get_project_or_404(project_id)
    row = duoyinzi_catalog.find_duoyinzi(char)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Not a known homograph: {char}")
    return row


@router.get("/gsub")
def gsub_overview(project_id: str) -> dict:
    project = get_project_or_404(project_id)
    try:
        table = duoyinzi_catalog.get_gsub(project)
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return duoyinzi_catalog.gsub_overview(table)


@router.get("/gsub/{lookup_name}")
def gsub_lookup_rules(
    project_id: str,
    lookup_name: str,
    q: str = "",
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
) -> dict:
    project = get_project_or_404(project_id)
    try:
        table = duoyinzi_catalog.get_gsub(project)

        # Allow searching by character: rules reference raw glyph names
        glyph_index = glyph_catalog.get_index(store, project)
        if q and len(q) == 1 and not q.isascii():
            names = [e["name"] for e in glyph_index if e["char"] == q]
            q = names[0] if names else q

        result = duoyinzi_catalog.lookup_rules(table, lookup_name, q, page, size)

        # name -> char map for the glyphs on this page (UI readability)
        page_names: set[str] = set()
        for rule in result["rules"]:
            for group in rule.get("match", []):
                page_names.update(group)
            if isinstance(rule.get("to"), list):
                page_names.update(str(g) for g in rule["to"])
        result["glyph_chars"] = {
            e["name"]: e["char"]
            for e in glyph_index
            if e["name"] in page_names and e["char"]
        }
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
