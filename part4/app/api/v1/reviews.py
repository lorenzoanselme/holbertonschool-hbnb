from app.services import facade
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource, fields

api = Namespace("reviews", description="Review operations")

review_model = api.model(
    "Review",
    {
        "text": fields.String(required=True, description="Review text"),
        "rating": fields.Integer(required=True, description="Rating (1-5)"),
        "place_id": fields.String(required=True, description="Place ID"),
    },
)

review_update_model = api.model(
    "ReviewUpdate",
    {
        "text": fields.String(description="Review text"),
        "rating": fields.Integer(description="Rating (1-5)"),
    },
)

review_response_model = api.model(
    "ReviewResponse",
    {
        "response": fields.String(
            required=True, description="Owner response to the review"
        )
    },
)


@api.route("/")
class ReviewList(Resource):
    @jwt_required()
    @api.expect(review_model, validate=True)
    @api.response(201, "Review successfully created")
    @api.response(400, "Invalid input data")
    def post(self):
        """Create a new review"""
        current_user = get_jwt_identity()
        data = api.payload

        place = facade.get_place(data["place_id"])
        if not place:
            return {"error": "Place not found"}, 404

        if place.owner_id == current_user:
            return {"error": "You cannot review your own place"}, 400

        existing = facade.get_reviews_by_place(data["place_id"])
        if any(r.user_id == current_user for r in existing):
            return {"error": "You have already reviewed this place"}, 400

        data["user_id"] = current_user
        try:
            review = facade.create_review(data)
            return review.to_dict(), 201
        except ValueError as e:
            return {"error": str(e)}, 400

    @api.response(200, "List of reviews retrieved successfully")
    def get(self):
        reviews = facade.get_all_reviews()
        return [r.to_dict() for r in reviews], 200


@api.route("/<string:review_id>")
class ReviewResource(Resource):
    @api.response(200, "Review details retrieved successfully")
    @api.response(404, "Review not found")
    def get(self, review_id):
        review = facade.get_review(review_id)
        if not review:
            return {"error": "Review not found"}, 404
        return review.to_dict(), 200

    @jwt_required()
    @api.expect(review_update_model, validate=True)
    @api.response(200, "Review updated successfully")
    @api.response(403, "Unauthorized action")
    @api.response(404, "Review not found")
    def put(self, review_id):
        """Update a review"""
        current_user = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        review = facade.get_review(review_id)
        if not review:
            return {"error": "Review not found"}, 404

        if not is_admin and review.user_id != current_user:
            return {"error": "Unauthorized action"}, 403

        data = api.payload or {}
        try:
            updated = facade.update_review(review_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400

        if not updated:
            return {"error": "Review not found"}, 404

        return updated.to_dict(), 200

    @jwt_required()
    @api.response(200, "Review deleted successfully")
    @api.response(403, "Unauthorized action")
    @api.response(404, "Review not found")
    def delete(self, review_id):
        """Delete a review"""
        current_user = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        review = facade.get_review(review_id)
        if not review:
            return {"error": "Review not found"}, 404

        if not is_admin and review.user_id != current_user:
            return {"error": "Unauthorized action"}, 403

        facade.delete_review(review_id)
        return {"message": "Review deleted successfully"}, 200


@api.route("/<string:review_id>/response")
class ReviewResponseResource(Resource):
    @jwt_required()
    @api.expect(review_response_model, validate=True)
    @api.response(200, "Review response saved successfully")
    @api.response(400, "Invalid input data")
    @api.response(404, "Review not found")
    def put(self, review_id):
        current_user = get_jwt_identity()
        review = facade.get_review(review_id)
        if not review:
            return {"error": "Review not found"}, 404

        data = api.payload or {}
        try:
            updated_review = facade.respond_to_review(
                review_id, current_user, data.get("response", "")
            )
        except ValueError as e:
            return {"error": str(e)}, 400

        if not updated_review:
            return {"error": "Review not found"}, 404

        return updated_review.to_dict(), 200
