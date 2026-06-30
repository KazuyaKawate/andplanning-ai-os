"""
Knowledge Loader service — reads AIOS_MEMORY/ files and provides structured
knowledge context for AI agents, auto-detection of outdated sections, and
conflict detection.
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# AIOS_MEMORY lives two levels above backend/app/services/
_MEMORY_DIR = Path(__file__).parent.parent.parent.parent / "AIOS_MEMORY"

_FILE_MAP = {
    "project":      "01_PROJECT.md",
    "architecture": "02_ARCHITECTURE.md",
    "rules":        "03_DEVELOPMENT_RULES.md",
    "business":     "04_BUSINESS_ENGINE.md",
    "changelog":    "05_CHANGELOG.md",
    "lessons":      "06_LESSONS.md",
    "roadmap":      "07_ROADMAP.md",
}


def _read_file(name: str) -> str:
    path = _MEMORY_DIR / name
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def _file_mtime(name: str) -> str | None:
    path = _MEMORY_DIR / name
    if not path.exists():
        return None
    ts = path.stat().st_mtime
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def load_section(key: str) -> dict[str, Any]:
    filename = _FILE_MAP.get(key)
    if not filename:
        return {"error": f"Unknown section: {key}"}
    content = _read_file(filename)
    return {
        "section": key,
        "filename": filename,
        "content": content,
        "last_modified": _file_mtime(filename),
        "word_count": len(content.split()),
        "available": bool(content),
    }


def load_all() -> dict[str, Any]:
    sections: dict[str, Any] = {}
    for key in _FILE_MAP:
        sections[key] = load_section(key)
    return {
        "sections": sections,
        "total_sections": len(_FILE_MAP),
        "memory_dir": str(_MEMORY_DIR),
        "loaded_at": datetime.now(timezone.utc).isoformat(),
    }


def build_agent_context(sections: list[str] | None = None) -> str:
    """Return a condensed context string for injection into AI agent system prompts."""
    keys = sections or ["project", "architecture", "rules", "changelog", "lessons", "roadmap"]
    parts: list[str] = [
        "=== AIOS Knowledge Base (auto-loaded) ===",
        f"Loaded: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]
    for key in keys:
        data = load_section(key)
        if data.get("available") and data.get("content"):
            parts.append(f"--- {key.upper()} ---")
            # Trim very large sections to first 2000 chars to avoid token overflow
            content = data["content"]
            if len(content) > 2000:
                content = content[:2000] + "\n...[truncated]"
            parts.append(content)
            parts.append("")
    return "\n".join(parts)


def detect_outdated(days_threshold: int = 7) -> list[dict[str, Any]]:
    """Flag sections not updated within days_threshold days."""
    now = datetime.now(timezone.utc)
    outdated: list[dict[str, Any]] = []
    for key, filename in _FILE_MAP.items():
        mtime_str = _file_mtime(filename)
        if mtime_str is None:
            outdated.append({"section": key, "reason": "file_missing"})
            continue
        mtime = datetime.fromisoformat(mtime_str)
        age_days = (now - mtime).days
        if age_days >= days_threshold:
            outdated.append({
                "section": key,
                "reason": "stale",
                "age_days": age_days,
                "last_modified": mtime_str,
            })
    return outdated


def detect_conflicts() -> list[dict[str, Any]]:
    """Basic conflict detection: look for contradictory status markers."""
    conflicts: list[dict[str, Any]] = []
    roadmap = _read_file(_FILE_MAP["roadmap"])
    changelog = _read_file(_FILE_MAP["changelog"])

    # If roadmap says something is "Pending" but changelog has a "Completed" entry for it
    pending_items = re.findall(r"❌ Pending\s*\|([^\|]+)", roadmap)
    for item in pending_items:
        item_clean = item.strip()
        if item_clean.lower() in changelog.lower():
            conflicts.append({
                "type": "status_mismatch",
                "item": item_clean,
                "detail": "Roadmap marks as Pending but Changelog may have a Completed entry",
            })
    return conflicts


def append_changelog_entry(summary: str) -> bool:
    """Safely append a new changelog entry. Never overwrites existing content."""
    path = _MEMORY_DIR / _FILE_MAP["changelog"]
    if not path.exists():
        return False
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = f"\n## [{date_str}] Auto-Update\n\n{summary.strip()}\n"
    with open(path, "a", encoding="utf-8") as f:
        f.write(entry)
    return True


def append_lesson_entry(lesson: str) -> bool:
    """Safely append a new lesson. Never overwrites existing content."""
    path = _MEMORY_DIR / _FILE_MAP["lessons"]
    if not path.exists():
        return False
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = f"\n## [{date_str}] Auto-Logged Lesson\n\n{lesson.strip()}\n"
    with open(path, "a", encoding="utf-8") as f:
        f.write(entry)
    return True
