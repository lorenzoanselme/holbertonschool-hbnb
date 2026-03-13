# HBnB - Part 3: Authentication, Authorization, and Persistence

## Overview

Part 3 of the HBnB project extends the previous API with:

- JWT-based authentication with `flask-jwt-extended`
- Password hashing with `flask-bcrypt`
- Role-based authorization for admin and regular users
- SQLAlchemy persistence for users with SQLite
- SQL schema and seed files for database setup

This version is only partially persistent:

- `User` objects are stored in SQLite through SQLAlchemy
- `Place`, `Review`, and `Amenity` still use the in-memory repository

That means non-user data is lost when the app restarts.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3 |
| Web framework | Flask |
| API layer | Flask-RESTX |
| Authentication | Flask-JWT-Extended |
| Password hashing | Flask-Bcrypt |
| ORM | Flask-SQLAlchemy |
| Database | SQLite |
| Unit tests | `unittest` |
| Integration tests | `bash` + `curl` |

---

## Project Structure

```text
part3/
├── app/
│   ├── __init__.py
│   ├── extensions.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__
│   │       ├── amenities.py
│   │       ├── auth.py
│   │       ├── places.py
│   │       ├── reviews.py
│   │       └── users.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── amenity.py
│   │   ├── base.py
│   │   ├── place.py
│   │   ├── review.py
│   │   └── user.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   └── repository.py
│   └── services/
│       ├── __init__.py
│       ├── facade.py
│       └── repositories/
│           └── user_repository.py
├── config.py
├── instance/
├── README.md
├── requirements.txt
├── run.py
├── sql/
│   ├── schema.sql
│   └── seed.sql
├── test/
│   ├── test_amenity.py
│   ├── test_place.py
│   ├── test_review.py
│   └── test_user.py
├── test_admin_flow.sh
├── test_flow.sh
└── TEST_REPORT.md
```

---

## Application Setup

### Configuration

`config.py` defines a `DevelopmentConfig` with:

- `DEBUG = True`
- `SQLALCHEMY_DATABASE_URI = 'sqlite:///development.db'`
- `SQLALCHEMY_TRACK_MODIFICATIONS = False`

### App Factory

`app/__init__.py` creates the Flask app and registers:

- `bcrypt`
- `jwt`
- `db`
- Flask-RESTX namespaces for users, amenities, places, reviews, and auth

Swagger UI is exposed at:

`http://127.0.0.1:5000/api/v1/`

### Startup Behavior

`run.py` creates the app and seeds a temporary admin user on startup if it does not already exist:

- Email: `admin@test.com`
- Password: `123456`

This startup seed is separate from `sql/seed.sql`.

---

## Domain Model

### BaseModel

All entities inherit from `BaseModel`, which provides:

- `id`
- `created_at`
- `updated_at`
- `save()`
- `update(data)`
- `to_dict()`

### Entities

#### User

- Table: `users`
- Fields: `first_name`, `last_name`, `email`, `password`, `is_admin`
- `email` is unique
- Passwords are hashed with bcrypt
- Has a one-to-many relationship with `Place`

#### Place

- Table: `place`
- Fields: `title`, `description`, `price`, `latitude`, `longitude`, `owner_id`
- `owner_id` references `users.id`
- Has many reviews
- Has a many-to-many relationship with amenities through `place_amenity`

#### Review

- Table: `review`
- Fields: `text`, `rating`, `place_id`, `user_id`
- `place_id` references `place.id`
- `user_id` references `users.id`

#### Amenity

- Table: `amenity`
- Field: `name`

### Relationships

- One user can own multiple places
- One place can have multiple reviews
- One place can have multiple amenities

---

## Persistence Layer

`app/persistence/repository.py` defines three repository classes:

### Repository

Abstract base class with:

- `add`
- `get`
- `get_all`
- `update`
- `delete`
- `get_by_attribute`

### InMemoryRepository

Used for:

- `Place`
- `Review`
- `Amenity`

Stores objects in a Python dictionary.

### SQLAlchemyRepository

Used as the base repository for SQLAlchemy-backed models.

`UserRepository` extends it and adds:

- `get_user_by_email(email)`

### Facade

`HBnBFacade` is the service layer entry point. It exposes creation, retrieval, update, and delete operations for all major entities.

