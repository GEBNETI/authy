# Test Coverage Plan for Authy Authentication Service

## Executive Summary

**Current Coverage:** 0%
**Target Coverage:** 70-80%
**Estimated Effort:** 7 weeks (1-2 developers)
**Total Lines of Code:** ~11,172 lines
**Test Files Needed:** ~15-20 files

---

## Current State Analysis

### Existing Test Files
**NONE** - Zero test files currently exist in the codebase.

### Project Architecture
- **23 Go source files** across `internal/`, `pkg/`, and `cmd/` directories
- **7 Handler types**: AuthHandler, UserHandler, ApplicationHandler, RoleHandler, PermissionHandler, AuditHandler, AnalyticsHandler
- **Key models**: User, Role, Permission, Application, Token, AuditLog
- **Services**: JWTService, SessionService, AuditService
- **Middleware**: AuthRequired, RateLimiter, RequirePermission, Logger, Metrics
- **Infrastructure**: PostgreSQL (GORM), Valkey (cache), Prometheus (metrics)

---

## Testing Priorities (Ranked by Risk)

### Priority 1: CRITICAL - Core Security (Weeks 1-2)
**Target Coverage: 25%**
**Risk Level: CRITICAL**

Components that handle security and authentication must be tested thoroughly:

#### 1.1 JWT Service (`pkg/auth/jwt.go`)
**Why Critical:** Security vulnerability if broken, foundation of entire auth system

**Tests Needed:**
- `TestGenerateAccessToken` - Verify token creation with correct claims
- `TestGenerateRefreshToken` - Verify refresh token generation
- `TestValidateValidToken` - Confirm valid tokens pass validation
- `TestValidateExpiredToken` - Ensure expired tokens are rejected
- `TestValidateInvalidSignature` - Detect tampered tokens
- `TestValidateInvalidTokenType` - Reject wrong token types
- `TestTokenPairGeneration` - Test access + refresh pair creation
- `TestExtractTokenFromHeader` - Parse Authorization header correctly
- `TestParseClaimsFromToken` - Extract claims data accurately

**Coverage Goal:** 95-100%

#### 1.2 Session Service (`pkg/auth/session.go`)
**Why Critical:** Manages session lifecycle and token invalidation

**Tests Needed:**
- `TestStoreToken` - Verify token storage in cache
- `TestValidateTokenFromCache` - Check cache lookup works
- `TestInvalidateToken` - Single token invalidation
- `TestBlacklistedTokenValidation` - Reject blacklisted tokens
- `TestRefreshTokenPair` - Token refresh flow
- `TestInvalidateUserTokensInApplication` - App-specific logout
- `TestInvalidateAllUserTokens` - Global logout
- `TestGetActiveSessionsCount` - Session counting

**Coverage Goal:** 90-95%

#### 1.3 User Model - Password Handling (`internal/models/user.go`)
**Why Critical:** Password security is fundamental

**Tests Needed:**
- `TestSetPassword` - bcrypt hashing works
- `TestCheckPassword` - Correct password verification
- `TestCheckPasswordWithWrongPassword` - Rejects wrong passwords
- `TestPasswordHashingIdempotency` - Same password hashes differently (salt)
- `TestPasswordMinimumLength` - Enforce password requirements

**Coverage Goal:** 100%

---

### Priority 2: HIGH - Authentication Handlers (Week 3)
**Target Coverage: 45%**
**Risk Level: HIGH**

#### 2.1 Login Handler (`internal/handlers/auth.go`)
**Why Important:** Primary entry point for users

**Tests Needed:**
- `TestLoginSuccess` - Valid credentials, active user
- `TestLoginInvalidPassword` - Wrong password rejected
- `TestLoginUserNotFound` - Non-existent email
- `TestLoginInactiveUser` - Deactivated user blocked
- `TestLoginInvalidApplication` - Invalid app name
- `TestLoginAuditLogging` - Verify audit log creation
- `TestLoginPermissionsIncluded` - Permissions in response
- `TestLoginRateLimiting` - Rate limit enforcement

