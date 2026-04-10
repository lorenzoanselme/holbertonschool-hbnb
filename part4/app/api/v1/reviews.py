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

from app.services import facade

api = Namespace("reviews", description="Review operations")
RATE_LIMITS = {
    "create_review": {"max_attempts": 10, "window_seconds": 600},
    "respond_review": {"max_attempts": 20, "window_seconds": 600},
}
ATTEMPT_LOG = defaultdict(deque)

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


def get_client_identifier():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "unknown"


def enforce_rate_limit(scope, identifier):
    config = RATE_LIMITS[scope]
    now = datetime.utcnow()
    window = timedelta(seconds=config["window_seconds"])
    attempts = ATTEMPT_LOG[(scope, identifier)]

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


def has_admin_scope(claims):
    return bool(claims.get("is_admin")) and request.args.get("scope") == "admin"


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
        retry_after = enforce_rate_limit(
            "create_review", f"{get_client_identifier()}:{current_user}"
        )
        if retry_after:
            return {
                "error": "Too many review submissions. Try again later.",
                "retry_after": retry_after,
            }, 429

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
        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt() or {}
            current_user_id = get_jwt_identity()
        except JWTExtendedException:
            claims = {}
            current_user_id = None
        is_admin = has_admin_scope(claims)
        reviews = facade.get_all_reviews()
        if not is_admin:
            reviews = [
                review
                for review in reviews
                if not getattr(review.user, "is_banned", False)
                and not getattr(review.place.owner, "is_banned", False)
                and (
                    not getattr(review.place, "is_hidden", False)
                    or review.place.owner_id == current_user_id
                )
            ]
        return [r.to_dict() for r in reviews], 200


@api.route("/<string:review_id>")
class ReviewResource(Resource):
    @api.response(200, "Review details retrieved successfully")
    @api.response(404, "Review not found")
    def get(self, review_id):
        review = facade.get_review(review_id)
        if not review:
            return {"error": "Review not found"}, 404
        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt() or {}
            current_user_id = get_jwt_identity()
        except JWTExtendedException:
            claims = {}
            current_user_id = None
        is_admin = has_admin_scope(claims)
        if (
            (
                getattr(review.user, "is_banned", False)
                or getattr(review.place.owner, "is_banned", False)
                or (
                    getattr(review.place, "is_hidden", False)
                    and review.place.owner_id != current_user_id
                )
            )
            and not is_admin
        ):
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
        retry_after = enforce_rate_limit(
            "respond_review", f"{get_client_identifier()}:{current_user}"
        )
        if retry_after:
            return {
                "error": "Too many review responses. Try again later.",
                "retry_after": retry_after,
            }, 429
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
