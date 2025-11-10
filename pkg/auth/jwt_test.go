package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testSecretKey  = "test-secret-key-for-jwt-testing-only"
	testIssuer     = "test-authy-service"
	testAccessExp  = 15 * time.Minute
	testRefreshExp = 7 * 24 * time.Hour
)

func newTestJWTService() *JWTService {
	return NewJWTService(testSecretKey, testAccessExp, testRefreshExp, testIssuer)
}

// TestNewJWTService verifies JWT service initialization
func TestNewJWTService(t *testing.T) {
	service := NewJWTService(testSecretKey, testAccessExp, testRefreshExp, testIssuer)

	assert.NotNil(t, service)
	assert.Equal(t, []byte(testSecretKey), service.secretKey)
	assert.Equal(t, testAccessExp, service.accessTokenExpiry)
	assert.Equal(t, testRefreshExp, service.refreshTokenExpiry)
	assert.Equal(t, testIssuer, service.issuer)
}

// TestGenerateAccessToken verifies access token generation
func TestGenerateAccessToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()
	permissions := []string{"users:read", "users:write"}

	tokenString, claims, err := service.GenerateAccessToken(userID, appID, permissions)

	require.NoError(t, err)
	require.NotEmpty(t, tokenString)
	require.NotNil(t, claims)

	// Verify claims
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, appID, claims.ApplicationID)
	assert.Equal(t, AccessTokenType, claims.TokenType)
	assert.Equal(t, permissions, claims.Permissions)
	assert.Equal(t, testIssuer, claims.Issuer)
	assert.Equal(t, userID.String(), claims.Subject)
	assert.Contains(t, claims.Audience, appID.String())
	assert.NotEmpty(t, claims.ID)

	// Verify timestamps
	assert.NotNil(t, claims.IssuedAt)
	assert.NotNil(t, claims.ExpiresAt)
	assert.NotNil(t, claims.NotBefore)
	assert.True(t, claims.ExpiresAt.Time.After(claims.IssuedAt.Time))
}

// TestGenerateAccessToken_EmptyPermissions verifies token generation with no permissions
func TestGenerateAccessToken_EmptyPermissions(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	tokenString, claims, err := service.GenerateAccessToken(userID, appID, nil)

	require.NoError(t, err)
	require.NotEmpty(t, tokenString)
	assert.Nil(t, claims.Permissions)
}

// TestGenerateRefreshToken verifies refresh token generation
func TestGenerateRefreshToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	tokenString, claims, err := service.GenerateRefreshToken(userID, appID)

	require.NoError(t, err)
	require.NotEmpty(t, tokenString)
	require.NotNil(t, claims)

	// Verify claims
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, appID, claims.ApplicationID)
	assert.Equal(t, RefreshTokenType, claims.TokenType)
	assert.Nil(t, claims.Permissions) // Refresh tokens should not have permissions
	assert.Equal(t, testIssuer, claims.Issuer)
	assert.Equal(t, userID.String(), claims.Subject)
	assert.Contains(t, claims.Audience, appID.String())
	assert.NotEmpty(t, claims.ID)

	// Verify timestamps
	assert.NotNil(t, claims.IssuedAt)
	assert.NotNil(t, claims.ExpiresAt)
	assert.NotNil(t, claims.NotBefore)
	assert.True(t, claims.ExpiresAt.Time.After(claims.IssuedAt.Time))
}

// TestValidateToken verifies token validation for valid tokens
func TestValidateToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()
	permissions := []string{"users:read"}

	// Generate token
	tokenString, originalClaims, err := service.GenerateAccessToken(userID, appID, permissions)
	require.NoError(t, err)

	// Validate token
	validatedClaims, err := service.ValidateToken(tokenString)

	require.NoError(t, err)
	require.NotNil(t, validatedClaims)

	// Verify claims match
	assert.Equal(t, originalClaims.UserID, validatedClaims.UserID)
	assert.Equal(t, originalClaims.ApplicationID, validatedClaims.ApplicationID)
	assert.Equal(t, originalClaims.TokenType, validatedClaims.TokenType)
	assert.Equal(t, originalClaims.Permissions, validatedClaims.Permissions)
	assert.Equal(t, originalClaims.ID, validatedClaims.ID)
}

