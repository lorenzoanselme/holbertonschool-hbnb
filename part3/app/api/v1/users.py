from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services import facade

api = Namespace('users', description='User operations')

user_model = api.model('User', {
    'first_name': fields.String(
        required=True, description='First name of the user'),
    'last_name': fields.String(
        required=True, description='Last name of the user'),
    'email': fields.String(
        required=True, description='Email of the user'),
    'password': fields.String(
        required=True, description='Password of the user')
})


@api.route('/')
class UserList(Resource):
    @api.expect(user_model, validate=True)
    @api.response(201, 'User successfully created')
    @api.response(400, 'Email already registered')
    @api.response(400, 'Invalid input data')
    @jwt_required()
    def post(self):
        """Create a new user (admin only)"""
        claims = get_jwt()
        if not claims.get("is_admin", False):
            return {"error": "Admin privileges required"}, 403

        user_data = api.payload

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


@api.route('/<string:user_id>')
class UsersItem(Resource):
    def get(self, user_id):
        user = facade.get_user(user_id)
        if not user:
            return {"error": "User not found"}, 404
        return user.to_dict(), 200

    @jwt_required()
    def put(self, user_id):
        current_user = get_jwt_identity()
        claims = get_jwt()
        is_admin = claims.get("is_admin", False)

        data = request.get_json(force=True) or {}

        if not is_admin and current_user != user_id:
            return {"error": "Unauthorized action"}, 403

        if not is_admin and ("email" in data or "password" in data):
            return {"error": "You cannot modify email or password."}, 400

        if "email" in data:
            existing_user = facade.get_user_by_email(data["email"])
            if existing_user and existing_user.id != user_id:
                return {"error": "Email already in use"}, 400

        try:
            user = facade.update_user(user_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400

        if not user:
            return {"error": "User not found"}, 404

        return user.to_dict(), 200
