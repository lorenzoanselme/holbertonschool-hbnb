from flask import request
from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('reviews', description='Review operations')

# Create model (required fields)
review_model = api.model('Review', {
    'text': fields.String(required=True, description='Review text'),
    'rating': fields.Integer(required=True, description='Rating (1-5)'),
    'user_id': fields.String(required=True, description='User ID'),
    'place_id': fields.String(required=True, description='Place ID')
})

# Update model (optional)
review_update_model = api.model('ReviewUpdate', {
    'text': fields.String(description='Review text'),
    'rating': fields.Integer(description='Rating (1-5)')
})


@api.route('/')
class ReviewList(Resource):
    @api.expect(review_model, validate=True)
    @api.response(201, 'Review successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        data = api.payload
        try:
            review = facade.create_review(data)
            return review.to_dict(), 201
        except ValueError as e:
            return {'error': str(e)}, 400

    @api.response(200, 'List of reviews retrieved successfully')
    def get(self):
        reviews = facade.get_all_reviews()
        return [r.to_dict() for r in reviews], 200


@api.route('/<string:review_id>')
class ReviewResource(Resource):
    @api.response(200, 'Review details retrieved successfully')
    @api.response(404, 'Review not found')
    def get(self, review_id):
        review = facade.get_review(review_id)
        if not review:
            return {'error': 'Review not found'}, 404
        return review.to_dict(), 200

    @api.expect(review_update_model, validate=True)
    @api.response(200, 'Review updated successfully')
    @api.response(404, 'Review not found')
    @api.response(400, 'Invalid input data')
    def put(self, review_id):
        data = request.get_json(force=True) or {}
        try:
            review = facade.update_review(review_id, data)
        except ValueError as e:
            return {'error': str(e)}, 400

        if not review:
            return {'error': 'Review not found'}, 404

        return review.to_dict(), 200

    @api.response(200, 'Review deleted successfully')
    @api.response(404, 'Review not found')
    def delete(self, review_id):
        ok = facade.delete_review(review_id)
        if not ok:
            return {'error': 'Review not found'}, 404
        return {'message': 'Review deleted successfully'}, 200
