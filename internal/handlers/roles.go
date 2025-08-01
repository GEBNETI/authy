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

// RoleHandler handles role-related requests
type RoleHandler struct {
	db     *gorm.DB
	logger *logger.Logger
}

// NewRoleHandler creates a new role handler
func NewRoleHandler(db *gorm.DB, logger *logger.Logger) *RoleHandler {
	return &RoleHandler{
		db:     db,
		logger: logger,
	}
}

// CreateRoleRequest represents the create role request payload
type CreateRoleRequest struct {
	Name          string    `json:"name" validate:"required"`
	Description   string    `json:"description"`
	ApplicationID uuid.UUID `json:"application_id" validate:"required"`
}

// UpdateRoleRequest represents the update role request payload
type UpdateRoleRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

// AssignPermissionRequest represents the assign permission request payload
type AssignPermissionRequest struct {
	PermissionIDs []uuid.UUID `json:"permission_ids" validate:"required"`
}

// RoleResponse represents a role in API responses
type RoleResponse struct {
	ID              uuid.UUID            `json:"id"`
	Name            string               `json:"name"`
	Description     string               `json:"description"`
	ApplicationID   uuid.UUID            `json:"application_id"`
	ApplicationName string               `json:"application_name,omitempty"`
	UserCount       int64                `json:"user_count"`
	Permissions     []PermissionResponse `json:"permissions,omitempty"`
}

// RolesListResponse represents the paginated roles list response
type RolesListResponse struct {
	Success    bool           `json:"success"`
	Message    string         `json:"message"`
	Roles      []RoleResponse `json:"roles"`
	Pagination PaginationMeta `json:"pagination"`
}

