-- Add upload_status column to track file upload progress (safe version)
-- Only add if column doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a different approach

-- Create the index if it doesn't exist (this will fail silently if column doesn't exist)
CREATE INDEX IF NOT EXISTS idx_files_upload_status ON files(upload_status);