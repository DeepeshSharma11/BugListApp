Backend (FastAPI) for Bug Tracker

Setup

1. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role key required for server operations).
2. Create Python environment and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

3. Apply the SQL schema in `sql/schema.sql` to your Supabase/Postgres instance (run via psql or Supabase SQL editor).

Run

```bash
uvicorn app.main:app --reload --port 8000
```

Notes

- The server enforces duplicate detection by fingerprint before inserting a bug (returns HTTP 409).
- Screenshot uploads are validated server-side and uploaded to the `bug-screenshots` bucket.
