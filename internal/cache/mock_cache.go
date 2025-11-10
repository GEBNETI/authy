package cache

import (
	"context"
	"errors"
	"sync"
	"time"
)

var (
	ErrKeyNotFound = errors.New("key not found")
)

// MockClient is a thread-safe in-memory cache implementation for testing
// It implements the same interface as cache.Client
type MockClient struct {
	data   map[string]mockCacheItem
	mu     sync.RWMutex
	closed bool
}

type mockCacheItem struct {
	value     string
	expiresAt time.Time
}

// NewMockClient creates a new mock cache client instance
func NewMockClient() *MockClient {
	return &MockClient{
		data: make(map[string]mockCacheItem),
	}
}

// Set stores a key-value pair with the specified TTL (in seconds)
func (m *MockClient) Set(ctx context.Context, key, value string, ttl int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return context.Canceled
	}

	expiresAt := time.Now().Add(time.Duration(ttl) * time.Second)
	m.data[key] = mockCacheItem{
		value:     value,
		expiresAt: expiresAt,
	}

	return nil
}

// Get retrieves a value by key
func (m *MockClient) Get(ctx context.Context, key string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return "", context.Canceled
	}

	item, exists := m.data[key]
	if !exists {
		return "", ErrKeyNotFound
	}

	// Check if expired
	if time.Now().After(item.expiresAt) {
		return "", ErrKeyNotFound
	}

	return item.value, nil
}

// Delete removes a key from the cache
func (m *MockClient) Delete(ctx context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.closed {
		return context.Canceled
	}

	delete(m.data, key)
	return nil
}

// Close simulates closing the cache connection
func (m *MockClient) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.closed = true
	m.data = make(map[string]mockCacheItem)

	return nil
}

// Clear removes all keys from the cache (useful for tests)
func (m *MockClient) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.data = make(map[string]mockCacheItem)
}

// Size returns the number of non-expired keys in the cache
func (m *MockClient) Size() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	count := 0
	now := time.Now()

	for _, item := range m.data {
		if now.Before(item.expiresAt) {
			count++
		}
	}

	return count
}

// CleanupExpired removes all expired keys (useful for tests)
func (m *MockClient) CleanupExpired() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for key, item := range m.data {
		if now.After(item.expiresAt) {
			delete(m.data, key)
		}
	}
}

// Exists checks if a key exists and is not expired
func (m *MockClient) Exists(ctx context.Context, key string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return false, context.Canceled
	}

	item, exists := m.data[key]
	if !exists {
		return false, nil
	}

	// Check if expired
	if time.Now().After(item.expiresAt) {
		return false, nil
	}

	return true, nil
}

// GetTTL returns the remaining time-to-live for a key
func (m *MockClient) GetTTL(ctx context.Context, key string) (time.Duration, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return 0, context.Canceled
	}

	item, exists := m.data[key]
	if !exists {
		return 0, ErrKeyNotFound
	}

	ttl := time.Until(item.expiresAt)
	if ttl < 0 {
		return 0, ErrKeyNotFound
	}

	return ttl, nil
}

// Keys returns all non-expired keys
func (m *MockClient) Keys(ctx context.Context) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.closed {
		return nil, context.Canceled
	}

	var keys []string
	now := time.Now()

	for key, item := range m.data {
		// Skip expired keys
		if now.After(item.expiresAt) {
			continue
		}
		keys = append(keys, key)
	}

	return keys, nil
}
