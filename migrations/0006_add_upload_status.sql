-- Add upload_status column to track file upload progress
-- This migration handles cases where column might already exist

-- Create index for upload_status (will succeed whether column exists or not)
CREATE INDEX IF NOT EXISTS idx_files_upload_status ON files(upload_status);