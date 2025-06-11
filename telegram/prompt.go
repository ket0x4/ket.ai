package telegram

import (
	"fmt" // Added for fmt.Sprintf
	"ket/permissions"
	"log"
	"strings" // Added for strings.HasPrefix and strings.TrimSpace

	tele "gopkg.in/telebot.v4"
)

// PromptTask holds the necessary information for processing a prompt.
type PromptTask struct {
	ChatID          int64
	Prompt          string
	TargetMessage   *tele.Message
	OriginalContext tele.Context // To use c.Bot().Reply and other context methods
}

// promptQueue is the channel acting as a queue for prompt processing tasks.
// It will be initialized in telegram.go.
var promptQueue chan PromptTask

// MaxQueueSize defines the maximum number of prompts that can be queued.
// It will be used in telegram.go for initializing the queue.
const MaxQueueSize = 4

func HandlePrompt2(c tele.Context) error {
	// Check permissions first
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}

	promptText := ""
	targetMessage := c.Message() // Default to current message

	// Determine the prompt text and the message to reply to
	if c.Message().IsReply() && c.Message().ReplyTo != nil && c.Message().ReplyTo.Text != "" {
		// If replying to a message with text, use that text as the prompt
		promptText = c.Message().ReplyTo.Text
		targetMessage = c.Message().ReplyTo
	} else {
		// Not a reply, or reply is to a message without text.
		// Use the text from the current message, stripping the /ket command.
		rawText := c.Message().Text
		if strings.HasPrefix(rawText, "/ket") {
			trimmedText := strings.TrimSpace(strings.TrimPrefix(rawText, "/ket"))
			// Only use if there's actual text after /ket
			if trimmedText != "" {
				promptText = trimmedText
			}
		} //else if c.Message().Chat.Type == tele.ChatPrivate {
		// In private chats, if not a /ket command, consider the whole message as a prompt.
		// This part might need adjustment based on whether non-command messages should be processed.
		// For now, assuming /ket is the primary trigger.
		// If HandlePrompt2 is only for /ket, this 'else if' might be redundant.
		// Keeping it simple: /ket command is the focus.
		//}
	}

	if promptText == "" {
		return c.Reply("The prompt is empty. Usage: /ket <your prompt> or reply to a message with /ket.")
	}

	task := PromptTask{
		ChatID:          c.Chat().ID,
		Prompt:          promptText,
		TargetMessage:   targetMessage,
		OriginalContext: c,
	}

	// Try to send the task to the queue
	select {
	case promptQueue <- task:
		queueLen := len(promptQueue)
		log.Printf("Prompt from chat ID %d queued. Current queue length: %d/%d.", c.Chat().ID, queueLen, MaxQueueSize)
		// Updated reply to include queue length
		replyMsg := fmt.Sprintf("Your request has been queued <code>(position %d/%d)</code>", queueLen, MaxQueueSize)
		return c.Reply(replyMsg, tele.ModeHTML)
	default: // This case is hit if the promptQueue is full (channel buffer is at capacity)
		log.Printf("Prompt queue full for chat ID %d. Max size: %d.", c.Chat().ID, MaxQueueSize)
		return c.Reply("I'm currently processing a lot of requests, and the queue is full. Please try again in a moment.")
	}
}
