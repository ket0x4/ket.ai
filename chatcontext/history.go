package chatcontext

import (
	"context"
	"fmt"
	"ket/backend"
	"log"
	"strings"
	"sync"
	"time"
)

// Simplified context implementation
var (
	// chatHistories stores the last N messages for each chat.
	// The string is a formatted line like "username: message" or "bot: message".
	chatHistories = make(map[string][]string)

	// chatSummaries stores the latest summary for each chat.
	chatSummaries = make(map[string]string)

	// messageCounter tracks the number of messages since the last summary.
	messageCounter = make(map[string]int)

	rwMutex  sync.RWMutex
	initOnce sync.Once

	// debouncedSaver for persisting data.
	debouncedSaver *DebouncedSaver
)

const (
	// maxHistorySize is the number of messages to keep in the recent history.
	maxHistorySize = 300
	// summaryTriggerCount is the number of messages after which a summary is created.
	summaryTriggerCount = 1000
)

// Document represents a piece of information in the ChatContext system (for saving/loading)
type Document struct {
	ChatID         int64    `json:"chat_id"`
	UserID         int64    `json:"user_id"`
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
		log.Println("ChatContext: Persisting data...")
		ds.action()
	})
}

// Generates a response using the chat history.
func GetContextResponse(ctx context.Context, prompt string, chatID int64, userID int64, userName string, systemPrompt string) (string, error) {
	if strings.TrimSpace(prompt) == "" {
		return "", nil
	}

	log.Printf("ChatContext: Processing prompt for chat %d, user %s", chatID, userName)

	// Add user's message to history
	userMessage := fmt.Sprintf("- %s:%d:%s", userName, userID, prompt)
	addMessageToHistory(chatID, userID, userMessage)

	// Check if it's time to summarize
	go handleSummarization(ctx, chatID, userID, systemPrompt)

	// Prepare context for the model
	contextStr := prepareContext(chatID, userID)
	finalPrompt := buildCCPrompt(prompt, contextStr)

	// Get response from backend
	response, err := backend.GetResponseWithCC(ctx, prompt, finalPrompt, systemPrompt)
	if err != nil {
		return "", fmt.Errorf("Failed to get response from backend: %w", err)
	}

	// Add bot's response to history
	botMessage := fmt.Sprintf("bot:%s", response)
	addMessageToHistory(chatID, userID, botMessage)

	log.Printf("ChatContext: Processed prompt for chat %d", chatID)
	return cleanMarkdown(response), nil
}

// cleanMarkdown ensures that markdown code blocks are properly closed.
func cleanMarkdown(text string) string {
	if strings.Count(text, "```")%2 != 0 {
		text += "\n```"
	}
	return text
}

// addMessageToHistory adds a new message to the chat's history and trims if necessary.
func addMessageToHistory(chatID int64, userID int64, message string) {
	rwMutex.Lock()
	defer rwMutex.Unlock()

	key := fmt.Sprintf("%d:%d", chatID, userID)
	history := chatHistories[key]
	history = append(history, message)

	// Keep history at the desired size
	if len(history) > maxHistorySize {
		history = history[len(history)-maxHistorySize:]
	}
	chatHistories[key] = history

	// Increment message counter for summarization
	messageCounter[key]++

	// Persist changes
	if debouncedSaver != nil {
		debouncedSaver.Trigger()
	}
}