// GetRoles handles listing roles with pagination and filtering
// @Summary List roles
// @Description Get paginated list of roles with optional filtering
// @Tags Roles
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(10)
// @Param search query string false "Search term for role name"
// @Param application_id query string false "Filter by application ID"
// @Security BearerAuth
// @Success 200 {object} RolesListResponse "Roles list"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /roles [get]
func (h *RoleHandler) GetRoles(c *fiber.Ctx) error {
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
	search := c.Query("search", "")
	applicationIDStr := c.Query("application_id", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	offset := (page - 1) * perPage

	// Build query
	query := h.db.Model(&models.Role{}).
		Preload("Application").
		Preload("Permissions")

	// Apply filters
	if search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?",
			"%"+search+"%", "%"+search+"%")
	}

	if applicationIDStr != "" {
		if applicationID, err := uuid.Parse(applicationIDStr); err == nil {
			query = query.Where("application_id = ?", applicationID)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logger.Error("Failed to count roles", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve roles",
		})
	}

	// Get roles
	var roles []models.Role
	if err := query.Order("name").Limit(perPage).Offset(offset).Find(&roles).Error; err != nil {
		h.logger.Error("Failed to retrieve roles", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve roles",
		})
	}

	// Convert to response format
	var roleResponses []RoleResponse
	for _, role := range roles {
		// Get user count for this role
		userCount, err := role.GetUserCount(h.db)
		if err != nil {
			h.logger.Error("Failed to get user count for role", "role_id", role.ID, "error", err)
			userCount = 0
		}

		response := RoleResponse{
			ID:            role.ID,
			Name:          role.Name,
			Description:   role.Description,
			ApplicationID: role.ApplicationID,
			UserCount:     userCount,
		}

		// Add application name if loaded
		if role.Application != nil {
			response.ApplicationName = role.Application.Name
		}

		// Add permissions if loaded
		if role.Permissions != nil {
			var permissions []PermissionResponse
			for _, perm := range role.Permissions {
				permissions = append(permissions, PermissionResponse{
					ID:          perm.ID,
					Name:        perm.Resource + ":" + perm.Action,
					Resource:    perm.Resource,
					Action:      perm.Action,
					Description: perm.Description,
					Category:    perm.Category,
					IsSystem:    perm.IsSystem,
				})
			}
			response.Permissions = permissions
		}

		roleResponses = append(roleResponses, response)
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return c.Status(fiber.StatusOK).JSON(RolesListResponse{
		Success: true,
		Message: "Roles retrieved successfully",
		Roles:   roleResponses,
		Pagination: PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// CreateRole handles creating a new role
// @Summary Create role
// @Description Create a new role
// @Tags Roles
// @Accept json
// @Produce json
// @Param role body CreateRoleRequest true "Role data"
// @Security BearerAuth
// @Success 201 {object} RoleResponse "Created role"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 409 {object} ErrorResponse "Role already exists"
// @Router /roles [post]
func (h *RoleHandler) CreateRole(c *fiber.Ctx) error {
	var req CreateRoleRequest
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

	// Check if application exists
	var application models.Application
	if err := h.db.First(&application, req.ApplicationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Application not found",
			})
		}
		h.logger.Error("Failed to check application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to create role",
		})
	}

	// Check if role name already exists for this application
	var existingRole models.Role
	if err := h.db.Where("name = ? AND application_id = ?", req.Name, req.ApplicationID).First(&existingRole).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
			Error:   true,
			Message: "Role name already exists for this application",
		})
	}

	// Create new role
	role := models.Role{
		Name:          req.Name,
		Description:   req.Description,
		ApplicationID: req.ApplicationID,
	}

	if err := h.db.Create(&role).Error; err != nil {
		h.logger.Error("Failed to create role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to create role",
		})
	}

	// Load application for response
	if err := h.db.Preload("Application").First(&role, role.ID).Error; err != nil {
		h.logger.Error("Failed to load role with application", "error", err)
	}

	response := RoleResponse{
		ID:            role.ID,
		Name:          role.Name,
		Description:   role.Description,
		ApplicationID: role.ApplicationID,
		UserCount:     0,
	}

	if role.Application != nil {
		response.ApplicationName = role.Application.Name
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// GetRole handles retrieving a specific role
// @Summary Get role
// @Description Get a specific role by ID with its permissions
// @Tags Roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Security BearerAuth
// @Success 200 {object} RoleResponse "Role details"
// @Failure 400 {object} ErrorResponse "Invalid role ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Role not found"
// @Router /roles/{id} [get]
func (h *RoleHandler) GetRole(c *fiber.Ctx) error {
	roleIDStr := c.Params("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid role ID",
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

	// Get role with relationships
	var role models.Role
	if err := h.db.Preload("Application").Preload("Permissions").First(&role, roleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to retrieve role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve role",
		})
	}

	// Get user count
	userCount, err := role.GetUserCount(h.db)
	if err != nil {
		h.logger.Error("Failed to get user count for role", "role_id", role.ID, "error", err)
		userCount = 0
	}

	// Convert permissions to response format
	var permissionResponses []PermissionResponse
	for _, permission := range role.Permissions {
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

	response := RoleResponse{
		ID:            role.ID,
		Name:          role.Name,
		Description:   role.Description,
		ApplicationID: role.ApplicationID,
		UserCount:     userCount,
		Permissions:   permissionResponses,
	}

	if role.Application != nil {
		response.ApplicationName = role.Application.Name
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// UpdateRole handles updating a role
// @Summary Update role
// @Description Update role information
// @Tags Roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param role body UpdateRoleRequest true "Role update data"
// @Security BearerAuth
// @Success 200 {object} RoleResponse "Updated role"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Role not found"
// @Failure 409 {object} ErrorResponse "Role name already exists"
// @Router /roles/{id} [put]
func (h *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	roleIDStr := c.Params("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid role ID",
		})
	}

	var req UpdateRoleRequest
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

	// Get existing role
	var role models.Role
	if err := h.db.Preload("Application").First(&role, roleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to retrieve role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to update role",
		})
	}

	// Check name uniqueness if name is being updated
	if req.Name != nil && *req.Name != role.Name {
		var existingRole models.Role
		if err := h.db.Where("name = ? AND application_id = ? AND id != ?", *req.Name, role.ApplicationID, roleID).First(&existingRole).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Error:   true,
				Message: "Role name already exists for this application",
			})
		}
		role.Name = *req.Name
	}

	// Update fields if provided
	if req.Description != nil {
		role.Description = *req.Description
	}

	// Save updates
	if err := h.db.Save(&role).Error; err != nil {
		h.logger.Error("Failed to update role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to update role",
		})
	}

	// Get user count
	userCount, err := role.GetUserCount(h.db)
	if err != nil {
		h.logger.Error("Failed to get user count for role", "role_id", role.ID, "error", err)
		userCount = 0
	}

	response := RoleResponse{
		ID:            role.ID,
		Name:          role.Name,
		Description:   role.Description,
		ApplicationID: role.ApplicationID,
		UserCount:     userCount,
	}

	if role.Application != nil {
		response.ApplicationName = role.Application.Name
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// DeleteRole handles deleting a role
// @Summary Delete role
// @Description Delete a role
// @Tags Roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "Role deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid role ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Role not found"
// @Router /roles/{id} [delete]
func (h *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	roleIDStr := c.Params("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid role ID",
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

	// Get role to delete
	var role models.Role
	if err := h.db.First(&role, roleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to retrieve role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete role",
		})
	}

	// Check if role has users assigned
	userCount, err := role.GetUserCount(h.db)
	if err != nil {
		h.logger.Error("Failed to check role usage", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete role",
		})
	}

	if userCount > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Cannot delete role with assigned users",
		})
	}

	// Delete the role (this will cascade to role_permissions and user_roles)
	if err := h.db.Delete(&role).Error; err != nil {
		h.logger.Error("Failed to delete role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete role",
		})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "Role deleted successfully",
	})
}

