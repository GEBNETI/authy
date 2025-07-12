package models

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

type Token struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	UserID        uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index:idx_tokens_user_app"`
	ApplicationID uuid.UUID `json:"application_id" gorm:"type:uuid;not null;index:idx_tokens_user_app"`
	TokenHash     string    `json:"-" gorm:"not null;size:255;index:idx_tokens_hash"`
	TokenType     TokenType `json:"token_type" gorm:"not null;size:20"`
	ExpiresAt     time.Time `json:"expires_at" gorm:"not null;index:idx_tokens_expires"`
	CreatedAt     time.Time `json:"created_at"`

	// Relationships
	User        *User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Application *Application `json:"application,omitempty" gorm:"foreignKey:ApplicationID"`
}

// TableName specifies the table name for GORM
func (Token) TableName() string {
	return "tokens"
}

// BeforeCreate hook to generate UUID if not provided
func (t *Token) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// HashToken creates a SHA-256 hash of the token string
func (t *Token) HashToken(tokenString string) {
	hash := sha256.Sum256([]byte(tokenString))
	t.TokenHash = hex.EncodeToString(hash[:])
}

// IsExpired checks if the token is expired
func (t *Token) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// IsValid checks if the token is valid (not expired)
func (t *Token) IsValid() bool {
	return !t.IsExpired()
}

// FindTokenByHash finds a token by its hash
func FindTokenByHash(db *gorm.DB, tokenHash string) (*Token, error) {
	var token Token
	err := db.Where("token_hash = ?", tokenHash).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// FindValidTokenByHash finds a valid (non-expired) token by its hash
func FindValidTokenByHash(db *gorm.DB, tokenHash string) (*Token, error) {
	var token Token
	err := db.Where("token_hash = ? AND expires_at > ?", tokenHash, time.Now()).
		First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// GetUserTokens returns all tokens for a specific user
func GetUserTokens(db *gorm.DB, userID uuid.UUID) ([]Token, error) {
	var tokens []Token
	err := db.Where("user_id = ?", userID).Find(&tokens).Error
	return tokens, err
}

// GetUserTokensInApplication returns all tokens for a user in a specific application
func GetUserTokensInApplication(db *gorm.DB, userID, applicationID uuid.UUID) ([]Token, error) {
	var tokens []Token
	err := db.Where("user_id = ? AND application_id = ?", userID, applicationID).
		Find(&tokens).Error
	return tokens, err
}

// GetValidUserTokensInApplication returns valid tokens for a user in a specific application
func GetValidUserTokensInApplication(db *gorm.DB, userID, applicationID uuid.UUID, tokenType TokenType) ([]Token, error) {
	var tokens []Token
	err := db.Where("user_id = ? AND application_id = ? AND token_type = ? AND expires_at > ?", 
		userID, applicationID, tokenType, time.Now()).
		Find(&tokens).Error
	return tokens, err
}

// InvalidateToken marks a token as expired by setting expires_at to now
func (t *Token) InvalidateToken(db *gorm.DB) error {
	return db.Model(t).Update("expires_at", time.Now()).Error
}

// InvalidateUserTokensInApplication invalidates all tokens for a user in a specific application
func InvalidateUserTokensInApplication(db *gorm.DB, userID, applicationID uuid.UUID, tokenType TokenType) error {
	return db.Model(&Token{}).
		Where("user_id = ? AND application_id = ? AND token_type = ? AND expires_at > ?", 
			userID, applicationID, tokenType, time.Now()).
		Update("expires_at", time.Now()).Error
}

// InvalidateAllUserTokens invalidates all tokens for a user across all applications
func InvalidateAllUserTokens(db *gorm.DB, userID uuid.UUID) error {
	return db.Model(&Token{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Update("expires_at", time.Now()).Error
}

// CleanupExpiredTokens removes expired tokens from the database
func CleanupExpiredTokens(db *gorm.DB) error {
	return db.Where("expires_at < ?", time.Now()).Delete(&Token{}).Error
}

// GetTokenStats returns statistics about tokens in the system
func GetTokenStats(db *gorm.DB) (map[string]int64, error) {
	stats := make(map[string]int64)
	
	// Total tokens
	var total int64
	if err := db.Model(&Token{}).Count(&total).Error; err != nil {
		return nil, err
	}
	stats["total"] = total
	
	// Valid tokens
	var valid int64
	if err := db.Model(&Token{}).Where("expires_at > ?", time.Now()).Count(&valid).Error; err != nil {
		return nil, err
	}
	stats["valid"] = valid
	
	// Expired tokens
	stats["expired"] = total - valid
	
	// Access tokens
	var accessTokens int64
	if err := db.Model(&Token{}).Where("token_type = ?", AccessToken).Count(&accessTokens).Error; err != nil {
		return nil, err
	}
	stats["access_tokens"] = accessTokens
	
	// Refresh tokens
	var refreshTokens int64
	if err := db.Model(&Token{}).Where("token_type = ?", RefreshToken).Count(&refreshTokens).Error; err != nil {
		return nil, err
	}
	stats["refresh_tokens"] = refreshTokens
	
	return stats, nil
}