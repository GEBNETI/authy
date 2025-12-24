# Authy API Client Guide

This guide explains how to integrate your application with the Authy authentication service.

## Table of Contents

- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
  - [Login](#login)
  - [Refresh Token](#refresh-token)
  - [Validate Token](#validate-token)
  - [Logout](#logout)
  - [Change Password](#change-password)
- [Token Management](#token-management)
- [Error Handling](#error-handling)
- [Code Examples](#code-examples)

## Overview

Authy uses JWT (JSON Web Tokens) for authentication with a dual-token system:

- **Access Token**: Short-lived token (default: 1 hour) used for API requests
- **Refresh Token**: Long-lived token (default: 7 days) used to obtain new access tokens

All authenticated requests must include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Authentication Flow

```
┌─────────┐                                    ┌─────────┐
│  Client │                                    │  Authy  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. POST /api/v1/auth/login                  │
     │  {email, password, application}              │
     │─────────────────────────────────────────────>│
     │                                              │
     │  2. Returns access_token, refresh_token,     │
     │     user info, permissions                   │
     │<─────────────────────────────────────────────│
     │                                              │
     │  3. API requests with Authorization header   │
     │─────────────────────────────────────────────>│
     │                                              │
     │  4. When access_token expires (401),         │
     │     POST /api/v1/auth/refresh                │
     │     {refresh_token}                          │
     │─────────────────────────────────────────────>│
     │                                              │
     │  5. Returns new token pair                   │
     │<─────────────────────────────────────────────│
     │                                              │
     │  6. POST /api/v1/auth/logout (when done)     │
     │─────────────────────────────────────────────>│
     │                                              │
```

## API Reference

### Base URL

```
http://localhost:8080/api/v1
```

### Login

Authenticate a user and receive tokens.

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "application": "YourAppName"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token_pair": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 3600
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true
  },
  "application": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "YourAppName"
  },
  "permissions": [
    "authy_users:read",
    "authy_users:create",
    "authy_roles:read"
  ]
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": true,
  "message": "Invalid credentials"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@authy.dev",
    "password": "password",
    "application": "AuthyBackoffice"
  }'
```

---

### Refresh Token

Get a new access token using the refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token_pair": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your_refresh_token_here"
  }'
```

---

### Validate Token

Check if a token is valid and get user information.

**Endpoint:** `POST /api/v1/auth/validate`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true
  },
  "application": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "YourAppName"
  },
  "permissions": [
    "authy_users:read",
    "authy_users:create"
  ],
  "expires_at": "2024-01-15T10:30:00Z"
}
```

**Response (Invalid Token):**
```json
{
  "valid": false
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_access_token_here"
  }'
```

---

### Logout

Invalidate the current tokens.

**Endpoint:** `POST /api/v1/auth/logout`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_access_token_here"
  }'
```

---

### Change Password

Update the authenticated user's password.

**Endpoint:** `POST /api/v1/auth/update_password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": true,
  "message": "Invalid current password"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/update_password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_access_token_here" \
  -d '{
    "current_password": "password",
    "new_password": "newSecurePassword123"
  }'
```

---

## Token Management

### Best Practices

1. **Store tokens securely**
   - Never store tokens in localStorage for sensitive applications
   - Use httpOnly cookies or secure storage mechanisms
   - Clear tokens on logout

2. **Handle token expiration**
   - Check `expires_in` from login response
   - Implement automatic token refresh before expiration
   - Handle 401 responses by refreshing the token

3. **Refresh token rotation**
   - Each refresh returns a new refresh token
   - Use the new refresh token for subsequent refreshes
   - Old refresh tokens are invalidated

### Token Refresh Strategy

```
Access Token Lifetime:  1 hour (3600 seconds)
Refresh Token Lifetime: 7 days (604800 seconds)

Recommended: Refresh access token when ~80% of its lifetime has passed
             (e.g., after 48 minutes for a 1-hour token)
```

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid credentials or expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": true,
  "message": "Description of the error"
}
```

### Rate Limiting

Authentication endpoints are rate-limited to **10 requests per minute** per IP address.

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1705312800
```

## Code Examples

### JavaScript/TypeScript

```typescript
class AuthyClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:8080/api/v1') {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string, application: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, application }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.accessToken = data.token_pair.access_token;
    this.refreshToken = data.token_pair.refresh_token;

    return {
      user: data.user,
      permissions: data.permissions,
      expiresIn: data.token_pair.expires_in,
    };
  }

  async refresh() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.token_pair.access_token;
    this.refreshToken = data.token_pair.refresh_token;

    return data.token_pair.expires_in;
  }

  async validateToken() {
    if (!this.accessToken) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.accessToken }),
    });

    const data = await response.json();
    return data.valid ? data : null;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await fetch(`${this.baseUrl}/auth/update_password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      throw new Error('Password change failed');
    }

    return true;
  }

  async logout() {
    if (this.accessToken) {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.accessToken }),
      });
    }

    this.accessToken = null;
    this.refreshToken = null;
  }

  // Helper for authenticated requests
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    // Auto-refresh on 401
    if (response.status === 401 && this.refreshToken) {
      await this.refresh();
      return this.request(endpoint, options);
    }

    return response;
  }
}

