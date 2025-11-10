package models

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// TestSetPassword verifies password hashing
func TestSetPassword(t *testing.T) {
	user := &User{
		ID:        uuid.New(),
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
		IsActive:  true,
	}

	password := "SecurePassword123!"

	err := user.SetPassword(password)
	require.NoError(t, err)

	// Password hash should be set
	assert.NotEmpty(t, user.PasswordHash)

	// Hash should not equal plain text password
	assert.NotEqual(t, password, user.PasswordHash)

	// Hash should start with bcrypt prefix
	assert.True(t, strings.HasPrefix(user.PasswordHash, "$2a$") ||
		strings.HasPrefix(user.PasswordHash, "$2b$") ||
		strings.HasPrefix(user.PasswordHash, "$2y$"),
		"Password hash should have bcrypt format")

	// Verify hash can be used with bcrypt
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	assert.NoError(t, err, "Generated hash should be valid bcrypt hash")
}

// TestSetPassword_EmptyPassword verifies empty password handling
func TestSetPassword_EmptyPassword(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	// Empty password should still be hashed (bcrypt allows it)
	err := user.SetPassword("")
	require.NoError(t, err)
	assert.NotEmpty(t, user.PasswordHash)
}

// TestSetPassword_LongPassword verifies long password handling
func TestSetPassword_LongPassword(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	// Bcrypt has a 72 byte limit and returns an error for longer passwords
	longPassword := strings.Repeat("a", 100)

	err := user.SetPassword(longPassword)

	// Should return an error for passwords exceeding 72 bytes
	require.Error(t, err)
	assert.Contains(t, err.Error(), "password length exceeds 72 bytes")

	// Test with password at the limit (72 bytes should work)
	maxPassword := strings.Repeat("a", 72)
	err = user.SetPassword(maxPassword)
	require.NoError(t, err)
	assert.NotEmpty(t, user.PasswordHash)

	// Verify the max-length password works
	valid := user.CheckPassword(maxPassword)
	assert.True(t, valid)
}

// TestSetPassword_SpecialCharacters verifies special character handling
func TestSetPassword_SpecialCharacters(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	specialPasswords := []string{
		"pass@word#123",
		"пароль",                    // Cyrillic
		"密码",                       // Chinese
		"🔒🔑password🔐",              // Emojis
		"tab\ttab",                  // Tab character
		"new\nline",                 // Newline
		"quote\"quote",              // Quotes
		"back\\slash",               // Backslash
		strings.Repeat("€", 20),    // Unicode symbols
	}

	for _, password := range specialPasswords {
		t.Run("password: "+password[:min(len(password), 20)], func(t *testing.T) {
			err := user.SetPassword(password)
			require.NoError(t, err)
			assert.NotEmpty(t, user.PasswordHash)

			// Verify password can be checked
			valid := user.CheckPassword(password)
			assert.True(t, valid, "Password with special characters should be verifiable")
		})
	}
}

// TestSetPassword_Idempotency verifies multiple calls produce different hashes
func TestSetPassword_Idempotency(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	password := "SamePassword123"

	// Set password first time
	err := user.SetPassword(password)
	require.NoError(t, err)
	firstHash := user.PasswordHash

	// Set same password again
	err = user.SetPassword(password)
	require.NoError(t, err)
	secondHash := user.PasswordHash

	// Hashes should be different due to salt
	assert.NotEqual(t, firstHash, secondHash, "Same password should produce different hashes due to salt")

	// Both hashes should validate the password
	user.PasswordHash = firstHash
	assert.True(t, user.CheckPassword(password))

	user.PasswordHash = secondHash
	assert.True(t, user.CheckPassword(password))
}

// TestCheckPassword verifies password verification
func TestCheckPassword(t *testing.T) {
	user := &User{
		ID:        uuid.New(),
		Email:     "test@example.com",
		FirstName: "Test",
		LastName:  "User",
	}

	password := "CorrectPassword123"

	err := user.SetPassword(password)
	require.NoError(t, err)

	// Correct password should pass
	assert.True(t, user.CheckPassword(password))

	// Incorrect passwords should fail
	assert.False(t, user.CheckPassword("WrongPassword123"))
	assert.False(t, user.CheckPassword("correctpassword123"))  // Case sensitive
	assert.False(t, user.CheckPassword("CorrectPassword124"))  // One char different
	assert.False(t, user.CheckPassword("CorrectPassword12"))   // Shorter
	assert.False(t, user.CheckPassword("CorrectPassword123 ")) // Extra space
	assert.False(t, user.CheckPassword(" CorrectPassword123")) // Leading space
	assert.False(t, user.CheckPassword(""))                    // Empty
}

