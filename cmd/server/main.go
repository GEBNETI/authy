package main

import (
	"os"
	"time"

	"github.com/efrenfuentes/authy/internal/config"
	"github.com/efrenfuentes/authy/internal/database"
	"github.com/efrenfuentes/authy/internal/cache"
	"github.com/efrenfuentes/authy/internal/handlers"
	"github.com/efrenfuentes/authy/internal/middleware"
	"github.com/efrenfuentes/authy/internal/models"
	"github.com/efrenfuentes/authy/internal/services"
	"github.com/efrenfuentes/authy/pkg/auth"
	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/efrenfuentes/authy/pkg/metrics"
	
	_ "github.com/efrenfuentes/authy/docs"
	
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
	
	// Run permission migration if needed
	if err := models.MigrateFromLegacyPermissions(db); err != nil {
		log.Error("Failed to migrate legacy permissions", "error", err)
		// Don't fail startup, just log the error
	}
	
	// Connect to cache
	cache, err := cache.Connect(cfg.ValkeURL)
	if err != nil {
		log.Fatal("Failed to connect to cache", "error", err)
	}
	
	// Initialize JWT service
	jwtService := auth.NewJWTService(
		cfg.JWTSecret,
		time.Duration(cfg.JWTExpiration)*time.Second,
		time.Duration(cfg.RefreshExpiration)*time.Second,
		cfg.ServiceName,
	)
	
	// Initialize session service
	sessionService := auth.NewSessionService(cache, jwtService)
	
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
	
	// Rate limiting for auth endpoints
	authRateLimit := middleware.RateLimiter(cache, 10) // 10 requests per minute
	
	// Health check endpoint
	app.Get("/health", handlers.HealthCheck(cfg))
	
	// Metrics endpoint
	app.Get("/metrics", handlers.Metrics())
	
	// Swagger documentation
	app.Get("/docs/*", swagger.HandlerDefault)
	
	// API routes
	api := app.Group("/api/v1")
	
	// Initialize services
	auditService := services.NewAuditService(db, log)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cache, log, sessionService)
	userHandler := handlers.NewUserHandler(db, cache, log, sessionService)
	appHandler := handlers.NewApplicationHandler(db, cache, log)
	permissionHandler := handlers.NewPermissionHandler(db, log)
	auditHandler := handlers.NewAuditHandler(auditService)
	
	// Auth routes (with rate limiting)
	auth := api.Group("/auth")
	auth.Use(authRateLimit)
	auth.Post("/login", authHandler.Login)
	auth.Post("/logout", authHandler.Logout)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Post("/validate", authHandler.ValidateToken)
	
	// User routes (require authentication)
	users := api.Group("/users")
	users.Use(middleware.AuthRequired(sessionService))
	users.Get("/", userHandler.GetUsers)
	users.Post("/", middleware.RequirePermission("users", "create"), userHandler.CreateUser)
	users.Get("/:id", middleware.RequirePermission("users", "read"), userHandler.GetUser)
	users.Put("/:id", middleware.RequirePermission("users", "update"), userHandler.UpdateUser)
	users.Delete("/:id", middleware.RequirePermission("users", "delete"), userHandler.DeleteUser)
	users.Post("/:id/roles", middleware.RequirePermission("users", "update"), userHandler.AssignRole)
	users.Delete("/:id/roles/:role_id", middleware.RequirePermission("users", "update"), userHandler.RemoveRole)
	
	// Application routes (require authentication)
	apps := api.Group("/applications")
	apps.Use(middleware.AuthRequired(sessionService))
	apps.Get("/", middleware.RequirePermission("applications", "read"), appHandler.GetApplications)
	apps.Post("/", middleware.RequirePermission("applications", "create"), appHandler.CreateApplication)
	apps.Get("/:id", middleware.RequirePermission("applications", "read"), appHandler.GetApplication)
	apps.Put("/:id", middleware.RequirePermission("applications", "update"), appHandler.UpdateApplication)
	apps.Delete("/:id", middleware.RequirePermission("applications", "delete"), appHandler.DeleteApplication)
	apps.Post("/:id/regenerate-key", middleware.RequirePermission("applications", "update"), appHandler.RegenerateAPIKey)
	
	// Permission routes (require authentication)
	permissions := api.Group("/permissions")
	permissions.Use(middleware.AuthRequired(sessionService))
	permissions.Get("/", middleware.RequirePermission("permissions", "list"), permissionHandler.GetPermissions)
	permissions.Post("/", middleware.RequirePermission("permissions", "create"), permissionHandler.CreatePermission)
	permissions.Get("/:id", middleware.RequirePermission("permissions", "read"), permissionHandler.GetPermission)
	permissions.Delete("/:id", middleware.RequirePermission("permissions", "delete"), permissionHandler.DeletePermission)
	
	// Audit log routes (require authentication and audit permissions)
	auditLogs := api.Group("/audit-logs")
	auditLogs.Use(middleware.AuthRequired(sessionService))
	auditLogs.Get("/", middleware.RequirePermission("system", "audit"), auditHandler.GetAuditLogs)
	auditLogs.Get("/stats", middleware.RequirePermission("system", "audit"), auditHandler.GetAuditStats)
	auditLogs.Get("/export", middleware.RequirePermission("system", "audit"), auditHandler.ExportAuditLogs)
	auditLogs.Get("/options", middleware.RequirePermission("system", "audit"), auditHandler.GetAuditOptions)
	
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