package rag

import (
	"context"
	"fmt"
	"ket/backend"
	"log"
	"strings"
	"sync"
	"time"
)

// Simplified RAG implementation
var (
	// chatHistories stores the last N messages for each chat.
	// The string is a formatted line like "username: message" or "bot: message".
	chatHistories = make(map[int64][]string)

	// chatSummaries stores the latest summary for each chat.
	chatSummaries = make(map[int64]string)

	// messageCounter tracks the number of messages since the last summary.
	messageCounter = make(map[int64]int)

	rwMutex  sync.RWMutex
	initOnce sync.Once

	// debouncedSaver for persisting data.
	debouncedSaver *DebouncedSaver
)

const (
	// maxHistorySize is the number of messages to keep in the recent history.
	maxHistorySize = 100
	// summaryTriggerCount is the number of messages after which a summary is created.
	summaryTriggerCount = 200
)

// Document represents a piece of information in the RAG system (for saving/loading)
type Document struct {
	ChatID         int64    `json:"chat_id"`
	History        []string `json:"history"`
	Summary        string   `json:"summary"`
	MessageCounter int      `json:"message_counter"`
}

// DebouncedSaver handles saving chat histories to disk with a debounce mechanism.
type DebouncedSaver struct {
	mu     sync.Mutex
	timer  *time.Timer
	wait   time.Duration
	action func()
}

// NewDebouncedSaver creates a new debounced saver.
func NewDebouncedSaver(wait time.Duration, action func()) *DebouncedSaver {
	return &DebouncedSaver{
		wait:   wait,
		action: action,
	}
}

// Trigger starts or resets the debounce timer.
func (ds *DebouncedSaver) Trigger() {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	if ds.timer != nil {
		ds.timer.Stop()
	}

	ds.timer = time.AfterFunc(ds.wait, func() {
		log.Println("RAG: Debouncer triggered, persisting data...")
		ds.action()
	})
}

// GetRagResponse generates a response using the simplified RAG model.
func GetRagResponse(ctx context.Context, prompt string, chatID int64, userID int64, userName string) (string, error) {
	if strings.TrimSpace(prompt) == "" {
		return "", fmt.Errorf("prompt cannot be empty")
	}

	log.Printf("RAG: Processing prompt for chat %d, user %s", chatID, userName)

	// Add user's message to history
	userMessage := fmt.Sprintf("    - %s: %s", userName, prompt)
	addMessageToHistory(chatID, userMessage)

	// Check if it's time to summarize
	go handleSummarization(ctx, chatID)

	// Prepare context for the model
	contextStr := prepareContext(chatID)
	finalPrompt := buildRAGPrompt(prompt, contextStr)

	// Get response from backend
	response, err := backend.GetResponseWithRAG(ctx, prompt, finalPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to get response: %w", err)
	}

	// Add bot's response to history
	botMessage := fmt.Sprintf("        *bot: %s", response)
	addMessageToHistory(chatID, botMessage)

	log.Printf("RAG: Successfully processed prompt for chat %d", chatID)
	return response, nil
}

// addMessageToHistory adds a new message to the chat's history and trims if necessary.
func addMessageToHistory(chatID int64, message string) {
	rwMutex.Lock()
	defer rwMutex.Unlock()

	history := chatHistories[chatID]
	history = append(history, message)

	// Keep history at the desired size
	if len(history) > maxHistorySize {
		history = history[len(history)-maxHistorySize:]
	}
	chatHistories[chatID] = history

	// Increment message counter for summarization
	messageCounter[chatID]++

	// Persist changes
	if debouncedSaver != nil {
		debouncedSaver.Trigger()
	}
}

