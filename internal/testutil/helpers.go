package testutil

import (
	"testing"
	"time"

	"github.com/GEBNETI/authy/internal/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// SetupTestDB creates an in-memory SQLite database for testing
func SetupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err, "Failed to open test database")

	// Auto-migrate all models
	err = db.AutoMigrate(
		&models.User{},
		&models.Application{},
		&models.Permission{},
		&models.Role{},
		&models.Token{},
		&models.AuditLog{},
	)
	require.NoError(t, err, "Failed to auto-migrate test database")

	return db
}

// TeardownTestDB closes the test database connection
func TeardownTestDB(t *testing.T, db *gorm.DB) {
	t.Helper()

	sqlDB, err := db.DB()
	require.NoError(t, err, "Failed to get database connection")

	err = sqlDB.Close()
	require.NoError(t, err, "Failed to close database connection")
}

// CreateTestUser creates a test user in the database
func CreateTestUser(t *testing.T, db *gorm.DB, email, password string) *models.User {
	t.Helper()

	user := &models.User{
		Email:    email,
		Username: email,
		IsActive: true,
	}

	err := user.SetPassword(password)
	require.NoError(t, err, "Failed to set user password")

	err = db.Create(user).Error
	require.NoError(t, err, "Failed to create test user")

	return user
}

// CreateTestApplication creates a test application in the database
func CreateTestApplication(t *testing.T, db *gorm.DB, name, description string) *models.Application {
	t.Helper()

	app := &models.Application{
		Name:        name,
		Description: description,
		IsActive:    true,
	}

	err := db.Create(app).Error
	require.NoError(t, err, "Failed to create test application")

	return app
}

// CreateTestPermission creates a test permission in the database
func CreateTestPermission(t *testing.T, db *gorm.DB, resource, action string) *models.Permission {
	t.Helper()

	perm := &models.Permission{
		Name:        resource + ":" + action,
		Resource:    resource,
		Action:      action,
		Description: "Test permission for " + resource + " " + action,
		IsSystem:    false,
		Category:    "test",
	}

	err := db.Create(perm).Error
	require.NoError(t, err, "Failed to create test permission")

	return perm
}

// CreateTestRole creates a test role in the database
func CreateTestRole(t *testing.T, db *gorm.DB, name string, appID uuid.UUID, permissions []*models.Permission) *models.Role {
	t.Helper()

	role := &models.Role{
		Name:          name,
		Description:   "Test role: " + name,
		ApplicationID: appID,
		Permissions:   permissions,
	}

	err := db.Create(role).Error
	require.NoError(t, err, "Failed to create test role")

	return role
}

// AssignRoleToUser assigns a role to a user
func AssignRoleToUser(t *testing.T, db *gorm.DB, user *models.User, role *models.Role) {
	t.Helper()

	err := db.Model(user).Association("Roles").Append(role)
	require.NoError(t, err, "Failed to assign role to user")
}

// CreateTestToken creates a test token in the database
func CreateTestToken(t *testing.T, db *gorm.DB, userID, appID uuid.UUID, tokenType models.TokenType) *models.Token {
	t.Helper()

	token := &models.Token{
		Token:         uuid.New().String(),
		UserID:        userID,
		ApplicationID: appID,
		Type:          tokenType,
		ExpiresAt:     time.Now().Add(15 * time.Minute),
		IsValid:       true,
	}

	err := db.Create(token).Error
	require.NoError(t, err, "Failed to create test token")

	return token
}

// AssertErrorContains checks if an error contains a specific substring
func AssertErrorContains(t *testing.T, err error, substr string) {
	t.Helper()

	require.Error(t, err, "Expected an error but got nil")
	require.Contains(t, err.Error(), substr, "Error message does not contain expected substring")
}

// AssertTimeAlmostEqual checks if two times are within a delta of each other
func AssertTimeAlmostEqual(t *testing.T, expected, actual time.Time, delta time.Duration) {
	t.Helper()

	diff := expected.Sub(actual)
	if diff < 0 {
		diff = -diff
	}

	require.LessOrEqual(t, diff, delta, "Times are not within acceptable delta")
}

// WaitForCondition polls a condition function until it returns true or times out
func WaitForCondition(t *testing.T, condition func() bool, timeout, interval time.Duration) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(interval)
	}

	require.Fail(t, "Condition was not met within timeout")
}

// CleanupTestData removes all data from test tables
func CleanupTestData(t *testing.T, db *gorm.DB) {
	t.Helper()

	// Delete in reverse order of dependencies
	db.Exec("DELETE FROM audit_logs")
	db.Exec("DELETE FROM tokens")
	db.Exec("DELETE FROM user_roles")
	db.Exec("DELETE FROM role_permissions")
	db.Exec("DELETE FROM roles")
	db.Exec("DELETE FROM permissions")
	db.Exec("DELETE FROM users")
	db.Exec("DELETE FROM applications")
}