// handleSummarization checks if a summary is needed and triggers it.
func handleSummarization(ctx context.Context, chatID int64, userID int64, systemPrompt string) {
	rwMutex.RLock()
	key := fmt.Sprintf("%d:%d", chatID, userID)
	count := messageCounter[key]
	rwMutex.RUnlock()

	if count < summaryTriggerCount {
		return
	}

	// Create a snapshot of the history for summarization, excluding bot messages.
	rwMutex.RLock()
	var historyForSummary []string
	history := chatHistories[key]
	for _, msg := range history {
		// Exclude bot messages from the summary context to avoid feedback loops.
		if !strings.HasPrefix(strings.TrimSpace(msg), "bot:") {
			historyForSummary = append(historyForSummary, msg)
		}
	}
	historySnapshot := strings.Join(historyForSummary, "\n")
	rwMutex.RUnlock()

	log.Printf("ChatContext: Triggering summary for chat %d after %d messages.", chatID, count)

	summaryPrompt := fmt.Sprintf(`This is the message history of the group you are in. Summarize it and write down the things you think should be remembered in bullet points. You will need these later. Just write a summary and keep it short.

History:
%s`, historySnapshot)

	// Get summary from the model
	summary, err := backend.GetResponse(ctx, summaryPrompt, systemPrompt)
	if err != nil {
		log.Printf("ChatContext: Failed to create summary for chat %d: %v", chatID, err)
		// Don't reset counter if summarization fails, try again next run.
		return
	}

	rwMutex.Lock()
	chatSummaries[key] = summary
	messageCounter[key] = 0 // Reset counter
	rwMutex.Unlock()

	log.Printf("ChatContext: Successfully created new summary for chat %d.", chatID)
	if debouncedSaver != nil {
		debouncedSaver.Trigger()
	}
}

// prepareContext creates the context string from summary and recent history.
func prepareContext(chatID int64, userID int64) string {
	rwMutex.RLock()
	defer rwMutex.RUnlock()

	key := fmt.Sprintf("%d:%d", chatID, userID)
	summary, hasSummary := chatSummaries[key]
	history := chatHistories[key]

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

// Creates the final prompt for the model.
func buildCCPrompt(userPrompt, context string) string {
	// Instruction for the model
	// to-do: I know it needs better prompt for managing history but atm should be fine. move it to the config later
	instruction := "This is the message history of the group you are in. If the question is related to this, answer using the history, otherwise, you can continue following your system prompt."

	if context == "" {
		return userPrompt // Should not happen if there's history, but as a fallback.
	}

	return fmt.Sprintf(`%s

%s

User Question: %s`, instruction, context, userPrompt)
}

// GetChatHistory returns the conversation history for a chat
func GetChatHistory(chatID int64, userID int64) []string {
	rwMutex.RLock()
	defer rwMutex.RUnlock()

	key := fmt.Sprintf("%d:%d", chatID, userID)
	// Return a copy
	history, exists := chatHistories[key]
	if !exists {
		return []string{}
	}
	historyCopy := make([]string, len(history))
	copy(historyCopy, history)
	return historyCopy
}

// ClearChatHistory removes all data for a specific chat
func ClearChatHistory(chatID int64, userID int64) {
	rwMutex.Lock()
	defer rwMutex.Unlock()

	key := fmt.Sprintf("%d:%d", chatID, userID)
	delete(chatHistories, key)
	delete(chatSummaries, key)
	delete(messageCounter, key)

	log.Printf("ChatContext: Cleared all data for chat %d.", chatID)
	if debouncedSaver != nil {
		debouncedSaver.Trigger()
	}
}

// init initializes the ChatContext system, loading data from storage.
func init() {
	initOnce.Do(func() {
		if data, err := LoadChatHistories(); err == nil {
			for _, doc := range data {
				key := fmt.Sprintf("%d:%d", doc.ChatID, doc.UserID)
				chatHistories[key] = doc.History
				chatSummaries[key] = doc.Summary
				messageCounter[key] = doc.MessageCounter
			}
			log.Printf("ChatContext: Loaded chat data for %d chats", len(data))
		} else {
			log.Printf("ChatContext: Failed to load chat histories: %v. Starting fresh.", err)
		}

		// Initialize the debounced saver.
		debouncedSaver = NewDebouncedSaver(10*time.Second, func() {
			rwMutex.RLock()
			// Create a deep copy to avoid holding the lock during I/O.
			var dataToSave []Document
			for id, history := range chatHistories {
				var chatID, userID int64
				fmt.Sscanf(id, "%d:%d", &chatID, &userID)
				dataToSave = append(dataToSave, Document{
					ChatID:         chatID,
					UserID:         userID,
					History:        history,
					Summary:        chatSummaries[id],
					MessageCounter: messageCounter[id],
				})
			}
			rwMutex.RUnlock()

			if err := SaveChatHistories(dataToSave); err != nil {
				log.Printf("ChatContext: Save failed: %v", err)
			} else {
				log.Println("ChatContext: Chat data successfully persisted.")
			}
		})
	})
}
