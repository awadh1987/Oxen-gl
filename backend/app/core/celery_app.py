"""
OxenGL Enterprise Celery Application Instance.
Configures background execution queues over Redis for decoupled asynchronous processing.
"""

import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery(
    "oxengl_enterprise",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "backend.app.core.tasks",
        "backend.app.core.notifications",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    worker_concurrency=4,
    worker_prefetch_multiplier=1,
)
