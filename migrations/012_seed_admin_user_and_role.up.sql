-- Create admin user and Super Administrator role with all permissions
DO $$
DECLARE
    app_id UUID;
    admin_user_id UUID;
    super_admin_role_id UUID;
    perm_record RECORD;
BEGIN
    -- Get application ID
    SELECT id INTO app_id FROM applications WHERE name = 'AuthyBackoffice';

    -- Create admin user
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_system) VALUES (
        uuid_generate_v4(),
        'admin@authy.dev',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
        'System',
        'Administrator',
        true,
        true
    ) RETURNING id INTO admin_user_id;

    -- Create Super Admin role
    INSERT INTO roles (id, name, description, application_id, is_system) VALUES (
        uuid_generate_v4(),
        'Super Administrator',
        'Full access to all Authy administrative functions',
        app_id,
        true
    ) RETURNING id INTO super_admin_role_id;

    -- Assign ALL permissions to Super Admin role
    FOR perm_record IN SELECT id FROM permissions WHERE is_system = true LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (
            super_admin_role_id,
            perm_record.id,
            admin_user_id
        );
    END LOOP;

    -- Assign Super Admin role to admin user
    INSERT INTO user_roles (user_id, role_id, application_id, granted_by) VALUES (
        admin_user_id,
        super_admin_role_id,
        app_id,
        admin_user_id
    );

    RAISE NOTICE 'Super Admin role created and assigned to admin@authy.dev';
END $$;
