"""
Cloudflare R2 storage provider (stub).
To activate: pip install boto3  +  set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
             R2_BUCKET_NAME, R2_ACCOUNT_ID, R2_PUBLIC_URL (optional CDN URL).
R2 is S3-compatible, so this reuses the boto3 S3 client with a custom endpoint.
"""
from __future__ import annotations

import os
from app.services.storage.base import StorageProvider, UploadResult


class R2StorageProvider(StorageProvider):
    def __init__(self) -> None:
        try:
            import boto3
            account_id = os.getenv("R2_ACCOUNT_ID", "")
            self._s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
                region_name="auto",
            )
            self._bucket   = os.getenv("R2_BUCKET_NAME", "aios-assets")
            self._pub_base = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
        except ImportError:
            raise RuntimeError("R2 provider requires boto3: pip install boto3")

    async def upload(self, key: str, data: bytes, mime_type: str) -> UploadResult:
        import asyncio
        await asyncio.to_thread(
            self._s3.put_object,
            Bucket=self._bucket, Key=key, Body=data, ContentType=mime_type,
        )
        url = f"{self._pub_base}/{key}" if self._pub_base else None
        return UploadResult(storage_key=key, public_url=url, size_bytes=len(data), mime_type=mime_type)

    async def download(self, key: str) -> bytes:
        import asyncio
        resp = await asyncio.to_thread(self._s3.get_object, Bucket=self._bucket, Key=key)
        return resp["Body"].read()

    async def delete(self, key: str) -> None:
        import asyncio
        await asyncio.to_thread(self._s3.delete_object, Bucket=self._bucket, Key=key)

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        if self._pub_base:
            return f"{self._pub_base}/{key}"
        import asyncio
        return await asyncio.to_thread(
            self._s3.generate_presigned_url,
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    async def exists(self, key: str) -> bool:
        import asyncio
        try:
            await asyncio.to_thread(self._s3.head_object, Bucket=self._bucket, Key=key)
            return True
        except Exception:
            return False
