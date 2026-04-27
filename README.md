# Enverga Arena

Official Intramurals Registration, Results, and Medal Tally System for Manuel S. Enverga University Foundation (MSEUF). Features an AI-powered FAQ assistant (Rooney) grounded in live tournament data.

## Features

- **Public Dashboard**: View live schedules, match/podium results, medal tally, and leaderboard.
- **Rooney AI**: Gemini-powered FAQ assistant. Answers questions strictly using live database context. Refuses hallucinations or off-topic queries.
- **Role-Based Portals**:
  - **Admin**: Manage events, schedules, venues, approve registrations, verify results, and monitor AI logs.
  - **Department Rep**: Manage athlete masterlists, submit event registrations, and track approval status.
- **Dynamic Event Modeling**: Supports both `match_based` (e.g., Basketball, Esports) and `rank_based` (e.g., Swimming, Dancesport) result families.
- **Medal-Priority Ranking**: Departments rank by gold medals first, then silver, then bronze; points use the configurable demo default of Gold=5, Silver=3, Bronze=1.
- **Immutable Audit Trail**: Medal records are ledger-based to prevent silent overwrites.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, DaisyUI, React Query, React Router
- **Backend**: Django 6, Django REST Framework, SQLite (dev) / PostgreSQL (prod)
- **AI**: Google GenAI SDK (`gemini-2.5-flash-lite`)

---

## Local Setup Guide

### 1. Backend Setup (Django)

1. Create and activate a Python virtual environment at the project root:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   # .venv\Scripts\activate   # Windows
   ```
2. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Configure environment variables inside the `backend/` folder:
   - Copy `backend/.env.example` to `backend/.env`.
   - Add your Gemini API key:
     ```env
     SECRET_KEY=your_secret_key
     DEBUG=True
     GEMINI_API_KEY=your_actual_gemini_key_here
     ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Seed realistic test data (creates departments, venues, events, schedules, and synthetic results):
   ```bash
   python manage.py seed_data
   ```
   Demo logins created by the seed:
   - Admin / Sports Coordinator: `admin` / `demo1234`
   - Department reps: `cafa_rep`, `cas_rep`, `cba_rep`, `ccms_rep`, `ccjc_rep`, `ced_rep`, `ceng_rep`, `cihtm_rep`, `cme_rep`, `cnahs_rep`
   - All department rep passwords: `demo1234`
   - Public viewer: no account required
   - Student-athletes: no direct login in v1; they are participant records managed by department reps or admins.

   Registration demo flow:
   1. Log in as a department rep, for example `ced_rep` / `demo1234`.
   2. Open the dashboard, choose an event, select eligible athletes from that department, and submit the registration.
   3. Log in as `admin` / `demo1234` to approve, reject, or request revision.
   4. Log back in as the department rep to show the updated registration status.

   Seeded event coverage:
   - Confirmed v1 competition scope: Basketball, Volleyball, Badminton, Table Tennis, Tennis, Pickleball, Swimming, Dancesport, and title-configurable E-Sports.
   - Configurable future options: Athletics track/field, Taekwondo Kyorugi, Taekwondo Poomsae/Karatedo, Solo Voice, Oratorical, Pageant, Hip-Hop/Street Dance, and Chess.
   - Future options are seeded as postponed/TBA instead of active medal events until OSCR confirms venues, divisions, and championship inclusion.
6. Create a superuser account (for Admin access):
   ```bash
   python manage.py createsuperuser
   ```
7. Start the backend development server:
   ```bash
   python manage.py runserver
   ```
   *API runs at http://localhost:8000*

### 2. Frontend Setup (React)

1. Open a new terminal, and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend runs at http://localhost:5173*

## API Endpoints Overview

- `GET /api/public/medal-tally/` - Live standings
- `GET /api/public/schedules/` - Tournament schedules
- `GET /api/public/results/` - Finalized match and podium results
- `POST /api/public/rooney/query/` - Rooney AI interface (Requires `{"question": "..."}`)
- `POST /api/auth/token/` - JWT Login

## License
Internal academic project.
