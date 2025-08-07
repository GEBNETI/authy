package handlers

import (
	"time"

	"github.com/efrenfuentes/authy/internal/models"
	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AnalyticsHandler struct {
	db     *gorm.DB
	logger *logger.Logger
}

func NewAnalyticsHandler(db *gorm.DB, logger *logger.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{
		db:     db,
		logger: logger,
	}
}

// AnalyticsTimeRange represents the time range filter
type AnalyticsTimeRange struct {
	StartDate string `query:"start_date"`
	EndDate   string `query:"end_date"`
	Range     string `query:"range"`
}

// AuthenticationAnalytics response structure
type AuthenticationAnalytics struct {
	LoginSuccessRate float64                       `json:"login_success_rate"`
	TotalLogins      int64                         `json:"total_logins"`
	FailedLogins     int64                         `json:"failed_logins"`
	UniqueUsers      int64                         `json:"unique_users"`
	LoginTrends      []AuthenticationTrendPoint   `json:"login_trends"`
	FailureReasons   []FailureReasonCount          `json:"failure_reasons"`
	PeakHours        []PeakHourCount               `json:"peak_hours"`
}

type AuthenticationTrendPoint struct {
	Date       string `json:"date"`
	Successful int64  `json:"successful"`
	Failed     int64  `json:"failed"`
}

type FailureReasonCount struct {
	Reason string `json:"reason"`
	Count  int64  `json:"count"`
}

type PeakHourCount struct {
	Hour  int   `json:"hour"`
	Count int64 `json:"count"`
}

// UserAnalytics response structure
type UserAnalytics struct {
	TotalUsers       int64                `json:"total_users"`
	ActiveUsers      int64                `json:"active_users"`
	NewUsersTrend    []NewUserTrendPoint  `json:"new_users_trend"`
	RoleDistribution []RoleDistribution   `json:"role_distribution"`
	TopActiveUsers   []TopActiveUser      `json:"top_active_users"`
}

type NewUserTrendPoint struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type RoleDistribution struct {
	Role  string `json:"role"`
	Count int64  `json:"count"`
}

type TopActiveUser struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	ActionCount int64  `json:"action_count"`
}

// ApplicationAnalytics response structure
type ApplicationAnalytics struct {
	TotalApplications int64                 `json:"total_applications"`
	ApplicationUsage  []ApplicationUsage    `json:"application_usage"`
	APIUsageTrend     []APIUsageTrendPoint  `json:"api_usage_trend"`
	ErrorRates        []ApplicationError    `json:"error_rates"`
}

type ApplicationUsage struct {
	ApplicationID string `json:"application_id"`
	Name          string `json:"name"`
	RequestCount  int64  `json:"request_count"`
	UserCount     int64  `json:"user_count"`
}

type APIUsageTrendPoint struct {
	Date     string `json:"date"`
	Requests int64  `json:"requests"`
}

type ApplicationError struct {
	Application   string  `json:"application"`
	ErrorRate     float64 `json:"error_rate"`
	TotalRequests int64   `json:"total_requests"`
}

// SecurityAnalytics response structure
type SecurityAnalytics struct {
	SuspiciousActivities  int64                    `json:"suspicious_activities"`
	BlockedIPs            int64                    `json:"blocked_ips"`
	FailedLoginIPs        []FailedLoginIP          `json:"failed_login_ips"`
	PermissionUsage       []PermissionUsage        `json:"permission_usage"`
	SecurityEventsTrend   []SecurityEventTrend     `json:"security_events_trend"`
}

type FailedLoginIP struct {
	IPAddress   string `json:"ip_address"`
	Attempts    int64  `json:"attempts"`
	LastAttempt string `json:"last_attempt"`
}

type PermissionUsage struct {
	Permission string `json:"permission"`
	UsageCount int64  `json:"usage_count"`
}

type SecurityEventTrend struct {
	Date   string `json:"date"`
	Events int64  `json:"events"`
}

