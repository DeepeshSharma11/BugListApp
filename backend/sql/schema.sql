-- Executable Supabase / PostgreSQL schema for Bug Tracker
-- Safe to re-run: uses IF NOT EXISTS, ON CONFLICT, and DROP ... IF EXISTS where needed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE public.role_enum AS ENUM ('super_admin', 'admin', 'member');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_enum') THEN
    CREATE TYPE public.severity_enum AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN
    CREATE TYPE public.status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_enum') THEN
    CREATE TYPE public.priority_enum AS ENUM ('urgent', 'high', 'normal', 'low');
  END IF;
END $$;

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE,
  role public.role_enum NOT NULL DEFAULT 'member',
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bugs
CREATE TABLE IF NOT EXISTS public.bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  severity public.severity_enum NOT NULL DEFAULT 'medium',
  status public.status_enum NOT NULL DEFAULT 'open',
  priority public.priority_enum NOT NULL DEFAULT 'normal',
  environment text,
  version text,
  screenshot_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  duplicate_of uuid REFERENCES public.bugs(id) ON DELETE SET NULL,
  is_duplicate boolean NOT NULL DEFAULT false,
  fingerprint text UNIQUE,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bug comments
CREATE TABLE IF NOT EXISTS public.bug_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid REFERENCES public.bugs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bug activity log
CREATE TABLE IF NOT EXISTS public.bug_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid REFERENCES public.bugs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_bugs_fingerprint ON public.bugs (fingerprint);
CREATE INDEX IF NOT EXISTS idx_bugs_team_id ON public.bugs (team_id);
CREATE INDEX IF NOT EXISTS idx_bugs_submitted_by ON public.bugs (submitted_by);
CREATE INDEX IF NOT EXISTS idx_bug_comments_bug_id ON public.bug_comments (bug_id);
CREATE INDEX IF NOT EXISTS idx_bug_activity_log_bug_id ON public.bug_activity_log (bug_id);

-- Keep bugs.updated_at fresh on every update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bugs_updated_at ON public.bugs;
CREATE TRIGGER set_bugs_updated_at
  BEFORE UPDATE ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'member'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Bugs policies
DROP POLICY IF EXISTS "Authenticated users can view bugs" ON public.bugs;
CREATE POLICY "Authenticated users can view bugs"
ON public.bugs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create bugs" ON public.bugs;
CREATE POLICY "Authenticated users can create bugs"
ON public.bugs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Users can update their bugs or admins can update all bugs" ON public.bugs;
CREATE POLICY "Users can update their bugs or admins can update all bugs"
ON public.bugs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = submitted_by
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  auth.uid() = submitted_by
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
  )
);

-- Bug comments policies
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.bug_comments;
CREATE POLICY "Authenticated users can view comments"
ON public.bug_comments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.bug_comments;
CREATE POLICY "Authenticated users can add comments"
ON public.bug_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Bug activity log policies
DROP POLICY IF EXISTS "Authenticated users can view activity log" ON public.bug_activity_log;
CREATE POLICY "Authenticated users can view activity log"
ON public.bug_activity_log
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON public.bug_activity_log;
CREATE POLICY "Authenticated users can insert activity log"
ON public.bug_activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bug-screenshots');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.role() = 'authenticated');
