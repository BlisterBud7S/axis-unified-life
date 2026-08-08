-- 1) Prevent self-upgrade: billing columns on public.users are service-role only
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), current_setting('role', true)) IS DISTINCT FROM 'service_role'
     AND coalesce((current_setting('request.jwt.claims', true)::json ->> 'role'), '') IS DISTINCT FROM 'service_role' THEN
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_active_until := OLD.subscription_active_until;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_billing_columns_trg ON public.users;
CREATE TRIGGER protect_billing_columns_trg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();

-- 2) subscriptions: owner may read only; writes are service-role only
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

DROP POLICY IF EXISTS "No client inserts on subscriptions" ON public.subscriptions;
CREATE POLICY "No client inserts on subscriptions"
ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on subscriptions" ON public.subscriptions;
CREATE POLICY "No client updates on subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on subscriptions" ON public.subscriptions;
CREATE POLICY "No client deletes on subscriptions"
ON public.subscriptions FOR DELETE TO authenticated USING (false);

-- 3) meal-photos storage: explicit owner-scoped UPDATE policy
DROP POLICY IF EXISTS "meal photos own update" ON storage.objects;
CREATE POLICY "meal photos own update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'meal-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'meal-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);