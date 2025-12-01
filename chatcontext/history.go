package chatcontext

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"log"
	"strings"
	"sync"
	"time"
)

type Service struct {
	backendService *backend.Service

	// chatHistories stores the last N messages for each chat.
	chatHistories map[int64][]string

	// chatSummaries stores the latest summary for each chat.
	chatSummaries map[int64]string

	// messageCounter tracks the number of messages since the last summary.
	messageCounter map[int64]int

	rwMutex sync.RWMutex

	// debouncedSaver for persisting data.
	debouncedSaver *DebouncedSaver
}

func NewService(backendService *backend.Service) *Service {
	s := &Service{
		backendService: backendService,
		chatHistories:  make(map[int64][]string),
		chatSummaries:  make(map[int64]string),
		messageCounter: make(map[int64]int),
	}

	s.init()
	return s
}

// Document represents a piece of information in the ChatContext system (for saving/loading)
type Document struct {
	ChatID         int64    `json:"chat_id"`
	UserID         int64    `json:"user_id"` // Keep UserID for potential migration or context, but history will be keyed by ChatID
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
func (s *Service) GetContextResponse(ctx context.Context, prompt string, chatID int64, userID int64, userName string, systemPrompt string) (string, error) {
	if strings.TrimSpace(prompt) == "" {
		return "", nil
	}

	log.Printf("ChatContext: Processing prompt for chat %d, user %s", chatID, userName)

	// Add user's message to history
	userMessage := fmt.Sprintf("- %s:%d:%s", userName, userID, prompt)
	s.addMessageToHistory(chatID, userID, userMessage)

	// Check if it's time to summarize
	go s.handleSummarization(ctx, chatID, userID, systemPrompt)

	// Prepare context for the model
	contextStr := s.prepareContext(chatID, userID)
	finalPrompt := buildCCPrompt(prompt, contextStr)

	// Get response from backend
	response, err := s.backendService.GetResponseWithCC(ctx, prompt, finalPrompt, systemPrompt)
	if err != nil {
		return "", fmt.Errorf("Failed to get response from backend: %w", err)
	}

	// Add bot's response to history
	botMessage := fmt.Sprintf("bot:%s", response)
	s.addMessageToHistory(chatID, userID, botMessage)

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
func (s *Service) addMessageToHistory(chatID int64, userID int64, message string) {
	s.rwMutex.Lock()
	defer s.rwMutex.Unlock()

	history := s.chatHistories[chatID]
	history = append(history, message)

	// Keep history at the desired size
	if len(history) > config.GetConfig().HistorySetup.MaxHistorySize {
		history = history[len(history)-config.GetConfig().HistorySetup.MaxHistorySize:]
	}
	s.chatHistories[chatID] = history

	// Increment message counter for summarization
	s.messageCounter[chatID]++

	// Persist changes
	if s.debouncedSaver != nil {
		s.debouncedSaver.Trigger()
	}
}

// handleSummarization checks if a summary is needed and triggers it.
func (s *Service) handleSummarization(ctx context.Context, chatID int64, userID int64, systemPrompt string) {
	s.rwMutex.RLock()
	count := s.messageCounter[chatID]
	s.rwMutex.RUnlock()

	if count < config.GetConfig().HistorySetup.SummaryTriggerCount {
		return
	}

	// Create a snapshot of the history for summarization, excluding bot messages.
	s.rwMutex.RLock()
	var historyForSummary []string
	history := s.chatHistories[chatID]
	for _, msg := range history {
		// Exclude bot messages from the summary context to avoid feedback loops.
		if !strings.HasPrefix(strings.TrimSpace(msg), "bot:") {
			historyForSummary = append(historyForSummary, msg)
		}
	}
	historySnapshot := strings.Join(historyForSummary, "\n")
	s.rwMutex.RUnlock()

	log.Printf("ChatContext: Triggering summary for chat %d after %d messages.", chatID, count)

	summaryPrompt := fmt.Sprintf(`This is the message history of the group you are in. Summarize it and write down the things you think should be remembered in bullet points. You will need these later. Just write a summary and keep it short.\n\nHistory:\n%s`, historySnapshot)

	// Get summary from the model
	summary, err := s.backendService.GetResponse(ctx, summaryPrompt, systemPrompt)
	if err != nil {
		log.Printf("ChatContext: Failed to create summary for chat %d: %v", chatID, err)
		// Don't reset counter if summarization fails, try again next run.
		return
	}

	s.rwMutex.Lock()
	s.chatSummaries[chatID] = summary
	s.messageCounter[chatID] = 0 // Reset counter
	s.rwMutex.Unlock()

	log.Printf("ChatContext: Successfully created new summary for chat %d.", chatID)
	if s.debouncedSaver != nil {
		s.debouncedSaver.Trigger()
	}
}

// prepareContext creates the context string from summary and recent history.
func (s *Service) prepareContext(chatID int64, userID int64) string {
	s.rwMutex.RLock()
	defer s.rwMutex.RUnlock()

	summary, hasSummary := s.chatSummaries[chatID]
	history := s.chatHistories[chatID]

	var contextBuilder strings.Builder

	if hasSummary && summary != "" {
		contextBuilder.WriteString(fmt.Sprintf(`Here is the general summary for this group:\n%s\n\n`, summary))
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
func (s *Service) GetChatHistory(chatID int64, userID int64) []string {
	s.rwMutex.RLock()
	defer s.rwMutex.RUnlock()

	// Return a copy
	history, exists := s.chatHistories[chatID]
	if !exists {
		return []string{}
	}
	historyCopy := make([]string, len(history))
	copy(historyCopy, history)
	return historyCopy
}

// ClearChatHistory removes all data for a specific chat
func (s *Service) ClearChatHistory(chatID int64, userID int64) {
	s.rwMutex.Lock()
	defer s.rwMutex.Unlock()

	delete(s.chatHistories, chatID)
	delete(s.chatSummaries, chatID)
	delete(s.messageCounter, chatID)

	log.Printf("ChatContext: Cleared all data for chat %d.", chatID)
	if s.debouncedSaver != nil {
		s.debouncedSaver.Trigger()
	}
}

// Close should be called on shutdown to persist any pending changes.
func (s *Service) Close() {
	log.Println("ChatContext: Closing and persisting data...")
	if s.debouncedSaver != nil {
		// To prevent a race condition, we stop the timer and save directly.
		s.debouncedSaver.mu.Lock()
		if s.debouncedSaver.timer != nil {
			s.debouncedSaver.timer.Stop()
		}
		s.debouncedSaver.mu.Unlock()

		// Perform a final save.
		s.save()
	}
}

// init initializes the ChatContext system, loading data from storage.
func (s *Service) init() {
	if data, err := loadChatHistories(); err == nil {
		for _, doc := range data {
			// Assuming ChatID is the unique key for group history now.
			// For old data with multiple userIDs for the same ChatID, this will overwrite
			// history, effectively taking the last user's history for that chat.
			// A more robust migration would merge histories or pick one strategically.
			s.chatHistories[doc.ChatID] = doc.History
			s.chatSummaries[doc.ChatID] = doc.Summary
			s.messageCounter[doc.ChatID] = doc.MessageCounter
		}
		log.Printf("ChatContext: Loaded chat data for %d chats", len(data))
	} else {
		log.Printf("ChatContext: Failed to load chat histories: %v. Starting fresh.", err)
	}

	// Initialize the debounced saver.
	s.debouncedSaver = NewDebouncedSaver(10*time.Second, s.save)
}

func (s *Service) save() {
	s.rwMutex.RLock()
	// Create a deep copy to avoid holding the lock during I/O.
	var dataToSave []Document
	for chatID, history := range s.chatHistories {
		dataToSave = append(dataToSave, Document{
			ChatID:         chatID,
			UserID:         0, // UserID is no longer used for keying, set to 0 for persistence
			History:        history,
			Summary:        s.chatSummaries[chatID],
			MessageCounter: s.messageCounter[chatID],
		})
	}
	s.rwMutex.RUnlock()

	if err := saveChatHistories(dataToSave); err != nil {
		log.Printf("ChatContext: Save failed: %v", err)
	} else {
		log.Println("ChatContext: Chat data successfully persisted.")
	}
}
