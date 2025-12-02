package backend

import (
	"context"
	"log"
)

// HealthCheck checks the backend health by making an HTTP request.
func (s *Service) HealthCheck() bool {
	ctx := context.Background()
	prompt := "what is 2+2 ?"
	systemPrompt := "only answer with a number"
	validResponse := "4"

	log.Println("Health Checking backend health...")
	//log.Println("Health DummyPrompt: ", prompt)
	//log.Println("Health SystemPrompt: ", systemPrompt)

	response, err := s.GetResponse(ctx, prompt, systemPrompt)
	//log.Println("[Health] Response: ", response)

	if err != nil {
		if response == "" {
			log.Println("Health Check failed: ", err)
			return false
		}
	}
	if response != validResponse {
		log.Println("Health Check failed: ", err)
		return false
	}
	log.Println("Health Check passed")
	return true
}
