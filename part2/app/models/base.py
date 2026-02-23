# app/models/basemodel.py
from .base import BaseModel


class User(BaseModel):
    def init(self, first_name, last_name, email, is_admin):
        super().init()
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.is_admin = is_admin

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "update_at": self.update_at.isoformat(),
        }
