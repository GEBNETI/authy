package database

import (
	"github.com/efrenfuentes/authy/internal/models"
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
	
	// Run auto migrations
	if err := models.AutoMigrate(db); err != nil {
		return nil, err
	}
	
	// Create additional indexes
	if err := models.CreateIndexes(db); err != nil {
		return nil, err
	}
	
	// Seed system application
	if err := models.SeedSystemApplication(db); err != nil {
		return nil, err
	}
	
	return db, nil
}