// TestValidateToken_InvalidToken verifies handling of invalid tokens
func TestValidateToken_InvalidToken(t *testing.T) {
	service := newTestJWTService()

	testCases := []struct {
		name  string
		token string
	}{
		{
			name:  "empty token",
			token: "",
		},
		{
			name:  "malformed token",
			token: "not.a.valid.jwt.token",
		},
		{
			name:  "random string",
			token: "random-string-not-jwt",
		},
		{
			name:  "incomplete token",
			token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			claims, err := service.ValidateToken(tc.token)

			assert.Error(t, err)
			assert.Nil(t, claims)
			assert.ErrorIs(t, err, ErrInvalidToken)
		})
	}
}

// TestValidateToken_WrongSecret verifies tokens signed with wrong secret are rejected
func TestValidateToken_WrongSecret(t *testing.T) {
	// Generate token with one service
	service1 := NewJWTService("secret1", testAccessExp, testRefreshExp, testIssuer)
	userID := uuid.New()
	appID := uuid.New()

	tokenString, _, err := service1.GenerateAccessToken(userID, appID, nil)
	require.NoError(t, err)

	// Try to validate with different service (different secret)
	service2 := NewJWTService("secret2", testAccessExp, testRefreshExp, testIssuer)
	claims, err := service2.ValidateToken(tokenString)

	assert.Error(t, err)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrInvalidToken)
}

// TestValidateToken_ExpiredToken verifies expired tokens are rejected
func TestValidateToken_ExpiredToken(t *testing.T) {
	// Create service with very short expiry
	shortExpiry := 1 * time.Millisecond
	service := NewJWTService(testSecretKey, shortExpiry, testRefreshExp, testIssuer)

	userID := uuid.New()
	appID := uuid.New()

	tokenString, _, err := service.GenerateAccessToken(userID, appID, nil)
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	// Validate expired token
	claims, err := service.ValidateToken(tokenString)

	assert.Error(t, err)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrExpiredToken)
}

// TestValidateAccessToken verifies access token validation
func TestValidateAccessToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	tokenString, originalClaims, err := service.GenerateAccessToken(userID, appID, nil)
	require.NoError(t, err)

	validatedClaims, err := service.ValidateAccessToken(tokenString)

	require.NoError(t, err)
	assert.Equal(t, originalClaims.UserID, validatedClaims.UserID)
	assert.Equal(t, AccessTokenType, validatedClaims.TokenType)
}

// TestValidateAccessToken_WithRefreshToken verifies refresh tokens are rejected
func TestValidateAccessToken_WithRefreshToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	// Generate refresh token
	refreshToken, _, err := service.GenerateRefreshToken(userID, appID)
	require.NoError(t, err)

	// Try to validate as access token
	claims, err := service.ValidateAccessToken(refreshToken)

	assert.Error(t, err)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrInvalidTokenType)
}

// TestValidateRefreshToken verifies refresh token validation
func TestValidateRefreshToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	tokenString, originalClaims, err := service.GenerateRefreshToken(userID, appID)
	require.NoError(t, err)

	validatedClaims, err := service.ValidateRefreshToken(tokenString)

	require.NoError(t, err)
	assert.Equal(t, originalClaims.UserID, validatedClaims.UserID)
	assert.Equal(t, RefreshTokenType, validatedClaims.TokenType)
}

