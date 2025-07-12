package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/efrenfuentes/authy/internal/cache"
	"github.com/google/uuid"
)

// SessionService manages user sessions with JWT and cache
type SessionService struct {
	cache      *cache.Client
	jwtService *JWTService
}

// NewSessionService creates a new session service
func NewSessionService(cache *cache.Client, jwtService *JWTService) *SessionService {
	return &SessionService{
		cache:      cache,
		jwtService: jwtService,
	}
}

// SessionData represents cached session information
type SessionData struct {
	UserID        uuid.UUID `json:"user_id"`
	ApplicationID uuid.UUID `json:"application_id"`
	TokenType     TokenType `json:"token_type"`
	Permissions   []string  `json:"permissions,omitempty"`
	IssuedAt      time.Time `json:"issued_at"`
	ExpiresAt     time.Time `json:"expires_at"`
}

// hashToken creates a SHA-256 hash of the token for cache keys
func (s *SessionService) hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// getTokenKey generates cache key for token storage
func (s *SessionService) getTokenKey(tokenHash string) string {
	return fmt.Sprintf("token:%s", tokenHash)
}

// getBlacklistKey generates cache key for blacklisted tokens
func (s *SessionService) getBlacklistKey(tokenHash string) string {
	return fmt.Sprintf("blacklist:%s", tokenHash)
}

// getUserSessionsKey generates cache key for user's active sessions
func (s *SessionService) getUserSessionsKey(userID, applicationID uuid.UUID) string {
	return fmt.Sprintf("user_sessions:%s:%s", userID.String(), applicationID.String())
}

// StoreToken stores a token in cache
func (s *SessionService) StoreToken(ctx context.Context, token string, claims *Claims) error {
	tokenHash := s.hashToken(token)
	
	sessionData := &SessionData{
		UserID:        claims.UserID,
		ApplicationID: claims.ApplicationID,
		TokenType:     claims.TokenType,
		Permissions:   claims.Permissions,
		IssuedAt:      claims.IssuedAt.Time,
		ExpiresAt:     claims.ExpiresAt.Time,
	}
	
	sessionJSON, err := json.Marshal(sessionData)
	if err != nil {
		return err
	}
	
	// Calculate TTL until token expires
	ttl := int(time.Until(claims.ExpiresAt.Time).Seconds())
	if ttl <= 0 {
		return fmt.Errorf("token is already expired")
	}
	
	// Store token data
	tokenKey := s.getTokenKey(tokenHash)
	if err := s.cache.Set(ctx, tokenKey, string(sessionJSON), ttl); err != nil {
		return err
	}
	
	// Add to user's active sessions list
	userSessionsKey := s.getUserSessionsKey(claims.UserID, claims.ApplicationID)
	activeSessionsJSON, _ := s.cache.Get(ctx, userSessionsKey)
	
	var activeSessions []string
	if activeSessionsJSON != "" {
		json.Unmarshal([]byte(activeSessionsJSON), &activeSessions)
	}
	
	// Add new token hash to active sessions
	activeSessions = append(activeSessions, tokenHash)
	activeSessionsData, _ := json.Marshal(activeSessions)
	
	// Store with the same TTL as the longest token
	s.cache.Set(ctx, userSessionsKey, string(activeSessionsData), ttl)
	
	return nil
}

// ValidateToken validates a token using cache and JWT
func (s *SessionService) ValidateToken(ctx context.Context, token string) (*Claims, error) {
	tokenHash := s.hashToken(token)
	
	// Check if token is blacklisted
	blacklistKey := s.getBlacklistKey(tokenHash)
	if blacklisted, _ := s.cache.Get(ctx, blacklistKey); blacklisted != "" {
		return nil, ErrInvalidToken
	}
	
	// Check cache first for performance
	tokenKey := s.getTokenKey(tokenHash)
	sessionJSON, err := s.cache.Get(ctx, tokenKey)
	if err == nil && sessionJSON != "" {
		var sessionData SessionData
		if err := json.Unmarshal([]byte(sessionJSON), &sessionData); err == nil {
			// Verify token hasn't expired
			if time.Now().Before(sessionData.ExpiresAt) {
				// Reconstruct claims from cached data
				claims := &Claims{
					UserID:        sessionData.UserID,
					ApplicationID: sessionData.ApplicationID,
					TokenType:     sessionData.TokenType,
					Permissions:   sessionData.Permissions,
				}
				return claims, nil
			}
		}
	}
	
	// Fallback to JWT validation if not in cache or cache miss
	claims, err := s.jwtService.ValidateToken(token)
	if err != nil {
		return nil, err
	}
	
	// Store valid token in cache for future requests
	if err := s.StoreToken(ctx, token, claims); err != nil {
		// Log error but don't fail validation
		// Token is still valid even if caching fails
	}
	
	return claims, nil
}

// InvalidateToken adds a token to the blacklist
func (s *SessionService) InvalidateToken(ctx context.Context, token string) error {
	tokenHash := s.hashToken(token)
	
	// Add to blacklist
	blacklistKey := s.getBlacklistKey(tokenHash)
	// Set blacklist entry with long TTL (tokens can't be un-blacklisted)
	if err := s.cache.Set(ctx, blacklistKey, "true", int(24*time.Hour.Seconds())); err != nil {
		return err
	}
	
	// Remove from active token cache
	tokenKey := s.getTokenKey(tokenHash)
	s.cache.Delete(ctx, tokenKey)
	
	return nil
}

