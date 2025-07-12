package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// AuditHandler handles audit log related requests
type AuditHandler struct {
	auditService *services.AuditService
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(auditService *services.AuditService) *AuditHandler {
	return &AuditHandler{
		auditService: auditService,
	}
}

// AuditLogsListResponse represents the audit logs list response
type AuditLogsListResponse struct {
	Success    bool                           `json:"success"`
	Message    string                         `json:"message"`
	AuditLogs  []services.AuditLogResponse    `json:"audit_logs"`
	Pagination PaginationMeta                 `json:"pagination"`
}

// AuditStatsResponse represents the audit statistics response
type AuditStatsResponse struct {
	Success bool                    `json:"success"`
	Message string                  `json:"message"`
	Stats   *services.AuditLogStats `json:"stats"`
}

// AuditActionsResponse represents the available actions response
type AuditActionsResponse struct {
	Success   bool     `json:"success"`
	Message   string   `json:"message"`
	Actions   []string `json:"actions"`
	Resources []string `json:"resources"`
}

// GetAuditLogs handles listing audit logs with advanced filtering
// @Summary List audit logs
// @Description Get paginated list of audit logs with comprehensive filtering options
// @Tags Audit
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(50)
// @Param user_id query string false "Filter by user ID (UUID)"
// @Param application_id query string false "Filter by application ID (UUID)"
// @Param actions query string false "Filter by actions (comma-separated)"
// @Param resources query string false "Filter by resources (comma-separated)"
// @Param resource_id query string false "Filter by specific resource ID"
// @Param ip_address query string false "Filter by IP address"
// @Param start_date query string false "Start date (RFC3339 format)"
// @Param end_date query string false "End date (RFC3339 format)"
// @Param sort_by query string false "Sort by field" Enums(created_at, action, resource) default(created_at)
// @Param sort_order query string false "Sort order" Enums(asc, desc) default(desc)
// @Security BearerAuth
// @Success 200 {object} AuditLogsListResponse "Audit logs list"
// @Failure 400 {object} ErrorResponse "Invalid request parameters"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /audit-logs [get]
func (h *AuditHandler) GetAuditLogs(c *fiber.Ctx) error {
	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Parse query parameters
	query := services.AuditLogQuery{
		Page:      parseIntQuery(c, "page", 1),
		PerPage:   parseIntQuery(c, "per_page", 50),
		SortBy:    c.Query("sort_by", "created_at"),
		SortOrder: c.Query("sort_order", "desc"),
	}

	// Parse UUID filters
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			query.UserID = &userID
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid user_id format",
			})
		}
	}

	if appIDStr := c.Query("application_id"); appIDStr != "" {
		if appID, err := uuid.Parse(appIDStr); err == nil {
			query.ApplicationID = &appID
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid application_id format",
			})
		}
	}

	// Parse array filters
	if actionsStr := c.Query("actions"); actionsStr != "" {
		query.Actions = strings.Split(actionsStr, ",")
		// Trim whitespace
		for i, action := range query.Actions {
			query.Actions[i] = strings.TrimSpace(action)
		}
	}

	if resourcesStr := c.Query("resources"); resourcesStr != "" {
		query.Resources = strings.Split(resourcesStr, ",")
		// Trim whitespace
		for i, resource := range query.Resources {
			query.Resources[i] = strings.TrimSpace(resource)
		}
	}

	// Parse string filters
	if resourceID := c.Query("resource_id"); resourceID != "" {
		query.ResourceID = &resourceID
	}

	if ipAddress := c.Query("ip_address"); ipAddress != "" {
		query.IPAddress = &ipAddress
	}

	// Parse date filters
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			query.StartDate = &startDate
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid start_date format, use RFC3339",
			})
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			query.EndDate = &endDate
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid end_date format, use RFC3339",
			})
		}
	}

	// Execute query
	auditLogs, total, err := h.auditService.QueryLogs(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve audit logs",
		})
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(query.PerPage) - 1) / int64(query.PerPage))

	return c.Status(fiber.StatusOK).JSON(AuditLogsListResponse{
		Success:   true,
		Message:   "Audit logs retrieved successfully",
		AuditLogs: auditLogs,
		Pagination: PaginationMeta{
			Page:       query.Page,
			PerPage:    query.PerPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// GetAuditStats handles retrieving audit log statistics
// @Summary Get audit statistics
// @Description Get comprehensive audit log statistics and analytics
// @Tags Audit
// @Accept json
// @Produce json
// @Param application_id query string false "Filter by application ID (UUID)"
// @Param days query int false "Number of days to analyze" default(30)
// @Security BearerAuth
// @Success 200 {object} AuditStatsResponse "Audit statistics"
// @Failure 400 {object} ErrorResponse "Invalid request parameters"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /audit-logs/stats [get]
func (h *AuditHandler) GetAuditStats(c *fiber.Ctx) error {
	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Parse parameters
	var applicationID *uuid.UUID
	if appIDStr := c.Query("application_id"); appIDStr != "" {
		if appID, err := uuid.Parse(appIDStr); err == nil {
			applicationID = &appID
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid application_id format",
			})
		}
	}

	days := parseIntQuery(c, "days", 30)
	if days < 1 || days > 365 {
		days = 30
	}

	// Get statistics
	stats, err := h.auditService.GetStats(applicationID, days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve audit statistics",
		})
	}

	return c.Status(fiber.StatusOK).JSON(AuditStatsResponse{
		Success: true,
		Message: "Audit statistics retrieved successfully",
		Stats:   stats,
	})
}