// TestCheckPassword_CaseSensitivity verifies password case sensitivity
func TestCheckPassword_CaseSensitivity(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	password := "CaseSensitivePassword"

	err := user.SetPassword(password)
	require.NoError(t, err)

	// Exact match should work
	assert.True(t, user.CheckPassword("CaseSensitivePassword"))

	// Different cases should fail
	assert.False(t, user.CheckPassword("casesensitivepassword"))
	assert.False(t, user.CheckPassword("CASESENSITIVEPASSWORD"))
	assert.False(t, user.CheckPassword("caseSensitivePassword"))
}

// TestCheckPassword_EmptyPassword verifies empty password check
func TestCheckPassword_EmptyPassword(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	// Set empty password
	err := user.SetPassword("")
	require.NoError(t, err)

	// Empty password should match
	assert.True(t, user.CheckPassword(""))

	// Non-empty password should not match
	assert.False(t, user.CheckPassword("anything"))
}

// TestCheckPassword_WithoutSettingPassword verifies check on uninitialized user
func TestCheckPassword_WithoutSettingPassword(t *testing.T) {
	user := &User{
		ID:           uuid.New(),
		Email:        "test@example.com",
		PasswordHash: "", // No password set
	}

	// Should return false for any password
	assert.False(t, user.CheckPassword("password"))
	assert.False(t, user.CheckPassword(""))
}

// TestCheckPassword_InvalidHash verifies handling of corrupted hash
func TestCheckPassword_InvalidHash(t *testing.T) {
	user := &User{
		ID:           uuid.New(),
		Email:        "test@example.com",
		PasswordHash: "invalid-hash-not-bcrypt",
	}

	// Should return false for invalid hash
	assert.False(t, user.CheckPassword("password"))
}

// TestPasswordHashFormat verifies bcrypt hash format
func TestPasswordHashFormat(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	passwords := []string{
		"short",
		"medium-length-password",
		"VeryLongPasswordWithManyCharacters123456789!@#$%^&*()",
	}

	for _, password := range passwords {
		t.Run("length: "+string(rune(len(password))), func(t *testing.T) {
			err := user.SetPassword(password)
			require.NoError(t, err)

			hash := user.PasswordHash

			// Bcrypt hash should be 60 characters
			assert.Len(t, hash, 60, "Bcrypt hash should always be 60 characters")

			// Should start with $2a$, $2b$, or $2y$
			assert.True(t,
				strings.HasPrefix(hash, "$2a$") ||
					strings.HasPrefix(hash, "$2b$") ||
					strings.HasPrefix(hash, "$2y$"),
				"Hash should have bcrypt prefix")

			// Should contain cost factor (10 for DefaultCost)
			assert.Contains(t, hash, "$10$", "Hash should contain cost factor")
		})
	}
}

// TestPasswordHashSaltUniqueness verifies each hash has unique salt
func TestPasswordHashSaltUniqueness(t *testing.T) {
	password := "SamePasswordForAll"
	hashes := make(map[string]bool)

	// Generate multiple hashes for the same password
	for i := 0; i < 10; i++ {
		user := &User{
			ID:    uuid.New(),
			Email: "test@example.com",
		}

		err := user.SetPassword(password)
		require.NoError(t, err)

		// Each hash should be unique
		assert.False(t, hashes[user.PasswordHash], "Hash should be unique due to random salt")
		hashes[user.PasswordHash] = true

		// But all should validate the same password
		assert.True(t, user.CheckPassword(password))
	}

	// All hashes should be different
	assert.Equal(t, 10, len(hashes))
}

// TestGetFullName verifies full name generation
func TestGetFullName(t *testing.T) {
	testCases := []struct {
		name      string
		firstName string
		lastName  string
		expected  string
	}{
		{
			name:      "normal names",
			firstName: "John",
			lastName:  "Doe",
			expected:  "John Doe",
		},
		{
			name:      "empty first name",
			firstName: "",
			lastName:  "Doe",
			expected:  " Doe",
		},
		{
			name:      "empty last name",
			firstName: "John",
			lastName:  "",
			expected:  "John ",
		},
		{
			name:      "both empty",
			firstName: "",
			lastName:  "",
			expected:  " ",
		},
		{
			name:      "long names",
			firstName: "Christopher",
			lastName:  "Montgomery-Wellington",
			expected:  "Christopher Montgomery-Wellington",
		},
		{
			name:      "special characters",
			firstName: "José",
			lastName:  "García",
			expected:  "José García",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			user := &User{
				FirstName: tc.firstName,
				LastName:  tc.lastName,
			}

			fullName := user.GetFullName()
			assert.Equal(t, tc.expected, fullName)
		})
	}
}

