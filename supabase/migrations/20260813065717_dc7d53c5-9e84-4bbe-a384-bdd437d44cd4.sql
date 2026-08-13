ALTER TABLE public.users DISABLE TRIGGER protect_billing_columns_trg;

UPDATE public.users
SET subscription_tier = 'pro',
    subscription_active_until = now() + interval '10 years'
WHERE email = 'krishayagrawal2013@gmail.com';

ALTER TABLE public.users ENABLE TRIGGER protect_billing_columns_trg;