# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Go)

**Essential commands:**
- `make dev` - Start PostgreSQL and Valkey containers for development
- `make run` - Run the application (requires dev environment to be running)
- `make build` - Build the binary to `bin/authy` (runs swagger first)
- `make test` - Run all tests
- `make test-coverage` - Run tests with coverage report

**Development workflow:**
- `make deps` - Download and tidy Go dependencies
- `make format` - Format code with gofmt and goimports
- `make lint` - Run golangci-lint
- `make swagger` - Generate Swagger documentation

**Database operations:**
- `make migrate-up` - Apply database migrations (requires DATABASE_URL env var)
- `make migrate-down` - Rollback database migrations
- `make migrate-create NAME=migration_name` - Create new migration

**Docker operations:**
- `make docker-build` - Build Docker image
- `make docker-run` - Start all services with Docker Compose
- `make docker-stop` - Stop Docker Compose services
- `make docker-logs` - Show container logs

**Installation:**
- `make install-tools` - Install required development tools (golangci-lint, swag, migrate, goimports)

### Frontend (React)

**Location:** `frontend/`

**Commands:**
- `npm install` - Install dependencies
- `npm run dev` - Start Vite dev server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Quick Start

```bash
# 1. Start database and cache containers
make dev

# 2. Set DATABASE_URL and run migrations
export DATABASE_URL="postgres://authy_user:authy_password@localhost:5432/authy?sslmode=disable"
make migrate-up

# 3. Create .env file (copy from .env.example or create manually)
# Required: DATABASE_URL, VALKEY_URL, JWT_SECRET

# 4. Run the backend
make run

# 5. In another terminal, run the frontend
cd frontend && npm install && npm run dev
```

**Default Admin Credentials (after migrations):**
- Email: `admin@authy.dev`
- Password: `password`
- Application: `AuthyBackoffice`

## Architecture Overview

**Authy** is a central authentication service designed as a hub for multiple applications, providing JWT-based authentication with per-application token isolation.

### Technology Stack

**Backend:**
- Go with Fiber v2 web framework
- PostgreSQL for persistent data
- Valkey (Redis fork) for tokens, sessions, and rate limiting
- GORM as ORM
- Prometheus metrics
- Auto-generated Swagger/OpenAPI

**Frontend:**
- React 19 with TypeScript
- Vite 7 for bundling
- Tailwind CSS + DaisyUI for styling
- React Router for navigation
- React Hook Form + Zod for forms
- Axios for API calls

### Backend Structure

```
cmd/server/          - Application entry point with Fiber setup
internal/
  config/            - Environment configuration management
  database/          - PostgreSQL connection and GORM setup
  cache/             - Valkey client with basic operations
  handlers/          - HTTP handlers for all endpoints
  middleware/        - Custom middleware (auth, logging, metrics, errors)
  models/            - GORM data models
  services/          - Business logic services
pkg/
  auth/              - JWT and session management
  logger/            - Structured logging with Zap
  metrics/           - Prometheus metrics definitions
migrations/          - SQL database migrations (12 files)
```

### Frontend Structure

```
frontend/
  src/
    components/      - Reusable UI components
      ui/            - Base components (Button, Input, Modal, Table, etc.)
      forms/         - Form components (UserForm, RoleForm, etc.)
      layout/        - Layout components (MainLayout, Sidebar, etc.)
      charts/        - Chart components (LineChart, BarChart, etc.)
    pages/           - Page components
    context/         - React contexts (Auth, Theme, Notification)
    hooks/           - Custom hooks (useUsers, useRoles, etc.)
    services/        - API service layer
    types/           - TypeScript type definitions
    utils/           - Utility functions
```

### Key Design Principles

**Multi-Application Token Isolation:** Tokens are scoped per application, allowing users to logout from one app without affecting sessions in other applications.

**Cache-First Architecture:** Valkey is used for:
- Active and invalidated JWT tokens
- User permissions by application
- Active sessions
- Rate limiting counters

**RBAC (Role-Based Access Control):**
- 24 system permissions pre-defined
- Permissions follow `resource:action` pattern (e.g., `authy_users:read`)
- Roles are application-scoped
- Users can have different roles per application

### API Structure

**System Endpoints:**
- `GET /health` - Service health and version info
- `GET /metrics` - Prometheus metrics
- `GET /docs/*` - Swagger documentation

**Authentication API (`/api/v1/auth`):**
- `POST /login` - Authenticate and get tokens
- `POST /logout` - Invalidate tokens
- `POST /refresh` - Refresh access token
- `POST /validate` - Validate token
- `POST /update_password` - Update own password (authenticated)

**User Management (`/api/v1/users`):**
- Full CRUD with role assignment
- Admin can change user passwords via `PUT /:id` with `password` field
- Requires `authy_users:*` permissions

**Application Management (`/api/v1/applications`):**
- CRUD operations for registered applications
- API key regeneration
- Requires `authy_applications:*` permissions

**Role Management (`/api/v1/roles`):**
- CRUD operations for roles
- Permission assignment to roles
- Requires `authy_roles:*` permissions

**Permission Management (`/api/v1/permissions`):**
- CRUD operations for permissions
- Requires `authy_permissions:*` permissions

**Audit & Analytics (`/api/v1/audit-logs`, `/api/v1/analytics`):**
- Audit log viewing and export
- Authentication, user, application, and security analytics
- Requires `authy_system:audit` permission

All protected endpoints require authentication via the `AuthRequired()` middleware.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (dev default) | PostgreSQL connection string |
| `VALKEY_URL` | `localhost:6379` | Valkey/Redis server address |
| `JWT_SECRET` | (dev default) | **Change in production!** Token signing secret |
| `JWT_EXPIRATION` | `3600` | Access token lifetime in seconds (1 hour) |
| `REFRESH_EXPIRATION` | `604800` | Refresh token lifetime in seconds (7 days) |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `ENVIRONMENT` | `development` | Execution context |
| `PORT` | `8080` | HTTP server port |

## Git Commit Considerations

- Never reference Claude Code in commit messages
- Use conventional commit format when appropriate
- Keep commits focused and atomic