// GetAuthenticationAnalytics returns authentication analytics data
// @Summary Get authentication analytics
// @Description Get authentication analytics including success rates, trends, and patterns
// @Tags analytics  
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (ISO format)"
// @Param end_date query string false "End date (ISO format)"
// @Param range query string false "Time range (24h, 7d, 30d, 90d)"
// @Success 200 {object} AuthenticationAnalytics
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /analytics/authentication [get]
func (h *AnalyticsHandler) GetAuthenticationAnalytics(c *fiber.Ctx) error {
	var timeRange AnalyticsTimeRange
	if err := c.QueryParser(&timeRange); err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: "Invalid query parameters"})
	}

	startTime, endTime, err := h.parseTimeRange(timeRange)
	if err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: err.Error()})
	}

	// Get total logins (successful)
	var totalLogins int64
	h.db.Model(&models.AuditLog{}).
		Where("action = ? AND created_at BETWEEN ? AND ?", models.ActionLogin, startTime, endTime).
		Count(&totalLogins)

	// Get failed logins
	var failedLogins int64
	h.db.Model(&models.AuditLog{}).
		Where("action = ? AND created_at BETWEEN ? AND ?", models.ActionLoginFailed, startTime, endTime).
		Count(&failedLogins)

	// Calculate success rate
	successRate := float64(0)
	if totalLogins+failedLogins > 0 {
		successRate = (float64(totalLogins) / float64(totalLogins+failedLogins)) * 100
	}

	// Get unique users who logged in
	var uniqueUsers int64
	h.db.Model(&models.AuditLog{}).
		Where("action = ? AND created_at BETWEEN ? AND ?", models.ActionLogin, startTime, endTime).
		Distinct("user_id").
		Count(&uniqueUsers)

	// Get login trends (daily aggregation)
	loginTrends := h.getLoginTrends(startTime, endTime)

	// Get failure reasons (mock data for now)
	failureReasons := []FailureReasonCount{
		{Reason: "Invalid credentials", Count: failedLogins * 70 / 100},
		{Reason: "Account locked", Count: failedLogins * 20 / 100},
		{Reason: "Application not found", Count: failedLogins * 10 / 100},
	}

	// Get peak hours
	peakHours := h.getPeakHours(startTime, endTime)

	analytics := AuthenticationAnalytics{
		LoginSuccessRate: successRate,
		TotalLogins:      totalLogins,
		FailedLogins:     failedLogins,
		UniqueUsers:      uniqueUsers,
		LoginTrends:      loginTrends,
		FailureReasons:   failureReasons,
		PeakHours:        peakHours,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    analytics,
		"message": "Authentication analytics retrieved successfully",
	})
}

// GetUserAnalytics returns user analytics data
// @Summary Get user analytics
// @Description Get user analytics including user counts, trends, and activity patterns
// @Tags analytics
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (ISO format)"
// @Param end_date query string false "End date (ISO format)"
// @Param range query string false "Time range (24h, 7d, 30d, 90d)"
// @Success 200 {object} UserAnalytics
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /analytics/users [get]
func (h *AnalyticsHandler) GetUserAnalytics(c *fiber.Ctx) error {
	var timeRange AnalyticsTimeRange
	if err := c.QueryParser(&timeRange); err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: "Invalid query parameters"})
	}

	startTime, endTime, err := h.parseTimeRange(timeRange)
	if err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: err.Error()})
	}

	// Get total users
	var totalUsers int64
	h.db.Model(&models.User{}).Count(&totalUsers)

	// Get active users (users who logged in during the period)
	var activeUsers int64
	h.db.Model(&models.AuditLog{}).
		Where("action = ? AND created_at BETWEEN ? AND ?", models.ActionLogin, startTime, endTime).
		Distinct("user_id").
		Count(&activeUsers)

	// Get new users trend
	newUsersTrend := h.getNewUsersTrend(startTime, endTime)

	// Get role distribution
	roleDistribution := h.getRoleDistribution()

	// Get top active users
	topActiveUsers := h.getTopActiveUsers(startTime, endTime)

	analytics := UserAnalytics{
		TotalUsers:       totalUsers,
		ActiveUsers:      activeUsers,
		NewUsersTrend:    newUsersTrend,
		RoleDistribution: roleDistribution,
		TopActiveUsers:   topActiveUsers,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    analytics,
		"message": "User analytics retrieved successfully",
	})
}

