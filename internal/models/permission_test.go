package models

import "testing"

func TestPermissionValidateAddsAuthyPrefixWhenNoUnderscoreExists(t *testing.T) {
	permission := &Permission{
		Resource: "Users",
		Action:   "Read",
	}

	if err := permission.validate(); err != nil {
		t.Fatalf("validate permission: %v", err)
	}

	if permission.Resource != "authy_users" {
		t.Fatalf("expected prefixed resource, got %q", permission.Resource)
	}

	if permission.Name != "authy_users:read" {
		t.Fatalf("expected prefixed permission name, got %q", permission.Name)
	}

	if permission.Category != "general" {
		t.Fatalf("expected default category to be general, got %q", permission.Category)
	}
}

func TestPermissionValidateKeepsCustomScopedResourceWithUnderscore(t *testing.T) {
	permission := &Permission{
		Resource: "payroll_users",
		Action:   "List",
	}

	if err := permission.validate(); err != nil {
		t.Fatalf("validate permission: %v", err)
	}

	if permission.Resource != "payroll_users" {
		t.Fatalf("expected resource to remain unchanged, got %q", permission.Resource)
	}

	if permission.Name != "payroll_users:list" {
		t.Fatalf("expected custom-scoped permission name, got %q", permission.Name)
	}
}
