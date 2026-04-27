# 05 - API Contracts

## API Base

- Base URL (dev): `http://localhost:8000/api`
- Content type: `application/json`
- Auth scheme: `Authorization: Bearer <access_token>`

## Authentication Endpoints

| Method | Path | Auth Required | Description |
| --- | --- | --- | --- |
| POST | `/auth/login/` | No | Obtain access + refresh JWT and custom role claims |
| POST | `/auth/refresh/` | No | Refresh access token using refresh token |

### Login Request Example

```json
{
  "username": "admin",
  "password": "demo1234"
}
```

### Login Response Example

```json
{
  "refresh": "<jwt>",
  "access": "<jwt_with_role_and_department_claims>"
}
```

## Public and Router Endpoints

All of the following are mounted under `/public/`.

### Core Reference Data

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/departments/` | Public |
| GET | `/public/departments/{id}/` | Public |
| GET | `/public/venues/` | Public |
| GET | `/public/venues/{id}/` | Public |
| GET | `/public/venue-areas/` | Public |
| GET | `/public/venue-areas/{id}/` | Public |

### Event Catalog

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/events/` | Public |
| GET | `/public/events/{id}/` | Public |
| GET | `/public/event-categories/` | Public |
| GET | `/public/event-categories/{id}/` | Public |

### Schedules

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/schedules/` | Public |
| GET | `/public/schedules/{id}/` | Public |
| POST | `/public/schedules/` | Admin |
| PATCH | `/public/schedules/{id}/` | Admin |
| DELETE | `/public/schedules/{id}/` | Admin |

### Athletes

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/athletes/` | Authenticated (admin all, dept rep scoped) |
| GET | `/public/athletes/{id}/` | Authenticated |
| POST | `/public/athletes/` | Authenticated |
| PATCH | `/public/athletes/{id}/` | Authenticated (scope enforced by queryset) |
| DELETE | `/public/athletes/{id}/` | Authenticated (scope enforced by queryset) |

### Registrations

| Method | Path | Access |
| --- | --- | --- |
| GET | `/public/registrations/` | Authenticated (admin all, dept rep scoped) |
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
  "source_labels": ["official_medal_tally", "Match Results"],
  "refusal_reason": ""
}
```

### Rooney Refusal Example

```json
{
  "answer_text": "",
  "grounded": false,
  "source_labels": [],
  "refusal_reason": "I can only answer from official intramurals data currently available."
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

Behavior notes:

- for non-admin users, backend may override `department` using profile mapping
- duplicate (`schedule`, `department`) registration is rejected
- roster athletes must belong to same department

### Update Registration Status (Admin)

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

If `winner` is omitted and not a draw, backend infers winner from scores.

### Add Match Set

```json
{
  "set_number": 1,
  "home_score": 25,
  "away_score": 22
}
```

### Create Podium Result

```json
{
  "schedule": 7,
  "department": 2,
  "rank": 1,
  "medal": "gold",
  "points_awarded": 0,
  "is_final": true
}
```

## Error Handling Model

Common API failure categories:

- validation errors: `400` with field-level detail
- auth failures: `401`
- forbidden writes: `403`
- not found: `404`

Frontend currently reads validation messages for registration errors and login `detail` message.

## Contract Caveats

1. README mentions `/api/auth/token/`, but implemented login path is `/api/auth/login/`.
2. OpenAPI schema is not currently generated or committed.
3. Versioning strategy for API evolution is not yet defined.
