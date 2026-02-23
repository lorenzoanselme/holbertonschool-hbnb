# app/models/review.py
from __future__ import annotations
from .base import BaseModel


class Review(BaseModel):
    def __init__(
        self, text: str, rating: int, user_id: str, place_id: str
    ) -> None:
        super().__init__()

        if not user_id or not user_id.strip():
            raise ValueError("user_id is required")
        if not place_id or not place_id.strip():
            raise ValueError("place_id is required")

        rating = int(rating or 0)
        if rating < 1 or rating > 5:
            raise ValueError("rating must be between 1 and 5")

        self.text = (text or "").strip()
        self.rating = rating
        self.user_id = user_id.strip()
        self.place_id = place_id.strip()

    def to_dict(self) -> dict:
        d = self.base_dict()
        d.update(
            {
                "text": self.text,
                "rating": self.rating,
                "user_id": self.user_id,
                "place_id": self.place_id,
            }
        )
        return d
