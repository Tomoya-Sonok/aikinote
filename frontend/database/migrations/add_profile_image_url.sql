-- Add profile_image_url column to User table
-- This migration adds support for user profile images stored in AWS S3

-- Add the profile_image_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'User'
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE "User" ADD COLUMN profile_image_url TEXT;
    END IF;
END $$;

-- Add comment to the column for documentation
COMMENT ON COLUMN "User".profile_image_url IS 'URL of the user profile image stored in AWS S3';

-- Create an index on profile_image_url for efficient queries (optional)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_image_url
ON "User" (profile_image_url)
WHERE profile_image_url IS NOT NULL;

-- Update the updated_at trigger to include the new column (if you have one)
-- This ensures the updated_at timestamp is updated when profile_image_url changes