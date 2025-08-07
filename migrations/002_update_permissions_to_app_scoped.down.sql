-- ==========================================
-- Migration Rollback: Revert Application-Scoped Permissions
-- ==========================================
-- This rollback reverts permissions back to non-prefixed format
-- WARNING: This should only be used in development
-- ==========================================

\echo 'Starting rollback: Reverting application-scoped permissions...';

-- Revert user management permissions
UPDATE permissions SET 
    name = REPLACE(name, 'authy_users:', 'users:'),
    resource = 'users',
    description = REPLACE(description, ' in Authy', '')
WHERE resource = 'authy_users';

-- Revert role management permissions  
UPDATE permissions SET 
    name = REPLACE(name, 'authy_roles:', 'roles:'),
    resource = 'roles',
    description = REPLACE(description, ' in Authy', '')
WHERE resource = 'authy_roles';

-- Revert permission management permissions
UPDATE permissions SET 
    name = REPLACE(name, 'authy_permissions:', 'permissions:'),
    resource = 'permissions',
    description = REPLACE(description, ' in Authy', '')
WHERE resource = 'authy_permissions';

-- Revert application management permissions
UPDATE permissions SET 
    name = REPLACE(name, 'authy_applications:', 'applications:'),
    resource = 'applications',
    description = REPLACE(description, ' in Authy', '')
WHERE resource = 'authy_applications';

-- Revert system administration permissions
UPDATE permissions SET 
    name = REPLACE(name, 'authy_system:', 'system:'),
    resource = 'system',
    description = REPLACE(description, ' in Authy', '')
WHERE resource = 'authy_system';

-- Remove analytics permissions (they're new)
DELETE FROM permissions WHERE resource = 'authy_analytics';

\echo 'Rollback completed. Permissions reverted to non-prefixed format.';