// GetApplicationAnalytics returns application analytics data
// @Summary Get application analytics
// @Description Get application analytics including usage patterns and error rates
// @Tags analytics
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (ISO format)"
// @Param end_date query string false "End date (ISO format)"
// @Param range query string false "Time range (24h, 7d, 30d, 90d)"
// @Success 200 {object} ApplicationAnalytics
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /analytics/applications [get]
func (h *AnalyticsHandler) GetApplicationAnalytics(c *fiber.Ctx) error {
	var timeRange AnalyticsTimeRange
	if err := c.QueryParser(&timeRange); err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: "Invalid query parameters"})
	}

	startTime, endTime, err := h.parseTimeRange(timeRange)
	if err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: err.Error()})
	}

	// Get total applications
	var totalApplications int64
	h.db.Model(&models.Application{}).Count(&totalApplications)

	// Get application usage
	applicationUsage := h.getApplicationUsage(startTime, endTime)

	// Get API usage trend (mock data for now)
	apiUsageTrend := h.getAPIUsageTrend(startTime, endTime)

	// Get error rates (mock data for now)
	errorRates := []ApplicationError{
		{Application: "Web App", ErrorRate: 2.1, TotalRequests: 5000},
		{Application: "Mobile App", ErrorRate: 1.8, TotalRequests: 3200},
		{Application: "API Service", ErrorRate: 0.5, TotalRequests: 8900},
	}

	analytics := ApplicationAnalytics{
		TotalApplications: totalApplications,
		ApplicationUsage:  applicationUsage,
		APIUsageTrend:     apiUsageTrend,
		ErrorRates:        errorRates,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    analytics,
		"message": "Application analytics retrieved successfully",
	})
}

// GetSecurityAnalytics returns security analytics data
// @Summary Get security analytics
// @Description Get security analytics including threat detection and suspicious activities
// @Tags analytics
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (ISO format)"
// @Param end_date query string false "End date (ISO format)"
// @Param range query string false "Time range (24h, 7d, 30d, 90d)"
// @Success 200 {object} SecurityAnalytics
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Security BearerAuth
// @Router /analytics/security [get]
func (h *AnalyticsHandler) GetSecurityAnalytics(c *fiber.Ctx) error {
	var timeRange AnalyticsTimeRange
	if err := c.QueryParser(&timeRange); err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: "Invalid query parameters"})
	}

	startTime, endTime, err := h.parseTimeRange(timeRange)
	if err != nil {
		return c.Status(400).JSON(ErrorResponse{Error: true, Message: err.Error()})
	}

	// Get suspicious activities (failed logins from same IP > 5)
	suspiciousActivities := h.getSuspiciousActivities(startTime, endTime)

	// Get failed login IPs
	failedLoginIPs := h.getFailedLoginIPs(startTime, endTime)

	// Get permission usage
	permissionUsage := h.getPermissionUsage(startTime, endTime)

	// Get security events trend
	securityEventsTrend := h.getSecurityEventsTrend(startTime, endTime)

	analytics := SecurityAnalytics{
		SuspiciousActivities: suspiciousActivities,
		BlockedIPs:          0, // Mock data for now
		FailedLoginIPs:      failedLoginIPs,
		PermissionUsage:     permissionUsage,
		SecurityEventsTrend: securityEventsTrend,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    analytics,
		"message": "Security analytics retrieved successfully",
	})
}

// Helper methods

func (h *AnalyticsHandler) parseTimeRange(timeRange AnalyticsTimeRange) (time.Time, time.Time, error) {
	var startTime, endTime time.Time
	var err error

	if timeRange.StartDate != "" && timeRange.EndDate != "" {
		startTime, err = time.Parse(time.RFC3339, timeRange.StartDate)
		if err != nil {
			return startTime, endTime, err
		}
		endTime, err = time.Parse(time.RFC3339, timeRange.EndDate)
		if err != nil {
			return startTime, endTime, err
		}
	} else {
		endTime = time.Now()
		switch timeRange.Range {
		case "24h":
			startTime = endTime.Add(-24 * time.Hour)
		case "7d":
			startTime = endTime.Add(-7 * 24 * time.Hour)
		case "30d":
			startTime = endTime.Add(-30 * 24 * time.Hour)
		case "90d":
			startTime = endTime.Add(-90 * 24 * time.Hour)
		default:
			startTime = endTime.Add(-7 * 24 * time.Hour) // Default to 7 days
		}
	}

	return startTime, endTime, nil
}

