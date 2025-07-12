package middleware

import (
	"time"

	"github.com/efrenfuentes/authy/pkg/logger"
	"github.com/efrenfuentes/authy/pkg/metrics"
	"github.com/gofiber/fiber/v2"
)

// Error handler middleware
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"message": message,
	})
}

// Logger middleware
func Logger(log *logger.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		
		err := c.Next()
		
		log.Info("HTTP Request",
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"duration", time.Since(start).Milliseconds(),
			"ip", c.IP(),
		)
		
		return err
	}
}

// Metrics middleware
func Metrics() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		
		err := c.Next()
		
		duration := time.Since(start).Seconds()
		status := c.Response().StatusCode()
		
		// Record metrics
		metrics.HTTPRequestsTotal.WithLabelValues(
			c.Method(),
			c.Path(),
			string(rune(status)),
		).Inc()
		
		metrics.HTTPRequestDuration.WithLabelValues(
			c.Method(),
			c.Path(),
		).Observe(duration)
		
		return err
	}
}

// Auth required middleware (placeholder)
func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Implement JWT token validation
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Authorization header required",
			})
		}
		
		// For now, just continue - will implement JWT validation later
		return c.Next()
	}
}