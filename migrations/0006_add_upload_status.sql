-- Add upload_status column to track file upload progress
ALTER TABLE files ADD COLUMN upload_status TEXT DEFAULT 'pending';

-- Create index for efficient querying
CREATE INDEX idx_files_upload_status ON files(upload_status);