Frontend (Vite + React + TypeScript)

Setup

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON`.
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Run dev server:

```bash
npm run dev
```

Notes

- Uses Tailwind CSS for styling and soft gradients.
- `Submit` page includes drag-and-drop via `react-dropzone` and a debounced duplicate check against `/api/bugs/check`.
- Replace placeholder `submitted_by` and `team_id` during integration with real auth.