// Usage
const client = new AuthyClient();

// Login
const { user, permissions } = await client.login(
  'admin@authy.dev',
  'password',
  'AuthyBackoffice'
);
console.log('Logged in as:', user.email);
console.log('Permissions:', permissions);

// Make authenticated request
const response = await client.request('/users');
const users = await response.json();

// Change password
await client.changePassword('password', 'newPassword123');

// Logout
await client.logout();
```

### Python

```python
import requests
from typing import Optional, Dict, Any

class AuthyClient:
    def __init__(self, base_url: str = "http://localhost:8080/api/v1"):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def login(self, email: str, password: str, application: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={
                "email": email,
                "password": password,
                "application": application,
            },
        )
        response.raise_for_status()

        data = response.json()
        self.access_token = data["token_pair"]["access_token"]
        self.refresh_token = data["token_pair"]["refresh_token"]

        return {
            "user": data["user"],
            "permissions": data["permissions"],
            "expires_in": data["token_pair"]["expires_in"],
        }

    def refresh(self) -> int:
        if not self.refresh_token:
            raise ValueError("No refresh token available")

        response = requests.post(
            f"{self.base_url}/auth/refresh",
            json={"refresh_token": self.refresh_token},
        )
        response.raise_for_status()

        data = response.json()
        self.access_token = data["token_pair"]["access_token"]
        self.refresh_token = data["token_pair"]["refresh_token"]

        return data["token_pair"]["expires_in"]

    def validate_token(self) -> Optional[Dict[str, Any]]:
        if not self.access_token:
            return None

        response = requests.post(
            f"{self.base_url}/auth/validate",
            json={"token": self.access_token},
        )

        data = response.json()
        return data if data.get("valid") else None

    def change_password(self, current_password: str, new_password: str) -> bool:
        response = requests.post(
            f"{self.base_url}/auth/update_password",
            headers={"Authorization": f"Bearer {self.access_token}"},
            json={
                "current_password": current_password,
                "new_password": new_password,
            },
        )
        response.raise_for_status()
        return True

    def logout(self) -> None:
        if self.access_token:
            requests.post(
                f"{self.base_url}/auth/logout",
                json={"token": self.access_token},
            )

        self.access_token = None
        self.refresh_token = None

    def request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.access_token}"

        response = requests.request(
            method,
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs,
        )

        # Auto-refresh on 401
        if response.status_code == 401 and self.refresh_token:
            self.refresh()
            return self.request(method, endpoint, **kwargs)

        return response


# Usage
client = AuthyClient()

# Login
result = client.login("admin@authy.dev", "password", "AuthyBackoffice")
print(f"Logged in as: {result['user']['email']}")
print(f"Permissions: {result['permissions']}")

# Make authenticated request
response = client.request("GET", "/users")
users = response.json()

