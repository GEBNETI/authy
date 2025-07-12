package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Permission represents a specific permission in the system
type Permission struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null;size:100"`        // "users:read"
	Resource    string    `json:"resource" gorm:"not null;size:50;index"`          // "users"
	Action      string    `json:"action" gorm:"not null;size:50;index"`            // "read"
	Description string    `json:"description" gorm:"size:500"`                     // Human readable description
	Category    string    `json:"category" gorm:"size:50;index"`                   // "user_management", "system", etc.
	IsSystem    bool      `json:"is_system" gorm:"default:false;index"`            // Cannot be deleted
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	Roles []Role `gorm:"many2many:role_permissions;"`
}

// RolePermission represents the many-to-many relationship between roles and permissions
type RolePermission struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	RoleID       uuid.UUID  `json:"role_id" gorm:"type:uuid;not null;index"`
	PermissionID uuid.UUID  `json:"permission_id" gorm:"type:uuid;not null;index"`
	GrantedAt    time.Time  `json:"granted_at" gorm:"autoCreateTime"`
	GrantedBy    *uuid.UUID `json:"granted_by" gorm:"type:uuid"`

	// Relationships
	Role          Role        `json:"role,omitempty" gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE"`
	Permission    Permission  `json:"permission,omitempty" gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE"`
	GrantedByUser *User       `json:"granted_by_user,omitempty" gorm:"foreignKey:GrantedBy"`
}

// TableName specifies the table name for RolePermission
func (RolePermission) TableName() string {
	return "role_permissions"
}

// BeforeCreate validates permission before creation
func (p *Permission) BeforeCreate(tx *gorm.DB) error {
	return p.validate()
}

// BeforeUpdate validates permission before update
func (p *Permission) BeforeUpdate(tx *gorm.DB) error {
	return p.validate()
}

// validate performs validation on the permission
func (p *Permission) validate() error {
	if p.Resource == "" || p.Action == "" {
		return fmt.Errorf("resource and action are required")
	}

	// Validate format of resource and action (alphanumeric, underscore, hyphen)
	validPattern := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !validPattern.MatchString(p.Resource) {
		return fmt.Errorf("invalid resource format: %s", p.Resource)
	}
	if !validPattern.MatchString(p.Action) {
		return fmt.Errorf("invalid action format: %s", p.Action)
	}

	// Generate name from resource and action
	p.Name = fmt.Sprintf("%s:%s", strings.ToLower(p.Resource), strings.ToLower(p.Action))

	// Set default category if empty
	if p.Category == "" {
		p.Category = "general"
	}

	return nil
}

// CreatePermission creates a new permission
func CreatePermission(db *gorm.DB, resource, action, description, category string, isSystem bool) (*Permission, error) {
	permission := &Permission{
		Resource:    strings.ToLower(resource),
		Action:      strings.ToLower(action),
		Description: description,
		Category:    category,
		IsSystem:    isSystem,
	}

	if err := db.Create(permission).Error; err != nil {
		return nil, err
	}

	return permission, nil
}

// FindPermissionByName finds a permission by its name (resource:action)
func FindPermissionByName(db *gorm.DB, name string) (*Permission, error) {
	var permission Permission
	err := db.Where("name = ?", name).First(&permission).Error
	return &permission, err
}

// FindPermissionsByCategory finds permissions by category
func FindPermissionsByCategory(db *gorm.DB, category string) ([]Permission, error) {
	var permissions []Permission
	err := db.Where("category = ?", category).Order("resource, action").Find(&permissions).Error
	return permissions, err
}

// AssignPermissionToRole assigns a permission to a role
func AssignPermissionToRole(db *gorm.DB, roleID, permissionID uuid.UUID, grantedBy *uuid.UUID) error {
	// Check if assignment already exists
	var existing RolePermission
	if err := db.Where("role_id = ? AND permission_id = ?", roleID, permissionID).First(&existing).Error; err == nil {
		return fmt.Errorf("permission already assigned to role")
	}

	rolePermission := &RolePermission{
		RoleID:       roleID,
		PermissionID: permissionID,
		GrantedBy:    grantedBy,
	}

	return db.Create(rolePermission).Error
}

// RemovePermissionFromRole removes a permission from a role
func RemovePermissionFromRole(db *gorm.DB, roleID, permissionID uuid.UUID) error {
	return db.Where("role_id = ? AND permission_id = ?", roleID, permissionID).Delete(&RolePermission{}).Error
}

// GetRolePermissions gets all permissions for a role
func GetRolePermissions(db *gorm.DB, roleID uuid.UUID) ([]Permission, error) {
	var permissions []Permission
	err := db.Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Where("role_permissions.role_id = ?", roleID).
		Order("permissions.category, permissions.resource, permissions.action").
		Find(&permissions).Error
	return permissions, err
}

