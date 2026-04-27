# Enverga Arena

Official Intramurals Registration, Results, and Medal Tally System for Manuel S. Enverga University Foundation (MSEUF). Features an AI-powered FAQ assistant (Rooney) grounded in live tournament data.

## Features

- **Public Dashboard**: View live schedules, match/podium results, medal tally, and leaderboard.
- **Rooney AI**: Gemini-powered FAQ assistant. Answers questions strictly using live database context. Refuses hallucinations or off-topic queries.
- **Role-Based Portals**:
  - **Admin**: Manage events, schedules, venues, approve registrations, verify results, and monitor AI logs.
  - **Department Rep**: Manage athlete masterlists, submit event registrations, and track approval status.
- **Dynamic Event Modeling**: Supports both `match_based` (e.g., Basketball, Esports) and `rank_based` (e.g., Swimming, Dancesport) result families.
- **Immutable Audit Trail**: Medal records are ledger-based to prevent silent overwrites.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, DaisyUI, React Query, React Router
- **Backend**: Django 6, Django REST Framework, SQLite (dev) / PostgreSQL (prod)
- **AI**: Google GenAI SDK (`gemini-flash-latest`)

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
