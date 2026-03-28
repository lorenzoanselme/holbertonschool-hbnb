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
└── start.sh
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

```bash
docker compose up --build
```

Services:

- Backend API: `http://localhost:5001/api/v1/`
- Frontend: `http://localhost:8080/login.html`

Notes:

- the backend is built from [Dockerfile](/Users/nguyenmelya/Documents/holbertonschool-hbnb/part4/Dockerfile)
- the frontend is served as a separate container
- `part4/instance/` is mounted to persist the SQLite database
- `part4/frontend/assets/uploads/` is mounted to persist uploaded profile images

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
