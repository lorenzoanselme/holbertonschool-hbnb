# app/models/amenity.py
from __future__ import annotations
from .base import BaseModel


class Amenity(BaseModel):
    def __init__(self, name: str) -> None:
        super().__init__()

        if not name or not name.strip():
            raise ValueError("name is required")
        self.name = name.strip()

    def to_dict(self) -> dict:
        d = self.base_dict()
        d.update({"name": self.name})
        return d