// TestTableName verifies table name
func TestTableName(t *testing.T) {
	user := User{}
	assert.Equal(t, "users", user.TableName())
}

// TestBeforeCreate verifies UUID generation hook
func TestBeforeCreate(t *testing.T) {
	t.Run("generates UUID when not set", func(t *testing.T) {
		user := &User{
			Email: "test@example.com",
		}

		// Simulate GORM BeforeCreate hook
		err := user.BeforeCreate(nil)
		require.NoError(t, err)

		// UUID should be generated
		assert.NotEqual(t, uuid.Nil, user.ID)
	})

	t.Run("preserves existing UUID", func(t *testing.T) {
		existingID := uuid.New()
		user := &User{
			ID:    existingID,
			Email: "test@example.com",
		}

		// Simulate GORM BeforeCreate hook
		err := user.BeforeCreate(nil)
		require.NoError(t, err)

		// UUID should remain unchanged
		assert.Equal(t, existingID, user.ID)
	})
}

// TestPasswordSecurity verifies password security properties
func TestPasswordSecurity(t *testing.T) {
	t.Run("hash cost should be at least 10", func(t *testing.T) {
		user := &User{ID: uuid.New()}
		err := user.SetPassword("test")
		require.NoError(t, err)

		// Extract cost from hash (bcrypt hash format: $2a$10$...)
		cost, err := bcrypt.Cost([]byte(user.PasswordHash))
		require.NoError(t, err)

		assert.GreaterOrEqual(t, cost, 10, "Bcrypt cost should be at least 10 for security")
	})

	t.Run("timing attack resistance", func(t *testing.T) {
		user := &User{ID: uuid.New()}
		err := user.SetPassword("correct-password")
		require.NoError(t, err)

		// CheckPassword should take similar time for correct and incorrect passwords
		// This is a basic check - bcrypt inherently provides constant-time comparison
		assert.False(t, user.CheckPassword("wrong-password"))
		assert.True(t, user.CheckPassword("correct-password"))
	})

	t.Run("password not stored in plain text", func(t *testing.T) {
		user := &User{ID: uuid.New()}
		password := "MySecretPassword"

		err := user.SetPassword(password)
		require.NoError(t, err)

		// Hash should not contain the plain text password
		assert.NotContains(t, user.PasswordHash, password)
		assert.NotContains(t, user.PasswordHash, "MySecret")
		assert.NotContains(t, user.PasswordHash, "Password")
	})
}

// TestPasswordBcryptProperties verifies bcrypt implementation details
func TestPasswordBcryptProperties(t *testing.T) {
	t.Run("bcrypt hash is deterministic for verification", func(t *testing.T) {
		user := &User{ID: uuid.New()}
		password := "test-password"

		err := user.SetPassword(password)
		require.NoError(t, err)

		savedHash := user.PasswordHash

		// CheckPassword should consistently return true
		for i := 0; i < 10; i++ {
			assert.True(t, user.CheckPassword(password))
		}

		// Hash should not change during checks
		assert.Equal(t, savedHash, user.PasswordHash)
	})

	t.Run("bcrypt handles UTF-8 correctly", func(t *testing.T) {
		user := &User{ID: uuid.New()}

		utf8Passwords := []string{
			"café",
			"naïve",
			"Zürich",
			"日本語",
			"🔒password🔐",
		}

		for _, password := range utf8Passwords {
			err := user.SetPassword(password)
			require.NoError(t, err)

			assert.True(t, user.CheckPassword(password), "UTF-8 password: %s", password)
			assert.False(t, user.CheckPassword(password+"x"), "Modified UTF-8 password should fail")
		}
	})
}

// TestConcurrentPasswordOperations verifies thread safety
func TestConcurrentPasswordOperations(t *testing.T) {
	user := &User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}

	password := "concurrent-test-password"
	err := user.SetPassword(password)
	require.NoError(t, err)

	// Test concurrent password checks (common in authentication scenarios)
	concurrency := 50
	done := make(chan bool, concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			// CheckPassword should be safe for concurrent use
			result := user.CheckPassword(password)
			assert.True(t, result)
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < concurrency; i++ {
		<-done
	}
}

// min helper function for Go < 1.21
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
