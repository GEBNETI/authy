package handlers

import (
	"context"
	"time"

	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/models"
	"github.com/efrenfuentes/authy/pkg/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required"`
	Application string `json:"application" validate:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Success      bool              `json:"success"`
	Message      string            `json:"message"`
	TokenPair    *auth.TokenPair   `json:"token_pair,omitempty"`
	User         *UserInfo         `json:"user,omitempty"`
	Application  *ApplicationInfo  `json:"application,omitempty"`
	Permissions  []string          `json:"permissions,omitempty"`
}

// UserInfo represents user information in responses
type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	IsActive  bool      `json:"is_active"`
}

// ApplicationInfo represents application information in responses
type ApplicationInfo struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
}

// LogoutRequest represents the logout request payload
type LogoutRequest struct {
	Token string `json:"token"`
}

// RefreshRequest represents the refresh token request payload
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// ValidateRequest represents the token validation request payload
type ValidateRequest struct {
	Token string `json:"token" validate:"required"`
}

// ValidateResponse represents the token validation response
type ValidateResponse struct {
	Valid       bool         `json:"valid"`
	User        *UserInfo    `json:"user,omitempty"`
	Application *ApplicationInfo `json:"application,omitempty"`
	Permissions []string     `json:"permissions,omitempty"`
	ExpiresAt   *time.Time   `json:"expires_at,omitempty"`
}

// Login handles user authentication and token generation
// @Summary User login
// @Description Authenticate user and generate JWT tokens
// @Tags Authentication
// @Accept json
// @Produce json
// @Param login body LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse "Successful login"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Invalid credentials"
// @Failure 429 {object} ErrorResponse "Rate limit exceeded"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Get client IP for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Find the application
	var app models.Application
	if err := h.db.Where("name = ?", req.Application).First(&app).Error; err != nil {
		// Log failed login attempt
		models.CreateAuditLog(h.db, nil, nil, models.ActionLoginFailed, "authentication", nil,
			map[string]interface{}{
				"email":       req.Email,
				"application": req.Application,
				"reason":      "application_not_found",
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid application",
		})
	}

	// Find the user
	var user models.User
	if err := h.db.Where("email = ? AND is_active = true", req.Email).First(&user).Error; err != nil {
		// Log failed login attempt
		models.CreateAuditLog(h.db, nil, &app.ID, models.ActionLoginFailed, "authentication", nil,
			map[string]interface{}{
				"email":  req.Email,
				"reason": "user_not_found",
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid credentials",
		})
	}

	// Verify password
	if !user.CheckPassword(req.Password) {
		// Log failed login attempt
		models.CreateAuditLog(h.db, &user.ID, &app.ID, models.ActionLoginFailed, "authentication", nil,
			map[string]interface{}{
				"email":  req.Email,
				"reason": "invalid_password",
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid credentials",
		})
	}

	// Get user permissions for this application
	permissions, err := h.getUserPermissions(user.ID, app.ID)
	if err != nil {
		h.logger.Error("Failed to get user permissions", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Internal server error",
		})
	}

	// Generate token pair
	tokenPair, accessClaims, refreshClaims, err := h.sessionService.GenerateTokenPair(user.ID, app.ID, permissions)
	if err != nil {
		h.logger.Error("Failed to generate tokens", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to generate tokens",
		})
	}

	// Store tokens in cache
	ctx := context.Background()
	if err := h.sessionService.StoreToken(ctx, tokenPair.AccessToken, accessClaims); err != nil {
		h.logger.Error("Failed to store access token", "error", err)
	}

	if err := h.sessionService.StoreToken(ctx, tokenPair.RefreshToken, refreshClaims); err != nil {
		h.logger.Error("Failed to store refresh token", "error", err)
	}

	// Store tokens in database for audit trail
	accessToken := &models.Token{
		UserID:        user.ID,
		ApplicationID: app.ID,
		TokenType:     models.AccessToken,
		ExpiresAt:     accessClaims.ExpiresAt.Time,
	}
	accessToken.HashToken(tokenPair.AccessToken)

	refreshToken := &models.Token{
		UserID:        user.ID,
		ApplicationID: app.ID,
		TokenType:     models.RefreshToken,
		ExpiresAt:     refreshClaims.ExpiresAt.Time,
	}
	refreshToken.HashToken(tokenPair.RefreshToken)

	if err := h.db.Create(accessToken).Error; err != nil {
		h.logger.Error("Failed to store access token in database", "error", err)
	}

	if err := h.db.Create(refreshToken).Error; err != nil {
		h.logger.Error("Failed to store refresh token in database", "error", err)
	}

	// Log successful login
	models.CreateAuditLog(h.db, &user.ID, &app.ID, models.ActionLogin, "authentication", nil,
		map[string]interface{}{
			"email":         req.Email,
			"token_id":      accessClaims.ID,
			"expires_at":    accessClaims.ExpiresAt.Time,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(LoginResponse{
		Success:   true,
		Message:   "Login successful",
		TokenPair: tokenPair,
		User: &UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		},
		Application: &ApplicationInfo{
			ID:          app.ID,
			Name:        app.Name,
			Description: app.Description,
		},
		Permissions: permissions,
	})
}

