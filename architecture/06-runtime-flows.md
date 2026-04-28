# 06 - Runtime Flows

This document describes the critical runtime interactions across the React frontend, Django REST API, PostgreSQL database, and external AI/security/email services.

## Flow 1: Login and Session Initialization

Access tokens are held in frontend runtime memory only. Refresh tokens are issued by Django as HttpOnly cookies and are not readable by JavaScript.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Login
    participant API as Django Auth API
    participant DB as PostgreSQL
    participant C as Browser Cookie Jar

    U->>FE: Submit username/password
    FE->>API: POST /api/auth/login/
    API->>DB: Validate user credentials and role profile
    DB-->>API: User, role, department scope
    API-->>C: Set HttpOnly refresh cookie
    API-->>FE: Return access JWT only
    FE->>FE: Store access token in memory
    FE->>FE: Decode role and department claims
    FE-->>U: Navigate to admin or representative workspace
```

## Flow 2: Session Restore After Page Reload

Because access tokens live only in memory, a reload clears the access token. The app restores the session by asking the backend to refresh from the HttpOnly cookie.

```mermaid
sequenceDiagram
    participant FE as React App Startup
    participant API as Django Auth API
    participant C as Browser Cookie Jar

    FE->>FE: AuthProvider initializes
    FE->>FE: Clear legacy localStorage/sessionStorage tokens
    FE->>API: POST /api/auth/refresh/ with credentials
    C-->>API: Send HttpOnly refresh cookie
    alt Refresh cookie valid
        API-->>FE: Return fresh access JWT only
        FE->>FE: Store access token in memory
        FE->>FE: Decode user role and department scope
        FE-->>FE: Protected routes remain available
    else Refresh missing or invalid
        API-->>FE: 401
        FE->>FE: Clear in-memory auth state
        FE-->>FE: Protected routes redirect to login
    end
```

## Flow 3: Protected API Request with Cookie-Based Refresh

The Axios client attaches the in-memory access token to protected requests. On one 401 retry, it refreshes by relying on the browser cookie.

```mermaid
sequenceDiagram
    participant FE as Axios API Client
    participant API as Django API
    participant C as Browser Cookie Jar

    FE->>API: Protected request with Bearer access token
    alt Access token valid
        API-->>FE: 200 response
    else Access token expired
        API-->>FE: 401
        FE->>API: POST /api/auth/refresh/
        C-->>API: Send HttpOnly refresh cookie
        alt Refresh valid
            API-->>FE: Fresh access JWT only
            FE->>FE: Replace in-memory access token
            FE->>API: Retry original request once
            API-->>FE: 200 response
        else Refresh invalid
            API-->>FE: 401
            FE->>FE: Clear in-memory auth state
        end
    end
```

## Flow 4: Logout

Logout clears both the in-memory access token and the backend-issued refresh cookie.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React App
    participant API as Django Auth API
    participant C as Browser Cookie Jar

    U->>FE: Click logout
    FE->>API: POST /api/auth/logout/
    API-->>C: Delete refresh cookie
    API-->>FE: 200 logged out
    FE->>FE: Clear in-memory access token and user state
    FE-->>U: Return to public/login view
```

## Flow 5: Public Verified Tryout Application

Students do not have accounts in v1. They submit a public tryout application after Turnstile verification and school-email OTP verification.

```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Public Tryout Form
    participant API as Tryout API
    participant CF as Cloudflare Turnstile
    participant BR as Brevo Email API
    participant DB as PostgreSQL

    S->>FE: Fill school email, department, event, and applicant details
    FE->>API: POST /api/public/tryouts/send-otp/
    API->>API: Validate @student.mseuf.edu.ph email
    API->>CF: Verify Turnstile token server-side
    CF-->>API: Token validation result
    API->>API: Enforce OTP rate limits and duplicate protections
    API->>DB: Store hashed OTP verification record
    API->>BR: Send OTP email
    API-->>FE: OTP sent
    S->>FE: Enter OTP
    FE->>API: POST /api/public/tryouts/verify-otp/
    API->>DB: Validate hash, expiry, usage, and attempt count
    API->>DB: Mark verification successful
    API-->>FE: Email verified
    S->>FE: Submit final application
    FE->>API: POST /api/public/tryouts/apply/
    API->>DB: Require verified email and prevent duplicate active application
    API->>DB: Create TryoutApplication with status submitted
    API-->>FE: Application submitted
```

## Flow 6: Department Representative Tryout Review and Athlete Conversion

Representatives are scoped to exactly one department. Private application, participant, roster, and registration data must remain department-scoped.

