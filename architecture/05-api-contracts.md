# 05 - API Contracts

## API Base

- Base URL (dev): `http://localhost:8000/api`
- Content type: `application/json`
- Protected requests use `Authorization: Bearer <access_token>`
- Browser requests use `withCredentials: true` so the HttpOnly refresh cookie can be sent to auth refresh/logout endpoints

## Implementation Source of Truth

Backend API routes are registered in `backend/backend/urls.py`.

The file uses two DRF routers:

- `router`: included under `/api/public/`
- `admin_router`: included under `/api/admin/`

It also defines explicit `path()` routes for authentication, public tryout OTP/application flow, and Rooney public query.

```python
router = DefaultRouter()
admin_router = DefaultRouter()

router.register(r'departments', DepartmentViewSet)
router.register(r'venues', VenueViewSet)
router.register(r'venue-areas', VenueAreaViewSet)
router.register(r'news', PublicNewsArticleViewSet, basename='publicnews')
router.register(r'events', EventViewSet)
router.register(r'event-categories', EventCategoryViewSet)
router.register(r'athletes', AthleteViewSet, basename='athlete')
router.register(r'tryout-applications', TryoutApplicationViewSet, basename='tryoutapplication')
router.register(r'registrations', EventRegistrationViewSet, basename='eventregistration')
router.register(r'schedules', EventScheduleViewSet)
router.register(r'match-results', MatchResultViewSet)
router.register(r'podium-results', PodiumResultViewSet)
router.register(r'medal-records', MedalRecordViewSet)
router.register(r'medal-tally', MedalTallyViewSet)
router.register(r'rooney-logs', RooneyQueryLogViewSet, basename='rooneylog')

admin_router.register(r'news', AdminNewsArticleViewSet, basename='adminnews')
admin_router.register(r'ai-recaps', AIRecapViewSet, basename='airecap')
```

Explicit routes:

```python
path('api/auth/login/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair')
path('api/auth/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh')
path('api/auth/logout/', LogoutView.as_view(), name='token_logout')
path('api/auth/me/', CurrentUserView.as_view(), name='current_user')
path('api/public/rooney/query/', RooneyQueryView.as_view(), name='rooney_query')
path('api/public/tryouts/send-otp/', TryoutSendOtpView.as_view(), name='tryout_send_otp')
path('api/public/tryouts/verify-otp/', TryoutVerifyOtpView.as_view(), name='tryout_verify_otp')
path('api/public/tryouts/apply/', TryoutApplyView.as_view(), name='tryout_apply')
```

## Backend Route Implementation Map

This section maps public API paths to the actual backend class or function handling the request.

### Explicit Auth Routes

| API Path | Method | Backend Code | Serializer / Helper | Permission | What It Does |
| --- | --- | --- | --- | --- | --- |
| `/api/auth/login/` | POST | `backend/core/views.py::CookieTokenObtainPairView` | `CustomTokenObtainPairSerializer`, `set_refresh_cookie()` | Public | Validates credentials through SimpleJWT, returns access JWT in JSON, stores refresh JWT in HttpOnly cookie |
| `/api/auth/refresh/` | POST | `backend/core/views.py::CookieTokenRefreshView` | SimpleJWT refresh serializer, `set_refresh_cookie()` when rotation returns a new refresh token | Refresh cookie required | Reads refresh JWT from configured cookie and returns a fresh access JWT |
| `/api/auth/logout/` | POST | `backend/core/views.py::LogoutView` | `clear_refresh_cookie()` | Public | Deletes the refresh cookie; frontend clears in-memory access token |
| `/api/auth/me/` | GET | `backend/core/views.py::CurrentUserView` | `get_user_auth_payload()` | `IsAuthenticated` | Returns role, username, and department payload for the current access token |

Auth support code:

- `backend/core/serializers.py::get_user_auth_payload()` builds the auth payload.
- `backend/core/serializers.py::CustomTokenObtainPairSerializer` adds role and department claims to JWTs.
- `backend/backend/settings.py::SIMPLE_JWT` defines signing key, algorithm, and lifetimes from environment variables.

### Explicit Public Tryout Routes

| API Path | Method | Backend Code | Serializer / Helper | Permission | What It Does |
| --- | --- | --- | --- | --- | --- |
| `/api/public/tryouts/send-otp/` | POST | `backend/tournaments/views.py::TryoutSendOtpView` | `TryoutSendOtpSerializer`, `verify_turnstile_token()`, `create_email_verification_code()`, `send_tryout_otp_email()` | Public | Validates school email, duplicate application state, Turnstile, and rate limits; stores hashed OTP and sends Brevo email |
| `/api/public/tryouts/verify-otp/` | POST | `backend/tournaments/views.py::TryoutVerifyOtpView` | `TryoutVerifyOtpSerializer`, `verify_email_code()` | Public | Validates OTP, expiry, attempt limits, and marks verification code as used |
| `/api/public/tryouts/apply/` | POST | `backend/tournaments/views.py::TryoutApplyView` | `TryoutApplySerializer`, `get_recent_verified_code()` | Public | Creates verified `TryoutApplication` with status `submitted` after OTP verification |

Tryout support code:

- `backend/tournaments/tryout_services.py::validate_school_email()` enforces `@student.mseuf.edu.ph`.
- `backend/tournaments/tryout_services.py::enforce_rate_limit()` protects send, verify, and apply actions.
- `backend/tournaments/tryout_services.py::verify_turnstile_token()` performs server-side Cloudflare Siteverify.
- `backend/tournaments/tryout_services.py::send_tryout_otp_email()` sends OTP through Brevo.

### Explicit Rooney Route

