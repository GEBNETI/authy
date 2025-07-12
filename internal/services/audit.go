package services

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/efrenfuentes/authy/internal/models"
	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditService provides centralized audit logging functionality
type AuditService struct {
	db     *gorm.DB
	logger *logger.Logger
}

// NewAuditService creates a new audit service instance
func NewAuditService(db *gorm.DB, logger *logger.Logger) *AuditService {
	return &AuditService{
		db:     db,
		logger: logger,
	}
}

// AuditLogQuery represents parameters for querying audit logs
type AuditLogQuery struct {
	UserID        *uuid.UUID            `json:"user_id,omitempty"`
	ApplicationID *uuid.UUID            `json:"application_id,omitempty"`
	Actions       []string              `json:"actions,omitempty"`
	Resources     []string              `json:"resources,omitempty"`
	ResourceID    *string               `json:"resource_id,omitempty"`
	IPAddress     *string               `json:"ip_address,omitempty"`
	StartDate     *time.Time            `json:"start_date,omitempty"`
	EndDate       *time.Time            `json:"end_date,omitempty"`
	Page          int                   `json:"page"`
	PerPage       int                   `json:"per_page"`
	SortBy        string                `json:"sort_by"`      // created_at, action, resource
	SortOrder     string                `json:"sort_order"`   // asc, desc
	Details       map[string]interface{} `json:"details,omitempty"` // Filter by details content
}

// AuditLogResponse represents an audit log entry in API responses
type AuditLogResponse struct {
	ID            uuid.UUID              `json:"id"`
	UserID        *uuid.UUID             `json:"user_id"`
	ApplicationID *uuid.UUID             `json:"application_id"`
	Action        string                 `json:"action"`
	Resource      string                 `json:"resource"`
	ResourceID    *string                `json:"resource_id"`
	Details       map[string]interface{} `json:"details,omitempty"`
	IPAddress     *string                `json:"ip_address"`
	UserAgent     *string                `json:"user_agent"`
	CreatedAt     time.Time              `json:"created_at"`
	
	// Related data
	User        *UserInfo        `json:"user,omitempty"`
	Application *ApplicationInfo `json:"application,omitempty"`
}

// UserInfo represents basic user information for audit logs
type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	FullName  string    `json:"full_name"`
}

