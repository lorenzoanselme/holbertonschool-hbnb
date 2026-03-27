import os
import uuid

from app.services import facade
from flask import request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields
from werkzeug.utils import secure_filename

api = Namespace("users", description="User operations")
UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../frontend/assets/uploads")
)
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

user_model = api.model(
    "User",
    {
        "first_name": fields.String(
            required=True, description="First name of the user"
        ),
        "last_name": fields.String(required=True, description="Last name of the user"),
        "email": fields.String(required=True, description="Email of the user"),
        "password": fields.String(required=True, description="Password of the user"),
    },
)


@api.route("/")
class UserList(Resource):
    @jwt_required()
    @api.expect(user_model, validate=True)
    @api.response(201, "User successfully created")
    @api.response(403, "Admin privileges required")
    @api.response(400, "Email already registered")
    def post(self):
        """Register a new user (admin only)"""
        claims = get_jwt()
        if not claims.get("is_admin"):
            return {"error": "Admin privileges required"}, 403

        user_data = api.payload
        existing_user = facade.get_user_by_email(user_data["email"])
        if existing_user:
            return {"error": "Email already registered"}, 400

        try:
            new_user = facade.create_user(user_data)
        except ValueError as e:
            return {"error": str(e)}, 400

        return {
            "id": new_user.id,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "email": new_user.email,
        }, 201

    def get(self):
        users = facade.get_all_users()
        return [u.to_dict() for u in users], 200


@api.route("/<string:user_id>")
class UsersItem(Resource):
    def get(self, user_id):
        user = facade.get_user(user_id)
        if not user:
            return {"error": "User not found"}, 404
        return user.to_dict(), 200

    @jwt_required()
    def put(self, user_id):
        """Modify user information"""
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        if is_admin:
            data = request.get_json(force=True) or {}

            if "email" in data:
                existing = facade.get_user_by_email(data["email"])
                if existing and existing.id != user_id:
                    return {"error": "Email already in use"}, 400

            if "password" in data:
                user = facade.get_user(user_id)
                if not user:
                    return {"error": "User not found"}, 404
                user.hash_password(data.pop("password"))

            try:
                user = facade.update_user(user_id, data)
            except ValueError as e:
                return {"error": str(e)}, 400
            if not user:
                return {"error": "User not found"}, 404
            return user.to_dict(), 200

        if current_user_id != user_id:
            return {"error": "Unauthorized action"}, 403

        data = request.get_json(force=True) or {}
        if "email" in data or "password" in data:
            return {"error": "You cannot modify email or password"}, 400

        try:
            user = facade.update_user(user_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400
        if not user:
            return {"error": "User not found"}, 404
        return user.to_dict(), 200


@api.route("/<string:user_id>/photo")
class UserPhotoUpload(Resource):
    @jwt_required()
    def post(self, user_id):
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        if not is_admin and current_user_id != user_id:
            return {"error": "Unauthorized action"}, 403

        user = facade.get_user(user_id)
        if not user:
            return {"error": "User not found"}, 404

        photo = request.files.get("photo")
        if not photo or not photo.filename:
            return {"error": "Photo file is required"}, 400

        extension = os.path.splitext(photo.filename)[1].lower()
        if extension not in ALLOWED_EXTENSIONS:
            return {"error": "Unsupported image format"}, 400

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = secure_filename(f"{user_id}-{uuid.uuid4().hex}{extension}")
        filepath = os.path.join(UPLOAD_DIR, filename)
        photo.save(filepath)

        photo_url = f"assets/uploads/{filename}"
        try:
            updated_user = facade.update_user(
                user_id, {"profile_picture_url": photo_url}
            )
        except ValueError as e:
            return {"error": str(e)}, 400

        if not updated_user:
            return {"error": "User not found"}, 404

        return {
            "profile_picture_url": photo_url,
            "user": updated_user.to_dict(),
        }, 200
