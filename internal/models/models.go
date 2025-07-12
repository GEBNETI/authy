package models

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	
	"github.com/google/uuid"
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
		&Permission{},
		&RolePermission{},
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
	
	// New indexes for permissions
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_role_permissions_composite ON role_permissions (role_id, permission_id)").Error; err != nil {
		return err
	}
	
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions (resource, action)").Error; err != nil {
		return err
	}
	
	return nil
}

// SeedSystemPermissions creates all system permissions
func SeedSystemPermissions(db *gorm.DB) error {
	// Check if permissions already seeded
	var count int64
	if err := db.Model(&Permission{}).Where("is_system = true").Count(&count).Error; err != nil {
		return err
	}
	
	if count > 0 {
		return nil // Already seeded
	}
	
	// Create all system permissions
	for _, perm := range SystemPermissions {
		permission := Permission{
			Resource:    perm.Resource,
			Action:      perm.Action,
			Description: perm.Description,
			Category:    perm.Category,
			IsSystem:    perm.IsSystem,
		}
		
		if err := db.Create(&permission).Error; err != nil {
			log.Printf("Warning: Failed to create permission %s:%s - %v", perm.Resource, perm.Action, err)
		}
	}
	
	return nil
}

// SeedSystemApplication creates the default AuthyBackoffice system application
func SeedSystemApplication(db *gorm.DB) error {
	// First seed system permissions
	if err := SeedSystemPermissions(db); err != nil {
		return fmt.Errorf("failed to seed system permissions: %w", err)
	}
	
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
	
	if err := db.Create(adminRole).Error; err != nil {
		return err
	}
	
	// Assign all system permissions to admin role
	var systemPermissions []Permission
	if err := db.Where("is_system = true").Find(&systemPermissions).Error; err != nil {
		return err
	}
	
	for _, permission := range systemPermissions {
		if err := AssignPermissionToRole(db, adminRole.ID, permission.ID, nil); err != nil {
			log.Printf("Warning: Failed to assign permission %s to admin role: %v", permission.Name, err)
		}
	}
	
	return nil
}

// MigrateFromLegacyPermissions migrates permissions from JSON format to new table structure and cleans up
func MigrateFromLegacyPermissions(db *gorm.DB) error {
	log.Println("Starting migration from legacy permissions...")
	
	// Check if migration has already been completed
	var migrationCheck int64
	if err := db.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'permissions'").Scan(&migrationCheck).Error; err != nil {
		log.Printf("Warning: Could not check migration status: %v", err)
		return nil // Don't fail startup
	}
	
	if migrationCheck == 0 {
		log.Println("Legacy permissions column not found - migration already completed or not needed")
		return nil
	}
	
	// Get all roles with legacy permissions using raw SQL to avoid GORM model conflicts
	type LegacyRoleData struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Permissions string `json:"permissions"`
	}
	
	var legacyRoles []LegacyRoleData
	if err := db.Raw("SELECT id, name, permissions FROM roles WHERE permissions IS NOT NULL AND permissions != '{}' AND permissions != ''").Scan(&legacyRoles).Error; err != nil {
		return fmt.Errorf("failed to fetch roles with legacy permissions: %w", err)
	}
	
	log.Printf("Found %d roles with legacy permissions to migrate", len(legacyRoles))
	
	for _, legacyRole := range legacyRoles {
		roleID, err := uuid.Parse(legacyRole.ID)
		if err != nil {
			log.Printf("Warning: Invalid role ID %s", legacyRole.ID)
			continue
		}
		
		// Parse legacy permissions JSON
		type LegacyPermission struct {
			Resource string   `json:"resource"`
			Actions  []string `json:"actions"`
		}
		
		var legacyPermissions []LegacyPermission
		if err := json.Unmarshal([]byte(legacyRole.Permissions), &legacyPermissions); err != nil {
			log.Printf("Warning: Failed to parse legacy permissions for role %s: %v", legacyRole.Name, err)
			continue
		}
		
		for _, legacyPerm := range legacyPermissions {
			for _, action := range legacyPerm.Actions {
				// Handle wildcard actions
				actions := []string{action}
				if action == "*" {
					// Convert wildcard to specific actions based on resource
					actions = getWildcardActions(legacyPerm.Resource)
				}
				
				for _, specificAction := range actions {
					// Find or create permission
					permissionName := fmt.Sprintf("%s:%s", strings.ToLower(legacyPerm.Resource), strings.ToLower(specificAction))
					
					var permission Permission
					if err := db.Where("name = ?", permissionName).First(&permission).Error; err != nil {
						if err == gorm.ErrRecordNotFound {
							// Create new permission
							permission = Permission{
								Resource:    strings.ToLower(legacyPerm.Resource),
								Action:      strings.ToLower(specificAction),
								Description: fmt.Sprintf("Migrated permission: %s", permissionName),
								Category:    getCategoryForResource(legacyPerm.Resource),
								IsSystem:    false,
							}
							
							if err := db.Create(&permission).Error; err != nil {
								log.Printf("Warning: Failed to create permission %s: %v", permissionName, err)
								continue
							}
						} else {
							log.Printf("Warning: Failed to lookup permission %s: %v", permissionName, err)
							continue
						}
					}
					
					// Assign permission to role
					if err := AssignPermissionToRole(db, roleID, permission.ID, nil); err != nil {
						log.Printf("Warning: Failed to assign permission %s to role %s: %v", permissionName, legacyRole.Name, err)
					}
				}
			}
		}
		
		log.Printf("Migrated permissions for role: %s", legacyRole.Name)
	}
	
	// After successful migration, drop the legacy permissions column
	log.Println("Dropping legacy permissions column...")
	if err := db.Exec("ALTER TABLE roles DROP COLUMN IF EXISTS permissions").Error; err != nil {
		log.Printf("Warning: Failed to drop legacy permissions column: %v", err)
		// Don't fail migration if column drop fails
	} else {
		log.Println("Legacy permissions column dropped successfully")
	}
	
	log.Println("Migration from legacy permissions completed successfully")
	return nil
}

// Helper function to get actions for wildcard permissions
func getWildcardActions(resource string) []string {
	switch strings.ToLower(resource) {
	case "users":
		return []string{"create", "read", "update", "delete", "list"}
	case "roles":
		return []string{"create", "read", "update", "delete", "list", "assign", "revoke"}
	case "applications":
		return []string{"create", "read", "update", "delete", "list"}
	case "permissions":
		return []string{"create", "read", "update", "delete", "list", "assign", "revoke"}
	case "audit_logs":
		return []string{"read"}
	case "system":
		return []string{"admin", "audit", "config"}
	default:
		return []string{"read", "create", "update", "delete"}
	}
}

// Helper function to get category for resource
func getCategoryForResource(resource string) string {
	switch strings.ToLower(resource) {
	case "users":
		return "user_management"
	case "roles":
		return "role_management"
	case "applications":
		return "application_management"
	case "permissions":
		return "permission_management"
	case "audit_logs":
		return "system"
	case "system":
		return "system"
	default:
		return "general"
	}
}