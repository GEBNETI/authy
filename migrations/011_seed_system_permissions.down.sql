-- Remove all system permissions
DELETE FROM permissions WHERE is_system = true;
