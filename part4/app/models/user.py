import re

from sqlalchemy.orm import validates

from app import bcrypt, db
from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_banned = db.Column(db.Boolean, default=False, nullable=False)
    bio = db.Column(db.Text, default="", nullable=False)
    profile_picture_url = db.Column(db.String(500), default="", nullable=False)

    places = db.relationship("Place", backref="owner", lazy=True)
    reviews = db.relationship("Review", backref="user", lazy=True)

    def __init__(
        self,
        first_name,
        last_name,
        email,
        password,
        is_admin=False,
        is_banned=False,
        bio="",
        profile_picture_url="",
    ):
        super().__init__()
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.is_admin = is_admin
        self.is_banned = is_banned
        self.bio = bio
        self.profile_picture_url = profile_picture_url
        self.hash_password(password)

    @staticmethod
    def validate_password_policy(password):
        password = password or ""
        if len(password) < 10:
            raise ValueError("password must be at least 10 characters long")
        if len(password.encode("utf-8")) > 72:
            raise ValueError("password must be 72 bytes or fewer")
        if not re.search(r"[A-Z]", password):
            raise ValueError("password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", password):
            raise ValueError("password must contain at least one lowercase letter")
        if not re.search(r"\d", password):
            raise ValueError("password must contain at least one digit")
        return password

    def hash_password(self, password):
        """Hashes the password before storing it."""
        password = self.validate_password_policy(password)
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")

    def verify_password(self, password):
        """Verifies if the provided password matches the hashed password."""
        return bcrypt.check_password_hash(self.password, password)

    @validates("first_name", "last_name")
    def validate_name(self, key, value):
        value = (value or "").strip()
        if not value:
            raise ValueError(f"{key} is required")
        if len(value) > 50:
            raise ValueError(f"{key} must be 50 characters or fewer")
        return value

    @validates("email")
    def validate_email(self, _key, value):
        value = (value or "").strip().lower()
        if not value:
            raise ValueError("email is required")
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("invalid email format")
        return value

    @validates("is_admin", "is_banned")
    def validate_flags(self, key, value):
        if not isinstance(value, bool):
            raise ValueError(f"{key} must be a boolean")
        return value

    @validates("bio")
    def validate_bio(self, _key, value):
        value = (value or "").strip()
        if len(value) > 1000:
            raise ValueError("bio must be 1000 characters or fewer")
        return value

    @validates("profile_picture_url")
    def validate_profile_picture_url(self, _key, value):
        value = (value or "").strip()
        if value and not (
            re.match(r"^https?://", value)
            or value.startswith("data:image/")
            or value.startswith("assets/uploads/")
        ):
            raise ValueError(
                "profile picture must be an http(s) URL or an uploaded image"
            )
        if len(value) > 2_000_000:
            raise ValueError("profile picture data is too large")
        return value

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "is_admin": self.is_admin,
            "is_banned": self.is_banned,
            "bio": self.bio,
            "profile_picture_url": self.profile_picture_url,
            "created_at": self._serialize_datetime(self.created_at),
            "updated_at": self._serialize_datetime(self.updated_at),
        }
