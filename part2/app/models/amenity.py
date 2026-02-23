# app/models/amenity.py
from __future__ import annotations
from dataclasses import dataclass
from .base import BaseEntity


@dataclass
class Amenity(BaseEntity):
    name: str = ""

    def to_dict(self) -> dict:
        d = super().to_dict()
        d.update({"name": self.name})
        return d
