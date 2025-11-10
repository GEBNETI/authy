-- Drop indexes
DROP INDEX IF EXISTS idx_tokens_expires;
DROP INDEX IF EXISTS idx_tokens_user_app;
DROP INDEX IF EXISTS idx_tokens_hash;

-- Drop table
DROP TABLE IF EXISTS tokens;
