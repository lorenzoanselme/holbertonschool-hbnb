from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from flask import jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)
from flask_restx import Namespace, Resource, fields

from app import db
from app.models.revoked_token import RevokedToken
from app.security import audit_event
from app.services import facade

api = Namespace("auth", description="Authentication operations")
RATE_LIMITS = {
    "login": {"max_attempts": 8, "window_seconds": 300},
    "register": {"max_attempts": 5, "window_seconds": 3600},
}
ATTEMPT_LOG = defaultdict(deque)

login_model = api.model(
    "Login",
    {
        "email": fields.String(required=True, description="User email"),
        "password": fields.String(required=True, description="User password"),
    },
)

register_model = api.model(
    "Register",
    {
        "first_name": fields.String(required=True, description="First name"),
        "last_name": fields.String(required=True, description="Last name"),
        "email": fields.String(required=True, description="Email address"),
        "password": fields.String(required=True, description="Password"),
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


def clear_rate_limit(scope, identifier):
    ATTEMPT_LOG.pop((scope, identifier), None)


def serialize_user(user):
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "is_admin": user.is_admin,
    }


@api.route("/login")
class Login(Resource):
    @api.expect(login_model)
    def post(self):
        """Authenticate user and return a JWT token"""
        credentials = api.payload
        email = (credentials.get("email") or "").strip().lower()
        rate_limit_key = f"{get_client_identifier()}:{email}"
        retry_after = enforce_rate_limit("login", rate_limit_key)
        if retry_after:
            audit_event("auth.login.rate_limited", outcome="blocked", email=email)
            return {
                "error": "Too many login attempts. Try again later.",
                "retry_after": retry_after,
            }, 429

        user = facade.get_user_by_email(email)

        if not user or not user.verify_password(credentials["password"]):
            audit_event("auth.login.failed", outcome="denied", email=email)
            return {"error": "Invalid credentials"}, 401

        clear_rate_limit("login", rate_limit_key)

        access_token = create_access_token(
            identity=str(user.id), additional_claims={"is_admin": user.is_admin}
        )

        response = jsonify({"user": serialize_user(user)})
        set_access_cookies(response, access_token)
        audit_event("auth.login.succeeded", user_id=str(user.id), email=user.email)
        return response


@api.route("/register")
class Register(Resource):
    @api.expect(register_model, validate=True)
    @api.response(201, "User successfully created")
    @api.response(400, "Email already registered or invalid data")
    def post(self):
        """Register a new user account (public)"""
        data = api.payload
        email = (data.get("email") or "").strip().lower()
        rate_limit_key = f"{get_client_identifier()}:{email}"
        retry_after = enforce_rate_limit("register", rate_limit_key)
        if retry_after:
            audit_event("auth.register.rate_limited", outcome="blocked", email=email)
            return {
                "error": "Too many registration attempts. Try again later.",
                "retry_after": retry_after,
            }, 429

        if facade.get_user_by_email(email):
            audit_event("auth.register.duplicate_email", outcome="denied", email=email)
            return {"error": "Email already registered"}, 400

        try:
            user = facade.create_user(
                {
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "email": email,
                    "password": data["password"],
                    "is_admin": False,
                }
            )
        except ValueError as e:
            return {"error": str(e)}, 400

        clear_rate_limit("register", rate_limit_key)
        audit_event("auth.register.succeeded", user_id=str(user.id), email=user.email)

        return {"user": serialize_user(user)}, 201


@api.route("/protected")
class ProtectedResource(Resource):
    @jwt_required()
    def get(self):
        """A protected endpoint that requires a valid JWT token"""
        current_user = get_jwt_identity()
        return {"message": f"Hello, user {current_user}"}, 200


@api.route("/me")
class CurrentUser(Resource):
    @jwt_required()
    def get(self):
        user = facade.get_user(get_jwt_identity())
        if not user:
            return {"error": "User not found"}, 404
        return {"user": serialize_user(user)}, 200


@api.route("/logout")
class Logout(Resource):
    @jwt_required(optional=True)
    def post(self):
        jwt_payload = get_jwt()
        jti = jwt_payload.get("jti")
        exp = jwt_payload.get("exp")
        if jti:
            if not RevokedToken.query.filter_by(jti=jti).first():
                expires_at = (
                    datetime.fromtimestamp(exp, tz=timezone.utc).replace(tzinfo=None)
                    if exp
                    else datetime.utcnow()
                )
                db.session.add(RevokedToken(jti=jti, expires_at=expires_at))
                db.session.commit()
        response = jsonify({"message": "Logged out"})
        unset_jwt_cookies(response)
        audit_event("auth.logout", user_id=get_jwt_identity())
        return response
