"""
AWS S3 storage provider (stub).
To activate: pip install boto3  +  set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME.
"""
from __future__ import annotations

import os
from app.services.storage.base import StorageProvider, UploadResult


class S3StorageProvider(StorageProvider):
    def __init__(self) -> None:
        try:
            import boto3
            self._s3 = boto3.client(
                "s3",
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_REGION", "ap-northeast-1"),
            )
            self._bucket = os.getenv("S3_BUCKET_NAME", "aios-assets")
        except ImportError:
            raise RuntimeError("S3 provider requires boto3: pip install boto3")

    async def upload(self, key: str, data: bytes, mime_type: str) -> UploadResult:
        import asyncio
        await asyncio.to_thread(
            self._s3.put_object,
            Bucket=self._bucket, Key=key, Body=data, ContentType=mime_type,
        )
        region = os.getenv("AWS_REGION", "ap-northeast-1")
        url = f"https://{self._bucket}.s3.{region}.amazonaws.com/{key}"
        return UploadResult(storage_key=key, public_url=url, size_bytes=len(data), mime_type=mime_type)

    async def download(self, key: str) -> bytes:
        import asyncio
        resp = await asyncio.to_thread(self._s3.get_object, Bucket=self._bucket, Key=key)
        return resp["Body"].read()

    async def delete(self, key: str) -> None:
        import asyncio
        await asyncio.to_thread(self._s3.delete_object, Bucket=self._bucket, Key=key)

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
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
