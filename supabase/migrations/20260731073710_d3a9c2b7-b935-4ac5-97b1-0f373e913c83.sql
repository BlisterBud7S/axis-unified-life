CREATE POLICY "meal photos own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "meal photos own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "meal photos own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);