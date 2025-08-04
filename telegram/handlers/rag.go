package handlers

import (
	"fmt"
	"ket/rag"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// HandleRAGHistory shows recent chat history
func HandleRAGHistory(c tele.Context) error {
	history := rag.GetChatHistory(c.Chat().ID)

	if len(history) == 0 {
		return c.Reply("There is no chat history available for this chat.")
	}

	var message strings.Builder
	message.WriteString(fmt.Sprintf("*Last %d RAG Entries*\n\n", len(history)))

	// Trim history to the last 15 entries for display
	if len(history) > 15 {
		history = history[len(history)-15:]
	}

	message.WriteString("```\n")
	message.WriteString(strings.Join(history, "\n"))
	message.WriteString("\n```")

	return c.Reply(message.String(), tele.ModeMarkdown)
}

// HandleRAGClear clears chat history for current chat
func HandleRAGClear(c tele.Context) error {
	rag.ClearChatHistory(c.Chat().ID)

	return c.Reply("RAG History cleaned for this chat.")
}

