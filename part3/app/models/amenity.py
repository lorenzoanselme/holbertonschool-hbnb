from app.extensions import db
from app.models.base import BaseModel


class Amenity(BaseModel):
    __tablename__ = "amenity"

    name = db.Column(db.String(50), nullable=False)

    def __init__(self, name, **kwargs):
        self.name = name.strip()

    def to_dict(self):
        amenity_dict = super().to_dict()
        amenity_dict.update({
            "name": self.name
        })
        return amenity_dict