// Logout handles token invalidation
// @Summary User logout
// @Description Invalidate user tokens for current application
// @Tags Authentication
// @Accept json
// @Produce json
// @Param logout body LogoutRequest false "Logout request"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "Successful logout"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// Extract user info from middleware
	userID, applicationID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get the token from header
	authHeader := c.Get("Authorization")
	token := auth.ExtractTokenFromHeader(authHeader)

	// Get client IP for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Invalidate the current access token
	if err := h.sessionService.InvalidateToken(context.Background(), token); err != nil {
		h.logger.Error("Failed to invalidate token", "error", err)
	}

	// Invalidate all access tokens for this user in this application
	if err := h.sessionService.InvalidateUserTokensInApplication(context.Background(), userID, applicationID, auth.AccessTokenType); err != nil {
		h.logger.Error("Failed to invalidate user tokens", "error", err)
	}

	// Update tokens in database
	if err := models.InvalidateUserTokensInApplication(h.db, userID, applicationID, models.AccessToken); err != nil {
		h.logger.Error("Failed to invalidate tokens in database", "error", err)
	}

	// Log logout
	models.CreateAuditLog(h.db, &userID, &applicationID, models.ActionLogout, "authentication", nil,
		map[string]interface{}{
			"method": "logout_endpoint",
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "Logout successful",
	})
}

// RefreshToken handles token refresh
// @Summary Refresh access token
// @Description Generate new access token using refresh token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param refresh body RefreshRequest true "Refresh token request"
// @Success 200 {object} LoginResponse "New token pair"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Invalid refresh token"
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Get client IP for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Get user permissions for new token
	claims, err := h.sessionService.ValidateRefreshToken(context.Background(), req.RefreshToken)
	if err != nil {
		models.CreateAuditLog(h.db, nil, nil, models.ActionTokenRefresh, "authentication", nil,
			map[string]interface{}{
				"reason": "invalid_refresh_token",
				"error":  err.Error(),
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid refresh token",
		})
	}

	// Get updated user permissions
	permissions, err := h.getUserPermissions(claims.UserID, claims.ApplicationID)
	if err != nil {
		h.logger.Error("Failed to get user permissions", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Internal server error",
		})
	}

	// Generate new token pair and invalidate old refresh token
	tokenPair, err := h.sessionService.RefreshTokenPair(context.Background(), req.RefreshToken, permissions)
	if err != nil {
		models.CreateAuditLog(h.db, &claims.UserID, &claims.ApplicationID, models.ActionTokenRefresh, "authentication", nil,
			map[string]interface{}{
				"reason": "refresh_failed",
				"error":  err.Error(),
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Token refresh failed",
		})
	}

	// Get user and application info for response
	var user models.User
	var app models.Application

	h.db.First(&user, claims.UserID)
	h.db.First(&app, claims.ApplicationID)

	// Log successful token refresh
	models.CreateAuditLog(h.db, &claims.UserID, &claims.ApplicationID, models.ActionTokenRefresh, "authentication", nil,
		map[string]interface{}{
			"success": true,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(LoginResponse{
		Success:   true,
		Message:   "Token refreshed successfully",
		TokenPair: tokenPair,
		User: &UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		},
		Application: &ApplicationInfo{
			ID:          app.ID,
			Name:        app.Name,
			Description: app.Description,
		},
		Permissions: permissions,
	})
}

// ValidateToken handles token validation
// @Summary Validate access token
// @Description Validate token and return user information
// @Tags Authentication
// @Accept json
// @Produce json
// @Param validate body ValidateRequest true "Token validation request"
// @Success 200 {object} ValidateResponse "Token validation result"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Router /auth/validate [post]
func (h *AuthHandler) ValidateToken(c *fiber.Ctx) error {
	var req ValidateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Get client IP for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Validate the token
	claims, err := h.sessionService.ValidateToken(context.Background(), req.Token)
	if err != nil {
		models.CreateAuditLog(h.db, nil, nil, models.ActionTokenValidate, "authentication", nil,
			map[string]interface{}{
				"valid":  false,
				"reason": err.Error(),
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusOK).JSON(ValidateResponse{
			Valid: false,
		})
	}

	// Get user and application info
	var user models.User
	var app models.Application

	if err := h.db.First(&user, claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusOK).JSON(ValidateResponse{
			Valid: false,
		})
	}

	if err := h.db.First(&app, claims.ApplicationID).Error; err != nil {
		return c.Status(fiber.StatusOK).JSON(ValidateResponse{
			Valid: false,
		})
	}

	// Log successful validation
	models.CreateAuditLog(h.db, &claims.UserID, &claims.ApplicationID, models.ActionTokenValidate, "authentication", nil,
		map[string]interface{}{
			"valid": true,
		}, &clientIP, &userAgent)

	expiresAt := claims.ExpiresAt.Time
	return c.Status(fiber.StatusOK).JSON(ValidateResponse{
		Valid: true,
		User: &UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		},
		Application: &ApplicationInfo{
			ID:          app.ID,
			Name:        app.Name,
			Description: app.Description,
		},
		Permissions: claims.Permissions,
		ExpiresAt:   &expiresAt,
	})
}

// getUserPermissions retrieves user permissions for a specific application
func (h *AuthHandler) getUserPermissions(userID, applicationID uuid.UUID) ([]string, error) {
	var userRoles []models.UserRole
	err := h.db.Preload("Role").
		Where("user_id = ? AND application_id = ?", userID, applicationID).
		Find(&userRoles).Error
	if err != nil {
		return nil, err
	}

	var allPermissions []string
	for _, userRole := range userRoles {
		if userRole.Role != nil {
			permissions, err := userRole.Role.GetPermissions()
			if err != nil {
				continue
			}
			
			for _, perm := range permissions {
				for _, action := range perm.Actions {
					permString := perm.Resource + ":" + action
					allPermissions = append(allPermissions, permString)
				}
			}
		}
	}

	return allPermissions, nil
}