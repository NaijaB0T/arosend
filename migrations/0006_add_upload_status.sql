-- Add upload_status column to track file upload progress
ALTER TABLE files ADD COLUMN upload_status TEXT DEFAULT 'pending' NOT NULL;

-- Create an index on the new column for faster queries
CREATE INDEX IF NOT EXISTS idx_files_upload_status ON files(upload_status);