**Coverage Goal:** 90%

#### 2.2 Logout Handler
**Tests Needed:**
- `TestLogoutSuccess` - Token invalidation works
- `TestLogoutInvalidContext` - Missing auth context
- `TestLogoutTokenInvalidation` - Cache updated
- `TestLogoutAuditLog` - Logout logged

**Coverage Goal:** 90%

#### 2.3 Token Refresh Handler
**Tests Needed:**
- `TestRefreshTokenSuccess` - Valid refresh works
- `TestRefreshTokenInvalid` - Reject invalid tokens
- `TestRefreshTokenExpired` - Expired tokens rejected
- `TestRefreshTokenBlacklisted` - Blacklisted tokens fail
- `TestRefreshTokenUpdatedPermissions` - New permissions fetched

**Coverage Goal:** 85%

#### 2.4 Token Validation Handler
**Tests Needed:**
- `TestValidateTokenSuccess` - Valid token returns user info
- `TestValidateTokenInvalid` - Invalid token returns false
- `TestValidateTokenExpired` - Expired token returns false
- `TestValidateTokenAuditLog` - Validation logged

**Coverage Goal:** 85%

#### 2.5 Update Password Handler
**Tests Needed:**
- `TestUpdatePasswordSuccess` - Password changed successfully
- `TestUpdatePasswordInvalidCurrent` - Wrong current password rejected
- `TestUpdatePasswordWeakPassword` - Enforce minimum length
- `TestUpdatePasswordAuditLogging` - Success/failure logged
- `TestUpdatePasswordRequiresAuth` - Unauthenticated blocked

**Coverage Goal:** 90%

---

### Priority 3: HIGH - Authorization Middleware (Week 4)
**Target Coverage: 60%**
**Risk Level: HIGH**

#### 3.1 AuthRequired Middleware (`internal/middleware/middleware.go`)
**Why Important:** Access control foundation

**Tests Needed:**
- `TestAuthRequiredValidToken` - Valid token passes through
- `TestAuthRequiredNoHeader` - Missing header blocked
- `TestAuthRequiredInvalidToken` - Invalid token blocked
- `TestAuthRequiredExpiredToken` - Expired token blocked
- `TestAuthRequiredWrongTokenType` - Refresh token rejected
- `TestAuthRequiredContextInjection` - User context set correctly

**Coverage Goal:** 95%

#### 3.2 RequirePermission Middleware
**Why Important:** Fine-grained access control

**Tests Needed:**
- `TestRequirePermissionExactMatch` - Exact permission grants access
- `TestRequirePermissionWildcard` - Wildcard (*:action) works
- `TestRequirePermissionAdmin` - Admin permission bypasses
- `TestRequirePermissionDenied` - Missing permission blocks
- `TestRequirePermissionNoPermissions` - Empty permissions blocked

**Coverage Goal:** 90%

#### 3.3 Rate Limiter Middleware
**Tests Needed:**
- `TestRateLimiterAllowsWithinLimit` - Requests within limit pass
- `TestRateLimiterBlocksExceededLimit` - Excess requests blocked
- `TestRateLimiterHeaders` - Correct rate limit headers
- `TestRateLimiterCacheIntegration` - Cache stores counts

**Coverage Goal:** 80%

---

### Priority 4: MEDIUM - User & Role Management (Week 5)
**Target Coverage: 70%**
**Risk Level: MEDIUM**

#### 4.1 User CRUD Handlers (`internal/handlers/users.go`)
**Tests Needed:**
- `TestCreateUserSuccess` - User created with valid data
- `TestCreateUserDuplicateEmail` - Email uniqueness enforced
- `TestGetUserSuccess` - Retrieve existing user
- `TestGetUserNotFound` - 404 for non-existent user
- `TestUpdateUserSuccess` - User updated successfully
- `TestUpdateUserEmailConflict` - Email conflict detected
- `TestDeleteUserSuccess` - Soft delete works
- `TestDeleteUserSelfDeletion` - Prevent self-deletion
- `TestListUsersWithPagination` - Pagination works
- `TestListUsersWithFilters` - Filter by active status, search

