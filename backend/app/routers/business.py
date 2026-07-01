from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    BusinessClient,
    BusinessDeal,
    BusinessTask,
)
from app.schemas import (
    BusinessClientCreate,
    BusinessClientOut,
    BusinessClientUpdate,
    BusinessDealCreate,
    BusinessDealOut,
    BusinessDealUpdate,
    BusinessTaskCreate,
    BusinessTaskOut,
    BusinessTaskUpdate,
    BusinessWorkflowRequest,
)

router = APIRouter(
    prefix="/business",
    tags=["Business Engine"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/health")
async def business_health():
    return {"status": "ok", "module": "Business Engine Phase 1"}


# -------------------------
# Clients
# -------------------------

@router.post("/clients", response_model=BusinessClientOut)
async def create_client(
    data: BusinessClientCreate,
    db: AsyncSession = Depends(get_db),
):
    client = BusinessClient(**data.model_dump(), status="lead")
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/clients", response_model=list[BusinessClientOut])
async def list_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BusinessClient))
    return result.scalars().all()


@router.get("/clients/{client_id}", response_model=BusinessClientOut)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessClient).where(BusinessClient.id == client_id)
    )
    client = result.scalar_one_or_none()

    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    return client


@router.patch("/clients/{client_id}", response_model=BusinessClientOut)
async def update_client(
    client_id: int,
    data: BusinessClientUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessClient).where(BusinessClient.id == client_id)
    )
    client = result.scalar_one_or_none()

    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(client, key, value)

    await db.commit()
    await db.refresh(client)

    return client


@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessClient).where(BusinessClient.id == client_id)
    )
    client = result.scalar_one_or_none()

    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)
    await db.commit()

    return {"status": "deleted", "id": client_id}


# -------------------------
# Deals
# -------------------------

@router.post("/deals", response_model=BusinessDealOut)
async def create_deal(
    data: BusinessDealCreate,
    db: AsyncSession = Depends(get_db),
):
    deal = BusinessDeal(**data.model_dump())
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return deal


@router.get("/deals", response_model=list[BusinessDealOut])
async def list_deals(
    client_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(BusinessDeal)
    if client_id is not None:
        query = query.where(BusinessDeal.client_id == client_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/deals/{deal_id}", response_model=BusinessDealOut)
async def get_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessDeal).where(BusinessDeal.id == deal_id)
    )
    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")

    return deal


@router.patch("/deals/{deal_id}", response_model=BusinessDealOut)
async def update_deal(
    deal_id: int,
    data: BusinessDealUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessDeal).where(BusinessDeal.id == deal_id)
    )
    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(deal, key, value)

    await db.commit()
    await db.refresh(deal)
    return deal


@router.delete("/deals/{deal_id}")
async def delete_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessDeal).where(BusinessDeal.id == deal_id)
    )
    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")

    await db.delete(deal)
    await db.commit()

    return {"status": "deleted", "id": deal_id}


# -------------------------
# Tasks
# -------------------------

@router.post("/tasks", response_model=BusinessTaskOut)
async def create_task(
    data: BusinessTaskCreate,
    db: AsyncSession = Depends(get_db),
):
    task = BusinessTask(**data.model_dump())

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return task


@router.get("/tasks", response_model=list[BusinessTaskOut])
async def list_tasks(
    deal_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(BusinessTask)
    if deal_id is not None:
        query = query.where(BusinessTask.deal_id == deal_id)
    if status is not None:
        query = query.where(BusinessTask.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/tasks/next/todo")
async def get_next_todo_task(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessTask)
        .where(BusinessTask.status == "todo")
        .order_by(BusinessTask.created_at.asc())
        .limit(1)
    )

    task = result.scalar_one_or_none()

    if task is None:
        return {"status": "no_task", "task": None}

    return {
        "status": "found",
        "task": task,
    }


@router.post("/tasks/claim-next")
async def claim_next_task(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessTask)
        .where(BusinessTask.status == "todo")
        .order_by(BusinessTask.created_at.asc())
        .limit(1)
    )

    task = result.scalar_one_or_none()

    if task is None:
        return {"status": "no_task", "task": None}

    task.status = "in_progress"

    await db.commit()
    await db.refresh(task)

    return {
        "status": "claimed",
        "task": task,
    }


