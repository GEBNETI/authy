package handlers

import (
	"strconv"

	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/models"
	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PermissionHandler handles permission-related requests
type PermissionHandler struct {
	db     *gorm.DB
	logger *logger.Logger
}

// NewPermissionHandler creates a new permission handler
func NewPermissionHandler(db *gorm.DB, logger *logger.Logger) *PermissionHandler {
	return &PermissionHandler{
		db:     db,
		logger: logger,
	}
}

// CreatePermissionRequest represents the create permission request payload
type CreatePermissionRequest struct {
	Resource    string `json:"resource" validate:"required"`
	Action      string `json:"action" validate:"required"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// PermissionResponse represents a permission in API responses
type PermissionResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	IsSystem    bool      `json:"is_system"`
}

// PermissionsListResponse represents the paginated permissions list response
type PermissionsListResponse struct {
	Success     bool                 `json:"success"`
	Message     string               `json:"message"`
	Permissions []PermissionResponse `json:"permissions"`
	Pagination  PaginationMeta       `json:"pagination"`
}

// GetPermissions handles listing permissions with pagination and filtering
// @Summary List permissions
// @Description Get paginated list of permissions with optional filtering
// @Tags Permissions
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(10)
// @Param category query string false "Filter by category"
// @Param resource query string false "Filter by resource"
// @Security BearerAuth
// @Success 200 {object} PermissionsListResponse "Permissions list"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /permissions [get]
func (h *PermissionHandler) GetPermissions(c *fiber.Ctx) error {
	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "10"))
	category := c.Query("category", "")
	resource := c.Query("resource", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	offset := (page - 1) * perPage

	// Build query
	query := h.db.Model(&models.Permission{})

	// Apply filters
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logger.Error("Failed to count permissions", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve permissions",
		})
	}

	// Get permissions
	var permissions []models.Permission
	if err := query.Order("category, resource, action").Limit(perPage).Offset(offset).Find(&permissions).Error; err != nil {
		h.logger.Error("Failed to retrieve permissions", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve permissions",
		})
	}

	// Convert to response format
	var permissionResponses []PermissionResponse
	for _, permission := range permissions {
		permissionResponses = append(permissionResponses, PermissionResponse{
			ID:          permission.ID,
			Name:        permission.Name,
			Resource:    permission.Resource,
			Action:      permission.Action,
			Description: permission.Description,
			Category:    permission.Category,
			IsSystem:    permission.IsSystem,
		})
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return c.Status(fiber.StatusOK).JSON(PermissionsListResponse{
		Success:     true,
		Message:     "Permissions retrieved successfully",
		Permissions: permissionResponses,
		Pagination: PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// CreatePermission handles creating a new permission
// @Summary Create permission
// @Description Create a new permission
// @Tags Permissions
// @Accept json
// @Produce json
// @Param permission body CreatePermissionRequest true "Permission data"
// @Security BearerAuth
// @Success 201 {object} PermissionResponse "Created permission"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 409 {object} ErrorResponse "Permission already exists"
// @Router /permissions [post]
func (h *PermissionHandler) CreatePermission(c *fiber.Ctx) error {
	var req CreatePermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Create permission
	permission, err := models.CreatePermission(h.db, req.Resource, req.Action, req.Description, req.Category, false)
	if err != nil {
		h.logger.Error("Failed to create permission", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to create permission",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(PermissionResponse{
		ID:          permission.ID,
		Name:        permission.Name,
		Resource:    permission.Resource,
		Action:      permission.Action,
		Description: permission.Description,
		Category:    permission.Category,
		IsSystem:    permission.IsSystem,
	})
}

// GetPermission handles retrieving a specific permission
// @Summary Get permission
// @Description Get a specific permission by ID
// @Tags Permissions
// @Accept json
// @Produce json
// @Param id path string true "Permission ID"
// @Security BearerAuth
// @Success 200 {object} PermissionResponse "Permission details"
// @Failure 400 {object} ErrorResponse "Invalid permission ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Permission not found"
// @Router /permissions/{id} [get]
func (h *PermissionHandler) GetPermission(c *fiber.Ctx) error {
	permissionIDStr := c.Params("id")
	permissionID, err := uuid.Parse(permissionIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid permission ID",
		})
	}

	// Extract context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get permission
	var permission models.Permission
	if err := h.db.First(&permission, permissionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Permission not found",
			})
		}
		h.logger.Error("Failed to retrieve permission", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve permission",
		})
	}

	return c.Status(fiber.StatusOK).JSON(PermissionResponse{
		ID:          permission.ID,
		Name:        permission.Name,
		Resource:    permission.Resource,
		Action:      permission.Action,
		Description: permission.Description,
		Category:    permission.Category,
		IsSystem:    permission.IsSystem,
	})
}

// DeletePermission handles deleting a permission
// @Summary Delete permission
// @Description Delete a permission (only non-system permissions)
// @Tags Permissions
// @Accept json
// @Produce json
// @Param id path string true "Permission ID"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "Permission deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid permission ID or system permission"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Permission not found"
// @Router /permissions/{id} [delete]
func (h *PermissionHandler) DeletePermission(c *fiber.Ctx) error {
	permissionIDStr := c.Params("id")
	permissionID, err := uuid.Parse(permissionIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid permission ID",
		})
	}

	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get permission to delete
	var permission models.Permission
	if err := h.db.First(&permission, permissionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Permission not found",
			})
		}
		h.logger.Error("Failed to retrieve permission", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete permission",
		})
	}

	// Prevent deletion of system permissions
	if permission.IsSystem {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Cannot delete system permissions",
		})
	}

	// Delete the permission (this will cascade to role_permissions)
	if err := h.db.Delete(&permission).Error; err != nil {
		h.logger.Error("Failed to delete permission", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete permission",
		})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "Permission deleted successfully",
	})
}