# app/models/basemodel.py
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


class BaseModel:
    def __init__(self) -> None:
        self.id = str(uuid4())
        now = datetime.now(timezone.utc)
        self.created_at = now
        self.updated_at = now

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc)

    def base_dict(self) -> dict:
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
