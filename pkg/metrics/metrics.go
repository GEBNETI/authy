package metrics

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Simple metrics collector that bypasses Prometheus registry completely
type MetricsCollector struct {
	mu sync.RWMutex
	httpRequests map[string]int64
	httpDurations map[string][]float64
}

var collector *MetricsCollector
var once sync.Once

func Init() {
	once.Do(func() {
		collector = &MetricsCollector{
			httpRequests: make(map[string]int64),
			httpDurations: make(map[string][]float64),
		}
	})
}

// RecordHTTPRequest records an HTTP request metric
func RecordHTTPRequest(method, endpoint, status string, duration float64) {
	if collector == nil {
		return
	}
	
	collector.mu.Lock()
	defer collector.mu.Unlock()
	
	// Record request count
	requestKey := fmt.Sprintf("%s_%s_%s", method, endpoint, status)
	collector.httpRequests[requestKey]++
	
	// Record duration
	durationKey := fmt.Sprintf("%s_%s", method, endpoint)
	collector.httpDurations[durationKey] = append(collector.httpDurations[durationKey], duration)
	
	// Keep only last 1000 duration samples to prevent memory bloat
	if len(collector.httpDurations[durationKey]) > 1000 {
		collector.httpDurations[durationKey] = collector.httpDurations[durationKey][len(collector.httpDurations[durationKey])-1000:]
	}
}

// GetHandler returns a custom metrics handler
func GetHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if collector == nil {
			w.WriteHeader(http.StatusInternalServerError)
			io.WriteString(w, "metrics not initialized")
			return
		}
		
		collector.mu.RLock()
		defer collector.mu.RUnlock()
		
		w.Header().Set("Content-Type", "text/plain")
		
		// Write HTTP request metrics
		for key, count := range collector.httpRequests {
			parts := strings.Split(key, "_")
			if len(parts) >= 3 {
				method, endpoint, status := parts[0], strings.Join(parts[1:len(parts)-1], "_"), parts[len(parts)-1]
				fmt.Fprintf(w, "authy_http_requests_total{method=\"%s\",endpoint=\"%s\",status=\"%s\"} %d\n", method, endpoint, status, count)
			}
		}
		
		// Write HTTP duration metrics (simple average)
		for key, durations := range collector.httpDurations {
			if len(durations) > 0 {
				parts := strings.Split(key, "_")
				if len(parts) >= 2 {
					method, endpoint := parts[0], strings.Join(parts[1:], "_")
					
					// Calculate average
					var sum float64
					for _, d := range durations {
						sum += d
					}
					avg := sum / float64(len(durations))
					
					fmt.Fprintf(w, "authy_http_request_duration_seconds_avg{method=\"%s\",endpoint=\"%s\"} %.6f\n", method, endpoint, avg)
					fmt.Fprintf(w, "authy_http_request_duration_seconds_count{method=\"%s\",endpoint=\"%s\"} %d\n", method, endpoint, len(durations))
				}
			}
		}
		
		// Add basic Go runtime metrics manually
		fmt.Fprintf(w, "go_info{version=\"go1.21\"} 1\n")
		fmt.Fprintf(w, "authy_up 1\n")
		fmt.Fprintf(w, "authy_start_time_seconds %d\n", time.Now().Unix())
	})
}

// Legacy compatibility - these are no-ops now
var (
	HTTPRequestsTotal interface{}
	HTTPRequestDuration interface{}
)