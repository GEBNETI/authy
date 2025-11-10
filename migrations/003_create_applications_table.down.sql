-- Drop trigger
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;

-- Drop indexes
DROP INDEX IF EXISTS idx_applications_system;
DROP INDEX IF EXISTS idx_applications_name;

-- Drop table
DROP TABLE IF EXISTS applications;
