"""
Knowledge Graph Repository.
Abstract interface + SQLite implementation (via biz_knowledge_relations table).
Swap to Neo4jGraphRepository without changing any router code.
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.biz_models import BizKnowledgeRelation


# ---------------------------------------------------------------------------
# Abstract interface (swap to Neo4j by subclassing)
# ---------------------------------------------------------------------------

class GraphRepository(ABC):

    @abstractmethod
    async def add_relation(
        self,
        source_type: str,
        source_id: str,
        target_type: str,
        target_id: str,
        relation_type: str,
        strength: float = 1.0,
        auto_generated: bool = False,
        metadata: dict | None = None,
    ) -> str:
        """Create a relation. Returns the new relation ID."""

    @abstractmethod
    async def get_relations(
        self,
        source_type: str | None = None,
        source_id: str | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        relation_type: str | None = None,
    ) -> list[dict]:
        """List relations with optional filters."""

    @abstractmethod
    async def delete_relation(self, relation_id: str) -> bool:
        """Delete by ID. Returns True if deleted, False if not found."""

    @abstractmethod
    async def get_graph(
        self,
        filter_type: str | None = None,
        filter_id: str | None = None,
    ) -> dict[str, Any]:
        """Return {nodes: [...], edges: [...]} for graph visualization."""

    @abstractmethod
    async def find_related(
        self,
        source_type: str,
        source_id: str,
        relation_type: str | None = None,
    ) -> list[dict]:
        """Find all entities directly connected to the given node."""


# ---------------------------------------------------------------------------
# SQLite implementation
# ---------------------------------------------------------------------------

_ENTITY_ICONS: dict[str, str] = {
    "factory":          "🏭",
    "workflow":         "▶️",
    "agent":            "🤖",
    "asset":            "🎨",
    "marketplace_item": "🛒",
    "template":         "📋",
    "prompt":           "💬",
    "knowledge_pack":   "📦",
    "plugin":           "🔌",
    "business_pack":    "💼",
    "user":             "👤",
}


def _row_to_dict(row: BizKnowledgeRelation) -> dict:
    return {
        "id":             row.id,
        "source_type":    row.source_type,
        "source_id":      row.source_id,
        "target_type":    row.target_type,
        "target_id":      row.target_id,
        "relation_type":  row.relation_type,
        "strength":       row.strength,
        "auto_generated": row.auto_generated,
        "metadata":       row.meta or {},
        "created_at":     row.created_at.isoformat() if row.created_at else "",
    }


class SQLiteGraphRepository(GraphRepository):
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add_relation(
        self,
        source_type: str,
        source_id: str,
        target_type: str,
        target_id: str,
        relation_type: str,
        strength: float = 1.0,
        auto_generated: bool = False,
        metadata: dict | None = None,
    ) -> str:
        relation = BizKnowledgeRelation(
            id=str(uuid.uuid4()),
            source_type=source_type,
            source_id=source_id,
            target_type=target_type,
            target_id=target_id,
            relation_type=relation_type,
            strength=strength,
            auto_generated=auto_generated,
            metadata=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(relation)
        await self.db.commit()
        await self.db.refresh(relation)
        return relation.id

    async def get_relations(
        self,
        source_type: str | None = None,
        source_id: str | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        relation_type: str | None = None,
    ) -> list[dict]:
        q = select(BizKnowledgeRelation)
        filters = []
        if source_type:
            filters.append(BizKnowledgeRelation.source_type == source_type)
        if source_id:
            filters.append(BizKnowledgeRelation.source_id == source_id)
        if target_type:
            filters.append(BizKnowledgeRelation.target_type == target_type)
        if target_id:
            filters.append(BizKnowledgeRelation.target_id == target_id)
        if relation_type:
            filters.append(BizKnowledgeRelation.relation_type == relation_type)
        if filters:
            q = q.where(and_(*filters))
        q = q.order_by(BizKnowledgeRelation.created_at.desc()).limit(500)
        result = await self.db.execute(q)
        return [_row_to_dict(r) for r in result.scalars().all()]

    async def delete_relation(self, relation_id: str) -> bool:
        result = await self.db.execute(
            delete(BizKnowledgeRelation).where(BizKnowledgeRelation.id == relation_id)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def get_graph(
        self,
        filter_type: str | None = None,
        filter_id: str | None = None,
    ) -> dict[str, Any]:
        relations = await self.get_relations(
            source_type=filter_type if filter_id else None,
            source_id=filter_id,
        )
        if filter_id:
            related = await self.get_relations(target_id=filter_id)
            relations = relations + related

        # Build unique node set
        node_set: dict[str, dict] = {}
        for rel in relations:
            for side in (("source_type", "source_id"), ("target_type", "target_id")):
                t_key, id_key = side
                nid = f"{rel[t_key]}:{rel[id_key]}"
                if nid not in node_set:
                    node_set[nid] = {
                        "id":    nid,
                        "type":  rel[t_key],
                        "label": rel[id_key][:20],
                        "icon":  _ENTITY_ICONS.get(rel[t_key], "◻️"),
                    }

        edges = [
            {
                "id":            r["id"],
                "source":        f"{r['source_type']}:{r['source_id']}",
                "target":        f"{r['target_type']}:{r['target_id']}",
                "relation_type": r["relation_type"],
                "strength":      r["strength"],
            }
            for r in relations
        ]

        return {
            "nodes":       list(node_set.values()),
            "edges":       edges,
            "total_nodes": len(node_set),
            "total_edges": len(edges),
        }

    async def find_related(
        self,
        source_type: str,
        source_id: str,
        relation_type: str | None = None,
    ) -> list[dict]:
        return await self.get_relations(
            source_type=source_type,
            source_id=source_id,
            relation_type=relation_type,
        )


def get_graph_repo(db: AsyncSession) -> GraphRepository:
    """Dependency-injectable factory. Swap class to switch to Neo4j."""
    return SQLiteGraphRepository(db)
