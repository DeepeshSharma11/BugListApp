CREATE UNIQUE INDEX IF NOT EXISTS idx_bugs_fingerprint ON public.bugs (fingerprint);
CREATE INDEX IF NOT EXISTS idx_bugs_team_id ON public.bugs (team_id);
CREATE INDEX IF NOT EXISTS idx_bugs_submitted_by ON public.bugs (submitted_by);
CREATE INDEX IF NOT EXISTS idx_bug_comments_bug_id ON public.bug_comments (bug_id);
CREATE INDEX IF NOT EXISTS idx_bug_activity_log_bug_id ON public.bug_activity_log (bug_id);
