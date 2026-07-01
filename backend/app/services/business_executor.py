"""
AIOS Business Executor — executes business-related tasks using AI.
Provides: context building, system prompts, and prompt formatting.
"""
from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models import BusinessTask, BusinessDeal, BusinessClient

logger = logging.getLogger("aios.business_executor")

BUSINESS_EXECUTOR_SYSTEM_PROMPT = """You are the AIOS Business Executor — an autonomous business operations agent embedded in the AI OS.

## Your Role
You execute business-related tasks based on the context of a specific Deal and Client. Your output should be a complete, highly professional business artifact (e.g. an email draft, a contract, a proposal, or next-step recommendations) depending on the task's title and description.

## Guidelines
- Write clear, high-quality, and highly professional content suitable for actual business communications.
- Adhere to any specific tones or formats requested (e.g., polite Japanese business speech, professional email structure).
- Do not invent details that contradict the provided Client or Deal info.
- If some detail is missing, make reasonable professional assumptions or leave a placeholder in brackets (e.g., [会社名], [担当者名]).
- Do not output any conversational meta-chitchat before or after the artifact. Only output the actual artifact (e.g. the email draft itself).
"""

async def build_business_context(db: AsyncSession, task_id: int) -> dict:
    """Fetch task, its deal, and client to build a dictionary of business context."""
    # 1. Fetch Task
    task_res = await db.execute(select(BusinessTask).where(BusinessTask.id == task_id))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail=f"BusinessTask '{task_id}' not found")

    # 2. Fetch Deal
    deal_res = await db.execute(select(BusinessDeal).where(BusinessDeal.id == task.deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail=f"BusinessDeal '{task.deal_id}' not found for task '{task_id}'")

    # 3. Fetch Client
    client_res = await db.execute(select(BusinessClient).where(BusinessClient.id == deal.client_id))
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail=f"BusinessClient '{deal.client_id}' not found for deal '{deal.id}'")

    return {
        "task": task,
        "deal": deal,
        "client": client
    }

def format_business_prompt(task: BusinessTask, deal: BusinessDeal, client: BusinessClient) -> str:
    """Format prompt for the LLM using the business context."""
    return (
        f"以下のビジネスコンテキストに基づいて、指定されたタスクを実効し、プロフェッショナルな成果物を作成してください。\n\n"
        f"### クライアント情報\n"
        f"- 名前: {client.name}\n"
        f"- 会社名: {client.company or '（未設定）'}\n"
        f"- メールアドレス: {client.email or '（未設定）'}\n"
        f"- 電話番号: {client.phone or '（未設定）'}\n"
        f"- ステータス: {client.status}\n\n"
        f"### 案件情報\n"
        f"- タイトル: {deal.title}\n"
        f"- ステータス: {deal.status}\n"
        f"- 金額: {deal.amount or '（未設定）'} 元\n"
        f"- 予定クローズ日: {deal.expected_close_date or '（未設定）'}\n"
        f"- メモ: {deal.memo or '（未設定）'}\n\n"
        f"### 実行するタスク\n"
        f"- タスク名: {task.title}\n"
        f"- タスク詳細: {task.description or '（未設定）'}\n\n"
        f"成果物（メール本文、提案書、ネクストアクション一覧など）のドラフトを作成してください。余計な前置きや説明は一切省き、成果物のテキストのみを出力してください。"
    )
