"""
Storage Provider abstract interface.
Switch providers via STORAGE_PROVIDER env var: local | s3 | r2 | supabase
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class UploadResult:
    storage_key:      str          # provider-relative path (e.g. "assets/uuid/file.png")
    public_url:       str | None   # CDN/public URL if available
    size_bytes:       int
    mime_type:        str
    extra:            dict = field(default_factory=dict)


class StorageProvider(ABC):
    """Abstract storage backend. Implement to support new providers."""

    @abstractmethod
    async def upload(self, key: str, data: bytes, mime_type: str) -> UploadResult:
        """Upload bytes at the given key. Creates parent directories if needed."""

    @abstractmethod
    async def download(self, key: str) -> bytes:
        """Download and return bytes for the given key."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete the object at key. No-op if not found."""

    @abstractmethod
    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Return a URL to access the object (signed URL for S3/R2, local path for local)."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Return True if the key exists in storage."""