**Coverage Goal:** 80%

#### 4.2 Role Handlers (`internal/handlers/roles.go`)
**Tests Needed:**
- `TestCreateRole` - Role creation
- `TestUpdateRole` - Role updates
- `TestDeleteRole` - Role deletion (cascade check)
- `TestAssignPermissionsToRole` - Permission assignment
- `TestRemovePermissionsFromRole` - Permission removal
- `TestGetRolePermissions` - Permission retrieval

**Coverage Goal:** 75%

#### 4.3 User-Role Assignment
**Tests Needed:**
- `TestAssignRoleToUser` - Role assignment
- `TestRevokeRoleFromUser` - Role revocation
- `TestGetUserRoles` - Role retrieval
- `TestUserHasRole` - Role checking

**Coverage Goal:** 80%

---

### Priority 5: MEDIUM - Application Management (Week 6)
**Target Coverage: 75%**
**Risk Level: MEDIUM**

#### 5.1 Application Handlers (`internal/handlers/applications.go`)
**Tests Needed:**
- `TestCreateApplication` - Application creation
- `TestGetApplication` - Retrieve application
- `TestUpdateApplication` - Update application
- `TestDeleteApplication` - Soft delete (cascade check)
- `TestListApplications` - List with pagination
- `TestRegenerateAPIKey` - API key rotation

**Coverage Goal:** 75%

---

### Priority 6: LOW-MEDIUM - Supporting Features (Week 7)
**Target Coverage: 80%**
**Risk Level: LOW-MEDIUM**

#### 6.1 Permission Handlers (`internal/handlers/permissions.go`)
**Tests Needed:**
- `TestCreatePermission` - Permission creation
- `TestUpdatePermission` - Permission updates
- `TestDeletePermission` - System permission protection
- `TestListPermissions` - List with filters

**Coverage Goal:** 70%

#### 6.2 Audit Service (`internal/services/audit.go`)
**Tests Needed:**
- `TestCreateAuditLog` - Audit log creation
- `TestGetAuditLogs` - Query audit logs
- `TestGetAuditStats` - Statistics generation

**Coverage Goal:** 60%

#### 6.3 Analytics Handler
**Tests Needed:**
- `TestGetAuthenticationAnalytics` - Auth stats
- `TestGetUserAnalytics` - User stats
- `TestGetApplicationAnalytics` - App stats
- `TestGetSecurityAnalytics` - Security metrics

**Coverage Goal:** 50%

---

## Recommended Testing Stack

### Core Libraries

1. **testify** (already in dependencies)
   ```bash
   github.com/stretchr/testify v1.9.0
   ```
   - Use `assert` for simple assertions
   - Use `require` for assertions that should stop test
   - Use `suite` for test fixtures

2. **gomock** - Generate mocks for interfaces
   ```bash
   go install github.com/golang/mock/mockgen@latest
   ```
   - Mock database interfaces
   - Mock cache interfaces
   - Mock external services

3. **dockertest** - Integration tests with real services
   ```bash
   go get github.com/ory/dockertest/v3
   ```
   - Real PostgreSQL for integration tests
   - Real Valkey for cache tests
   - Automatic cleanup

4. **httpexpect** - HTTP API testing
   ```bash
   go get github.com/gavv/httpexpect/v2
   ```
   - Fluent API for HTTP testing
   - JSON response validation
   - Cookie handling

---

## Test File Structure

