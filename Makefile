# Variables
BINARY_NAME=authy
DOCKER_IMAGE=authy:latest
GO_VERSION=1.24

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m

.PHONY: help build run test clean docker-build docker-run docker-stop lint format deps migrate-up migrate-down migrate-rollback

help: ## Show this help message
	@printf '%b\n' "$(GREEN)Authy Authentication Service$(NC)"
	@printf '%s\n' "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: swagger ## Build the application
	@printf '%b\n' "$(GREEN)Building $(BINARY_NAME)...$(NC)"
	go build -o bin/$(BINARY_NAME) ./cmd/server

run: ## Run the application
	@printf '%b\n' "$(GREEN)Running $(BINARY_NAME)...$(NC)"
	go run ./cmd/server/main.go

test: ## Run tests
	@printf '%b\n' "$(GREEN)Running tests...$(NC)"
	go test -v ./...

test-coverage: ## Run tests with coverage
	@printf '%b\n' "$(GREEN)Running tests with coverage...$(NC)"
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean: ## Clean build artifacts
	@printf '%b\n' "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf bin/
	rm -f coverage.out coverage.html

docker-build: ## Build Docker image
	@printf '%b\n' "$(GREEN)Building Docker image...$(NC)"
	docker build -t $(DOCKER_IMAGE) .

docker-run: ## Run with Docker Compose
	@printf '%b\n' "$(GREEN)Starting services with Docker Compose...$(NC)"
	docker-compose up -d

docker-stop: ## Stop Docker Compose services
	@printf '%b\n' "$(YELLOW)Stopping Docker Compose services...$(NC)"
	docker-compose down

docker-logs: ## Show Docker Compose logs
	docker-compose logs -f

lint: ## Run linter
	@printf '%b\n' "$(GREEN)Running linter...$(NC)"
	golangci-lint run

format: ## Format code
	@printf '%b\n' "$(GREEN)Formatting code...$(NC)"
	go fmt ./...
	goimports -w .

deps: ## Download dependencies
	@printf '%b\n' "$(GREEN)Downloading dependencies...$(NC)"
	go mod download
	go mod tidy

deps-update: ## Update dependencies
	@printf '%b\n' "$(GREEN)Updating dependencies...$(NC)"
	go get -u ./...
	go mod tidy

migrate-up: ## Run database migrations up
	@printf '%b\n' "$(GREEN)Running database migrations up...$(NC)"
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down: ## Run database migrations down
	@printf '%b\n' "$(YELLOW)Running database migrations down...$(NC)"
	migrate -path migrations -database "$(DATABASE_URL)" down

migrate-rollback: ## Rollback last migration (down 1)
	@printf '%b\n' "$(YELLOW)Rolling back last migration...$(NC)"
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-create: ## Create new migration (usage: make migrate-create NAME=migration_name)
	@printf '%b\n' "$(GREEN)Creating migration: $(NAME)...$(NC)"
	migrate create -ext sql -dir migrations $(NAME)

dev: ## Start development environment
	@printf '%b\n' "$(GREEN)Starting development environment...$(NC)"
	docker-compose up -d postgres valkey
	@printf '%b\n' "$(YELLOW)Waiting for services to be ready...$(NC)"
	sleep 5
	@printf '%b\n' "$(GREEN)Services ready! You can now run: make run$(NC)"

swagger: ## Generate Swagger documentation
	@printf '%b\n' "$(GREEN)Generating Swagger documentation...$(NC)"
	swag init -g cmd/server/main.go -o docs/

install-tools: ## Install development tools
	@printf '%b\n' "$(GREEN)Installing development tools...$(NC)"
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
	go install github.com/swaggo/swag/cmd/swag@latest
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
