package telegram

import (
	"fmt"
	"ket/permissions"
	"ket/rag"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// HandleRAGHistory shows recent chat history
func HandleRAGHistory(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

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
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

	rag.ClearChatHistory(c.Chat().ID)

	return c.Reply("RAG History cleaned for this chat.")
}
