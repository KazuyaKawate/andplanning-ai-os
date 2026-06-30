"""
Project Scanner — static analysis of the AIOS codebase.

Reads actual files from disk (no AI needed) to produce real metrics:
  - File/line counts by type
  - Open DevPatch count
  - Route count
  - Module inventory
  - Dependency list
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# Extensions we count
BACKEND_EXTS  = {".py"}
FRONTEND_EXTS = {".ts", ".tsx", ".js", ".jsx"}
CONFIG_EXTS   = {".json", ".toml", ".yaml", ".yml", ".md", ".env"}

# Dirs to skip
SKIP_DIRS = {
    ".git", "node_modules", ".next", "__pycache__", ".venv",
    "venv", ".mypy_cache", "dist", "build", ".pytest_cache",
    "coverage", ".turbo",
}


def _walk_files(root: Path, extensions: set[str]) -> list[Path]:
    result: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            p = Path(dirpath) / f
            if p.suffix in extensions:
                result.append(p)
    return result


def _count_lines(path: Path) -> int:
    try:
        return sum(1 for _ in path.read_text(encoding="utf-8", errors="ignore").splitlines())
    except Exception:
        return 0


def scan_project() -> dict[str, Any]:
    """
    Returns a dict with all static metrics. Fast — no AI, no DB.
    """
    backend_root  = PROJECT_ROOT / "backend"
    frontend_root = PROJECT_ROOT / "website"

    py_files  = _walk_files(backend_root, BACKEND_EXTS)
    ts_files  = _walk_files(frontend_root, FRONTEND_EXTS)

    py_lines  = sum(_count_lines(f) for f in py_files)
    ts_lines  = sum(_count_lines(f) for f in ts_files)

    # Pages (Next.js routes)
    page_files = [f for f in ts_files if f.name == "page.tsx" or f.name == "page.ts"]

    # API routers
    router_dir = backend_root / "app" / "routers"
    router_files = list(router_dir.glob("*.py")) if router_dir.exists() else []
    router_files = [f for f in router_files if not f.name.startswith("__")]

    # Count endpoints per router (naive: count @router.get/post/patch/delete/put)
    endpoint_count = 0
    for rf in router_files:
        try:
            text = rf.read_text(encoding="utf-8", errors="ignore")
            endpoint_count += text.count("@router.get(")
            endpoint_count += text.count("@router.post(")
            endpoint_count += text.count("@router.patch(")
            endpoint_count += text.count("@router.delete(")
            endpoint_count += text.count("@router.put(")
        except Exception:
            pass

    # requirements.txt package count
    req_file = backend_root / "requirements.txt"
    dep_count = 0
    if req_file.exists():
        lines = req_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        dep_count = sum(1 for l in lines if l.strip() and not l.startswith("#"))

    # package.json dependencies
    pkg_json = frontend_root / "package.json"
    npm_dep_count = 0
    if pkg_json.exists():
        try:
            import json
            pkg = json.loads(pkg_json.read_text(encoding="utf-8"))
            npm_dep_count = (
                len(pkg.get("dependencies", {})) +
                len(pkg.get("devDependencies", {}))
            )
        except Exception:
            pass

    # Service files
    service_files = list((backend_root / "app" / "services").glob("*.py"))
    service_files = [f for f in service_files if not f.name.startswith("__")]

    # Model tables (count class X(Base))
    models_path = backend_root / "app" / "models.py"
    model_count = 0
    if models_path.exists():
        text = models_path.read_text(encoding="utf-8", errors="ignore")
        model_count = text.count("(Base):")

    return {
        "py_files":       len(py_files),
        "ts_files":       len(ts_files),
        "total_files":    len(py_files) + len(ts_files),
        "py_lines":       py_lines,
        "ts_lines":       ts_lines,
        "total_lines":    py_lines + ts_lines,
        "page_routes":    len(page_files),
        "api_routers":    len(router_files),
        "api_endpoints":  endpoint_count,
        "service_files":  len(service_files),
        "db_models":      model_count,
        "py_deps":        dep_count,
        "npm_deps":       npm_dep_count,
        "pages":          [str(p.relative_to(frontend_root)) for p in page_files],
        "routers":        [f.stem for f in router_files],
        "services":       [f.stem for f in service_files],
    }


def build_project_summary(scan: dict[str, Any]) -> str:
    """Format scan results into a compact text for AI prompts."""
    return f"""
## AIOS Project Scan Results

### Code Volume
- Python files: {scan['py_files']} ({scan['py_lines']:,} lines)
- TypeScript/TSX files: {scan['ts_files']} ({scan['ts_lines']:,} lines)
- Total: {scan['total_files']} files, {scan['total_lines']:,} lines

### Architecture
- Next.js pages (routes): {scan['page_routes']}
- FastAPI routers: {scan['api_routers']} ({scan['api_endpoints']} endpoints)
- Service modules: {scan['service_files']}
- DB models (SQLAlchemy): {scan['db_models']}

### Routers: {', '.join(scan['routers'])}
### Services: {', '.join(scan['services'])}

### Dependencies
- Python packages: {scan['py_deps']}
- NPM packages: {scan['npm_deps']}

### Pages
{chr(10).join('- ' + p for p in scan['pages'])}
""".strip()
