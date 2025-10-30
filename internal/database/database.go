package database

import (
	"github.com/GEBNETI/authy/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}
	
	// Note: Database schema is managed via SQL migrations in /migrations folder
	// Run 'make migrate-up' to apply schema changes
	
	// Create additional indexes
	if err := models.CreateIndexes(db); err != nil {
		return nil, err
	}
	
	// Note: System application and admin user are created via SQL migrations
	// See /migrations/003_create_initial_admin.up.sql
	
	return db, nil
}