```
authy/
├── pkg/
│   ├── auth/
│   │   ├── jwt_test.go              ⭐ START HERE (Priority 1)
│   │   └── session_test.go          ⭐ Priority 1
│   ├── logger/
│   │   └── logger_test.go
│   └── metrics/
│       └── metrics_test.go
├── internal/
│   ├── models/
│   │   ├── user_test.go             ⭐ Priority 1 (password tests)
│   │   ├── permission_test.go       Priority 3
│   │   ├── role_test.go             Priority 4
│   │   ├── application_test.go      Priority 5
│   │   └── audit_log_test.go        Priority 6
│   ├── handlers/
│   │   ├── auth_test.go             Priority 2
│   │   ├── users_test.go            Priority 4
│   │   ├── roles_test.go            Priority 4
│   │   ├── permissions_test.go      Priority 5
│   │   ├── applications_test.go     Priority 5
│   │   ├── audit_test.go            Priority 6
│   │   └── analytics_test.go        Priority 6
│   ├── middleware/
│   │   └── middleware_test.go       Priority 3
│   ├── services/
│   │   └── audit_test.go            Priority 6
│   ├── cache/
│   │   ├── cache_test.go
│   │   └── mock_cache.go            (Create mock)
│   ├── database/
│   │   ├── database_test.go
│   │   └── testdb.go                (Test database setup)
│   └── testutil/
│       ├── helpers.go               (Test helpers)
│       ├── fixtures.go              (Test data)
│       └── assertions.go            (Custom assertions)
└── cmd/
    └── server/
        └── integration_test.go      (End-to-end tests)
```

---

## Testing Patterns & Best Practices

### 1. Table-Driven Tests

Use for testing multiple scenarios:

```go
func TestLoginHandler(t *testing.T) {
    tests := []struct {
        name           string
        input          LoginRequest
        setupMocks     func(*testing.T, *gorm.DB, *cache.Client)
        expectedStatus int
        expectedError  string
    }{
        {
            name: "successful login",
            input: LoginRequest{
                Email:       "user@test.com",
                Password:    "password123",
                Application: "TestApp",
            },
            setupMocks: func(t *testing.T, db *gorm.DB, cache *cache.Client) {
                // Setup test user
            },
            expectedStatus: 200,
            expectedError:  "",
        },
        {
            name: "invalid password",
            input: LoginRequest{
                Email:       "user@test.com",
                Password:    "wrongpassword",
                Application: "TestApp",
            },
            setupMocks:     func(t *testing.T, db *gorm.DB, cache *cache.Client) {},
            expectedStatus: 401,
            expectedError:  "Invalid credentials",
        },
        // More test cases...
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Run test
        })
    }
}
```

### 2. Test Fixtures

Create reusable test data:

```go
// internal/testutil/fixtures.go
package testutil

import (
    "github.com/GEBNETI/authy/internal/models"
    "github.com/google/uuid"
)

func CreateTestUser(email string) *models.User {
    user := &models.User{
        ID:        uuid.New(),
        Email:     email,
        FirstName: "Test",
        LastName:  "User",
        IsActive:  true,
    }
    user.SetPassword("password123")
    return user
}

func CreateTestApplication(name string) *models.Application {
    return &models.Application{
        ID:          uuid.New(),
        Name:        name,
        Description: "Test application",
        APIKey:      "test-api-key-" + uuid.New().String(),
    }
}

func CreateTestRole(name string, appID uuid.UUID) *models.Role {
    return &models.Role{
        ID:            uuid.New(),
        Name:          name,
        Description:   "Test role",
        ApplicationID: appID,
    }
}
```

### 3. Test Database Setup

```go
// internal/database/testdb.go
package database

import (
    "testing"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

func SetupTestDB(t *testing.T) (*gorm.DB, func()) {
    // Use in-memory SQLite for fast tests
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil {
        t.Fatalf("Failed to create test database: %v", err)
    }

    // Run migrations
    err = db.AutoMigrate(
        &models.User{},
        &models.Application{},
        &models.Role{},
        &models.Permission{},
        // ... other models
    )
    if err != nil {
        t.Fatalf("Failed to migrate test database: %v", err)
    }

    cleanup := func() {
        sqlDB, _ := db.DB()
        sqlDB.Close()
    }

    return db, cleanup
}

func SetupTestDBWithData(t *testing.T) (*gorm.DB, func()) {
    db, cleanup := SetupTestDB(t)

    // Seed with common test data
    // ...

    return db, cleanup
}
```

