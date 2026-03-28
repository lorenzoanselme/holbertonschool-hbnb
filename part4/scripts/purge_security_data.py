"""Purge expired security data.

Run manually or from cron/systemd:
    python3 scripts/purge_security_data.py
"""

from datetime import datetime

from app import create_app, db
from sqlalchemy import text


def main():
    app = create_app()
    with app.app_context():
        now = datetime.utcnow()
        count_result = db.session.execute(
            text("SELECT COUNT(*) FROM revoked_tokens WHERE expires_at < :now"),
            {"now": now},
        )
        deleted_count = int(count_result.scalar() or 0)
        db.session.execute(
            text("DELETE FROM revoked_tokens WHERE expires_at < :now"),
            {"now": now},
        )
        db.session.commit()
        print(f"Deleted {deleted_count} expired revoked tokens at {now.isoformat()}Z")


if __name__ == "__main__":
    main()
