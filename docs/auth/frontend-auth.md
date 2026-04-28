# docs/auth/frontend-auth.md

# Frontend Authentication

## Frontend Auth Architecture

The frontend authentication system is implemented with:

- React context for auth state
- an in-memory token module
- Axios interceptors for attaching and refreshing access tokens
- React Router protected route groups
- JWT decoding for user role and department claims

Main frontend files:

- `frontend/src/services/auth.ts`
- `frontend/src/services/api.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/Auth/Login.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/components/layout/OperationsLayout.tsx`

## Token Storage

`frontend/src/services/auth.ts` stores the access token in a module-level variable:

```ts
let accessToken: string | null = null;
```

This means:

- the access token exists only while the JavaScript runtime is alive
- the access token is lost on full page reload
- the access token is not persisted in `localStorage`
- the access token is not persisted in `sessionStorage`
- the access token is not stored in IndexedDB
- the refresh token is not read or stored by frontend JavaScript

The same file removes legacy keys:

- `enverga_access_token`
- `enverga_refresh_token`

from both:

- `localStorage`
- `sessionStorage`

## Auth State Service

File: `frontend/src/services/auth.ts`

Exports:

- `AUTH_STORAGE_EVENT`
- `clearLegacyStoredTokens()`
- `getAccessToken()`
- `setAccessToken(token)`
- `clearTokens()`
- `hasAccess()`

When `setAccessToken()` or `clearTokens()` runs, the module dispatches the `enverga-auth-changed` browser event. `AuthContext` listens to this event to synchronize decoded user state.

## API Client

File: `frontend/src/services/api.ts`

The frontend API base URL comes from:

```ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

The Axios base config uses:

```ts
withCredentials: true
```

This is required so the browser sends the backend-owned HttpOnly refresh cookie to `/auth/refresh/` and `/auth/logout/`.

Two Axios clients are used:

- `bareApi`: no auth interceptors, used for login, refresh, and logout
- `api`: normal app client, with auth request and response interceptors

## Request Interceptor

`api.interceptors.request` reads the current in-memory access token:

```ts
const token = getAccessToken();
if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
}
```

Protected API requests therefore send:

```http
Authorization: Bearer <access_token>
```

## Response Interceptor and Refresh Retry

`api.interceptors.response` handles `401` responses.

If a request receives `401` and the request has not already retried:

1. it marks the original request with `_retry = true`
2. it calls `refreshAccessToken()`
3. `refreshAccessToken()` posts to `/auth/refresh/` using `bareApi`
4. the browser sends the HttpOnly refresh cookie
5. if refresh succeeds, the new access token is saved in memory
6. the original request is retried with the new bearer token
7. if refresh fails, tokens are cleared and the error is rejected

The module uses a shared `refreshPromise` to avoid launching multiple simultaneous refresh requests.

## Auth Context

File: `frontend/src/context/AuthContext.tsx`

`AuthProvider` exposes:

- `user`
- `isAuthenticated`
- `loginState(access)`
- `logoutState()`
- `isLoading`

The user type is:

```ts
export interface DecodedUser {
    user_id: number;
    username: string;
    role: UserRole;
    department_id: number | null;
    department_name: string | null;
    department_acronym: string | null;
    exp?: number;
}
```

Role values:

- `admin`
- `department_rep`
- `none`

## JWT Decoding

The frontend uses `jwt-decode` to decode the access token.

It does not validate the JWT signature. Signature validation is the backend's responsibility. Frontend decoding is used only for UI routing and display:

- role
- username
- department name
- department acronym
- token expiration

## Session Restore on Reload

Because the access token is memory-only, a full browser reload clears it.

`AuthProvider` handles reload persistence with this startup effect:

1. `isLoading` starts as `true`.
2. legacy stored tokens are cleared.
3. `refreshAccessToken()` is called.
4. Axios posts to `/auth/refresh/`.
5. browser sends the HttpOnly refresh cookie.
6. if refresh succeeds, the new access token is saved in memory.
7. frontend decodes the JWT into `DecodedUser`.
8. `user` is set.
9. `isLoading` becomes `false`.

If refresh fails:

1. memory tokens are cleared by `refreshAccessToken()`
2. `user` becomes `null`
3. `isLoading` becomes `false`
4. protected routes may redirect to `/login`

Current implementation detail:

- `/api/auth/me/` exists on the backend
- frontend startup does not call `/auth/me/`
- startup relies on JWT claims returned by `/auth/refresh/`

## Login Page

File: `frontend/src/pages/Auth/Login.tsx`

Flow:

1. User enters username and password.
2. `handleLogin()` calls `loginRequest()`.
3. `loginRequest()` posts to `/auth/login/`.
4. backend returns `{ access }` and sets refresh cookie.
5. the page decodes the access token.
6. `loginState(access)` stores and decodes the token in context.
7. the user is redirected based on role.

Role redirect map:

| Role | Home |
| --- | --- |
| `admin` | `/admin` |
| `department_rep` | `/portal` |
| `none` | `/` |

If the user was redirected to login from a protected route, the login page returns them to the requested path only if the authenticated role is allowed to visit it.

## Logout Flow on Frontend

The logout UI appears in:

- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/components/layout/OperationsLayout.tsx`

Both call `logoutState()` from `AuthContext`.

`logoutState()`:

1. immediately sets `user` to `null`
2. calls `logoutRequest()`

`logoutRequest()`:

1. posts to `/auth/logout/`
2. always calls `clearTokens()` in a `finally` block
3. clears legacy stored tokens
4. clears the in-memory access token

## Protected Routes

File: `frontend/src/components/ProtectedRoute.tsx`

Behavior:

1. If `isLoading` is true, render a full-screen spinner.
2. If no authenticated user exists after loading, redirect to `/login`.
3. If `allowedRoles` is provided and user role is not included, redirect to the user's role home.
4. Otherwise render the nested route with `<Outlet />`.

Role home fallback:

| Role | Redirect Home |
| --- | --- |
| `admin` | `/admin` |
| `department_rep` | `/portal` |
| other | `/` |

## Route Groups

File: `frontend/src/App.tsx`

Public routes live under `MainLayout`.

Admin routes are protected by:

```tsx
<ProtectedRoute allowedRoles={['admin']} />
```

Department representative routes are protected by:

```tsx
<ProtectedRoute allowedRoles={['department_rep']} />
```

This is frontend UI gating only. Backend permissions still decide whether API requests succeed.

## Frontend Packages Used

| Package | Purpose |
| --- | --- |
| `axios` | HTTP client, credentials, interceptors, retry flow |
| `jwt-decode` | Decodes JWT payload claims for role and department state |
| `react` | Context state and auth provider |
| `react-router-dom` | login redirects, route protection, route groups |
| `@tanstack/react-query` | app-level query provider; current auth flow does not depend heavily on it |

## Frontend Environment Variables

Auth-relevant frontend variable:

- `VITE_API_URL`

Safe public variable:

- `VITE_TURNSTILE_SITE_KEY`

No JWT secrets or refresh token values belong in frontend environment variables.

## UI/Auth Flow Considerations

- Admin and department representative protected pages should not redirect until `isLoading` is false.
- A full reload on `/admin` or `/portal` should restore session if the refresh cookie is still valid.
- If the refresh cookie is missing or expired, the user is redirected to `/login`.
- Public pages may still use the shared Axios client; this is okay because it simply attaches a bearer token if one exists.
- Since access tokens are memory-only, opening a new browser tab may require refresh restoration in that tab.

