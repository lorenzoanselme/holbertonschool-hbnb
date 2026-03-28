import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI", "sqlite:///development.db"
    )


class DevelopmentConfig(Config):
    DEBUG = True


config = {"development": DevelopmentConfig, "default": DevelopmentConfig}
