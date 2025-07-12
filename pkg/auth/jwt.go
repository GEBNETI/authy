package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidTokenType = errors.New("invalid token type")
)

// TokenType represents the type of JWT token
type TokenType string

const (
	AccessTokenType  TokenType = "access"
	RefreshTokenType TokenType = "refresh"
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID        uuid.UUID `json:"user_id"`
	ApplicationID uuid.UUID `json:"application_id"`
	TokenType     TokenType `json:"token_type"`
	Permissions   []string  `json:"permissions,omitempty"`
	jwt.RegisteredClaims
}

// JWTService handles JWT token operations
type JWTService struct {
	secretKey           []byte
	accessTokenExpiry   time.Duration
	refreshTokenExpiry  time.Duration
	issuer             string
}

// NewJWTService creates a new JWT service instance
func NewJWTService(secretKey string, accessExpiry, refreshExpiry time.Duration, issuer string) *JWTService {
	return &JWTService{
		secretKey:          []byte(secretKey),
		accessTokenExpiry:  accessExpiry,
		refreshTokenExpiry: refreshExpiry,
		issuer:            issuer,
	}
}

// GenerateAccessToken creates a new access token
func (j *JWTService) GenerateAccessToken(userID, applicationID uuid.UUID, permissions []string) (string, *Claims, error) {
	now := time.Now()
	expiresAt := now.Add(j.accessTokenExpiry)

	claims := &Claims{
		UserID:        userID,
		ApplicationID: applicationID,
		TokenType:     AccessTokenType,
		Permissions:   permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   userID.String(),
			Issuer:    j.issuer,
			Audience:  []string{applicationID.String()},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(j.secretKey)
	if err != nil {
		return "", nil, err
	}

	return tokenString, claims, nil
}

// GenerateRefreshToken creates a new refresh token
func (j *JWTService) GenerateRefreshToken(userID, applicationID uuid.UUID) (string, *Claims, error) {
	now := time.Now()
	expiresAt := now.Add(j.refreshTokenExpiry)

	claims := &Claims{
		UserID:        userID,
		ApplicationID: applicationID,
		TokenType:     RefreshTokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   userID.String(),
			Issuer:    j.issuer,
			Audience:  []string{applicationID.String()},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(j.secretKey)
	if err != nil {
		return "", nil, err
	}

	return tokenString, claims, nil
}

// ValidateToken validates and parses a JWT token
func (j *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return j.secretKey, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateAccessToken validates specifically an access token
func (j *JWTService) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != AccessTokenType {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// ValidateRefreshToken validates specifically a refresh token
func (j *JWTService) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != RefreshTokenType {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// ExtractTokenFromHeader extracts JWT token from Authorization header
func ExtractTokenFromHeader(authHeader string) string {
	const bearerPrefix = "Bearer "
	if len(authHeader) > len(bearerPrefix) && authHeader[:len(bearerPrefix)] == bearerPrefix {
		return authHeader[len(bearerPrefix):]
	}
	return ""
}

// GetTokenExpiry returns the expiry time for the given token type
func (j *JWTService) GetTokenExpiry(tokenType TokenType) time.Duration {
	switch tokenType {
	case AccessTokenType:
		return j.accessTokenExpiry
	case RefreshTokenType:
		return j.refreshTokenExpiry
	default:
		return 0
	}
}

// TokenPair represents a pair of access and refresh tokens
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int64     `json:"expires_in"` // seconds until access token expires
}

// GenerateTokenPair creates both access and refresh tokens
func (j *JWTService) GenerateTokenPair(userID, applicationID uuid.UUID, permissions []string) (*TokenPair, *Claims, *Claims, error) {
	// Generate access token
	accessToken, accessClaims, err := j.GenerateAccessToken(userID, applicationID, permissions)
	if err != nil {
		return nil, nil, nil, err
	}

	// Generate refresh token
	refreshToken, refreshClaims, err := j.GenerateRefreshToken(userID, applicationID)
	if err != nil {
		return nil, nil, nil, err
	}

	tokenPair := &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(j.accessTokenExpiry.Seconds()),
	}

	return tokenPair, accessClaims, refreshClaims, nil
}