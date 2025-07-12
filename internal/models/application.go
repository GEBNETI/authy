package models

import (
	"crypto/rand"
	"encoding/hex"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Application struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null;size:100"`
	Description string    `json:"description" gorm:"type:text"`
	IsSystem    bool      `json:"is_system" gorm:"default:false"`
	APIKey      string    `json:"api_key" gorm:"uniqueIndex;not null;size:255"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	Roles     []Role      `json:"roles,omitempty" gorm:"foreignKey:ApplicationID"`
	UserRoles []UserRole  `json:"user_roles,omitempty" gorm:"foreignKey:ApplicationID"`
	Tokens    []Token     `json:"tokens,omitempty" gorm:"foreignKey:ApplicationID"`
	AuditLogs []AuditLog  `json:"audit_logs,omitempty" gorm:"foreignKey:ApplicationID"`
}

// TableName specifies the table name for GORM
func (Application) TableName() string {
	return "applications"
}

// BeforeCreate hook to generate UUID and API key if not provided
func (a *Application) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	
	if a.APIKey == "" {
		apiKey, err := a.GenerateAPIKey()
		if err != nil {
			return err
		}
		a.APIKey = apiKey
	}
	
	return nil
}

// BeforeUpdate hook to prevent modification of system applications
func (a *Application) BeforeUpdate(tx *gorm.DB) error {
	if a.IsSystem {
		// Prevent certain fields from being updated for system applications
		tx.Statement.Omit("name", "is_system")
	}
	return nil
}

// BeforeDelete hook to prevent deletion of system applications
func (a *Application) BeforeDelete(tx *gorm.DB) error {
	if a.IsSystem {
		return gorm.ErrRecordNotFound // Prevent deletion by returning an error
	}
	return nil
}

// GenerateAPIKey creates a secure random API key
func (a *Application) GenerateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "authy_" + hex.EncodeToString(bytes), nil
}

// RegenerateAPIKey creates a new API key for the application
func (a *Application) RegenerateAPIKey() error {
	newKey, err := a.GenerateAPIKey()
	if err != nil {
		return err
	}
	a.APIKey = newKey
	return nil
}

// GetUserCount returns the number of users with roles in this application
func (a *Application) GetUserCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Table("user_roles").
		Where("application_id = ?", a.ID).
		Distinct("user_id").
		Count(&count).Error
	
	return count, err
}

// GetRoleCount returns the number of roles in this application
func (a *Application) GetRoleCount(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&Role{}).Where("application_id = ?", a.ID).Count(&count).Error
	return count, err
}

// ValidateSystemApplication ensures system application constraints
func (a *Application) ValidateSystemApplication() error {
	if a.IsSystem && a.Name != "AuthyBackoffice" {
		return gorm.ErrInvalidData
	}
	return nil
}