package models

import (
	"gorm.io/gorm"
)

// AllModels returns a slice of all model types for GORM auto migration
func AllModels() []interface{} {
	return []interface{}{
		&User{},
		&Application{},
		&Role{},
		&UserRole{},
		&Token{},
		&AuditLog{},
	}
}

// AutoMigrate runs auto migration for all models
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(AllModels()...)
}

// CreateIndexes creates additional indexes that can't be created via GORM tags
func CreateIndexes(db *gorm.DB) error {
	// Create composite indexes
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_user_roles_composite ON user_roles (user_id, application_id)").Error; err != nil {
		return err
	}
	
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_tokens_user_app_type ON tokens (user_id, application_id, token_type)").Error; err != nil {
		return err
	}
	
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs (user_id, action)").Error; err != nil {
		return err
	}
	
	return nil
}

// SeedSystemApplication creates the default AuthyBackoffice system application
func SeedSystemApplication(db *gorm.DB) error {
	// Check if system application already exists
	var count int64
	if err := db.Model(&Application{}).Where("name = ? AND is_system = true", "AuthyBackoffice").Count(&count).Error; err != nil {
		return err
	}
	
	if count > 0 {
		return nil // Already exists
	}
	
	// Create system application
	systemApp := &Application{
		Name:        "AuthyBackoffice",
		Description: "Authy Authentication Service Backend Administration",
		IsSystem:    true,
	}
	
	if err := db.Create(systemApp).Error; err != nil {
		return err
	}
	
	// Create default admin role for system application
	adminRole := &Role{
		Name:          "admin",
		Description:   "Full administrative access to Authy system",
		ApplicationID: systemApp.ID,
	}
	
	// Set admin permissions
	adminPermissions := []Permission{
		{
			Resource: "users",
			Actions:  []string{"*"},
		},
		{
			Resource: "applications",
			Actions:  []string{"read", "create", "update"}, // Cannot delete system app
		},
		{
			Resource: "roles",
			Actions:  []string{"*"},
		},
		{
			Resource: "audit_logs",
			Actions:  []string{"read"},
		},
	}
	
	if err := adminRole.SetPermissions(adminPermissions); err != nil {
		return err
	}
	
	return db.Create(adminRole).Error
}