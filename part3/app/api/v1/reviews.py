from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import facade

api = Namespace('reviews', description='Review operations')

review_model = api.model('Review', {
    'text': fields.String(required=True, description='Review text'),
    'rating': fields.Integer(required=True, description='Rating (1-5)'),
    'place_id': fields.String(required=True, description='Place ID')
})

review_update_model = api.model('ReviewUpdate', {
    'text': fields.String(description='Review text'),
    'rating': fields.Integer(description='Rating (1-5)')
})


@api.route('/')
class ReviewList(Resource):
    @api.expect(review_model, validate=True)
    @jwt_required()
    def post(self):
        """Create a new review"""
        review_data = api.payload
        current_user = get_jwt_identity()

        place = facade.get_place(review_data["place_id"])
        if not place:
            return {"error": "Place not found"}, 404

        place_owner = (
            place.owner.id
            if hasattr(place.owner, "id")
            else place.owner
        )
        if place_owner == current_user:
            return {"error": "You cannot review your own place."}, 400

        existing_reviews = facade.get_all_reviews()
        for review in existing_reviews:
            review_place = (
                review.place.id
                if hasattr(review.place, "id")
                else review.place
            )
            review_user = (
                review.user.id
                if hasattr(review.user, "id")
                else review.user
            )

            if (review_place == review_data["place_id"] and
                    review_user == current_user):
                return {"error": "You have already reviewed this place."}, 400

        # IMPORTANT:
        # ta facade semble attendre user_id / place_id
        review_data["user_id"] = current_user

        try:
            new_review = facade.create_review(review_data)
        except ValueError as e:
            return {"error": str(e)}, 400

        return new_review.to_dict(), 201


@api.route('/<string:review_id>')
class ReviewItem(Resource):
    def get(self, review_id):
        """Get a review by ID"""
        review = facade.get_review(review_id)
        if not review:
            return {"error": "Review not found"}, 404
        return review.to_dict(), 200

    @api.expect(review_update_model, validate=True)
    @jwt_required()
    def put(self, review_id):
        """Update a review"""
        current_user = get_jwt_identity()
        review = facade.get_review(review_id)

        if not review:
            return {"error": "Review not found"}, 404

        review_user = (
            review.user.id
            if hasattr(review.user, "id")
            else review.user
        )
        if review_user != current_user:
            return {"error": "Unauthorized action"}, 403

        data = request.get_json(force=True) or {}

        try:
            updated_review = facade.update_review(review_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400

        if not updated_review:
            return {"error": "Review not found"}, 404

        return updated_review.to_dict(), 200

    @jwt_required()
    def delete(self, review_id):
        """Delete a review"""
        current_user = get_jwt_identity()
        review = facade.get_review(review_id)

        if not review:
            return {"error": "Review not found"}, 404

        review_user = (
            review.user.id
            if hasattr(review.user, "id")
            else review.user
        )
        if review_user != current_user:
            return {"error": "Unauthorized action"}, 403

        deleted = facade.delete_review(review_id)
        if not deleted:
            return {"error": "Review not found"}, 404

        return {"message": "Review deleted successfully"}, 200
