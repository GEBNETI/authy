# Variables
BINARY_NAME=authy
DOCKER_IMAGE=authy:latest
GO_VERSION=1.22

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

.PHONY: help build run test clean docker-build docker-run docker-stop lint format deps migrate-up migrate-down

help: ## Show this help message
	@echo "$(GREEN)Authy Authentication Service$(NC)"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the application
	@echo "$(GREEN)Building $(BINARY_NAME)...$(NC)"
	go build -o bin/$(BINARY_NAME) ./cmd/server

run: ## Run the application
	@echo "$(GREEN)Running $(BINARY_NAME)...$(NC)"
	go run ./cmd/server/main.go

test: ## Run tests
	@echo "$(GREEN)Running tests...$(NC)"
	go test -v ./...

test-coverage: ## Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf bin/
	rm -f coverage.out coverage.html

docker-build: ## Build Podman image
	@echo "$(GREEN)Building Podman image...$(NC)"
	podman build -t $(DOCKER_IMAGE) .

docker-run: ## Run with Docker Compose
	@echo "$(GREEN)Starting services with Docker Compose...$(NC)"
	docker-compose up -d

docker-stop: ## Stop Docker Compose services
	@echo "$(YELLOW)Stopping Docker Compose services...$(NC)"
	docker-compose down

docker-logs: ## Show Docker Compose logs
	docker-compose logs -f

lint: ## Run linter
	@echo "$(GREEN)Running linter...$(NC)"
	golangci-lint run

format: ## Format code
	@echo "$(GREEN)Formatting code...$(NC)"
	go fmt ./...
	goimports -w .

deps: ## Download dependencies
	@echo "$(GREEN)Downloading dependencies...$(NC)"
	go mod download
	go mod tidy

deps-update: ## Update dependencies
	@echo "$(GREEN)Updating dependencies...$(NC)"
	go get -u ./...
	go mod tidy

migrate-up: ## Run database migrations up
	@echo "$(GREEN)Running database migrations up...$(NC)"
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down: ## Run database migrations down
	@echo "$(YELLOW)Running database migrations down...$(NC)"
	migrate -path migrations -database "$(DATABASE_URL)" down

migrate-create: ## Create new migration (usage: make migrate-create NAME=migration_name)
	@echo "$(GREEN)Creating migration: $(NAME)...$(NC)"
	migrate create -ext sql -dir migrations $(NAME)

dev: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose up -d postgres valkey
	@echo "$(YELLOW)Waiting for services to be ready...$(NC)"
	sleep 5
	@echo "$(GREEN)Services ready! You can now run: make run$(NC)"

swagger: ## Generate Swagger documentation
	@echo "$(GREEN)Generating Swagger documentation...$(NC)"
	swag init -g cmd/server/main.go -o docs/

install-tools: ## Install development tools
	@echo "$(GREEN)Installing development tools...$(NC)"
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
	go install github.com/swaggo/swag/cmd/swag@latest
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest