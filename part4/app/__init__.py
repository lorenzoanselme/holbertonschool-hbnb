from flask import Flask
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restx import Api
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()


def ensure_sqlite_columns(app):
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not db_uri.startswith("sqlite:///"):
        return

    with db.engine.begin() as connection:
        columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(users)"))
        }
        if "bio" not in columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''")
            )
        if "profile_picture_url" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN profile_picture_url "
                    "VARCHAR(500) NOT NULL DEFAULT ''"
                )
            )

        review_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(reviews)"))
        }
        if "owner_response" not in review_columns:
            connection.execute(
                text(
                    "ALTER TABLE reviews ADD COLUMN owner_response TEXT NOT NULL DEFAULT ''"
                )
            )
        if "owner_response_at" not in review_columns:
            connection.execute(
                text("ALTER TABLE reviews ADD COLUMN owner_response_at DATETIME NULL")
            )


def create_app(config_class="config.DevelopmentConfig"):
    from app.api.v1.amenities import api as amenities_ns
    from app.api.v1.auth import api as auth_ns
    from app.api.v1.notifications import api as notifications_ns
    from app.api.v1.places import api as places_ns
    from app.api.v1.reviews import api as reviews_ns
    from app.api.v1.users import api as users_ns

    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    api = Api(
        app,
        version="1.0",
        title="HBnB API",
        description="HBnB Application API",
        doc="/api/v1/",
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

    return app
