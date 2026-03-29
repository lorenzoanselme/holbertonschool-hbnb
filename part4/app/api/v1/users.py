import os
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta

from flask import request
from flask_jwt_extended import (
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)
from flask_jwt_extended.exceptions import JWTExtendedException
from flask_restx import Namespace, Resource, fields
from werkzeug.utils import secure_filename

from app.image_uploads import IMAGE_TYPE_EXTENSIONS, process_uploaded_image
from app.security import audit_event
from app.services import facade

api = Namespace("users", description="User operations")
UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../frontend/assets/uploads")
)
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
UPLOAD_RATE_LIMITS = {"photo_upload": {"max_attempts": 12, "window_seconds": 600}}
UPLOAD_ATTEMPTS = defaultdict(deque)
ADMIN_EDITABLE_FIELDS = {
    "first_name",
    "last_name",
    "email",
    "password",
    "is_admin",
    "bio",
    "profile_picture_url",
}
SELF_EDITABLE_FIELDS = {"first_name", "last_name", "bio", "profile_picture_url"}


def get_client_identifier():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "unknown"


def enforce_upload_rate_limit(scope, identifier):
    config = UPLOAD_RATE_LIMITS[scope]
    now = datetime.utcnow()
    window = timedelta(seconds=config["window_seconds"])
    attempts = UPLOAD_ATTEMPTS[(scope, identifier)]

    while attempts and now - attempts[0] > window:
        attempts.popleft()

    if len(attempts) >= config["max_attempts"]:
        retry_after = int(
            max(
                1,
                config["window_seconds"] - (now - attempts[0]).total_seconds(),
            )
        )
        return retry_after

    attempts.append(now)
    return None


def serialize_user(user, include_private=False):
    payload = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "bio": user.bio,
        "profile_picture_url": user.profile_picture_url,
        "created_at": user._serialize_datetime(user.created_at),
        "updated_at": user._serialize_datetime(user.updated_at),
    }
    if include_private:
        payload["email"] = user.email
        payload["is_admin"] = user.is_admin
    return payload


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

    @jwt_required()
    def get(self):
        claims = get_jwt()
        if not claims.get("is_admin"):
            return {"error": "Admin privileges required"}, 403
        users = facade.get_all_users()
        return [serialize_user(u, include_private=True) for u in users], 200


@api.route("/<string:user_id>")
class UsersItem(Resource):
    def get(self, user_id):
        user = facade.get_user(user_id)
        if not user:
            return {"error": "User not found"}, 404
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
            claims = get_jwt() if current_user_id else {}
        except JWTExtendedException:
            current_user_id = None
            claims = {}
        include_private = current_user_id == user_id or claims.get("is_admin", False)
        return serialize_user(user, include_private=include_private), 200

    @jwt_required()
    def put(self, user_id):
        """Modify user information"""
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        if is_admin:
            data = request.get_json(force=True) or {}
            unexpected_fields = set(data) - ADMIN_EDITABLE_FIELDS
            if unexpected_fields:
                return {
                    "error": f"Unsupported fields: {', '.join(sorted(unexpected_fields))}"
                }, 400

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
        unexpected_fields = set(data) - SELF_EDITABLE_FIELDS
        if unexpected_fields:
            return {
                "error": f"Unsupported fields: {', '.join(sorted(unexpected_fields))}"
            }, 400

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
        retry_after = enforce_upload_rate_limit(
            "photo_upload", f"{get_client_identifier()}:{current_user_id}"
        )
        if retry_after:
            audit_event(
                "user.photo_upload.rate_limited",
                outcome="blocked",
                user_id=current_user_id,
                target_user_id=user_id,
            )
            return {
                "error": "Too many uploads. Try again later.",
                "retry_after": retry_after,
            }, 429

        if not is_admin and current_user_id != user_id:
            audit_event(
                "user.photo_upload.forbidden",
                outcome="denied",
                user_id=current_user_id,
                target_user_id=user_id,
            )
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
        try:
            detected_type, image_bytes = process_uploaded_image(photo)
        except ValueError as e:
            audit_event(
                "user.photo_upload.invalid",
                outcome="denied",
                user_id=current_user_id,
                target_user_id=user_id,
                reason=str(e),
            )
            return {"error": str(e)}, 400

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        canonical_extension = IMAGE_TYPE_EXTENSIONS[detected_type]
        filename = secure_filename(f"{user_id}-{uuid.uuid4().hex}{canonical_extension}")
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as output_file:
            output_file.write(image_bytes)

        photo_url = f"assets/uploads/{filename}"
        try:
            updated_user = facade.update_user(
                user_id, {"profile_picture_url": photo_url}
            )
        except ValueError as e:
            return {"error": str(e)}, 400

        if not updated_user:
            return {"error": "User not found"}, 404

        audit_event("user.photo_upload.succeeded", user_id=user_id, photo_url=photo_url)

        return {
            "profile_picture_url": photo_url,
            "user": serialize_user(
                updated_user, include_private=is_admin or current_user_id == user_id
            ),
        }, 200
