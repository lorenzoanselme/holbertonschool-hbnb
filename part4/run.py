import os

from app import create_app

app = create_app(os.getenv("FLASK_CONFIG", "config.DevelopmentConfig"))

if __name__ == "__main__":
    port = 5000
    print(f"Swagger: http://localhost:{port}/api/v1/")
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", False))
