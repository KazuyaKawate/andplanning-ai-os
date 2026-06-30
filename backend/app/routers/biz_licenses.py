"""Business Knowledge Base — License endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.biz_models import BizLicense
from app.biz_schemas import BizLicenseCreate, BizLicenseOut
from app.database import get_db

router = APIRouter(tags=["biz-licenses"])


@router.get("/biz/licenses", response_model=list[BizLicenseOut])
async def list_licenses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BizLicense).where(BizLicense.is_active == True))
    rows = result.scalars().all()
    return [_out(r) for r in rows]


@router.get("/biz/licenses/{license_id}", response_model=BizLicenseOut)
async def get_license(license_id: str, db: AsyncSession = Depends(get_db)):
    row = await _get_or_404(db, license_id)
    return _out(row)


@router.post("/biz/licenses", response_model=BizLicenseOut, status_code=201)
async def create_license(
    body: BizLicenseCreate,
    db:   AsyncSession = Depends(get_db),
    _:    object       = Depends(require_admin),
):
    row = BizLicense(**body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _out(row)


@router.patch("/biz/licenses/{license_id}", response_model=BizLicenseOut)
async def update_license(
    license_id: str,
    body:       dict,
    db:         AsyncSession = Depends(get_db),
    _:          object       = Depends(require_admin),
):
    row = await _get_or_404(db, license_id)
    allowed = {"name", "name_en", "description", "terms_text", "is_active", "can_modify",
               "can_sublicense", "can_resell", "max_users", "attribution_req"}
    for k, v in body.items():
        if k in allowed:
            setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _out(row)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_404(db: AsyncSession, lid: str) -> BizLicense:
    row = (await db.execute(select(BizLicense).where(BizLicense.id == lid))).scalars().first()
    if not row:
        raise HTTPException(404, f"License {lid} not found")
    return row


def _out(row: BizLicense) -> BizLicenseOut:
    return BizLicenseOut(
        id=row.id, name=row.name, name_en=row.name_en,
        license_type=row.license_type, can_modify=row.can_modify,
        can_sublicense=row.can_sublicense, can_resell=row.can_resell,
        max_users=row.max_users, attribution_req=row.attribution_req,
        description=row.description, is_active=row.is_active,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )
