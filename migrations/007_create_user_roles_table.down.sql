-- Drop indexes
DROP INDEX IF EXISTS idx_user_roles_application;
DROP INDEX IF EXISTS idx_user_roles_role;
DROP INDEX IF EXISTS idx_user_roles_user;

-- Drop table
DROP TABLE IF EXISTS user_roles;
