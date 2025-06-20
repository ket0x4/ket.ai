package backend

import (
	"context"
	"ket/config"
	"log"
	"net/http"
	"time"
)

var Backend string
var llamaCppHealthCheckURL = "http://127.0.0.1:8080/health"
var isLlamaOk bool

func init() {
	// Initialize the backend
	log.Println("Backend set to auto-detect mode")
	log.Println("Looking for backend configuration...")
	Backend = config.GetConfig().BACKEND
	if Backend == "" || Backend == "auto" {
		if IsLlamaCppAvailable() {
			log.Println("Found llama-server up and running at", llamaCppHealthCheckURL)
			// If Llama.cpp is available, set it as the backend
			Backend = "llama"
			isLlamaOk = true
		} else {
			// If Llama.cpp is not available, default to OpenAI
			log.Println("Unable to find llama-server, Set url and key in config.json")
			log.Println("Falling back to OpenAI backend")
			Backend = "openai"
			go func() {
				log.Println("Testing OpenAI backend...")
				// Using a simple context and prompt for testing
				_, err := GetResponse(context.Background(), "Hi! Are you working?")
				if err != nil {
					log.Printf("OpenAI backend test failed: %v", err)
					return
				}
				log.Printf("OpenAI backend test successful")
			}()
		}
	}
	if Backend == "llama" {
		go HealthCheck() // Start health check in a separate goroutine
	}
}

// check if url returns 200 OK
func IsLlamaCppAvailable() bool {
	client := http.Client{
		Timeout: 2 * time.Second,
	}
	resp, err := client.Get(llamaCppHealthCheckURL)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// check health every 10 seconds
func HealthCheck() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if Backend == "llama" {
			isLlamaOk = IsLlamaCppAvailable()
			if !isLlamaOk {
				log.Println("Llama.cpp server is down or unreachable")
			}
		}
	}
}
