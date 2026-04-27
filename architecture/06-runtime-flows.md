# 06 - Runtime Flows

This document describes critical runtime interactions across frontend, backend, database, and external LLM services.

## Flow 1: Login and Session Initialization

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (Login)
    participant API as Django API
    participant DB as Database

    U->>FE: Submit username/password
    FE->>API: POST /api/auth/login/
    API->>DB: Validate user credentials
    DB-->>API: User + profile
    API-->>FE: access + refresh JWT
    FE->>FE: Persist tokens in localStorage
    FE->>FE: Decode access token claims
    FE-->>U: Navigate to requested protected route
```

## Flow 2: Protected API Request with Token Refresh

```mermaid
sequenceDiagram
    participant FE as Frontend API Client
    participant API as Django API

    FE->>API: Authenticated request with Bearer access token
    alt Access token valid
        API-->>FE: 200 response
    else Access token expired
        API-->>FE: 401
        FE->>API: POST /api/auth/refresh/ with refresh token
        alt Refresh valid
            API-->>FE: new access token
            FE->>API: Retry original request
            API-->>FE: 200 response
        else Refresh invalid
            API-->>FE: 401
            FE->>FE: Clear tokens and auth state
        end
    end
```

## Flow 3: Department Registration Submission

```mermaid
sequenceDiagram
    participant R as Department Rep
    participant FE as Dashboard UI
    participant API as Registration ViewSet
    participant DB as Database

    R->>FE: Select schedule and athletes
    FE->>API: POST /api/public/registrations/
    API->>DB: Resolve profile department
    API->>DB: Validate unique(schedule, department)
    API->>DB: Validate athlete department ownership
    API->>DB: Create EventRegistration
    API->>DB: Bulk create RosterEntry rows
    API-->>FE: 201 created
    FE->>FE: Invalidate registrations and schedules query cache
```

## Flow 4: Admin Approval / Revision Feedback

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Admin Dashboard
    participant API as Registration ViewSet
    participant DB as Database

    A->>FE: Approve or request revision
    FE->>API: PATCH /api/public/registrations/{id}/
    API->>DB: Update status and admin_notes
    DB-->>API: Updated registration
    API-->>FE: 200 response
    FE->>FE: Refresh registration list
```

## Flow 5: Final Match Result to Medal Tally

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Admin Tool
    participant API as MatchResult ViewSet
    participant SVC as Tournament Services
    participant DB as Database
    participant SIG as Medal Signals

    A->>FE: Submit final match result (is_final=true)
    FE->>API: POST/PATCH /api/public/match-results/
    API->>DB: Save MatchResult
    API->>SVC: apply_final_match_result(result)
    SVC->>DB: upsert winner MedalRecord (gold)
    SVC->>DB: upsert loser MedalRecord (silver)
    DB-->>SIG: post_save MedalRecord events
    SIG->>DB: Recompute MedalTally for affected department(s)
    API-->>FE: Result response
```

## Flow 6: Final Podium Result to Medal Tally

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Admin Tool
    participant API as PodiumResult ViewSet
    participant SVC as Tournament Services
    participant DB as Database
    participant SIG as Medal Signals

    A->>FE: Submit podium row (is_final=true)
    FE->>API: POST/PATCH /api/public/podium-results/
    API->>DB: Save PodiumResult
    API->>SVC: apply_final_podium_result(result)
    SVC->>DB: upsert MedalRecord for department/event
    DB-->>SIG: post_save MedalRecord event
    SIG->>DB: Recompute MedalTally
    API-->>FE: Result response
```

## Flow 7: Rooney Grounded Query

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Rooney Page
    participant API as RooneyQueryView
    participant G as Grounding Service
    participant DB as Database
    participant LLM as Gemini API

    U->>FE: Ask question
    FE->>API: POST /api/public/rooney/query/
    API->>G: build_grounding_context()
    G->>DB: Read tally, schedules, recent results
    DB-->>G: Context records
    G-->>API: grounding text + source labels
    API->>LLM: question + strict grounded prompt
    LLM-->>API: structured JSON answer/refusal
    API->>DB: Persist RooneyQueryLog
    API-->>FE: grounded response
    FE-->>U: Render answer, sources, or refusal reason
```

## Flow 8: Public Results Browsing

```mermaid
sequenceDiagram
    participant U as Public User
    participant FE as Results Page
    participant API as Tournaments Endpoints
    participant DB as Database

    U->>FE: Open results route
    FE->>API: GET medal-tally, match-results, podium-results
    API->>DB: Query related tables
    DB-->>API: Result sets
    API-->>FE: JSON payloads
    FE-->>U: Render leaderboard and recent outcomes
```

## Runtime Guarantees and Caveats

### Guarantees

- medal tally reflects medal ledger mutations via signal recomputation
- Rooney responses are schema-constrained and logged
- department reps cannot list other departments' athletes/registrations through current queryset logic

### Caveats

- no distributed queue; all workflows are synchronous in-request
- no optimistic locking or version checks for concurrent admin updates
- medal finalization policy does not yet encode bracket stage semantics explicitly
