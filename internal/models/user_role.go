package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	UserID        uuid.UUID  `json:"user_id" gorm:"type:uuid;not null"`
	RoleID        uuid.UUID  `json:"role_id" gorm:"type:uuid;not null"`
	ApplicationID uuid.UUID  `json:"application_id" gorm:"type:uuid;not null"`
	GrantedAt     time.Time  `json:"granted_at"`
	GrantedBy     *uuid.UUID `json:"granted_by" gorm:"type:uuid"`
	
	// Relationships
	User        *User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Role        *Role        `json:"role,omitempty" gorm:"foreignKey:RoleID"`
	Application *Application `json:"application,omitempty" gorm:"foreignKey:ApplicationID"`
	GrantedByUser *User      `json:"granted_by_user,omitempty" gorm:"foreignKey:GrantedBy"`
}

// TableName specifies the table name for GORM
func (UserRole) TableName() string {
	return "user_roles"
}

// BeforeCreate hook to generate UUID and set granted_at if not provided
func (ur *UserRole) BeforeCreate(tx *gorm.DB) error {
	if ur.ID == uuid.Nil {
		ur.ID = uuid.New()
	}
	
	if ur.GrantedAt.IsZero() {
		ur.GrantedAt = time.Now()
	}
	
	return nil
}

// ValidateUniqueConstraint ensures unique user-role-application combination
func (ur *UserRole) ValidateUniqueConstraint(db *gorm.DB) error {
	var count int64
	query := db.Model(&UserRole{}).
		Where("user_id = ? AND role_id = ? AND application_id = ?", ur.UserID, ur.RoleID, ur.ApplicationID)
	
	// If updating, exclude current record
	if ur.ID != uuid.Nil {
		query = query.Where("id != ?", ur.ID)
	}
	
	err := query.Count(&count).Error
	if err != nil {
		return err
	}
	
	if count > 0 {
		return gorm.ErrDuplicatedKey
	}
	
	return nil
}

// GetUserRolesByUser returns all roles for a specific user
func GetUserRolesByUser(db *gorm.DB, userID uuid.UUID) ([]UserRole, error) {
	var userRoles []UserRole
	err := db.Preload("Role").
		Preload("Application").
		Where("user_id = ?", userID).
		Find(&userRoles).Error
	
	return userRoles, err
}

// GetUserRolesByApplication returns all user roles for a specific application
func GetUserRolesByApplication(db *gorm.DB, applicationID uuid.UUID) ([]UserRole, error) {
	var userRoles []UserRole
	err := db.Preload("User").
		Preload("Role").
		Where("application_id = ?", applicationID).
		Find(&userRoles).Error
	
	return userRoles, err
}

// GetUserRolesByUserAndApplication returns roles for a user in a specific application
func GetUserRolesByUserAndApplication(db *gorm.DB, userID, applicationID uuid.UUID) ([]UserRole, error) {
	var userRoles []UserRole
	err := db.Preload("Role").
		Where("user_id = ? AND application_id = ?", userID, applicationID).
		Find(&userRoles).Error
	
	return userRoles, err
}

// HasUserRole checks if a user has a specific role in an application
func HasUserRole(db *gorm.DB, userID, roleID, applicationID uuid.UUID) (bool, error) {
	var count int64
	err := db.Model(&UserRole{}).
		Where("user_id = ? AND role_id = ? AND application_id = ?", userID, roleID, applicationID).
		Count(&count).Error
	
	return count > 0, err
}

// RemoveUserRole removes a specific user role
func RemoveUserRole(db *gorm.DB, userID, roleID, applicationID uuid.UUID) error {
	return db.Where("user_id = ? AND role_id = ? AND application_id = ?", userID, roleID, applicationID).
		Delete(&UserRole{}).Error
}

// RemoveAllUserRolesInApplication removes all roles for a user in a specific application
func RemoveAllUserRolesInApplication(db *gorm.DB, userID, applicationID uuid.UUID) error {
	return db.Where("user_id = ? AND application_id = ?", userID, applicationID).
		Delete(&UserRole{}).Error
}