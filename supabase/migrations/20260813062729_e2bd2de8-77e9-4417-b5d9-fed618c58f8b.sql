GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (email, full_name, country_code, primary_goal, dream_body_goal, daily_calorie_target, daily_protein_target) ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;