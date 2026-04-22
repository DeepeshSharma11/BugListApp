ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
CREATE POLICY "Authenticated users can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can create teams" ON public.teams;
CREATE POLICY "Admins can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update teams" ON public.teams;
CREATE POLICY "Admins can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

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
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = submitted_by
  OR public.is_admin()
);

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
