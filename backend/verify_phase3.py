"""
E2E validation script for Business Engine Phase 3 (Executor API).
Performs database setup, token generation, streaming run endpoint call, and cancel endpoint call.
"""
from __future__ import annotations

import asyncio
import httpx
import json
from datetime import datetime, timezone
from sqlalchemy import select

# Set up paths so we can import from backend app
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import User, BusinessClient, BusinessDeal, BusinessTask
from app.auth import create_access_token

async def setup_test_data():
    """Ensure we have a user, client, deal, and task for testing."""
    async with AsyncSessionLocal() as session:
        # 1. Get or create a User
        res = await session.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No user found, creating a test user...")
            user = User(
                email="test_business_exec@aios.com",
                role="admin",
                password_hash="fake-hash-for-testing",
                full_name="Business Exec Test",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        else:
            print(f"Using existing user: {user.email} (ID: {user.id})")

        # 2. Create a test BusinessClient
        client = BusinessClient(
            name="山田 太郎",
            company="テック・ソリューションズ株式会社",
            email="yamada@tech-solutions.co.jp",
            phone="03-1234-5678",
            status="active"
        )
        session.add(client)
        await session.commit()
        await session.refresh(client)
        print(f"Created sample client: {client.name} (ID: {client.id})")

        # 3. Create a test BusinessDeal linked to the client
        deal = BusinessDeal(
            client_id=client.id,
            title="AI導入コンサルティング案件",
            status="proposal",
            amount=1500000.0,
            memo="自社AIOSシステムの導入を希望している大口クライアント。"
        )
        session.add(deal)
        await session.commit()
        await session.refresh(deal)
        print(f"Created sample deal: {deal.title} (ID: {deal.id})")

        # 4. Create a test BusinessTask linked to the deal
        task = BusinessTask(
            deal_id=deal.id,
            title="AI導入初期提案メールの作成",
            description="クライアントに向けて、面談のお礼とAI導入のメリットを記載した初期提案メールのドラフトを作成してください。",
            status="todo"
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)
        print(f"Created sample task: {task.title} (ID: {task.id})")

        # 5. Generate Access Token
        token = create_access_token(user.id, user.email, user.role)
        print("Generated authentication token successfully.")

        return user, client, deal, task, token

async def clean_up_test_data(client_id, deal_id, task_id):
    """Clean up the test data so we don't pollute the db."""
    async with AsyncSessionLocal() as session:
        print("\nCleaning up test data...")
        # Delete task
        res_t = await session.execute(select(BusinessTask).where(BusinessTask.id == task_id))
        t = res_t.scalar_one_or_none()
        if t:
            await session.delete(t)
        
        # Delete deal
        res_d = await session.execute(select(BusinessDeal).where(BusinessDeal.id == deal_id))
        d = res_d.scalar_one_or_none()
        if d:
            await session.delete(d)

        # Delete client
        res_c = await session.execute(select(BusinessClient).where(BusinessClient.id == client_id))
        c = res_c.scalar_one_or_none()
        if c:
            await session.delete(c)
            
        await session.commit()
        print("Cleanup completed successfully.")

async def verify_task_state(task_id):
    """Verify and print the task state in the database."""
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(BusinessTask).where(BusinessTask.id == task_id))
        task = res.scalar_one_or_none()
        if task:
            print("\n--- Current Database State of the Task ---")
            print(f"ID: {task.id}")
            print(f"Status: {task.status}")
            print(f"Executed At: {task.executed_at}")
            print(f"Error Message: {task.error_msg}")
            print(f"Result (truncated): {task.result_text[:200] if task.result_text else 'None'}")
            return task
        else:
            print(f"Task '{task_id}' not found in DB.")
            return None

async def set_task_to_in_progress(task_id):
    """Manually update task status to in_progress to test cancellation."""
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(BusinessTask).where(BusinessTask.id == task_id))
        task = res.scalar_one_or_none()
        if task:
            task.status = "in_progress"
            await session.commit()
            print(f"\nTask {task_id} status manually set to 'in_progress' for cancellation test.")

async def main():
    # 1. Setup sample data
    user, client, deal, task, token = await setup_test_data()
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        # 2. Test execution run endpoint (Streaming)
        run_url = f"http://127.0.0.1:8099/api/business-tasks/{task.id}/run"
        print(f"\nCalling streaming run endpoint: {run_url}")
        
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            async with http_client.stream("POST", run_url, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    print(f"Error: Status Code {response.status_code}. Response: {body.decode()}")
                    return
                
                print("--- Streaming Output Start ---")
                async for line in response.aiter_lines():
                    if line.strip():
                        print(line)
                print("--- Streaming Output End ---")

        # 3. Verify Database State
        await verify_task_state(task.id)

        # 4. Test execution cancel endpoint
        await set_task_to_in_progress(task.id)
        
        cancel_url = f"http://127.0.0.1:8099/api/business-tasks/{task.id}/cancel"
        print(f"\nCalling cancel endpoint: {cancel_url}")
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            cancel_resp = await http_client.post(cancel_url, headers=headers)
            print(f"Cancel Response Code: {cancel_resp.status_code}")
            print(f"Cancel Response: {cancel_resp.text}")
            
            assert cancel_resp.status_code == 200, "Cancel request should succeed with 200 OK"
            resp_json = cancel_resp.json()
            assert resp_json["status"] == "todo", "Task status should be reset to 'todo' after cancel"
            assert resp_json["error_msg"] == "Cancelled by user", "Error message should say 'Cancelled by user'"

        # 5. Verify Database State after cancel
        await verify_task_state(task.id)

    finally:
        # 6. Cleanup
        await clean_up_test_data(client.id, deal.id, task.id)

if __name__ == "__main__":
    asyncio.run(main())
