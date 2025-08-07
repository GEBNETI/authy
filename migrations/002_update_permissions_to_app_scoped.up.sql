-- ==========================================
-- Migration: Update Permissions to Application-Scoped
-- ==========================================
-- This migration updates existing permissions to use 
-- application-scoped naming (authy_ prefix)
-- ==========================================

\echo 'Starting migration: Update permissions to application-scoped format...';

-- Add is_system column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_system'
    ) THEN
        ALTER TABLE users ADD COLUMN is_system BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_users_system ON users(is_system);
    END IF;
END $$;

-- Add is_system column to roles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'is_system'
    ) THEN
        ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system);
    END IF;
END $$;

-- Create permissions table if it doesn't exist (from old schema)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) DEFAULT 'general',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for permissions table if they don't exist
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_system ON permissions(is_system);

-- Create role_permissions table if it doesn't exist (from old schema) 
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- Create indexes for role_permissions table if they don't exist
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Update existing permissions to application-scoped format
\echo 'Updating existing permissions to application-scoped format...';

-- Update user management permissions
UPDATE permissions SET 
    name = 'authy_users:' || action,
    resource = 'authy_users',
    description = description || ' in Authy'
WHERE resource = 'users' AND NOT resource LIKE 'authy_%';

-- Update role management permissions  
UPDATE permissions SET 
    name = 'authy_roles:' || action,
    resource = 'authy_roles',
    description = description || ' in Authy'
WHERE resource = 'roles' AND NOT resource LIKE 'authy_%';

-- Update permission management permissions
UPDATE permissions SET 
    name = 'authy_permissions:' || action,
    resource = 'authy_permissions', 
    description = description || ' in Authy'
WHERE resource = 'permissions' AND NOT resource LIKE 'authy_%';

-- Update application management permissions
UPDATE permissions SET 
    name = 'authy_applications:' || action,
    resource = 'authy_applications',
    description = description || ' in Authy'
WHERE resource = 'applications' AND NOT resource LIKE 'authy_%';

-- Update system administration permissions
UPDATE permissions SET 
    name = 'authy_system:' || action,
    resource = 'authy_system',
    description = description || ' in Authy'
WHERE resource = 'system' AND NOT resource LIKE 'authy_%';

-- Insert new application-scoped permissions that might be missing
\echo 'Inserting missing application-scoped permissions...';

INSERT INTO permissions (name, resource, action, description, category, is_system) VALUES
-- User Management
('authy_users:create', 'authy_users', 'create', 'Create new users in Authy', 'user_management', true),
('authy_users:read', 'authy_users', 'read', 'View user information in Authy', 'user_management', true),
('authy_users:update', 'authy_users', 'update', 'Update user information in Authy', 'user_management', true),
('authy_users:delete', 'authy_users', 'delete', 'Delete/deactivate users in Authy', 'user_management', true),
('authy_users:list', 'authy_users', 'list', 'List all users in Authy', 'user_management', true),

-- Role Management
('authy_roles:create', 'authy_roles', 'create', 'Create new roles in Authy', 'role_management', true),
('authy_roles:read', 'authy_roles', 'read', 'View role information in Authy', 'role_management', true),
('authy_roles:update', 'authy_roles', 'update', 'Update role information in Authy', 'role_management', true),
('authy_roles:delete', 'authy_roles', 'delete', 'Delete roles in Authy', 'role_management', true),
('authy_roles:list', 'authy_roles', 'list', 'List all roles in Authy', 'role_management', true),
('authy_roles:assign', 'authy_roles', 'assign', 'Assign roles to users in Authy', 'role_management', true),
('authy_roles:revoke', 'authy_roles', 'revoke', 'Revoke roles from users in Authy', 'role_management', true),

-- Permission Management  
('authy_permissions:create', 'authy_permissions', 'create', 'Create new permissions in Authy', 'permission_management', true),
('authy_permissions:read', 'authy_permissions', 'read', 'View permission information in Authy', 'permission_management', true),
('authy_permissions:update', 'authy_permissions', 'update', 'Update permission information in Authy', 'permission_management', true),
('authy_permissions:delete', 'authy_permissions', 'delete', 'Delete permissions in Authy', 'permission_management', true),
('authy_permissions:list', 'authy_permissions', 'list', 'List all permissions in Authy', 'permission_management', true),
('authy_permissions:assign', 'authy_permissions', 'assign', 'Assign permissions to roles in Authy', 'permission_management', true),
('authy_permissions:revoke', 'authy_permissions', 'revoke', 'Revoke permissions from roles in Authy', 'permission_management', true),

-- Application Management
('authy_applications:create', 'authy_applications', 'create', 'Create new applications in Authy', 'application_management', true),
('authy_applications:read', 'authy_applications', 'read', 'View application information in Authy', 'application_management', true), 
('authy_applications:update', 'authy_applications', 'update', 'Update application information in Authy', 'application_management', true),
('authy_applications:delete', 'authy_applications', 'delete', 'Delete applications in Authy', 'application_management', true),
('authy_applications:list', 'authy_applications', 'list', 'List all applications in Authy', 'application_management', true),

-- System Administration
('authy_system:admin', 'authy_system', 'admin', 'Full system administration access in Authy', 'system', true),
('authy_system:audit', 'authy_system', 'audit', 'View audit logs and system monitoring in Authy', 'system', true),
('authy_system:config', 'authy_system', 'config', 'Modify system configuration in Authy', 'system', true),

-- Analytics
('authy_analytics:read', 'authy_analytics', 'read', 'View analytics and reports in Authy', 'system', true)

ON CONFLICT (name) DO NOTHING; -- Don't overwrite existing permissions

-- Show updated permissions count
\echo 'Migration completed. Current application-scoped permissions:';
SELECT 
    category,
    COUNT(*) as permission_count
FROM permissions 
WHERE resource LIKE 'authy_%' AND is_system = true
GROUP BY category
ORDER BY category;