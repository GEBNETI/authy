# Authy

A central authentication service designed as a hub for multiple applications, providing JWT-based authentication with per-application token isolation.

## Features

- **Multi-Application Support** - Register multiple applications with isolated token scopes
- **JWT Authentication** - Access and refresh token flow with configurable expiration
- **Role-Based Access Control (RBAC)** - Granular permissions with 24 system permissions pre-defined
- **Per-Application Roles** - Users can have different roles in different applications
- **Audit Logging** - Comprehensive logging of all authentication events
- **Analytics Dashboard** - Real-time insights into authentication patterns
- **Rate Limiting** - Configurable rate limits per endpoint
- **Cache-First Architecture** - High performance with Valkey caching
- **Modern Admin UI** - React-based dashboard for user and application management

## Technology Stack

### Backend
- **Language:** Go 1.24+
- **Framework:** Fiber v2
- **Database:** PostgreSQL 16
- **Cache:** Valkey 7.2 (Redis fork)
- **ORM:** GORM
- **Monitoring:** Prometheus metrics
- **Documentation:** Swagger/OpenAPI

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Styling:** Tailwind CSS + DaisyUI
- **Forms:** React Hook Form + Zod
- **Routing:** React Router

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 20+
- Docker & Docker Compose
- Make

### Setup

```bash
# Clone the repository
git clone https://github.com/GEBNETI/authy.git
cd authy

# Install development tools
make install-tools

# Start PostgreSQL and Valkey containers
make dev

# Run database migrations
export DATABASE_URL="postgres://authy_user:authy_password@localhost:5432/authy?sslmode=disable"
make migrate-up

# Create .env file
cat > .env << EOF
DATABASE_URL=postgres://authy_user:authy_password@localhost:5432/authy?sslmode=disable
VALKEY_URL=localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=3600
REFRESH_EXPIRATION=604800
LOG_LEVEL=info
ENVIRONMENT=development
PORT=8080
EOF

# Start the backend
make run

# In another terminal, start the frontend
cd frontend
npm install
npm run dev
```

### Default Credentials

After running migrations, a default admin user is created:

- **Email:** `admin@authy.dev`
- **Password:** `password`
- **Application:** `AuthyBackoffice`

## API Endpoints

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/docs/*` | Swagger documentation |

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate user |
| POST | `/logout` | Invalidate tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/validate` | Validate token |
| POST | `/update_password` | Update own password |

### Users (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users |
| POST | `/` | Create user |
| GET | `/:id` | Get user |
| PUT | `/:id` | Update user (including password) |
| DELETE | `/:id` | Delete user |
| POST | `/:id/roles` | Assign role to user |
| DELETE | `/:id/roles/:role_id` | Remove role from user |

### Applications (`/api/v1/applications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List applications |
| POST | `/` | Create application |
| GET | `/:id` | Get application |
| PUT | `/:id` | Update application |
| DELETE | `/:id` | Delete application |
| POST | `/:id/regenerate-key` | Regenerate API key |

### Roles (`/api/v1/roles`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List roles |
| POST | `/` | Create role |
| GET | `/:id` | Get role |
| PUT | `/:id` | Update role |
| DELETE | `/:id` | Delete role |
| POST | `/:id/permissions` | Assign permissions |

### Permissions (`/api/v1/permissions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List permissions |
| POST | `/` | Create permission |
| GET | `/:id` | Get permission |
| PUT | `/:id` | Update permission |
| DELETE | `/:id` | Delete permission |

### Audit & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audit-logs` | List audit logs |
| GET | `/api/v1/audit-logs/stats` | Audit statistics |
| GET | `/api/v1/audit-logs/export` | Export audit logs (CSV) |
| GET | `/api/v1/analytics/authentication` | Auth analytics |
| GET | `/api/v1/analytics/users` | User analytics |
| GET | `/api/v1/analytics/applications` | App analytics |
| GET | `/api/v1/analytics/security` | Security analytics |

## Project Structure

```
authy/
├── cmd/server/          # Application entry point
├── internal/
│   ├── config/          # Configuration management
│   ├── database/        # PostgreSQL setup
│   ├── cache/           # Valkey client
│   ├── handlers/        # HTTP handlers
│   ├── middleware/      # Auth, logging, metrics
│   ├── models/          # GORM models
│   └── services/        # Business logic
├── pkg/
│   ├── auth/            # JWT & session management
│   ├── logger/          # Zap logging
│   └── metrics/         # Prometheus metrics
├── migrations/          # SQL migrations
├── frontend/            # React admin UI
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API layer
│   │   └── types/       # TypeScript types
│   └── ...
└── docs/                # Generated Swagger docs
```

## Development

### Make Commands

```bash
# Backend
make dev              # Start dev containers
make run              # Run application
make build            # Build binary
make test             # Run tests
make test-coverage    # Run tests with coverage
make lint             # Run linter
make format           # Format code
make swagger          # Generate Swagger docs

# Database
make migrate-up       # Apply migrations
make migrate-down     # Rollback migrations
make migrate-create NAME=xxx  # Create migration

# Docker
make docker-build     # Build Docker image
make docker-run       # Start all services
make docker-stop      # Stop services
make docker-logs      # View logs
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `VALKEY_URL` | `localhost:6379` | Valkey server address |
| `JWT_SECRET` | - | Token signing secret |
| `JWT_EXPIRATION` | `3600` | Access token TTL (seconds) |
| `REFRESH_EXPIRATION` | `604800` | Refresh token TTL (seconds) |
| `LOG_LEVEL` | `info` | Log level |
| `ENVIRONMENT` | `development` | Environment name |
| `PORT` | `8080` | Server port |

## Docker Deployment

```bash
# Build and run all services
make docker-build
make docker-run

# Or use docker-compose directly
docker-compose up -d
```

Services will be available at:
- **API:** http://localhost:8080
- **Frontend:** http://localhost:3001
- **Swagger:** http://localhost:8080/docs
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3002

## Security Considerations

- Change `JWT_SECRET` in production
- Use HTTPS in production (configure via reverse proxy)
- Review and restrict CORS origins
- Enable rate limiting for auth endpoints
- Regularly rotate API keys
- Monitor audit logs for suspicious activity

## License

MIT
