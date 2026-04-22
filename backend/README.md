## Backend

FastAPI backend for the Bug Tracker app.

### What It Does

- creates bugs through `/api/bugs/`
- checks duplicate bugs through `/api/bugs/check`
- updates screenshot URLs through `/api/bugs/{bug_id}/screenshots`
- uses Supabase with the service role key for server-side DB and storage work

### Requirements

- Python 3.10+
- a Supabase project
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Setup

1. Create the env file:

```powershell
Copy-Item .env.example .env
```

2. Update `.env` with your real Supabase values.

3. Create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

4. Install dependencies:

```powershell
pip install -r requirements.txt
```

### Run

Use this command so reload watcher does not scan the whole `venv`:

```powershell
uvicorn app.main:app --reload --reload-dir app --reload-exclude venv --port 8000
```

Backend will run at `http://127.0.0.1:8000`.

### Notes

- duplicate detection is fingerprint-based
- screenshots are validated before upload
- max file size is `5MB`
- max files per bug is `5`
- allowed image types are `png`, `jpeg`, `webp`, `gif`

### SQL Setup

SQL files now live in `backend/sql/` and are split by purpose.

Run them in this order inside Supabase SQL Editor:

1. `01_extensions_and_enums.sql`
2. `02_tables.sql`
3. `03_indexes.sql`
4. `04_functions_and_triggers.sql`
5. `05_backfill_profiles.sql`
6. `06_rls_and_policies.sql`
7. `07_storage.sql`

### Admin Role Reminder

If admin panel still does not show, confirm the current logged-in user has a row in `public.profiles` and the role is `admin` or `super_admin`.
