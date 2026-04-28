# docs/auth/auth-files-reference.md

# Auth Files Reference

## Backend Files

| File | Area | Critical | Purpose |
| --- | --- | --- | --- |
| `backend/backend/settings.py` | Backend | Yes | Loads env values, configures DRF authentication, SimpleJWT, CORS, CSRF trusted origins, and refresh cookie settings |
| `backend/backend/urls.py` | Backend | Yes | Registers auth endpoints and protected/public API route groups |
| `backend/core/views.py` | Backend | Yes | Implements login, refresh, logout, current-user endpoint, refresh cookie helpers, and core permissions/viewsets |
| `backend/core/serializers.py` | Backend | Yes | Defines user auth payload and custom SimpleJWT serializer with role/department claims |
| `backend/core/models.py` | Backend | Yes | Defines `UserProfile`, which links users to roles and department scope |
| `backend/core/tests.py` | Backend | Useful | Smoke tests verifying access-only login body, refresh cookie behavior, logout cookie clearing, and admin-news access |
| `backend/events/views.py` | Backend | Relevant | Defines admin-or-read-only permissions for event categories and events |
| `backend/tournaments/views.py` | Backend | Relevant | Defines permissions and department scoping for athletes, tryout applications, registrations, schedules, and results |
| `backend/tournaments/serializers.py` | Backend | Relevant | Enforces representative department scoping and roster/registration validation |
| `backend/rooney/views.py` | Backend | Relevant | Uses `IsAdminUser` for Rooney logs and AI recap review endpoints |
| `backend/.env.example` | Backend | Yes | Documents backend auth env values and cookie settings |
| `backend/requirements.txt` | Backend | Yes | Lists backend packages used by auth and API layers |

### `backend/backend/settings.py`

Central backend configuration.

Auth responsibilities:

- loads `backend/.env` and repo-root `.env`
- defines helper functions `env_value`, `env_bool`, `env_int`
- enables `rest_framework_simplejwt`
- configures `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`
- configures `SIMPLE_JWT`
- configures refresh cookie settings
- configures CORS credential behavior
- configures CSRF trusted origins

Connections:

- read by `backend/core/views.py` for cookie settings
- used by SimpleJWT for token signing and lifetimes
- used by DRF for bearer-token authentication

Cleanup note:

- `DATABASE_URL` is documented in env examples, but settings currently use SQLite directly.
- token blacklist settings are environment-configurable, but the SimpleJWT blacklist app is not installed.

### `backend/backend/urls.py`

Registers the concrete auth endpoints:

- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/auth/logout/`
- `/api/auth/me/`

It also registers admin and public routers. This matters because some resources under `/api/public/` are public for reads but still require auth for writes.

### `backend/core/views.py`

Most important backend auth implementation file.

Auth classes/functions:

- `_refresh_cookie_kwargs()`
- `set_refresh_cookie(response, refresh_token)`
- `clear_refresh_cookie(response)`
- `CookieTokenObtainPairView`
- `CookieTokenRefreshView`
- `LogoutView`
- `CurrentUserView`
- `IsAdminOrReadOnly`

Connections:

- imports `settings`
- imports SimpleJWT views and exceptions
- imports `CustomTokenObtainPairSerializer`
- returns auth payload through `get_user_auth_payload`

### `backend/core/serializers.py`

Defines auth payload shape.

Auth classes/functions:

- `get_user_auth_payload(user)`
- `CustomTokenObtainPairSerializer`

Role behavior:

- if `UserProfile` exists, use `profile.role` and `profile.department`
- if no profile exists and user is staff/superuser, role is `admin`
- if no profile exists and user is not staff/superuser, role is `none`

Connection:

- `CookieTokenObtainPairView` uses this serializer to mint custom JWT claims
- `CurrentUserView` uses the same payload shape for `/api/auth/me/`

### `backend/core/models.py`

Defines `UserProfile`.

Auth purpose:

- connects Django users to Enverga Arena roles
- scopes department representative accounts to one department

Fields:

- `user`
- `role`
- `department`
- timestamps

### `backend/core/tests.py`

Contains auth-related smoke tests:

- login returns access token
- login does not return refresh token in JSON
- login sets `enverga_refresh` cookie
- refresh uses HttpOnly cookie and returns access only
- logout clears refresh cookie
- department representative cannot access admin news

This file is useful for verifying the intended auth contract.

### `backend/tournaments/views.py`

Important for authorization beyond login.

Auth-related behavior:

- `AthleteViewSet` requires authentication and scopes reps to their own department
- `EventRegistrationViewSet` requires authentication and scopes reps to their own department
- `TryoutApplicationViewSet` requires authentication for review actions and scopes reps to their own department
- result/schedule write operations use admin-or-read-only permissions

### `backend/tournaments/serializers.py`

Important for defense in depth.

Auth-related behavior:

- `TryoutApplicationSerializer` forces department rep submissions to the user's profile department
- `EventRegistrationSerializer` forces department rep registrations to the user's profile department
- roster validation rejects athletes from another department

### `backend/rooney/views.py`

Auth-related behavior:

- public Rooney query endpoint is anonymous
- Rooney logs are admin-only
- AI recap review endpoints are admin-only

## Frontend Files

| File | Area | Critical | Purpose |
| --- | --- | --- | --- |
| `frontend/src/services/auth.ts` | Frontend | Yes | Owns in-memory access token, clears legacy browser storage, emits auth change event |
| `frontend/src/services/api.ts` | Frontend | Yes | Configures Axios, login, logout, refresh, bearer injection, and one-time refresh retry |
| `frontend/src/context/AuthContext.tsx` | Frontend | Yes | Provides auth state, decodes JWT claims, restores session on startup |
| `frontend/src/components/ProtectedRoute.tsx` | Frontend | Yes | Protects admin and representative route groups and waits for restore loading |
| `frontend/src/pages/Auth/Login.tsx` | Frontend | Yes | Login form, login API call, role-based redirect |
| `frontend/src/App.tsx` | Frontend | Yes | Wraps app in `AuthProvider`; defines public, admin, and representative route groups |
| `frontend/src/components/layout/Navbar.tsx` | Frontend | Relevant | Public navbar login/logout and portal links |
| `frontend/src/components/layout/OperationsLayout.tsx` | Frontend | Relevant | Protected console layout, user identity display, logout action |
| `frontend/src/hooks/useAdminData.ts` | Frontend | Relevant | Uses authenticated `api` client for admin operations |
| `frontend/src/hooks/usePublicData.ts` | Frontend | Relevant | Uses shared `api` client for public data requests |
| `frontend/src/services/tryouts.ts` | Frontend | Relevant | Uses shared `api` client for public tryout OTP/application flow |
| `frontend/.env.example` | Frontend | Yes | Documents safe frontend env values |
| `frontend/package.json` | Frontend | Yes | Lists frontend auth/routing/API packages |

### `frontend/src/services/auth.ts`

Most important frontend token-storage file.

Responsibilities:

- stores access token in memory
- exposes getters/setters
- clears legacy persisted token keys
- emits `enverga-auth-changed`

Refactor note:

- the `storage` event listener in `AuthContext` remains useful for older cross-tab cleanup, but active auth state is not actually persisted to storage.

### `frontend/src/services/api.ts`

Most important frontend API auth file.

Responsibilities:

- reads `VITE_API_URL`
- creates `bareApi`
- creates interceptor-enabled `api`
- sets `withCredentials: true`
- implements `refreshAccessToken()`
- implements `loginRequest()`
- implements `logoutRequest()`
- attaches `Authorization` bearer tokens
- retries one failed `401` after refresh

### `frontend/src/context/AuthContext.tsx`

Main auth state provider.

Responsibilities:

- decodes access JWT
- checks token expiration
- restores session on app startup through `refreshAccessToken()`
- exposes `isLoading` so protected routes do not redirect too early
- exposes `loginState()` and `logoutState()`

Known implementation detail:

- `AuthContext` does not call `/auth/me/`
- it trusts claims from the access JWT for frontend display and routing

### `frontend/src/components/ProtectedRoute.tsx`

Route gate for protected sections.

Responsibilities:

- waits while auth restore is loading
- redirects unauthenticated users to `/login`
- redirects users with the wrong role to their role home
- renders nested protected routes with `<Outlet />`

### `frontend/src/pages/Auth/Login.tsx`

Login UI and redirect logic.

Responsibilities:

- collects username/password
- calls `loginRequest()`
- decodes token to choose redirect
- calls `loginState()`
- prevents admin users from being redirected into `/portal` and reps from being redirected into `/admin`

### `frontend/src/App.tsx`

App route and provider composition.

Responsibilities:

- wraps routes in `QueryClientProvider`
- wraps routes in `AuthProvider`
- defines public routes
- protects `/admin` routes with `allowedRoles={['admin']}`
- protects `/portal` routes with `allowedRoles={['department_rep']}`

## Refactor / Cleanup Notes

- `/api/auth/me/` is implemented but not used by the frontend; future work could call it after refresh to avoid relying solely on frontend-decoded JWT claims.
- duplicate `IsAdminOrReadOnly` permission classes exist in multiple backend apps; a shared permission helper could reduce drift.
- SimpleJWT blacklist settings are present but not backed by the blacklist app.
- logout clears the cookie but does not revoke refresh tokens server-side.