```mermaid
sequenceDiagram
    participant R as Department Representative
    participant FE as Representative Workspace
    participant API as Department-Scoped API
    participant DB as PostgreSQL

    R->>FE: Open tryout applications
    FE->>API: GET verified applications for representative department
    API->>DB: Filter by request.user profile department
    DB-->>API: Own-department applications only
    API-->>FE: Application table and detail records
    R->>FE: Mark selected, not selected, waitlisted, or under review
    FE->>API: PATCH application decision
    API->>DB: Update status and reviewer notes
    R->>FE: Convert selected applicant
    FE->>API: POST conversion action
    API->>DB: Create department-owned participant if not already converted
    API-->>FE: Participant available for roster building
```

## Flow 7: Department Registration Submission

Official intramurals registration is separate from public tryout status. Representatives submit rosters to admin for review.

```mermaid
sequenceDiagram
    participant R as Department Representative
    participant FE as Representative Roster Builder
    participant API as Registration API
    participant DB as PostgreSQL

    R->>FE: Select event and eligible department athletes
    FE->>API: POST registration/roster payload
    API->>DB: Resolve representative department from auth profile
    API->>DB: Validate one registration per event and department
    API->>DB: Validate roster size and athlete department ownership
    API->>DB: Create EventRegistration and RosterEntry rows
    API-->>FE: Registration submitted or pending
    FE->>FE: Refresh registration status and roster views
```

## Flow 8: Admin Registration Review

Admins approve, reject, or request revisions. Representatives can later resubmit only their own department registration when revision is needed.

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Admin Registration Review
    participant API as Registration API
    participant DB as PostgreSQL

    A->>FE: Open registration detail drawer
    FE->>API: GET registrations for admin review
    API->>DB: Load registration, roster, participants, and eligibility fields
    DB-->>API: Review payload
    API-->>FE: Detail panel data
    A->>FE: Approve, reject, or request revision
    FE->>API: PATCH registration status and review notes
    API->>DB: Update status, reviewer, reviewed_at, revision metadata
    API-->>FE: Updated registration
    FE->>FE: Refresh admin dashboard and registration queues
```

## Flow 9: Final Match Result to Medal Tally and AI Recap Draft

Finalized match-based results update medals and also generate a grounded AI recap draft. The draft is internal until an admin publishes it as news.

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Results Entry Page
    participant API as MatchResult ViewSet
    participant SVC as Tournament Services
    participant REC as AI Recap Service
    participant LLM as Gemini or Template Fallback
    participant DB as PostgreSQL

    A->>FE: Submit final match result
    FE->>API: POST/PATCH match result with is_final=true
    API->>DB: Save MatchResult
    API->>SVC: apply_final_match_result(result)
    SVC->>DB: Upsert gold and silver MedalRecord rows
    SVC->>DB: Recompute MedalTally using gold, silver, bronze priority
    API->>REC: generate_recap_for_match_result(result)
    REC->>DB: Build structured snapshot from result, schedule, medals, leaderboard
    alt Gemini configured and available
        REC->>LLM: Request JSON recap using grounded snapshot
        LLM-->>REC: generated_title, generated_summary, generated_body
    else Gemini missing, failed, or traffic-limited
        REC->>REC: Use template-grounded fallback copy
    end
    REC->>DB: Upsert AIRecap with status generated and citation map
    API-->>FE: Result response
```

## Flow 10: Final Podium Result to Medal Tally and AI Recap Draft

Rank-based events such as swimming use podium rows. When final podium rows exist, the recap snapshot records placements and medal outcomes.

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Results Entry Page
    participant API as PodiumResult ViewSet
    participant SVC as Tournament Services
    participant REC as AI Recap Service
    participant DB as PostgreSQL

    A->>FE: Submit final podium placement
    FE->>API: POST/PATCH podium result with is_final=true
    API->>DB: Save PodiumResult
    API->>SVC: apply_final_podium_result(result)
    SVC->>DB: Upsert MedalRecord for department, event, and medal
    SVC->>DB: Recompute MedalTally
    API->>REC: generate_recap_for_podium_schedule(schedule)
    REC->>DB: Read final podium rows and leaderboard top snapshot
    REC->>DB: Upsert AIRecap with trigger_type medal_update
    API-->>FE: Podium response
```

## Flow 11: Admin AI Recap Review to Published News

AI recaps are not public by default. Admins review, edit, approve, discard, or publish them into official news.

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Admin AI Recap Review
    participant API as /api/admin/ai-recaps/
    participant SVC as Recap Publishing Service
    participant DB as PostgreSQL

    A->>FE: Open AI Recap Review
    FE->>API: GET /api/admin/ai-recaps/
    API->>DB: Load internal AIRecap records
    DB-->>API: Drafts, snapshots, citations, linked news refs
    API-->>FE: Recap review queue
    A->>FE: Edit generated title, summary, or body
    FE->>API: PATCH /api/admin/ai-recaps/{id}/
    API->>DB: Save corrected draft fields
    A->>FE: Approve or publish as news
    FE->>API: POST /api/admin/ai-recaps/{id}/publish/
    API->>SVC: publish_recap_to_news(recap, user)
    SVC->>DB: Create or update NewsArticle with status published and ai_generated=true
    SVC->>DB: Mark AIRecap status published and link article
    API-->>FE: Recap plus published news metadata
```

