"""
Organization CRUD — Business Engine Phase 1.

GET    /api/orgs              — list organizations
POST   /api/orgs              — create organization
GET    /api/orgs/me           — list my organizations
GET    /api/orgs/{slug}       — get organization
PATCH  /api/orgs/{slug}       — update organization (owner/admin)
DELETE /api/orgs/{slug}       — deactivate organization (owner/platform-admin)

GET    /api/orgs/{slug}/members               — list members
PATCH  /api/orgs/{slug}/members/{user_id}     — change member role (owner/admin)
DELETE /api/orgs/{slug}/members/{user_id}     — remove member (owner/admin)

POST   /api/orgs/{slug}/invites               — send invite (owner/admin)
GET    /api/orgs/{slug}/invites               — list invites (owner/admin)
DELETE /api/orgs/{slug}/invites/{invite_id}   — revoke invite (owner/admin)
POST   /api/orgs/invites/accept               — accept invite by token
"""
from __future__ import annotations

import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Organization, OrganizationInvite, OrganizationMember, User
from app.schemas import (
    OrgAcceptInvite, OrgCreate, OrgInviteCreate, OrgInviteOut,
    OrgMemberOut, OrgMemberUpdate, OrgOut, OrgUpdate,
)

router = APIRouter(tags=["orgs"])

_INVITE_EXPIRE_DAYS = 7


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9\-]", "-", name.lower().strip())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:50] or "org"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    candidate = base
    for i in range(1, 20):
        exists = (await db.execute(
            select(Organization).where(Organization.slug == candidate)
        )).scalars().first()
        if not exists:
            return candidate
        candidate = f"{base}-{i}"
    return f"{base}-{secrets.token_hex(4)}"


async def _get_org_or_404(db: AsyncSession, slug: str) -> Organization:
    row = (await db.execute(
        select(Organization).where(Organization.slug == slug)
    )).scalars().first()
    if not row:
        raise HTTPException(404, f"Organization '{slug}' not found")
    return row


async def _get_member_role(db: AsyncSession, org_id: str, user_id: str) -> str | None:
    row = (await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )).scalars().first()
    return row.role if row else None


async def _require_role(
    db: AsyncSession, org: Organization, user: User, allowed: list[str]
) -> str:
    """Return effective role or raise 403. Platform-admins always pass."""
    if user.role == "admin":
        return "platform_admin"
    if org.owner_id == user.id:
        return "owner"
    role = await _get_member_role(db, org.id, user.id)
    if role not in allowed:
        raise HTTPException(403, "Insufficient organization role")
    return role


async def _member_count(db: AsyncSession, org_id: str) -> int:
    res = await db.execute(
        select(func.count()).select_from(OrganizationMember)
        .where(OrganizationMember.org_id == org_id)
    )
    return res.scalar_one()


