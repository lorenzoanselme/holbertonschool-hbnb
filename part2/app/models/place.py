# app/models/place.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List
from .base import BaseEntity


@dataclass
class Place(BaseEntity):
    title: str = ""
    description: str = ""
    price: float = 0.0
    latitude: float = 0.0
    longitude: float = 0.0

    owner_id: str = ""
    amenity_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = super().to_dict()
        d.update({
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "owner_id": self.owner_id,
            "amenity_ids": self.amenity_ids,
        })
        return d
