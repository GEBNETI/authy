package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP metrics
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "authy_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "authy_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// Authentication metrics
	LoginAttemptsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "authy_login_attempts_total",
			Help: "Total number of login attempts",
		},
		[]string{"status", "application"},
	)

	TokensIssued = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "authy_tokens_issued_total",
			Help: "Total number of tokens issued",
		},
		[]string{"type", "application"},
	)

	TokenValidations = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "authy_token_validations_total",
			Help: "Total number of token validations",
		},
		[]string{"status", "application"},
	)

	// Database metrics
	DatabaseConnections = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "authy_database_connections",
			Help: "Number of database connections",
		},
		[]string{"state"},
	)

	DatabaseQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "authy_database_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)

	// Cache metrics
	CacheOperations = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "authy_cache_operations_total",
			Help: "Total number of cache operations",
		},
		[]string{"operation", "status"},
	)

	CacheHitRatio = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "authy_cache_hit_ratio",
			Help: "Cache hit ratio",
		},
		[]string{"cache_type"},
	)
)

func Init() {
	// Register custom metrics if needed
	prometheus.MustRegister(HTTPRequestsTotal)
	prometheus.MustRegister(HTTPRequestDuration)
	prometheus.MustRegister(LoginAttemptsTotal)
	prometheus.MustRegister(TokensIssued)
	prometheus.MustRegister(TokenValidations)
	prometheus.MustRegister(DatabaseConnections)
	prometheus.MustRegister(DatabaseQueryDuration)
	prometheus.MustRegister(CacheOperations)
	prometheus.MustRegister(CacheHitRatio)
}