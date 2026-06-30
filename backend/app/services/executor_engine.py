"""
AIOS Executor Engine — shared utilities for the executor pipeline.
Provides: system prompt, patch parser, safe-file helpers, test runner.

IMPORTANT: This module must NOT import from any router file.
It may only import from app.services.*, app.models, app.schemas, app.auth,
app.database, and the standard library.
"""
from __future__ import annotations

import ast
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Project root & safety (mirrors dev.py — kept in sync manually)
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

PROTECTED_FILES: set[str] = {
    "backend/app/database.py",
    "backend/app/config.py",
    "backend/app/services/ai_router.py",
    "backend/app/services/retry.py",
    "backend/app/models.py",
}

TEXT_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt",
    ".toml", ".yaml", ".yml", ".css", ".html", ".sh", ".sql",
    ".env.example", ".gitignore", ".prettierrc", ".eslintrc",
}

MAX_FILE_SIZE = 150_000

# ---------------------------------------------------------------------------
# System prompt for the Executor agent
# ---------------------------------------------------------------------------

EXECUTOR_SYSTEM_PROMPT = """You are the AIOS Executor — an autonomous development agent embedded in the AI OS.

## Your Role
You receive a natural language instruction and execute the full pipeline:
Plan → Patch → (Human Approval) → Apply → Test → Report.

## Tech Stack
- Frontend: Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion
- Backend: FastAPI + SQLAlchemy async + SQLite
- AI routing: Claude (primary) → Gemini → OpenAI fallback
- Pattern: OsApiAdapter interface, useWorkflowEngine hook, DevPatch approval flow

## Absolute Safety Rules — NEVER VIOLATE
1. NEVER suggest deleting files or directories
2. NEVER suggest: git reset, git clean, git checkout --, git rebase, git push --force
3. NEVER patch protected files: backend/app/database.py, backend/app/config.py,
   backend/app/models.py, backend/app/services/ai_router.py, backend/app/services/retry.py
4. NEVER output API keys, JWT secrets, passwords, or .env contents
5. ALWAYS produce a <patch> block when asked to generate a code change
6. ALWAYS stop after patch generation — human must approve before apply
7. Changes to models.py: APPEND only (never modify existing rows)

## Plan Format
When asked for a PLAN, output:
1. **概要** — What this change does and why
2. **変更ファイル** — List of files to modify with specific changes
3. **実装手順** — Step-by-step implementation order
4. **リスク** — Breaking changes, security implications
5. **テスト方法** — How to verify the change works

## Patch Format
When asked for a PATCH, output the analysis followed by this EXACT XML:

<patch>
<title>Short title (max 80 chars)</title>
<file>relative/path/from/project/root.ext</file>
<risk>low|medium|high</risk>
<explanation>Why this change is needed and what it does</explanation>
<new_content>
COMPLETE_FILE_CONTENT_HERE
</new_content>
</patch>

Only include ONE <patch> block per response. For multi-file changes, generate one patch at a time.

Respond in Japanese when the instruction is in Japanese."""


# ---------------------------------------------------------------------------
# Patch parsing (same logic as dev.py to stay in sync)
# ---------------------------------------------------------------------------

def parse_patch(text: str, fallback_file: str = "") -> dict | None:
    """Extract <patch>…</patch> block from AI response text."""
    match = re.search(r"<patch>(.*?)</patch>", text, re.DOTALL)
    if not match:
        return None
    block = match.group(1)

    def _tag(tag: str) -> str:
        m = re.search(rf"<{tag}>(.*?)</{tag}>", block, re.DOTALL)
        return m.group(1).strip() if m else ""

    title       = _tag("title") or "Patch proposal"
    fpath       = _tag("file")  or fallback_file
    risk        = _tag("risk")  or "low"
    explanation = _tag("explanation")
    new_content = _tag("new_content")

    if not new_content:
        return None
    return {
        "title":       title,
        "file_path":   fpath.replace("\\", "/").lstrip("/"),
        "risk_level":  risk if risk in ("low", "medium", "high") else "low",
        "explanation": explanation,
        "new_content": new_content,
    }


# ---------------------------------------------------------------------------
# File safety helpers
# ---------------------------------------------------------------------------

def is_protected(rel_path: str) -> bool:
    return rel_path.replace("\\", "/").lstrip("/") in PROTECTED_FILES


def resolve_safe(rel_path: str) -> Path:
    """Resolve a relative path safely within PROJECT_ROOT. Raises ValueError if outside."""
    norm = rel_path.replace("\\", "/").lstrip("/")
    abs_path = (PROJECT_ROOT / norm).resolve()
    try:
        abs_path.relative_to(PROJECT_ROOT)
    except ValueError:
        raise ValueError(f"Path '{rel_path}' is outside project root")
    return abs_path


