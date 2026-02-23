from .base import BaseModel


class Amenity(BaseModel):
    def __init__(self, name):
        super().__init__()
        self.name = name

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }