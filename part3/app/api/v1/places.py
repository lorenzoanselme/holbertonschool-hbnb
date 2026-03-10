from flask import request
from flask_restx import Namespace, Resource, fields
from app.services import facade
from flask_jwt_extended import jwt_required, get_jwt_identity

api = Namespace('places', description='Place operations')

# Create model (required fields)
place_model = api.model('Place', {
    'title': fields.String(
        required=True,
        description='Title of the place'
    ),
    'description': fields.String(
        description='Description of the place'
    ),
    'price': fields.Float(
        required=True,
        description='Price per night'
    ),
    'latitude': fields.Float(
        required=True,
        description='Latitude of the place'
    ),
    'longitude': fields.Float(
        required=True,
        description='Longitude of the place'
    ),
    'amenities': fields.List(
        fields.String,
        description="List of amenities IDs"
    )
})

# Update model (ALL optional -> allows partial updates)
place_update_model = api.model('PlaceUpdate', {
    'title': fields.String(description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(description='Price per night'),
    'latitude': fields.Float(description='Latitude of the place'),
    'longitude': fields.Float(description='Longitude of the place'),
    'owner_id': fields.String(description='ID of the owner'),
    'amenities': fields.List(
        fields.String,
        description="List of amenities IDs"
    )
})


@api.route('/')
class PlaceList(Resource):
    def get(self):
        places = facade.get_all_places()
        return [place.to_dict() for place in places], 200

    @jwt_required()
    def post(self):
        place_data = api.payload
        current_user = get_jwt_identity()

        place_data["owner_id"] = current_user

        try:
            new_place = facade.create_place(place_data)
        except ValueError as e:
            return {"error": str(e)}, 400

        return new_place.to_dict(), 201


@api.route('/<string:place_id>')
class PlaceItem(Resource):
    def get(self, place_id):
        place = facade.get_place(place_id)
        if not place:
            return {"error": "Place not found"}, 404
        return place.to_dict(), 200

    @jwt_required()
    def put(self, place_id):
        current_user = get_jwt_identity()
        place = facade.get_place(place_id)

        if not place:
            return {"error": "Place not found"}, 404

        owner_id = (place.owner.id if hasattr(place.owner, "id")
                    else place.owner)
        if owner_id != current_user:
            return {"error": "Unauthorized action"}, 403

        data = request.get_json(force=True) or {}
        data.pop("owner", None)
        data.pop("owner_id", None)

        try:
            updated_place = facade.update_place(place_id, data)
        except ValueError as e:
            return {"error": str(e)}, 400

        if not updated_place:
            return {"error": "Place not found"}, 404

        return updated_place.to_dict(), 200
