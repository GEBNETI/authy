package models

import (
	"encoding/json"
	"net"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/datatypes"
)

type AuditLog struct {
	ID            uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	UserID        *uuid.UUID     `json:"user_id" gorm:"type:uuid;index:idx_audit_logs_user"`
	ApplicationID *uuid.UUID     `json:"application_id" gorm:"type:uuid;index:idx_audit_logs_application"`
	Action        string         `json:"action" gorm:"not null;size:50;index:idx_audit_logs_action"`
	Resource      string         `json:"resource" gorm:"not null;size:100"`
	ResourceID    *string        `json:"resource_id" gorm:"size:255"`
	Details       datatypes.JSON `json:"details" gorm:"type:jsonb;default:'{}'"`
	IPAddress     *net.IP        `json:"ip_address" gorm:"type:inet"`
	UserAgent     *string        `json:"user_agent" gorm:"type:text"`
	CreatedAt     time.Time      `json:"created_at" gorm:"index:idx_audit_logs_created"`

	// Relationships
	User        *User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Application *Application `json:"application,omitempty" gorm:"foreignKey:ApplicationID"`
}

// TableName specifies the table name for GORM
func (AuditLog) TableName() string {
	return "audit_logs"
}

// BeforeCreate hook to generate UUID if not provided
func (al *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	return nil
}

// AuditAction represents common audit actions
type AuditAction string

const (
	ActionLogin             AuditAction = "login"
	ActionLoginFailed       AuditAction = "login_failed"
	ActionLogout            AuditAction = "logout"
	ActionTokenRefresh      AuditAction = "token_refresh"
	ActionTokenValidate     AuditAction = "token_validate"
	ActionUserCreate        AuditAction = "user_create"
	ActionUserUpdate        AuditAction = "user_update"
	ActionUserDelete        AuditAction = "user_delete"
	ActionUserActivate      AuditAction = "user_activate"
	ActionUserDeactivate    AuditAction = "user_deactivate"
	ActionRoleAssign        AuditAction = "role_assign"
	ActionRoleRemove        AuditAction = "role_remove"
	ActionApplicationCreate AuditAction = "application_create"
	ActionApplicationUpdate AuditAction = "application_update"
	ActionApplicationDelete AuditAction = "application_delete"
	ActionRoleCreate        AuditAction = "role_create"
	ActionRoleUpdate        AuditAction = "role_update"
	ActionRoleDelete        AuditAction = "role_delete"
	ActionPasswordChange    AuditAction = "password_change"
	ActionAPIKeyRegenerate  AuditAction = "api_key_regenerate"
)

// SetDetails sets the details field from a map or struct
func (al *AuditLog) SetDetails(details interface{}) error {
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		return err
	}
	al.Details = datatypes.JSON(detailsJSON)
	return nil
}

// GetDetails unmarshals the details field into the provided interface
func (al *AuditLog) GetDetails(destination interface{}) error {
	if len(al.Details) == 0 {
		return nil
	}
	return json.Unmarshal(al.Details, destination)
}

// CreateAuditLog creates a new audit log entry
func CreateAuditLog(db *gorm.DB, userID *uuid.UUID, applicationID *uuid.UUID, action AuditAction, resource string, resourceID *string, details interface{}, ipAddress *net.IP, userAgent *string) error {
	auditLog := &AuditLog{
		UserID:        userID,
		ApplicationID: applicationID,
		Action:        string(action),
		Resource:      resource,
		ResourceID:    resourceID,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
	}
	
	if details != nil {
		if err := auditLog.SetDetails(details); err != nil {
			return err
		}
	}
	
	return db.Create(auditLog).Error
}

// GetAuditLogs retrieves audit logs with filtering options
func GetAuditLogs(db *gorm.DB, filters AuditLogFilters, limit, offset int) ([]AuditLog, int64, error) {
	query := db.Model(&AuditLog{})
	
	// Apply filters
	if filters.UserID != nil {
		query = query.Where("user_id = ?", *filters.UserID)
	}
	
	if filters.ApplicationID != nil {
		query = query.Where("application_id = ?", *filters.ApplicationID)
	}
	
	if filters.Action != "" {
		query = query.Where("action = ?", filters.Action)
	}
	
	if filters.Resource != "" {
		query = query.Where("resource = ?", filters.Resource)
	}
	
	if !filters.StartDate.IsZero() {
		query = query.Where("created_at >= ?", filters.StartDate)
	}
	
	if !filters.EndDate.IsZero() {
		query = query.Where("created_at <= ?", filters.EndDate)
	}
	
	if filters.IPAddress != nil {
		query = query.Where("ip_address = ?", *filters.IPAddress)
	}
	
	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// Get records with pagination
	var auditLogs []AuditLog
	err := query.Preload("User").
		Preload("Application").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&auditLogs).Error
	
	return auditLogs, total, err
}

// AuditLogFilters represents filters for audit log queries
type AuditLogFilters struct {
	UserID        *uuid.UUID
	ApplicationID *uuid.UUID
	Action        string
	Resource      string
	StartDate     time.Time
	EndDate       time.Time
	IPAddress     *net.IP
}

// GetAuditLogsByUser retrieves audit logs for a specific user
func GetAuditLogsByUser(db *gorm.DB, userID uuid.UUID, limit, offset int) ([]AuditLog, error) {
	var auditLogs []AuditLog
	err := db.Where("user_id = ?", userID).
		Preload("Application").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&auditLogs).Error
	
	return auditLogs, err
}

// GetAuditLogsByApplication retrieves audit logs for a specific application
func GetAuditLogsByApplication(db *gorm.DB, applicationID uuid.UUID, limit, offset int) ([]AuditLog, error) {
	var auditLogs []AuditLog
	err := db.Where("application_id = ?", applicationID).
		Preload("User").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&auditLogs).Error
	
	return auditLogs, err
}

// GetAuditLogStats returns statistics about audit logs
func GetAuditLogStats(db *gorm.DB) (map[string]int64, error) {
	stats := make(map[string]int64)
	
	// Total logs
	var total int64
	if err := db.Model(&AuditLog{}).Count(&total).Error; err != nil {
		return nil, err
	}
	stats["total"] = total
	
	// Logs in last 24 hours
	var last24h int64
	if err := db.Model(&AuditLog{}).
		Where("created_at > ?", time.Now().Add(-24*time.Hour)).
		Count(&last24h).Error; err != nil {
		return nil, err
	}
	stats["last_24h"] = last24h
	
	// Failed login attempts in last hour
	var failedLogins int64
	if err := db.Model(&AuditLog{}).
		Where("action = ? AND created_at > ?", ActionLoginFailed, time.Now().Add(-time.Hour)).
		Count(&failedLogins).Error; err != nil {
		return nil, err
	}
	stats["failed_logins_last_hour"] = failedLogins
	
	return stats, nil
}

// CleanupOldAuditLogs removes audit logs older than the specified duration
func CleanupOldAuditLogs(db *gorm.DB, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	return db.Where("created_at < ?", cutoff).Delete(&AuditLog{}).Error
}