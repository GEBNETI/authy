-- Insert application-scoped system permissions
INSERT INTO permissions (name, resource, action, description, category, is_system) VALUES
-- User Management (authy_ prefixed)
('authy_users:create', 'authy_users', 'create', 'Create new users in Authy', 'user_management', true),
('authy_users:read', 'authy_users', 'read', 'View user information in Authy', 'user_management', true),
('authy_users:update', 'authy_users', 'update', 'Update user information in Authy', 'user_management', true),
('authy_users:delete', 'authy_users', 'delete', 'Delete/deactivate users in Authy', 'user_management', true),
('authy_users:list', 'authy_users', 'list', 'List all users in Authy', 'user_management', true),

-- Role Management (authy_ prefixed)
('authy_roles:create', 'authy_roles', 'create', 'Create new roles in Authy', 'role_management', true),
('authy_roles:read', 'authy_roles', 'read', 'View role information in Authy', 'role_management', true),
('authy_roles:update', 'authy_roles', 'update', 'Update role information in Authy', 'role_management', true),
('authy_roles:delete', 'authy_roles', 'delete', 'Delete roles in Authy', 'role_management', true),
('authy_roles:list', 'authy_roles', 'list', 'List all roles in Authy', 'role_management', true),
('authy_roles:assign', 'authy_roles', 'assign', 'Assign roles to users in Authy', 'role_management', true),
('authy_roles:revoke', 'authy_roles', 'revoke', 'Revoke roles from users in Authy', 'role_management', true),

-- Permission Management (authy_ prefixed)
('authy_permissions:create', 'authy_permissions', 'create', 'Create new permissions in Authy', 'permission_management', true),
('authy_permissions:read', 'authy_permissions', 'read', 'View permission information in Authy', 'permission_management', true),
('authy_permissions:update', 'authy_permissions', 'update', 'Update permission information in Authy', 'permission_management', true),
('authy_permissions:delete', 'authy_permissions', 'delete', 'Delete permissions in Authy', 'permission_management', true),
('authy_permissions:list', 'authy_permissions', 'list', 'List all permissions in Authy', 'permission_management', true),
('authy_permissions:assign', 'authy_permissions', 'assign', 'Assign permissions to roles in Authy', 'permission_management', true),
('authy_permissions:revoke', 'authy_permissions', 'revoke', 'Revoke permissions from roles in Authy', 'permission_management', true),

-- Application Management (authy_ prefixed)
('authy_applications:create', 'authy_applications', 'create', 'Create new applications in Authy', 'application_management', true),
('authy_applications:read', 'authy_applications', 'read', 'View application information in Authy', 'application_management', true),
('authy_applications:update', 'authy_applications', 'update', 'Update application information in Authy', 'application_management', true),
('authy_applications:delete', 'authy_applications', 'delete', 'Delete applications in Authy', 'application_management', true),
('authy_applications:list', 'authy_applications', 'list', 'List all applications in Authy', 'application_management', true),

-- System Administration (authy_ prefixed)
('authy_system:admin', 'authy_system', 'admin', 'Full system administration access in Authy', 'system', true),
('authy_system:audit', 'authy_system', 'audit', 'View audit logs and system monitoring in Authy', 'system', true),
('authy_system:config', 'authy_system', 'config', 'Modify system configuration in Authy', 'system', true),

-- Analytics permissions
('authy_analytics:read', 'authy_analytics', 'read', 'View analytics and reports in Authy', 'system', true);
