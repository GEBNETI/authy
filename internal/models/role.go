package models

import (
	"encoding/json"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/datatypes"
)

type Role struct {
	ID            uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Name          string         `json:"name" gorm:"not null;size:100"`
	Description   string         `json:"description" gorm:"type:text"`
	ApplicationID uuid.UUID      `json:"application_id" gorm:"type:uuid;not null"`
	Permissions   datatypes.JSON `json:"permissions" gorm:"type:jsonb;default:'{}'"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`

	// Relationships
	Application *Application `json:"application,omitempty" gorm:"foreignKey:ApplicationID"`
	UserRoles   []UserRole   `json:"user_roles,omitempty" gorm:"foreignKey:RoleID"`
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

// Permission represents a single permission
type Permission struct {
	Resource string   `json:"resource"`
	Actions  []string `json:"actions"`
}

// SetPermissions sets the permissions for this role
func (r *Role) SetPermissions(permissions []Permission) error {
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return err
	}
	r.Permissions = datatypes.JSON(permissionsJSON)
	return nil
}

// GetPermissions returns the permissions for this role
func (r *Role) GetPermissions() ([]Permission, error) {
	var permissions []Permission
	if len(r.Permissions) == 0 {
		return permissions, nil
	}
	
	err := json.Unmarshal(r.Permissions, &permissions)
	return permissions, err
}

// HasPermission checks if this role has a specific permission
func (r *Role) HasPermission(resource, action string) (bool, error) {
	permissions, err := r.GetPermissions()
	if err != nil {
		return false, err
	}
	
	for _, perm := range permissions {
		if perm.Resource == resource {
			for _, allowedAction := range perm.Actions {
				if allowedAction == action || allowedAction == "*" {
					return true, nil
				}
			}
		}
	}
	
	return false, nil
}

// AddPermission adds a new permission to this role
func (r *Role) AddPermission(resource, action string) error {
	permissions, err := r.GetPermissions()
	if err != nil {
		return err
	}
	
	// Find existing permission for resource
	for i, perm := range permissions {
		if perm.Resource == resource {
			// Check if action already exists
			for _, existingAction := range perm.Actions {
				if existingAction == action {
					return nil // Already exists
				}
			}
			// Add action to existing permission
			permissions[i].Actions = append(permissions[i].Actions, action)
			return r.SetPermissions(permissions)
		}
	}
	
	// Create new permission
	newPermission := Permission{
		Resource: resource,
		Actions:  []string{action},
	}
	permissions = append(permissions, newPermission)
	return r.SetPermissions(permissions)
}

// RemovePermission removes a permission from this role
func (r *Role) RemovePermission(resource, action string) error {
	permissions, err := r.GetPermissions()
	if err != nil {
		return err
	}
	
	for i, perm := range permissions {
		if perm.Resource == resource {
			// Remove action from permission
			newActions := make([]string, 0)
			for _, existingAction := range perm.Actions {
				if existingAction != action {
					newActions = append(newActions, existingAction)
				}
			}
			
			if len(newActions) == 0 {
				// Remove entire permission if no actions left
				permissions = append(permissions[:i], permissions[i+1:]...)
			} else {
				permissions[i].Actions = newActions
			}
			
			return r.SetPermissions(permissions)
		}
	}
	
	return nil // Permission not found, nothing to remove
}

// GetUserCount returns the number of users with this role
func (r *Role) GetUserCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&UserRole{}).Where("role_id = ?", r.ID).Count(&count).Error
	return count, err
}