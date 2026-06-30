"""
Storage provider factory.
Set STORAGE_PROVIDER env var to: local (default) | s3 | r2 | supabase
Set UPLOAD_DIR for local provider base directory (default: ./uploads).
"""
from __future__ import annotations

import os
from functools import lru_cache

from app.services.storage.base import StorageProvider


@lru_cache(maxsize=1)
def get_storage_provider() -> StorageProvider:
    name = os.getenv("STORAGE_PROVIDER", "local").lower()

    if name == "local":
        from app.services.storage.local_provider import LocalStorageProvider
        return LocalStorageProvider(os.getenv("UPLOAD_DIR", "./uploads"))

    if name == "s3":
        from app.services.storage.s3_provider import S3StorageProvider
        return S3StorageProvider()

    if name == "r2":
        from app.services.storage.r2_provider import R2StorageProvider
        return R2StorageProvider()

    raise ValueError(f"Unknown STORAGE_PROVIDER: '{name}'. Choose: local | s3 | r2")
