package models

import (
	"time"
	"golang.org/x/crypto/bcrypt"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string    `json:"-" gorm:"not null;size:255"`
	FirstName    string    `json:"first_name" gorm:"not null;size:100"`
	LastName     string    `json:"last_name" gorm:"not null;size:100"`
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// Relationships
	UserRoles []UserRole  `json:"user_roles,omitempty" gorm:"foreignKey:UserID"`
	Tokens    []Token     `json:"tokens,omitempty" gorm:"foreignKey:UserID"`
	AuditLogs []AuditLog  `json:"audit_logs,omitempty" gorm:"foreignKey:UserID"`
}

// TableName specifies the table name for GORM
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook to generate UUID if not provided
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// SetPassword hashes and sets the password
func (u *User) SetPassword(password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hash)
	return nil
}

// CheckPassword verifies the password
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// GetFullName returns the full name of the user
func (u *User) GetFullName() string {
	return u.FirstName + " " + u.LastName
}

// HasRoleInApplication checks if user has a specific role in an application
func (u *User) HasRoleInApplication(db *gorm.DB, applicationID uuid.UUID, roleName string) (bool, error) {
	var count int64
	err := db.Table("user_roles ur").
		Joins("JOIN roles r ON ur.role_id = r.id").
		Where("ur.user_id = ? AND ur.application_id = ? AND r.name = ?", u.ID, applicationID, roleName).
		Count(&count).Error
	
	return count > 0, err
}

// GetRolesInApplication returns all roles for user in a specific application
func (u *User) GetRolesInApplication(db *gorm.DB, applicationID uuid.UUID) ([]Role, error) {
	var roles []Role
	err := db.Table("roles r").
		Joins("JOIN user_roles ur ON r.id = ur.role_id").
		Where("ur.user_id = ? AND ur.application_id = ?", u.ID, applicationID).
		Find(&roles).Error
	
	return roles, err
}