// ExportAuditLogs handles exporting audit logs to CSV
// @Summary Export audit logs
// @Description Export audit logs to CSV format with filtering options
// @Tags Audit
// @Accept json
// @Produce text/csv
// @Param user_id query string false "Filter by user ID (UUID)"
// @Param application_id query string false "Filter by application ID (UUID)"
// @Param actions query string false "Filter by actions (comma-separated)"
// @Param resources query string false "Filter by resources (comma-separated)"
// @Param resource_id query string false "Filter by specific resource ID"
// @Param ip_address query string false "Filter by IP address"
// @Param start_date query string false "Start date (RFC3339 format)"
// @Param end_date query string false "End date (RFC3339 format)"
// @Security BearerAuth
// @Success 200 {file} file "CSV file with audit logs"
// @Failure 400 {object} ErrorResponse "Invalid request parameters"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /audit-logs/export [get]
func (h *AuditHandler) ExportAuditLogs(c *fiber.Ctx) error {
	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	// Parse query parameters (similar to GetAuditLogs but without pagination)
	query := services.AuditLogQuery{
		SortBy:    c.Query("sort_by", "created_at"),
		SortOrder: c.Query("sort_order", "desc"),
	}

	// Parse filters (same logic as GetAuditLogs)
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			query.UserID = &userID
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid user_id format",
			})
		}
	}

	if appIDStr := c.Query("application_id"); appIDStr != "" {
		if appID, err := uuid.Parse(appIDStr); err == nil {
			query.ApplicationID = &appID
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid application_id format",
			})
		}
	}

	if actionsStr := c.Query("actions"); actionsStr != "" {
		query.Actions = strings.Split(actionsStr, ",")
		for i, action := range query.Actions {
			query.Actions[i] = strings.TrimSpace(action)
		}
	}

	if resourcesStr := c.Query("resources"); resourcesStr != "" {
		query.Resources = strings.Split(resourcesStr, ",")
		for i, resource := range query.Resources {
			query.Resources[i] = strings.TrimSpace(resource)
		}
	}

	if resourceID := c.Query("resource_id"); resourceID != "" {
		query.ResourceID = &resourceID
	}

	if ipAddress := c.Query("ip_address"); ipAddress != "" {
		query.IPAddress = &ipAddress
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			query.StartDate = &startDate
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid start_date format, use RFC3339",
			})
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			query.EndDate = &endDate
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   true,
				Message: "Invalid end_date format, use RFC3339",
			})
		}
	}

	// Export to CSV
	csvData, err := h.auditService.ExportToCSV(query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   true,
			Message: "Failed to export audit logs",
		})
	}

	// Set headers for file download
	filename := fmt.Sprintf("audit_logs_%s.csv", time.Now().Format("2006-01-02_15-04-05"))
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	return c.Send(csvData)
}

// GetAuditOptions handles retrieving available audit actions and resources
// @Summary Get audit options
// @Description Get list of available audit actions and resources for filtering
// @Tags Audit
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} AuditActionsResponse "Available audit options"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 403 {object} ErrorResponse "Forbidden"
// @Router /audit-logs/options [get]
func (h *AuditHandler) GetAuditOptions(c *fiber.Ctx) error {
	// Extract user context
	_, _, _, ok := middleware.ExtractUserContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
			Error:   true,
			Message: "Invalid authentication context",
		})
	}

	actions := h.auditService.GetActionsList()
	resources := h.auditService.GetResourcesList()

	return c.Status(fiber.StatusOK).JSON(AuditActionsResponse{
		Success:   true,
		Message:   "Audit options retrieved successfully",
		Actions:   actions,
		Resources: resources,
	})
}

// Helper function to parse integer query parameters
func parseIntQuery(c *fiber.Ctx, key string, defaultValue int) int {
	if value, err := strconv.Atoi(c.Query(key)); err == nil {
		return value
	}
	return defaultValue
}