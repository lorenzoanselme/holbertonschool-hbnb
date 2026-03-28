# Secure Deployment Checklist

## Secrets and Config
- Set `SECRET_KEY` to a long random value.
- Set `JWT_SECRET_KEY` to a different long random value.
- Set `FLASK_CONFIG=config.ProductionConfig`.
- Set `JWT_COOKIE_SECURE=1` behind HTTPS only.
- Set `CORS_ORIGINS` to the real frontend origin only.
- Set `SQLALCHEMY_DATABASE_URI` explicitly for the target environment.

## Reverse Proxy and HTTPS
- Put the app behind a reverse proxy such as Nginx or Caddy.
- Force HTTPS and redirect all HTTP traffic to HTTPS.
- Preserve `X-Forwarded-Proto=https` so HSTS and secure behavior stay coherent.
- Limit request body size at the proxy level as well as in Flask.
- Add basic request rate limiting at the proxy level.

## Cookies and Auth
- Verify `access_token_cookie` is `HttpOnly`, `Secure`, `SameSite=Strict`.
- Verify `csrf_access_token` is present and CSRF-protected write routes work.
- Confirm logout revokes the session and blocks reuse.

## Files and Uploads
- Ensure `frontend/assets/uploads/` is writable only by the app user.
- Ensure `instance/` is not publicly writable by unrelated users.
- Back up uploaded assets and the database separately.
- Monitor disk usage because uploads remain a storage abuse surface.

## Database
- Do not deploy with a shared development SQLite file if you expect concurrent usage.
- Run on a managed database for real production workloads.
- Back up the database regularly.
- Test restore procedures, not just backups.

## Logging and Monitoring
- Rotate `instance/security.log`.
- Restrict read access to security logs.
- Monitor repeated login failures, upload abuse, and bulk actions.
- Send logs to centralized storage if deployed publicly.

## Frontend
- Serve the active frontend pages only: `index.html`, `login.html`, `register.html`, `place.html`, `profile.html`.
- Hard refresh after deploy when JS/CSS versions change.
- Keep external frontend dependencies reviewed and pinned.

## Final Verification
- Confirm `python3 -m compileall app config.py` passes.
- Confirm admin-only routes reject non-admin users.
- Confirm public user views do not expose private fields.
- Confirm review/notification flows still work end-to-end.
