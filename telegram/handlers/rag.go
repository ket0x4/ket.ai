package handlers

import (
	"fmt"
	"ket/chatcontext"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// HandleRAGHistory shows recent chat history
func HandleRAGHistory(c tele.Context, ccService *chatcontext.Service) error {
	history := ccService.GetChatHistory(c.Chat().ID, c.Sender().ID)

	if len(history) == 0 {
		return c.Reply("There is no chat history available for this chat.")
	}

	var message strings.Builder
	message.WriteString(fmt.Sprintf("*Last %d RAG Entries*\n\n", len(history)))

	// Trim history to the last 15 entries for display
	if len(history) > 15 {
		history = history[len(history)-15:]
	}

	var sanitizedHistory []string
	for _, entry := range history {
		sanitizedHistory = append(sanitizedHistory, strings.ReplaceAll(entry, "```", "´´´"))
	}

	message.WriteString("```\n")
	message.WriteString(strings.Join(sanitizedHistory, "\n"))
	message.WriteString("\n```")

	msg := message.String()
	if len(msg) > 4000 {
		msg = msg[:4000] + "...\n```"
	}

	err := c.Reply(msg, tele.ModeMarkdown)
	if err != nil {
		return c.Reply(msg)
	}
	return nil
}

// HandleRAGClear clears chat history for current chat
func HandleRAGClear(c tele.Context, ccService *chatcontext.Service) error {
	ccService.ClearChatHistory(c.Chat().ID, c.Sender().ID)
	return c.Reply("✓ Message history cleaned for this chat.")
}
