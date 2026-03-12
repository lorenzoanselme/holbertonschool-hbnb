from app.extensions import db
from app.models.base import BaseModel
from typing import cast, Any

place_amenity = db.Table(
    "place_amenity",
    db.Column("place_id", db.String(36), db.ForeignKey("place.id"), primary_key=True),
    db.Column("amenity_id", db.String(36), db.ForeignKey("amenity.id"), primary_key=True),
)


class Place(BaseModel):
    __tablename__ = "place"

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    owner_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False
    )

    amenities = db.relationship(
        "Amenity",
        secondary=place_amenity,
        backref="places",
        lazy=True
    )

    def __init__(
        self,
        title,
        description,
        price,
        latitude,
        longitude,
        owner,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.title = title.strip()
        self.description = description if description is not None else ""
        self.price = float(price)
        self.latitude = float(latitude)
        self.longitude = float(longitude)

        if hasattr(owner, "id"):
            self.owner = owner
            self.owner_id = owner.id
        else:
            self.owner_id = owner

    def add_review(self, review):
        if not hasattr(self, "reviews") or self.reviews is None:
            self.reviews = []
        self.reviews.append(review)

    def add_amenity(self, amenity):
        if not hasattr(self, "amenities") or self.amenities is None:
            self.amenities = []
        self.amenities.append(amenity)

    def to_dict(self):
        place_dict = super().to_dict()

        reviews = cast(list[Any], self.reviews or [])
        amenities = cast(list[Any], self.amenities or [])

        place_dict.update({
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "owner": self.owner_id,
            "reviews": [r.id for r in reviews],
            "amenities": [a.id for a in amenities],
        })
        return place_dict
