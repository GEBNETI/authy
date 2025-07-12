# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Essential commands:**
- `make dev` - Start PostgreSQL and Valkey containers for development
- `make run` - Run the application (requires dev environment to be running)
- `make build` - Build the binary to `bin/authy`
- `make test` - Run all tests
- `make test-coverage` - Run tests with coverage report

**Development workflow:**
- `make deps` - Download and tidy Go dependencies  
- `make format` - Format code with gofmt and goimports
- `make lint` - Run golangci-lint
- `make swagger` - Generate Swagger documentation

**Database operations:**
- `make migrate-up` - Apply database migrations
- `make migrate-down` - Rollback database migrations  
- `make migrate-create NAME=migration_name` - Create new migration

**Docker operations:**
- `make docker-build` - Build Docker image
- `make docker-run` - Start all services with Docker Compose
- `make docker-stop` - Stop Docker Compose services
- `make docker-logs` - Show container logs

**Installation:**
- `make install-tools` - Install required development tools (golangci-lint, swag, migrate, goimports)

## Architecture Overview

**Authy** is a central authentication service designed as a hub for multiple applications, providing JWT-based authentication with per-application token isolation.

### Core Architecture

**Technology Stack:**
- **Framework:** Go with Fiber v2 web framework
- **Database:** PostgreSQL for persistent data
- **Cache:** Valkey (Redis fork) for tokens, sessions, and rate limiting
- **Monitoring:** Prometheus metrics with custom collectors
- **Documentation:** Auto-generated Swagger/OpenAPI

**Application Structure:**
```
cmd/server/          - Application entry point with Fiber setup
internal/config/     - Environment configuration management
internal/database/   - PostgreSQL connection and GORM setup
internal/cache/      - Valkey client with basic operations
internal/handlers/   - HTTP handlers for all endpoints
internal/middleware/ - Custom middleware (auth, logging, metrics, errors)
pkg/logger/          - Structured logging with Zap
pkg/metrics/         - Prometheus metrics definitions
```

### Key Design Principles

**Multi-Application Token Isolation:** Tokens are scoped per application, allowing users to logout from one app without affecting sessions in other applications.

**Cache-First Architecture:** Valkey is used for:
- Active and invalidated JWT tokens
- User permissions by application
- Active sessions
- Rate limiting counters

**Comprehensive Observability:** 
- All authentication operations are logged
- Prometheus metrics for requests, latency, auth attempts, database connections
- Health checks include dependency status
- `/metrics` endpoint for Prometheus scraping
- `/health` endpoint returns service info and dependency status

### Authentication Flow

The system uses JWT tokens with refresh token capability. All tokens maintain relationships with both user and application, enabling granular session management across multiple client applications.

### Environment Setup

Development requires `.env` file with database credentials matching `docker-compose.yml`. The application expects:
- PostgreSQL at `localhost:5432` with `authy_user:authy_password` 
- Valkey at `localhost:6379`
- JWT secrets and expiration times
- Log levels and service metadata

### API Structure

**System Endpoints:**
- `GET /health` - Service health and version info
- `GET /metrics` - Prometheus metrics
- `GET /docs/*` - Swagger documentation

**Authentication API (`/api/v1/auth`):**
- `POST /login, /logout, /refresh, /validate`

**User Management (`/api/v1/users`):** 
- Full CRUD with role assignment (requires authentication)

**Application Management (`/api/v1/applications`):**
- CRUD operations for registered applications (requires authentication)

All user and application endpoints require authentication via the `AuthRequired()` middleware.

## Git commit messages considerations
- Never do any references to Claude Code in the commit message
