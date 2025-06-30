package telegram

import (
	"context"
	"fmt"
	"ket/permissions"
	"ket/rag"
	"log"
	"strconv"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// HandleRAGStats shows RAG system statistics
func HandleRAGStats(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

	stats := rag.GetStats()
	
	message := fmt.Sprintf(`📊 *RAG System Statistics*

📃 Total Documents: %d
💬 Chats with History: %d
▶️ Tracked Chats: %d

The RAG system uses your chat history to generate more relevant responses.`,
		stats["total_documents"],
		stats["chats_with_history"],
		stats["total_chats_tracked"])

	return c.Reply(message, tele.ModeMarkdown)
}

// HandleRAGHistory shows recent chat history
func HandleRAGHistory(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

	args := strings.Fields(c.Message().Text)
	limit := 10 // Default limit
	
	if len(args) > 1 {
		if parsedLimit, err := strconv.Atoi(args[1]); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}

	history := rag.GetChatHistory(c.Chat().ID, limit)
	
	if len(history) == 0 {
		return c.Reply("Bu sohbet için henüz geçmiş bulunmuyor.")
	}

	var message strings.Builder
	message.WriteString(fmt.Sprintf("📚 *Son %d RAG Girişi*\n\n", len(history)))
	
	for i, doc := range history {
		timestamp := doc.Timestamp.Format("02.01 15:04")
		docType := "💬"
		if doc.Type == "context" {
			docType = "📝"
		} else if doc.UserID == 0 {
			docType = "🤖"
		}
		
		content := doc.Content
		if len(content) > 100 {
			content = content[:97] + "..."
		}
		
		message.WriteString(fmt.Sprintf("%s *[%d]* (%s)\n%s\n\n", docType, i+1, timestamp, content))
	}

	return c.Reply(message.String(), tele.ModeMarkdown)
}

// HandleRAGClear clears chat history for current chat
func HandleRAGClear(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

	err := rag.ClearChatHistory(c.Chat().ID)
	if err != nil {
		log.Printf("Error clearing RAG history for chat %d: %v", c.Chat().ID, err)
		return c.Reply("Geçmiş temizlenirken hata oluştu.")
	}

	return c.Reply("✅ Bu sohbet için RAG geçmişi temizlendi.")
}

// HandleRAGContext adds important context to RAG
func HandleRAGContext(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

	// Extract context from command
	text := c.Message().Text
	if !strings.HasPrefix(text, "/ragcontext") {
		return c.Reply("Kullanım: /ragcontext <önemli bilgi>")
	}

	contextStr := strings.TrimSpace(strings.TrimPrefix(text, "/ragcontext"))
	if contextStr == "" {
		return c.Reply("Lütfen eklemek istediğiniz bağlam bilgisini yazın.")
	}

	metadata := map[string]interface{}{
		"added_by": c.Sender().ID,
		"type":     "user_context",
	}

	err := rag.AddContextDocument(context.Background(), c.Chat().ID, contextStr, metadata)
	if err != nil {
		log.Printf("Error adding context to RAG for chat %d: %v", c.Chat().ID, err)
		return c.Reply("Bağlam bilgisi eklenirken hata oluştu.")
	}

	return c.Reply("✅ Bağlam bilgisi RAG sistemine eklendi.")
}

// HandleRAGSummary creates a conversation summary
func HandleRAGSummary(c tele.Context) error {
	if !permissions.IsAllowed(c.Chat().ID) {
		return c.Reply("You are not authorized to use this bot.")
	}

	args := strings.Fields(c.Message().Text)
	hours := 24 // Default to last 24 hours
	
	if len(args) > 1 {
		if parsedHours, err := strconv.Atoi(args[1]); err == nil && parsedHours > 0 && parsedHours <= 168 {
			hours = parsedHours
		}
	}

	err := rag.CreateConversationSummary(c.Chat().ID, hours)
	if err != nil {
		log.Printf("Error creating conversation summary for chat %d: %v", c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("Özet oluşturulurken hata: %v", err))
	}

	return c.Reply(fmt.Sprintf("✅ Son %d saatin konuşma özeti RAG sistemine eklendi.", hours))
}

// HandleRAGCleanup cleans old documents (admin only)
func HandleRAGCleanup(c tele.Context) error {
	if !permissions.IsAdmin(c.Sender().ID) {
		return c.Reply("You are not authorized to use this command.")
	}

	args := strings.Fields(c.Message().Text)
	days := 30 // Default to 30 days
	
	if len(args) > 1 {
		if parsedDays, err := strconv.Atoi(args[1]); err == nil && parsedDays > 0 && parsedDays <= 365 {
			days = parsedDays
		}
	}

	err := rag.CleanupOldDocuments(days)
	if err != nil {
		log.Printf("Error cleaning up RAG documents: %v", err)
		return c.Reply("Temizlik sırasında hata oluştu.")
	}

	return c.Reply(fmt.Sprintf("✅ %d günden eski dokümanlar temizlendi.", days))
}