// handleSummarization checks if a summary is needed and triggers it.
func handleSummarization(ctx context.Context, chatID int64) {
	rwMutex.RLock()
	count := messageCounter[chatID]
	// Create a snapshot of the history for summarization
	var historySnapshot string
	if count >= summaryTriggerCount {
		history := chatHistories[chatID]
		historySnapshot = strings.Join(history, "\n")
	}
	rwMutex.RUnlock()

	if count >= summaryTriggerCount {
		log.Printf("RAG: Triggering summary for chat %d after %d messages.", chatID, count)

		summaryPrompt := fmt.Sprintf(`This is the message history of the group you are in. Summarize it and write down the things you think should be remembered in bullet points. You will need these later. Just write a summary and keep it short.

History:
%s`, historySnapshot)

		// Get summary from the model
		summary, err := backend.GetResponse(ctx, summaryPrompt)
		if err != nil {
			log.Printf("RAG: Failed to create summary for chat %d: %v", chatID, err)
			// Don't reset counter if summarization fails, try again later.
			return
		}

		rwMutex.Lock()
		chatSummaries[chatID] = summary
		messageCounter[chatID] = 0 // Reset counter
		rwMutex.Unlock()

		log.Printf("RAG: Successfully created new summary for chat %d.", chatID)
		if debouncedSaver != nil {
			debouncedSaver.Trigger()
		}
	}
}

// prepareContext creates the context string from summary and recent history.
func prepareContext(chatID int64) string {
	rwMutex.RLock()
	defer rwMutex.RUnlock()

	summary, hasSummary := chatSummaries[chatID]
	history := chatHistories[chatID]

	var contextBuilder strings.Builder

	if hasSummary && summary != "" {
		contextBuilder.WriteString(fmt.Sprintf(`Here is the general summary for this group:
%s

`, summary))
	}

	if len(history) > 0 {
contextBuilder.WriteString(fmt.Sprintf("and here are the last %d messages for this group:\n", len(history)))
contextBuilder.WriteString(strings.Join(history, "\n"))
	}

	return strings.TrimSpace(contextBuilder.String())
}

// buildRAGPrompt creates the final prompt for the model.
func buildRAGPrompt(userPrompt, context string) string {
	// Instruction for the model
	instruction := "This is the message history of the group you are in. If the question is related to this, answer using the history, otherwise, you can continue normally. Act naturally."

	if context == "" {
		return userPrompt // Should not happen if there's history, but as a fallback.
	}

	return fmt.Sprintf(`%s

%s

User Question: %s`, instruction, context, userPrompt)
}

// GetChatHistory returns the conversation history for a chat
func GetChatHistory(chatID int64) []string {
	rwMutex.RLock()
	defer rwMutex.RUnlock()

	// Return a copy
	history, exists := chatHistories[chatID]
	if !exists {
		return []string{}
	}
	historyCopy := make([]string, len(history))
	copy(historyCopy, history)
	return historyCopy
}

// ClearChatHistory removes all data for a specific chat
func ClearChatHistory(chatID int64) {
	rwMutex.Lock()
	defer rwMutex.Unlock()

	delete(chatHistories, chatID)
	delete(chatSummaries, chatID)
	delete(messageCounter, chatID)

	log.Printf("RAG: Cleared all data for chat %d.", chatID)
	if debouncedSaver != nil {
		debouncedSaver.Trigger()
	}
}

// init initializes the RAG system, loading data from storage.
func init() {
	initOnce.Do(func() {
		if data, err := LoadChatHistories(); err == nil {
			for _, doc := range data {
				chatHistories[doc.ChatID] = doc.History
				chatSummaries[doc.ChatID] = doc.Summary
				messageCounter[doc.ChatID] = doc.MessageCounter
			}
			log.Printf("RAG: Loaded chat data for %d chats", len(data))
		} else {
			log.Printf("RAG: Failed to load chat histories: %v. Starting fresh.", err)
		}

		// Initialize the debounced saver.
		debouncedSaver = NewDebouncedSaver(10*time.Second, func() {
			rwMutex.RLock()
			// Create a deep copy to avoid holding the lock during I/O.
			var dataToSave []Document
			for id := range chatHistories {
				dataToSave = append(dataToSave, Document{
					ChatID:         id,
					History:        chatHistories[id],
					Summary:        chatSummaries[id],
					MessageCounter: messageCounter[id],
				})
			}
			rwMutex.RUnlock()

			if err := SaveChatHistories(dataToSave); err != nil {
				log.Printf("RAG: Debounced save failed: %v", err)
			} else {
				log.Println("RAG: Chat data successfully persisted via debouncer.")
			}
		})
	})
}
