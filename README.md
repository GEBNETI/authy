# Authy - Central Authentication Service

**Authy** is a central authentication service designed as a hub for multiple applications, providing JWT-based authentication with per-application token isolation.

## Overview

Authy provides a centralized authentication and authorization system that allows multiple applications to share user accounts while maintaining isolated sessions and permissions per application. This enables users to have a single identity across multiple services while maintaining granular control over their access.

### Key Features

- **Multi-Application Token Isolation**: Tokens are scoped per application, allowing users to logout from one app without affecting sessions in other applications
- **JWT-Based Authentication**: Secure token-based authentication with access and refresh tokens
- **Role-Based Access Control (RBAC)**: Flexible permission system with roles and permissions scoped per application
- **Comprehensive Audit Logging**: All authentication and authorization operations are logged for security and compliance
- **Analytics Dashboard**: Track authentication metrics, user activity, and security events
- **RESTful API**: Well-documented API with Swagger/OpenAPI documentation
- **Prometheus Metrics**: Built-in metrics for monitoring and observability
- **Health Checks**: Service health endpoints for orchestration and monitoring

## Architecture

### Technology Stack

**Backend:**
- **Framework**: Go with Fiber v2 web framework
- **Database**: PostgreSQL for persistent data storage
- **Cache**: Valkey (Redis fork) for tokens, sessions, and rate limiting
- **Monitoring**: Prometheus metrics with custom collectors
- **Documentation**: Auto-generated Swagger/OpenAPI

**Frontend:**
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: Custom components with Tailwind CSS
- **State Management**: React Context API

### Application Structure

```
.
├── cmd/server/              # Application entry point
├── internal/
│   ├── config/              # Configuration management
│   ├── database/            # PostgreSQL connection
│   ├── cache/               # Valkey client
│   ├── handlers/            # HTTP request handlers
│   ├── middleware/          # Custom middleware
│   ├── models/              # Database models
│   └── services/            # Business logic services
├── pkg/
│   ├── auth/                # Authentication utilities
│   ├── logger/              # Structured logging
│   └── metrics/             # Prometheus metrics
├── migrations/              # Database migrations
├── frontend/                # React frontend application
└── docs/                    # Swagger documentation
```

## Prerequisites

- **Go** 1.22 or higher
- **Node.js** 24.x or higher
- **PostgreSQL** 14 or higher
- **Valkey/Redis** 7.x or higher
- **Docker** and **Docker Compose** (for containerized deployment)
- **Make** (optional, for convenience commands)

## Quick Start

### Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/GEBNETI/authy.git
cd authy
```

2. **Create environment file**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start development services** (PostgreSQL and Valkey)

```bash
make dev
```

4. **Run database migrations**

```bash
make migrate-up
```

5. **Run the backend**

```bash
make run
```

6. **Run the frontend** (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

The backend will be available at `http://localhost:8080` and the frontend at `http://localhost:4000`.

### Default Credentials

After running migrations, you can login with:

- **Email**: `admin@authy.dev`
- **Password**: `password`

**IMPORTANT**: Change these credentials immediately in production!

## Building Docker Images

### Backend Image

Build the backend Docker image:

```bash
docker build -t authy-backend:latest .
```

Or using Podman:

```bash
podman build -t authy-backend:latest .
```

### Frontend Image

Build the frontend Docker image with the API URL:

```bash
cd frontend
docker build \
  --build-arg VITE_API_URL=https://your-api-domain.com/api/v1 \
  -t authy-frontend:latest .
```

Or using Podman:

```bash
cd frontend
podman build \
  --build-arg VITE_API_URL=https://your-api-domain.com/api/v1 \
  -t authy-frontend:latest .
```

**Important**: Replace `https://your-api-domain.com/api/v1` with your actual backend API URL.

### Build All Services with Docker Compose

Build all services at once:

```bash
docker-compose build
```

## Running the Application

### Using Docker Compose (Recommended for Production)

1. **Update environment variables**

Edit `docker-compose.yml` or create a `.env` file with your configuration:

```env
POSTGRES_DB=authy
POSTGRES_USER=authy
POSTGRES_PASSWORD=your_secure_password

DATABASE_URL=postgres://authy:your_secure_password@postgres:5432/authy?sslmode=disable
VALKEY_URL=valkey:6379

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

VITE_API_URL=https://your-api-domain.com/api/v1
```

2. **Start all services**

```bash
docker-compose up -d
```

3. **Run database migrations**

```bash
docker-compose exec backend make migrate-up
```

Or manually:

```bash
docker-compose exec backend migrate -path migrations -database "${DATABASE_URL}" up
```

4. **Check service status**

```bash
docker-compose ps
```

5. **View logs**

```bash
docker-compose logs -f
```

### Using Individual Docker Containers

**Start PostgreSQL:**

```bash
docker run -d \
  --name authy_postgres \
  -e POSTGRES_DB=authy \
  -e POSTGRES_USER=authy \
  -e POSTGRES_PASSWORD=authy_password \
  -p 5432:5432 \
  postgres:16-alpine
```

**Start Valkey:**

```bash
docker run -d \
  --name authy_valkey \
  -p 6379:6379 \
  valkey/valkey:7-alpine
```

