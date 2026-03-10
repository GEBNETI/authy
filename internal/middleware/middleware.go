package middleware

import (
	"context"
	"encoding/json"
	"net"
	"strconv"
	"strings"
	"time"

	"github.com/GEBNETI/authy/internal/cache"
	"github.com/GEBNETI/authy/pkg/auth"
	"github.com/GEBNETI/authy/pkg/logger"
	"github.com/GEBNETI/authy/pkg/metrics"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Error handler middleware
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	// Metrics are already recorded by the Metrics() middleware

	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"message": message,
	})
}

// Logger middleware
func Logger(log *logger.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		requestBody := formatRequestBody(c)

		err := c.Next()

		log.Info("HTTP Request",
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"duration", time.Since(start).Milliseconds(),
			"ip", c.IP(),
			"user_agent", c.Get("User-Agent"),
			"request_body", requestBody,
		)

		return err
	}
}

const maxLoggedRequestBodyLength = 4096

var redactedRequestBodyFields = map[string]struct{}{
	"password":         {},
	"current_password": {},
	"new_password":     {},
	"confirm_password": {},
	"token":            {},
	"access_token":     {},
	"refresh_token":    {},
	"authorization":    {},
	"secret":           {},
	"client_secret":    {},
	"api_key":          {},
	"jwt_secret":       {},
}

func formatRequestBody(c *fiber.Ctx) string {
	if len(c.Body()) == 0 {
		return ""
	}

	contentType := strings.ToLower(c.Get(fiber.HeaderContentType))
	switch {
	case strings.Contains(contentType, "application/json"):
		return formatJSONRequestBody(c.Body())
	case strings.Contains(contentType, "application/x-www-form-urlencoded"), strings.HasPrefix(contentType, "text/"):
		return truncateLogValue(string(c.Body()))
	case strings.Contains(contentType, "multipart/form-data"):
		return "[multipart/form-data omitted]"
	default:
		return "[non-text body omitted]"
	}
}

func formatJSONRequestBody(body []byte) string {
	var payload any
	if err := json.Unmarshal(body, &payload); err != nil {
		return truncateLogValue(string(body))
	}

	redactSensitiveFields(payload)

	sanitized, err := json.Marshal(payload)
	if err != nil {
		return truncateLogValue(string(body))
	}

	return truncateLogValue(string(sanitized))
}

func redactSensitiveFields(value any) {
	switch v := value.(type) {
	case map[string]any:
		for key, nestedValue := range v {
			if _, ok := redactedRequestBodyFields[strings.ToLower(key)]; ok {
				v[key] = "[REDACTED]"
				continue
			}
			redactSensitiveFields(nestedValue)
		}
	case []any:
		for _, item := range v {
			redactSensitiveFields(item)
		}
	}
}

func truncateLogValue(value string) string {
	if len(value) <= maxLoggedRequestBodyLength {
		return value
	}

	return value[:maxLoggedRequestBodyLength] + "...[truncated]"
}

// Metrics middleware
func Metrics() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		// Skip recording metrics for the metrics endpoint and docs to avoid issues
		path := c.Path()
		if strings.HasPrefix(path, "/metrics") || strings.HasPrefix(path, "/docs") || strings.HasPrefix(path, "/swagger") {
			return err
		}

		duration := time.Since(start).Seconds()
		status := c.Response().StatusCode()

		// Record metrics using our simple collector
		metrics.RecordHTTPRequest(c.Method(), path, strconv.Itoa(status), duration)

		return err
	}
}

// AuthRequired creates a middleware that requires valid JWT authentication
func AuthRequired(sessionService *auth.SessionService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Authorization header required",
			})
		}

		// Extract token from header
		token := auth.ExtractTokenFromHeader(authHeader)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Invalid authorization header format",
			})
		}

		// Validate token
		claims, err := sessionService.ValidateToken(context.Background(), token)
		if err != nil {
			var message string
			switch err {
			case auth.ErrExpiredToken:
				message = "Token has expired"
			case auth.ErrInvalidToken:
				message = "Invalid token"
			case auth.ErrInvalidTokenType:
				message = "Invalid token type"
			default:
				message = "Token validation failed"
			}

			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": message,
			})
		}

		// Ensure it's an access token
		if claims.TokenType != auth.AccessTokenType {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Access token required",
			})
		}

		// Store user info in context for handlers
		c.Locals("user_id", claims.UserID)
		c.Locals("application_id", claims.ApplicationID)
		c.Locals("permissions", claims.Permissions)
		c.Locals("claims", claims)

		return c.Next()
	}
}

// RateLimiter creates a middleware for rate limiting
func RateLimiter(cache *cache.Client, requestsPerMinute int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get client IP
		clientIP := c.IP()

		// Create rate limit key
		rateLimitKey := "rate_limit:" + clientIP

		// Get current count from cache
		countStr, err := cache.Get(context.Background(), rateLimitKey)
		if err != nil {
			// On cache error, allow the request
			return c.Next()
		}

		var count int
		if countStr != "" {
			count, _ = strconv.Atoi(countStr)
		}

		// Check if limit exceeded
		if count >= requestsPerMinute {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   true,
				"message": "Rate limit exceeded",
			})
		}

		// Increment counter
		count++
		cache.Set(context.Background(), rateLimitKey, strconv.Itoa(count), 60) // 60 seconds TTL

		// Add rate limit headers
		c.Set("X-RateLimit-Limit", strconv.Itoa(requestsPerMinute))
		c.Set("X-RateLimit-Remaining", strconv.Itoa(requestsPerMinute-count))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))

		return c.Next()
	}
}

// RequirePermission creates a middleware that checks for specific permissions
func RequirePermission(resource, action string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		permissions, ok := c.Locals("permissions").([]string)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   true,
				"message": "No permissions found",
			})
		}

		// Convert resource to application-scoped format if needed
		scopedResource := resource
		if !strings.HasPrefix(resource, "authy_") {
			scopedResource = "authy_" + resource
		}

		// Check for wildcard permission or exact match
		requiredPermission := scopedResource + ":" + action
		for _, perm := range permissions {
			if perm == "*" ||
				perm == "authy_system:admin" || // Super admin permission
				perm == scopedResource+":*" ||
				perm == requiredPermission {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   true,
			"message": "Insufficient permissions",
		})
	}
}

// ExtractUserContext extracts user information from fiber context
func ExtractUserContext(c *fiber.Ctx) (uuid.UUID, uuid.UUID, []string, bool) {
	userID, ok1 := c.Locals("user_id").(uuid.UUID)
	applicationID, ok2 := c.Locals("application_id").(uuid.UUID)
	permissions, ok3 := c.Locals("permissions").([]string)

	return userID, applicationID, permissions, ok1 && ok2 && ok3
}

// ExtractClientIP extracts the real client IP address
func ExtractClientIP(c *fiber.Ctx) net.IP {
	// Check X-Forwarded-For header first
	forwarded := c.Get("X-Forwarded-For")
	if forwarded != "" {
		ips := strings.Split(forwarded, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if parsedIP := net.ParseIP(ip); parsedIP != nil {
				return parsedIP
			}
		}
	}

	// Check X-Real-IP header
	realIP := c.Get("X-Real-IP")
	if realIP != "" {
		if parsedIP := net.ParseIP(realIP); parsedIP != nil {
			return parsedIP
		}
	}

	// Fall back to remote address
	ip := net.ParseIP(c.IP())
	if ip != nil {
		return ip
	}

	// Default fallback
	return net.ParseIP("127.0.0.1")
}
