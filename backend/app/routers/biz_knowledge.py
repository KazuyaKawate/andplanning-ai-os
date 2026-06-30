"""Business Knowledge Base — Knowledge Relation Graph endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, optional_user
from app.biz_schemas import BizRelationCreate, BizRelationOut, BizGraphOut
from app.database import get_db
from app.models import User
from app.repositories.knowledge_graph_repo import get_graph_repo

router = APIRouter(tags=["biz-knowledge"])


# ---------------------------------------------------------------------------
# Relations
# ---------------------------------------------------------------------------

@router.get("/biz/knowledge/relations", response_model=list[BizRelationOut])
async def list_relations(
    source_type:   str | None   = Query(None),
    source_id:     str | None   = Query(None),
    target_type:   str | None   = Query(None),
    target_id:     str | None   = Query(None),
    relation_type: str | None   = Query(None),
    db:            AsyncSession = Depends(get_db),
):
    repo = get_graph_repo(db)
    rows = await repo.get_relations(
        source_type=source_type, source_id=source_id,
        target_type=target_type, target_id=target_id,
        relation_type=relation_type,
    )
    return [_rel_out(r) for r in rows]


@router.post("/biz/knowledge/relations", response_model=BizRelationOut, status_code=201)
async def create_relation(
    body: BizRelationCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    repo = get_graph_repo(db)
    try:
        rid = await repo.add_relation(
            source_type=body.source_type,
            source_id=body.source_id,
            target_type=body.target_type,
            target_id=body.target_id,
            relation_type=body.relation_type,
            strength=body.strength,
            auto_generated=False,
            meta=body.metadata,
        )
    except IntegrityError:
        raise HTTPException(409, "This relation already exists")

    rows = await repo.get_relations(source_type=body.source_type, source_id=body.source_id,
                                    target_type=body.target_type, target_id=body.target_id,
                                    relation_type=body.relation_type)
    row = next((r for r in rows if r["id"] == rid), rows[0] if rows else None)
    if not row:
        raise HTTPException(500, "Relation created but not found")
    return _rel_out(row)


@router.delete("/biz/knowledge/relations/{relation_id}", status_code=204)
async def delete_relation(
    relation_id: str,
    db:          AsyncSession = Depends(get_db),
    user:        User         = Depends(get_current_user),
):
    repo = get_graph_repo(db)
    deleted = await repo.delete_relation(relation_id)
    if not deleted:
        raise HTTPException(404, f"Relation {relation_id} not found")


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

@router.get("/biz/knowledge/graph", response_model=BizGraphOut)
async def get_graph(
    filter_type: str | None   = Query(None, description="entity type to center graph on"),
    filter_id:   str | None   = Query(None, description="entity ID to center graph on"),
    db:          AsyncSession = Depends(get_db),
):
    repo  = get_graph_repo(db)
    graph = await repo.get_graph(filter_type=filter_type, filter_id=filter_id)
    return BizGraphOut(
        nodes=[{**n} for n in graph["nodes"]],
        edges=[{**e} for e in graph["edges"]],
        total_nodes=graph["total_nodes"],
        total_edges=graph["total_edges"],
    )


# ---------------------------------------------------------------------------
# AI auto-generate relations for an entity
# ---------------------------------------------------------------------------

@router.post("/biz/knowledge/relations/auto", status_code=201)
async def auto_generate_relations(
    source_type: str,
    source_id:   str,
    db:          AsyncSession = Depends(get_db),
    user:        User         = Depends(get_current_user),
):
    """
    AI-driven relation generation placeholder.
    Phase 1: builds basic relations from entity metadata.
    Future: use AI to infer semantic relations across entities.
    """
    repo    = get_graph_repo(db)
    created = 0

    # Factories use Workflows
    if source_type == "factory":
        from sqlalchemy import select
        from app.models import Workflow
        wf_rows = (await db.execute(
            select(Workflow).where(Workflow.factory_id == source_id).limit(20)
        )).scalars().all()
        for wf in wf_rows:
            try:
                await repo.add_relation(
                    source_type="factory", source_id=source_id,
                    target_type="workflow", target_id=wf.id,
                    relation_type="contains", strength=1.0,
                    auto_generated=True,
                    metadata={"workflow_name": wf.name},
                )
                created += 1
            except Exception:
                pass

    # Marketplace items link to their source entity
    if source_type == "marketplace_item":
        from sqlalchemy import select
        from app.biz_models import BizMarketplaceItem
        item = (await db.execute(
            select(BizMarketplaceItem).where(BizMarketplaceItem.id == source_id)
        )).scalars().first()
        if item and item.item_id and item.item_type:
            try:
                await repo.add_relation(
                    source_type="marketplace_item", source_id=source_id,
                    target_type=item.item_type, target_id=item.item_id,
                    relation_type="derives_from", strength=1.0,
                    auto_generated=True,
                )
                created += 1
            except Exception:
                pass

    return {"ok": True, "source_type": source_type, "source_id": source_id, "relations_created": created}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rel_out(r: dict) -> BizRelationOut:
    return BizRelationOut(
        id=r["id"], source_type=r["source_type"], source_id=r["source_id"],
        target_type=r["target_type"], target_id=r["target_id"],
        relation_type=r["relation_type"], strength=r["strength"],
        auto_generated=r["auto_generated"], metadata=r["metadata"],
        created_at=r["created_at"],
    )
