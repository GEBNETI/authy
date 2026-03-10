package handlers

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPermissionsListResponseMarshalsEmptyPermissionsAsArray(t *testing.T) {
	response := PermissionsListResponse{
		Success:     true,
		Message:     "Permissions retrieved successfully",
		Permissions: make([]PermissionResponse, 0),
		Pagination: PaginationMeta{
			Page:       1,
			PerPage:    10,
			Total:      0,
			TotalPages: 0,
		},
	}

	payload, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	if !strings.Contains(string(payload), `"permissions":[]`) {
		t.Fatalf("expected permissions to marshal as an empty array, got %s", payload)
	}
}
