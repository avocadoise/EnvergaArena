# 08 - Security, Testing, and Risks

## Security Architecture

## Identity and Access

Implemented controls:

- JWT-based authentication for protected workflows.
- Custom token claims include user role and department context.
- View-level permission classes guard write operations.
- Queryset scoping restricts department-rep visibility for athletes and registrations.

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
