-- Remove admin user and Super Administrator role
DO $$
DECLARE
    admin_user_id UUID;
    super_admin_role_id UUID;
BEGIN
    -- Get admin user and role IDs
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@authy.dev';
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Super Administrator';

    -- Delete user_roles
    DELETE FROM user_roles WHERE user_id = admin_user_id;

    -- Delete role_permissions (will cascade from role deletion, but explicit for clarity)
    DELETE FROM role_permissions WHERE role_id = super_admin_role_id;

    -- Delete role
    DELETE FROM roles WHERE id = super_admin_role_id;

    -- Delete admin user
    DELETE FROM users WHERE id = admin_user_id;
END $$;