| API Path | Method | Backend Code | Serializer / Helper | Permission | What It Does |
| --- | --- | --- | --- | --- | --- |
| `/api/public/rooney/query/` | POST | `backend/rooney/views.py::RooneyQueryView` | `RooneyQuerySerializer`, `build_grounding_context()`, `query_rooney()` | Public | Validates a question, builds official grounding context, calls Gemini model chain, logs the query, and returns grounded answer/refusal |

### `/api/public/` DRF Router Routes

The `/api/public/` prefix contains a mix of anonymous read endpoints, authenticated/scoped workflow endpoints, and admin-write endpoints. The route prefix is historical; permissions still control the real access rules.

| Router Path | Backend Code | Serializer | Permission | What It Does |
| --- | --- | --- | --- | --- |
| `/api/public/departments/` | `backend/core/views.py::DepartmentViewSet` | `DepartmentSerializer` | `IsAdminOrReadOnly` | Lists departments publicly; admin can create/update/delete department rows |
| `/api/public/venues/` | `backend/core/views.py::VenueViewSet` | `VenueSerializer` | `IsAdminOrReadOnly` | Lists venues and nested areas; admin can manage venue records |
| `/api/public/venue-areas/` | `backend/core/views.py::VenueAreaViewSet` | `VenueAreaSerializer` | `IsAdminOrReadOnly` | Lists venue areas; admin can manage areas |
| `/api/public/news/` | `backend/core/views.py::PublicNewsArticleViewSet` | `NewsArticlePublicSerializer` | `AllowAny` | Read-only list/detail of `NewsArticle` rows with `status='published'`; lookup by slug |
| `/api/public/events/` | `backend/events/views.py::EventViewSet` | `EventSerializer` | `IsAdminOrReadOnly` | Public event catalog; admin can create/edit/archive event definitions |
| `/api/public/event-categories/` | `backend/events/views.py::EventCategoryViewSet` | `EventCategorySerializer` | `IsAdminOrReadOnly` | Public event category list; admin can manage categories |
| `/api/public/athletes/` | `backend/tournaments/views.py::AthleteViewSet` | `AthleteSerializer` | `IsAuthenticated` | Admin sees all athletes; department reps see only athletes from their `UserProfile.department` |
| `/api/public/tryout-applications/` | `backend/tournaments/views.py::TryoutApplicationViewSet` | `TryoutApplicationSerializer` | `TryoutApplicationPermission` | Admin sees verified applications; department reps see verified applications for their department; includes `convert` action |
| `/api/public/registrations/` | `backend/tournaments/views.py::EventRegistrationViewSet` | `EventRegistrationSerializer` | `IsAuthenticated` | Admin sees all event registrations; department reps see and submit only their department registrations |
| `/api/public/schedules/` | `backend/tournaments/views.py::EventScheduleViewSet` | `EventScheduleSerializer` | `IsAdminOrReadOnly` | Public schedule list/detail; admin can create/edit/delete schedule slots and venue assignments |
| `/api/public/match-results/` | `backend/tournaments/views.py::MatchResultViewSet` | `MatchResultSerializer` for reads, `MatchResultWriteSerializer` for writes | `IsAdminOrReadOnly` | Public match results; admin can create/update final match results; final results update medals and generate AI recap draft |
| `/api/public/podium-results/` | `backend/tournaments/views.py::PodiumResultViewSet` | `PodiumResultSerializer` | `IsAdminOrReadOnly` | Public rank-based/podium results; admin can finalize podium rows; final rows update medal ledger and generate recap draft |
| `/api/public/medal-records/` | `backend/tournaments/views.py::MedalRecordViewSet` | `MedalRecordSerializer` | `IsAdminOrReadOnly` | Public medal ledger list; admin can correct/delete medal records |
| `/api/public/medal-tally/` | `backend/tournaments/views.py::MedalTallyViewSet` | `MedalTallySerializer` | `AllowAny` | Read-only computed standings ordered by gold, silver, bronze, then department name |
| `/api/public/rooney-logs/` | `backend/rooney/views.py::RooneyQueryLogViewSet` | `RooneyQueryLogSerializer` | `IsAdminUser` | Admin-only monitoring table for public Rooney queries |

### `/api/admin/` DRF Router Routes

| Router Path | Backend Code | Serializer | Permission | What It Does |
| --- | --- | --- | --- | --- |
| `/api/admin/news/` | `backend/core/views.py::AdminNewsArticleViewSet` | `NewsArticleAdminSerializer` | `IsAdminUser` | Admin official content management for draft, review, published, and archived news |
| `/api/admin/ai-recaps/` | `backend/rooney/views.py::AIRecapViewSet` | `AIRecapSerializer` | `IsAdminUser` | Admin AI recap review desk: list, edit, approve, discard, and publish recap drafts |
| `/api/admin/ai-recaps/generate/` | `AIRecapViewSet.generate()` | `AIRecapGenerateSerializer` | `IsAdminUser` | Manually generates a recap draft from a finalized match result or schedule context |
| `/api/admin/ai-recaps/{id}/approve/` | `AIRecapViewSet.approve()` | `AIRecapSerializer` | `IsAdminUser` | Marks a generated recap as approved and records reviewer metadata |
| `/api/admin/ai-recaps/{id}/discard/` | `AIRecapViewSet.discard()` | `AIRecapSerializer` | `IsAdminUser` | Marks a recap as discarded and records reviewer metadata |
| `/api/admin/ai-recaps/{id}/publish/` | `AIRecapViewSet.publish()` | `publish_recap_to_news()` | `IsAdminUser` | Converts an approved/reviewed recap into official public `NewsArticle` content |

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