func (h *AnalyticsHandler) getLoginTrends(startTime, endTime time.Time) []AuthenticationTrendPoint {
	trends := []AuthenticationTrendPoint{}
	
	// Generate daily trends
	for d := startTime; d.Before(endTime); d = d.Add(24 * time.Hour) {
		dayStart := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		dayEnd := dayStart.Add(24 * time.Hour)
		
		var successful, failed int64
		h.db.Model(&models.AuditLog{}).
			Where("action = ? AND created_at >= ? AND created_at < ?", models.ActionLogin, dayStart, dayEnd).
			Count(&successful)
		
		h.db.Model(&models.AuditLog{}).
			Where("action = ? AND created_at >= ? AND created_at < ?", models.ActionLoginFailed, dayStart, dayEnd).
			Count(&failed)
		
		trends = append(trends, AuthenticationTrendPoint{
			Date:       dayStart.Format("2006-01-02"),
			Successful: successful,
			Failed:     failed,
		})
	}
	
	return trends
}

func (h *AnalyticsHandler) getPeakHours(startTime, endTime time.Time) []PeakHourCount {
	peakHours := make([]PeakHourCount, 24)
	
	for i := 0; i < 24; i++ {
		var count int64
		h.db.Model(&models.AuditLog{}).
			Where("action IN ? AND created_at BETWEEN ? AND ? AND EXTRACT(hour FROM created_at) = ?", 
				[]string{string(models.ActionLogin), string(models.ActionLoginFailed)}, 
				startTime, endTime, i).
			Count(&count)
		
		peakHours[i] = PeakHourCount{
			Hour:  i,
			Count: count,
		}
	}
	
	return peakHours
}

func (h *AnalyticsHandler) getNewUsersTrend(startTime, endTime time.Time) []NewUserTrendPoint {
	trends := []NewUserTrendPoint{}
	
	for d := startTime; d.Before(endTime); d = d.Add(24 * time.Hour) {
		dayStart := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		dayEnd := dayStart.Add(24 * time.Hour)
		
		var count int64
		h.db.Model(&models.User{}).
			Where("created_at >= ? AND created_at < ?", dayStart, dayEnd).
			Count(&count)
		
		trends = append(trends, NewUserTrendPoint{
			Date:  dayStart.Format("2006-01-02"),
			Count: count,
		})
	}
	
	return trends
}

func (h *AnalyticsHandler) getRoleDistribution() []RoleDistribution {
	var results []struct {
		RoleName string
		Count    int64
	}
	
	h.db.Table("user_roles").
		Select("roles.name as role_name, COUNT(*) as count").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Group("roles.name").
		Scan(&results)
	
	distribution := make([]RoleDistribution, len(results))
	for i, result := range results {
		distribution[i] = RoleDistribution{
			Role:  result.RoleName,
			Count: result.Count,
		}
	}
	
	return distribution
}

func (h *AnalyticsHandler) getTopActiveUsers(startTime, endTime time.Time) []TopActiveUser {
	var results []struct {
		UserID      string
		Email       string
		FirstName   string
		LastName    string
		ActionCount int64
	}
	
	h.db.Table("audit_logs").
		Select("users.id as user_id, users.email, users.first_name, users.last_name, COUNT(*) as action_count").
		Joins("JOIN users ON audit_logs.user_id = users.id").
		Where("audit_logs.created_at BETWEEN ? AND ?", startTime, endTime).
		Group("users.id, users.email, users.first_name, users.last_name").
		Order("action_count DESC").
		Limit(10).
		Scan(&results)
	
	topUsers := make([]TopActiveUser, len(results))
	for i, result := range results {
		topUsers[i] = TopActiveUser{
			UserID:      result.UserID,
			Email:       result.Email,
			Name:        result.FirstName + " " + result.LastName,
			ActionCount: result.ActionCount,
		}
	}
	
	return topUsers
}

