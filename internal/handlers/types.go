package handlers

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Error   bool   `json:"error"`
	Message string `json:"message"`
}

// SuccessResponse represents a standard success response
type SuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// PaginationMeta represents pagination metadata
type PaginationMeta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}