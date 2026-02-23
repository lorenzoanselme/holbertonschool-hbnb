# HBnB - Part 2: Core Business Logic Implementation

## Project Overview

This part of the HBnB project focuses on implementing the **Business
Logic Layer**. The goal is to design and implement the core domain
entities and their relationships while following clean architecture and
modular design principles.

The business logic layer is independent from the API (Presentation
layer) and Persistence layer, and represents the core foundation of the
application.

------------------------------------------------------------------------

## Project Structure

    part2/
    │
    ├── app/
    │   ├── api/
    │   │   └── v1/
    │   │       ├── users.py
    │   │       ├── places.py
    │   │       ├── reviews.py
    │   │       └── amenities.py
    │   │
    │   ├── models/
    │   │   ├── base.py
    │   │   ├── user.py
    │   │   ├── place.py
    │   │   ├── review.py
    │   │   └── amenity.py
    │   │
    │   ├── persistence/
    │   │   └── repository.py
    │   │
    │   └── services/
    │       └── facade.py
    │
    ├── test/
    │   ├── test_user
    │   ├── test_place
    │   └── test_amenity
    │
    ├── config.py
    ├── run.py
    └── requirements.txt

------------------------------------------------------------------------

## BaseModel

All entities inherit from `BaseModel`, which provides:

-   `id` (UUID stored as string)
-   `created_at`
-   `updated_at`
-   `save()` method to update timestamps
-   `update(data)` method to dynamically update attributes

### Why UUID?

UUIDs are used because:

-   They ensure global uniqueness
-   They improve security (non-sequential IDs)
-   They support scalability and distributed systems

------------------------------------------------------------------------

## User

Attributes:

-   id
-   first_name (required, max 50 characters)
-   last_name (required, max 50 characters)
-   email (required, unique, valid format)
-   is_admin (default: False)
-   created_at
-   updated_at

Relationship:

-   One user can own multiple places (One-to-Many).

------------------------------------------------------------------------

## Place

Attributes:

-   id
-   title (required, max 100 characters)
-   description (optional)
-   price (positive float)
-   latitude (-90 to 90)
-   longitude (-180 to 180)
-   owner (User instance)
-   reviews (list)
-   amenities (list)
-   created_at
-   updated_at

Relationships:

-   One-to-Many: Place → Review
-   Many-to-Many: Place ↔ Amenity

When serialized to dictionary, only related entity IDs are returned:

``` python
"reviews": [r.id for r in self.reviews],
"amenities": [a.id for a in self.amenities]
```

------------------------------------------------------------------------

## Review

Attributes:

-   id
-   text (required)
-   rating (integer between 1 and 5)
-   place (Place instance)
-   user (User instance)
-   created_at
-   updated_at

Each review belongs to:

-   One user
-   One place

------------------------------------------------------------------------

## Amenity

Attributes:

-   id
-   name (required, max 50 characters)
-   created_at
-   updated_at

Used in a many-to-many relationship with Place.

------------------------------------------------------------------------

## Relationships Summary

User └── owns → Place (1:N)

Place ├── has → Review (1:N) └── has → Amenity (M:N)

Review ├── belongs to → User └── belongs to → Place

------------------------------------------------------------------------

## Testing

Basic tests were implemented to validate:

-   Object creation
-   Default values
-   Relationship integrity
-   Adding reviews and amenities
-   UUID generation and timestamps

Example:

``` python
owner = User(first_name="Alice", last_name="Smith", email="alice@example.com")
place = Place(title="Cozy Apartment", description="Nice place", price=100,
              latitude=37.7749, longitude=-122.4194, owner=owner)

review = Review(text="Great stay!", rating=5, place=place, user=owner)
place.add_review(review)

assert len(place.reviews) == 1
```

------------------------------------------------------------------------

## Outcome

The business logic layer is now fully implemented and ready to be
integrated with the API and persistence layers in the next stages.

This implementation ensures:

-   Clean object-oriented design
-   Proper entity relationships
-   UUID-based identification
-   Timestamp management
-   Data consistency across models

------------------------------------------------------------------------

## Author

Lorenzo Anselme
Lucas Mettetal
Holberton School -- Web & Web Mobile Foundations
