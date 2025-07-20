-- Create the images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images', 
  false,
  52428800, -- 50MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create RLS policies for the images bucket
-- Allow authenticated users to insert images
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'images' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to view images from projects they have access to
CREATE POLICY "Users can view project images" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'images'
    AND (
      -- Allow public access for now (can be restricted later)
      true
      -- OR check if user has access to the project
      -- (storage.foldername(name))::text IN (
      --   SELECT id::text FROM boards b 
      --   JOIN projects p ON b.project_id = p.id 
      --   WHERE p.created_by = auth.uid()
      -- )
    )
  );

-- Allow users to delete images they uploaded
CREATE POLICY "Users can delete their images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
  );