def _fmt(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""


def _org_out(org: Organization, count: int = 0) -> OrgOut:
    return OrgOut(
        id=org.id, name=org.name, slug=org.slug,
        description=org.description, plan=org.plan,
        owner_id=org.owner_id, max_members=org.max_members,
        is_active=org.is_active, avatar_url=org.avatar_url,
        website_url=org.website_url, member_count=count,
        created_at=_fmt(org.created_at), updated_at=_fmt(org.updated_at),
    )


# ---------------------------------------------------------------------------
# Organization CRUD
# ---------------------------------------------------------------------------

@router.get("/orgs", response_model=list[OrgOut])
async def list_orgs(
    active_only: bool = Query(True),
    skip:        int  = Query(0, ge=0),
    limit:       int  = Query(50, ge=1, le=200),
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Platform-admin: all orgs. Regular user: only orgs they belong to."""
    q = select(Organization)
    if active_only:
        q = q.where(Organization.is_active == True)
    if user.role != "admin":
        member_org_ids = (await db.execute(
            select(OrganizationMember.org_id).where(OrganizationMember.user_id == user.id)
        )).scalars().all()
        owned_org_ids = (await db.execute(
            select(Organization.id).where(Organization.owner_id == user.id)
        )).scalars().all()
        visible = list(set(list(member_org_ids) + list(owned_org_ids)))
        if not visible:
            return []
        q = q.where(Organization.id.in_(visible))
    q = q.order_by(Organization.created_at.desc()).offset(skip).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    result = []
    for org in rows:
        count = await _member_count(db, org.id)
        result.append(_org_out(org, count))
    return result


@router.get("/orgs/me", response_model=list[OrgOut])
async def my_orgs(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Return all organizations the current user owns or is a member of."""
    member_org_ids = (await db.execute(
        select(OrganizationMember.org_id).where(OrganizationMember.user_id == user.id)
    )).scalars().all()
    owned = (await db.execute(
        select(Organization).where(Organization.owner_id == user.id, Organization.is_active == True)
    )).scalars().all()
    member_orgs = []
    if member_org_ids:
        member_orgs = (await db.execute(
            select(Organization).where(
                Organization.id.in_(member_org_ids),
                Organization.is_active == True,
            )
        )).scalars().all()
    seen = set()
    result = []
    for org in list(owned) + list(member_orgs):
        if org.id not in seen:
            seen.add(org.id)
            count = await _member_count(db, org.id)
            result.append(_org_out(org, count))
    return result


@router.post("/orgs", response_model=OrgOut, status_code=201)
async def create_org(
    body: OrgCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    base_slug = _slugify(body.name)
    slug = await _unique_slug(db, base_slug)
    org = Organization(
        name=body.name.strip(),
        slug=slug,
        description=body.description,
        plan="free",
        owner_id=user.id,
    )
    db.add(org)
    await db.flush()
    # Owner is also a member with role "owner"
    member = OrganizationMember(org_id=org.id, user_id=user.id, role="owner")
    db.add(member)
    # Set user's primary org if not set
    if not user.org_id:
        user.org_id = org.id
    await db.commit()
    await db.refresh(org)
    return _org_out(org, 1)


@router.get("/orgs/{slug}", response_model=OrgOut)
async def get_org(
    slug: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    count = await _member_count(db, org.id)
    return _org_out(org, count)


@router.patch("/orgs/{slug}", response_model=OrgOut)
async def update_org(
    slug: str,
    body: OrgUpdate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin"])
    updates = body.model_dump(exclude_none=True)
    # Only platform-admin can change plan
    if "plan" in updates and user.role != "admin":
        del updates["plan"]
    for k, v in updates.items():
        setattr(org, k, v)
    org.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(org)
    count = await _member_count(db, org.id)
    return _org_out(org, count)


@router.delete("/orgs/{slug}", status_code=204)
async def deactivate_org(
    slug: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner"])
    org.is_active = False
    org.updated_at = datetime.now(timezone.utc)
    await db.commit()


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------

@router.get("/orgs/{slug}/members", response_model=list[OrgMemberOut])
async def list_members(
    slug: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin", "developer", "viewer"])
    rows = (await db.execute(
        select(OrganizationMember).where(OrganizationMember.org_id == org.id)
    )).scalars().all()
    result = []
    for m in rows:
        u = (await db.execute(select(User).where(User.id == m.user_id))).scalars().first()
        if u:
            result.append(OrgMemberOut(
                user_id=m.user_id, email=u.email,
                display_name=u.display_name, role=m.role,
                joined_at=_fmt(m.joined_at),
            ))
    return result


@router.patch("/orgs/{slug}/members/{user_id}", response_model=OrgMemberOut)
async def update_member_role(
    slug:    str,
    user_id: str,
    body:    OrgMemberUpdate,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin"])
    if body.role not in ("admin", "developer", "viewer"):
        raise HTTPException(422, "role must be admin | developer | viewer")
    member = (await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org.id,
            OrganizationMember.user_id == user_id,
        )
    )).scalars().first()
    if not member:
        raise HTTPException(404, "Member not found")
    if org.owner_id == user_id:
        raise HTTPException(400, "Cannot change owner's role via this endpoint")
    member.role = body.role
    await db.commit()
    target = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    return OrgMemberOut(
        user_id=user_id, email=target.email if target else "",
        display_name=target.display_name if target else "",
        role=member.role, joined_at=_fmt(member.joined_at),
    )


@router.delete("/orgs/{slug}/members/{user_id}", status_code=204)
async def remove_member(
    slug:    str,
    user_id: str,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin"])
    if org.owner_id == user_id:
        raise HTTPException(400, "Cannot remove the organization owner")
    member = (await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org.id,
            OrganizationMember.user_id == user_id,
        )
    )).scalars().first()
    if not member:
        raise HTTPException(404, "Member not found")
    await db.delete(member)
    await db.commit()


# ---------------------------------------------------------------------------
# Invites
# ---------------------------------------------------------------------------

@router.get("/orgs/{slug}/invites", response_model=list[OrgInviteOut])
async def list_invites(
    slug: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin"])
    rows = (await db.execute(
        select(OrganizationInvite).where(OrganizationInvite.org_id == org.id)
        .order_by(OrganizationInvite.created_at.desc())
    )).scalars().all()
    return [_invite_out(r) for r in rows]


@router.post("/orgs/{slug}/invites", response_model=OrgInviteOut, status_code=201)
async def create_invite(
    slug: str,
    body: OrgInviteCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin"])
    if body.role not in ("admin", "developer", "viewer"):
        raise HTTPException(422, "role must be admin | developer | viewer")
    # Revoke any existing pending invite for the same email
    existing = (await db.execute(
        select(OrganizationInvite).where(
            OrganizationInvite.org_id == org.id,
            OrganizationInvite.email == body.email.lower(),
            OrganizationInvite.status == "pending",
        )
    )).scalars().first()
    if existing:
        existing.status = "revoked"
    invite = OrganizationInvite(
        org_id=org.id,
        email=body.email.lower().strip(),
        role=body.role,
        invited_by=user.id,
        token=secrets.token_urlsafe(32),
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=_INVITE_EXPIRE_DAYS),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return _invite_out(invite)


@router.delete("/orgs/{slug}/invites/{invite_id}", status_code=204)
async def revoke_invite(
    slug:      str,
    invite_id: str,
    db:        AsyncSession = Depends(get_db),
    user:      User         = Depends(get_current_user),
):
    org = await _get_org_or_404(db, slug)
    await _require_role(db, org, user, ["owner", "admin"])
    invite = (await db.execute(
        select(OrganizationInvite).where(
            OrganizationInvite.id == invite_id,
            OrganizationInvite.org_id == org.id,
        )
    )).scalars().first()
    if not invite:
        raise HTTPException(404, "Invite not found")
    invite.status = "revoked"
    await db.commit()


@router.post("/orgs/invites/accept", response_model=OrgOut)
async def accept_invite(
    body: OrgAcceptInvite,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    invite = (await db.execute(
        select(OrganizationInvite).where(
            OrganizationInvite.token == body.token,
            OrganizationInvite.status == "pending",
        )
    )).scalars().first()
    if not invite:
        raise HTTPException(404, "Invalid or already-used invite token")
    if datetime.now(timezone.utc) > invite.expires_at:
        invite.status = "expired"
        await db.commit()
        raise HTTPException(410, "Invite has expired")
    if invite.email != user.email:
        raise HTTPException(403, "This invite was sent to a different email address")
    # Check already a member
    existing_member = (await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == invite.org_id,
            OrganizationMember.user_id == user.id,
        )
    )).scalars().first()
    if not existing_member:
        member = OrganizationMember(org_id=invite.org_id, user_id=user.id, role=invite.role)
        db.add(member)
        if not user.org_id:
            user.org_id = invite.org_id
    invite.status = "accepted"
    invite.accepted_at = datetime.now(timezone.utc)
    await db.commit()
    org = (await db.execute(
        select(Organization).where(Organization.id == invite.org_id)
    )).scalars().first()
    count = await _member_count(db, org.id)
    return _org_out(org, count)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _invite_out(inv: OrganizationInvite) -> OrgInviteOut:
    return OrgInviteOut(
        id=inv.id, org_id=inv.org_id, email=inv.email,
        role=inv.role, invited_by=inv.invited_by, status=inv.status,
        expires_at=_fmt(inv.expires_at), created_at=_fmt(inv.created_at),
    )
