package handlers

import (
	"github.com/efrenfuentes/authy/internal/cache"
	"github.com/efrenfuentes/authy/internal/config"
	"github.com/efrenfuentes/authy/pkg/auth"
	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db             *gorm.DB
	cache          *cache.Client
	logger         *logger.Logger
	sessionService *auth.SessionService
}

type UserHandler struct {
	db             *gorm.DB
	cache          *cache.Client
	logger         *logger.Logger
	sessionService *auth.SessionService
}

type ApplicationHandler struct {
	db     *gorm.DB
	cache  *cache.Client
	logger *logger.Logger
}

func NewAuthHandler(db *gorm.DB, cache *cache.Client, logger *logger.Logger, sessionService *auth.SessionService) *AuthHandler {
	return &AuthHandler{
		db:             db,
		cache:          cache,
		logger:         logger,
		sessionService: sessionService,
	}
}

func NewUserHandler(db *gorm.DB, cache *cache.Client, logger *logger.Logger, sessionService *auth.SessionService) *UserHandler {
	return &UserHandler{
		db:             db,
		cache:          cache,
		logger:         logger,
		sessionService: sessionService,
	}
}

func NewApplicationHandler(db *gorm.DB, cache *cache.Client, logger *logger.Logger) *ApplicationHandler {
	return &ApplicationHandler{
		db:     db,
		cache:  cache,
		logger: logger,
	}
}

// Health check endpoint
func HealthCheck(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": cfg.ServiceName,
			"version": cfg.Version,
		})
	}
}

// Metrics endpoint
func Metrics() fiber.Handler {
	return adaptor.HTTPHandler(promhttp.Handler())
}

// Auth handlers are now implemented in auth.go

// Common response types are defined in types.go

// User handlers are implemented in users.go and user_roles.go

// Application handlers are implemented in applications.go