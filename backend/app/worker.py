import os
from celery import Celery
from app.config import settings

celery_app = Celery(
    "worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.task_routes = {
    "app.tasks.*": {"queue": "aios-tasks"},
}

@celery_app.task(name="test_task")
def test_task(name: str):
    return f"Hello, {name} from AIOS Worker!"
