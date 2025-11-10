-- Remove AuthyBackoffice application
DELETE FROM applications WHERE name = 'AuthyBackoffice' AND is_system = true;

-- Drop pgcrypto extension
DROP EXTENSION IF EXISTS "pgcrypto";