def read_file_safe(rel_path: str) -> str:
    """Read a text file for use in prompts. Returns placeholder on error."""
    try:
        p = resolve_safe(rel_path)
        if not p.exists():
            return "(file does not exist yet)"
        if p.stat().st_size > MAX_FILE_SIZE:
            return f"(file too large: {p.stat().st_size // 1024} KB)"
        if p.suffix not in TEXT_EXTENSIONS:
            return "(binary or unsupported file type)"
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"(cannot read: {e})"


# ---------------------------------------------------------------------------
# Test runner (non-blocking, in-process checks)
# ---------------------------------------------------------------------------

def run_file_tests(rel_path: str, new_content: str) -> dict:
    """
    Run lightweight sanity checks on the patched file.
    Returns { ok: bool, checks: [{name, ok, detail}], summary: str }
    """
    checks: list[dict] = []

    # 1. File exists after apply
    try:
        p = resolve_safe(rel_path)
        exists = p.exists()
        checks.append({"name": "ファイル存在確認", "ok": exists,
                       "detail": str(p) if exists else "ファイルが見つかりません"})
    except Exception as e:
        checks.append({"name": "ファイル存在確認", "ok": False, "detail": str(e)})

    # 2. For Python files: AST parse
    if rel_path.endswith(".py"):
        try:
            ast.parse(new_content)
            checks.append({"name": "Python構文チェック", "ok": True,
                           "detail": "SyntaxError なし"})
        except SyntaxError as e:
            checks.append({"name": "Python構文チェック", "ok": False,
                           "detail": f"SyntaxError: {e}"})

    # 3. For TypeScript files: basic brace matching
    elif rel_path.endswith((".ts", ".tsx")):
        opens  = new_content.count("{")
        closes = new_content.count("}")
        balanced = abs(opens - closes) <= 2
        checks.append({"name": "TypeScript ブレース確認", "ok": balanced,
                       "detail": f"{{ {opens}個 / }} {closes}個 — {'バランスOK' if balanced else '不一致'}"})

    # 4. Content non-empty
    nonempty = len(new_content.strip()) > 0
    checks.append({"name": "コンテンツ非空確認", "ok": nonempty,
                   "detail": f"{len(new_content)} 文字"})

    all_ok = all(c["ok"] for c in checks)
    passed = sum(1 for c in checks if c["ok"])
    summary = f"{passed}/{len(checks)} チェック通過 — {'✅ 正常' if all_ok else '⚠️ 要確認'}"
    return {"ok": all_ok, "checks": checks, "summary": summary}


# ---------------------------------------------------------------------------
# Report generator (produces markdown from task state)
# ---------------------------------------------------------------------------

def generate_report(
    task_id:      str,
    title:        str,
    instruction:  str,
    plan_content: str | None,
    patch_info:   dict | None,
    test_result:  dict | None,
    model_used:   str,
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Executor Report — {title}",
        f"**Task ID:** `{task_id}`  ",
        f"**生成日時:** {now}  ",
        f"**モデル:** {model_used}  ",
        "",
        "## 指示",
        f"> {instruction}",
        "",
    ]
    if plan_content:
        lines += ["## 実装プラン", plan_content[:1500] + ("\n...[省略]" if len(plan_content) > 1500 else ""), ""]
    if patch_info:
        lines += [
            "## パッチ情報",
            f"- **ファイル:** `{patch_info.get('file_path', '?')}`",
            f"- **リスク:** {patch_info.get('risk_level', '?')}",
            f"- **説明:** {patch_info.get('explanation', '')}",
            f"- **DevPatch ID:** `{patch_info.get('patch_id', '?')}`",
            "",
        ]
    if test_result:
        ok_str = "✅ 全テスト通過" if test_result.get("ok") else "⚠️ 一部テスト失敗"
        lines += [
            "## テスト結果",
            f"**{ok_str}** — {test_result.get('summary', '')}",
            "",
        ]
        for c in test_result.get("checks", []):
            icon = "✅" if c["ok"] else "❌"
            lines.append(f"- {icon} **{c['name']}**: {c['detail']}")
        lines.append("")
    lines += [
        "## ステータス",
        "パッチは承認・適用済みです。次のステップ:",
        "1. 関連するユニットテストを実行",
        "2. ブラウザで該当機能を確認",
        "3. 問題があれば Rollback ボタンで元に戻せます",
        "",
        "---",
        "*Generated by AIOS Executor Phase 1*",
    ]
    return "\n".join(lines)
