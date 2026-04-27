# 09 - Architecture Decisions and Roadmap

## Current Decisions (Implemented)

### AD-001: Modular Monolith for Domain Delivery

Status: Accepted and implemented.

Rationale:

- fast development for intramurals timeline
- low operational overhead
- easier cross-domain joins and transactions

Trade-off:

- tighter coupling between modules compared to microservices

### AD-002: JWT Claims Include Role and Department Context

Status: Accepted and implemented.

Rationale:

- avoids extra profile fetch after login
- simplifies frontend role and scope checks

Trade-off:

- claim shape becomes part of auth contract requiring version discipline

### AD-003: Medal Tally as Derived Aggregate

Status: Accepted and implemented.

Rationale:

- standings query stays fast and deterministic
- source-of-truth remains medal ledger

Trade-off:

- requires reliable signal handling and recomputation logic

### AD-004: Rooney Grounding-First Design

Status: Accepted and implemented.

Rationale:

- aligns with requirement to avoid hallucinations
- increases answer traceability using source labels and logs

Trade-off:

- answer quality limited by available grounding context

## Proposed Decisions (Backlog)

### AD-005: Production Configuration Split

Status: Proposed.

Decision:

- split settings into base/dev/prod
- enforce safe defaults in production profile

### AD-006: PostgreSQL Migration

Status: Proposed.

Decision:

- move from SQLite to PostgreSQL before high-concurrency production use

### AD-007: API Versioning Strategy

Status: Proposed.

Decision:

- introduce explicit `/api/v1/` namespace and schema publishing

### AD-008: Tournament Medal Policy Strategy Layer

Status: Proposed.

Decision:

- add policy abstraction to support finals, bronze matches, and event-specific medal logic

### AD-009: Test-First CI Enforcement

Status: Proposed.

Decision:

- block merges on failing backend and frontend automated tests

## Roadmap by Phase

## Phase 1: Hardening (Immediate)

- security defaults tightening
- tests for registration, permissions, medal logic
- environment variable template and validation

## Phase 2: Production Readiness

- PostgreSQL support
- deployment architecture with reverse proxy and static hosting
- structured logging and health checks

## Phase 3: Domain Evolution

- advanced bracket and event-stage modeling
- richer analytics dashboards
- Rooney context expansion and policy tuning

## Phase 4: Operational Maturity

- CI/CD release gates and rollback workflows
- performance testing and database indexing
- periodic architecture and security reviews

## Success Criteria

- no permission regression across protected endpoints
- deterministic medal tally under repeated finalization corrections
- Rooney refusal behavior is predictable and auditable
- deployment process is reproducible and low-risk
