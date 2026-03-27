from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import validates

from app import db
from app.models.base import BaseModel


class Review(BaseModel):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("place_id", "user_id", name="uq_review_place_user"),
    )

    text = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    place_id = db.Column(db.String(36), db.ForeignKey("places.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    owner_response = db.Column(db.Text, default="", nullable=False)
    owner_response_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, text, rating, place_id, user_id):
        super().__init__()
        self.text = text
        self.rating = rating
        self.place_id = place_id
        self.user_id = user_id

    @validates("text")
    def validate_text(self, _key, value):
        value = (value or "").strip()
        if not value:
            raise ValueError("text is required")
        return value

    @validates("rating")
    def validate_rating(self, _key, value):
        value = int(value)
        if value < 1 or value > 5:
            raise ValueError("rating must be between 1 and 5")
        return value

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "rating": self.rating,
            "place_id": self.place_id,
            "user_id": self.user_id,
            "owner_response": self.owner_response,
            "owner_response_at": self._serialize_datetime(self.owner_response_at),
            "created_at": self._serialize_datetime(self.created_at),
            "updated_at": self._serialize_datetime(self.updated_at),
        }
