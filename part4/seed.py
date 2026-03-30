"""
seed.py — Populate the database with demo data.
Run: python3 seed.py
"""

import os

from app import create_app
from app.services.facade import HBnBFacade

app = create_app(os.getenv("FLASK_CONFIG", "config.DevelopmentConfig"))
facade = HBnBFacade()

USERS = [
    {
        "first_name": "Admin",
        "last_name": "HBnB",
        "email": "admin@hbnb.io",
        "password": "Admin1234!",
        "is_admin": True,
        "bio": "Founder of HBnB and curator of standout stays across France.",
        "profile_picture_url": "https://i.pravatar.cc/240?img=12",
    },
    {
        "first_name": "Camille",
        "last_name": "Martin",
        "email": "camille@example.com",
        "password": "Password123!",
        "is_admin": False,
        "bio": "Architect and frequent traveler with a love for design-forward homes.",
        "profile_picture_url": "https://i.pravatar.cc/240?img=32",
    },
    {
        "first_name": "Lucas",
        "last_name": "Bernard",
        "email": "lucas@example.com",
        "password": "Password123!",
        "is_admin": False,
        "bio": "Remote worker who reviews stays based on comfort, WiFi, and atmosphere.",
        "profile_picture_url": "https://i.pravatar.cc/240?img=15",
    },
    {
        "first_name": "Sarah",
        "last_name": "Dubois",
        "email": "sarah@example.com",
        "password": "Password123!",
        "is_admin": False,
        "bio": "Outdoor enthusiast always looking for the next quiet escape.",
        "profile_picture_url": "https://i.pravatar.cc/240?img=47",
    },
]

PLACES = [
    {
        "title": "Cozy Studio in Paris",
        "description": "A charming studio in the heart of Montmartre. Walk to the Sacre-Coeur in 5 minutes, enjoy local cafes and the vibrant artist scene.",
        "price": 85,
        "latitude": 48.8867,
        "longitude": 2.3431,
        "amenities": ["WiFi", "Kitchen", "Air conditioning"],
        "owner_email": "admin@hbnb.io",
        "image_urls": [
            "assets/demo-places/paris-studio.jpg",
            "assets/demo-places/paris-studio-2.jpg",
        ],
    },
    {
        "title": "Beach House in Nice",
        "description": "Stunning sea-view villa steps from the Promenade des Anglais. Private terrace, Mediterranean breeze, and a heated pool.",
        "price": 220,
        "latitude": 43.7102,
        "longitude": 7.2620,
        "amenities": ["WiFi", "Pool", "Parking", "Air conditioning"],
        "owner_email": "camille@example.com",
        "image_urls": [
            "assets/demo-places/nice-beach-house.jpg",
            "assets/demo-places/nice-beach-house-2.jpg",
        ],
    },
    {
        "title": "Mountain Chalet in Chamonix",
        "description": "Rustic wooden chalet at 1 050 m altitude. Fireplace, ski-in/ski-out access, breathtaking views of Mont Blanc.",
        "price": 175,
        "latitude": 45.9237,
        "longitude": 6.8694,
        "amenities": ["WiFi", "Fireplace", "Parking", "Kitchen"],
        "owner_email": "sarah@example.com",
        "image_urls": [
            "assets/demo-places/chamonix-chalet.jpg",
            "assets/demo-places/chamonix-chalet-2.jpg",
        ],
    },
    {
        "title": "Modern Loft in Bordeaux",
        "description": "Industrial-style loft in the Saint-Pierre district. Exposed brick walls, high ceilings, and all the wine culture you can handle.",
        "price": 95,
        "latitude": 44.8378,
        "longitude": -0.5792,
        "amenities": ["WiFi", "Kitchen", "Washer"],
        "owner_email": "admin@hbnb.io",
        "image_urls": [
            "assets/demo-places/bordeaux-loft.jpg",
            "assets/demo-places/bordeaux-loft-2.jpg",
        ],
    },
    {
        "title": "Provençal Farmhouse",
        "description": "Authentic mas in the Luberon with lavender fields, stone walls, and a private pool. Perfect for a peaceful countryside escape.",
        "price": 310,
        "latitude": 43.8585,
        "longitude": 5.3676,
        "amenities": ["Pool", "Parking", "Kitchen", "Air conditioning"],
        "owner_email": "camille@example.com",
        "image_urls": [
            "assets/demo-places/provencal-farmhouse.jpg",
            "assets/demo-places/provencal-farmhouse-2.jpg",
        ],
    },
    {
        "title": "Tiny House in Brittany",
        "description": "Eco-friendly tiny house surrounded by pine forest, 10 minutes from the rugged Breton coastline.",
        "price": 55,
        "latitude": 48.2141,
        "longitude": -2.9322,
        "amenities": ["WiFi", "Kitchen"],
        "owner_email": "sarah@example.com",
        "image_urls": [
            "assets/demo-places/brittany-tiny-house.jpg",
            "assets/demo-places/brittany-tiny-house-2.jpg",
        ],
    },
]

