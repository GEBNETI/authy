package models

import (
	"fmt"
	"strings"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Name          string    `json:"name" gorm:"not null;size:100"`
	Description   string    `json:"description" gorm:"type:text"`
	ApplicationID uuid.UUID `json:"application_id" gorm:"type:uuid;not null"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relationships
	Application     *Application     `json:"application,omitempty" gorm:"foreignKey:ApplicationID"`
	UserRoles       []UserRole       `json:"user_roles,omitempty" gorm:"foreignKey:RoleID"`
	Permissions     []Permission     `json:"permissions,omitempty" gorm:"many2many:role_permissions;"`
	RolePermissions []RolePermission `json:"role_permissions,omitempty" gorm:"foreignKey:RoleID"`
}

// TableName specifies the table name for GORM
func (Role) TableName() string {
	return "roles"
}

// BeforeCreate hook to generate UUID if not provided
func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}


// GetUserCount returns the number of users with this role
func (r *Role) GetUserCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&UserRole{}).Where("role_id = ?", r.ID).Count(&count).Error
	return count, err
}

// New methods for the new permission structure

// HasPermission checks if this role has a specific permission using the new structure
func (r *Role) HasPermission(db *gorm.DB, resource, action string) (bool, error) {
	return HasRolePermission(db, r.ID, resource, action)
}

// AddPermission adds a permission to this role using the new structure
func (r *Role) AddPermission(db *gorm.DB, permissionID uuid.UUID, grantedBy *uuid.UUID) error {
	return AssignPermissionToRole(db, r.ID, permissionID, grantedBy)
}

// RemovePermission removes a permission from this role using the new structure
func (r *Role) RemovePermission(db *gorm.DB, permissionID uuid.UUID) error {
	return RemovePermissionFromRole(db, r.ID, permissionID)
}

// GetPermissions returns all permissions for this role using the new structure
func (r *Role) GetPermissions(db *gorm.DB) ([]Permission, error) {
	return GetRolePermissions(db, r.ID)
}

// LoadPermissions loads the permissions relationship
func (r *Role) LoadPermissions(db *gorm.DB) error {
	return db.Preload("Permissions").First(r, r.ID).Error
}

// HasRolePermission checks if a role has a specific permission
func HasRolePermission(db *gorm.DB, roleID uuid.UUID, resource, action string) (bool, error) {
	permissionName := fmt.Sprintf("%s:%s", strings.ToLower(resource), strings.ToLower(action))
	
	var count int64
	err := db.Model(&Permission{}).
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Where("role_permissions.role_id = ? AND permissions.name = ?", roleID, permissionName).
		Count(&count).Error
	
	return count > 0, err
}