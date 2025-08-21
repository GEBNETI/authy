-- ==========================================
-- Rollback: Remove Initial Admin Setup
-- ==========================================

-- Remove audit log entry
DELETE FROM audit_logs 
WHERE action = 'create' 
  AND resource = 'initial_setup'
  AND user_id = (SELECT id FROM users WHERE email = 'admin@authy.local');

-- Remove user role assignment
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@authy.local')
  AND application_id = (SELECT id FROM applications WHERE name = 'Authy');

-- Remove admin user
DELETE FROM users 
WHERE email = 'admin@authy.local';

-- Remove admin role
DELETE FROM roles 
WHERE name = 'admin' 
  AND application_id = (SELECT id FROM applications WHERE name = 'Authy');

-- Remove Authy application
DELETE FROM applications 
WHERE name = 'Authy' 
  AND is_system = true;