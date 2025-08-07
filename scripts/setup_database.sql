-- ==========================================
-- Authy Database Setup Script
-- ==========================================
-- This script sets up the complete Authy database with:
-- 1. Database and user creation
-- 2. Schema creation (via migrations)
-- 3. Application-scoped system permissions
-- 4. Default admin user and application
-- 5. Super admin role with all permissions
--
-- Usage: Run this script as PostgreSQL superuser
-- psql -U postgres -f scripts/setup_database.sql
-- ==========================================

\echo '==========================================';
\echo 'Starting Authy Database Setup...';
\echo '==========================================';

-- Drop database if it exists (be careful in production!)
DROP DATABASE IF EXISTS authy;
DROP USER IF EXISTS authy_user;

-- Create database user
CREATE USER authy_user WITH PASSWORD 'authy_password';

-- Create database
CREATE DATABASE authy OWNER authy_user;

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE authy TO authy_user;

-- Connect to the authy database
\c authy

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO authy_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authy_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authy_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo 'Database and user created successfully.';

-- ==========================================
-- CREATE SCHEMA (from migration 001)
-- ==========================================

\echo 'Creating database schema...';

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE permissions (
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

-- Create roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, application_id)
);

-- Create role_permissions table
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- Create user_roles table (many-to-many with additional context)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, role_id, application_id)
);

-- Create tokens table
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('access', 'refresh')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    application_id UUID REFERENCES applications(id),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CREATE INDEXES
-- ==========================================

\echo 'Creating database indexes...';

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_system ON users(is_system);

-- Applications indexes
CREATE INDEX idx_applications_name ON applications(name);
CREATE INDEX idx_applications_system ON applications(is_system);

-- Permissions indexes
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_system ON permissions(is_system);

-- Roles indexes
CREATE INDEX idx_roles_application ON roles(application_id);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_system ON roles(is_system);

-- Role permissions indexes
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- User roles indexes
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_application ON user_roles(application_id);

-- Tokens indexes
CREATE INDEX idx_tokens_hash ON tokens(token_hash);
CREATE INDEX idx_tokens_user_app ON tokens(user_id, application_id);
CREATE INDEX idx_tokens_expires ON tokens(expires_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_application ON audit_logs(application_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ==========================================
-- CREATE TRIGGERS
-- ==========================================

\echo 'Creating database triggers...';

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INSERT DEFAULT APPLICATION
-- ==========================================

\echo 'Creating default AuthyBackoffice application...';

INSERT INTO applications (id, name, description, is_system, api_key) VALUES 
(
    uuid_generate_v4(),
    'AuthyBackoffice', 
    'Authy Admin Interface - Main application for managing users, roles, and permissions',
    true,
    encode(gen_random_bytes(32), 'hex')
);

-- Get the application ID for later use
-- We'll use it in the permissions and roles
DO $$
DECLARE
    app_id UUID;
BEGIN
    SELECT id INTO app_id FROM applications WHERE name = 'AuthyBackoffice';
    
    -- Store in a temp table for use in subsequent operations
    CREATE TEMP TABLE temp_app_id AS SELECT app_id as id;
END $$;

-- ==========================================
-- INSERT APPLICATION-SCOPED SYSTEM PERMISSIONS
-- ==========================================

\echo 'Creating application-scoped system permissions...';

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

-- ==========================================
-- CREATE ADMIN USER
-- ==========================================

\echo 'Creating admin user...';

INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_system) VALUES (
    uuid_generate_v4(),
    'admin@authy.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'System',
    'Administrator',
    true,
    true
);

-- ==========================================
-- CREATE SUPER ADMIN ROLE
-- ==========================================

\echo 'Creating super admin role with all permissions...';

DO $$
DECLARE
    app_id UUID;
    admin_user_id UUID;
    super_admin_role_id UUID;
    perm_record RECORD;
BEGIN
    -- Get application and admin user IDs
    SELECT id INTO app_id FROM applications WHERE name = 'AuthyBackoffice';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@authy.dev';
    
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

-- ==========================================
-- VERIFY SETUP
-- ==========================================

\echo 'Verifying database setup...';

-- Show counts
\echo 'Database setup verification:';
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Applications', COUNT(*) FROM applications  
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Role Permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'User Roles', COUNT(*) FROM user_roles;

-- Show admin user details
\echo 'Admin user details:';
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    u.is_active,
    u.is_system,
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
WHERE u.email = 'admin@authy.dev'
GROUP BY u.email, u.first_name, u.last_name, u.is_active, u.is_system, r.name;

-- Show sample permissions
\echo 'Sample application-scoped permissions:';
SELECT name, resource, action, category FROM permissions WHERE is_system = true LIMIT 10;

\echo '==========================================';
\echo 'Authy Database Setup Complete!';
\echo '==========================================';
\echo 'Admin Credentials:';
\echo '  Email: admin@authy.dev';
\echo '  Password: password';
\echo '  Application: AuthyBackoffice';
\echo '';
\echo 'Database Connection:';
\echo '  Host: localhost';
\echo '  Database: authy';
\echo '  Username: authy_user';
\echo '  Password: authy_password';
\echo '==========================================';