REVIEWS = [
    {
        "user_email": "lucas@example.com",
        "place_title": "Cozy Studio in Paris",
        "rating": 5,
        "text": "Perfect location and a very cozy setup for a weekend in Paris.",
    },
    {
        "user_email": "camille@example.com",
        "place_title": "Cozy Studio in Paris",
        "rating": 4,
        "text": "Great atmosphere and very clean. The neighborhood was the highlight.",
    },
    {
        "user_email": "admin@hbnb.io",
        "place_title": "Beach House in Nice",
        "rating": 5,
        "text": "The terrace and sea view make this place special. Excellent host.",
    },
    {
        "user_email": "lucas@example.com",
        "place_title": "Mountain Chalet in Chamonix",
        "rating": 4,
        "text": "Beautiful mountain experience with a warm chalet feel throughout.",
    },
    {
        "user_email": "sarah@example.com",
        "place_title": "Modern Loft in Bordeaux",
        "rating": 5,
        "text": "Stylish, comfortable, and close to everything. Would stay again.",
    },
]


def ensure_user(user_data):
    user = facade.get_user_by_email(user_data["email"])
    if user:
        facade.update_user(
            user.id,
            {
                "first_name": user_data["first_name"],
                "last_name": user_data["last_name"],
                "bio": user_data["bio"],
                "profile_picture_url": user_data["profile_picture_url"],
                "is_admin": user_data.get("is_admin", False),
            },
        )
        return facade.get_user(user.id)
    return facade.create_user(user_data)


with app.app_context():
    print("Seeding users...")
    user_map = {}
    for user_data in USERS:
        user = ensure_user(user_data)
        if not user:
            raise RuntimeError(
                f"Unable to create or retrieve seeded user: {user_data['email']}"
            )
        user_map[user.email] = user
        print(f"  User ready: {user.email}")

    print("Seeding amenities...")
    amenity_map = {a.name: a for a in facade.get_all_amenities()}
    needed_amenities = {name for place in PLACES for name in place["amenities"]}
    for name in sorted(needed_amenities):
        if name not in amenity_map:
            amenity_map[name] = facade.create_amenity({"name": name})
            print(f"  Created amenity: {name}")

    print("Seeding places...")
    place_map = {place.title: place for place in facade.get_all_places()}
    for place_data in PLACES:
        owner = user_map[place_data["owner_email"]]
        amenity_ids = [amenity_map[name].id for name in place_data["amenities"]]
        existing = place_map.get(place_data["title"])
        payload = {
            "title": place_data["title"],
            "description": place_data["description"],
            "image_url": place_data["image_urls"][0],
            "image_urls": place_data["image_urls"],
            "price": place_data["price"],
            "latitude": place_data["latitude"],
            "longitude": place_data["longitude"],
            "owner_id": owner.id,
            "amenities": amenity_ids,
        }

        if existing:
            facade.update_place(existing.id, payload)
            place = facade.get_place(existing.id)
            if not place:
                raise RuntimeError(
                    f"Unable to retrieve seeded place after update: {place_data['title']}"
                )
            print(f"  Updated place: {place.title}")
        else:
            place = facade.create_place(payload)
            if not place:
                raise RuntimeError(
                    f"Unable to create seeded place: {place_data['title']}"
                )
            print(f"  Created place: {place.title}")

        place_map[place.title] = place

    print("Seeding reviews...")
    for review_data in REVIEWS:
        user = user_map[review_data["user_email"]]
        place = place_map[review_data["place_title"]]
        existing_reviews = facade.get_reviews_by_place(place.id)
        existing_review = next(
            (review for review in existing_reviews if review.user_id == user.id),
            None,
        )

        if existing_review:
            facade.update_review(
                existing_review.id,
                {
                    "text": review_data["text"],
                    "rating": review_data["rating"],
                },
            )
            print(f"  Updated review by {user.email} on {place.title}")
        else:
            facade.create_review(
                {
                    "user_id": user.id,
                    "place_id": place.id,
                    "text": review_data["text"],
                    "rating": review_data["rating"],
                }
            )
            print(f"  Created review by {user.email} on {place.title}")

    print("\nSeed complete.")
    print("Demo accounts:")
    for user_data in USERS:
        print(f"  - {user_data['email']} / {user_data['password']}")
