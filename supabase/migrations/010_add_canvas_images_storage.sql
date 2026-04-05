-- Create storage bucket for canvas images
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-images', 'canvas-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images into their own folder
CREATE POLICY "Users can upload canvas images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'canvas-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (bucket is public)
CREATE POLICY "Public can view canvas images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'canvas-images');

-- Users can delete their own images
CREATE POLICY "Users can delete own canvas images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'canvas-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
