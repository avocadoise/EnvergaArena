# 04 - Data Model

## Data Architecture Overview

The backend uses a relational schema organized around four primary Django apps:

1. **Core (core)**: Core references (departments, venues, user profiles, news articles).
2. **Events (events)**: Event catalog (categories and specific events).
3. **Tournaments (	ournaments)**: Competition operations (schedules, athletes, tryouts, registrations, rosters, results, ledgers).
4. **Rooney AI (
ooney)**: AI audit logs and generated recaps.

## Entity Relationship Diagram

`mermaid
erDiagram
    USER ||--o| USER_PROFILE : has
    DEPARTMENT ||--o{ USER_PROFILE : owns
    DEPARTMENT ||--o{ ATHLETE : has
    DEPARTMENT ||--o{ EVENT_REGISTRATION : submits
    DEPARTMENT ||--o{ MATCH_RESULT : appears_in
    DEPARTMENT ||--o{ PODIUM_RESULT : appears_in
    DEPARTMENT ||--o{ MEDAL_RECORD : earns
    DEPARTMENT ||--o| MEDAL_TALLY : aggregates
    DEPARTMENT ||--o{ NEWS_ARTICLE : linked_to
    DEPARTMENT ||--o{ TRYOUT_APPLICATION : receives

    VENUE ||--o{ VENUE_AREA : contains
    EVENT_CATEGORY ||--o{ EVENT : groups
    EVENT ||--o{ EVENT_SCHEDULE : schedules
    VENUE ||--o{ EVENT_SCHEDULE : hosts
    VENUE_AREA ||--o{ EVENT_SCHEDULE : allocates

    EVENT_SCHEDULE ||--o{ EVENT_REGISTRATION : receives
    EVENT_REGISTRATION ||--o{ ROSTER_ENTRY : includes
    ATHLETE ||--o{ ROSTER_ENTRY : selected

    EVENT_SCHEDULE ||--o{ TRYOUT_APPLICATION : targets

    EVENT_SCHEDULE ||--o| MATCH_RESULT : finalizes
    MATCH_RESULT ||--o{ MATCH_SET_SCORE : details
    EVENT_SCHEDULE ||--o{ PODIUM_RESULT : ranks

    EVENT ||--o{ MEDAL_RECORD : references
    MATCH_RESULT ||--o{ MEDAL_RECORD : source_match
    PODIUM_RESULT ||--o{ MEDAL_RECORD : source_podium
`

---

## 1. Core Models (core/models.py)

### Department
- Represents a participating college/department.
- **Fields**: 
ame, cronym, color_code

### Venue & VenueArea
- **Venue**: Logical facility location (e.g., University Gymnasium).
- **VenueArea**: Subdivision of a venue (e.g., Court A, Court B) with capacity. Used in schedule conflict validation.

### UserProfile
- One-to-one with the Django User model.
- **Fields**: 
ole (dmin or department_rep), foreign key to Department (optional).

### NewsArticle
- Official communications and updates.
- **Fields**: 	itle, slug, summary, ody_md, rticle_type (announcement, result_recap, etc.), status (draft, review, published, archived), i_generated.
- Optionally links to a specific Event or Department. Tracks created_by and 
eviewed_by.

---

## 2. Event Models (events/models.py)

### EventCategory
- Groups events (e.g., Ball Games, Aquatics).
- **Fields**: 
ame, is_medal_bearing.

### Event
- Base definition for a competition.
- **Fields**: category, 
ame, 
esult_family (match_based or 
ank_based), status (scheduled, live, completed, postponed, cancelled), and is_program_event (for non-medal activities like opening ceremonies).

---

## 3. Tournament Models (	ournaments/models.py)

### EventSchedule
- Binds an Event to a specific Venue, VenueArea, and start/end time.

### Athlete
- Department-owned participant record.
- **Fields**: student_number, ull_name, department, program_course, year_level, is_enrolled, medical_cleared.

### EmailVerificationCode & TryoutApplication
- **EmailVerificationCode**: Hashed OTP metadata for secure tryout verification.
- **TryoutApplication**: Public application submitted by a student. Tracks email verification state, priority status (submitted, under_review, selected, waitlisted, etc.), and a 1-to-1 conversion link to an Athlete record once accepted.

### EventRegistration & RosterEntry
- **EventRegistration**: A department's intent to compete in a scheduled event. Status tracks the administrative pipeline (submitted, 
eeds_revision, pproved). Constraint: Unique across (schedule, department).
- **RosterEntry**: A join table mapping an Athlete to an EventRegistration. Includes is_eligible.

### MatchResult & MatchSetScore
- For match_based events (head-to-head). 
- Tracks home_department, way_department, final scores, winner, is_draw, and is_final (which determines medals via signals).
- **MatchSetScore** supports per-period score granularity.

### PodiumResult
- For 
ank_based events (placements).
- Tracks department, 
ank, the awarded medal (gold, silver, bronze, none), and an is_final flag.

### MedalRecord & MedalTally
- **MedalRecord**: An immutable, write-once ledger entry generated via signals when results are finalized. One row per (department, event).
- **MedalTally**: Aggregated standing per department for fast display. Recomputed derived data representing total gold, silver, and bronze medals. 

---

## 4. Rooney AI Models (
ooney/models.py)

### RooneyQueryLog
- Audit log of user interactions with the public AI assistant.
- **Fields**: question, nswer_text, grounded (boolean for safe resolution), source_labels (JSON), 
efusal_reason.

### AIRecap
- AI-generated match, schedule, or podium summaries awaiting human approval.
- **Fields**: 	rigger_type (event_completion, manual, etc.), scope_type, scope_key, linked_news_article.
- Stores raw generation inputs/outputs (input_snapshot_json, citation_map_json, generated_body).
- Admin statuses: generated, under_review, pproved, discarded, published. 

---

## Current Data Model Strengths

- Clear separation between raw operational results (MatchResult/PodiumResult), immutable ledgers (MedalRecord), and view materializations (MedalTally).
- Security architecture tracks AI provenance explicitly (AIRecap, RooneyQueryLog, i_generated fields).
- Public actions (Tryouts) safely funnel into internal domain boundaries (Athlete) via a conversion pointer (converted_athlete bridge).

## Future Opportunities

- Soft-delete or versioning strategies for operational entities.
- Advanced bracketing (group stage vs knockout nodes).
- Additional performance indexing for scaled queries (e.g., historical analytics).
