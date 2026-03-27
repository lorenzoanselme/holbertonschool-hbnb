from app.services import facade
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Namespace, Resource

api = Namespace("notifications", description="Notification operations")


@api.route("/")
class NotificationList(Resource):
    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()
        notifications = facade.get_notifications_for_user(user_id)
        return [notification.to_dict() for notification in notifications], 200


@api.route("/<string:notification_id>/read")
class NotificationRead(Resource):
    @jwt_required()
    def put(self, notification_id):
        user_id = get_jwt_identity()
        notification = facade.mark_notification_as_read(notification_id, user_id)
        if not notification:
            return {"error": "Notification not found"}, 404
        return notification.to_dict(), 200


@api.route("/<string:notification_id>")
class NotificationItem(Resource):
    @jwt_required()
    def delete(self, notification_id):
        user_id = get_jwt_identity()
        deleted = facade.delete_notification(notification_id, user_id)
        if not deleted:
            return {"error": "Notification not found"}, 404
        return {"message": "Notification deleted successfully"}, 200
