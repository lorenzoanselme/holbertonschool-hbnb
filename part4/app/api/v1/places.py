import os
import uuid

from flask import request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields
from werkzeug.utils import secure_filename

from app.services import facade

api = Namespace("places", description="Place operations")
UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../frontend/assets/uploads")
)
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

place_model = api.model(
    "Place",
    {
        "title": fields.String(required=True, description="Title of the place"),
        "description": fields.String(description="Description of the place"),
        "image_url": fields.String(description="Image URL of the place"),
        "image_urls": fields.List(
            fields.String, description="List of image URLs for the place"
        ),
        "price": fields.Float(required=True, description="Price per night"),
        "latitude": fields.Float(required=True, description="Latitude of the place"),
        "longitude": fields.Float(required=True, description="Longitude of the place"),
        "amenities": fields.List(
            fields.String, required=True, description="List of amenities IDs"
        ),
    },
)

place_update_model = api.model(
    "PlaceUpdate",
    {
        "title": fields.String(description="Title of the place"),
        "description": fields.String(description="Description of the place"),
        "image_url": fields.String(description="Image URL of the place"),
        "image_urls": fields.List(
            fields.String, description="List of image URLs for the place"
        ),
        "price": fields.Float(description="Price per night"),
        "latitude": fields.Float(description="Latitude of the place"),
        "longitude": fields.Float(description="Longitude of the place"),
        "amenities": fields.List(fields.String, description="List of amenities IDs"),
    },
)


@api.route("/")
class PlaceList(Resource):
    @jwt_required()
    @api.expect(place_model, validate=True)
    @api.response(201, "Place successfully created")
    @api.response(400, "Invalid input data")
    def post(self):
        """Create a new place"""
        current_user = get_jwt_identity()
        place_data = api.payload
        place_data["owner_id"] = current_user
        try:
            place = facade.create_place(place_data)
            return place.to_dict(), 201
        except ValueError as e:
            return {"error": str(e)}, 400

    @api.response(200, "List of places retrieved successfully")
    def get(self):
        """Retrieve a list of all places"""
        places = facade.get_all_places()
        return [p.to_dict() for p in places], 200


@api.route("/<string:place_id>")
class PlaceResource(Resource):
    @api.response(200, "Place details retrieved successfully")
    @api.response(404, "Place not found")
    def get(self, place_id):
        """Get place details by ID"""
        place = facade.get_place(place_id)
        if not place:
            return {"error": "Place not found"}, 404
        return place.to_dict(), 200

    @jwt_required()
    @api.response(204, "Place deleted successfully")
    @api.response(403, "Unauthorized action")
    @api.response(404, "Place not found")
    def delete(self, place_id):
        """Delete a place"""
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        place = facade.get_place(place_id)
        if not place:
            return {"error": "Place not found"}, 404

        if not is_admin and place.owner_id != current_user_id:
            return {"error": "Unauthorized action"}, 403

        facade.delete_place(place_id)
        return "", 204

    @jwt_required()
    @api.expect(place_update_model, validate=True)
    @api.response(200, "Place updated successfully")
    @api.response(403, "Unauthorized action")
    @api.response(404, "Place not found")
    def put(self, place_id):
        """Update a place's information"""
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        place = facade.get_place(place_id)
        if not place:
            return {"error": "Place not found"}, 404

        if not is_admin and place.owner_id != current_user_id:
            return {"error": "Unauthorized action"}, 403

        data = request.get_json(force=True) or {}
        try:
            updated = facade.update_place(place_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400
        if not updated:
            return {"error": "Place not found"}, 404

        return updated.to_dict(), 200


@api.route("/<string:place_id>/reviews")
class PlaceReviews(Resource):
    @api.response(200, "Reviews retrieved successfully")
    @api.response(404, "Place not found")
    def get(self, place_id):
        """Get all reviews for a specific place"""
        place = facade.get_place(place_id)
        if not place:
            return {"error": "Place not found"}, 404
        reviews = facade.get_reviews_by_place(place_id)
        return [r.to_dict() for r in reviews], 200


@api.route("/photo")
class PlacePhotoUpload(Resource):
    @jwt_required()
    def post(self):
        photo = request.files.get("photo")
        if not photo or not photo.filename:
            return {"error": "Photo file is required"}, 400

        extension = os.path.splitext(photo.filename)[1].lower()
        if extension not in ALLOWED_EXTENSIONS:
            return {"error": "Unsupported image format"}, 400

        current_user_id = get_jwt_identity()
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        filename = secure_filename(
            f"place-{current_user_id}-{uuid.uuid4().hex}{extension}"
        )
        filepath = os.path.join(UPLOAD_DIR, filename)
        photo.save(filepath)

        return {"image_url": f"assets/uploads/{filename}"}, 200
