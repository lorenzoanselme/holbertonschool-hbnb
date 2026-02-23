# app/models/review.py
from __future__ import annotations
from dataclasses import dataclass
from .base import BaseEntity


@dataclass
class Review(BaseEntity):
    text: str = ""
    rating: int = 0

    user_id: str = ""
    place_id: str = ""

    def to_dict(self) -> dict:
        d = super().to_dict()
        d.update({
            "text": self.text,
            "rating": self.rating,
            "user_id": self.user_id,
            "place_id": self.place_id,
        })
        return d
