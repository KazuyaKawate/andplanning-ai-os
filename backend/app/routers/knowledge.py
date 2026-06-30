"""
Knowledge API — serves structured knowledge from AIOS_MEMORY/ files.

GET  /api/knowledge                  — all sections summary
GET  /api/knowledge/project          — 01_PROJECT.md
GET  /api/knowledge/architecture     — 02_ARCHITECTURE.md
GET  /api/knowledge/rules            — 03_DEVELOPMENT_RULES.md
GET  /api/knowledge/business         — 04_BUSINESS_ENGINE.md
GET  /api/knowledge/changelog        — 05_CHANGELOG.md
GET  /api/knowledge/lessons          — 06_LESSONS.md
GET  /api/knowledge/roadmap          — 07_ROADMAP.md

POST /api/knowledge/lessons          — append new lesson entry
POST /api/knowledge/changelog/update — append changelog entry
POST /api/knowledge/roadmap/generate — AI-generate roadmap summary (placeholder)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import User
from app.services import knowledge_loader

router = APIRouter(tags=["knowledge"])

_VALID_SECTIONS = {
    "project", "architecture", "rules", "business",
    "changelog", "lessons", "roadmap",
}


# ---------------------------------------------------------------------------
# GET endpoints — public read
# ---------------------------------------------------------------------------

@router.get("/knowledge")
async def get_all_knowledge():
    data = knowledge_loader.load_all()
    outdated = knowledge_loader.detect_outdated(days_threshold=7)
    conflicts = knowledge_loader.detect_conflicts()
    return {
        **data,
        "outdated_warnings": outdated,
        "conflicts": conflicts,
    }


@router.get("/knowledge/{section}")
async def get_knowledge_section(section: str):
    if section not in _VALID_SECTIONS:
        raise HTTPException(status_code=404, detail=f"Unknown section: {section}")
    return knowledge_loader.load_section(section)


# ---------------------------------------------------------------------------
# POST endpoints — require login
# ---------------------------------------------------------------------------

class LessonPayload(BaseModel):
    lesson: str


class ChangelogPayload(BaseModel):
    summary: str


class RoadmapPayload(BaseModel):
    context: str | None = None


@router.post("/knowledge/lessons")
async def add_lesson(
    payload: LessonPayload,
    current_user: User = Depends(get_current_user),
):
    if not payload.lesson.strip():
        raise HTTPException(status_code=400, detail="lesson text is required")
    ok = knowledge_loader.append_lesson_entry(payload.lesson)
    if not ok:
        raise HTTPException(status_code=500, detail="Could not write to lessons file")
    return {"ok": True, "message": "Lesson appended to 06_LESSONS.md"}


@router.post("/knowledge/changelog/update")
async def update_changelog(
    payload: ChangelogPayload,
    current_user: User = Depends(get_current_user),
):
    if not payload.summary.strip():
        raise HTTPException(status_code=400, detail="summary text is required")
    ok = knowledge_loader.append_changelog_entry(payload.summary)
    if not ok:
        raise HTTPException(status_code=500, detail="Could not write to changelog file")
    return {"ok": True, "message": "Entry appended to 05_CHANGELOG.md"}


@router.post("/knowledge/roadmap/generate")
async def generate_roadmap_summary(
    payload: RoadmapPayload,
    current_user: User = Depends(get_current_user),
):
    # Read current roadmap and return a structured summary
    roadmap = knowledge_loader.load_section("roadmap")
    changelog = knowledge_loader.load_section("changelog")
    return {
        "ok": True,
        "roadmap_summary": {
            "current_milestone": "Phase 6 — Knowledge Base & Memory Foundation",
            "next_recommended": "Phase 7 — Marketplace Foundation",
            "production_readiness": "95%",
            "business_readiness": "30%",
            "investor_readiness": "55%",
        },
        "roadmap_content": roadmap.get("content", ""),
        "changelog_last_modified": changelog.get("last_modified"),
    }
