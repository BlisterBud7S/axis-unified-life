GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (email, full_name, dream_body_goal, daily_calorie_target, daily_protein_target, primary_goal, country_code) ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;