from app.persistence.repository import InMemoryRepository
from app.models.amenity import Amenity
from app.models.user import User
from app.models.place import Place
from app.models.review import Review


class HBnBFacade:
    def __init__(self):
        self.user_repo = InMemoryRepository()
        self.place_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()
        self.amenity_repo = InMemoryRepository()

    def create_user(self, user_data):
        user = User(**user_data)
        self.user_repo.add(user)
        return user

    # User
    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_by_attribute("email", email)

    def get_all_users(self):
        return self.user_repo.get_all()

    def update_user(self, user_id, user_data):
        user = self.user_repo.get(user_id)
        if not user:
            return None

        self.user_repo.update(user_id, user_data)
        return user

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

        self.amenity_repo.update(amenity_id, amenity_data)
        return amenity

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
            price=place_data["price"],
            latitude=place_data["latitude"],
            longitude=place_data["longitude"],
            owner=owner,
        )

        for amenity in amenities:
            place.add_amenity(amenity)

        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        # Placeholder for logic to retrieve a place by ID,
        # including associated owner and amenities
        return self.place_repo.get(place_id)

    def get_all_places(self):
        # Placeholder for logic to retrieve all places
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        place = self.place_repo.get(place_id)
        if not place:
            return None

        updated_data = dict(place_data)

        if "owner_id" in updated_data:
            owner = self.get_user(updated_data["owner_id"])
            if not owner:
                raise ValueError("Owner not found")
            updated_data["owner"] = owner
            del updated_data["owner_id"]

        if "amenities" in updated_data:
            amenities = []
            for amenity_id in updated_data["amenities"]:
                amenity = self.get_amenity(amenity_id)
                if not amenity:
                    raise ValueError("Amenity not found")
                amenities.append(amenity)
            place.amenities = amenities
            del updated_data["amenities"]

        self.place_repo.update(place_id, updated_data)
        return place

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
            place=place,
            user=user,
        )
        self.review_repo.add(review)
        place.add_review(review)
        return review

    def get_review(self, review_id):
        # Placeholder for logic to retrieve a review by ID
        return self.review_repo.get(review_id)

    def get_all_reviews(self):
        # Placeholder for logic to retrieve all reviews
        return self.review_repo.get_all()

    def get_reviews_by_place(self, place_id):
        return [r for r in self.review_repo.get_all()
                if r.place.id == place_id]

    def update_review(self, review_id, review_data):
        review = self.review_repo.get(review_id)
        if not review:
            return None

        updated_data = {
            key: value for key, value in review_data.items()
            if key in ["text", "rating"]
        }

        self.review_repo.update(review_id, updated_data)
        return review

    def delete_review(self, review_id):
        review = self.review_repo.get(review_id)
        if not review:
            return False

        self.review_repo.delete(review_id)
        review.place.reviews = [
            r for r in review.place.reviews if r.id != review_id
        ]
        return True
