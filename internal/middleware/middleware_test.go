package middleware

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestFormatJSONRequestBodyRedactsSensitiveFields(t *testing.T) {
	body := []byte(`{
		"email":"user@example.com",
		"password":"secret",
		"nested":{"refresh_token":"token-value"},
		"list":[{"api_key":"abc123"}]
	}`)

	formatted := formatJSONRequestBody(body)

	var payload map[string]any
	if err := json.Unmarshal([]byte(formatted), &payload); err != nil {
		t.Fatalf("unmarshal formatted body: %v", err)
	}

	if payload["email"] != "user@example.com" {
		t.Fatalf("expected non-sensitive field to remain, got %#v", payload["email"])
	}

	if payload["password"] != "[REDACTED]" {
		t.Fatalf("expected password to be redacted, got %#v", payload["password"])
	}

	nested, ok := payload["nested"].(map[string]any)
	if !ok || nested["refresh_token"] != "[REDACTED]" {
		t.Fatalf("expected nested refresh_token to be redacted, got %#v", payload["nested"])
	}

	list, ok := payload["list"].([]any)
	if !ok || len(list) != 1 {
		t.Fatalf("expected list payload to remain intact, got %#v", payload["list"])
	}

	firstItem, ok := list[0].(map[string]any)
	if !ok || firstItem["api_key"] != "[REDACTED]" {
		t.Fatalf("expected api_key to be redacted, got %#v", list[0])
	}
}

func TestTruncateLogValueAppendsSuffixWhenNeeded(t *testing.T) {
	value := strings.Repeat("a", maxLoggedRequestBodyLength+10)

	truncated := truncateLogValue(value)

	if !strings.HasSuffix(truncated, "...[truncated]") {
		t.Fatalf("expected truncated suffix, got %q", truncated)
	}

	expectedLength := maxLoggedRequestBodyLength + len("...[truncated]")
	if len(truncated) != expectedLength {
		t.Fatalf("expected length %d, got %d", expectedLength, len(truncated))
	}
}
