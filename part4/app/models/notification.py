from sqlalchemy.orm import validates

from app import db
from app.models.base import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    place_id = db.Column(db.String(36), db.ForeignKey("places.id"), nullable=False)
    review_id = db.Column(db.String(36), db.ForeignKey("reviews.id"), nullable=True)
    type = db.Column(db.String(50), nullable=False, default="review_received")
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)

    user = db.relationship("User", backref=db.backref("notifications", lazy=True))

    def __init__(
        self,
        user_id,
        place_id,
        message,
        review_id=None,
        type="review_received",
        is_read=False,
    ):
        super().__init__()
        self.user_id = user_id
        self.place_id = place_id
        self.review_id = review_id
        self.type = type
        self.message = message
        self.is_read = is_read

    @validates("type")
    def validate_type(self, _key, value):
        value = (value or "").strip()
        if not value:
            raise ValueError("notification type is required")
        return value

    @validates("message")
    def validate_message(self, _key, value):
        value = (value or "").strip()
        if not value:
            raise ValueError("notification message is required")
        if len(value) > 255:
            raise ValueError("notification message is too long")
        return value

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "place_id": self.place_id,
            "review_id": self.review_id,
            "type": self.type,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self._serialize_datetime(self.created_at),
            "updated_at": self._serialize_datetime(self.updated_at),
        }
