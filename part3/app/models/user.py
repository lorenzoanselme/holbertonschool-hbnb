from .base import BaseModel
from app.extensions import bcrypt


class User(BaseModel):
    def __init__(self, first_name, last_name, email, password, is_admin=False):
        super().__init__()
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.is_admin = is_admin
        self.hash_password(password)

    def hash_password(self, password):
        """Hashes the password before storing it."""
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def verify_password(self, password):
        """Verifies if the provided password matches the hashed password."""
        return bcrypt.check_password_hash(self.password, password)

    @property
    def first_name(self):
        return self._first_name

    @first_name.setter
    def first_name(self, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("first_name is required")
        v = value.strip()
        if len(v) > 50:
            raise ValueError("first_name must be at most 50 characters")
        self._first_name = v

    @property
    def last_name(self):
        return self._last_name

    @last_name.setter
    def last_name(self, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("last_name is required")
        v = value.strip()
        if len(v) > 50:
            raise ValueError("last_name must be at most 50 characters")
        self._last_name = v

    @property
    def email(self):
        return self._email

    @email.setter
    def email(self, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("email is required")
        v = value.strip()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("email format is invalid")
        self._email = v

    @property
    def is_admin(self):
        return self._is_admin

    @is_admin.setter
    def is_admin(self, value):
        if not isinstance(value, bool):
            raise ValueError("is_admin must be a boolean")
        self._is_admin = value

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
