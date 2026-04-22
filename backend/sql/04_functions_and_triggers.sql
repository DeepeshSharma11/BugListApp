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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_recipient_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  )
  VALUES (
    p_recipient_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_on_bug_created()
RETURNS trigger AS $$
DECLARE
  admin_user record;
BEGIN
  FOR admin_user IN
    SELECT id
    FROM public.profiles
    WHERE role IN ('admin', 'super_admin')
      AND id IS DISTINCT FROM NEW.submitted_by
  LOOP
    PERFORM public.create_notification(
      admin_user.id,
      'bug_created',
      'New bug submitted',
      COALESCE(NEW.title, 'A new bug') || ' was submitted and needs review.',
      'bug',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS notify_bug_created ON public.bugs;
CREATE TRIGGER notify_bug_created
  AFTER INSERT ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_bug_created();

CREATE OR REPLACE FUNCTION public.notify_on_bug_updated()
RETURNS trigger AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.assigned_to,
      'bug_assigned',
      'Bug assigned to you',
      COALESCE(NEW.title, 'A bug') || ' has been assigned to you.',
      'bug',
      NEW.id
    );
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.submitted_by IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.submitted_by,
        'bug_status_changed',
        'Bug status updated',
        COALESCE(NEW.title, 'A bug') || ' is now ' || REPLACE(NEW.status::text, '_', ' ') || '.',
        'bug',
        NEW.id
      );
    END IF;

    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.submitted_by THEN
      PERFORM public.create_notification(
        NEW.assigned_to,
        'bug_status_changed',
        'Assigned bug status updated',
        COALESCE(NEW.title, 'A bug') || ' is now ' || REPLACE(NEW.status::text, '_', ' ') || '.',
        'bug',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS notify_bug_updated ON public.bugs;
CREATE TRIGGER notify_bug_updated
  AFTER UPDATE ON public.bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_bug_updated();

CREATE OR REPLACE FUNCTION public.notify_on_comment_created()
RETURNS trigger AS $$
DECLARE
  bug_row record;
BEGIN
  SELECT id, title, submitted_by, assigned_to
  INTO bug_row
  FROM public.bugs
  WHERE id = NEW.bug_id;

  IF bug_row.submitted_by IS NOT NULL AND bug_row.submitted_by IS DISTINCT FROM NEW.author_id THEN
    PERFORM public.create_notification(
      bug_row.submitted_by,
      'comment_added',
      'New comment on your bug',
      'A new comment was added on ' || COALESCE(bug_row.title, 'your bug') || '.',
      'bug',
      bug_row.id
    );
  END IF;

  IF bug_row.assigned_to IS NOT NULL
     AND bug_row.assigned_to IS DISTINCT FROM NEW.author_id
     AND bug_row.assigned_to IS DISTINCT FROM bug_row.submitted_by THEN
    PERFORM public.create_notification(
      bug_row.assigned_to,
      'comment_added',
      'New comment on assigned bug',
      'A new comment was added on ' || COALESCE(bug_row.title, 'an assigned bug') || '.',
      'bug',
      bug_row.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS notify_comment_created ON public.bug_comments;
CREATE TRIGGER notify_comment_created
  AFTER INSERT ON public.bug_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_created();

CREATE OR REPLACE FUNCTION public.notify_on_profile_updated()
RETURNS trigger AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    PERFORM public.create_notification(
      NEW.id,
      'team_assigned',
      'Team assignment updated',
      CASE
        WHEN NEW.team_id IS NULL THEN 'You were removed from your team.'
        ELSE 'Your team assignment was updated.'
      END,
      'team',
      NEW.team_id
    );
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.create_notification(
      NEW.id,
      'role_changed',
      'Role updated',
      'Your role is now ' || REPLACE(NEW.role::text, '_', ' ') || '.',
      'profile',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS notify_profile_updated ON public.profiles;
CREATE TRIGGER notify_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_profile_updated();
