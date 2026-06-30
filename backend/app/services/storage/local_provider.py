"""
Local filesystem storage provider.
Files stored at UPLOAD_DIR (default: ./uploads).
Served via FastAPI StaticFiles at /uploads/*.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

from app.services.storage.base import StorageProvider, UploadResult


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = "./uploads") -> None:
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self.base_dir / key

    async def upload(self, key: str, data: bytes, mime_type: str) -> UploadResult:
        path = self._path(key)
        await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, data)
        return UploadResult(
            storage_key=key,
            public_url=f"/uploads/{key}",
            size_bytes=len(data),
            mime_type=mime_type,
        )

    async def download(self, key: str) -> bytes:
        return await asyncio.to_thread(self._path(key).read_bytes)

    async def delete(self, key: str) -> None:
        def _del():
            p = self._path(key)
            if p.exists():
                p.unlink()
        await asyncio.to_thread(_del)

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        return f"/uploads/{key}"

    async def exists(self, key: str) -> bool:
        return await asyncio.to_thread(self._path(key).exists)