# Change password
client.change_password("password", "newPassword123")

# Logout
client.logout()
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type AuthyClient struct {
	BaseURL      string
	AccessToken  string
	RefreshToken string
	HTTPClient   *http.Client
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

type UserInfo struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	IsActive  bool   `json:"is_active"`
}

type LoginResponse struct {
	Success     bool      `json:"success"`
	Message     string    `json:"message"`
	TokenPair   TokenPair `json:"token_pair"`
	User        UserInfo  `json:"user"`
	Permissions []string  `json:"permissions"`
}

func NewAuthyClient(baseURL string) *AuthyClient {
	return &AuthyClient{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{},
	}
}

func (c *AuthyClient) Login(email, password, application string) (*LoginResponse, error) {
	payload := map[string]string{
		"email":       email,
		"password":    password,
		"application": application,
	}

	body, _ := json.Marshal(payload)
	resp, err := c.HTTPClient.Post(
		c.BaseURL+"/auth/login",
		"application/json",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result LoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	c.AccessToken = result.TokenPair.AccessToken
	c.RefreshToken = result.TokenPair.RefreshToken

	return &result, nil
}

func (c *AuthyClient) Refresh() error {
	payload := map[string]string{
		"refresh_token": c.RefreshToken,
	}

	body, _ := json.Marshal(payload)
	resp, err := c.HTTPClient.Post(
		c.BaseURL+"/auth/refresh",
		"application/json",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		TokenPair TokenPair `json:"token_pair"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	c.AccessToken = result.TokenPair.AccessToken
	c.RefreshToken = result.TokenPair.RefreshToken

	return nil
}

func (c *AuthyClient) ChangePassword(currentPassword, newPassword string) error {
	payload := map[string]string{
		"current_password": currentPassword,
		"new_password":     newPassword,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", c.BaseURL+"/auth/update_password", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.AccessToken)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("password change failed: %d", resp.StatusCode)
	}

	return nil
}

func (c *AuthyClient) Logout() error {
	payload := map[string]string{
		"token": c.AccessToken,
	}

	body, _ := json.Marshal(payload)
	_, err := c.HTTPClient.Post(
		c.BaseURL+"/auth/logout",
		"application/json",
		bytes.NewBuffer(body),
	)

	c.AccessToken = ""
	c.RefreshToken = ""

	return err
}

func main() {
	client := NewAuthyClient("http://localhost:8080/api/v1")

	// Login
	result, err := client.Login("admin@authy.dev", "password", "AuthyBackoffice")
	if err != nil {
		panic(err)
	}

	fmt.Printf("Logged in as: %s\n", result.User.Email)
	fmt.Printf("Permissions: %v\n", result.Permissions)

	// Change password
	err = client.ChangePassword("password", "newPassword123")
	if err != nil {
		panic(err)
	}

	// Logout
	client.Logout()
}
```

## Permissions

Permissions follow the pattern `resource:action`. Common permissions include:

| Permission | Description |
|------------|-------------|
| `authy_users:read` | View users |
| `authy_users:create` | Create users |
| `authy_users:update` | Update users |
| `authy_users:delete` | Delete users |
| `authy_roles:read` | View roles |
| `authy_roles:create` | Create roles |
| `authy_roles:update` | Update roles |
| `authy_roles:delete` | Delete roles |
| `authy_applications:read` | View applications |
| `authy_applications:create` | Create applications |
| `authy_system:admin` | Full system access |
| `authy_system:audit` | View audit logs |

Check permissions on the client side before showing UI elements:

```typescript
function hasPermission(permissions: string[], required: string): boolean {
  return permissions.some(p =>
    p === required ||
    p === '*' ||
    p === 'authy_system:admin' ||
    p === required.split(':')[0] + ':*'
  );
}

// Usage
if (hasPermission(user.permissions, 'authy_users:create')) {
  showCreateUserButton();
}
```

## Support

- **API Documentation:** `http://localhost:8080/docs`
- **Health Check:** `GET /health`
- **Metrics:** `GET /metrics`
