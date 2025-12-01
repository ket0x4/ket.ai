package random

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"log"
	"math/rand"
	"strings"
	"sync"
)

var (
	groupMessages        = make(map[int64][]string)
	groupMessageCounters = make(map[int64]int)
	groupMutex           sync.RWMutex
)

type AutoResponseConfig struct {
	PrePrompt string
	Enabled   bool
}

var defaultConfig = AutoResponseConfig{
	Enabled: true,
}

var currentConfig = defaultConfig

func SetConfig(config AutoResponseConfig) {
	currentConfig = config
	log.Printf("AutoResponse: Config updated - PrePrompt: %q, Enabled: %t",
		config.PrePrompt, config.Enabled)
}

func GetConfig() AutoResponseConfig {
	return currentConfig
}

func getMaxMessagesPerGroup() int {
	return config.GetConfig().BotSetup.MaxMessagesPerGroup
}

func getTriggerProbability() float64 {
	return config.GetConfig().BotSetup.TriggerProbability
}

func LogMessage(chatID int64, username string, userID int64, message string) (bool, error) {
	if !currentConfig.Enabled {
		return false, nil
	}

	groupMutex.Lock()
	defer groupMutex.Unlock()

	formattedMessage := fmt.Sprintf("%s:%d:%s", username, userID, message)

	messages, exists := groupMessages[chatID]
	if !exists {
		messages = make([]string, 0, getMaxMessagesPerGroup())
	}

	messages = append(messages, formattedMessage)

	if len(messages) > getMaxMessagesPerGroup() {
		messages = messages[len(messages)-getMaxMessagesPerGroup():]
	}

	groupMessages[chatID] = messages

	// Gerçekten random tetikleme (Go 1.20+ için Seed gerekmez)
	if rand.Float64() < getTriggerProbability() {
		log.Printf("AutoResponse: Randomly triggered response for chat %d", chatID)
		return true, nil
	}

	return false, nil
}

func GetLatestMessage(chatID int64) (string, error) {
	if !currentConfig.Enabled {
		return "", fmt.Errorf("auto-response feature is disabled")
	}

	groupMutex.RLock()
	defer groupMutex.RUnlock()

	messages, exists := groupMessages[chatID]
	if !exists || len(messages) == 0 {
		return "", fmt.Errorf("no messages found for chat %d", chatID)
	}

	latestMessage := messages[len(messages)-1]
	log.Printf("AutoResponse: Selected latest message for chat %d", chatID)

	return latestMessage, nil
}

func GenerateAutoResponse(ctx context.Context, chatID int64, backendService *backend.Service) (string, error) {
	if !currentConfig.Enabled {
		return "", fmt.Errorf("auto-response feature is disabled")
	}

	allMessages, err := GetAllMessages(chatID)
	if err != nil {
		return "", fmt.Errorf("failed to get messages: %w", err)
	}

	fullPrompt := currentConfig.PrePrompt + "\n\nSon mesajlar:\n" + allMessages

	response, err := backendService.GetResponse(ctx, fullPrompt, config.GetConfig().BackendSetup.AutoPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	log.Printf("AutoResponse: Generated response for chat %d using %d messages", chatID, len(groupMessages[chatID]))
	return response, nil
}

func GetAllMessages(chatID int64) (string, error) {
	if !currentConfig.Enabled {
		return "", fmt.Errorf("auto-response feature is disabled")
	}

	groupMutex.RLock()
	defer groupMutex.RUnlock()

	messages, exists := groupMessages[chatID]
	if !exists || len(messages) == 0 {
		return "", fmt.Errorf("no messages found for chat %d", chatID)
	}

	var formattedMessages []string
	for i, message := range messages {
		formattedMessages = append(formattedMessages, fmt.Sprintf("%d. %s", i+1, message))
	}

	result := strings.Join(formattedMessages, "\n")
	log.Printf("AutoResponse: Retrieved %d messages for chat %d", len(messages), chatID)

	return result, nil
}

func GetGroupCounter(chatID int64) int {
	groupMutex.RLock()
	defer groupMutex.RUnlock()

	return groupMessageCounters[chatID]
}

func GetGroupStats(chatID int64) (int, int) {
	groupMutex.RLock()
	defer groupMutex.RUnlock()

	messages, exists := groupMessages[chatID]
	if !exists {
		return 0, getMaxMessagesPerGroup()
	}

	return len(messages), getMaxMessagesPerGroup()
}

func ClearGroupMessages(chatID int64) {
	groupMutex.Lock()
	defer groupMutex.Unlock()

	delete(groupMessages, chatID)
	delete(groupMessageCounters, chatID)
	log.Printf("AutoResponse: Cleared all messages and counter for chat %d", chatID)
}

func ClearAllMessages() {
	groupMutex.Lock()
	defer groupMutex.Unlock()

	groupMessages = make(map[int64][]string)
	groupMessageCounters = make(map[int64]int)
	log.Printf("AutoResponse: Cleared all stored messages and counters")
}

func GetAllGroupStats() map[int64]int {
	groupMutex.RLock()
	defer groupMutex.RUnlock()

	stats := make(map[int64]int)
	for chatID, messages := range groupMessages {
		stats[chatID] = len(messages)
	}

	return stats
}
