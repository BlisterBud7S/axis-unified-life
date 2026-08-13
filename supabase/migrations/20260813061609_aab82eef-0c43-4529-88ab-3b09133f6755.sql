CREATE OR REPLACE FUNCTION public.update_my_profile_name(new_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  clean_name text := btrim(new_full_name);
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF clean_name IS NULL OR clean_name = '' OR char_length(clean_name) > 120 THEN
    RAISE EXCEPTION 'Enter a valid name between 1 and 120 characters' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users
  SET full_name = clean_name
  WHERE id = caller_id;

  IF NOT FOUND THEN
    INSERT INTO public.users (id, email, full_name)
    SELECT id, email, clean_name
    FROM auth.users
    WHERE id = caller_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_my_profile_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile_name(text) TO authenticated, service_role;