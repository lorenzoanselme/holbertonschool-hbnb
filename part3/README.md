# HBnB - Part 2: Business Logic + API REST

## Vue d'ensemble

La partie 2 du projet **HBnB** implémente:

- les entités métier principales (`User`, `Place`, `Review`, `Amenity`)
- les règles de validation via setters `@property`
- une couche service avec pattern **Facade**
- une API REST en **Flask-RESTX** (avec Swagger)
- un repository en mémoire (`InMemoryRepository`) pour le stockage temporaire

Cette version est orientée développement/tests: les données sont perdues au redémarrage.

---

## Stack technique

- Python 3
- Flask
- Flask-RESTX
- Tests: `unittest`

---

## Structure du projet

```text
part2/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   └── v1/
│   │       ├── users.py
│   │       ├── amenities.py
│   │       ├── places.py
│   │       └── reviews.py
│   ├── models/
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── place.py
│   │   ├── review.py
│   │   └── amenity.py
│   ├── persistence/
│   │   └── repository.py
│   └── services/
│       └── facade.py
├── test/
│   ├── test_user.py
│   ├── test_amenity.py
│   ├── test_place.py
│   └── test_review.py
├── config.py
├── run.py
├── requirements.txt
└── TEST_REPORT.md
```

---

## Modèle métier

### `BaseModel`

Toutes les entités héritent de `BaseModel`:

- `id` (UUID en string)
- `created_at`
- `updated_at`
- `save()` met à jour `updated_at`
- `update(data)` met à jour les attributs existants (et déclenche les validations)

### Règles de validation

- **User**
    - `first_name` et `last_name`: obligatoires, max 50 caractères
    - `email`: obligatoire, format de base valide
    - `is_admin`: booléen
- **Place**
    - `title`: obligatoire, max 100 caractères
    - `description`: string (ou vide)
    - `price`: nombre strictement positif
    - `latitude`: entre -90 et 90
    - `longitude`: entre -180 et 180
    - `owner`: instance de `User`
- **Review**
    - `text`: obligatoire
    - `rating`: entier entre 1 et 5
    - `place`: instance de `Place`
    - `user`: instance de `User`
- **Amenity**
    - `name`: obligatoire, max 50 caractères

### Relations

- 1 `User` possède plusieurs `Place`
- 1 `Place` possède plusieurs `Review`
- 1 `Place` possède plusieurs `Amenity`

Les méthodes `to_dict()` sérialisent les objets avec des IDs (pas de nested objects complexes).

---

## API REST

L'application expose Swagger à l'URL:

- `http://127.0.0.1:5000/api/v1/`

Namespaces disponibles:

- `/api/v1/users/`
- `/api/v1/amenities/`
- `/api/v1/places/`
- `/api/v1/reviews/`

### Endpoints principaux

- **Users**
    - `POST /api/v1/users/`
    - `GET /api/v1/users/`
    - `GET /api/v1/users/<user_id>`
    - `PUT /api/v1/users/<user_id>`
- **Amenities**
    - `POST /api/v1/amenities/`
    - `GET /api/v1/amenities/`
    - `GET /api/v1/amenities/<amenity_id>`
    - `PUT /api/v1/amenities/<amenity_id>`
- **Places**
    - `POST /api/v1/places/`
    - `GET /api/v1/places/`
    - `GET /api/v1/places/<place_id>`
    - `PUT /api/v1/places/<place_id>`
- **Reviews**
    - `POST /api/v1/reviews/`
    - `GET /api/v1/reviews/`
    - `GET /api/v1/reviews/<review_id>`
    - `PUT /api/v1/reviews/<review_id>`
    - `DELETE /api/v1/reviews/<review_id>`

---

## Installation et exécution

Depuis `part2/`:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

Puis ouvrir Swagger:

- `http://127.0.0.1:5000/api/v1/`

---

## Tests

Depuis `part2/`:

```bash
python3 -m unittest discover -s test -p "test_*.py" -v
```

Le détail des tests manuels/API est dans `TEST_REPORT.md`.

---

## Limites actuelles

- Persistance en mémoire uniquement (pas de base de données)
- Pas d'authentification/autorisation dans cette étape
- API centrée sur les opérations CRUD demandées pour la partie 2

---

## Auteurs

- Lorenzo Anselme
- Lucas Mettetal

Holberton School