@router.get("/tasks/{task_id}", response_model=BusinessTaskOut)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessTask).where(BusinessTask.id == task_id)
    )

    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.patch("/tasks/{task_id}/status", response_model=BusinessTaskOut)
async def update_task_status(
    task_id: int,
    status: str = None,
    result_text: str = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessTask).where(BusinessTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if status is not None:
        if status == "in progress":
            status = "in_progress"
        task.status = status

    if result_text is not None:
        task.result_text = result_text

    await db.commit()
    await db.refresh(task)

    return task


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessTask).where(BusinessTask.id == task_id)
    )

    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()

    return {
        "status": "deleted",
        "id": task_id,
    }


# -------------------------
# Workflows
# -------------------------

BUSINESS_TEMPLATES = {
    "standard_sales": [
        {"title": "初回ヒアリング", "description": "クライアントの課題、予算、希望納期などを面談にてヒアリングし、メモに記録します。"},
        {"title": "AI提案書の作成", "description": "ヒアリング内容に基づき、クライアントが抱える課題を解決するためのAI導入提案メールまたは提案書のドラフトを作成します。"},
        {"title": "お見積・条件整理", "description": "案件金額やスコープに応じた詳細なお見積書および契約条件のドラフトを整理します。"},
        {"title": "次回フォロー連絡", "description": "提案書送付後、検討状況のフォローアップ、面談日程の調整メールを送付します。"},
    ],
    "video_production": [
        {"title": "動画構成・企画案の作成", "description": "案件要件に沿った動画のプロット、ターゲット層、メインメッセージの企画案を作成します。"},
        {"title": "AI台本・ナレーション作成", "description": "企画案に基づき、AIナレーションおよび秒数ごとのカット割りを想定した台本（スクリプト）を作成します。"},
        {"title": "撮影・編集用ガイド作成", "description": "撮影および動画編集用の詳細な演出指示、BGM選定ガイドをまとめます。"},
    ],
    "content_marketing": [
        {"title": "キーワード・競合分析", "description": "ターゲットキーワード、競合サイトのSEO記事分析、流入想定キーワードを抽出します。"},
        {"title": "AIブログ記事作成", "description": "抽出したキーワードをもとに、見出し構成、本文、メタディスクリプション、SNS告知文を含んだブログ記事のドラフトを作成します。"},
        {"title": "配信スケジュール調整", "description": "記事の公開予定日、メルマガ配信、各SNSでの告知スケジュールをリストアップします。"},
    ],
    "business_automation": [
        {"title": "業務プロセス可視化", "description": "自動化対象の既存の業務フロー（ステップ、ツール、入出力データ）をリストアップします。"},
        {"title": "AI自動化設計案の策定", "description": "どの部分にAIOSや自動化スクリプト、RPAを適用するかを定義した設計書ドラフトを作成します。"},
        {"title": "テストシナリオの作成", "description": "自動化適用後の正常動作、例外処理を検証するためのテスト用テストケースを作成します。"},
    ]
}

@router.post("/workflows/start")
async def start_business_workflow(
    data: BusinessWorkflowRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BusinessDeal).where(BusinessDeal.id == data.deal_id)
    )
    deal = result.scalar_one_or_none()

    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")

    existing = await db.execute(
        select(BusinessTask).where(BusinessTask.deal_id == deal.id)
    )
    existing_tasks = existing.scalars().all()

    if existing_tasks:
        return {
            "status": "already_started",
            "deal_id": deal.id,
            "existing_tasks": existing_tasks,
        }

    workflow_type = data.workflow_type if data.workflow_type in BUSINESS_TEMPLATES else "standard_sales"
    templates = BUSINESS_TEMPLATES[workflow_type]

    created_tasks = []

    for item in templates:
        task = BusinessTask(
            deal_id=deal.id,
            title=item["title"],
            description=item["description"],
            status="todo",
        )
        db.add(task)
        created_tasks.append(task)

    await db.commit()

    for task in created_tasks:
        await db.refresh(task)

    return {
        "status": "workflow_started",
        "deal_id": deal.id,
        "created_tasks": created_tasks,
    }
