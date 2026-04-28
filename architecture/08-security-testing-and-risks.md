# 08 - Security, Testing, and Risks

## Security Architecture

## Identity and Access

Implemented controls and authentication flow:

### 1. Token Generation (Backend)
- Uses **JWT-based authentication** via `djangorestframework-simplejwt`.
- The login endpoint (`/api/auth/login/`) uses a `CustomTokenObtainPairSerializer`.
- **Custom Claims**: The access token payload is enriched with the user's `username`, `role` (`admin` or `department_rep`), and department metadata (`department_id`, `department_name`, `department_acronym`). This removes the need for a separate `/me` endpoint on the frontend to fetch user metadata.
- View-level permission classes (e.g., `IsAdminUser`, `IsAdminOrReadOnly`) guard protected write operations based on the actor's logged-in identity.
- Queryset scoping dynamically restricts `department_rep` visibility, ensuring they only see their own department's athletes and registrations.

### 2. Token Storage and Session State (Frontend)
- **Local Storage**: `access` and `refresh` tokens are persisted securely in browser `localStorage` to survive window reloads (`src/services/auth.ts`).
- **Auth Context**: `AuthContext.tsx` uses `jwt-decode` to read the custom JWT claims locally. It provides the application with a `user` object containing the `role` and `department_id` without requiring an additional network round-trip.
- **Cross-Tab Sync**: Storage event listeners ensure that logging in or out in one tab instantly propagates the authentication state across all open application instances.

### 3. API Interceptors & Auto-Refresh
- All outbound requests to the backend pass through an Axios interceptor (`src/services/api.ts`) that automatically attaches `Authorization: Bearer <access_token>`.
- If an API request returns a `401 Unauthorized` due to token expiration, a response interceptor catches the failure, calls `/api/auth/refresh/` using the refresh token, updates the tokens, and transparently retries the original failed request.
- If the refresh token is also expired or invalid, the interceptor clears the tokens and drops the session.

### 4. Route Protection
- Frontend routing utilizes a `ProtectedRoute.tsx` wrapper.
- Routes define `allowedRoles` (e.g., `['admin']` or `['department_rep']`). If the decoded token role doesn't match the required role, the router intercepts the navigation and bounces the user to their designated role portal (or login).

## Data Integrity Controls

- unique constraints on critical tuples (registration, roster entry, medal record).
- serializer-level validation for roster ownership and schedule conflicts.
- medal standings derived from ledger updates via signals.

## Rooney Safety Controls

- strict grounding prompt and schema-constrained response format.
- refusal pathway for off-topic or ungrounded responses.
- persistent Rooney query audit logs.

## Current Security Gaps

1. `CORS_ALLOW_ALL_ORIGINS=True` should be restricted in production.
2. DRF global permission default is `AllowAny`; secure-by-default should be `IsAuthenticated`.
3. Access tokens stored in localStorage are exposed if XSS is introduced.
4. No documented rate-limiting for auth or Rooney endpoints.
5. No explicit CSRF strategy documentation for mixed auth patterns.
6. No secrets template or validation workflow in repository.

## Recommended Hardening Plan

1. Add `settings/base.py`, `settings/dev.py`, and `settings/prod.py` split.
2. Restrict CORS origins and allowed methods by environment.
3. Flip DRF default permission to `IsAuthenticated` and explicitly open public endpoints.
4. Add throttling policies (`AnonRateThrottle`, `UserRateThrottle`) for login and Rooney.
5. Add Content Security Policy and stricter frontend dependency hygiene.
6. Consider moving auth token strategy to secure HttpOnly cookie model if acceptable for architecture.

## Testing Architecture

## Current State

Backend tests in:

- `backend/core/tests.py`
- `backend/events/tests.py`
- `backend/tournaments/tests.py`
- `backend/rooney/tests.py`

are currently placeholders only.

Frontend test infrastructure is not currently defined in committed scripts.

## Required Test Layers

### Backend Unit Tests

- serializers: registration constraints and schedule conflict logic
- services: match/podium medal assignment behavior
- signals: tally recompute correctness after create/delete
- Rooney services: grounding context composition and refusal fallback logic

### Backend API Tests

- permission matrix by role per endpoint
- registration workflow lifecycle (submit, revise, approve)
- result finalization side effects (medal records and tally)
- Rooney endpoint request validation and response contract

### Frontend Tests

- auth context decode/login/logout behavior
- protected route redirects
- API interceptor refresh token path
- key page render behavior for loading/error/empty states

### End-to-End Tests

- login to admin dashboard flow
- department athlete creation and registration submission
- admin approval and status visibility on rep account
- Rooney query happy path and refusal path

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Incorrect medal assignment logic for special formats | High | Medium | Event-stage aware medal policy engine + tests |
| Unauthorized data exposure from permissive defaults | High | Medium | Restrictive default permissions + endpoint audits |
| Rooney latency or outages degrade UX | Medium | Medium | timeout policies, retries, cached fallback messaging |
| SQLite contention under concurrent writes | Medium | Medium | migrate to PostgreSQL before scale-up |
| Missing automated tests causes regressions | High | High | establish CI test gates and minimum coverage targets |

## Priority Recommendations

1. Implement automated tests for tournaments and auth permissions first.
2. Harden security defaults (`CORS`, DRF permissions, throttling).
3. Introduce production settings and PostgreSQL migration path.
4. Add API schema generation and contract checks in CI.
5. Add structured logging and health checks for operations readiness.

## Architecture Governance Suggestions

- adopt ADRs (Architecture Decision Records) for major domain logic changes
- define versioning policy for API contracts
- define change-impact checklist for tournament scoring rule updates
- schedule periodic security and permissions review before intramurals season start
