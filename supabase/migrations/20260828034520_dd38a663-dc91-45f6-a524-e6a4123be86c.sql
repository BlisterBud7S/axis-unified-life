-- Signed-out visitors need no access to profiles at all.
REVOKE ALL ON TABLE public.users FROM anon;

-- Signed-in users: no table-wide write access; only safe profile columns.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.users FROM authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (full_name, email, country_code, primary_goal, dream_body_goal, daily_calorie_target, daily_protein_target)
  ON TABLE public.users TO authenticated;

GRANT ALL ON TABLE public.users TO service_role;

-- Belt and braces: the billing guard trigger must be enabled.
ALTER TABLE public.users ENABLE TRIGGER protect_billing_columns_trg;