### 4. Mock Cache

```go
// internal/cache/mock_cache.go
package cache

import (
    "context"
    "sync"
    "time"
)

type MockCache struct {
    mu    sync.RWMutex
    store map[string]string
}

func NewMockCache() *MockCache {
    return &MockCache{
        store: make(map[string]string),
    }
}

func (m *MockCache) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.store[key] = value.(string)
    return nil
}

func (m *MockCache) Get(ctx context.Context, key string) (string, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    val, exists := m.store[key]
    if !exists {
        return "", ErrCacheMiss
    }
    return val, nil
}

// Implement other cache methods...
```

### 5. Test Helpers

```go
// internal/testutil/helpers.go
package testutil

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http/httptest"
    "testing"

    "github.com/gofiber/fiber/v2"
    "github.com/stretchr/testify/require"
)

func MakeRequest(t *testing.T, app *fiber.App, method, path string, body interface{}) *http.Response {
    var bodyReader io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        require.NoError(t, err)
        bodyReader = bytes.NewReader(jsonBody)
    }

    req := httptest.NewRequest(method, path, bodyReader)
    req.Header.Set("Content-Type", "application/json")

    resp, err := app.Test(req)
    require.NoError(t, err)

    return resp
}

func MakeAuthenticatedRequest(t *testing.T, app *fiber.App, method, path, token string, body interface{}) *http.Response {
    var bodyReader io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        require.NoError(t, err)
        bodyReader = bytes.NewReader(jsonBody)
    }

    req := httptest.NewRequest(method, path, bodyReader)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := app.Test(req)
    require.NoError(t, err)

    return resp
}

func ParseJSONResponse(t *testing.T, resp *http.Response, target interface{}) {
    body, err := io.ReadAll(resp.Body)
    require.NoError(t, err)
    defer resp.Body.Close()

    err = json.Unmarshal(body, target)
    require.NoError(t, err)
}
```

---

## Example Test: JWT Service

