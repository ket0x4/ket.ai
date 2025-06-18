package permissions

import (
	"os"
	"sync"
	"testing"
)

// TestMain is the entry point for testing. It sets up and tears down the test environment.
func TestMain(m *testing.M) {
	// Back up the original chatsFilePath and restore it after the test.
	originalChatsFilePath := chatsFilePath
	defer func() {
		chatsFilePath = originalChatsFilePath
		resetGlobals()
	}()

	// Run the tests
	exitCode := m.Run()

	// Exit with the same code
	os.Exit(exitCode)
}

// resetGlobals resets the global variables to their initial state.
func resetGlobals() {
	allowedIDsData = nil
	loadOnce = sync.Once{}
	loadError = nil
}

// createTestChatsFile creates a temporary chats.json file with the given content.
func createTestChatsFile(content string) (cleanupFunc func()) {
	tmpFile, err := os.CreateTemp("", "chats.*.json")
	if err != nil {
		panic("failed to create temp file")
	}

	if _, err := tmpFile.WriteString(content); err != nil {
		panic("failed to write to temp file")
	}

	if err := tmpFile.Close(); err != nil {
		panic("failed to close temp file")
	}

	chatsFilePath = tmpFile.Name()

	return func() {
		os.Remove(tmpFile.Name())
		resetGlobals()
	}
}

func TestIsAllowed(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1, 2], "allowed_chats": [10, 20], "admins": [100]}`)
	defer cleanup()

	tests := []struct {
		name     string
		id       int64
		expected bool
	}{
		{"AllowedUser", 1, true},
		{"AllowedChat", 20, true},
		{"NotAllowed", 99, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsAllowed(tt.id); got != tt.expected {
				t.Errorf("IsAllowed() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestIsAllowedUser(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1, 2], "allowed_chats": [10, 20], "admins": [100]}`)
	defer cleanup()

	tests := []struct {
		name     string
		id       int64
		expected bool
	}{
		{"AllowedUser", 1, true},
		{"NotAllowedUser", 10, false},
		{"AdminUserNotRegularUser", 100, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsAllowedUser(tt.id); got != tt.expected {
				t.Errorf("IsAllowedUser() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestIsAdmin(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1, 2], "allowed_chats": [10, 20], "admins": [100, 200]}`)
	defer cleanup()

	tests := []struct {
		name     string
		id       int64
		expected bool
	}{
		{"IsAdmin", 100, true},
		{"IsNotAdmin", 1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsAdmin(tt.id); got != tt.expected {
				t.Errorf("IsAdmin() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestFileNotFound(t *testing.T) {
	// Don't create a file, so it will be not found
	chatsFilePath = "non_existent_file.json"
	resetGlobals()

	if IsAllowed(1) {
		t.Errorf("IsAllowed() should be false when file not found")
	}
}

func TestBadJSON(t *testing.T) {
	cleanup := createTestChatsFile(`{"allowed_users": [1, 2],`) // Malformed JSON
	defer cleanup()

	if IsAllowed(1) {
		t.Errorf("IsAllowed() should be false with malformed JSON")
	}
}
