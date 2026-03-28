import json
import logging
import os
from logging.handlers import RotatingFileHandler

from flask import has_request_context, request


def configure_security_logger(app):
    log_path = app.config.get("SECURITY_LOG_FILE", "instance/security.log")
    if not os.path.isabs(log_path):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        log_path = os.path.join(project_root, log_path)

    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    logger = logging.getLogger("hbnb.security")
    if logger.handlers:
        return logger

    handler = RotatingFileHandler(log_path, maxBytes=512_000, backupCount=3)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    logger.propagate = False
    return logger


def audit_event(event, outcome="success", **details):
    logger = logging.getLogger("hbnb.security")
    payload = {"event": event, "outcome": outcome, **details}

    if has_request_context():
        payload.setdefault("method", request.method)
        payload.setdefault("path", request.path)
        payload.setdefault(
            "ip", request.headers.get("X-Forwarded-For", request.remote_addr)
        )
        payload.setdefault("user_agent", request.headers.get("User-Agent", ""))

    logger.info(json.dumps(payload, sort_keys=True))
