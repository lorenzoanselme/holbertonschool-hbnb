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
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    reviews = db.relationship("Review", backref="place", lazy=True)
    amenities = db.relationship("Amenity", secondary=place_amenity, lazy=True)

    def __init__(self, title, description, price, latitude, longitude, owner_id):
        super().__init__()
        self.title = title
        self.description = description
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
        return (value or "").strip()

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

    def to_dict(self):
        reviews = cast(list[Review], self.reviews)
        amenities = cast(list[Amenity], self.amenities)
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "owner_id": self.owner_id,
            "created_at": self._serialize_datetime(self.created_at),
            "updated_at": self._serialize_datetime(self.updated_at),
            "reviews": [r.to_dict() for r in reviews],
            "amenities": [{"id": a.id, "name": a.name} for a in amenities],
        }
