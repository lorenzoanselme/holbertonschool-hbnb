from abc import ABC, abstractmethod

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app import db


class Repository(ABC):
    @abstractmethod
    def add(self, obj):
        raise NotImplementedError

    @abstractmethod
    def get(self, obj_id):
        raise NotImplementedError

    @abstractmethod
    def get_all(self):
        raise NotImplementedError

    @abstractmethod
    def update(self, obj_id, data):
        raise NotImplementedError

    @abstractmethod
    def delete(self, obj_id):
        raise NotImplementedError

    @abstractmethod
    def get_by_attribute(self, attr_name, attr_value):
        raise NotImplementedError


class InMemoryRepository(Repository):
    def __init__(self):
        self._storage = {}

    def add(self, obj):
        self._storage[obj.id] = obj

    def get(self, obj_id):
        return self._storage.get(obj_id)

    def get_all(self):
        return list(self._storage.values())

    def update(self, obj_id, data):
        obj = self.get(obj_id)
        if obj:
            obj.update(data)
        return obj

    def delete(self, obj_id):
        if obj_id in self._storage:
            del self._storage[obj_id]
            return True
        return False

    def get_by_attribute(self, attr_name, attr_value):
        return next(
            (
                obj
                for obj in self._storage.values()
                if getattr(obj, attr_name) == attr_value
            ),
            None,
        )


class SQLAlchemyRepository(Repository):
    def __init__(self, model):
        self.model = model

    def add(self, obj):
        db.session.add(obj)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise

    def get(self, obj_id):
        primary_key_column = list(self.model.__table__.primary_key.columns)[0]
        statement = select(self.model).where(primary_key_column == obj_id)
        return db.session.execute(statement).scalars().first()

    def get_all(self):
        return db.session.execute(select(self.model)).scalars().all()

    def update(self, obj_id, data):
        obj = self.get(obj_id)
        if obj:
            for key, value in data.items():
                setattr(obj, key, value)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                raise
        return obj

    def delete(self, obj_id):
        obj = self.get(obj_id)
        if obj:
            db.session.delete(obj)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                raise
            return True
        return False

    def get_by_attribute(self, attr_name, attr_value):
        statement = select(self.model).where(
            getattr(self.model, attr_name) == attr_value
        )
        return db.session.execute(statement).scalars().first()