```go
// pkg/auth/jwt_test.go
package auth_test

import (
    "testing"
    "time"

    "github.com/GEBNETI/authy/pkg/auth"
    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGenerateAccessToken(t *testing.T) {
    jwtService := auth.NewJWTService(
        "test-secret-key-at-least-32-characters-long",
        15*time.Minute,
        7*24*time.Hour,
        "authy-test",
    )

    userID := uuid.New()
    appID := uuid.New()
    permissions := []string{"users:read", "users:write"}

    token, claims, err := jwtService.GenerateAccessToken(userID, appID, permissions)

    require.NoError(t, err)
    assert.NotEmpty(t, token)
    assert.Equal(t, userID, claims.UserID)
    assert.Equal(t, appID, claims.ApplicationID)
    assert.Equal(t, auth.AccessTokenType, claims.TokenType)
    assert.Equal(t, permissions, claims.Permissions)
    assert.WithinDuration(t, time.Now().Add(15*time.Minute), claims.ExpiresAt.Time, 5*time.Second)
}

func TestValidateToken(t *testing.T) {
    tests := []struct {
        name        string
        setupToken  func(*auth.JWTService) string
        expectError bool
        errorMsg    string
    }{
        {
            name: "valid token",
            setupToken: func(js *auth.JWTService) string {
                token, _, _ := js.GenerateAccessToken(
                    uuid.New(),
                    uuid.New(),
                    []string{"users:read"},
                )
                return token
            },
            expectError: false,
        },
        {
            name: "expired token",
            setupToken: func(js *auth.JWTService) string {
                // Create service with very short expiration
                shortService := auth.NewJWTService(
                    "test-secret-key-at-least-32-characters-long",
                    -1*time.Hour, // Negative = already expired
                    7*24*time.Hour,
                    "authy-test",
                )
                token, _, _ := shortService.GenerateAccessToken(
                    uuid.New(),
                    uuid.New(),
                    []string{"users:read"},
                )
                return token
            },
            expectError: true,
            errorMsg:    "token is expired",
        },
        {
            name: "invalid signature",
            setupToken: func(js *auth.JWTService) string {
                token, _, _ := js.GenerateAccessToken(
                    uuid.New(),
                    uuid.New(),
                    []string{"users:read"},
                )
                // Tamper with token
                return token + "tampered"
            },
            expectError: true,
            errorMsg:    "invalid token",
        },
        {
            name: "wrong token type (refresh instead of access)",
            setupToken: func(js *auth.JWTService) string {
                token, _, _ := js.GenerateRefreshToken(uuid.New(), uuid.New())
                return token
            },
            expectError: true,
            errorMsg:    "invalid token type",
        },
    }

    jwtService := auth.NewJWTService(
        "test-secret-key-at-least-32-characters-long",
        15*time.Minute,
        7*24*time.Hour,
        "authy-test",
    )

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            token := tt.setupToken(jwtService)
            claims, err := jwtService.ValidateToken(token)

            if tt.expectError {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errorMsg)
                assert.Nil(t, claims)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, claims)
            }
        })
    }
}

func TestTokenPairGeneration(t *testing.T) {
    jwtService := auth.NewJWTService(
        "test-secret-key-at-least-32-characters-long",
        15*time.Minute,
        7*24*time.Hour,
        "authy-test",
    )

    userID := uuid.New()
    appID := uuid.New()
    permissions := []string{"users:read", "users:write"}

    tokenPair, err := jwtService.GenerateTokenPair(userID, appID, permissions)

    require.NoError(t, err)
    assert.NotEmpty(t, tokenPair.AccessToken)
    assert.NotEmpty(t, tokenPair.RefreshToken)
    assert.Equal(t, "Bearer", tokenPair.TokenType)
    assert.Greater(t, tokenPair.ExpiresIn, int64(0))

    // Validate access token
    accessClaims, err := jwtService.ValidateToken(tokenPair.AccessToken)
    require.NoError(t, err)
    assert.Equal(t, auth.AccessTokenType, accessClaims.TokenType)

    // Validate refresh token
    refreshClaims, err := jwtService.ValidateRefreshToken(tokenPair.RefreshToken)
    require.NoError(t, err)
    assert.Equal(t, auth.RefreshTokenType, refreshClaims.TokenType)
}
```

---

## CI/CD Integration

### Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: authy_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: authy_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      valkey:
        image: valkey/valkey:latest
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.22'

    - name: Install dependencies
      run: |
        go mod download
        go install github.com/golang/mock/mockgen@latest

    - name: Run tests
      run: make test-coverage
      env:
        DATABASE_URL: postgres://authy_test:test_password@localhost:5432/authy_test?sslmode=disable
        VALKEY_URL: localhost:6379

    - name: Check coverage
      run: |
        go tool cover -func=coverage.out | grep total | awk '{print $3}'
        COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
        if (( $(echo "$COVERAGE < 70" | bc -l) )); then
          echo "Coverage is below 70%: $COVERAGE%"
          exit 1
        fi

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage.out
```

### Update Makefile:

```makefile
test-unit: ## Run unit tests only
	@echo "$(GREEN)Running unit tests...$(NC)"
	go test -v -short ./...

test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	go test -v -run Integration ./...

test-coverage: ## Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)Coverage report generated: coverage.html$(NC)"

test-coverage-report: ## Show coverage summary
	@go tool cover -func=coverage.out | grep total

