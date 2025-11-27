-- Helper: is_admin() based on email only (no app_metadata role usage)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  u RECORD;
BEGIN
  SELECT id, email INTO u FROM auth.users WHERE id = uid;
  IF u IS NULL THEN
    RETURN FALSE;
  END IF;

  IF (lower(u.email) IN ('chris@gokapital.com','deals@gokapital.com','info@gokapital.com')) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;