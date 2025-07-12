package handlers

import (
	"strconv"
	"time"

	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateApplicationRequest represents the create application request payload
type CreateApplicationRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=100"`
	Description string `json:"description" validate:"max=500"`
}

// UpdateApplicationRequest represents the update application request payload  
type UpdateApplicationRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=500"`
}

// ApplicationResponse represents an application in API responses
type ApplicationResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"is_system"`
	APIKey      string    `json:"api_key,omitempty"` // Only shown to admins
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	UserCount   int64     `json:"user_count,omitempty"`
	RoleCount   int64     `json:"role_count,omitempty"`
}

// ApplicationWithStatsResponse represents an application with detailed statistics
type ApplicationWithStatsResponse struct {
	ApplicationResponse
	Statistics ApplicationStats `json:"statistics"`
}

// ApplicationStats represents application usage statistics
type ApplicationStats struct {
	TotalUsers        int64 `json:"total_users"`
	ActiveUsers       int64 `json:"active_users"`
	TotalRoles        int64 `json:"total_roles"`
	TotalPermissions  int64 `json:"total_permissions"`
	RecentLogins      int64 `json:"recent_logins_24h"`
}

// ApplicationsListResponse represents the paginated applications list response
type ApplicationsListResponse struct {
	Success      bool                  `json:"success"`
	Message      string                `json:"message"`
	Applications []ApplicationResponse `json:"applications"`
	Pagination   PaginationMeta        `json:"pagination"`
}

// RegenerateAPIKeyResponse represents the API key regeneration response
type RegenerateAPIKeyResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	APIKey  string `json:"api_key"`
}

// GetApplications handles listing applications with pagination and filtering
// @Summary List applications
// @Description Get paginated list of applications with optional filtering and statistics
// @Tags Applications
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(10)
// @Param search query string false "Search term for name or description"
// @Param include_system query bool false "Include system applications" default(true)
// @Param include_stats query bool false "Include usage statistics" default(false)
// @Security BearerAuth
// @Success 200 {object} ApplicationsListResponse "Applications list"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /applications [get]
func (h *ApplicationHandler) GetApplications(c *fiber.Ctx) error {
	// Extract user context
	currentUserID, currentAppID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "10"))
	search := c.Query("search", "")
	includeSystem, _ := strconv.ParseBool(c.Query("include_system", "true"))
	includeStats, _ := strconv.ParseBool(c.Query("include_stats", "false"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	offset := (page - 1) * perPage

	// Build query
	query := h.db.Model(&models.Application{})

	// Apply filters
	if search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if !includeSystem {
		query = query.Where("is_system = false")
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logger.Error("Failed to count applications", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve applications",
		})
	}

	// Get applications
	var applications []models.Application
	if err := query.Order("created_at DESC").Limit(perPage).Offset(offset).Find(&applications).Error; err != nil {
		h.logger.Error("Failed to retrieve applications", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve applications",
		})
	}

	// Check if user has admin permissions to see API keys
	hasAdminPermission, err := models.HasUserPermission(h.db, currentUserID, currentAppID, "applications", "admin")
	if err != nil {
		h.logger.Error("Failed to check admin permission", "error", err)
		hasAdminPermission = false
	}

	// Convert to response format
	var applicationResponses []ApplicationResponse
	for _, app := range applications {
		appResponse := ApplicationResponse{
			ID:          app.ID,
			Name:        app.Name,
			Description: app.Description,
			IsSystem:    app.IsSystem,
			CreatedAt:   app.CreatedAt,
			UpdatedAt:   app.UpdatedAt,
		}

		// Only include API key for admins
		if hasAdminPermission {
			appResponse.APIKey = app.APIKey
		}

		// Include statistics if requested
		if includeStats {
			userCount, _ := app.GetUserCount(h.db)
			roleCount, _ := app.GetRoleCount(h.db)
			appResponse.UserCount = userCount
			appResponse.RoleCount = roleCount
		}

		applicationResponses = append(applicationResponses, appResponse)
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return c.Status(fiber.StatusOK).JSON(ApplicationsListResponse{
		Success:      true,
		Message:      "Applications retrieved successfully",
		Applications: applicationResponses,
		Pagination: PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// CreateApplication handles creating a new application
// @Summary Create application
// @Description Register a new application in the system
// @Tags Applications
// @Accept json
// @Produce json
// @Param application body CreateApplicationRequest true "Application data"
// @Security BearerAuth
// @Success 201 {object} ApplicationResponse "Created application"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 409 {object} ErrorResponse "Application name already exists"
// @Router /applications [post]
func (h *ApplicationHandler) CreateApplication(c *fiber.Ctx) error {
	var req CreateApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Extract user context for audit logging
	currentUserID, applicationID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get client info for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Check if application name already exists
	var existingApp models.Application
	if err := h.db.Where("name = ?", req.Name).First(&existingApp).Error; err == nil {
		models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionApplicationCreate, "application", nil,
			map[string]interface{}{
				"name":   req.Name,
				"reason": "name_already_exists",
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
			Error:   true,
			Message: "Application name already exists",
		})
	}

	// Create new application
	application := models.Application{
		Name:        req.Name,
		Description: req.Description,
		IsSystem:    false, // New applications are never system applications
	}

	// Save application to database (API key will be auto-generated)
	if err := h.db.Create(&application).Error; err != nil {
		h.logger.Error("Failed to create application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to create application",
		})
	}

	// Log successful creation
	appIDStr := application.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionApplicationCreate, "application",
		&appIDStr,
		map[string]interface{}{
			"name":        application.Name,
			"description": application.Description,
			"api_key":     application.APIKey,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusCreated).JSON(ApplicationResponse{
		ID:          application.ID,
		Name:        application.Name,
		Description: application.Description,
		IsSystem:    application.IsSystem,
		APIKey:      application.APIKey,
		CreatedAt:   application.CreatedAt,
		UpdatedAt:   application.UpdatedAt,
	})
}

// GetApplication handles retrieving a specific application
// @Summary Get application
// @Description Get a specific application by ID with detailed statistics
// @Tags Applications
// @Accept json
// @Produce json
// @Param id path string true "Application ID"
// @Param include_stats query bool false "Include detailed statistics" default(true)
// @Security BearerAuth
// @Success 200 {object} ApplicationWithStatsResponse "Application details"
// @Failure 400 {object} ErrorResponse "Invalid application ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Application not found"
// @Router /applications/{id} [get]
func (h *ApplicationHandler) GetApplication(c *fiber.Ctx) error {
	applicationIDStr := c.Params("id")
	applicationID, err := uuid.Parse(applicationIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid application ID",
		})
	}

	// Extract user context
	currentUserID, currentAppID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	includeStats, _ := strconv.ParseBool(c.Query("include_stats", "true"))

	// Get application
	var application models.Application
	if err := h.db.First(&application, applicationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Application not found",
			})
		}
		h.logger.Error("Failed to retrieve application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve application",
		})
	}

	// Check if user has admin permissions to see API key
	hasAdminPermission, err := models.HasUserPermission(h.db, currentUserID, currentAppID, "applications", "admin")
	if err != nil {
		h.logger.Error("Failed to check admin permission", "error", err)
		hasAdminPermission = false
	}

	response := ApplicationWithStatsResponse{
		ApplicationResponse: ApplicationResponse{
			ID:          application.ID,
			Name:        application.Name,
			Description: application.Description,
			IsSystem:    application.IsSystem,
			CreatedAt:   application.CreatedAt,
			UpdatedAt:   application.UpdatedAt,
		},
	}

	// Only include API key for admins
	if hasAdminPermission {
		response.APIKey = application.APIKey
	}

	// Include detailed statistics if requested
	if includeStats {
		userCount, _ := application.GetUserCount(h.db)
		roleCount, _ := application.GetRoleCount(h.db)

		// Get active users (users who logged in within 24 hours)
		var activeUsers int64
		h.db.Table("audit_logs").
			Where("application_id = ? AND action = ? AND created_at > ?", 
				applicationID, models.ActionLogin, time.Now().Add(-24*time.Hour)).
			Distinct("user_id").
			Count(&activeUsers)

		// Get total permissions for this application
		var totalPermissions int64
		h.db.Table("role_permissions").
			Joins("JOIN roles ON roles.id = role_permissions.role_id").
			Where("roles.application_id = ?", applicationID).
			Distinct("role_permissions.permission_id").
			Count(&totalPermissions)

		// Get recent logins (24h)
		var recentLogins int64
		h.db.Model(&models.AuditLog{}).
			Where("application_id = ? AND action = ? AND created_at > ?",
				applicationID, models.ActionLogin, time.Now().Add(-24*time.Hour)).
			Count(&recentLogins)

		response.Statistics = ApplicationStats{
			TotalUsers:       userCount,
			ActiveUsers:      activeUsers,
			TotalRoles:       roleCount,
			TotalPermissions: totalPermissions,
			RecentLogins:     recentLogins,
		}
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// UpdateApplication handles updating an application
// @Summary Update application
// @Description Update application information (system applications have restrictions)
// @Tags Applications
// @Accept json
// @Produce json
// @Param id path string true "Application ID"
// @Param application body UpdateApplicationRequest true "Application update data"
// @Security BearerAuth
// @Success 200 {object} ApplicationResponse "Updated application"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Application not found"
// @Failure 409 {object} ErrorResponse "Application name already exists"
// @Router /applications/{id} [put]
func (h *ApplicationHandler) UpdateApplication(c *fiber.Ctx) error {
	applicationIDStr := c.Params("id")
	applicationID, err := uuid.Parse(applicationIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid application ID",
		})
	}

	var req UpdateApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Extract user context for audit logging
	currentUserID, currentAppID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get client info for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Get existing application
	var application models.Application
	if err := h.db.First(&application, applicationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Application not found",
			})
		}
		h.logger.Error("Failed to retrieve application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to update application",
		})
	}

	// Store original values for audit logging
	originalValues := map[string]interface{}{
		"name":        application.Name,
		"description": application.Description,
	}

	// Prevent modification of system application name
	if application.IsSystem && req.Name != nil && *req.Name != application.Name {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Cannot modify name of system application",
		})
	}

	// Check name uniqueness if name is being updated
	if req.Name != nil && *req.Name != application.Name {
		var existingApp models.Application
		if err := h.db.Where("name = ? AND id != ?", *req.Name, applicationID).First(&existingApp).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Error:   true,
				Message: "Application name already exists",
			})
		}
		application.Name = *req.Name
	}

	// Update fields if provided
	if req.Description != nil {
		application.Description = *req.Description
	}

	// Save updates
	if err := h.db.Save(&application).Error; err != nil {
		h.logger.Error("Failed to update application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to update application",
		})
	}

	// Log the update
	newValues := map[string]interface{}{
		"name":        application.Name,
		"description": application.Description,
	}

	appIDStr := application.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &currentAppID, models.ActionApplicationUpdate, "application",
		&appIDStr,
		map[string]interface{}{
			"original": originalValues,
			"updated":  newValues,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(ApplicationResponse{
		ID:          application.ID,
		Name:        application.Name,
		Description: application.Description,
		IsSystem:    application.IsSystem,
		CreatedAt:   application.CreatedAt,
		UpdatedAt:   application.UpdatedAt,
	})
}

// DeleteApplication handles deleting an application
// @Summary Delete application
// @Description Delete an application (system applications cannot be deleted)
// @Tags Applications
// @Accept json
// @Produce json
// @Param id path string true "Application ID"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "Application deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid application ID or system application"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Application not found"
// @Router /applications/{id} [delete]
func (h *ApplicationHandler) DeleteApplication(c *fiber.Ctx) error {
	applicationIDStr := c.Params("id")
	applicationID, err := uuid.Parse(applicationIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid application ID",
		})
	}

	// Extract user context for audit logging
	currentUserID, currentAppID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get client info for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Get application to delete
	var application models.Application
	if err := h.db.First(&application, applicationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Application not found",
			})
		}
		h.logger.Error("Failed to retrieve application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete application",
		})
	}

	// Prevent deletion of system applications
	if application.IsSystem {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Cannot delete system applications",
		})
	}

	// Delete the application (this will cascade to related records)
	if err := h.db.Delete(&application).Error; err != nil {
		h.logger.Error("Failed to delete application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete application",
		})
	}

	// Log the deletion
	appIDStr := application.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &currentAppID, models.ActionApplicationDelete, "application",
		&appIDStr,
		map[string]interface{}{
			"name":        application.Name,
			"description": application.Description,
			"api_key":     application.APIKey,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "Application deleted successfully",
	})
}

// RegenerateAPIKey handles regenerating an application's API key
// @Summary Regenerate API key
// @Description Generate a new API key for an application
// @Tags Applications
// @Accept json
// @Produce json
// @Param id path string true "Application ID"
// @Security BearerAuth
// @Success 200 {object} RegenerateAPIKeyResponse "New API key generated"
// @Failure 400 {object} ErrorResponse "Invalid application ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Application not found"
// @Router /applications/{id}/regenerate-key [post]
func (h *ApplicationHandler) RegenerateAPIKey(c *fiber.Ctx) error {
	applicationIDStr := c.Params("id")
	applicationID, err := uuid.Parse(applicationIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid application ID",
		})
	}

	// Extract user context for audit logging
	currentUserID, currentAppID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get client info for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Get application
	var application models.Application
	if err := h.db.First(&application, applicationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Application not found",
			})
		}
		h.logger.Error("Failed to retrieve application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to regenerate API key",
		})
	}

	// Store old API key for audit
	oldAPIKey := application.APIKey

	// Regenerate API key
	if err := application.RegenerateAPIKey(); err != nil {
		h.logger.Error("Failed to generate new API key", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to regenerate API key",
		})
	}

	// Save updated application
	if err := h.db.Save(&application).Error; err != nil {
		h.logger.Error("Failed to save new API key", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to regenerate API key",
		})
	}

	// Log the API key regeneration
	appIDStr := application.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &currentAppID, models.ActionApplicationUpdate, "application",
		&appIDStr,
		map[string]interface{}{
			"action":      "regenerate_api_key",
			"old_api_key": oldAPIKey[:10] + "...", // Log only prefix for security
			"new_api_key": application.APIKey[:10] + "...",
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(RegenerateAPIKeyResponse{
		Success: true,
		Message: "API key regenerated successfully",
		APIKey:  application.APIKey,
	})
}