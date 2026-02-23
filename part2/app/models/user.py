# app/models/user.py
from __future__ import annotations
from dataclasses import dataclass
from .base import BaseEntity


@dataclass
class User(BaseEntity):
    first_name: str = ""
    last_name: str = ""
    email: str = ""

    def to_dict(self) -> dict:
        d = super().to_dict()
        d.update({
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
        })
        return d
