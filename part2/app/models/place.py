# app/models/place.py
from __future__ import annotations
from .base import BaseModel


class Place(BaseModel):
    def __init__(
        self,
        title: str,
        description: str,
        price: float,
        latitude: float,
        longitude: float,
        owner_id: str,
        amenity_ids: list[str] | None = None,
    ) -> None:
        super().__init__()

        if not title or not title.strip():
            raise ValueError("title is required")
        if not owner_id or not owner_id.strip():
            raise ValueError("owner_id is required")

        self.title = title.strip()
        self.description = (description or "").strip()
        self.price = float(price or 0.0)
        self.latitude = float(latitude or 0.0)
        self.longitude = float(longitude or 0.0)
        self.owner_id = owner_id.strip()
        self.amenity_ids = [str(x) for x in (amenity_ids or [])]

    def to_dict(self) -> dict:
        d = self.base_dict()
        d.update(
            {
                "title": self.title,
                "description": self.description,
                "price": self.price,
                "latitude": self.latitude,
                "longitude": self.longitude,
                "owner_id": self.owner_id,
                "amenity_ids": self.amenity_ids,
            }
        )
        return d
