-- Composite index for leaderboard query performance
CREATE INDEX IF NOT EXISTS idx_bugs_team_assigned_status
  ON public.bugs (team_id, assigned_to, status);

-- Leaderboard function: returns per-member resolved/assigned/submitted counts for a team
CREATE OR REPLACE FUNCTION public.get_team_leaderboard(p_team_id uuid)
RETURNS TABLE (
  user_id      uuid,
  full_name    text,
  avatar_url   text,
  email        text,
  resolved_count   bigint,
  total_assigned   bigint,
  submitted_count  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id                                                                    AS user_id,
    p.full_name,
    p.avatar_url,
    p.email,
    COUNT(CASE WHEN b.status IN ('resolved', 'closed') THEN 1 END)         AS resolved_count,
    COUNT(b.id)                                                             AS total_assigned,
    (SELECT COUNT(*)
       FROM public.bugs s
      WHERE s.submitted_by = p.id
        AND s.team_id = p_team_id)                                          AS submitted_count
  FROM public.profiles p
  LEFT JOIN public.bugs b
         ON b.assigned_to = p.id
        AND b.team_id = p_team_id
  WHERE p.team_id = p_team_id
  GROUP BY p.id, p.full_name, p.avatar_url, p.email
  ORDER BY resolved_count DESC, total_assigned DESC;
$$;
