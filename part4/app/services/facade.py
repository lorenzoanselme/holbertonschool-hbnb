from datetime import datetime
from typing import cast

from sqlalchemy.exc import IntegrityError

from app import db
from app.models.amenity import Amenity
from app.models.notification import Notification
from app.models.place import Place
from app.models.review import Review
from app.models.user import User
from app.persistence.repository import SQLAlchemyRepository
from app.services.repositories.user_repository import UserRepository


class HBnBFacade:
    def __init__(self):
        self.user_repo = UserRepository()
        self.place_repo = SQLAlchemyRepository(Place)
        self.review_repo = SQLAlchemyRepository(Review)
        self.amenity_repo = SQLAlchemyRepository(Amenity)
        self.notification_repo = SQLAlchemyRepository(Notification)

    # User
    def create_user(self, user_data):
        user = User(
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            email=user_data["email"],
            password=user_data["password"],
            is_admin=user_data.get("is_admin", False),
            bio=user_data.get("bio", ""),
            profile_picture_url=user_data.get("profile_picture_url", ""),
        )
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_user_by_email(email)

    def get_all_users(self):
        return self.user_repo.get_all()

    def update_user(self, user_id, user_data):
        user = self.user_repo.get(user_id)
        if not user:
            return None
        return self.user_repo.update(user_id, user_data)

    # Amenities
    def create_amenity(self, amenity_data):
        if "name" not in amenity_data:
            raise ValueError("Name is required")
        amenity = Amenity(name=amenity_data["name"])
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        return self.amenity_repo.get(amenity_id)

    def get_all_amenities(self):
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        amenity = self.amenity_repo.get(amenity_id)
        if not amenity:
            return None
        return self.amenity_repo.update(amenity_id, amenity_data)

    # Place
    def create_place(self, place_data):
        owner_id = place_data.get("owner_id")
        owner = self.get_user(owner_id)
        if not owner:
            raise ValueError("Owner not found")

        amenity_ids = place_data.get("amenities", [])
        amenities = []
        for amenity_id in amenity_ids:
            amenity = self.get_amenity(amenity_id)
            if not amenity:
                raise ValueError("Amenity not found")
            amenities.append(amenity)

        place = Place(
            title=place_data["title"],
            description=place_data.get("description", ""),
            image_url=place_data.get("image_url", ""),
            image_urls=place_data.get("image_urls", []),
            price=place_data["price"],
            latitude=place_data["latitude"],
            longitude=place_data["longitude"],
            owner_id=owner_id,
            is_hidden=place_data.get("is_hidden", False),
        )

        setattr(place, "amenities", cast(list[Amenity], amenities))
        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        return self.place_repo.get(place_id)

    def delete_place(self, place_id):
        self.place_repo.delete(place_id)

    def get_all_places(self):
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        place = self.place_repo.get(place_id)
        if not place:
            return None

        updated_data = dict(place_data)

        if "image_urls" in updated_data:
            place.set_image_urls(updated_data.pop("image_urls"))
            updated_data["image_url"] = place.image_url
            updated_data["image_urls_json"] = place.image_urls_json
        elif "image_url" in updated_data:
            place.set_image_urls(
                [updated_data["image_url"]] if updated_data["image_url"] else []
            )
            updated_data["image_url"] = place.image_url
            updated_data["image_urls_json"] = place.image_urls_json

        if "owner_id" in updated_data:
            owner = self.get_user(updated_data["owner_id"])
            if not owner:
                raise ValueError("Owner not found")

        if "amenities" in updated_data:
            amenities = []
            for amenity_id in updated_data["amenities"]:
                amenity = self.get_amenity(amenity_id)
                if not amenity:
                    raise ValueError("Amenity not found")
                amenities.append(amenity)
            setattr(place, "amenities", cast(list[Amenity], amenities))
            del updated_data["amenities"]

        return self.place_repo.update(place_id, updated_data)

    # Review
    def create_review(self, review_data):
        user_id = review_data.get("user_id")
        place_id = review_data.get("place_id")

        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        place = self.get_place(place_id)
        if not place:
            raise ValueError("Place not found")

        review = Review(
            text=review_data["text"],
            rating=review_data["rating"],
            place_id=place_id,
            user_id=user_id,
        )
        try:
            self.review_repo.add(review)
        except IntegrityError:
            raise ValueError("You have already reviewed this place")

        notification = Notification(
            user_id=place.owner_id,
            place_id=place.id,
            review_id=review.id,
            type="review_received",
            message=f"New review received for {place.title}",
            is_read=False,
        )
        self.notification_repo.add(notification)
        return review

    def get_review(self, review_id):
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        return self.review_repo.get_all()

    def get_reviews_by_place(self, place_id):
        return Review.query.filter_by(place_id=place_id).all()

    def update_review(self, review_id, review_data):
        review = self.review_repo.get(review_id)
        if not review:
            return None

        updated_data = {
            key: value
            for key, value in review_data.items()
            if key in ["text", "rating"]
        }
        return self.review_repo.update(review_id, updated_data)

    def respond_to_review(self, review_id, owner_id, response_text):
        review = self.review_repo.get(review_id)
        if not review:
            return None

        place = self.get_place(review.place_id)
        if not place or place.owner_id != owner_id:
            raise ValueError("Only the place owner can respond to this review")

        response_text = (response_text or "").strip()
        if not response_text:
            raise ValueError("Response text is required")
        if len(response_text) > 1000:
            raise ValueError("Response text is too long")

        return self.review_repo.update(
            review_id,
            {
                "owner_response": response_text,
                "owner_response_at": datetime.now(),
            },
        )

    def delete_review(self, review_id):
        review = self.review_repo.get(review_id)
        if not review:
            return False
        self.review_repo.delete(review_id)
        return True

    def get_notifications_for_user(self, user_id):
        return (
            Notification.query.filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )

    def mark_notification_as_read(self, notification_id, user_id):
        notification = self.notification_repo.get(notification_id)
        if not notification or notification.user_id != user_id:
            return None
        return self.notification_repo.update(notification_id, {"is_read": True})

    def mark_all_notifications_as_read(self, user_id):
        notifications = Notification.query.filter_by(
            user_id=user_id, is_read=False
        ).all()
        for notification in notifications:
            notification.is_read = True
        if notifications:
            db.session.commit()
        return len(notifications)

    def delete_all_notifications(self, user_id):
        notifications = Notification.query.filter_by(user_id=user_id).all()
        count = len(notifications)
        for notification in notifications:
            db.session.delete(notification)
        if notifications:
            db.session.commit()
        return count

    def delete_notification(self, notification_id, user_id):
        notification = self.notification_repo.get(notification_id)
        if not notification or notification.user_id != user_id:
            return False
        return self.notification_repo.delete(notification_id)
