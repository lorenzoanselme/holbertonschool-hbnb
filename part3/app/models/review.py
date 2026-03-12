from app.extensions import db
from app.models.base import BaseModel


class Review(BaseModel):
    __tablename__ = "review"

    text = db.Column(db.String(255), nullable=False)
    rating = db.Column(db.Integer, nullable=False)

    place_id = db.Column(
        db.String(36), db.ForeignKey("place.id"), nullable=False
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False
    )

    place = db.relationship("Place", backref="reviews")
    user = db.relationship("User", backref="reviews")

    def __init__(self, text, rating, place, user, **kwargs):
        self.text = text.strip()
        self.rating = int(rating)

        if hasattr(place, "id"):
            self.place = place
            self.place_id = place.id
        else:
            self.place_id = place

        if hasattr(user, "id"):
            self.user = user
            self.user_id = user.id
        else:
            self.user_id = user

    def to_dict(self):
        review_dict = super().to_dict()
        review_dict.update({
            "text": self.text,
            "rating": self.rating,
            "place": self.place_id,
            "user": self.user_id
        })
        return review_dict
