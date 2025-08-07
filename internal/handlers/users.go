package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateUserRequest represents the create user request payload
type CreateUserRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
}

// UpdateUserRequest represents the update user request payload
type UpdateUserRequest struct {
	Email     *string `json:"email,omitempty" validate:"omitempty,email"`
	Password  *string `json:"password,omitempty" validate:"omitempty,min=8"`
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	IsActive  *bool   `json:"is_active,omitempty"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	FullName  string    `json:"full_name"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserWithRolesResponse represents a user with their roles
type UserWithRolesResponse struct {
	UserResponse
	Roles []UserRoleResponse `json:"roles"`
}

// UserRoleResponse represents a user role assignment
type UserRoleResponse struct {
	ID            uuid.UUID     `json:"id"`
	RoleID        uuid.UUID     `json:"role_id"`
	RoleName      string        `json:"role_name"`
	ApplicationID uuid.UUID     `json:"application_id"`
	Application   string        `json:"application"`
	GrantedAt     time.Time     `json:"granted_at"`
	GrantedBy     *uuid.UUID    `json:"granted_by"`
	GrantedByUser *UserResponse `json:"granted_by_user,omitempty"`
}

// AssignRoleRequest represents the assign role request payload
type AssignRoleRequest struct {
	RoleID        uuid.UUID `json:"role_id" validate:"required"`
	ApplicationID uuid.UUID `json:"application_id" validate:"required"`
}

// UsersListResponse represents the paginated users list response
type UsersListResponse struct {
	Success    bool                    `json:"success"`
	Message    string                  `json:"message"`
	Users      []UserWithRolesResponse `json:"users"`
	Pagination PaginationMeta          `json:"pagination"`
}

// GetUsers handles listing users with pagination and filtering
// @Summary List users
// @Description Get paginated list of users with optional filtering
// @Tags Users
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(10)
// @Param search query string false "Search term for email or name"
// @Param active query bool false "Filter by active status"
// @Security BearerAuth
// @Success 200 {object} UsersListResponse "Users list"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /users [get]
func (h *UserHandler) GetUsers(c *fiber.Ctx) error {
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
	activeParam := c.Query("active", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	offset := (page - 1) * perPage

	// Build query
	query := h.db.Model(&models.User{})

	// Apply filters
	if search != "" {
		query = query.Where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if activeParam != "" {
		if active, err := strconv.ParseBool(activeParam); err == nil {
			query = query.Where("is_active = ?", active)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logger.Error("Failed to count users", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve users",
		})
	}

	// Get users with their roles
	var users []models.User
	if err := query.Preload("UserRoles").Preload("UserRoles.Role").Preload("UserRoles.Application").Order("created_at DESC").Limit(perPage).Offset(offset).Find(&users).Error; err != nil {
		h.logger.Error("Failed to retrieve users", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve users",
		})
	}

	// Convert to response format with roles
	var userResponses []UserWithRolesResponse
	for _, user := range users {
		// Convert user roles to response format
		var userRoleResponses []UserRoleResponse
		for _, userRole := range user.UserRoles {
			roleResponse := UserRoleResponse{
				ID:            userRole.ID,
				RoleID:        userRole.RoleID,
				ApplicationID: userRole.ApplicationID,
				GrantedAt:     userRole.GrantedAt,
				GrantedBy:     userRole.GrantedBy,
			}
			
			// Include role name if available
			if userRole.Role != nil {
				roleResponse.RoleName = userRole.Role.Name
			}
			
			// Include application name if available
			if userRole.Application != nil {
				roleResponse.Application = userRole.Application.Name
			}
			
			// Include granted by user info if available
			if userRole.GrantedByUser != nil {
				roleResponse.GrantedByUser = &UserResponse{
					ID:        userRole.GrantedByUser.ID,
					Email:     userRole.GrantedByUser.Email,
					FirstName: userRole.GrantedByUser.FirstName,
					LastName:  userRole.GrantedByUser.LastName,
					FullName:  userRole.GrantedByUser.GetFullName(),
					IsActive:  userRole.GrantedByUser.IsActive,
					CreatedAt: userRole.GrantedByUser.CreatedAt,
					UpdatedAt: userRole.GrantedByUser.UpdatedAt,
				}
			}
			
			userRoleResponses = append(userRoleResponses, roleResponse)
		}
		
		userResponses = append(userResponses, UserWithRolesResponse{
			UserResponse: UserResponse{
				ID:        user.ID,
				Email:     user.Email,
				FirstName: user.FirstName,
				LastName:  user.LastName,
				FullName:  user.GetFullName(),
				IsActive:  user.IsActive,
				CreatedAt: user.CreatedAt,
				UpdatedAt: user.UpdatedAt,
			},
			Roles: userRoleResponses,
		})
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return c.Status(fiber.StatusOK).JSON(UsersListResponse{
		Success: true,
		Message: "Users retrieved successfully",
		Users:   userResponses,
		Pagination: PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// CreateUser handles creating a new user
// @Summary Create user
// @Description Create a new user account
// @Tags Users
// @Accept json
// @Produce json
// @Param user body CreateUserRequest true "User data"
// @Security BearerAuth
// @Success 201 {object} UserResponse "Created user"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 409 {object} ErrorResponse "Email already exists"
// @Router /users [post]
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
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

	// Check if email already exists
	var existingUser models.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionUserCreate, "user", nil,
			map[string]interface{}{
				"email":  req.Email,
				"reason": "email_already_exists",
			}, &clientIP, &userAgent)

		return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
			Error:   true,
			Message: "Email already exists",
		})
	}

	// Create new user
	user := models.User{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		IsActive:  true,
	}

	// Set password
	if err := user.SetPassword(req.Password); err != nil {
		h.logger.Error("Failed to hash password", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to create user",
		})
	}

	// Save user to database
	if err := h.db.Create(&user).Error; err != nil {
		h.logger.Error("Failed to create user", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to create user",
		})
	}

	// Log successful creation
	userIDStr := user.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionUserCreate, "user", 
		&userIDStr,
		map[string]interface{}{
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusCreated).JSON(UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		FullName:  user.GetFullName(),
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	})
}

