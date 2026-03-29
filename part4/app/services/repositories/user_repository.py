from sqlalchemy import select

from app.models.user import User
from app.persistence.repository import SQLAlchemyRepository


class UserRepository(SQLAlchemyRepository):
    def __init__(self):
        super().__init__(User)

    def get_user_by_email(self, email):
        statement = select(self.model).where(self.model.email == email)
        return self.model.query.session.execute(statement).scalars().first()
