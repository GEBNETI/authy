package handlers

import (
	"context"

	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/models"
	"github.com/efrenfuentes/authy/pkg/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AssignRole handles assigning a role to a user
// @Summary Assign role to user
// @Description Assign a role to a user for a specific application
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param role body AssignRoleRequest true "Role assignment data"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "Role assigned successfully"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "User or role not found"
// @Failure 409 {object} ErrorResponse "Role already assigned"
// @Router /users/{id}/roles [post]
func (h *UserHandler) AssignRole(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid user ID",
		})
	}

	var req AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid request body",
		})
	}

	// Extract user context for audit logging
	currentUserID, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Get client info for audit logging
	clientIP := middleware.ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Verify user exists
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
			Message: "Failed to assign role",
		})
	}

	// Verify role exists and belongs to the specified application
	var role models.Role
	if err := h.db.Where("id = ? AND application_id = ?", req.RoleID, req.ApplicationID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Role not found for this application",
			})
		}
		h.logger.Error("Failed to retrieve role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign role",
		})
	}

	// Verify application exists
	var app models.Application
	if err := h.db.First(&app, req.ApplicationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Application not found",
			})
		}
		h.logger.Error("Failed to retrieve application", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign role",
		})
	}

	// Check if role is already assigned
	hasRole, err := models.HasUserRole(h.db, userID, req.RoleID, req.ApplicationID)
	if err != nil {
		h.logger.Error("Failed to check existing role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign role",
		})
	}

	if hasRole {
		return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
			Error:   true,
			Message: "Role already assigned to user",
		})
	}

	// Create user role assignment
	userRole := models.UserRole{
		UserID:        userID,
		RoleID:        req.RoleID,
		ApplicationID: req.ApplicationID,
		GrantedBy:     &currentUserID,
	}

	if err := h.db.Create(&userRole).Error; err != nil {
		h.logger.Error("Failed to assign role", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to assign role",
		})
	}

	// Invalidate user tokens to refresh permissions
	if err := h.sessionService.InvalidateUserTokensInApplication(context.Background(), userID, req.ApplicationID, auth.AccessTokenType); err != nil {
		h.logger.Error("Failed to invalidate user tokens", "error", err)
	}

	// Log the role assignment
	userRoleIDStr := userRole.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &req.ApplicationID, models.ActionRoleAssign, "user_role", 
		&userRoleIDStr,
		map[string]interface{}{
			"user_id":        userID,
			"user_email":     user.Email,
			"role_id":        req.RoleID,
			"role_name":      role.Name,
			"application_id": req.ApplicationID,
			"application":    app.Name,
		}, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "Role assigned successfully",
	})
}

// RemoveRole handles removing a role from a user
// @Summary Remove role from user
// @Description Remove a role assignment from a user
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param role_id path string true "Role ID"
// @Security BearerAuth
// @Success 200 {object} SuccessResponse "Role removed successfully"
// @Failure 400 {object} ErrorResponse "Invalid request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Failure 404 {object} ErrorResponse "User, role, or assignment not found"
// @Router /users/{id}/roles/{role_id} [delete]
func (h *UserHandler) RemoveRole(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid user ID",
		})
	}

	roleIDStr := c.Params("role_id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid role ID",
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

	// Find the user role assignment
	var userRole models.UserRole
	if err := h.db.Preload("User").Preload("Role").Preload("Application").
		Where("user_id = ? AND role_id = ? AND application_id = ?", userID, roleID, applicationID).
		First(&userRole).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
				Error:   true,
				Message: "Role assignment not found",
			})
		}
		h.logger.Error("Failed to retrieve role assignment", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to remove role",
		})
	}

	// Store data for audit log before deletion
	auditData := map[string]interface{}{
		"user_id":        userRole.UserID,
		"role_id":        userRole.RoleID,
		"application_id": userRole.ApplicationID,
	}

	if userRole.User != nil {
		auditData["user_email"] = userRole.User.Email
	}
	if userRole.Role != nil {
		auditData["role_name"] = userRole.Role.Name
	}
	if userRole.Application != nil {
		auditData["application"] = userRole.Application.Name
	}

	// Delete the role assignment
	if err := h.db.Delete(&userRole).Error; err != nil {
		h.logger.Error("Failed to remove role assignment", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to remove role",
		})
	}

	// Invalidate user tokens to refresh permissions
	if err := h.sessionService.InvalidateUserTokensInApplication(context.Background(), userID, applicationID, auth.AccessTokenType); err != nil {
		h.logger.Error("Failed to invalidate user tokens", "error", err)
	}

	// Log the role removal
	userRoleIDStr := userRole.ID.String()
	models.CreateAuditLog(h.db, &currentUserID, &applicationID, models.ActionRoleRemove, "user_role", 
		&userRoleIDStr, auditData, &clientIP, &userAgent)

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: "Role removed successfully",
	})
}