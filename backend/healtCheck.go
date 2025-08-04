package backend

import (
	"context"
	"log"
)

// HealthCheck checks the backend health by making an HTTP request.
func HealthCheck() bool {
	ctx := context.Background()
	prompt := "what is 2+2 ?"
	systemPrompt := "only answer with a number"
	validResponse := "4"

	log.Println("[HealthCheck] Checking backend health...")
	log.Println("[HealthCheck] Prompt: ", prompt)
	log.Println("[HealthCheck] SystemPrompt: ", systemPrompt)

	response, err := GetResponse(ctx, prompt, systemPrompt)
	log.Println("[HealthCheck] Response: ", response)

	if err != nil {
		if response == "" {
			return false
		}
	}
	if response != validResponse {
		return false
	}
	return true
}
