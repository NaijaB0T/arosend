-- Add deletion_status column to files table
-- Values: 'active' (default), 'expired', 'deleted'
ALTER TABLE files ADD COLUMN deletion_status TEXT DEFAULT 'active';

-- Create index for efficient querying of deletion status
CREATE INDEX idx_files_deletion_status ON files(deletion_status);

-- Create composite index for common queries (transfer_id + deletion_status)
CREATE INDEX idx_files_transfer_deletion ON files(transfer_id, deletion_status);