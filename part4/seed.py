"""
seed.py — Populate the database with test data.
Run once:  python3 seed.py
"""

from app import create_app
from app.services.facade import HBnBFacade

app    = create_app()
facade = HBnBFacade()

PLACES = [
    {
        "title": "Cozy Studio in Paris",
        "description": "A charming studio in the heart of Montmartre. Walk to the Sacré-Cœur in 5 minutes, enjoy local cafés and the vibrant artist scene.",
        "price": 85,
        "latitude": 48.8867,
        "longitude": 2.3431,
        "amenities": ["WiFi", "Kitchen", "Air conditioning"],
    },
    {
        "title": "Beach House in Nice",
        "description": "Stunning sea-view villa steps from the Promenade des Anglais. Private terrace, Mediterranean breeze, and a heated pool.",
        "price": 220,
        "latitude": 43.7102,
        "longitude": 7.2620,
        "amenities": ["WiFi", "Pool", "Parking", "Air conditioning"],
    },
    {
        "title": "Mountain Chalet in Chamonix",
        "description": "Rustic wooden chalet at 1 050 m altitude. Fireplace, ski-in/ski-out access, breathtaking views of Mont Blanc.",
        "price": 175,
        "latitude": 45.9237,
        "longitude": 6.8694,
        "amenities": ["WiFi", "Fireplace", "Parking", "Kitchen"],
    },
    {
        "title": "Modern Loft in Bordeaux",
        "description": "Industrial-style loft in the Saint-Pierre district. Exposed brick walls, high ceilings, and all the wine culture you can handle.",
        "price": 95,
        "latitude": 44.8378,
        "longitude": -0.5792,
        "amenities": ["WiFi", "Kitchen", "Washer"],
    },
    {
        "title": "Provençal Farmhouse",
        "description": "Authentic mas in the Luberon with lavender fields, stone walls, and a private pool. Perfect for a peaceful countryside escape.",
        "price": 310,
        "latitude": 43.8585,
        "longitude": 5.3676,
        "amenities": ["Pool", "Parking", "Kitchen", "Air conditioning"],
    },
    {
        "title": "Tiny House in Brittany",
        "description": "Eco-friendly tiny house surrounded by pine forest, 10 minutes from the rugged Breton coastline.",
        "price": 55,
        "latitude": 48.2141,
        "longitude": -2.9322,
        "amenities": ["WiFi", "Kitchen"],
    },
]

with app.app_context():
    # ── Find or create the admin user ──────────────────────
    owner = facade.get_user_by_email("admin@hbnb.io")
    if not owner:
        print("Creating admin user…")
        owner = facade.create_user({
            "first_name": "Admin",
            "last_name":  "HBnB",
            "email":      "admin@hbnb.io",
            "password":   "Admin1234!",
            "is_admin":   True,
        })
        print(f"  Created user: {owner.email} (id={owner.id})")
    else:
        print(f"Using existing user: {owner.email} (id={owner.id})")

    # ── Create amenities (skip duplicates) ─────────────────
    existing_amenities = {a.name: a for a in facade.get_all_amenities()}
    amenity_map = dict(existing_amenities)

    needed = {name for p in PLACES for name in p["amenities"]}
    for name in needed:
        if name not in amenity_map:
            a = facade.create_amenity({"name": name})
            amenity_map[name] = a
            print(f"  Created amenity: {name}")

    # ── Create places ──────────────────────────────────────
    existing_titles = {p.title for p in facade.get_all_places()}

    created = 0
    for data in PLACES:
        if data["title"] in existing_titles:
            print(f"  Skipping (exists): {data['title']}")
            continue

        amenity_ids = [amenity_map[n].id for n in data["amenities"]]
        place = facade.create_place({
            "title":       data["title"],
            "description": data["description"],
            "price":       data["price"],
            "latitude":    data["latitude"],
            "longitude":   data["longitude"],
            "owner_id":    owner.id,
            "amenities":   amenity_ids,
        })
        print(f"  Created place: {place.title} (${place.price}/night)")
        created += 1

    print(f"\nDone — {created} place(s) added.")
