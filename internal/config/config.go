package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	ValkeURL       string
	JWTSecret      string
	JWTExpiration  int
	RefreshExpiration int
	LogLevel       string
	Environment    string
	Port           string
	Version        string
	ServiceName    string
}

func Load() *Config {
	// Load .env file if it exists
	godotenv.Load()

	return &Config{
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/authy?sslmode=disable"),
		ValkeURL:          getEnv("VALKEY_URL", "localhost:6379"),
		JWTSecret:         getEnv("JWT_SECRET", "your-secret-key"),
		JWTExpiration:     getEnvAsInt("JWT_EXPIRATION", 3600), // 1 hour
		RefreshExpiration: getEnvAsInt("REFRESH_EXPIRATION", 604800), // 7 days
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		Environment:       getEnv("ENVIRONMENT", "development"),
		Port:              getEnv("PORT", "8080"),
		Version:           getEnv("VERSION", "1.0.0"),
		ServiceName:       getEnv("SERVICE_NAME", "Authy Authentication Service"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}