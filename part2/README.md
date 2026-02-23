# HBnB - Part 2: Core Business Logic Layer

## Project Overview

This part of the HBnB project focuses on implementing the **Business
Logic Layer** of the application.

The goal is to design and implement the core domain entities with:

-   UUID-based identification
-   Timestamp management
-   Business rule validation using `@property` setters
-   Proper entity relationships
-   Clean serialization via `to_dict()` methods

This layer is independent from the API (Presentation layer) and the
Persistence layer.

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
-   `save()` → updates `updated_at`
-   `update(data)` → updates attributes dynamically (triggers property
    setters)

### Why UUID?

-   Guarantees global uniqueness
-   Prevents predictable sequential IDs
-   Supports scalability and distributed systems

------------------------------------------------------------------------

## Attribute Validation Strategy

All validation logic is implemented inside the **Business Logic layer**
using `@property` setters.

This ensures:

-   Validation at object creation
-   Validation during attribute updates
-   Data integrity independent from the API layer

### Enforced Rules

**User** - `first_name`, `last_name` → required, max 50 characters -
`email` → required, basic format validation - `is_admin` → must be
boolean

**Place** - `title` → required, max 100 characters - `price` → must be
positive - `latitude` → between -90 and 90 - `longitude` → between -180
and 180 - `owner` → must reference a valid User-like object

**Review** - `text` → required - `rating` → integer between 1 and 5 -
Stores `place_id` and `user_id`

**Amenity** - `name` → required, max 50 characters

------------------------------------------------------------------------

## Entity Relationships

### User → Place (One-to-Many)

A user can own multiple places.

### Place → Review (One-to-Many)

A place can have multiple reviews.

### Place ↔ Amenity (Many-to-Many)

A place can have multiple amenities.

------------------------------------------------------------------------

## Serialization Strategy

Objects are converted using `to_dict()`.

To keep responses API-ready:

-   Related objects are represented by their IDs
-   No nested object serialization
-   Ensures clean JSON output

Example:

``` python
"reviews": [r.id for r in self.reviews]
"amenities": [a.id for a in self.amenities]
"owner": self.owner.id
```

------------------------------------------------------------------------

## Testing

Independent test files validate:

-   Object creation
-   Default values
-   Validation rules
-   Relationship integrity

All tests pass successfully after implementing property-based
validation.

------------------------------------------------------------------------

## Outcome

The Business Logic layer now provides:

-   Clean OOP architecture
-   Strong data validation
-   Proper relationship management
-   API-ready serialization
-   Compatibility with provided Facade and Repository layers

The project is now ready for API integration and persistence handling in
the next stages.

------------------------------------------------------------------------

## Authors

Lorenzo Anselme\
Lucas Mettetal

Holberton School
