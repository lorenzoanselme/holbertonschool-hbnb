# app/api/v1/users.py
from flask import request
from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity

api = Namespace('users', description='User operations')

# Define the user model for input validation and documentation
user_model = api.model('User', {
    'first_name': fields.String(
        required=True, description='First name of the user'
    ),
    'last_name': fields.String(
        required=True, description='Last name of the user'
    ),
    'email': fields.String(
        required=True, description='Email of the user'
    ),
    'password': fields.String(
        required=True, description='Password of the user'
    )
})


@api.route('/')
class UserList(Resource):
    @api.expect(user_model, validate=True)
    @api.response(201, 'User successfully created')
    @api.response(400, 'Email already registered')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Register a new user"""
        user_data = api.payload

        # Simulate email uniqueness check
        existing_user = facade.get_user_by_email(user_data['email'])
        if existing_user:
            return {'error': 'Email already registered'}, 400

        try:
            new_user = facade.create_user(user_data)
        except ValueError as e:
            return {"error": str(e)}, 400

        return {
            'id': new_user.id,
            'first_name': new_user.first_name,
            'last_name': new_user.last_name,
            'email': new_user.email
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
        current_user = get_jwt_identity()

        if current_user != user_id:
            return {"error": "Unauthorized action"}, 403

        data = request.get_json(force=True) or {}

        if "email" in data or "password" in data:
            return {"error": "You cannot modify email or password."}, 400

        try:
            user = facade.update_user(user_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400

        if not user:
            return {"error": "User not found"}, 404

        return user.to_dict(), 200
