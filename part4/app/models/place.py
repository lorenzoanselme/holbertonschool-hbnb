import json
import re
from typing import cast

from sqlalchemy.orm import validates

from app import db
from app.models.amenity import Amenity
from app.models.base import BaseModel
from app.models.review import Review

place_amenity = db.Table(
    "place_amenity",
    db.Column("place_id", db.String(36), db.ForeignKey("places.id"), primary_key=True),
    db.Column(
        "amenity_id", db.String(36), db.ForeignKey("amenities.id"), primary_key=True
    ),
)


class Place(BaseModel):
    __tablename__ = "places"

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default="")
    image_url = db.Column(db.String(500), default="", nullable=False)
    image_urls_json = db.Column(db.Text, default="[]", nullable=False)
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    reviews = db.relationship("Review", backref="place", lazy=True)
    amenities = db.relationship("Amenity", secondary=place_amenity, lazy=True)

    def __init__(
        self,
        title,
        description,
        price,
        latitude,
        longitude,
        owner_id,
        image_url="",
        image_urls=None,
    ):
        super().__init__()
        self.title = title
        self.description = description
        self.set_image_urls(image_urls or ([image_url] if image_url else []))
        self.price = price
        self.latitude = latitude
        self.longitude = longitude
        self.owner_id = owner_id

    @validates("title")
    def validate_title(self, _key, value):
        value = (value or "").strip()
        if not value:
            raise ValueError("title is required")
        if len(value) > 100:
            raise ValueError("title must be 100 characters or fewer")
        return value

    @validates("description")
    def validate_description(self, _key, value):
        value = (value or "").strip()
        if len(value) > 4000:
            raise ValueError("description must be 4000 characters or fewer")
        return value

    @validates("image_url")
    def validate_image_url(self, _key, value):
        value = (value or "").strip()
        if value and not self._is_valid_image_path(value):
            raise ValueError("image_url must be an http(s) URL or local asset path")
        if len(value) > 500:
            raise ValueError("image_url must be 500 characters or fewer")
        return value

    @staticmethod
    def _is_valid_image_path(value):
        return bool(re.match(r"^https?://", value) or value.startswith("assets/"))

    def get_image_urls(self):
        try:
            values = json.loads(self.image_urls_json or "[]")
        except json.JSONDecodeError:
            values = []

        normalized = []
        for value in values:
            value = (value or "").strip()
            if not value:
                continue
            if not self._is_valid_image_path(value):
                raise ValueError(
                    "image_urls must contain only http(s) URLs or local asset paths"
                )
            if len(value) > 500:
                raise ValueError("each image URL must be 500 characters or fewer")
            normalized.append(value)
        if not normalized and self.image_url:
            normalized.append(self.image_url)
        return normalized

    def set_image_urls(self, image_urls):
        normalized = []
        for value in image_urls or []:
            value = (value or "").strip()
            if not value:
                continue
            if not self._is_valid_image_path(value):
                raise ValueError(
                    "image_urls must contain only http(s) URLs or local asset paths"
                )
            if len(value) > 500:
                raise ValueError("each image URL must be 500 characters or fewer")
            normalized.append(value)

        self.image_urls_json = json.dumps(normalized)
        self.image_url = normalized[0] if normalized else ""

    @validates("price")
    def validate_price(self, _key, value):
        if value is None or float(value) <= 0:
            raise ValueError("price must be greater than 0")
        return float(value)

    @validates("latitude")
    def validate_latitude(self, _key, value):
        value = float(value)
        if value < -90 or value > 90:
            raise ValueError("latitude must be between -90 and 90")
        return value

    @validates("longitude")
    def validate_longitude(self, _key, value):
        value = float(value)
        if value < -180 or value > 180:
            raise ValueError("longitude must be between -180 and 180")
        return value

    def to_dict(self, include_reviews=True, include_amenities=True):
        image_urls = self.get_image_urls()
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "image_url": image_urls[0] if image_urls else self.image_url,
            "image_urls": image_urls,
            "price": self.price,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "owner_id": self.owner_id,
            "created_at": self._serialize_datetime(self.created_at),
            "updated_at": self._serialize_datetime(self.updated_at),
            "reviews": (
                [r.to_dict() for r in cast(list[Review], self.reviews)]
                if include_reviews
                else []
            ),
            "amenities": (
                [
                    {"id": a.id, "name": a.name}
                    for a in cast(list[Amenity], self.amenities)
                ]
                if include_amenities
                else []
            ),
        }