// GetUser handles retrieving a specific user
// @Summary Get user
// @Description Get a specific user by ID with their roles
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Security BearerAuth
// @Success 200 {object} UserWithRolesResponse "User details"
// @Failure 400 {object} ErrorResponse "Invalid user ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "User not found"
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid user ID",
		})
	}

	// Extract context for audit
	_, applicationID, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get user
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "User not found",
			})
		}
		h.logger.Error("Failed to retrieve user", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve user",
		})
	}

	// Get user roles for the current application
	userRoles, err := models.GetUserRolesByUserAndApplication(h.db, userID, applicationID)
	if err != nil {
		h.logger.Error("Failed to retrieve user roles", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve user details",
		})
	}

	// Convert roles to response format
	var roleResponses []UserRoleResponse
	for _, userRole := range userRoles {
		roleResponse := UserRoleResponse{
			ID:            userRole.ID,
			RoleID:        userRole.RoleID,
			ApplicationID: userRole.ApplicationID,
			GrantedAt:     userRole.GrantedAt,
			GrantedBy:     userRole.GrantedBy,
		}

		// Add role name if role is loaded
		if userRole.Role != nil {
			roleResponse.RoleName = userRole.Role.Name
		}

		// Add application name if application is loaded
		if userRole.Application != nil {
			roleResponse.Application = userRole.Application.Name
		}

		// Add granted by user info if available
		if userRole.GrantedByUser != nil {
			roleResponse.GrantedByUser = &UserResponse{
				ID:        userRole.GrantedByUser.ID,
				Email:     userRole.GrantedByUser.Email,
				FirstName: userRole.GrantedByUser.FirstName,
				LastName:  userRole.GrantedByUser.LastName,
				FullName:  userRole.GrantedByUser.GetFullName(),
			}
		}

		roleResponses = append(roleResponses, roleResponse)
	}

	return c.Status(fiber.StatusOK).JSON(UserWithRolesResponse{
		UserResponse: UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			FullName:  user.GetFullName(),
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
		Roles: roleResponses,
	})
}

// UpdateUser handles updating a user
// @Summary Update user
// @Description Update user information
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param user body UpdateUserRequest true "User update data"
// @Security BearerAuth
// @Success 200 {object} UserResponse "Updated user"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "User not found"
// @Failure 409 {object} ErrorResponse "Email already exists"
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid user ID",
		})
	}

	var req UpdateUserRequest
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

	// Get existing user
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "User not found",
			})
		}
		h.logger.Error("Failed to retrieve user", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to update user",
		})
	}

	// Store original values for audit logging
	originalValues := map[string]interface{}{
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"is_active":  user.IsActive,
	}

	// Check email uniqueness if email is being updated
	if req.Email != nil && *req.Email != user.Email {
		var existingUser models.User
		if err := h.db.Where("email = ? AND id != ?", *req.Email, userID).First(&existingUser).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Error:   true,
				Message: "Email already exists",
			})
		}
		user.Email = *req.Email
	}

	// Update fields if provided
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.Password != nil {
		if err := user.SetPassword(*req.Password); err != nil {
			h.logger.Error("Failed to hash password", "error", err)
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
				Error:   true,
				Message: "Failed to update user",
			})
		}
	}

	// Save updates
	if err := h.db.Save(&user).Error; err != nil {
		h.logger.Error("Failed to update user", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to update user",
		})
	}

	// Log the update
	newValues := map[string]interface{}{
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"is_active":  user.IsActive,
	}

	userIDForAudit := user.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionUserUpdate, "user", 
		&userIDForAudit,
		map[string]interface{}{
			"original": originalValues,
			"updated":  newValues,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		FullName:  user.GetFullName(),
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	})
}

// DeleteUser handles soft deleting (deactivating) a user
// @Summary Delete user
// @Description Soft delete a user (deactivate)
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "User deleted successfully"
// @Failure 400 {object} ErrorResponse "Invalid user ID"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "User not found"
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid user ID",
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

	// Prevent self-deletion
	if currentUserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Cannot delete your own account",
		})
	}

	// Get client info for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Get user to delete
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "User not found",
			})
		}
		h.logger.Error("Failed to retrieve user", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete user",
		})
	}

	// Soft delete (deactivate) the user
	user.IsActive = false
	if err := h.db.Save(&user).Error; err != nil {
		h.logger.Error("Failed to deactivate user", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to delete user",
		})
	}

	// Invalidate all user tokens
	if err := h.sessionService.InvalidateAllUserTokens(context.Background(), userID); err != nil {
		h.logger.Error("Failed to invalidate user tokens", "error", err)
	}

	// Log the deletion
	userIDForAudit := user.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionUserDelete, "user", 
		&userIDForAudit,
		map[string]interface{}{
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"method":     "soft_delete",
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "User deleted successfully",
	})
}