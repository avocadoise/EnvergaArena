# 05 - API Contracts

## API Base

- Base URL (dev): `http://localhost:8000/api`
- Content type: `application/json`
- Protected requests use `Authorization: Bearer <access_token>`
- Browser requests use `withCredentials: true` so the HttpOnly refresh cookie can be sent to auth refresh/logout endpoints

## Authentication Endpoints

| Method | Path | Auth Required | Description |
| --- | --- | --- | --- |
| POST | `/auth/login/` | No | Validate credentials, return access JWT, set refresh JWT HttpOnly cookie |
| POST | `/auth/refresh/` | Refresh cookie | Return fresh access JWT from HttpOnly refresh cookie |
| POST | `/auth/logout/` | No | Clear refresh cookie |
| GET | `/auth/me/` | Access JWT | Return current user auth payload |

### Login Request Example

```json
{
  "username": "admin",
  "password": "demo1234"
}
```

### Login Response Body

```json
{
  "access": "<jwt_with_role_and_department_claims>"
}
```

The refresh token is not returned in JSON. It is set by the backend as an HttpOnly cookie.

### Access Token Claims

```json
{
  "user_id": 1,
  "username": "admin",
  "role": "admin",
  "department_id": null,
  "department_name": null,
  "department_acronym": null
}
```

## Public Tryout Endpoints

Students do not log in.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/public/tryouts/send-otp/` | Public | Validate Turnstile and school email, send OTP |
| POST | `/public/tryouts/verify-otp/` | Public | Verify OTP and mark code used |
| POST | `/public/tryouts/apply/` | Public | Create verified tryout application |

Allowed student email domain: `@student.mseuf.edu.ph`.

### Send OTP Payload

```json
{
  "full_name": "Juan Dela Cruz",
  "student_no": "2026-00001",
  "school_email": "juan@student.mseuf.edu.ph",
  "department": 1,
  "schedule": 10,
  "turnstile_token": "<client_turnstile_token>"
}
```

### Verify OTP Payload

```json
{
  "student_no": "2026-00001",
  "school_email": "juan@student.mseuf.edu.ph",
  "department": 1,
  "schedule": 10,
  "code": "123456"
}
```

### Apply Payload

```json
{
  "full_name": "Juan Dela Cruz",
  "student_no": "2026-00001",
  "school_email": "juan@student.mseuf.edu.ph",
  "department": 1,
  "schedule": 10,
  "program": "BS Computer Science",
  "year_level": "2nd Year",
  "contact_no": "09171234567",
  "prior_experience": "Varsity applicant",
  "notes": "",
  "consent": true
}
```

## Router Endpoints Under `/api/public/`

The prefix does not mean every method is anonymous. Write permissions are enforced by each viewset.

### Core Reference Data

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/departments/` | Public |
| POST/PATCH/DELETE | `/public/departments/` | Admin |
| GET | `/public/venues/` | Public |
| POST/PATCH/DELETE | `/public/venues/` | Admin |
| GET | `/public/venue-areas/` | Public |
| POST/PATCH/DELETE | `/public/venue-areas/` | Admin |

### Public News

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/news/` | Public, published only |
| GET | `/public/news/{slug}/` | Public, published only |

Supported filters include `article_type`, `department`, `event`, and `q`.

### Event Catalog

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/events/` | Public |
| GET | `/public/events/{id}/` | Public |
| POST/PATCH/DELETE | `/public/events/` | Admin |
| GET | `/public/event-categories/` | Public |
| POST/PATCH/DELETE | `/public/event-categories/` | Admin |

Event payload fields include:

- `name`
- `slug`
- `category`
- `division`
- `result_family`
- `competition_format`
- `best_of`
- `team_size_min`
- `team_size_max`
- `roster_size_max`
- `medal_bearing`
- `ruleset_ref`
- `sort_order`
- `is_program_event`
- `status`

### Schedules

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/schedules/` | Public |
| GET | `/public/schedules/{id}/` | Public |
| POST | `/public/schedules/` | Admin |
| PATCH | `/public/schedules/{id}/` | Admin |
| DELETE | `/public/schedules/{id}/` | Admin |

Schedule payload fields include:

- `event`
- `phase`
- `round_label`
- `scheduled_start`
- `scheduled_end`
- `venue`
- `venue_area`
- `status`
- `notes`

### Athletes

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/athletes/` | Authenticated; admin all, department rep scoped |
| GET | `/public/athletes/{id}/` | Authenticated |
| POST | `/public/athletes/` | Authenticated |
| PATCH | `/public/athletes/{id}/` | Authenticated and scoped |
| DELETE | `/public/athletes/{id}/` | Authenticated and scoped |

### Tryout Applications

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/tryout-applications/` | Authenticated; admin all, department rep scoped |
| PATCH | `/public/tryout-applications/{id}/` | Authenticated and scoped |
| POST | `/public/tryout-applications/{id}/convert/` | Authenticated and scoped |

### Registrations

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/registrations/` | Authenticated; admin all, department rep scoped |
| GET | `/public/registrations/{id}/` | Authenticated |
| POST | `/public/registrations/` | Authenticated |
| PATCH | `/public/registrations/{id}/` | Authenticated |
| DELETE | `/public/registrations/{id}/` | Authenticated |

### Match Results

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/match-results/` | Public |
| GET | `/public/match-results/{id}/` | Public |
| POST | `/public/match-results/` | Admin |
| PATCH | `/public/match-results/{id}/` | Admin |
| DELETE | `/public/match-results/{id}/` | Admin |
| POST | `/public/match-results/{id}/add-set/` | Admin |

### Podium Results

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/podium-results/` | Public |
| GET | `/public/podium-results/{id}/` | Public |
| POST | `/public/podium-results/` | Admin |
| PATCH | `/public/podium-results/{id}/` | Admin |
| DELETE | `/public/podium-results/{id}/` | Admin |

### Medal Ledger and Tally

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/medal-records/` | Public |
| GET | `/public/medal-records/{id}/` | Public |
| DELETE | `/public/medal-records/{id}/` | Admin |
| GET | `/public/medal-tally/` | Public |
| GET | `/public/medal-tally/{id}/` | Public |

### Rooney Logs

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/rooney-logs/` | Admin |

## Admin Endpoints Under `/api/admin/`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET/POST/PATCH/DELETE | `/admin/news/` | Admin | Manage all official news articles |
| GET/POST/PATCH/DELETE | `/admin/ai-recaps/` | Admin | Manage internal recap drafts |
| POST | `/admin/ai-recaps/generate/` | Admin | Generate recap from schedule/result context |
| POST | `/admin/ai-recaps/{id}/approve/` | Admin | Mark recap approved |
| POST | `/admin/ai-recaps/{id}/discard/` | Admin | Discard recap |
| POST | `/admin/ai-recaps/{id}/publish/` | Admin | Publish recap as official NewsArticle |

## Rooney API

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/public/rooney/query/` | Public | Grounded intramurals FAQ query |

### Rooney Request Example

```json
{
  "question": "Who is leading right now?"
}
```

### Rooney Response Example

```json
{
  "answer_text": "CAFA is currently leading with ...",
  "grounded": true,
  "source_labels": ["Official Medal Tally"],
  "refusal_reason": ""
}
```

## Important Write Payloads

### Create Registration

```json
{
  "schedule": 12,
  "department": 3,
  "roster_athlete_ids": [44, 45, 47]
}
```

For department reps, backend validation scopes department ownership and roster athletes.

### Update Registration Status

```json
{
  "status": "needs_revision",
  "admin_notes": "Please update medical clearances."
}
```

### Create Match Result

```json
{
  "schedule": 5,
  "home_department": 1,
  "away_department": 3,
  "home_score": 2,
  "away_score": 3,
  "is_draw": false,
  "is_final": true
}
```

If `winner` is omitted and the score is not tied, backend infers winner from scores.

### Create Podium Result

```json
{
  "schedule": 7,
  "department": 2,
  "rank": 1,
  "medal": "gold",
  "is_final": true
}
```

No points field is accepted or used for medal ranking.

## Error Handling Model

Common API failure categories:

- validation errors: `400` with field-level detail
- auth failures: `401`
- forbidden writes: `403`
- not found: `404`

Frontend pages surface common validation messages for login, tryouts, registration, schedule/event management, news, and AI recap actions.

## Contract Caveats

1. OpenAPI schema is not currently generated or committed.
2. Versioning strategy for API evolution is not yet defined.
3. Some operational endpoints are mounted under `/api/public/` for historical router simplicity; permission classes still enforce protected writes.
