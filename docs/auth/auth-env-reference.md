# docs/auth/auth-env-reference.md

# Auth Environment Reference

## Backend Env Loading

File: `backend/backend/settings.py`

The backend loads environment values from:

1. `backend/.env`
2. repo-root `.env` as a local development fallback

Loading is done with:

```python
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')
```

## Backend Auth Variables

| Variable | Side | Secret | Example Placeholder | Purpose |
| --- | --- | --- | --- | --- |
| `SECRET_KEY` | Backend | Yes | `django-insecure-replace-this-with-a-real-one` | Django signing secret and fallback JWT signing key |
| `DEBUG` | Backend | No | `True` | Enables local debug behavior |
| `ALLOWED_HOSTS` | Backend | No | `localhost,127.0.0.1` | Allowed Django hostnames |
| `CORS_ALLOWED_ORIGINS` | Backend | No | `http://localhost:5173,http://127.0.0.1:5173` | Frontend origins allowed to call the API |
| `CORS_ALLOW_CREDENTIALS` | Backend | No | `True` | Allows browser credentialed requests such as refresh-cookie requests |
| `CSRF_TRUSTED_ORIGINS` | Backend | No | `http://localhost:5173,http://127.0.0.1:5173` | Trusted origins for CSRF-aware requests |
| `JWT_SECRET_KEY` | Backend | Yes | `replace_this_with_a_long_random_jwt_signing_key` | SimpleJWT signing key |
| `JWT_ALGORITHM` | Backend | No | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Backend | No | `15` | Access token lifetime |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Backend | No | `7` | Refresh token lifetime and cookie max age |
| `JWT_ROTATE_REFRESH_TOKENS` | Backend | No | `False` | Whether SimpleJWT should rotate refresh tokens |
| `JWT_BLACKLIST_AFTER_ROTATION` | Backend | No | `False` | Whether rotated refresh tokens should be blacklisted |
| `JWT_UPDATE_LAST_LOGIN` | Backend | No | `True` | Whether successful login updates Django last-login metadata |
| `JWT_REFRESH_COOKIE_NAME` | Backend | No | `enverga_refresh` | Refresh cookie name |
| `JWT_REFRESH_COOKIE_SECURE` | Backend | No | `False` locally, `True` in production | Controls Secure cookie flag |
| `JWT_REFRESH_COOKIE_HTTPONLY` | Backend | No | `True` | Prevents JavaScript from reading refresh cookie |
| `JWT_REFRESH_COOKIE_SAMESITE` | Backend | No | `Lax` | Controls cross-site cookie behavior |
| `JWT_REFRESH_COOKIE_DOMAIN` | Backend | No | empty | Optional cookie domain |
| `JWT_REFRESH_COOKIE_PATH` | Backend | No | `/` | Cookie path |

## Frontend Auth Variables

File: `frontend/.env.example`

| Variable | Side | Secret | Example Placeholder | Purpose |
| --- | --- | --- | --- | --- |
| `VITE_API_URL` | Frontend | No | `http://localhost:8000/api` | Axios API base URL |

Related public frontend variable:

| Variable | Side | Secret | Example Placeholder | Purpose |
| --- | --- | --- | --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | Frontend | No | `your_turnstile_site_key_here` | Public Cloudflare Turnstile site key for tryout form |

No JWT secret, refresh token, or backend API secret should be placed in frontend env values.

## Localhost Cookie Settings

Recommended local development values:

```env
JWT_REFRESH_COOKIE_SECURE=False
JWT_REFRESH_COOKIE_HTTPONLY=True
JWT_REFRESH_COOKIE_SAMESITE=Lax
JWT_REFRESH_COOKIE_DOMAIN=
JWT_REFRESH_COOKIE_PATH=/
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_CREDENTIALS=True
```

Why:

- localhost development usually runs over plain HTTP
- `Secure=True` cookies are not sent over plain HTTP
- frontend and backend run on different ports, so CORS credentials must be allowed

## Production Cookie Settings

Recommended production direction:

```env
JWT_REFRESH_COOKIE_SECURE=True
JWT_REFRESH_COOKIE_HTTPONLY=True
JWT_REFRESH_COOKIE_SAMESITE=Lax
JWT_REFRESH_COOKIE_DOMAIN=
JWT_REFRESH_COOKIE_PATH=/
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.example
CORS_ALLOW_CREDENTIALS=True
CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.example
```

If the frontend and backend are on different sites and `SameSite=None` is required, then:

- `JWT_REFRESH_COOKIE_SECURE=True` is mandatory
- CORS origins must be strict
- CSRF implications should be reviewed before deployment

## Current Gaps

- `DATABASE_URL` appears in `backend/.env.example`, but `backend/backend/settings.py` currently uses SQLite directly.
- `JWT_BLACKLIST_AFTER_ROTATION` is documented and configurable, but token blacklisting is not active unless SimpleJWT blacklist support is installed and migrated.