func (h *AnalyticsHandler) getApplicationUsage(startTime, endTime time.Time) []ApplicationUsage {
	var results []struct {
		ApplicationID string
		Name          string
		RequestCount  int64
		UserCount     int64
	}
	
	h.db.Table("audit_logs").
		Select("applications.id as application_id, applications.name, COUNT(*) as request_count, COUNT(DISTINCT audit_logs.user_id) as user_count").
		Joins("JOIN applications ON audit_logs.application_id = applications.id").
		Where("audit_logs.created_at BETWEEN ? AND ?", startTime, endTime).
		Group("applications.id, applications.name").
		Order("request_count DESC").
		Scan(&results)
	
	usage := make([]ApplicationUsage, len(results))
	for i, result := range results {
		usage[i] = ApplicationUsage{
			ApplicationID: result.ApplicationID,
			Name:          result.Name,
			RequestCount:  result.RequestCount,
			UserCount:     result.UserCount,
		}
	}
	
	return usage
}

func (h *AnalyticsHandler) getAPIUsageTrend(startTime, endTime time.Time) []APIUsageTrendPoint {
	trends := []APIUsageTrendPoint{}
	
	for d := startTime; d.Before(endTime); d = d.Add(24 * time.Hour) {
		dayStart := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		dayEnd := dayStart.Add(24 * time.Hour)
		
		var requests int64
		h.db.Model(&models.AuditLog{}).
			Where("created_at >= ? AND created_at < ?", dayStart, dayEnd).
			Count(&requests)
		
		trends = append(trends, APIUsageTrendPoint{
			Date:     dayStart.Format("2006-01-02"),
			Requests: requests,
		})
	}
	
	return trends
}

func (h *AnalyticsHandler) getSuspiciousActivities(startTime, endTime time.Time) int64 {
	var count int64
	h.db.Model(&models.AuditLog{}).
		Select("COUNT(DISTINCT ip_address)").
		Where("action = ? AND created_at BETWEEN ? AND ?", models.ActionLoginFailed, startTime, endTime).
		Group("ip_address").
		Having("COUNT(*) >= ?", 5).
		Count(&count)
	
	return count
}

func (h *AnalyticsHandler) getFailedLoginIPs(startTime, endTime time.Time) []FailedLoginIP {
	var results []struct {
		IPAddress   string
		Attempts    int64
		LastAttempt time.Time
	}
	
	h.db.Table("audit_logs").
		Select("ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt").
		Where("action = ? AND created_at BETWEEN ? AND ? AND ip_address IS NOT NULL", models.ActionLoginFailed, startTime, endTime).
		Group("ip_address").
		Having("COUNT(*) >= ?", 3).
		Order("attempts DESC").
		Limit(10).
		Scan(&results)
	
	failedIPs := make([]FailedLoginIP, len(results))
	for i, result := range results {
		failedIPs[i] = FailedLoginIP{
			IPAddress:   result.IPAddress,
			Attempts:    result.Attempts,
			LastAttempt: result.LastAttempt.Format(time.RFC3339),
		}
	}
	
	return failedIPs
}

func (h *AnalyticsHandler) getPermissionUsage(startTime, endTime time.Time) []PermissionUsage {
	// This would require tracking permission usage in audit logs
	// For now, return mock data with application-scoped permissions
	return []PermissionUsage{
		{Permission: "authy_users:read", UsageCount: 450},
		{Permission: "authy_users:update", UsageCount: 230},
		{Permission: "authy_applications:read", UsageCount: 180},
		{Permission: "authy_system:audit", UsageCount: 95},
		{Permission: "authy_roles:list", UsageCount: 78},
	}
}

func (h *AnalyticsHandler) getSecurityEventsTrend(startTime, endTime time.Time) []SecurityEventTrend {
	trends := []SecurityEventTrend{}
	
	for d := startTime; d.Before(endTime); d = d.Add(24 * time.Hour) {
		dayStart := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		dayEnd := dayStart.Add(24 * time.Hour)
		
		var events int64
		h.db.Model(&models.AuditLog{}).
			Where("action = ? AND created_at >= ? AND created_at < ?", models.ActionLoginFailed, dayStart, dayEnd).
			Count(&events)
		
		trends = append(trends, SecurityEventTrend{
			Date:   dayStart.Format("2006-01-02"),
			Events: events,
		})
	}
	
	return trends
}