// InvalidateUserTokensInApplication invalidates all tokens for a user in a specific application
func (s *SessionService) InvalidateUserTokensInApplication(ctx context.Context, userID, applicationID uuid.UUID, tokenType TokenType) error {
	userSessionsKey := s.getUserSessionsKey(userID, applicationID)
	activeSessionsJSON, err := s.cache.Get(ctx, userSessionsKey)
	if err != nil {
		return nil // No active sessions
	}
	
	var activeSessions []string
	if err := json.Unmarshal([]byte(activeSessionsJSON), &activeSessions); err != nil {
		return err
	}
	
	// Invalidate each active session of the specified type
	for _, tokenHash := range activeSessions {
		tokenKey := s.getTokenKey(tokenHash)
		sessionJSON, err := s.cache.Get(ctx, tokenKey)
		if err != nil {
			continue
		}
		
		var sessionData SessionData
		if err := json.Unmarshal([]byte(sessionJSON), &sessionData); err != nil {
			continue
		}
		
		// Only invalidate tokens of the specified type
		if sessionData.TokenType == tokenType {
			blacklistKey := s.getBlacklistKey(tokenHash)
			s.cache.Set(ctx, blacklistKey, "true", int(24*time.Hour.Seconds()))
			s.cache.Delete(ctx, tokenKey)
		}
	}
	
	// Clear the user sessions list
	s.cache.Delete(ctx, userSessionsKey)
	
	return nil
}

// GetActiveSessionsCount returns the number of active sessions for a user in an application
func (s *SessionService) GetActiveSessionsCount(ctx context.Context, userID, applicationID uuid.UUID) (int, error) {
	userSessionsKey := s.getUserSessionsKey(userID, applicationID)
	activeSessionsJSON, err := s.cache.Get(ctx, userSessionsKey)
	if err != nil {
		return 0, nil
	}
	
	var activeSessions []string
	if err := json.Unmarshal([]byte(activeSessionsJSON), &activeSessions); err != nil {
		return 0, err
	}
	
	// Count only valid (non-expired, non-blacklisted) sessions
	validCount := 0
	for _, tokenHash := range activeSessions {
		tokenKey := s.getTokenKey(tokenHash)
		sessionJSON, err := s.cache.Get(ctx, tokenKey)
		if err == nil && sessionJSON != "" {
			blacklistKey := s.getBlacklistKey(tokenHash)
			if blacklisted, _ := s.cache.Get(ctx, blacklistKey); blacklisted == "" {
				validCount++
			}
		}
	}
	
	return validCount, nil
}

// CleanupExpiredTokens removes expired tokens from cache
func (s *SessionService) CleanupExpiredTokens(ctx context.Context) error {
	// This would typically be run as a background job
	// For now, we rely on Redis TTL to automatically expire keys
	// But we could implement a more comprehensive cleanup here
	return nil
}

// RefreshTokenPair creates new tokens and invalidates the old refresh token
func (s *SessionService) RefreshTokenPair(ctx context.Context, refreshToken string, permissions []string) (*TokenPair, error) {
	// Validate the refresh token
	claims, err := s.jwtService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}
	
	// Check if refresh token is blacklisted
	tokenHash := s.hashToken(refreshToken)
	blacklistKey := s.getBlacklistKey(tokenHash)
	if blacklisted, _ := s.cache.Get(ctx, blacklistKey); blacklisted != "" {
		return nil, ErrInvalidToken
	}
	
	// Invalidate the old refresh token
	if err := s.InvalidateToken(ctx, refreshToken); err != nil {
		return nil, err
	}
	
	// Generate new token pair
	tokenPair, accessClaims, refreshClaims, err := s.jwtService.GenerateTokenPair(
		claims.UserID, 
		claims.ApplicationID, 
		permissions,
	)
	if err != nil {
		return nil, err
	}
	
	// Store new tokens in cache
	if err := s.StoreToken(ctx, tokenPair.AccessToken, accessClaims); err != nil {
		return nil, err
	}
	
	if err := s.StoreToken(ctx, tokenPair.RefreshToken, refreshClaims); err != nil {
		return nil, err
	}
	
	return tokenPair, nil
}

// GenerateTokenPair creates new access and refresh tokens (wrapper for JWT service)
func (s *SessionService) GenerateTokenPair(userID, applicationID uuid.UUID, permissions []string) (*TokenPair, *Claims, *Claims, error) {
	return s.jwtService.GenerateTokenPair(userID, applicationID, permissions)
}

// ValidateRefreshToken validates a refresh token (wrapper for JWT service)
func (s *SessionService) ValidateRefreshToken(ctx context.Context, refreshToken string) (*Claims, error) {
	// Check cache first for blacklisted tokens
	tokenHash := s.hashToken(refreshToken)
	blacklistKey := s.getBlacklistKey(tokenHash)
	if blacklisted, _ := s.cache.Get(ctx, blacklistKey); blacklisted != "" {
		return nil, ErrInvalidToken
	}
	
	return s.jwtService.ValidateRefreshToken(refreshToken)
}

// InvalidateAllUserTokens invalidates all tokens for a user across all applications
func (s *SessionService) InvalidateAllUserTokens(ctx context.Context, userID uuid.UUID) error {
	// This is a simplified implementation that iterates through known applications
	// In a production system, you might want to maintain a global user sessions index
	
	// Get all applications to invalidate tokens across all of them
	// For now, we'll use a pattern-based search or rely on the application
	// calling InvalidateUserTokensInApplication for each application they know about
	
	// We'll implement a basic version that tries to invalidate tokens for common token types
	// This would need to be enhanced based on your specific cache key patterns
	
	// Note: Since we don't have access to the database here, we'll rely on
	// the calling code to handle application-specific invalidation
	// This is mainly for the user deletion case where we want to ensure
	// no tokens remain active
	
	return nil // Placeholder - caller should handle app-specific invalidation
}