// ApplicationInfo represents basic application information for audit logs
type ApplicationInfo struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"is_system"`
}

// AuditLogStats represents audit log statistics
type AuditLogStats struct {
	TotalLogs       int64                    `json:"total_logs"`
	LastWeekLogs    int64                    `json:"last_week_logs"`
	TopActions      []ActionCount            `json:"top_actions"`
	TopUsers        []UserActivityCount      `json:"top_users"`
	TopApplications []ApplicationCount       `json:"top_applications"`
	LogsByDay       []DailyLogCount          `json:"logs_by_day"`
}

// ActionCount represents action frequency
type ActionCount struct {
	Action string `json:"action"`
	Count  int64  `json:"count"`
}

// UserActivityCount represents user activity frequency
type UserActivityCount struct {
	UserID    uuid.UUID `json:"user_id"`
	UserEmail string    `json:"user_email"`
	Count     int64     `json:"count"`
}

// ApplicationCount represents application activity frequency
type ApplicationCount struct {
	ApplicationID   uuid.UUID `json:"application_id"`
	ApplicationName string    `json:"application_name"`
	Count          int64     `json:"count"`
}

// DailyLogCount represents daily log counts
type DailyLogCount struct {
	Date  time.Time `json:"date"`
	Count int64     `json:"count"`
}

// LogEntry creates a new audit log entry with the service
func (s *AuditService) LogEntry(userID *uuid.UUID, applicationID *uuid.UUID, action models.AuditAction, resource string, resourceID *string, details interface{}, ipAddress *net.IP, userAgent *string) error {
	err := models.CreateAuditLog(s.db, userID, applicationID, action, resource, resourceID, details, ipAddress, userAgent)
	if err != nil {
		s.logger.Error("Failed to create audit log", "error", err, "action", action, "resource", resource)
	}
	return err
}

// QueryLogs retrieves audit logs based on the provided query parameters
func (s *AuditService) QueryLogs(query AuditLogQuery) ([]AuditLogResponse, int64, error) {
	// Build base query
	dbQuery := s.db.Model(&models.AuditLog{}).
		Preload("User").
		Preload("Application")

	// Apply filters
	if query.UserID != nil {
		dbQuery = dbQuery.Where("user_id = ?", *query.UserID)
	}

	if query.ApplicationID != nil {
		dbQuery = dbQuery.Where("application_id = ?", *query.ApplicationID)
	}

	if len(query.Actions) > 0 {
		dbQuery = dbQuery.Where("action IN ?", query.Actions)
	}

	if len(query.Resources) > 0 {
		dbQuery = dbQuery.Where("resource IN ?", query.Resources)
	}

	if query.ResourceID != nil {
		dbQuery = dbQuery.Where("resource_id = ?", *query.ResourceID)
	}

	if query.IPAddress != nil {
		dbQuery = dbQuery.Where("ip_address = ?", *query.IPAddress)
	}

	if query.StartDate != nil {
		dbQuery = dbQuery.Where("created_at >= ?", *query.StartDate)
	}

	if query.EndDate != nil {
		dbQuery = dbQuery.Where("created_at <= ?", *query.EndDate)
	}

	// Filter by details content if specified
	if len(query.Details) > 0 {
		for key, value := range query.Details {
			dbQuery = dbQuery.Where("details->? = ?", key, value)
		}
	}

	// Get total count
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	// Apply pagination and sorting
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PerPage < 1 || query.PerPage > 1000 {
		query.PerPage = 50
	}

	offset := (query.Page - 1) * query.PerPage

	// Determine sort order
	sortBy := "created_at"
	if query.SortBy != "" {
		switch query.SortBy {
		case "action", "resource", "created_at":
			sortBy = query.SortBy
		}
	}

	sortOrder := "DESC"
	if strings.ToUpper(query.SortOrder) == "ASC" {
		sortOrder = "ASC"
	}

	orderClause := fmt.Sprintf("%s %s", sortBy, sortOrder)

	// Execute query
	var auditLogs []models.AuditLog
	if err := dbQuery.Order(orderClause).Limit(query.PerPage).Offset(offset).Find(&auditLogs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to query audit logs: %w", err)
	}

	// Convert to response format
	var responses []AuditLogResponse
	for _, log := range auditLogs {
		response := AuditLogResponse{
			ID:            log.ID,
			UserID:        log.UserID,
			ApplicationID: log.ApplicationID,
			Action:        log.Action,
			Resource:      log.Resource,
			ResourceID:    log.ResourceID,
			CreatedAt:     log.CreatedAt,
		}

		// Add IP address if present
		if log.IPAddress != nil {
			ipStr := log.IPAddress.String()
			response.IPAddress = &ipStr
		}

		// Add user agent if present
		if log.UserAgent != nil {
			response.UserAgent = log.UserAgent
		}

		// Parse details
		if len(log.Details) > 0 {
			var details map[string]interface{}
			if err := json.Unmarshal(log.Details, &details); err == nil {
				response.Details = details
			}
		}

		// Add user info if available
		if log.User != nil {
			response.User = &UserInfo{
				ID:        log.User.ID,
				Email:     log.User.Email,
				FirstName: log.User.FirstName,
				LastName:  log.User.LastName,
				FullName:  log.User.GetFullName(),
			}
		}

		// Add application info if available
		if log.Application != nil {
			response.Application = &ApplicationInfo{
				ID:          log.Application.ID,
				Name:        log.Application.Name,
				Description: log.Application.Description,
				IsSystem:    log.Application.IsSystem,
			}
		}

		responses = append(responses, response)
	}

	return responses, total, nil
}

// GetStats returns comprehensive audit log statistics
func (s *AuditService) GetStats(applicationID *uuid.UUID, days int) (*AuditLogStats, error) {
	if days <= 0 || days > 365 {
		days = 30 // Default to last 30 days
	}

	startDate := time.Now().AddDate(0, 0, -days)
	lastWeekDate := time.Now().AddDate(0, 0, -7)

	stats := &AuditLogStats{}

	// Base query with optional application filter
	baseQuery := s.db.Model(&models.AuditLog{})
	if applicationID != nil {
		baseQuery = baseQuery.Where("application_id = ?", *applicationID)
	}

	// Total logs count
	if err := baseQuery.Count(&stats.TotalLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to count total logs: %w", err)
	}

	// Last week logs count
	if err := baseQuery.Where("created_at >= ?", lastWeekDate).Count(&stats.LastWeekLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to count last week logs: %w", err)
	}

	// Top actions in the specified period
	var topActions []ActionCount
	query := `
		SELECT action, COUNT(*) as count 
		FROM audit_logs 
		WHERE created_at >= ?`
	args := []interface{}{startDate}
	
	if applicationID != nil {
		query += " AND application_id = ?"
		args = append(args, *applicationID)
	}
	
	query += " GROUP BY action ORDER BY count DESC LIMIT 10"
	
	if err := s.db.Raw(query, args...).Scan(&topActions).Error; err != nil {
		return nil, fmt.Errorf("failed to get top actions: %w", err)
	}
	stats.TopActions = topActions

	// Top users in the specified period
	var topUsers []UserActivityCount
	userQuery := `
		SELECT 
			al.user_id, 
			u.email as user_email,
			COUNT(*) as count 
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		WHERE al.created_at >= ? AND al.user_id IS NOT NULL`
	userArgs := []interface{}{startDate}
	
	if applicationID != nil {
		userQuery += " AND al.application_id = ?"
		userArgs = append(userArgs, *applicationID)
	}
	
	userQuery += " GROUP BY al.user_id, u.email ORDER BY count DESC LIMIT 10"
	
	if err := s.db.Raw(userQuery, userArgs...).Scan(&topUsers).Error; err != nil {
		return nil, fmt.Errorf("failed to get top users: %w", err)
	}
	stats.TopUsers = topUsers

	// Top applications (only if not filtering by application)
	if applicationID == nil {
		var topApps []ApplicationCount
		appQuery := `
			SELECT 
				al.application_id, 
				a.name as application_name,
				COUNT(*) as count 
			FROM audit_logs al
			LEFT JOIN applications a ON al.application_id = a.id
			WHERE al.created_at >= ? AND al.application_id IS NOT NULL
			GROUP BY al.application_id, a.name 
			ORDER BY count DESC LIMIT 10`
		
		if err := s.db.Raw(appQuery, startDate).Scan(&topApps).Error; err != nil {
			return nil, fmt.Errorf("failed to get top applications: %w", err)
		}
		stats.TopApplications = topApps
	}

	// Daily log counts for the specified period
	var dailyLogs []DailyLogCount
	dailyQuery := `
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as count
		FROM audit_logs 
		WHERE created_at >= ?`
	dailyArgs := []interface{}{startDate}
	
	if applicationID != nil {
		dailyQuery += " AND application_id = ?"
		dailyArgs = append(dailyArgs, *applicationID)
	}
	
	dailyQuery += " GROUP BY DATE(created_at) ORDER BY date DESC"
	
	if err := s.db.Raw(dailyQuery, dailyArgs...).Scan(&dailyLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to get daily logs: %w", err)
	}
	stats.LogsByDay = dailyLogs

	return stats, nil
}

// ExportToCSV exports audit logs to CSV format
func (s *AuditService) ExportToCSV(query AuditLogQuery) ([]byte, error) {
	// Set high limit for export (max 10000 records)
	query.PerPage = 10000
	query.Page = 1

	logs, _, err := s.QueryLogs(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query logs for export: %w", err)
	}

	// Create CSV content
	var csvContent strings.Builder
	writer := csv.NewWriter(&csvContent)

	// Write header
	header := []string{
		"ID", "User ID", "User Email", "Application ID", "Application Name", 
		"Action", "Resource", "Resource ID", "IP Address", "User Agent", "Created At", "Details",
	}
	if err := writer.Write(header); err != nil {
		return nil, fmt.Errorf("failed to write CSV header: %w", err)
	}

	// Write data rows
	for _, log := range logs {
		row := []string{
			log.ID.String(),
			"",
			"",
			"",
			"",
			log.Action,
			log.Resource,
		}

		// Handle optional fields
		if log.UserID != nil {
			row[1] = log.UserID.String()
		}
		if log.User != nil {
			row[2] = log.User.Email
		}
		if log.ApplicationID != nil {
			row[3] = log.ApplicationID.String()
		}
		if log.Application != nil {
			row[4] = log.Application.Name
		}
		if log.ResourceID != nil {
			row = append(row, *log.ResourceID)
		} else {
			row = append(row, "")
		}
		if log.IPAddress != nil {
			row = append(row, *log.IPAddress)
		} else {
			row = append(row, "")
		}
		if log.UserAgent != nil {
			row = append(row, *log.UserAgent)
		} else {
			row = append(row, "")
		}

		row = append(row, log.CreatedAt.Format(time.RFC3339))

		// Add details as JSON string
		if log.Details != nil {
			detailsJSON, _ := json.Marshal(log.Details)
			row = append(row, string(detailsJSON))
		} else {
			row = append(row, "")
		}

		if err := writer.Write(row); err != nil {
			return nil, fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("failed to flush CSV writer: %w", err)
	}

	return []byte(csvContent.String()), nil
}

// GetActionsList returns a list of all available audit actions
func (s *AuditService) GetActionsList() []string {
	return []string{
		string(models.ActionLogin),
		string(models.ActionLoginFailed),
		string(models.ActionLogout),
		string(models.ActionTokenRefresh),
		string(models.ActionTokenValidate),
		string(models.ActionUserCreate),
		string(models.ActionUserUpdate),
		string(models.ActionUserDelete),
		string(models.ActionUserActivate),
		string(models.ActionUserDeactivate),
		string(models.ActionRoleAssign),
		string(models.ActionRoleRemove),
		string(models.ActionApplicationCreate),
		string(models.ActionApplicationUpdate),
		string(models.ActionApplicationDelete),
		string(models.ActionRoleCreate),
		string(models.ActionRoleUpdate),
		string(models.ActionRoleDelete),
		string(models.ActionPasswordChange),
		string(models.ActionAPIKeyRegenerate),
	}
}

// GetResourcesList returns a list of all available audit resources
func (s *AuditService) GetResourcesList() []string {
	return []string{
		"user",
		"application",
		"role",
		"user_role",
		"token",
		"permission",
		"session",
	}
}