// GetUserPermissions gets all permissions for a user across all their roles in an application
func GetUserPermissions(db *gorm.DB, userID, applicationID uuid.UUID) ([]Permission, error) {
	var permissions []Permission
	err := db.Distinct().
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Joins("JOIN user_roles ON user_roles.role_id = role_permissions.role_id").
		Where("user_roles.user_id = ? AND user_roles.application_id = ?", userID, applicationID).
		Order("permissions.category, permissions.resource, permissions.action").
		Find(&permissions).Error
	return permissions, err
}

// HasUserPermission checks if a user has a specific permission in an application
func HasUserPermission(db *gorm.DB, userID, applicationID uuid.UUID, resource, action string) (bool, error) {
	permissionName := fmt.Sprintf("%s:%s", strings.ToLower(resource), strings.ToLower(action))
	
	var count int64
	err := db.Model(&Permission{}).
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Joins("JOIN user_roles ON user_roles.role_id = role_permissions.role_id").
		Where("user_roles.user_id = ? AND user_roles.application_id = ? AND permissions.name = ?", 
			userID, applicationID, permissionName).
		Count(&count).Error
	
	return count > 0, err
}

// ParsePermission parses a permission string (resource:action) into resource and action
func ParsePermission(permission string) (resource, action string, err error) {
	parts := strings.Split(permission, ":")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid permission format: %s, expected 'resource:action'", permission)
	}
	return strings.ToLower(parts[0]), strings.ToLower(parts[1]), nil
}

// SystemPermissions defines the default system permissions
var SystemPermissions = []Permission{
	// User Management
	{Resource: "users", Action: "create", Description: "Create new users", Category: "user_management", IsSystem: true},
	{Resource: "users", Action: "read", Description: "View user information", Category: "user_management", IsSystem: true},
	{Resource: "users", Action: "update", Description: "Update user information", Category: "user_management", IsSystem: true},
	{Resource: "users", Action: "delete", Description: "Delete/deactivate users", Category: "user_management", IsSystem: true},
	{Resource: "users", Action: "list", Description: "List all users", Category: "user_management", IsSystem: true},
	
	// Role Management
	{Resource: "roles", Action: "create", Description: "Create new roles", Category: "role_management", IsSystem: true},
	{Resource: "roles", Action: "read", Description: "View role information", Category: "role_management", IsSystem: true},
	{Resource: "roles", Action: "update", Description: "Update role information", Category: "role_management", IsSystem: true},
	{Resource: "roles", Action: "delete", Description: "Delete roles", Category: "role_management", IsSystem: true},
	{Resource: "roles", Action: "list", Description: "List all roles", Category: "role_management", IsSystem: true},
	{Resource: "roles", Action: "assign", Description: "Assign roles to users", Category: "role_management", IsSystem: true},
	{Resource: "roles", Action: "revoke", Description: "Revoke roles from users", Category: "role_management", IsSystem: true},
	
	// Permission Management
	{Resource: "permissions", Action: "create", Description: "Create new permissions", Category: "permission_management", IsSystem: true},
	{Resource: "permissions", Action: "read", Description: "View permission information", Category: "permission_management", IsSystem: true},
	{Resource: "permissions", Action: "update", Description: "Update permission information", Category: "permission_management", IsSystem: true},
	{Resource: "permissions", Action: "delete", Description: "Delete permissions", Category: "permission_management", IsSystem: true},
	{Resource: "permissions", Action: "list", Description: "List all permissions", Category: "permission_management", IsSystem: true},
	{Resource: "permissions", Action: "assign", Description: "Assign permissions to roles", Category: "permission_management", IsSystem: true},
	{Resource: "permissions", Action: "revoke", Description: "Revoke permissions from roles", Category: "permission_management", IsSystem: true},
	
	// Application Management
	{Resource: "applications", Action: "create", Description: "Create new applications", Category: "application_management", IsSystem: true},
	{Resource: "applications", Action: "read", Description: "View application information", Category: "application_management", IsSystem: true},
	{Resource: "applications", Action: "update", Description: "Update application information", Category: "application_management", IsSystem: true},
	{Resource: "applications", Action: "delete", Description: "Delete applications", Category: "application_management", IsSystem: true},
	{Resource: "applications", Action: "list", Description: "List all applications", Category: "application_management", IsSystem: true},
	
	// System Administration
	{Resource: "system", Action: "admin", Description: "Full system administration access", Category: "system", IsSystem: true},
	{Resource: "system", Action: "audit", Description: "View audit logs and system monitoring", Category: "system", IsSystem: true},
	{Resource: "system", Action: "config", Description: "Modify system configuration", Category: "system", IsSystem: true},
}