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

-- Create indexes
CREATE INDEX idx_roles_application ON roles(application_id);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_system ON roles(is_system);

-- Create trigger for updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
