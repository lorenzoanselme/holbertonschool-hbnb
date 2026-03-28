import os
from datetime import datetime
from typing import Any

from flask import Flask, jsonify, request
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restx import Api
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from werkzeug.middleware.proxy_fix import ProxyFix

from app.security import configure_security_logger

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()


def ensure_sqlite_columns(app):
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not db_uri.startswith("sqlite:///"):
        return

    with db.engine.begin() as connection:

        def safe_execute(statement):
            try:
                connection.execute(text(statement))
            except OperationalError as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise

        columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(users)"))
        }
        if "bio" not in columns:
            safe_execute("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''")
        if "profile_picture_url" not in columns:
            safe_execute(
                "ALTER TABLE users ADD COLUMN profile_picture_url "
                "VARCHAR(500) NOT NULL DEFAULT ''"
            )

        review_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(reviews)"))
        }
        if "owner_response" not in review_columns:
            safe_execute(
                "ALTER TABLE reviews ADD COLUMN owner_response TEXT NOT NULL DEFAULT ''"
            )
        if "owner_response_at" not in review_columns:
            safe_execute(
                "ALTER TABLE reviews ADD COLUMN owner_response_at DATETIME NULL"
            )

        place_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(places)"))
        }
        if "image_url" not in place_columns:
            safe_execute(
                "ALTER TABLE places ADD COLUMN image_url VARCHAR(500) "
                "NOT NULL DEFAULT ''"
            )
        if "image_urls_json" not in place_columns:
            safe_execute(
                "ALTER TABLE places ADD COLUMN image_urls_json TEXT "
                "NOT NULL DEFAULT '[]'"
            )


def create_app(config_class="config.Config"):
    from app.api.v1.amenities import api as amenities_ns
    from app.api.v1.auth import api as auth_ns
    from app.api.v1.notifications import api as notifications_ns
    from app.api.v1.places import api as places_ns
    from app.api.v1.reviews import api as reviews_ns
    from app.api.v1.users import api as users_ns
    from app.models.revoked_token import RevokedToken

    app = Flask(__name__)
    app.config.from_object(config_class)
    configure_security_logger(app)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    if not app.debug:
        if not os.getenv("SECRET_KEY") or not os.getenv("JWT_SECRET_KEY"):
            raise RuntimeError(
                "Production requires SECRET_KEY and JWT_SECRET_KEY environment variables"
            )
        if not app.config.get("JWT_COOKIE_SECURE"):
            raise RuntimeError("Production requires JWT_COOKIE_SECURE enabled")

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    api_kwargs: dict[str, Any] = {
        "version": "1.0",
        "title": "HBnB API",
        "description": "HBnB Application API",
    }
    if app.debug:
        api_kwargs["doc"] = "/api/v1/"

    api = Api(
        app,
        **api_kwargs,
    )

    api.add_namespace(users_ns, path="/api/v1/users")
    api.add_namespace(amenities_ns, path="/api/v1/amenities")
    api.add_namespace(places_ns, path="/api/v1/places")
    api.add_namespace(reviews_ns, path="/api/v1/reviews")
    api.add_namespace(auth_ns, path="/api/v1/auth")
    api.add_namespace(notifications_ns, path="/api/v1/notifications")

    with app.app_context():
        db.create_all()
        ensure_sqlite_columns(app)
        db.session.execute(
            text("DELETE FROM revoked_tokens WHERE expires_at < :now"),
            {"now": datetime.utcnow()},
        )
        db.session.commit()

    @jwt.token_in_blocklist_loader
    def is_token_revoked(_jwt_header, jwt_payload):
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        return db.session.query(RevokedToken.id).filter_by(jti=jti).first() is not None

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return jsonify({"error": "Session has been revoked"}), 401

    @app.after_request
    def apply_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(self), microphone=(), camera=()"
        )
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

    @app.errorhandler(413)
    def payload_too_large(_error):
        return jsonify({"error": "Uploaded file is too large"}), 413

    return app
