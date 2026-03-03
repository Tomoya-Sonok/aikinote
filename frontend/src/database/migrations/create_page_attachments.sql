-- Create page_attachments table for storing media attachments on training pages
-- This migration adds support for images, videos, and YouTube links attached to pages

-- Create the page_attachments table
CREATE TABLE IF NOT EXISTS page_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES "TrainingPage"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "User"(id),
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'youtube')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT,
  file_size_bytes BIGINT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE page_attachments IS 'Media attachments (images, videos, YouTube links) for training pages';
COMMENT ON COLUMN page_attachments.type IS 'Attachment type: image, video, or youtube';
COMMENT ON COLUMN page_attachments.url IS 'CloudFront URL for uploaded files, or YouTube URL for youtube type';
COMMENT ON COLUMN page_attachments.thumbnail_url IS 'Optional thumbnail URL (used for YouTube videos)';
COMMENT ON COLUMN page_attachments.original_filename IS 'Original filename of uploaded file';
COMMENT ON COLUMN page_attachments.file_size_bytes IS 'File size in bytes for uploaded files';
COMMENT ON COLUMN page_attachments.sort_order IS 'Display order of attachments within a page';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_page_attachments_page_id ON page_attachments(page_id);
CREATE INDEX IF NOT EXISTS idx_page_attachments_user_id ON page_attachments(user_id);

-- Enable Row Level Security
ALTER TABLE page_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own attachments
CREATE POLICY "Users can view own attachments" ON page_attachments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments" ON page_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments" ON page_attachments
  FOR DELETE USING (auth.uid() = user_id);
