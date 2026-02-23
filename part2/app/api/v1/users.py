# app/api/v1/users.py
from flask import request
from flask_restx import Namespace, Resource

from app.services.facade import (
    HBnBFacade,
    NotFoundError,
    ValidationError,
    ConflictError,
)

api = Namespace("users", path="/users", description="Users endpoints")
facade = HBnBFacade()  # NOTE: pour dev. Idéalement singleton global partagé.


@api.route("")
class UsersList(Resource):
    def get(self):
        return facade.list_users(), 200

    def post(self):
        try:
            data = request.get_json(force=True) or {}
            user = facade.create_user(data)
            return user, 201
        except ValidationError as e:
            return {"error": str(e)}, 400
        except ConflictError as e:
            return {"error": str(e)}, 409


@api.route("/<string:user_id>")
class UsersItem(Resource):
    def get(self, user_id):
        try:
            return facade.get_user(user_id), 200
        except NotFoundError as e:
            return {"error": str(e)}, 404

    def put(self, user_id):
        try:
            data = request.get_json(force=True) or {}
            return facade.update_user(user_id, data), 200
        except NotFoundError as e:
            return {"error": str(e)}, 404
        except ValidationError as e:
            return {"error": str(e)}, 400
        except ConflictError as e:
            return {"error": str(e)}, 409
