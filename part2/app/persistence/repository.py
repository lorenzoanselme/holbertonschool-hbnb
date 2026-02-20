#!/usr/bin/python3
"""
In-memory persistence layer for HBnB (Part 2).

This repository stores entities in RAM using a dict:
- key: str(UUID)
- value: entity object

It provides basic CRUD operations and simple attribute lookups.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Type, TypeVar


T = TypeVar("T")


class RepositoryError(Exception):
    """Base repository exception."""


class EntityValidationError(RepositoryError):
    """Raised when an entity is invalid for repository operations."""


class EntityNotFoundError(RepositoryError):
    """Raised when an entity cannot be found."""


class DuplicateEntityError(RepositoryError):
    """Raised when attempting to add an entity that already exists."""


class InMemoryRepository:
    """
    Simple in-memory repository.

    Notes:
    - Entities are expected to have an `id` attribute (UUID or str-able).
    - This repository is intentionally simple for Part 2.
    - In Part 3, you will replace it with a DB-backed repository.
    """

    def __init__(self) -> None:
        self._storage: Dict[str, Any] = {}

    # ---------- Internal helpers ----------

    @staticmethod
    def _entity_id(entity: Any) -> str:
        """Return the string id of an entity, validating it exists."""
        if entity is None:
            raise EntityValidationError("Entity cannot be None.")

        if not hasattr(entity, "id"):
            raise EntityValidationError("Entity must have an 'id' attribute.")

        entity_id = getattr(entity, "id")
        if entity_id is None:
            raise EntityValidationError("Entity 'id' cannot be None.")

        return str(entity_id)

    @staticmethod
    def _validate_entity_type(entity: Any, expected_type: Optional[Type[Any]]) -> None:
        """Optionally validate the entity instance type."""
        if expected_type is not None and not isinstance(entity, expected_type):
            raise EntityValidationError(
                f"Entity must be an instance of {expected_type.__name__}."
            )

    # ---------- CRUD ----------

    def add(self, entity: T, *, expected_type: Optional[Type[Any]] = None) -> T:
        """
        Add an entity to storage.

        Args:
            entity: Object with an .id attribute
            expected_type: If provided, enforce instance type

        Raises:
            DuplicateEntityError: if id already exists
            EntityValidationError: if entity invalid
        """
        self._validate_entity_type(entity, expected_type)
        entity_id = self._entity_id(entity)

        if entity_id in self._storage:
            raise DuplicateEntityError(f"Entity with id '{entity_id}' already exists.")

        self._storage[entity_id] = entity
        return entity

    def get(self, entity_id: Any) -> Optional[Any]:
        """
        Retrieve an entity by id.

        Returns:
            entity or None if not found
        """
        if entity_id is None:
            return None
        return self._storage.get(str(entity_id))

    def get_or_404(self, entity_id: Any) -> Any:
        """
        Retrieve an entity by id or raise.

        Raises:
            EntityNotFoundError
        """
        entity = self.get(entity_id)
        if entity is None:
            raise EntityNotFoundError(f"Entity with id '{entity_id}' not found.")
        return entity

    def get_all(self) -> List[Any]:
        """Return all stored entities."""
        return list(self._storage.values())

    def update(self, entity_id: Any, data: Dict[str, Any]) -> Any:
        """
        Update an entity in-place by setting attributes from `data`.

        Args:
            entity_id: id of entity to update
            data: dict of attributes to set

        Raises:
            EntityNotFoundError: if entity doesn't exist
            EntityValidationError: if data is invalid
        """
        if not isinstance(data, dict):
            raise EntityValidationError("Update data must be a dictionary.")

        entity = self.get_or_404(entity_id)

        # Don't allow id overwrite
        if "id" in data:
            data = {k: v for k, v in data.items() if k != "id"}

        for key, value in data.items():
            # Only set attributes that exist (safer for early phases)
            if hasattr(entity, key):
                setattr(entity, key, value)

        return entity

    def delete(self, entity_id: Any) -> bool:
        """
        Delete an entity by id.

        Returns:
            True if deleted, False if not found
        """
        if entity_id is None:
            return False
        return self._storage.pop(str(entity_id), None) is not None

    def clear(self) -> None:
        """Remove all entities (useful for tests)."""
        self._storage.clear()

    # ---------- Queries ----------

    def get_by_attribute(self, attribute: str, value: Any) -> Optional[Any]:
        """
        Return the first entity where getattr(entity, attribute) == value.

        Example: get_by_attribute("email", "a@b.com")
        """
        if not attribute:
            raise EntityValidationError("Attribute name cannot be empty.")

        for entity in self._storage.values():
            if hasattr(entity, attribute) and getattr(entity, attribute) == value:
                return entity
        return None

    def filter_by_attribute(self, attribute: str, value: Any) -> List[Any]:
        """
        Return all entities where getattr(entity, attribute) == value.
        Useful for relations like place_id -> reviews.
        """
        if not attribute:
            raise EntityValidationError("Attribute name cannot be empty.")

        results: List[Any] = []
        for entity in self._storage.values():
            if hasattr(entity, attribute) and getattr(entity, attribute) == value:
                results.append(entity)
        return results