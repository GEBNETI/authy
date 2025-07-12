package main

import (
	"log"
	"os"

	"github.com/efrenfuentes/authy/internal/config"
	"github.com/efrenfuentes/authy/internal/database"
	"github.com/efrenfuentes/authy/internal/cache"
	"github.com/efrenfuentes/authy/internal/handlers"
	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/efrenfuentes/authy/pkg/metrics"
	
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
)

// @title Authy Authentication Service API
// @version 1.0
// @description Central authentication service for multiple applications
// @termsOfService http://swagger.io/terms/
// @contact.name API Support
// @contact.email support@authy.dev
// @license.name MIT
// @license.url https://opensource.org/licenses/MIT
// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// Load configuration
	cfg := config.Load()
	
	// Initialize logger
	log := logger.New(cfg.LogLevel)
	defer log.Sync()
	
	// Initialize metrics
	metrics.Init()
	
	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}
	
	// Connect to cache
	cache, err := cache.Connect(cfg.ValkeURL)
	if err != nil {
		log.Fatal("Failed to connect to cache", "error", err)
	}
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Authy Authentication Service v1.0",
		ErrorHandler: middleware.ErrorHandler,
	})
	
	// Global middleware
	app.Use(recover.New())
	app.Use(cors.New())
	app.Use(middleware.Logger(log))
	app.Use(middleware.Metrics())
	
	// Health check endpoint
	app.Get("/health", handlers.HealthCheck(cfg))
	
	// Metrics endpoint
	app.Get("/metrics", handlers.Metrics())
	
	// Swagger documentation
	app.Get("/docs/*", swagger.HandlerDefault)
	
	// API routes
	api := app.Group("/api/v1")
	
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cache, log)
	userHandler := handlers.NewUserHandler(db, cache, log)
	appHandler := handlers.NewApplicationHandler(db, cache, log)
	
	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Post("/validate", authHandler.ValidateToken)
	
	// User routes
	users := api.Group("/users")
	users.Use(middleware.AuthRequired())
	users.Get("/", userHandler.GetUsers)
	users.Post("/", userHandler.CreateUser)
	users.Get("/:id", userHandler.GetUser)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", userHandler.DeleteUser)
	users.Post("/:id/roles", userHandler.AssignRole)
	users.Delete("/:id/roles/:role_id", userHandler.RemoveRole)
	
	// Application routes
	apps := api.Group("/applications")
	apps.Use(middleware.AuthRequired())
	apps.Get("/", appHandler.GetApplications)
	apps.Post("/", appHandler.CreateApplication)
	apps.Get("/:id", appHandler.GetApplication)
	apps.Put("/:id", appHandler.UpdateApplication)
	apps.Delete("/:id", appHandler.DeleteApplication)
	
	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Info("Starting Authy Authentication Service", "port", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server", "error", err)
	}
}