// AssignPermissions handles assigning permissions to a role
// @Summary Assign permissions to role
// @Description Assign a list of permissions to a role
// @Tags Roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param permissions body AssignPermissionRequest true "Permission IDs"
// @Security BearerAuth
// @Success 200 {object} RoleResponse "Role with updated permissions"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "Role not found"
// @Router /roles/{id}/permissions [post]
func (h *RoleHandler) AssignPermissions(c *fiber.Ctx) error {
	roleIDStr := c.Params("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid role ID",
		})
	}

	var req AssignPermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Extract user context
	currentUserID, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get role
	var role models.Role
	if err := h.db.Preload("Application").First(&role, roleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Role not found",
			})
		}
		h.logger.Error("Failed to retrieve role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign permissions",
		})
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Clear existing permissions
	if err := tx.Where("role_id = ?", roleID).Delete(&models.RolePermission{}).Error; err != nil {
		tx.Rollback()
		h.logger.Error("Failed to clear existing permissions", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign permissions",
		})
	}

	// Assign new permissions
	for _, permissionID := range req.PermissionIDs {
		// Verify permission exists
		var permission models.Permission
		if err := tx.First(&permission, permissionID).Error; err != nil {
			tx.Rollback()
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
					Error:   true,
					Message: "Permission not found: " + permissionID.String(),
				})
			}
			h.logger.Error("Failed to verify permission", "error", err)
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error:   true,
				Message: "Failed to assign permissions",
			})
		}

		// Create role permission assignment
		if err := models.AssignPermissionToRole(tx, roleID, permissionID, &currentUserID); err != nil {
			tx.Rollback()
			h.logger.Error("Failed to assign permission to role", "error", err)
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error:   true,
				Message: "Failed to assign permissions",
			})
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		h.logger.Error("Failed to commit permission assignment", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign permissions",
		})
	}

	// Get updated role with permissions
	if err := h.db.Preload("Application").Preload("Permissions").First(&role, roleID).Error; err != nil {
		h.logger.Error("Failed to load updated role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign permissions",
		})
	}

	// Get user count
	userCount, err := role.GetUserCount(h.db)
	if err != nil {
		h.logger.Error("Failed to get user count for role", "role_id", role.ID, "error", err)
		userCount = 0
	}

	// Convert permissions to response format
	var permissionResponses []PermissionResponse
	for _, permission := range role.Permissions {
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

	response := RoleResponse{
		ID:            role.ID,
		Name:          role.Name,
		Description:   role.Description,
		ApplicationID: role.ApplicationID,
		UserCount:     userCount,
		Permissions:   permissionResponses,
	}

	if role.Application != nil {
		response.ApplicationName = role.Application.Name
	}

	return c.Status(fiber.StatusOK).JSON(response)
}