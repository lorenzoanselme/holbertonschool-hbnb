from sqlalchemy.orm import validates

from app import db
from app.models.base import BaseModel


class Amenity(BaseModel):
    __tablename__ = "amenities"

    name = db.Column(db.String(50), nullable=False)

    def __init__(self, name):
        super().__init__()
        self.name = name

    @validates("name")
    def validate_name(self, key, value):
        value = (value or "").strip()
        if not value:
            raise ValueError("name is required")
        if len(value) > 50:
            raise ValueError("name must be 50 characters or fewer")
        return value

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self._serialize_datetime(self.created_at),
            "updated_at": self._serialize_datetime(self.updated_at),
        }
