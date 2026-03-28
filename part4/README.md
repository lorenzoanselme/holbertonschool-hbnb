# HBnB - Part 4

## Overview

`part4` is the current working application.

It includes:

- a Flask REST API with Swagger
- SQLite persistence through SQLAlchemy
- JWT authentication
- role-aware authorization for admin and regular users
- a static frontend served separately from the API
- profile pages with avatars and bios
- place creation and management
- reviews, host responses, and notifications

## Stack

- Python 3
- Flask
- Flask-RESTX
- Flask-SQLAlchemy
- Flask-JWT-Extended
- Flask-Bcrypt
- Flask-CORS
- SQLite
- Vanilla HTML / CSS / JavaScript
- Docker / Docker Compose

## Project Structure

```text
part4/
├── app/
│   ├── api/v1/
│   ├── models/
│   ├── persistence/
│   └── services/
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── *.html
├── config.py
├── Dockerfile
├── requirements.txt
├── run.py
└── seed.py
```

## Local Run

From `part4/`:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

Open:

- Swagger: `http://localhost:5000/api/v1/`

To serve the frontend locally in another terminal:

```bash
python3 -m http.server 8080 --directory frontend
```

Then open:

- Frontend: `http://localhost:8080/login.html`

## Docker

From the repository root:

1. Create a local env file from the example:

```bash
cp .env.example .env
```

2. Replace the placeholder secrets in `.env` with strong random values.

3. Start the hardened local stack:

```bash
docker compose up --build
```

Services:

- Backend API through Nginx gateway: `http://localhost:5001/api/v1/`
- Frontend: `http://localhost:8080/login.html`
- PostgreSQL runs internally in Docker

Notes:

- the backend is built from [Dockerfile](/Users/nguyenmelya/Documents/holbertonschool-hbnb/part4/Dockerfile)
- the backend now runs behind Gunicorn and an Nginx API gateway
- the backend no longer exposes its container port directly to the host
- the frontend is still served as a separate container
- PostgreSQL is the recommended database in Docker
- `part4/frontend/assets/uploads/` is mounted to persist uploaded profile images
- the API gateway enforces request limits and request size limits
- for real production over HTTPS, set `FLASK_CONFIG=config.ProductionConfig` and `JWT_COOKIE_SECURE=1`

## Local HTTPS

To run the stack with local TLS:

```bash
cd part4
chmod +x scripts/generate_local_tls.sh
./scripts/generate_local_tls.sh
cd ..
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build -d
```

Endpoints:

- Frontend over HTTPS: `https://localhost:8443/login.html`
- API over HTTPS: `https://localhost:5443/api/v1/`

Notes:

- the local certificate is self-signed, so your browser will warn unless you trust it manually
- HTTPS mode enables `JWT_COOKIE_SECURE=1`
- HTTPS mode keeps frontend and backend separated on different ports

## Security Notes

- authentication uses `HttpOnly` cookies with CSRF protection
- production mode refuses to start without explicit `SECRET_KEY` and `JWT_SECRET_KEY`
- password policy requires:
  - at least 10 characters
  - at least one uppercase letter
  - at least one lowercase letter
  - at least one digit
  - at most 72 UTF-8 bytes because of bcrypt limits
- uploaded images are validated and re-encoded with Pillow before storage
- active frontend pages use a stricter CSP without inline styles
- the backend uses `ProxyFix` to behave correctly behind a reverse proxy
- Docker uses a non-root backend container and Gunicorn for serving Flask
- a maintenance script is available at [purge_security_data.py](/Users/nguyenmelya/Documents/holbertonschool-hbnb/part4/scripts/purge_security_data.py)
- route hardening and a functional pentest summary are documented in:
  - [DEPLOYMENT_CHECKLIST.md](/Users/nguyenmelya/Documents/holbertonschool-hbnb/part4/DEPLOYMENT_CHECKLIST.md)
  - [SECURITY_PENTEST_REPORT.md](/Users/nguyenmelya/Documents/holbertonschool-hbnb/part4/SECURITY_PENTEST_REPORT.md)

## Main Features

- authentication with register / login
- public place listing and place details
- host profiles with public information
- user profile editing with avatar upload
- host place management
- one review per user per place
- host replies to reviews
- notifications for new reviews on hosted places
- review history in profile

## Current Notes

- frontend and backend are intentionally separated
- API base URL is centralized in `frontend/js/runtime-config.js`
- debug mode is driven by configuration instead of being hardcoded in `run.py`
- runtime data such as SQLite files and uploads should stay out of Git
