# docs/auth/auth-flow.md

# Authentication Flows

## 1. Login Flow

1. User opens `/login`.
2. `frontend/src/pages/Auth/Login.tsx` renders the login form.
3. User submits username and password.
4. `handleLogin()` calls `loginRequest()` from `frontend/src/services/api.ts`.
5. `loginRequest()` sends:

```http
POST /api/auth/login/
Content-Type: application/json
```

with:

```json
{
  "username": "admin",
  "password": "demo1234"
}
```

6. `backend/core/views.py.CookieTokenObtainPairView` receives the request.
7. SimpleJWT validates credentials.
8. `backend/core/serializers.py.CustomTokenObtainPairSerializer` creates JWTs with role and department claims.
9. `CookieTokenObtainPairView` removes `refresh` from the response body.
10. `set_refresh_cookie()` writes the refresh token to the configured HttpOnly cookie.
11. Backend response body contains:

```json
{
  "access": "<jwt>"
}
```

12. `loginRequest()` stores the access token in memory through `setAccessToken(access)`.
13. `Login.tsx` decodes the JWT with `jwt-decode`.
14. `loginState(access)` updates `AuthContext.user`.
15. The user is redirected:

- `admin` -> `/admin`
- `department_rep` -> `/portal`
- `none` -> `/`

## 2. Authenticated Request Flow

1. A component or hook calls the shared `api` client from `frontend/src/services/api.ts`.
2. The Axios request interceptor runs.
3. It reads the access token from `getAccessToken()`.
4. If a token exists, it adds:

```http
Authorization: Bearer <access_token>
```

5. Axios sends the request with `withCredentials: true`.
6. The backend's DRF SimpleJWT authentication validates the bearer token.
7. DRF permissions check whether the authenticated user can access the view.
8. The backend returns the requested resource or an error such as `401` or `403`.

## 3. Token Refresh Flow

1. Frontend calls `refreshAccessToken()`.
2. `refreshAccessToken()` uses `bareApi`, not the interceptor-enabled client.
3. It sends:

```http
POST /api/auth/refresh/
```

4. Axios includes credentials, so the browser sends the refresh cookie.
5. `CookieTokenRefreshView` reads the cookie from:

```python
request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
```

6. If the cookie is missing, backend returns HTTP `401`.
7. If the cookie exists, SimpleJWT validates it.
8. If valid, backend returns:

```json
{
  "access": "<new_access_jwt>"
}
```

9. If refresh rotation is enabled and SimpleJWT returns a new refresh token, the backend puts the new refresh token into the HttpOnly cookie and removes it from JSON.
10. Frontend stores the new access token in memory.

## 4. Page Reload / App Rehydration Flow

1. User refreshes the browser on a protected route such as `/admin`.
2. The JavaScript runtime restarts.
3. The in-memory access token is gone.
4. `AuthProvider` mounts with `isLoading = true`.
5. `AuthProvider` calls `clearLegacyStoredTokens()`.
6. `AuthProvider` calls `refreshAccessToken()`.
7. Browser sends the refresh cookie to `/api/auth/refresh/`.
8. If refresh succeeds:

- frontend stores the access token in memory
- frontend decodes the JWT claims
- `user` is populated
- `isLoading` becomes `false`
- `ProtectedRoute` allows the page

9. If refresh fails:

- tokens are cleared
- `user` remains `null`
- `isLoading` becomes `false`
- `ProtectedRoute` redirects to `/login`

This is why the user does not get logged out on reload as long as the refresh cookie remains valid.

## 5. Expired Access Token Handling

1. A protected request is sent with an expired access token.
2. Backend returns HTTP `401`.
3. Axios response interceptor sees `401`.
4. If `_retry` is not already set, it marks the request as retried.
5. It calls `refreshAccessToken()`.
6. If refresh succeeds:

- new access token is stored in memory
- original request gets a new `Authorization` header
- original request is retried once

7. If refresh fails:

- tokens are cleared
- refresh error is rejected
- UI code receives an error
- protected routes will redirect once auth state updates

## 6. Failed Refresh Handling

Refresh can fail when:

- the refresh cookie is missing
- the refresh token expired
- the refresh token is invalid
- cookie settings prevent the browser from sending the cookie
- CORS credentials are misconfigured

Current frontend behavior:

1. `refreshAccessToken()` catches the error.
2. `clearTokens()` runs.
3. The promise rejects.
4. `AuthProvider` sets `user` to `null` during startup.
5. `ProtectedRoute` redirects unauthenticated users to `/login`.

## 7. Logout Flow

1. User clicks logout in `Navbar` or `OperationsLayout`.
2. UI calls `logoutState()`.
3. `logoutState()` immediately sets `user` to `null`.
4. `logoutState()` calls `logoutRequest()`.
5. `logoutRequest()` posts to:

```http
POST /api/auth/logout/
```

6. Backend `LogoutView` returns `{"detail": "Logged out."}`.
7. Backend deletes the refresh cookie.
8. Frontend clears the in-memory access token in `finally`.
9. Protected pages become inaccessible.

## 8. Protected Route Access Flow

1. User navigates to a protected route.
2. `ProtectedRoute` reads `user`, `isAuthenticated`, and `isLoading` from `AuthContext`.
3. If `isLoading` is true, it shows a loading spinner.
4. Once loading completes:

- unauthenticated users redirect to `/login`
- authenticated users with the wrong role redirect to their role home
- authenticated users with the allowed role see the protected route

Admin routes require:

```tsx
allowedRoles={['admin']}
```

Department representative routes require:

```tsx
allowedRoles={['department_rep']}
```

## 9. Backend Permission Flow

Frontend route guards are not security boundaries. Backend permissions enforce API security.

Examples:

1. `AdminNewsArticleViewSet` uses `IsAdminUser`.
2. `AIRecapViewSet` uses `IsAdminUser`.
3. `AthleteViewSet` requires authentication and scopes department representatives to their department.
4. `EventRegistrationViewSet` requires authentication and scopes department representatives to their department.
5. public read-only endpoints use `AllowAny` or admin-or-read-only permissions.

