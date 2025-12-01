package chatcontext

import (
	"context"
	"database/sql"
	"fmt"
	"ket/backend"
	"ket/config"
	"log"
	"strings"
)

type Service struct {
	backendService *backend.Service
	db             *sql.DB
}

func NewService(backendService *backend.Service) *Service {
	s := &Service{
		backendService: backendService,
	}

	s.init()
	return s
}

// Document represents a piece of information in the ChatContext system (for saving/loading)
// Kept for potential future use or migration, though not strictly needed with SQLite direct access
type Document struct {
	ChatID         int64    `json:"chat_id"`
	UserID         int64    `json:"user_id"`
	History        []string `json:"history"`
	Summary        string   `json:"summary"`
	MessageCounter int      `json:"message_counter"`
}

// Generates a response using the chat history.
func (s *Service) GetContextResponse(ctx context.Context, prompt string, chatID int64, userID int64, userName string, systemPrompt string) (string, error) {
	if strings.TrimSpace(prompt) == "" {
		return "", nil
	}

	log.Printf("ChatContext: Processing prompt for chat %d, user %s", chatID, userName)

	// Add user's message to history
	if err := s.addMessageToHistory(chatID, userID, "user", userName, prompt); err != nil {
		log.Printf("ChatContext: Failed to add user message: %v", err)
	}

	// Check if it's time to summarize
	go s.handleSummarization(ctx, chatID, systemPrompt)

	// Prepare context for the model
	contextStr, err := s.prepareContext(chatID)
	if err != nil {
		log.Printf("ChatContext: Failed to prepare context: %v", err)
		// Continue without context if it fails
	}
	finalPrompt := buildCCPrompt(prompt, contextStr)

	// Get response from backend
	response, err := s.backendService.GetResponseWithCC(ctx, prompt, finalPrompt, systemPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to get response from backend: %w", err)
	}

	// Add bot's response to history
	if err := s.addMessageToHistory(chatID, userID, "assistant", config.BotName, response); err != nil {
		log.Printf("ChatContext: Failed to add bot message: %v", err)
	}

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

// addMessageToHistory adds a new message to the chat's history.
func (s *Service) addMessageToHistory(chatID int64, userID int64, role, name, content string) error {
	return AddMessage(s.db, chatID, userID, role, name, content)
}

// handleSummarization checks if a summary is needed and triggers it.
func (s *Service) handleSummarization(ctx context.Context, chatID int64, systemPrompt string) {
	_, count, err := GetChatMetadata(s.db, chatID)
	if err != nil {
		log.Printf("ChatContext: Failed to get metadata for summarization: %v", err)
		return
	}

	if count < config.GetConfig().HistorySetup.SummaryTriggerCount {
		return
	}

	// Get recent history for summarization
	history, err := GetRecentMessages(s.db, chatID, config.GetConfig().HistorySetup.MaxHistorySize)
	if err != nil {
		log.Printf("ChatContext: Failed to get history for summarization: %v", err)
		return
	}

	var historyForSummary []string
	for _, msg := range history {
		// Exclude bot messages from the summary context to avoid feedback loops.
		if msg.Role != "assistant" {
			historyForSummary = append(historyForSummary, fmt.Sprintf("%s: %s", msg.Name, msg.Content))
		}
	}
	historySnapshot := strings.Join(historyForSummary, "\n")

	log.Printf("ChatContext: Triggering summary for chat %d after %d messages.", chatID, count)

	summaryPrompt := fmt.Sprintf(`This is the message history of the group you are in. Summarize it and write down the things you think should be remembered in bullet points. You will need these later. Just write a summary and keep it short.\n\nHistory:\n%s`, historySnapshot)

	// Get summary from the model
	summary, err := s.backendService.GetResponse(ctx, summaryPrompt, systemPrompt)
	if err != nil {
		log.Printf("ChatContext: Failed to create summary for chat %d: %v", chatID, err)
		return
	}

	if err := UpdateSummary(s.db, chatID, summary); err != nil {
		log.Printf("ChatContext: Failed to update summary: %v", err)
	} else {
		log.Printf("ChatContext: Successfully created new summary for chat %d.", chatID)
	}
}

// prepareContext creates the context string from summary and recent history.
func (s *Service) prepareContext(chatID int64) (string, error) {
	summary, _, err := GetChatMetadata(s.db, chatID)
	if err != nil {
		return "", err
	}

	history, err := GetRecentMessages(s.db, chatID, config.GetConfig().HistorySetup.MaxHistorySize)
	if err != nil {
		return "", err
	}

	var contextBuilder strings.Builder

	if summary != "" {
		contextBuilder.WriteString(fmt.Sprintf(`Here is the general summary for this group:\n%s\n\n`, summary))
	}

	if len(history) > 0 {
		contextBuilder.WriteString(fmt.Sprintf("and here are the last %d messages for this group:\n", len(history)))
		for _, msg := range history {
			// Format: "Name: Content"
			// This is more token efficient than JSON or verbose formats
			contextBuilder.WriteString(fmt.Sprintf("%s: %s\n", msg.Name, msg.Content))
		}
	}

	return strings.TrimSpace(contextBuilder.String()), nil
}

// Creates the final prompt for the model.
func buildCCPrompt(userPrompt, context string) string {
	// Instruction for the model
	instruction := "This is the message history of the group you are in. If the question is related to this, answer using the history, otherwise, you can continue following your system prompt."

	if context == "" {
		return userPrompt
	}

	return fmt.Sprintf(`%s

%s

User Question: %s`, instruction, context, userPrompt)
}

// GetChatHistory returns the conversation history for a chat
func (s *Service) GetChatHistory(chatID int64) []string {
	history, err := GetRecentMessages(s.db, chatID, config.GetConfig().HistorySetup.MaxHistorySize)
	if err != nil {
		log.Printf("ChatContext: Failed to get chat history: %v", err)
		return []string{}
	}

	// Convert to string slice for backward compatibility if needed by other parts of the app
	// or just return formatted strings
	var formattedHistory []string
	for _, msg := range history {
		formattedHistory = append(formattedHistory, fmt.Sprintf("%s: %s", msg.Name, msg.Content))
	}
	return formattedHistory
}

// ClearChatHistory removes all data for a specific chat
func (s *Service) ClearChatHistory(chatID int64) {
	if err := ClearHistory(s.db, chatID); err != nil {
		log.Printf("ChatContext: Failed to clear history: %v", err)
	} else {
		log.Printf("ChatContext: Cleared all data for chat %d.", chatID)
	}
}

// Close should be called on shutdown to persist any pending changes.
func (s *Service) Close() {
	CloseDB(s.db)
}

// init initializes the ChatContext system, loading data from storage.
func (s *Service) init() {
	var err error
	s.db, err = InitDB()
	if err != nil {
		log.Fatalf("ChatContext: Failed to initialize database: %v", err)
	}
	log.Println("ChatContext: Database initialized.")
}
