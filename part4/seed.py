"""
seed.py — Populate the database with demo data.
Run: python3 seed.py
"""

import os

from sqlalchemy import text

from app import create_app, db
from app.models.notification import Notification
from app.models.place import Place
from app.models.review import Review
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
        "title": "One-Bedroom in South Pigalle",
        "description": "A well-kept one-bedroom with a bright living area, a compact open kitchen, and a layout that works well for a long weekend in central Paris.",
        "price": 145,
        "latitude": 48.8791,
        "longitude": 2.3378,
        "amenities": ["WiFi", "Kitchen", "Washer"],
        "owner_email": "admin@hbnb.io",
        "image_urls": [
            "assets/demo-places/paris-studio-2.jpg",
            "assets/demo-places/brittany-tiny-house-2.jpg",
        ],
    },
    {
        "title": "Lagoon Resort Villa",
        "description": "A tropical waterfront villa with direct lagoon views, airy interiors, and a resort-style lounge space that feels designed for slow days by the water.",
        "price": 360,
        "latitude": 4.1755,
        "longitude": 73.5093,
        "amenities": ["WiFi", "Pool", "Air conditioning"],
        "owner_email": "camille@example.com",
        "image_urls": [
            "assets/demo-places/nice-beach-house.jpg",
            "assets/demo-places/nice-beach-house-2.jpg",
        ],
    },
    {
        "title": "Modern Pool Villa in Alicante",
        "description": "A detached modern villa with full-height glass, a compact private pool, and clean outdoor lines. Best suited to guests looking for a quiet, design-forward stay.",
        "price": 245,
        "latitude": 38.3452,
        "longitude": -0.4810,
        "amenities": ["WiFi", "Pool", "Parking", "Kitchen"],
        "owner_email": "sarah@example.com",
        "image_urls": [
            "assets/demo-places/chamonix-chalet.jpg",
        ],
    },
    {
        "title": "Townhouse Loft in Calgary",
        "description": "A modern townhouse with a clean-lined kitchen, private garage access, and enough room for a proper city stay rather than a quick overnight stop.",
        "price": 165,
        "latitude": 51.0447,
        "longitude": -114.0719,
        "amenities": ["WiFi", "Kitchen", "Washer", "Parking"],
        "owner_email": "admin@hbnb.io",
        "image_urls": [
            "assets/demo-places/bordeaux-loft.jpg",
            "assets/demo-places/bordeaux-loft-2.jpg",
        ],
    },
    {
        "title": "Forest Cabin in the Veluwe",
        "description": "A wood-clad cabin in a quiet forest park, with tall trees around the property and the kind of setting that makes sense for slow mornings and long walks.",
        "price": 175,
        "latitude": 52.1638,
        "longitude": 5.8236,
        "amenities": ["Parking", "Kitchen", "Fireplace", "WiFi"],
        "owner_email": "camille@example.com",
        "image_urls": [
            "assets/demo-places/provencal-farmhouse.jpg",
            "assets/demo-places/provencal-farmhouse-2.jpg",
        ],
    },
    {
        "title": "Balcony Apartment in Montreal",
        "description": "A straightforward apartment in a mid-rise residential building, with a bright living area and a layout that works well for a city break or a week of remote work.",
        "price": 90,
        "latitude": 45.5019,
        "longitude": -73.5674,
        "amenities": ["WiFi", "Kitchen", "Washer", "Balcony"],
        "owner_email": "sarah@example.com",
        "image_urls": [
            "assets/demo-places/chamonix-chalet-2.jpg",
            "assets/demo-places/brittany-tiny-house.jpg",
        ],
    },
]

REVIEWS = [
    {
        "user_email": "lucas@example.com",
        "place_title": "One-Bedroom in South Pigalle",
        "rating": 5,
        "text": "Comfortable, quiet at night, and easy to use as a base for walking around the 9th and Montmartre.",
    },
    {
        "user_email": "camille@example.com",
        "place_title": "One-Bedroom in South Pigalle",
        "rating": 4,
        "text": "The layout is practical and the apartment feels lived in rather than staged. Good choice for a short Paris stay.",
    },
    {
        "user_email": "admin@hbnb.io",
        "place_title": "Lagoon Resort Villa",
        "rating": 5,
        "text": "The lagoon view is exactly what you hope for, and the indoor lounge actually matches the setting instead of feeling generic.",
    },
    {
        "user_email": "lucas@example.com",
        "place_title": "Modern Pool Villa in Alicante",
        "rating": 4,
        "text": "Very clean architecture, lots of daylight, and a pool that makes the place feel more private than most holiday rentals.",
    },
    {
        "user_email": "sarah@example.com",
        "place_title": "Townhouse Loft in Calgary",
        "rating": 5,
        "text": "The kitchen is genuinely useful, the house feels new, and having the garage made arrival much easier.",
    },
    {
        "user_email": "lucas@example.com",
        "place_title": "Balcony Apartment in Montreal",
        "rating": 4,
        "text": "Simple but practical. Good natural light inside, and the building felt like a normal residential address rather than a tourist setup.",
    },
    {
        "user_email": "camille@example.com",
        "place_title": "Forest Cabin in the Veluwe",
        "rating": 5,
        "text": "Exactly the kind of quiet cabin stay you want for a reset weekend. The wooded setting is what makes it memorable.",
    },
]

LEGACY_DEMO_TITLES = {
    "Cozy Studio in Paris",
    "Beach House in Nice",
    "Mountain Chalet in Chamonix",
    "Modern Loft in Bordeaux",
    "Provençal Farmhouse",
    "Tiny House in Brittany",
    "Montmartre Artist Flat",
    "Sunlit Flat in Montmartre",
    "One-Bedroom in South Pigalle",
    "Seafront Resort Suite",
    "Poolside Glass Villa",
    "Mediterranean Glass Villa",
    "Modern Pool Villa in Alicante",
    "Design Townhouse with Chef Kitchen",
    "Contemporary Townhouse Loft",
    "Townhouse Loft in Calgary",
    "Woodland Cottage Escape",
    "Forest Cabin Retreat",
    "Forest Cabin in the Veluwe",
    "Balcony Apartment Residence",
    "Urban Balcony Apartment",
    "Balcony Apartment in Montreal",
    "Lagoon Resort Villa",
}


def reset_demo_places():
    demo_titles = LEGACY_DEMO_TITLES | {place["title"] for place in PLACES}
    places = Place.query.filter(Place.title.in_(demo_titles)).all()
    if not places:
        return 0

    place_ids = [place.id for place in places]
    review_ids = [
        review.id for review in Review.query.filter(Review.place_id.in_(place_ids)).all()
    ]

    Notification.query.filter(
        (Notification.place_id.in_(place_ids)) | (Notification.review_id.in_(review_ids))
    ).delete(synchronize_session=False)
    Review.query.filter(Review.place_id.in_(place_ids)).delete(synchronize_session=False)
    db.session.execute(
        text("DELETE FROM place_amenity WHERE place_id = ANY(:place_ids)"),
        {"place_ids": place_ids},
    )
    Place.query.filter(Place.id.in_(place_ids)).delete(synchronize_session=False)
    db.session.commit()
    return len(place_ids)


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

    deleted_places = reset_demo_places()
    if deleted_places:
        print(f"Reset demo places: removed {deleted_places} old listings")

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