test: test-coverage ## Run all tests (alias for test-coverage)
```

---

## 7-Week Implementation Roadmap

### Week 1: Foundation & Critical Security
**Goal: 15% coverage**

**Monday-Tuesday:**
- Set up test infrastructure (testdb, mock cache, helpers)
- Install testing dependencies (gomock, dockertest)
- Create `internal/testutil/` package

**Wednesday-Thursday:**
- `pkg/auth/jwt_test.go` - Complete JWT service tests
- Aim for 95-100% coverage of JWT functionality

**Friday:**
- `pkg/auth/session_test.go` - Session service tests
- Aim for 90% coverage of session functionality

### Week 2: Password Security & Model Tests
**Goal: 25% coverage**

**Monday-Tuesday:**
- `internal/models/user_test.go` - Password hashing tests
- Test bcrypt functionality thoroughly
- Test password validation

**Wednesday-Thursday:**
- `internal/models/permission_test.go` - Permission model tests
- `internal/models/role_test.go` - Role model basics

**Friday:**
- Review and refactor tests
- Ensure all Priority 1 tests pass
- Document any gaps

### Week 3: Authentication Handlers
**Goal: 45% coverage**

**Monday:**
- `internal/handlers/auth_test.go` - Login handler tests
- Table-driven tests for multiple scenarios

**Tuesday:**
- Logout handler tests
- Token validation handler tests

**Wednesday:**
- Token refresh handler tests
- Error path testing

**Thursday:**
- Update password handler tests
- Audit logging verification

**Friday:**
- Integration tests for full auth flow
- End-to-end login → refresh → logout

### Week 4: Authorization Middleware
**Goal: 60% coverage**

**Monday-Tuesday:**
- `internal/middleware/middleware_test.go` - AuthRequired middleware
- Test all token validation paths
- Test context injection

**Wednesday:**
- RequirePermission middleware tests
- Permission checking logic
- Wildcard permission tests

**Thursday:**
- Rate limiting middleware tests
- Cache integration tests

**Friday:**
- Integration tests combining middleware layers
- Performance testing

### Week 5: User & Role Management
**Goal: 70% coverage**

**Monday-Tuesday:**
- `internal/handlers/users_test.go` - User CRUD operations
- Create, Read, Update, Delete tests
- Pagination and filtering tests

**Wednesday:**
- `internal/handlers/roles_test.go` - Role management
- Role creation, updates, deletion
- Permission assignment tests

**Thursday:**
- User-role assignment tests
- Cross-model relationship tests

**Friday:**
- Edge case testing
- Cascading delete verification

### Week 6: Application Management & Features
**Goal: 75% coverage**

**Monday-Tuesday:**
- `internal/handlers/applications_test.go` - Application CRUD
- API key management tests
- Multi-tenant isolation tests

**Wednesday:**
- `internal/handlers/permissions_test.go` - Permission CRUD
- System permission protection tests

**Thursday:**
- `internal/services/audit_test.go` - Audit service tests
- Audit log queries and filtering

**Friday:**
- Analytics handler tests (basic coverage)
- Review overall coverage

### Week 7: Integration Tests & Polish
**Goal: 80% coverage**

**Monday-Tuesday:**
- `cmd/server/integration_test.go` - End-to-end tests
- Full API workflows
- Real database integration tests

**Wednesday:**
- Edge case coverage
- Error path testing
- Boundary condition tests

**Thursday:**
- Performance benchmarks
- Load testing critical paths
- Memory leak detection

**Friday:**
- Documentation updates
- CI/CD pipeline refinement
- Final coverage review and gap analysis

---

## Success Metrics

### Coverage Targets by Component

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| JWT Service | 95-100% | Critical |
| Session Service | 90-95% | Critical |
| Password Hashing | 100% | Critical |
| Auth Handlers | 85-90% | High |
| Authorization Middleware | 90-95% | High |
| User Handlers | 75-80% | Medium |
| Role Handlers | 75-80% | Medium |
| Permission Handlers | 70-75% | Medium |
| Application Handlers | 70-75% | Medium |
| Audit Service | 60-70% | Low-Medium |
| Analytics | 50-60% | Low |
| **Overall Project** | **70-80%** | **Goal** |

### Quality Gates

- [ ] All critical components (Priority 1) at 90%+ coverage
- [ ] All high priority components (Priority 2-3) at 80%+ coverage
- [ ] Zero failing tests in CI/CD
- [ ] All tests run in <2 minutes
- [ ] Integration tests pass with real DB/cache
- [ ] No test flakiness (tests pass consistently)
- [ ] Code coverage visible in PRs
- [ ] Coverage never decreases in new PRs

---

## Maintenance & Best Practices

### 1. Test-Driven Development (TDD)
For new features:
1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

### 2. Test Naming Convention
```
Test<FunctionName>_<Scenario>_<ExpectedBehavior>

