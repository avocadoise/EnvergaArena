# docs/auth/backend-auth.md

# Backend Authentication

## Backend Auth Architecture

The backend authentication system is implemented in Django using:

- Django's built-in `User` model
- Django REST Framework permissions and authentication
- SimpleJWT token creation and validation
- custom cookie handling in `backend/core/views.py`
- role and department metadata from `core.UserProfile`

Main backend files:

- `backend/backend/settings.py`
- `backend/backend/urls.py`
- `backend/core/views.py`
- `backend/core/serializers.py`
- `backend/core/models.py`
- `backend/core/tests.py`

## Settings and Authentication Classes

`backend/backend/settings.py` configures DRF to use SimpleJWT:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}
```

This means endpoints are public by default unless a view explicitly sets a stricter `permission_classes` value.

SimpleJWT is configured from environment variables:

```python
SIMPLE_JWT = {
    'SIGNING_KEY': env_value('JWT_SECRET_KEY', SECRET_KEY),
    'ALGORITHM': env_value('JWT_ALGORITHM', 'HS256'),
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env_int('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 15)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env_int('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7)),
    'ROTATE_REFRESH_TOKENS': env_bool('JWT_ROTATE_REFRESH_TOKENS', False),
    'BLACKLIST_AFTER_ROTATION': env_bool('JWT_BLACKLIST_AFTER_ROTATION', False),
    'UPDATE_LAST_LOGIN': env_bool('JWT_UPDATE_LAST_LOGIN', True),
}
```

Cookie settings are also environment-driven:

```python
JWT_REFRESH_COOKIE_NAME = env_value('JWT_REFRESH_COOKIE_NAME', 'enverga_refresh')
JWT_REFRESH_COOKIE_SECURE = env_bool('JWT_REFRESH_COOKIE_SECURE', not DEBUG)
JWT_REFRESH_COOKIE_HTTPONLY = env_bool('JWT_REFRESH_COOKIE_HTTPONLY', True)
JWT_REFRESH_COOKIE_SAMESITE = env_value('JWT_REFRESH_COOKIE_SAMESITE', 'Lax')
JWT_REFRESH_COOKIE_DOMAIN = env_value('JWT_REFRESH_COOKIE_DOMAIN') or None
JWT_REFRESH_COOKIE_PATH = env_value('JWT_REFRESH_COOKIE_PATH', '/')
```

## User Role Model

The app uses Django's default `auth.User` plus `core.models.UserProfile`.

`UserProfile` fields:

- `user`
- `role`
- `department`
- `created_at`
- `updated_at`

Supported roles:

- `admin`
- `department_rep`

If a user has no profile, `get_user_auth_payload()` treats staff or superuser accounts as `admin`; otherwise the role becomes `none`.

## JWT Claims

`backend/core/serializers.py` defines `get_user_auth_payload(user)` and `CustomTokenObtainPairSerializer`.

The payload returned to the frontend includes:

```json
{
  "user_id": 1,
  "username": "admin",
  "role": "admin",
  "department_id": null,
  "department_name": null,
  "department_acronym": null
}
```

`CustomTokenObtainPairSerializer.get_token()` adds all auth payload fields except `user_id` into the JWT. SimpleJWT already includes `user_id`, so the custom serializer avoids writing that claim twice.

Claims added to the access and refresh token include:

- `username`
- `role`
- `department_id`
- `department_name`
- `department_acronym`

## Auth URL Configuration

`backend/backend/urls.py` defines:

| Method | Path | View | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/login/` | `CookieTokenObtainPairView` | Validate credentials, return access JWT, set refresh cookie |
| POST | `/api/auth/refresh/` | `CookieTokenRefreshView` | Read refresh JWT from HttpOnly cookie and return new access JWT |
| POST | `/api/auth/logout/` | `LogoutView` | Clear refresh cookie |
| GET | `/api/auth/me/` | `CurrentUserView` | Return current user payload from authenticated request |

## Cookie Helper Functions

`backend/core/views.py` contains three central helpers:

### `_refresh_cookie_kwargs()`

Builds cookie attributes from Django settings:

- `httponly`
- `secure`
- `samesite`
- `path`
- `domain`

### `set_refresh_cookie(response, refresh_token)`

Sets `settings.JWT_REFRESH_COOKIE_NAME` using:

- refresh token value
- `max_age` from `SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']`
- cookie settings from `_refresh_cookie_kwargs()`

### `clear_refresh_cookie(response)`

Deletes the refresh cookie using the configured:

- cookie name
- path
- domain
- SameSite setting

## Login Endpoint Behavior

View: `CookieTokenObtainPairView` in `backend/core/views.py`

Base class: `rest_framework_simplejwt.views.TokenObtainPairView`

Serializer: `CustomTokenObtainPairSerializer`

Flow:

1. DRF receives `POST /api/auth/login/`.
2. SimpleJWT validates the username and password.
3. SimpleJWT creates an access token and refresh token.
4. `CustomTokenObtainPairSerializer` adds role and department claims.
5. `CookieTokenObtainPairView.post()` removes `refresh` from `response.data`.
6. The refresh token is written to an HttpOnly cookie through `set_refresh_cookie()`.
7. The response body contains only the access token.

Response body shape:

