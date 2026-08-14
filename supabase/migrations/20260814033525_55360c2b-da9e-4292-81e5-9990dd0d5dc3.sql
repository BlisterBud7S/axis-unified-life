CREATE POLICY "ai_media_read_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ai-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "ai_media_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ai-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "ai_media_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ai-media' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'ai-media' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "ai_media_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ai-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE TABLE public.ai_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  prompt TEXT NOT NULL,
  engine TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  storage_path TEXT,
  job_id TEXT,
  aspect TEXT,
  seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_media TO authenticated;
GRANT ALL ON public.ai_media TO service_role;
ALTER TABLE public.ai_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_media_own" ON public.ai_media FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_media_user_created_idx ON public.ai_media (user_id, created_at DESC);