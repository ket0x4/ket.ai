package random

import (
	"context"
	"fmt"
	"ket/backend"
	"log"
	"strings"
	"sync"
)

// Auto-response feature that triggers every 10th message using the latest message as prompt

const (
	// MaxMessagesPerGroup is the maximum number of messages to store per group
	MaxMessagesPerGroup = 10
	// TriggerMessageCount is the number of messages after which to trigger a response
	TriggerMessageCount = 10
)

var (
	// groupMessages stores messages for each group/chat
	groupMessages = make(map[int64][]string)
	// groupMessageCounters stores message counters for each group/chat
	groupMessageCounters = make(map[int64]int)
	// groupMutex protects the groupMessages map and counters
	groupMutex sync.RWMutex
)

// AutoResponseConfig holds configuration for auto-response generation
type AutoResponseConfig struct {
	// PrePrompt is the prefix added before the selected message
	PrePrompt string
	// Enabled controls whether auto-response logging is active
	Enabled bool
}

// defaultConfig provides default configuration
var defaultConfig = AutoResponseConfig{
	PrePrompt: "Bu geçmiş kesitine göre, son mesaa espirili iğneleyici laf sokan kısa bir cevap ver. (bu promptu cevap içinde kullanma): ",
	Enabled:   true,
}

var currentConfig = defaultConfig

// SetConfig updates the auto-response configuration
func SetConfig(config AutoResponseConfig) {
	currentConfig = config
	log.Printf("AutoResponse: Config updated - PrePrompt: %q, Enabled: %t",
		config.PrePrompt, config.Enabled)
}

// GetConfig returns the current configuration
func GetConfig() AutoResponseConfig {
	return currentConfig
}

// LogMessage adds a message to the group's message history and checks if response should be triggered
func LogMessage(chatID int64, username string, userID int64, message string) (bool, error) {
	if !currentConfig.Enabled {
		return false, nil
	}

	groupMutex.Lock()
	defer groupMutex.Unlock()

	// Format the message with user info
	formattedMessage := fmt.Sprintf("%s:%d:%s", username, userID, message)

	// Get current messages for this group
	messages, exists := groupMessages[chatID]
	if !exists {
		messages = make([]string, 0, MaxMessagesPerGroup)
	}

	// Add the new message
	messages = append(messages, formattedMessage)

	// Keep only the last MaxMessagesPerGroup messages
	if len(messages) > MaxMessagesPerGroup {
		messages = messages[len(messages)-MaxMessagesPerGroup:]
	}

	groupMessages[chatID] = messages

	// Increment message counter
	counter := groupMessageCounters[chatID]
	counter++
	groupMessageCounters[chatID] = counter

	log.Printf("AutoResponse: Logged message for chat %d (total: %d messages, counter: %d)", chatID, len(messages), counter)

	// Check if we should trigger a response
	if counter >= TriggerMessageCount {
		// Reset counter
		groupMessageCounters[chatID] = 0
		log.Printf("AutoResponse: Triggered response for chat %d, counter reset", chatID)
		return true, nil
	}

	return false, nil
}

// GetLatestMessage returns the latest message from the group's history
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

	// Get the latest message (last in the slice)
	latestMessage := messages[len(messages)-1]
	log.Printf("AutoResponse: Selected latest message for chat %d", chatID)

	return latestMessage, nil
}

// GenerateAutoResponse selects all stored messages and generates a response using the backend
func GenerateAutoResponse(ctx context.Context, chatID int64) (string, error) {
	if !currentConfig.Enabled {
		return "", fmt.Errorf("auto-response feature is disabled")
	}

	// Get all messages from the group for better context
	allMessages, err := GetAllMessages(chatID)
	if err != nil {
		return "", fmt.Errorf("failed to get messages: %w", err)
	}

	// Create the full prompt with the pre-prompt and all messages
	fullPrompt := currentConfig.PrePrompt + "\n\nSon mesajlar:\n" + allMessages

	// Generate response using the backend
	response, err := backend.GetResponse(ctx, fullPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	log.Printf("AutoResponse: Generated response for chat %d using %d messages", chatID, len(groupMessages[chatID]))
	return response, nil
}

// GetAllMessages returns all stored messages for a group formatted for prompt
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

	// Format all messages for the prompt
	var formattedMessages []string
	for i, message := range messages {
		formattedMessages = append(formattedMessages, fmt.Sprintf("%d. %s", i+1, message))
	}

	result := strings.Join(formattedMessages, "\n")
	log.Printf("AutoResponse: Retrieved %d messages for chat %d", len(messages), chatID)

	return result, nil
}

// GetGroupCounter returns the current message counter for a group
func GetGroupCounter(chatID int64) int {
	groupMutex.RLock()
	defer groupMutex.RUnlock()

	return groupMessageCounters[chatID]
}

// GetGroupStats returns statistics about stored messages for a group
func GetGroupStats(chatID int64) (int, int) {
	groupMutex.RLock()
	defer groupMutex.RUnlock()

	messages, exists := groupMessages[chatID]
	if !exists {
		return 0, MaxMessagesPerGroup
	}

	return len(messages), MaxMessagesPerGroup
}

// ClearGroupMessages removes all messages for a specific group
func ClearGroupMessages(chatID int64) {
	groupMutex.Lock()
	defer groupMutex.Unlock()

	delete(groupMessages, chatID)
	delete(groupMessageCounters, chatID)
	log.Printf("AutoResponse: Cleared all messages and counter for chat %d", chatID)
}

// ClearAllMessages removes all stored messages
func ClearAllMessages() {
	groupMutex.Lock()
	defer groupMutex.Unlock()

	groupMessages = make(map[int64][]string)
	groupMessageCounters = make(map[int64]int)
	log.Printf("AutoResponse: Cleared all stored messages and counters")
}

// GetAllGroupStats returns statistics for all groups
func GetAllGroupStats() map[int64]int {
	groupMutex.RLock()
	defer groupMutex.RUnlock()

	stats := make(map[int64]int)
	for chatID, messages := range groupMessages {
		stats[chatID] = len(messages)
	}

	return stats
}