## Flow 12: Manual News Management

Manual news is official content. Admin drafts and published AI recaps share the NewsArticle model, but only published articles are visible to public users and representatives.

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Admin News Management
    participant API as /api/admin/news/
    participant DB as PostgreSQL
    participant PUB as Public News Pages

    A->>FE: Create or edit article
    FE->>API: POST/PATCH /api/admin/news/
    API->>DB: Save NewsArticle draft, review, published, or archived
    alt Status is published
        API->>DB: Set published_at if missing
    end
    API-->>FE: Saved article
    PUB->>API: GET /api/public/news/
    API->>DB: Query NewsArticle where status=published only
    DB-->>API: Published articles
    API-->>PUB: Public news list or article detail
```

## Flow 13: Rooney Grounded Query

Rooney can use official public sources, including published news, schedules, results, medal tally, and leaderboard. It must not use internal AI recap drafts, discarded recaps, article drafts, admin notes, or private representative workflow data.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Rooney Page
    participant API as RooneyQueryView
    participant G as Grounding Service
    participant DB as PostgreSQL
    participant LLM as Gemini Model Chain

    U->>FE: Ask question
    FE->>API: POST /api/public/rooney/query/
    API->>G: build_grounding_context()
    G->>DB: Read schedules, finalized results, medal tally, leaderboard
    G->>DB: Read published NewsArticle records only
    DB-->>G: Grounding records and source labels
    G-->>API: Grounding text
    API->>LLM: Question plus strict grounded prompt
    alt Primary model succeeds
        LLM-->>API: Grounded JSON answer
    else Retryable model error or traffic spike
        API->>LLM: Try configured backup Gemini models
        LLM-->>API: Grounded JSON answer or refusal
    end
    API->>DB: Persist RooneyQueryLog
    API-->>FE: Answer, source labels, grounded flag, refusal reason if any
```

## Flow 14: Public Home, Results, Schedules, and News Browsing

Public pages only read public-safe endpoints. They never expose private admin data, representative review notes, or unpublished AI output.

```mermaid
sequenceDiagram
    participant U as Public User
    participant FE as Public React Pages
    participant API as Public API
    participant DB as PostgreSQL

    U->>FE: Open home, schedules, results, tally, leaderboard, or news
    FE->>API: GET public endpoints
    API->>DB: Query public-safe schedules, finalized results, medal tally, leaderboard, published news
    DB-->>API: Public-safe JSON payloads
    API-->>FE: Data response
    FE-->>U: Render intramurals dashboard, official results, and published content
```

## Core Runtime Rules

### Authentication

- access JWTs are stored in frontend memory only through `frontend/src/services/auth.ts`
- refresh JWTs are set and cleared by Django through an HttpOnly cookie
- the frontend sends cookies with `withCredentials: true`
- app startup restores sessions with `POST /api/auth/refresh/`
- legacy localStorage/sessionStorage tokens are cleared during auth initialization
- JWT lifetimes, algorithm, secret, and refresh-cookie settings are environment-driven in Django settings

### Authorization

- admin endpoints use staff/superuser permissions for management workflows
- department representative workflows must resolve department scope from the authenticated user profile
- representatives can manage only their own tryouts, participants, rosters, and registrations
- public viewers can read schedules, results, medal tally, leaderboard, published news, and Rooney answers

### Medal Ranking

- standings use Olympic-style medal priority only
- sorting is gold descending, then silver descending, then bronze descending, then department name ascending
- there is no points system and no weighted medal score

### AI and News

- AIRecap records are internal draft records
- NewsArticle records are official content records
- AI recap generation is grounded in structured result, schedule, medal, and leaderboard snapshots
- AI recap drafts are not public until published into NewsArticle
- public news endpoints return only `status=published`
- Rooney may ground on published news but not raw recap drafts or article drafts
- Gemini model selection uses `GEMINI_PRIMARY_MODEL`, with backup models from `GEMINI_BACKUP_MODELS`
- if Gemini is unavailable for recap generation, the backend uses a structured template fallback instead of inventing unsupported details

## Runtime Guarantees and Caveats

### Guarantees

- protected frontend requests use the in-memory access token and refresh via HttpOnly cookie
- refresh tokens are not exposed to frontend JavaScript
- public tryout OTPs are hashed before storage
- Turnstile is verified server-side before OTP issuance
- public news pages show only published NewsArticle records
- AI recaps are reviewable through stored input snapshots and citation maps
- Rooney responses are schema-constrained, source-labeled, and logged
- medal tally ranking follows gold, silver, bronze priority with no points display

### Caveats

- no distributed queue; AI generation and recap publication currently happen synchronously in request flow
- no optimistic locking or version checks for concurrent admin updates
- email delivery, Turnstile, and Gemini depend on external service availability and correct environment variables
- AI recap generation falls back to grounded template copy when Gemini is unavailable