**Run Backend:**

```bash
docker run -d \
  --name authy_backend \
  --link authy_postgres:postgres \
  --link authy_valkey:valkey \
  -e DATABASE_URL=postgres://authy:authy_password@postgres:5432/authy?sslmode=disable \
  -e VALKEY_URL=valkey:6379 \
  -e JWT_SECRET=your-jwt-secret \
  -p 8080:8080 \
  authy-backend:latest
```

**Run Frontend:**

```bash
docker run -d \
  --name authy_frontend \
  -p 3000:3000 \
  authy-frontend:latest
```

## Configuration

### Environment Variables

**Backend Configuration:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `VALKEY_URL` | Valkey/Redis connection string | `localhost:6379` | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | - | Yes |
| `JWT_EXPIRY` | Access token expiration time | `15m` | No |
| `JWT_REFRESH_EXPIRY` | Refresh token expiration time | `7d` | No |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` | No |
| `PORT` | Server port | `8080` | No |

**Frontend Configuration:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080/api/v1` | Yes (for production) |

### Database Migrations

Migrations are located in the `migrations/` directory and use SQL files.

**Apply migrations:**

```bash
make migrate-up
```

**Rollback last migration:**

```bash
make migrate-down
```

**Create new migration:**

```bash
make migrate-create NAME=your_migration_name
```

## API Documentation

Once the backend is running, Swagger documentation is available at:

```
http://localhost:8080/docs/
```

### Main API Endpoints

**Authentication:**
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/validate` - Validate token

**User Management:**
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

**Application Management:**
- `GET /api/v1/applications` - List applications
- `POST /api/v1/applications` - Create application
- `GET /api/v1/applications/:id` - Get application details
- `PUT /api/v1/applications/:id` - Update application
- `DELETE /api/v1/applications/:id` - Delete application

**Roles & Permissions:**
- `GET /api/v1/roles` - List roles
- `GET /api/v1/permissions` - List permissions
- `POST /api/v1/users/:id/roles` - Assign role to user

**Analytics:**
- `GET /api/v1/analytics/authentication` - Authentication analytics
- `GET /api/v1/analytics/users` - User analytics
- `GET /api/v1/analytics/applications` - Application analytics
- `GET /api/v1/analytics/security` - Security analytics

**Monitoring:**
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Development

### Available Make Commands

```bash
make help              # Show all available commands
make build             # Build the binary
make run               # Run the application
make test              # Run tests
make test-coverage     # Run tests with coverage
make dev               # Start development environment
make lint              # Run linter
make format            # Format code
make deps              # Download dependencies
make migrate-up        # Run migrations
make migrate-down      # Rollback migrations
make swagger           # Generate Swagger docs
make docker-build      # Build Docker image
make docker-run        # Run with Docker Compose
make docker-stop       # Stop Docker Compose
make install-tools     # Install development tools
```

### Code Structure Guidelines

- Place business logic in `internal/services/`
- HTTP handlers go in `internal/handlers/`
- Database models in `internal/models/`
- Middleware in `internal/middleware/`
- Reusable utilities in `pkg/`

## Monitoring

### Prometheus Metrics

The application exposes Prometheus metrics at `/metrics`:

- HTTP request metrics (count, duration, status codes)
- Authentication metrics (success/failure rates)
- Database connection pool metrics
- Custom business metrics

### Health Checks

Health check endpoint at `/health` returns:

```json
{
  "status": "healthy",
  "service": "authy",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy",
    "cache": "healthy"
  }
}
```

## Security Considerations

1. **Change Default Credentials**: Always change the default admin credentials after first deployment
2. **Use Strong JWT Secrets**: Generate strong, random secrets for JWT tokens
3. **Enable HTTPS**: Always use HTTPS in production
4. **Database Security**: Use strong database passwords and restrict network access
5. **Rate Limiting**: Configure rate limiting in production
6. **Audit Logs**: Regularly review audit logs for suspicious activity

## Deployment

### Production Checklist

- [ ] Change default admin credentials
- [ ] Set strong JWT secrets
- [ ] Configure HTTPS/TLS
- [ ] Set secure database passwords
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review and restrict network access
- [ ] Set appropriate log levels

### Reverse Proxy Configuration

Example Nginx configuration:

```nginx
upstream authy_backend {
    server localhost:8080;
}

upstream authy_frontend {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name authy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://authy_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://authy_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Check that PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure database user has proper permissions

**Migration Errors:**
- Ensure migrations are run in order
- Check database user has CREATE/ALTER permissions
- Verify no manual schema changes conflict with migrations

**Frontend Can't Connect to Backend:**
- Verify VITE_API_URL is set correctly during build
- Check CORS configuration in backend
- Ensure backend is accessible from frontend host

**Authentication Failures:**
- Verify JWT secrets are set
- Check token expiration times
- Ensure clocks are synchronized (for JWT validation)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license information here]

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team

## Acknowledgments

Built with:
- [Fiber](https://gofiber.io/) - Web framework
- [GORM](https://gorm.io/) - ORM library
- [Valkey](https://valkey.io/) - Cache store
- [React](https://react.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