Important implementation detail:

- `user_repo` uses `UserRepository` and persists data in SQLite
- `place_repo`, `review_repo`, and `amenity_repo` use `InMemoryRepository`

---

## Database Files

### `sql/schema.sql`

Creates these tables:

- `users`
- `place`
- `review`
- `amenity`
- `place_amenity`

Notable constraints:

- `users.email` is unique
- `review.rating` must be between 1 and 5
- `review` has a unique constraint on `(user_id, place_id)`
- `amenity.name` is unique

### `sql/seed.sql`

Seeds:

- One admin user with email `admin@hbnb.io`
- Three default amenities: `WiFi`, `Swimming Pool`, `Air Conditioning`

Note: the application itself seeds `admin@test.com / 123456` in `run.py`, while `seed.sql` contains a separate SQL-level admin record.

---

## Authentication and Authorization

### Login Endpoint

`POST /api/v1/auth/login`

Request body:

```json
{
  "email": "admin@test.com",
  "password": "123456"
}
```

Successful response:

```json
{
  "access_token": "<jwt>"
}
```

The JWT includes:

- the user id as identity
- an `is_admin` claim

Protected routes require:

`Authorization: Bearer <token>`

---

## API Endpoints

### Auth

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/api/v1/auth/login` | Public | Authenticate a user and return a JWT |

### Users

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/v1/users/` | Public | List all users |
| `POST` | `/api/v1/users/` | Admin only | Create a user |
| `GET` | `/api/v1/users/<user_id>` | Public | Get one user |
| `PUT` | `/api/v1/users/<user_id>` | Self or admin | Update a user |

Rules:

- A non-admin cannot update another user
- A non-admin cannot change `email` or `password`
- Email uniqueness is checked on update

### Amenities

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/v1/amenities/` | Public | List all amenities |
| `POST` | `/api/v1/amenities/` | Admin only | Create an amenity |
| `GET` | `/api/v1/amenities/<amenity_id>` | Public | Get one amenity |
| `PUT` | `/api/v1/amenities/<amenity_id>` | Admin only | Update an amenity |

### Places

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/v1/places/` | Public | List all places |
| `POST` | `/api/v1/places/` | Authenticated | Create a place |
| `GET` | `/api/v1/places/<place_id>` | Public | Get one place |
| `PUT` | `/api/v1/places/<place_id>` | Owner or admin | Update a place |

Rules:

- `owner_id` is taken from the JWT on creation
- `owner` and `owner_id` are ignored on update

### Reviews

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/api/v1/reviews/` | Authenticated | Create a review |
| `GET` | `/api/v1/reviews/<review_id>` | Public | Get one review |
| `PUT` | `/api/v1/reviews/<review_id>` | Author or admin | Update a review |
| `DELETE` | `/api/v1/reviews/<review_id>` | Author or admin | Delete a review |

Rules:

- A user cannot review their own place
- A user cannot submit two reviews for the same place
- Only `text` and `rating` are updated through the facade

---

## Installation and Run

From `part3/`:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

Then open:

`http://127.0.0.1:5000/api/v1/`

---

## Testing

### Unit Tests

Run from `part3/`:

```bash
python3 -m unittest discover -s test -p "test_*.py" -v
```

These tests cover the CRUD endpoints for users, amenities, places, and reviews.

Note: these test files come from the earlier API stage and do not reflect the current JWT/admin requirements on every route.

### Integration Scripts

Run from `part3/`:

```bash
bash test_flow.sh
bash test_admin_flow.sh
```

`test_flow.sh` covers:

- login for regular users
- place creation and ownership checks
- review creation and duplicate prevention
- self-update rules for users
- forbidden updates for unauthorized users

`test_admin_flow.sh` covers:

- admin login
- admin-only user creation
- admin-only amenity creation and update
- admin override on place and review updates

---

## Known Limitations

- Only users are persisted in SQLite
- Places, reviews, and amenities are still stored in memory
- `TEST_REPORT.md` documents an older testing phase and does not fully represent the current auth-protected API
- `app/api/v1/__init__` exists without the `.py` extension

---

## Authors

- Lorenzo Anselme
- Lucas Mettetal

Holberton School