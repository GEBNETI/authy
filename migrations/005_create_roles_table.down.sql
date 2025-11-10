-- Drop trigger
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;

-- Drop indexes
DROP INDEX IF EXISTS idx_roles_system;
DROP INDEX IF EXISTS idx_roles_name;
DROP INDEX IF EXISTS idx_roles_application;

-- Drop table
DROP TABLE IF EXISTS roles;
