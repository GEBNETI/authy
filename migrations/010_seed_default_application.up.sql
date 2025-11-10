-- Enable pgcrypto extension for random bytes generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert AuthyBackoffice application
INSERT INTO applications (id, name, description, is_system, api_key) VALUES
(
    uuid_generate_v4(),
    'AuthyBackoffice',
    'Authy Admin Interface - Main application for managing users, roles, and permissions',
    true,
    encode(gen_random_bytes(32), 'hex')
);
