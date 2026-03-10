from app import create_app
from app.services import facade

app = create_app()

# seed admin temporaire
try:
    if not facade.get_user_by_email("admin@test.com"):
        facade.create_user({
            "first_name": "Admin",
            "last_name": "User",
            "email": "admin@test.com",
            "password": "123456",
            "is_admin": True
        })
        print("Admin de test créé : admin@test.com / 123456")
except Exception as e:
    print("Admin seed error:", e)

if __name__ == "__main__":
    print("Swagger: http://127.0.0.1:5000/api/v1/")
    app.run(host="0.0.0.0", port=5000)
