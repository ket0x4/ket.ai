package backend

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIsLlamaCppAvailable(t *testing.T) {
	// Create a mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// Point the health check URL to the mock server
	llamaCppHealthCheckURL = server.URL

	if !IsLlamaCppAvailable() {
		t.Error("Expected IsLlamaCppAvailable to return true when server is up")
	}

	// Test with a down server
	server.Close()

	if IsLlamaCppAvailable() {
		t.Error("Expected IsLlamaCppAvailable to return false when server is down")
	}
}
