# Bug Tracker App

Bug Tracker App is a full-stack bug reporting system built with:

- `React + Vite + TypeScript` on the frontend
- `FastAPI` on the backend
- `Expo + React Native` for Android mobile
- `Supabase` for auth, database, and storage

It supports:

- signup/login with Supabase auth
- profile page with reset password action
- user and admin route protection
- admin dashboard with live bug stats
- team creation and user-to-team assignment
- bug submission with duplicate detection
- screenshot upload support
- light and dark mode
- mobile responsive layout

## Project Structure

```text
BugTaskApp/
├─ backend/
│  ├─ app/
│  ├─ sql/
│  ├─ .env
│  ├─ requirements.txt
│  └─ README.md
├─ frontend/
│  ├─ src/
│  ├─ .env
│  └─ package.json
├─ mobile/
│  ├─ src/
│  ├─ .env.example
│  └─ package.json
└─ README.md
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- a Supabase project

## Environment Variables

### Frontend

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON=your_supabase_anon_key
```

### Backend

Create `backend/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=8000
```

Important:

- frontend and backend must point to the same Supabase project
- frontend uses anon key
- backend uses service role key

## SQL Setup

SQL is split into small files in `backend/sql/`.

Run these in Supabase SQL Editor in this order:

1. `backend/sql/01_extensions_and_enums.sql`
2. `backend/sql/02_tables.sql`
3. `backend/sql/03_indexes.sql`
4. `backend/sql/04_functions_and_triggers.sql`
5. `backend/sql/05_backfill_profiles.sql`
6. `backend/sql/06_rls_and_policies.sql`
7. `backend/sql/07_storage.sql`

`backend/sql/schema.sql` is now only a guide file that shows the run order.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

The Vite config proxies `/api` requests to the backend at `http://127.0.0.1:8000`.

If you change `vite.config.ts`, restart the frontend dev server.

## Mobile Android App Setup

The repo now includes an Expo-based Android app in `mobile/`.

Create `mobile/.env` from `mobile/.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

Why `10.0.2.2`:

- Android emulator cannot use your computer's `localhost`
- `10.0.2.2` maps emulator -> host machine

Run the mobile app:

```powershell
cd mobile
npm install
npm start
```

Then open it in:

- Android Emulator
- Expo Go on Android

Current mobile features:

- Supabase login
- profile/dashboard summary
- submit bug through FastAPI backend
- notifications list from Supabase

## Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --reload-dir app --reload-exclude venv --port 8000
```

Backend runs at `http://127.0.0.1:8000`.

## Admin Access

Admin panel shows only when the logged-in user has a readable `public.profiles` row with role:

- `admin`
- `super_admin`

If needed, run:

```sql
select id, email, role
from public.profiles
order by created_at desc;
```

Then update the current user:

```sql
update public.profiles
set role = 'super_admin'
where email = 'your-email@example.com';
```

If old auth users existed before the trigger was added, run:

```sql
select * from public.profiles;
```

If the row is missing, run `backend/sql/05_backfill_profiles.sql`.

After role changes:

1. log out
2. log in again
3. refresh the page

## Main Features

### User

- submit bugs
- upload screenshots
- view profile
- reset password
- access team pages

### Admin

- view admin dashboard
- see bug statistics
- create teams
- open user selector modal
- assign users to teams
- view all users and team assignments

## Common Issues

### Admin panel not showing

Check:

- current logged-in email is the one you updated
- `public.profiles` has the correct role
- `04_functions_and_triggers.sql` and `06_rls_and_policies.sql` were re-run after policy changes
- frontend and backend use the same Supabase URL

### Bug submit says "Failed to create bug"

Check:

- backend is running on port `8000`
- frontend was restarted after Vite proxy change
- current user has a valid `team_id`
- backend `.env` is correct

### User selector modal not opening

Check:

- at least one team exists
- a team is selected in the dropdown
- profiles are readable by admin

If users are not loading, re-run:

- `backend/sql/04_functions_and_triggers.sql`
- `backend/sql/05_backfill_profiles.sql`
- `backend/sql/06_rls_and_policies.sql`

## Tech Notes

- frontend theme preference is stored in `localStorage`
- duplicate bug detection is fingerprint based
- backend screenshot validation is server-side
- storage bucket name is `bug-screenshots`

## Current Status

This repo currently includes active work on:

- role-based access
- team assignment
- admin workflow improvements
- responsive UI and dark mode
