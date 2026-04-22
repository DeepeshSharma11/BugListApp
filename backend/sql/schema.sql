-- Supabase / PostgreSQL schema for Bug Tracker

-- Enums
CREATE TYPE role_enum AS ENUM ('super_admin','admin','member');
CREATE TYPE severity_enum AS ENUM ('critical','high','medium','low');
CREATE TYPE status_enum AS ENUM ('open','in_progress','resolved','closed','rejected');
CREATE TYPE priority_enum AS ENUM ('urgent','high','normal','low');

-- teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE,
  role role_enum NOT NULL DEFAULT 'member',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- bugs
CREATE TABLE IF NOT EXISTS bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  severity severity_enum NOT NULL DEFAULT 'medium',
  status status_enum NOT NULL DEFAULT 'open',
  priority priority_enum NOT NULL DEFAULT 'normal',
  environment text,
  version text,
  screenshot_urls text[] DEFAULT ARRAY[]::text[],
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  duplicate_of uuid REFERENCES bugs(id) ON DELETE SET NULL,
  is_duplicate boolean DEFAULT false,
  fingerprint text UNIQUE,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- comments
CREATE TABLE IF NOT EXISTS bug_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid REFERENCES bugs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text,
  created_at timestamptz DEFAULT now()
);

-- activity log
CREATE TABLE IF NOT EXISTS bug_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid REFERENCES bugs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- Index on fingerprint for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_bugs_fingerprint ON bugs(fingerprint);

-- Storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'bug-screenshots');

CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.role() = 'authenticated');

-- Create a trigger to automatically create a profile for every new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'member' -- default role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
