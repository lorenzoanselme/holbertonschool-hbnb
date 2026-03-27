from app import create_app

app = create_app()

if __name__ == '__main__':
    print("Swagger: http://127.0.0.1:5000/api/v1/")
    app.run(host="0.0.0.0", port=5000, debug=True)
