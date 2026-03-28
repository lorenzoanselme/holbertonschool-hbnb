from datetime import datetime

from app import db
from app.models.base import BaseModel


class RevokedToken(BaseModel):
    __tablename__ = "revoked_tokens"

    jti = db.Column(db.String(128), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __init__(self, jti, expires_at):
        super().__init__()
        self.jti = jti
        self.expires_at = expires_at
