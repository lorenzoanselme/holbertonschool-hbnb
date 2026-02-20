from flask import Flask
from flask_restx import Api, Namespace, Resource

api = Api(title="HBnB API", version="1.0", doc="/")

health_ns = Namespace("health", description="Healthcheck")

@health_ns.route("/")
class Health(Resource):
    def get(self):
        return {"status": "ok"}, 200

def init_api(app: Flask):
    api.init_app(app)
    api.add_namespace(health_ns)
