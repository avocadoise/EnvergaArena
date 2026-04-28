# 08 - Security, Testing, and Risks

## Security Architecture

## Identity and Access

### Token Generation

- The backend uses `djangorestframework-simplejwt`.
- `POST /api/auth/login/` uses `CustomTokenObtainPairSerializer`.
- Access token claims include username, role, and department metadata.
- The login response returns an access token only.
- The refresh token is set in a backend-issued HttpOnly cookie.

### Token Storage and Session State

- Access token is stored in memory only in `frontend/src/services/auth.ts`.
- Refresh token is not accessible to frontend JavaScript.
- Legacy localStorage/sessionStorage token keys are cleared on auth changes and app startup.
- `AuthProvider` restores sessions after reload by calling `/api/auth/refresh/`.

### API Interceptors and Auto-Refresh

- Axios attaches the in-memory access token to protected requests.
- `withCredentials: true` allows the browser to send the HttpOnly refresh cookie.
- On one `401`, the client calls `/api/auth/refresh/` and retries the original request.
- Refresh failure clears in-memory auth state.

### Logout

- `POST /api/auth/logout/` clears the refresh cookie.
- Frontend logout clears the in-memory access token and user state.

### Route Protection

- `ProtectedRoute.tsx` gates admin and department representative route groups.
- Protected routes wait for auth rehydration before redirecting.
- Backend permissions and queryset scoping remain the true security boundary.

## Authorization Controls

- Admin endpoints use staff/superuser checks.
- Department representative data is scoped by `UserProfile.department`.
- Representatives can only see their own tryout applications, athletes, registrations, and rosters.
- Public endpoints expose schedules, results, medal tally, leaderboard, published news, and Rooney only.
- Raw AI recaps, article drafts, admin notes, and private workflow details are not public.

## Public Tryout Safety Controls

- Students do not receive accounts.
- Public tryout email must end in `@student.mseuf.edu.ph`.
- Turnstile is verified server-side before OTP issuance.
- OTP values are hashed before storage.
- OTP verification enforces expiry, attempt limits, and single-use behavior.
- Duplicate active applications are rejected.
- Rate limits are enforced for OTP request, OTP verify, and application submit flows.

## Data Integrity Controls

- unique constraints on registrations, roster entries, medal records, podium ranks, and tryout applications
- serializer validation for roster ownership
- serializer validation for schedule time ordering and venue-area conflicts
- serializer safeguards for event result-mode and medal-bearing changes after linked data exists
- medal standings are derived from the medal ledger and sorted by gold, silver, bronze, then department name

## Rooney and AI Safety Controls

- Rooney uses server-built grounding context.
- Rooney may ground on published news, schedules, official results, medal tally, and leaderboard.
- Rooney logs question, answer/refusal, intent, sources, and response time.
- AI recap generation stores input snapshots and citation maps.
- AI recap drafts are admin-only until published as official news.
- Recap generation falls back to template-grounded copy if Gemini is unavailable.

## Current Security Gaps

1. DRF global permission default is `AllowAny`; secure-by-default should be considered after endpoint audit.
2. `CORS_ALLOW_ALL_ORIGINS` can be enabled in debug mode if no allowed origins are configured.
3. Auth and Rooney endpoints do not yet use DRF throttling classes.
4. No Content Security Policy is configured.
5. Refresh-token blacklist app is not installed, so cookie clearing is the primary logout behavior unless rotation/blacklist is expanded.
6. Production settings split is not yet implemented.

## Recommended Hardening Plan

1. Split settings into base/dev/prod profiles.
2. Wire `DATABASE_URL` for PostgreSQL production use.
3. Restrict CORS and CSRF trusted origins by environment.
4. Add DRF throttling for auth, Rooney, and public tryout endpoints.
5. Add CSP and security headers.
6. Add structured logging and audit-friendly admin action history.
7. Add refresh token blacklist support if rotation is enabled for production.

## Testing Architecture

## Current State

Backend smoke tests exist in:

- `backend/core/tests.py`
- `backend/events/tests.py`
- `backend/tournaments/tests.py`
- `backend/rooney/tests.py`

Current covered areas include:

- admin auth cookie behavior and admin news access
- public news published-only behavior
- department representative admin-news denial
- department serializer representative fields
- event public/admin create permissions
- AI recap admin access permissions
- medal tally gold/silver/bronze priority sorting

Frontend test infrastructure is not currently defined in committed scripts.

## Recommended Test Layers

### Backend Unit Tests

- schedule conflict validation
- event edit safeguards
- tryout OTP expiry/attempt/duplicate rules
- registration roster ownership
- medal service behavior
- Rooney grounding context composition
- AI recap fallback behavior

### Backend API Tests

- permission matrix by role per endpoint
- public tryout send/verify/apply lifecycle
- registration submit/revise/approve lifecycle
- result finalization side effects
- news and AI recap publish flow
- Rooney happy path/refusal path

### Frontend Tests

- auth restore after refresh
- protected route loading/redirect behavior
- API interceptor refresh retry
- admin event/schedule modals
- public tryout form state
- news and AI recap review state

### End-to-End Tests

- admin login and dashboard
- department rep tryout-to-roster-to-registration flow
- admin registration review
- result finalization to medal tally and AI recap
- AI recap publish to public news
- Rooney grounded query

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Incorrect medal assignment logic for special formats | High | Medium | Event-stage policy layer and tests |
| Unauthorized data exposure from permissive defaults | High | Medium | Restrictive defaults and endpoint audit |
| Rooney or Gemini latency degrades UX | Medium | Medium | timeouts, retries, fallback messaging, async queue |
| Turnstile/Brevo outage blocks tryout applications | Medium | Medium | operator alerts and retry guidance |
| SQLite contention under concurrent writes | Medium | Medium | PostgreSQL migration |
| Missing frontend tests causes regressions | Medium | Medium | add Vitest/RTL or E2E test layer |

## Priority Recommendations

1. Add tests for public tryout verification and schedule/event validation.
2. Harden production settings and CORS/CSRF policies.
3. Introduce PostgreSQL settings and migration plan.
4. Add API schema generation and contract checks.
5. Add frontend test runner and core route/auth tests.
6. Add structured logging and health checks.
