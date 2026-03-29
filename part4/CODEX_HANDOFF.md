# Codex Handoff

## Current state

The project has been heavily hardened and stabilized since commit `82f894d`.

Latest local commit created in this session:

- `da4e288` — `feat: harden https auth flow and stabilize profile data loading`

Main local entrypoints:

- HTTP frontend: `http://localhost:8080/login.html`
- HTTP API: `http://localhost:5001/api/v1/`
- HTTPS frontend: `https://localhost:8443/login.html`
- HTTPS API: `https://localhost:5443/api/v1/`

Recommended stack to use now:

```bash
cd /Users/nguyenmelya/Documents/holbertonschool-hbnb
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build -d
```

## What was done

### Security hardening

- Moved auth flow to cookie-based JWT with `HttpOnly` access cookie.
- Enabled CSRF protection for write operations.
- Added JWT revocation persistence.
- Added stricter security headers and CORS tightening.
- Added rate limiting on sensitive backend routes.
- Hardened image uploads with real validation and re-encoding.
- Strengthened password policy.
- Removed legacy token usage and legacy startup flow.
- Removed `innerHTML` sinks from active frontend JS rendering paths.
- Tightened CSP on active pages and removed inline-style debt from active flow.
- Added deployment/security docs and pentest notes.

### Deployment / infra

- Added hardened Docker stack with:
  - Postgres
  - Gunicorn
  - Nginx API gateway
  - HTTPS local stack
- Added local TLS certificate workflow.
- Added `.env.example` and stricter production requirements.
- Added DB init flow before Gunicorn startup.
- Removed `--preload` from Gunicorn startup to avoid unstable DB behavior.

### Stability fixes made after the main hardening

- Fixed intermittent profile page failures on:
  - `GET /users/<id>`
  - `GET /places/`
  - `GET /reviews/`
  - `GET /notifications/`
- Repository access was stabilized to avoid fragile ORM/session calls under Postgres/Gunicorn.
- `GET /places/` now returns lighter payloads and no longer loads unnecessary review/amenity data for list views.
- Frontend `profile.js` now avoids redundant collection fetches.
- Added request timeout and light retry logic for idempotent API reads.
- Adjusted Nginx API rate limiting to be less hostile to normal refresh/testing behavior.
- Added proper JWT error handling so expired/invalid tokens return `401` instead of surfacing as `500`.
- Updated frontend upload size checks to `5 MB`, matching backend and proxy limits.

## Important files touched recently

- `part4/Dockerfile`
- `part4/app/__init__.py`
- `part4/app/api/v1/auth.py`
- `part4/app/api/v1/places.py`
- `part4/app/api/v1/users.py`
- `part4/app/models/place.py`
- `part4/app/persistence/repository.py`
- `part4/app/services/repositories/user_repository.py`
- `part4/deploy/nginx/api-gateway.conf`
- `part4/deploy/nginx/api-gateway-https.conf`
- `part4/frontend/js/api.js`
- `part4/frontend/js/profile.js`
- `part4/frontend/css/styles.css`
- `part4/frontend/index.html`
- `part4/frontend/login.html`
- `part4/frontend/register.html`
- `part4/frontend/place.html`
- `part4/frontend/profile.html`

## Known credentials for testing

- Admin:
  - email: `admin@hbnb.io`
  - password: `Admin1234!`

- Demo users:
  - `camille@example.com` / `Password123!`
  - `lucas@example.com` / `Password123!`
  - `sarah@example.com` / `Password123!`

## What still needs to be checked manually

These are the main functional checks to run again on the next Codex session or machine:

1. Login in HTTPS mode.
2. Verify profile page after refresh.
3. Verify `My reviews`, `Your places`, and `Notifications` all load correctly.
4. Edit profile and upload profile photo.
5. Create a place with one or more images.
6. Open a place and verify:
   - photo carousel
   - city label
   - map
   - amenities
7. Post a review from another demo user.
8. Verify notification appears.
9. Reply to the review as the owner.
10. Verify logout and protected-page behavior.

## Remaining work / next session candidates

There is no obvious major backend security hole left in the active flow, but these are still reasonable follow-ups:

### Functional polish

- Re-run a full manual UX pass on mobile and desktop after the latest auth/stability changes.
- Verify no remaining intermittent profile issues in long browsing sessions.
- Verify add-place flow with multiple images repeatedly in HTTPS mode.

### Security / ops follow-up

- Add log rotation for `instance/security.log`.
- Add periodic purge execution for revoked tokens and old security data.
- Re-check CSP if any new page or script is introduced later.
- Re-audit any future legacy page before reintroducing it into the active flow.

### Product / maintainability

- Update README again if needed so it reflects the very latest HTTPS/auth/stability behavior.
- Optionally add automated integration tests for:
  - login/logout
  - profile refresh
  - place list/profile page loads
  - review + notification flow

## Notes for next Codex session

- If a route appears as `500`, inspect backend logs first. Several earlier "frontend" failures were actually backend exceptions or expired JWT handling.
- If a route appears as `503`, inspect Nginx gateway logs. At least one issue was actually proxy rate limiting, not app failure.
- If the profile page looks broken after idle time, suspect an expired JWT first and verify the response code is `401`, not `500`.
- If testing upload failures, remember the intended max image size is now `5 MB`.
