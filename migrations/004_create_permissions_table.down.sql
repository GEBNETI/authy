-- Drop trigger
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;

-- Drop indexes
DROP INDEX IF EXISTS idx_permissions_system;
DROP INDEX IF EXISTS idx_permissions_category;
DROP INDEX IF EXISTS idx_permissions_action;
DROP INDEX IF EXISTS idx_permissions_resource;
DROP INDEX IF EXISTS idx_permissions_name;

-- Drop table
DROP TABLE IF EXISTS permissions;
