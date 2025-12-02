package random

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/chatcontext"
	"ket/config"
	"log"
	"math/rand"
	"strings"
)

type AutoResponseConfig struct {
	PrePrompt string
	Enabled   bool
}

var defaultConfig = AutoResponseConfig{
	Enabled: true,
}

var currentConfig = defaultConfig

type Service struct {
	chatContextService *chatcontext.Service
	backendService     *backend.Service
}

func NewService(chatContextService *chatcontext.Service, backendService *backend.Service) *Service {
	return &Service{
		chatContextService: chatContextService,
		backendService:     backendService,
	}
}

func SetConfig(config AutoResponseConfig) {
	currentConfig = config
	log.Printf("AutoResponse: Config updated - PrePrompt: %q, Enabled: %t",
		config.PrePrompt, config.Enabled)
}

func GetConfig() AutoResponseConfig {
	return currentConfig
}

func getTriggerProbability() float64 {
	return config.GetConfig().BotSetup.TriggerProbability
}

func (s *Service) LogMessage(chatID int64, username string, userID int64, message string) (bool, error) {
	if !currentConfig.Enabled {
		return false, nil
	}

	// Save message to database via chatcontext
	err := s.chatContextService.AddMessage(chatID, userID, "user", username, message)
	if err != nil {
		return false, fmt.Errorf("failed to log message: %w", err)
	}

	// Randomly trigger response
	if rand.Float64() < getTriggerProbability() {
		log.Printf("AutoResponse: Randomly triggered response for chat %d", chatID)
		return true, nil
	}

	return false, nil
}

func (s *Service) GenerateAutoResponse(ctx context.Context, chatID int64) (string, error) {
	if !currentConfig.Enabled {
		return "", fmt.Errorf("auto-response feature is disabled")
	}

	// Get history from chatcontext
	history := s.chatContextService.GetChatHistory(chatID)
	if len(history) == 0 {
		return "", fmt.Errorf("no messages found for chat %d", chatID)
	}

	allMessages := strings.Join(history, "\n")
	fullPrompt := currentConfig.PrePrompt + "\n\nSon mesajlar:\n" + allMessages

	response, err := s.backendService.GetResponse(ctx, fullPrompt, config.GetConfig().BackendSetup.SysPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	// Log the bot's response back to history
	err = s.chatContextService.AddMessage(chatID, 0, "assistant", config.BotName, response)
	if err != nil {
		log.Printf("AutoResponse: Failed to log bot response: %v", err)
	}

	log.Printf("AutoResponse: Generated response for chat %d", chatID)
	return response, nil
}
