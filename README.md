# Bug Tracker App

Bug Tracker App is a full-stack bug reporting and management system built with:

- `React + Vite + TypeScript` on the frontend
- `FastAPI` on the backend
- `Expo + React Native` for Android mobile
- `Supabase` for auth, database, and storage
- `Docker Compose` for containerized production deployment
- `GitHub Actions` for automated CI/CD pipeline

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
├─ nginx/
│  └─ nginx.conf
├─ docker-compose.yml
├─ .github/workflows/
│  └─ deploy.yml
└─ README.md
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase project
- Docker & Docker Compose (for production deployment)

## Environment Variables

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON=your_supabase_anon_key
VITE_ADMIN_SECRET=supersecretvalue
```

### Backend (`backend/.env`)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=8000
ADMIN_SECRET=supersecretvalue

# Email configuration for Admin Support Ticket replies
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Important:
- Frontend and backend must point to the same Supabase project
- Frontend uses anon key
- Backend uses service role key

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

*Note: The `support_tickets` table must also be created for the Admin Support Portal to function.*

## Local Development Setup

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`. The Vite config proxies `/api` requests to the backend at `http://127.0.0.1:8000`.

### Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Production Deployment (Docker + EC2)

The application can be deployed using Docker Compose, which runs Nginx and FastAPI containers.

```bash
# Build sequentially on small instances (like t2.micro) to avoid OOM crashes
docker compose build backend
docker compose build nginx

# Start containers
docker compose up -d
```

### Continuous Deployment (CI/CD)

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys the latest code to your EC2 instance whenever code is pushed to `main`. 

To enable this, add the following Repository Secrets in GitHub (`Settings > Secrets and variables > Actions`):
- `EC2_HOST`: The Public IP address of your EC2 instance.
- `EC2_USERNAME`: Usually `ubuntu`.
- `EC2_SSH_KEY`: Your private SSH key (`.pem` file content).

## Admin Access & Features

Admin panel shows only when the logged-in user has a readable `public.profiles` row with role `admin` or `super_admin`.

To grant admin access manually via SQL:
```sql
update public.profiles
set role = 'super_admin'
where email = 'your-email@example.com';
```

### Admin Features
- View admin dashboard with live bug statistics
- Create teams and assign users
- **Admin Support Portal**: View all user support tickets, update their status, and send automated email replies directly via SMTP.

## Main Features

### User
- Submit bugs with duplicate detection (fingerprinting)
- Upload screenshots (stored in Supabase `bug-screenshots` bucket)
- Access team pages and view notifications
- Submit Support Tickets from the Help Center

### Performance & UI
- Responsive layout with dark and light mode.
- Optimized CSS (removed heavy backdrop filters and animations) for lag-free performance on all devices.
- Legal Pages (Privacy Policy, Terms of Service).

## Mobile Android App Setup

The repo includes an Expo-based Android app in `mobile/`.
Create `mobile/.env` from `mobile/.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```
*(Note: `10.0.2.2` maps the Android emulator to the host machine's localhost)*

```powershell
cd mobile
npm install
npm start
```