Examples:
- TestLogin_ValidCredentials_ReturnsTokenPair
- TestLogin_InvalidPassword_Returns401Error
- TestAuthRequired_ExpiredToken_BlocksRequest
```

### 3. Test Organization
- One test file per source file
- Group related tests in subtests
- Use table-driven tests for multiple scenarios
- Keep tests independent (no shared state)

### 4. Pre-commit Hooks
Add `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Run tests before committing
make test-coverage
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

### 5. Coverage Requirements in PRs
- Require 70% minimum coverage for all PRs
- New code must have 80%+ coverage
- Critical paths require 90%+ coverage

---

## Resources & References

### Testing Guides
- [Go Testing Best Practices](https://go.dev/doc/tutorial/add-a-test)
- [Testify Documentation](https://github.com/stretchr/testify)
- [Table Driven Tests](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests)

### Tools
- [GoMock](https://github.com/golang/mock)
- [Dockertest](https://github.com/ory/dockertest)
- [HTTPExpect](https://github.com/gavv/httpexpect)

### Useful Commands
```bash
# Run specific test
go test -v -run TestLoginHandler ./internal/handlers

# Run tests with race detection
go test -race ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. -benchmem ./...

# Check test coverage by function
go tool cover -func=coverage.out

# Run only short tests (unit tests)
go test -short ./...
```

---

## Next Steps

1. **Immediate (This Week):**
   - [ ] Install testing dependencies
   - [ ] Create test infrastructure (testdb, mock cache)
   - [ ] Start with `pkg/auth/jwt_test.go`

2. **Short Term (Next 2 Weeks):**
   - [ ] Complete Priority 1 tests (JWT, Session, Password)
   - [ ] Set up CI/CD with coverage reporting
   - [ ] Establish testing patterns and documentation

3. **Medium Term (Weeks 3-5):**
   - [ ] Complete Priority 2-3 tests (Auth handlers, Middleware)
   - [ ] Achieve 60% overall coverage
   - [ ] Refine test infrastructure

4. **Long Term (Weeks 6-7):**
   - [ ] Complete Priority 4-6 tests
   - [ ] Achieve 70-80% overall coverage
   - [ ] Add integration and E2E tests
   - [ ] Establish test maintenance practices

---

## Conclusion

Achieving 70-80% test coverage is achievable in 7 weeks with focused effort. The key is to:

1. **Prioritize ruthlessly** - Focus on security-critical components first
2. **Build infrastructure early** - Test helpers pay dividends
3. **Use patterns consistently** - Table-driven tests, fixtures, mocks
4. **Integrate into workflow** - CI/CD, pre-commit hooks, PR requirements
5. **Maintain quality** - Don't sacrifice test quality for coverage numbers

Good test coverage will provide:
- ✅ Confidence in deployments
- ✅ Faster debugging
- ✅ Better documentation
- ✅ Easier refactoring
- ✅ Fewer production bugs
- ✅ Improved code quality

Start with the highest priority tests and build momentum. Each test makes the codebase more robust and maintainable.
