package backend

import (
	"context"
	"fmt"
	"ket/config"
	"log"
	"net/http"
)

// HealthCheck checks the backend health by making an HTTP request.
func HealthCheck(ctx context.Context) bool {
	url := config.GetConfig().BackendSetup.ApiUrl
	log.Println("Checking backend health at", url)

	if err := HttpCheck(ctx, url); err != nil {
		log.Printf("Health check failed: %v", err)
		return false
	}

	log.Println("Backend health check passed.")
	return true
}

// HttpCheck performs an HTTP GET request to the given URL to check its status.
func HttpCheck(ctx context.Context, url string) error {
	// Try health endpoint first
	healthURL := url + "/health"
	req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err == nil && resp.StatusCode == http.StatusOK {
		resp.Body.Close()
		return nil
	}
	if resp != nil {
		resp.Body.Close()
	}

	// Fallback to base URL if health endpoint fails
	log.Println("Health check on /health failed, trying base URL.")
	req, err = http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request for base URL: %w", err)
	}

	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP GET request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}
