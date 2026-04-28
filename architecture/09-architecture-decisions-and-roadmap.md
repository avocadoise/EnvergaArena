# 09 - Architecture Decisions and Roadmap

## Current Decisions

### AD-001: Modular Monolith for Demo Delivery

Status: Accepted and implemented.

Rationale:

- fast development for intramurals timeline
- low operational overhead
- easy cross-domain transactions for schedules, results, medals, news, and AI recaps

Trade-off:

- tighter coupling between modules compared to service decomposition

### AD-002: JWT Access Token With Role and Department Claims

Status: Accepted and implemented.

Rationale:

- simplifies frontend role gating
- gives department representative pages immediate department context
- reduces user-profile lookup needs

Trade-off:

- claim shape is now part of the auth contract

### AD-003: In-Memory Access Token and HttpOnly Refresh Cookie

Status: Accepted and implemented.

Rationale:

- avoids persistent frontend storage of active tokens
- preserves reload persistence through backend refresh cookie
- reduces exposure if localStorage is compromised

Trade-off:

- app startup must perform refresh/session restore before protected routes resolve
- cookie settings must be carefully configured for localhost vs production

### AD-004: Medal Tally as Derived Aggregate

Status: Accepted and implemented.

Rationale:

- standings query stays fast and deterministic
- source of truth remains the medal ledger
- ranking can consistently enforce gold, silver, bronze priority

Trade-off:

- requires reliable signal/service recomputation

### AD-005: Rooney Grounding-First Design

Status: Accepted and implemented.

Rationale:

- avoids unsupported answers
- surfaces source labels
- logs every response for admin monitoring

Trade-off:

- answer quality depends on available structured data

### AD-006: Public Tryout Verification Instead of Student Accounts

Status: Accepted and implemented.

Rationale:

- keeps v1 account model simple
- supports student applications through school email OTP
- lets department reps own selection and conversion workflow

Trade-off:

- public endpoints need strong anti-spam controls
- email delivery and Turnstile availability matter

### AD-007: AI Recap Drafts Are Separate From Official News

Status: Accepted and implemented.

Rationale:

- preserves admin editorial control
- prevents raw AI drafts from becoming public automatically
- keeps public content in the official `NewsArticle` model

Trade-off:

- recap publication requires an admin review step

## Proposed Decisions

### AD-008: Production Configuration Split

Status: Proposed.

Decision:

- split settings into base/dev/prod
- enforce safe defaults in production profile

### AD-009: PostgreSQL Migration

Status: Proposed.

Decision:

- wire `DATABASE_URL`
- move from SQLite to PostgreSQL before high-concurrency or real deployment use

### AD-010: API Versioning Strategy

Status: Proposed.

Decision:

- introduce explicit `/api/v1/` namespace and schema publishing once endpoints stabilize

### AD-011: Tournament Medal Policy Strategy Layer

Status: Proposed.

Decision:

- add policy abstraction for finals, bronze matches, ties, disqualifications, and event-specific medal logic

### AD-012: Async AI and Email Task Processing

Status: Proposed.

Decision:

- move long-running AI recap generation, Rooney calls if needed, and transactional email retries to task workers

### AD-013: Test-First CI Enforcement

Status: Proposed.

Decision:

- block merges on backend checks/tests and frontend lint/build
- add frontend component/E2E tests as workflows stabilize

## Roadmap by Phase

## Phase 1: Demo Completion and Safety

- expand smoke tests for tryouts, event management, schedule conflict validation, and AI recap publish flow
- add confirmation/audit patterns for sensitive admin edits
- keep seeded data realistic and aligned with official department/event scope
- rotate any exposed local secrets before real demos

## Phase 2: Production Readiness

- PostgreSQL support
- production settings split
- restricted CORS/CSRF
- secure cookie profile
- structured logging
- health/readiness endpoints

## Phase 3: Domain Evolution

- bracket and event-stage modeling
- event-specific medal policies
- richer participant eligibility fields
- fuller audit history for result and schedule corrections
- advanced filters/pagination on admin tables

## Phase 4: AI and Content Maturity

- async AI recap processing
- better citation previews
- Rooney source controls by role
- AI recap prompt/version management
- published-news grounding improvements

## Success Criteria

- protected endpoints do not leak private department/admin workflow data
- access token remains memory-only and sessions restore through HttpOnly refresh cookie
- public tryout submissions require verified student email
- medal tally remains deterministic under repeated finalization/correction flows
- public news shows only published articles
- Rooney refusal behavior is predictable and auditable
- admin and representative dashboards support the core demo workflows