// TestValidateRefreshToken_WithAccessToken verifies access tokens are rejected
func TestValidateRefreshToken_WithAccessToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	// Generate access token
	accessToken, _, err := service.GenerateAccessToken(userID, appID, nil)
	require.NoError(t, err)

	// Try to validate as refresh token
	claims, err := service.ValidateRefreshToken(accessToken)

	assert.Error(t, err)
	assert.Nil(t, claims)
	assert.ErrorIs(t, err, ErrInvalidTokenType)
}

// TestGenerateTokenPair verifies token pair generation
func TestGenerateTokenPair(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()
	permissions := []string{"users:read", "roles:write"}

	tokenPair, accessClaims, refreshClaims, err := service.GenerateTokenPair(userID, appID, permissions)

	require.NoError(t, err)
	require.NotNil(t, tokenPair)
	require.NotNil(t, accessClaims)
	require.NotNil(t, refreshClaims)

	// Verify token pair structure
	assert.NotEmpty(t, tokenPair.AccessToken)
	assert.NotEmpty(t, tokenPair.RefreshToken)
	assert.Equal(t, "Bearer", tokenPair.TokenType)
	assert.Equal(t, int64(testAccessExp.Seconds()), tokenPair.ExpiresIn)

	// Verify access claims
	assert.Equal(t, userID, accessClaims.UserID)
	assert.Equal(t, appID, accessClaims.ApplicationID)
	assert.Equal(t, AccessTokenType, accessClaims.TokenType)
	assert.Equal(t, permissions, accessClaims.Permissions)

	// Verify refresh claims
	assert.Equal(t, userID, refreshClaims.UserID)
	assert.Equal(t, appID, refreshClaims.ApplicationID)
	assert.Equal(t, RefreshTokenType, refreshClaims.TokenType)
	assert.Nil(t, refreshClaims.Permissions)

	// Verify both tokens can be validated
	validatedAccess, err := service.ValidateAccessToken(tokenPair.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, accessClaims.ID, validatedAccess.ID)

	validatedRefresh, err := service.ValidateRefreshToken(tokenPair.RefreshToken)
	require.NoError(t, err)
	assert.Equal(t, refreshClaims.ID, validatedRefresh.ID)
}

