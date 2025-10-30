-- ==========================================
-- Migration: Create Initial Admin Setup
-- ==========================================
-- Creates the Authy application, admin role, and admin user
-- ==========================================

-- Enable pgcrypto extension for gen_random_bytes (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the Authy application
INSERT INTO applications (
    name,
    description,
    is_system,
    api_key,
    created_at,
    updated_at
) VALUES (
    'Authy',
    'Central Authentication Service',
    true,
    'authy_' || md5(random()::text || clock_timestamp()::text)::uuid,
    NOW(),
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Create admin role for Authy application
INSERT INTO roles (
    name,
    description,
    application_id,
    permissions,
    created_at,
    updated_at
) VALUES (
    'admin',
    'Administrator role with full permissions',
    (SELECT id FROM applications WHERE name = 'Authy'),
    '{"authy_users": ["create", "read", "update", "delete"], "authy_roles": ["create", "read", "update", "delete"], "authy_permissions": ["create", "read", "update", "delete"], "authy_applications": ["create", "read", "update", "delete"], "authy_audit": ["read"], "authy_analytics": ["read"], "authy_system": ["manage"]}',
    NOW(),
    NOW()
) ON CONFLICT (name, application_id) DO NOTHING;

-- Create admin user (password: password - CHANGE THIS IN PRODUCTION!)
-- Password hash is for 'password' using bcrypt
INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    is_active,
    created_at,
    updated_at
) VALUES (
    'admin@authy.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System',
    'Administrator',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_roles (
    user_id,
    role_id,
    application_id,
    granted_at,
    granted_by
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@authy.dev'),
    (SELECT id FROM roles WHERE name = 'admin' AND application_id = (SELECT id FROM applications WHERE name = 'Authy')),
    (SELECT id FROM applications WHERE name = 'Authy'),
    NOW(),
    (SELECT id FROM users WHERE email = 'admin@authy.dev') -- Self-granted
) ON CONFLICT (user_id, role_id, application_id) DO NOTHING;

-- Add is_system flag to admin user if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'is_system') THEN
        UPDATE users 
        SET is_system = true 
        WHERE email = 'admin@authy.dev';
    END IF;
END $$;

-- Log the creation
INSERT INTO audit_logs (
    user_id,
    application_id,
    action,
    resource,
    resource_id,
    details,
    created_at
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@authy.dev'),
    (SELECT id FROM applications WHERE name = 'Authy'),
    'create',
    'initial_setup',
    (SELECT id FROM applications WHERE name = 'Authy')::VARCHAR,
    '{"description": "Initial Authy application setup with admin user"}',
    NOW()
);

-- Display created credentials
-- IMPORTANT: Change the admin password immediately after first login!
-- Default credentials:
-- Email: admin@authy.dev
-- Password: password