```json
{
  "access": "<jwt>"
}
```

Important behavior:

- the refresh token is not returned in JSON
- frontend JavaScript cannot read the refresh token if the browser honors `HttpOnly`
- the browser stores and sends the cookie automatically on same-site or CORS credentialed requests, depending on cookie/CORS settings

## Refresh Endpoint Behavior

View: `CookieTokenRefreshView` in `backend/core/views.py`

Base class: `rest_framework_simplejwt.views.TokenRefreshView`

Flow:

1. Frontend posts to `/api/auth/refresh/`.
2. `CookieTokenRefreshView.post()` reads the refresh token from `request.COOKIES[settings.JWT_REFRESH_COOKIE_NAME]`.
3. If the cookie is missing, the endpoint returns:

```json
{
  "detail": "Refresh session cookie was not found."
}
```

with HTTP `401`.

4. If the cookie exists, the view passes it to the SimpleJWT refresh serializer as `refresh`.
5. If validation fails, the view raises `InvalidToken`.
6. If validation succeeds, the response contains a new access token.
7. If refresh rotation is enabled and SimpleJWT returns a new refresh token, the view removes that refresh token from JSON and writes it back into the HttpOnly cookie.

Response body shape:

```json
{
  "access": "<new_jwt>"
}
```

## Logout Endpoint Behavior

View: `LogoutView` in `backend/core/views.py`

Permission: `AllowAny`

Flow:

1. Frontend posts to `/api/auth/logout/`.
2. Backend returns:

```json
{
  "detail": "Logged out."
}
```

3. Backend deletes the configured refresh cookie.

Current behavior:

- logout clears the browser refresh cookie
- logout does not blacklist the refresh token server-side
- access token invalidation is handled client-side by clearing memory

## Current User Endpoint Behavior

View: `CurrentUserView` in `backend/core/views.py`

Permission: `IsAuthenticated`

Endpoint:

- `GET /api/auth/me/`

Behavior:

- requires a valid access token in `Authorization: Bearer <token>`
- returns `get_user_auth_payload(request.user)`

Current frontend note:

- the endpoint exists
- the frontend currently restores user state by decoding the refreshed access JWT
- the frontend does not currently call `/api/auth/me/` during startup

## Backend Permissions

The backend uses several permission patterns.

### Global Default

`AllowAny` is the global default in DRF settings. Views must opt into stricter permissions.

### Admin-or-Read-Only

Defined separately in:

- `backend/core/views.py`
- `backend/events/views.py`
- `backend/tournaments/views.py`

Behavior:

- safe methods are public
- write methods require an authenticated staff or superuser account

### Admin-Only

Used by:

- `AdminNewsArticleViewSet`
- `RooneyQueryLogViewSet`
- `AIRecapViewSet`

Permission:

- `permissions.IsAdminUser`

### Authenticated and Department-Scoped

Used by:

- `AthleteViewSet`
- `EventRegistrationViewSet`
- `TryoutApplicationViewSet`

Department representatives are scoped through `request.user.profile.department`.

## Backend Environment Variables

Auth-specific backend variables are documented in detail in [Auth Env Reference](./auth-env-reference.md).

The main backend auth variables are:

- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `JWT_ROTATE_REFRESH_TOKENS`
- `JWT_BLACKLIST_AFTER_ROTATION`
- `JWT_UPDATE_LAST_LOGIN`
- `JWT_REFRESH_COOKIE_NAME`
- `JWT_REFRESH_COOKIE_SECURE`
- `JWT_REFRESH_COOKIE_HTTPONLY`
- `JWT_REFRESH_COOKIE_SAMESITE`
- `JWT_REFRESH_COOKIE_DOMAIN`
- `JWT_REFRESH_COOKIE_PATH`
- `CORS_ALLOWED_ORIGINS`
- `CORS_ALLOW_CREDENTIALS`
- `CSRF_TRUSTED_ORIGINS`

## Backend Packages Used

| Package | Purpose |
| --- | --- |
| `Django` | user model, middleware, settings, URL routing |
| `djangorestframework` | API views, serializers, permissions |
| `djangorestframework_simplejwt` | JWT creation, validation, refresh serializers, JWT authentication |
| `PyJWT` | JWT implementation dependency used by SimpleJWT |
| `django-cors-headers` | CORS handling for frontend/backend local development and deployments |
| `python-dotenv` | loads `backend/.env` and repo-root `.env` |

## Security Considerations

Implemented:

- refresh token is removed from JSON responses
- refresh token is stored in an HttpOnly cookie
- access token lifetime is short by default
- refresh token lifetime is environment-controlled
- JWT signing key is environment-controlled
- CORS credential behavior is explicit through settings
- role and department claims are minted server-side
- admin endpoints use `IsAdminUser`
- representative workflows filter by `UserProfile.department`

Gaps and caveats:

- `JWT_BLACKLIST_AFTER_ROTATION` is configurable, but the SimpleJWT blacklist app is not currently installed in `INSTALLED_APPS`
- logout deletes the cookie but does not server-blacklist the token
- CSRF protection is not implemented as a separate token flow for JWT cookie refresh
- production must not use permissive CORS settings
- production should set `JWT_REFRESH_COOKIE_SECURE=True`

