from .base import BaseModel


class Review(BaseModel):
    def __init__(
        self,
        text,
        rating,
        place_id=None,
        user_id=None,
        place=None,
        user=None,
    ):
        """
        You can create a Review using either:
        - place_id + user_id (strings)
        OR
        - place + user (objects that have an 'id' attribute)
        """
        super().__init__()

        self.text = text
        self.rating = rating

        if place is not None:
            place_id = getattr(place, "id", None)
        if user is not None:
            user_id = getattr(user, "id", None)

        self.place_id = place_id
        self.user_id = user_id

    @property
    def text(self):
        return self._text

    @text.setter
    def text(self, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("text is required")
        self._text = value.strip()

    @property
    def rating(self):
        return self._rating

    @rating.setter
    def rating(self, value):
        if not isinstance(value, int):
            raise ValueError("rating must be an integer")
        if value < 1 or value > 5:
            raise ValueError("rating must be between 1 and 5")
        self._rating = value

    @property
    def place_id(self):
        return self._place_id

    @place_id.setter
    def place_id(self, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(
                "place_id is required and must be a non-empty string")
        self._place_id = value.strip()

    @property
    def user_id(self):
        return self._user_id

    @user_id.setter
    def user_id(self, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(
                "user_id is required and must be a non-empty string"
            )
        self._user_id = value.strip()

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "rating": self.rating,
            "place_id": self.place_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
