-- PROFILES (app users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_active_until TIMESTAMPTZ,
  dream_body_goal TEXT,
  daily_calorie_target INTEGER,
  daily_protein_target INTEGER,
  primary_goal TEXT,
  country_code TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.users FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  category TEXT NOT NULL DEFAULT 'Personal',
  is_priority BOOLEAN NOT NULL DEFAULT false,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_complete BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (user_id, habit_name, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit logs" ON public.habit_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.finance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  type TEXT NOT NULL DEFAULT 'expense',
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_records TO authenticated;
GRANT ALL ON public.finance_records TO service_role;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own finance" ON public.finance_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  estimated_monthly_income NUMERIC(14,2) NOT NULL,
  detected_from TEXT,
  confidence_score NUMERIC(4,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_records TO authenticated;
GRANT ALL ON public.income_records TO service_role;
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own income" ON public.income_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  bank_name TEXT,
  account_masked_number TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own banks" ON public.bank_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sleep_hours NUMERIC(4,1),
  workout_type TEXT,
  workout_duration INTEGER,
  log_type TEXT NOT NULL DEFAULT 'workout',
  source TEXT NOT NULL DEFAULT 'manual',
  position_played TEXT,
  minutes_played INTEGER,
  match_rating INTEGER,
  notes TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_logs TO authenticated;
GRANT ALL ON public.health_logs TO service_role;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health" ON public.health_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mood_rating INTEGER NOT NULL CHECK (mood_rating BETWEEN 1 AND 5),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_logs TO authenticated;
GRANT ALL ON public.mood_logs TO service_role;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mood" ON public.mood_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  plan_conflict TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_logs TO authenticated;
GRANT ALL ON public.nutrition_logs TO service_role;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition" ON public.nutrition_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calorie_target INTEGER NOT NULL,
  protein_target INTEGER NOT NULL,
  carbs_target INTEGER NOT NULL,
  fat_target INTEGER NOT NULL,
  guidelines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_plans TO authenticated;
GRANT ALL ON public.diet_plans TO service_role;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diet plans" ON public.diet_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.fitness_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weekly_plan_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_plans TO authenticated;
GRANT ALL ON public.fitness_plans TO service_role;
ALTER TABLE public.fitness_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fitness plans" ON public.fitness_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.meal_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nutrition_log_id UUID REFERENCES public.nutrition_logs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_photos TO authenticated;
GRANT ALL ON public.meal_photos TO service_role;
ALTER TABLE public.meal_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal photos" ON public.meal_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.school_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  gpa TEXT,
  test_scores TEXT,
  extracurriculars TEXT,
  intended_major TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_profiles TO authenticated;
GRANT ALL ON public.school_profiles TO service_role;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own school profile" ON public.school_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.target_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  school_name TEXT NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'researching',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_schools TO authenticated;
GRANT ALL ON public.target_schools TO service_role;
ALTER TABLE public.target_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schools" ON public.target_schools FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.school_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.target_schools(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_checklist TO authenticated;
GRANT ALL ON public.school_checklist TO service_role;
ALTER TABLE public.school_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checklist" ON public.school_checklist FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.target_schools s WHERE s.id = school_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.target_schools s WHERE s.id = school_id AND s.user_id = auth.uid()));

CREATE TABLE public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  model_used TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  context_enabled BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'ai_hub',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_logs TO authenticated;
GRANT ALL ON public.ai_chat_logs TO service_role;
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat logs" ON public.ai_chat_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.personal_intel_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reflection_answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  week_date DATE NOT NULL DEFAULT CURRENT_DATE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_intel_data TO authenticated;
GRANT ALL ON public.personal_intel_data TO service_role;
ALTER TABLE public.personal_intel_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own intel" ON public.personal_intel_data FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, country_code)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'country_code')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_tasks_user ON public.tasks(user_id, due_date);
CREATE INDEX idx_finance_user_date ON public.finance_records(user_id, date);
CREATE INDEX idx_nutrition_user ON public.nutrition_logs(user_id, logged_at);
CREATE INDEX idx_health_user ON public.health_logs(user_id, log_date);