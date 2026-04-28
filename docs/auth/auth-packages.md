# docs/auth/auth-packages.md

# Auth Packages

## Backend Packages

Source: `backend/requirements.txt`

| Package | Version | Auth Role | Essential |
| --- | --- | --- | --- |
| `Django` | `6.0.4` | Provides the project framework, default `User` model, middleware, password validation, URL routing, and settings | Yes |
| `djangorestframework` | `3.17.1` | Provides API views, serializers, viewsets, authentication hooks, and permissions such as `AllowAny`, `IsAuthenticated`, and `IsAdminUser` | Yes |
| `djangorestframework_simplejwt` | `5.5.1` | Creates and validates access/refresh JWTs, provides `TokenObtainPairView`, `TokenRefreshView`, `TokenObtainPairSerializer`, and `JWTAuthentication` | Yes |
| `PyJWT` | `2.12.1` | JWT implementation dependency used by SimpleJWT | Yes |
| `django-cors-headers` | `4.9.0` | Handles CORS and credentialed browser requests between Vite frontend and Django backend | Yes for browser split-origin dev/deploy |
| `python-dotenv` | `1.2.2` | Loads `.env` values for JWT and cookie settings | Yes |
| `asgiref` | `3.11.1` | Django dependency | Indirect |
| `sqlparse` | `0.5.5` | Django SQL formatting/parsing dependency | Indirect |
| `psycopg2-binary` | `2.9.12` | PostgreSQL driver for intended production database direction | Not directly auth-related |

## Backend Usage Locations

| Package | Used In |
| --- | --- |
| `Django` | `backend/backend/settings.py`, `backend/backend/urls.py`, `backend/core/models.py`, all Django apps |
| `djangorestframework` | `backend/core/views.py`, `backend/events/views.py`, `backend/tournaments/views.py`, `backend/rooney/views.py`, serializers and tests |
| `djangorestframework_simplejwt` | `backend/backend/settings.py`, `backend/core/views.py`, `backend/core/serializers.py` |
| `django-cors-headers` | `backend/backend/settings.py` |
| `python-dotenv` | `backend/backend/settings.py` |

## Frontend Packages

Source: `frontend/package.json`

| Package | Version | Auth Role | Essential |
| --- | --- | --- | --- |
| `axios` | `^1.15.2` | HTTP client, credentialed requests, request interceptor, response refresh retry | Yes |
| `jwt-decode` | `^4.0.0` | Decodes JWT payload into frontend user state | Yes |
| `react` | `^19.2.5` | Auth context, provider, state, effects | Yes |
| `react-dom` | `^19.2.5` | React rendering | Yes |
| `react-router-dom` | `^7.14.2` | Login redirects, protected routes, route groups | Yes |
| `@tanstack/react-query` | `^5.100.1` | App query provider; not central to auth but wraps the app and can coexist with auth state | Optional for auth |
| `lucide-react` | `^1.9.0` | Login/logout and navigation icons | UI only |

## Frontend Usage Locations

| Package | Used In |
| --- | --- |
| `axios` | `frontend/src/services/api.ts`, `frontend/src/pages/Auth/Login.tsx` for `AxiosError` typing |
| `jwt-decode` | `frontend/src/context/AuthContext.tsx`, `frontend/src/pages/Auth/Login.tsx` |
| `react` | `frontend/src/context/AuthContext.tsx`, app components |
| `react-router-dom` | `frontend/src/App.tsx`, `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/pages/Auth/Login.tsx`, layout navigation |
| `@tanstack/react-query` | `frontend/src/App.tsx` |
| `lucide-react` | `frontend/src/pages/Auth/Login.tsx`, `frontend/src/components/layout/Navbar.tsx`, `frontend/src/components/layout/OperationsLayout.tsx` |

## Package-Level Notes

- SimpleJWT is the backend source of truth for JWT creation and validation.
- `jwt-decode` does not verify signatures; it only reads token payload claims for frontend UI decisions.
- Axios `withCredentials: true` is required for refresh-cookie based persistence.
- CORS settings must allow credentials for the frontend origin or refresh will fail in the browser.

