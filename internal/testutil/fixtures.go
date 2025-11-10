package testutil

import (
	"time"

	"github.com/GEBNETI/authy/internal/models"
	"github.com/google/uuid"
)

// Test user credentials
const (
	TestUserEmail    = "test@example.com"
	TestUserPassword = "password123"
	TestAdminEmail   = "admin@example.com"
	TestAdminPassword = "admin123"
)

// Test application names
const (
	TestAppName        = "TestApp"
	TestBackofficeName = "TestBackoffice"
)

// FixtureUser provides common test user data
type FixtureUser struct {
	ID       uuid.UUID
	Email    string
	Username string
	Password string
	IsActive bool
}

// DefaultUser returns a default test user
func DefaultUser() FixtureUser {
	return FixtureUser{
		ID:       uuid.New(),
		Email:    TestUserEmail,
		Username: TestUserEmail,
		Password: TestUserPassword,
		IsActive: true,
	}
}

// AdminUser returns an admin test user
func AdminUser() FixtureUser {
	return FixtureUser{
		ID:       uuid.New(),
		Email:    TestAdminEmail,
		Username: TestAdminEmail,
		Password: TestAdminPassword,
		IsActive: true,
	}
}

// InactiveUser returns an inactive test user
func InactiveUser() FixtureUser {
	return FixtureUser{
		ID:       uuid.New(),
		Email:    "inactive@example.com",
		Username: "inactive@example.com",
		Password: TestUserPassword,
		IsActive: false,
	}
}

// FixtureApplication provides common test application data
type FixtureApplication struct {
	ID          uuid.UUID
	Name        string
	Description string
	IsActive    bool
}

// DefaultApplication returns a default test application
func DefaultApplication() FixtureApplication {
	return FixtureApplication{
		ID:          uuid.New(),
		Name:        TestAppName,
		Description: "Test application for unit tests",
		IsActive:    true,
	}
}

// BackofficeApplication returns a backoffice test application
func BackofficeApplication() FixtureApplication {
	return FixtureApplication{
		ID:          uuid.New(),
		Name:        TestBackofficeName,
		Description: "Test backoffice application",
		IsActive:    true,
	}
}

// InactiveApplication returns an inactive test application
func InactiveApplication() FixtureApplication {
	return FixtureApplication{
		ID:          uuid.New(),
		Name:        "InactiveApp",
		Description: "Inactive test application",
		IsActive:    false,
	}
}

// FixturePermission provides common test permission data
type FixturePermission struct {
	ID          uuid.UUID
	Name        string
	Resource    string
	Action      string
	Description string
	IsSystem    bool
	Category    string
}

// DefaultPermissions returns a set of common test permissions
func DefaultPermissions() []FixturePermission {
	return []FixturePermission{
		{
			ID:          uuid.New(),
			Name:        "users:read",
			Resource:    "users",
			Action:      "read",
			Description: "Read users",
			IsSystem:    false,
			Category:    "users",
		},
		{
			ID:          uuid.New(),
			Name:        "users:write",
			Resource:    "users",
			Action:      "write",
			Description: "Write users",
			IsSystem:    false,
			Category:    "users",
		},
		{
			ID:          uuid.New(),
			Name:        "roles:read",
			Resource:    "roles",
			Action:      "read",
			Description: "Read roles",
			IsSystem:    false,
			Category:    "roles",
		},
		{
			ID:          uuid.New(),
			Name:        "roles:write",
			Resource:    "roles",
			Action:      "write",
			Description: "Write roles",
			IsSystem:    false,
			Category:    "roles",
		},
	}
}

// SystemPermission returns a system permission fixture
func SystemPermission() FixturePermission {
	return FixturePermission{
		ID:          uuid.New(),
		Name:        "system:admin",
		Resource:    "system",
		Action:      "admin",
		Description: "System administration",
		IsSystem:    true,
		Category:    "system",
	}
}

// FixtureRole provides common test role data
type FixtureRole struct {
	ID            uuid.UUID
	Name          string
	Description   string
	ApplicationID uuid.UUID
	PermissionIDs []uuid.UUID
}

// DefaultRole returns a default test role
func DefaultRole(appID uuid.UUID, permIDs []uuid.UUID) FixtureRole {
	return FixtureRole{
		ID:            uuid.New(),
		Name:          "TestRole",
		Description:   "Test role for unit tests",
		ApplicationID: appID,
		PermissionIDs: permIDs,
	}
}

// AdminRole returns an admin test role
func AdminRole(appID uuid.UUID, permIDs []uuid.UUID) FixtureRole {
	return FixtureRole{
		ID:            uuid.New(),
		Name:          "AdminRole",
		Description:   "Admin role with all permissions",
		ApplicationID: appID,
		PermissionIDs: permIDs,
	}
}

// FixtureToken provides common test token data
type FixtureToken struct {
	Token         string
	UserID        uuid.UUID
	ApplicationID uuid.UUID
	Type          models.TokenType
	ExpiresAt     time.Time
	IsValid       bool
}

// ValidAccessToken returns a valid access token fixture
func ValidAccessToken(userID, appID uuid.UUID) FixtureToken {
	return FixtureToken{
		Token:         uuid.New().String(),
		UserID:        userID,
		ApplicationID: appID,
		Type:          models.TokenTypeAccess,
		ExpiresAt:     time.Now().Add(15 * time.Minute),
		IsValid:       true,
	}
}

// ValidRefreshToken returns a valid refresh token fixture
func ValidRefreshToken(userID, appID uuid.UUID) FixtureToken {
	return FixtureToken{
		Token:         uuid.New().String(),
		UserID:        userID,
		ApplicationID: appID,
		Type:          models.TokenTypeRefresh,
		ExpiresAt:     time.Now().Add(7 * 24 * time.Hour),
		IsValid:       true,
	}
}

// ExpiredAccessToken returns an expired access token fixture
func ExpiredAccessToken(userID, appID uuid.UUID) FixtureToken {
	return FixtureToken{
		Token:         uuid.New().String(),
		UserID:        userID,
		ApplicationID: appID,
		Type:          models.TokenTypeAccess,
		ExpiresAt:     time.Now().Add(-1 * time.Hour),
		IsValid:       true,
	}
}

// InvalidToken returns an invalidated token fixture
func InvalidToken(userID, appID uuid.UUID) FixtureToken {
	return FixtureToken{
		Token:         uuid.New().String(),
		UserID:        userID,
		ApplicationID: appID,
		Type:          models.TokenTypeAccess,
		ExpiresAt:     time.Now().Add(15 * time.Minute),
		IsValid:       false,
	}
}

// TestJWTSecret returns a test JWT secret
func TestJWTSecret() string {
	return "test-jwt-secret-key-for-unit-tests-only-do-not-use-in-production"
}

// TestJWTExpiration returns test JWT expiration durations
func TestJWTExpiration() (access time.Duration, refresh time.Duration) {
	return 15 * time.Minute, 7 * 24 * time.Hour
}
