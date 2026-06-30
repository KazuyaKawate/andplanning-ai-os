"""Business Knowledge Base — Asset management endpoints."""
from __future__ import annotations

import mimetypes
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.biz_models import BizAsset
from app.biz_schemas import BizAssetOut, BizAssetUpdate
from app.database import get_db
from app.models import User
from app.services.storage import get_storage_provider

router = APIRouter(tags=["biz-assets"])

_ALLOWED_TYPES = {
    "icon", "image", "video", "audio", "code", "prompt", "document", "model_weight",
}
_MAX_BYTES = 100 * 1024 * 1024  # 100 MB


# ---------------------------------------------------------------------------
# Public: list public assets
# ---------------------------------------------------------------------------

@router.get("/biz/assets", response_model=list[BizAssetOut])
async def list_public_assets(
    asset_type: str | None   = Query(None),
    skip:       int          = Query(0, ge=0),
    limit:      int          = Query(20, ge=1, le=100),
    db:         AsyncSession = Depends(get_db),
):
    q = select(BizAsset).where(BizAsset.is_public == True)
    if asset_type:
        q = q.where(BizAsset.asset_type == asset_type)
    q = q.order_by(BizAsset.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.get("/biz/assets/{asset_id}", response_model=BizAssetOut)
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    row = await _get_or_404(db, asset_id)
    if not row.is_public:
        raise HTTPException(403, "Asset is private")
    return _out(row)


# ---------------------------------------------------------------------------
# Authenticated: my assets
# ---------------------------------------------------------------------------

@router.get("/biz/assets/my/list", response_model=list[BizAssetOut])
async def my_assets(
    asset_type: str | None   = Query(None),
    skip:       int          = Query(0, ge=0),
    limit:      int          = Query(50, ge=1, le=100),
    db:         AsyncSession = Depends(get_db),
    user:       User         = Depends(get_current_user),
):
    q = select(BizAsset).where(BizAsset.owner_id == user.id)
    if asset_type:
        q = q.where(BizAsset.asset_type == asset_type)
    q = q.order_by(BizAsset.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [_out(r) for r in rows]


@router.post("/biz/assets/upload", response_model=BizAssetOut, status_code=201)
async def upload_asset(
    file:        UploadFile  = File(...),
    name:        str         = Form(""),
    asset_type:  str         = Form("image"),
    description: str         = Form(""),
    tags:        str         = Form(""),      # comma-separated
    is_public:   bool        = Form(False),
    db:          AsyncSession = Depends(get_db),
    user:        User         = Depends(get_current_user),
):
    if asset_type not in _ALLOWED_TYPES:
        raise HTTPException(400, f"asset_type must be one of: {sorted(_ALLOWED_TYPES)}")

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(413, f"File too large (max {_MAX_BYTES // 1024 // 1024} MB)")

    asset_id  = str(uuid.uuid4())
    filename  = file.filename or f"upload_{asset_id}"
    mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    key       = f"assets/{asset_id}/{filename}"

    provider = get_storage_provider()
    result   = await provider.upload(key, data, mime_type)

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    row = BizAsset(
        id=asset_id,
        owner_id=user.id,
        name=name or filename,
        asset_type=asset_type,
        storage_key=result.storage_key,
        storage_provider=type(provider).__name__.replace("StorageProvider", "").lower() or "local",
        public_url=result.public_url,
        mime_type=result.mime_type,
        size_bytes=result.size_bytes,
        tags=tag_list,
        description=description,
        is_public=is_public,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.patch("/biz/assets/{asset_id}", response_model=BizAssetOut)
async def update_asset(
    asset_id: str,
    body:     BizAssetUpdate,
    db:       AsyncSession = Depends(get_db),
    user:     User         = Depends(get_current_user),
):
    row = await _get_or_404(db, asset_id)
    if row.owner_id != user.id and user.role != "admin":
        raise HTTPException(403, "Not the owner of this asset")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.delete("/biz/assets/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: str,
    db:       AsyncSession = Depends(get_db),
    user:     User         = Depends(get_current_user),
):
    row = await _get_or_404(db, asset_id)
    if row.owner_id != user.id and user.role != "admin":
        raise HTTPException(403, "Not the owner of this asset")
    provider = get_storage_provider()
    await provider.delete(row.storage_key)
    await db.delete(row)
    await db.commit()


@router.post("/biz/assets/{asset_id}/use", status_code=200)
async def record_usage(
    asset_id: str,
    db:       AsyncSession = Depends(get_db),
    user:     User         = Depends(get_current_user),
):
    row = await _get_or_404(db, asset_id)
    row.usage_count = (row.usage_count or 0) + 1
    await db.commit()
    return {"ok": True, "usage_count": row.usage_count}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_404(db: AsyncSession, asset_id: str) -> BizAsset:
    row = (await db.execute(select(BizAsset).where(BizAsset.id == asset_id))).scalars().first()
    if not row:
        raise HTTPException(404, f"Asset {asset_id} not found")
    return row


def _out(row: BizAsset) -> BizAssetOut:
    def _fmt(dt: datetime | None) -> str:
        return dt.isoformat() if dt else ""
    return BizAssetOut(
        id=row.id, owner_id=row.owner_id, name=row.name, asset_type=row.asset_type,
        storage_key=row.storage_key, storage_provider=row.storage_provider,
        public_url=row.public_url, mime_type=row.mime_type, size_bytes=row.size_bytes,
        metadata=row.meta or {}, tags=row.tags or [], description=row.description,
        is_public=row.is_public, usage_count=row.usage_count or 0,
        created_at=_fmt(row.created_at),
    )
