package backend

import (
	"context"
	"fmt"
	"ket/config"
	"log"
	"net/http"
)

func init() {
	// Initialize health check
	go HealthCheck(context.Background())
}

// Check backend health
func HealthCheck(ctx context.Context) bool {
	url := config.GetConfig().API_URL
	log.Println("Checking backend health at", url)
	if err := HttpCheck(url); err != nil {
		log.Printf("health check failed on http check: %v", err)
		return false
	} else {
		log.Println("HTTP health check passed.")
	}
	if err := DummyTest("Are you working?"); err != nil {
		log.Printf("health check failed on dummy test: %v", err)
		return false
	} else {
		log.Println("Dummy test passed.")
	}
	// If we reach here, all checks passed
	log.Println("Backend health check passed.")
	// Optionally, you can add more checks here (e.g., database connection, etc.)
	return true
}

// HTTP status checker
func HttpCheck(url string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	return nil
}

// Test backend with dummy request
func DummyTest(prompt string) error {
	_, err := GetResponse(context.Background(), prompt)
	return err
}