// TestExtractTokenFromHeader verifies token extraction from Authorization header
func TestExtractTokenFromHeader(t *testing.T) {
	testCases := []struct {
		name     string
		header   string
		expected string
	}{
		{
			name:     "valid Bearer token",
			header:   "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expected: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
		},
		{
			name:     "empty header",
			header:   "",
			expected: "",
		},
		{
			name:     "no Bearer prefix",
			header:   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expected: "",
		},
		{
			name:     "Bearer only",
			header:   "Bearer ",
			expected: "",
		},
		{
			name:     "wrong prefix",
			header:   "Basic dXNlcjpwYXNz",
			expected: "",
		},
		{
			name:     "lowercase bearer",
			header:   "bearer token",
			expected: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := ExtractTokenFromHeader(tc.header)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// TestGetTokenExpiry verifies token expiry retrieval
func TestGetTokenExpiry(t *testing.T) {
	service := newTestJWTService()

	testCases := []struct {
		name      string
		tokenType TokenType
		expected  time.Duration
	}{
		{
			name:      "access token",
			tokenType: AccessTokenType,
			expected:  testAccessExp,
		},
		{
			name:      "refresh token",
			tokenType: RefreshTokenType,
			expected:  testRefreshExp,
		},
		{
			name:      "invalid token type",
			tokenType: TokenType("invalid"),
			expected:  0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			expiry := service.GetTokenExpiry(tc.tokenType)
			assert.Equal(t, tc.expected, expiry)
		})
	}
}

// TestTokenUniqueness verifies each generated token is unique
func TestTokenUniqueness(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	tokens := make(map[string]bool)
	iterations := 100

	for i := 0; i < iterations; i++ {
		token, _, err := service.GenerateAccessToken(userID, appID, nil)
		require.NoError(t, err)

		// Check token is unique
		assert.False(t, tokens[token], "Duplicate token generated")
		tokens[token] = true
	}

	assert.Equal(t, iterations, len(tokens))
}

// TestConcurrentTokenGeneration verifies thread-safe token generation
func TestConcurrentTokenGeneration(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	concurrency := 50
	tokens := make(chan string, concurrency)
	errors := make(chan error, concurrency)

	// Generate tokens concurrently
	for i := 0; i < concurrency; i++ {
		go func() {
			token, _, err := service.GenerateAccessToken(userID, appID, nil)
			if err != nil {
				errors <- err
				return
			}
			tokens <- token
		}()
	}

	// Collect results
	uniqueTokens := make(map[string]bool)
	for i := 0; i < concurrency; i++ {
		select {
		case token := <-tokens:
			uniqueTokens[token] = true
		case err := <-errors:
			t.Fatalf("Error generating token: %v", err)
		case <-time.After(5 * time.Second):
			t.Fatal("Timeout waiting for token generation")
		}
	}

	// Verify all tokens are unique
	assert.Equal(t, concurrency, len(uniqueTokens))
}

// TestTokenValidation_ManipulatedToken verifies manipulated tokens are rejected
func TestTokenValidation_ManipulatedToken(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	tokenString, _, err := service.GenerateAccessToken(userID, appID, nil)
	require.NoError(t, err)

	// Manipulate the token by changing a character
	if len(tokenString) > 10 {
		manipulated := tokenString[:len(tokenString)-5] + "X" + tokenString[len(tokenString)-4:]

		claims, err := service.ValidateToken(manipulated)
		assert.Error(t, err)
		assert.Nil(t, claims)
		assert.ErrorIs(t, err, ErrInvalidToken)
	}
}

// TestTokenValidation_WrongSigningMethod verifies tokens with wrong signing method are rejected
func TestTokenValidation_WrongSigningMethod(t *testing.T) {
	service := newTestJWTService()
	userID := uuid.New()
	appID := uuid.New()

	// Create token with RS256 instead of HS256
	claims := &Claims{
		UserID:        userID,
		ApplicationID: appID,
		TokenType:     AccessTokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}

	// Use wrong signing method (RS256 requires private key, will fail)
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tokenString := token.Raw // This won't have a valid signature

	// Create a token string manually (this is just for testing)
	// In practice, RS256 tokens would be rejected at signing
	tokenString = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIiwiYXBwbGljYXRpb25faWQiOiI0NTYifQ.signature"

	validatedClaims, err := service.ValidateToken(tokenString)
	assert.Error(t, err)
	assert.Nil(t, validatedClaims)
}

// TestTokenExpiration_BoundaryConditions verifies token expiration edge cases
func TestTokenExpiration_BoundaryConditions(t *testing.T) {
	// Test token that expires in 2 seconds (more reliable than 1 second)
	service := NewJWTService(testSecretKey, 2*time.Second, testRefreshExp, testIssuer)
	userID := uuid.New()
	appID := uuid.New()

	tokenString, claims, err := service.GenerateAccessToken(userID, appID, nil)
	require.NoError(t, err)

	// Should be valid immediately
	validClaims, err := service.ValidateToken(tokenString)
	require.NoError(t, err)
	assert.Equal(t, claims.ID, validClaims.ID)

	// Wait until halfway through the expiration period
	time.Sleep(1000 * time.Millisecond)

	// Should still be valid
	validClaims, err = service.ValidateToken(tokenString)
	require.NoError(t, err)
	assert.Equal(t, claims.ID, validClaims.ID)

	// Wait until well after expiration (1.5 seconds more)
	time.Sleep(1500 * time.Millisecond)

	// Should now be expired
	validClaims, err = service.ValidateToken(tokenString)
	assert.Error(t, err)
	assert.Nil(t, validClaims)
	assert.ErrorIs(t, err, ErrExpiredToken)
}
