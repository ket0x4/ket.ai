package telegram

import (
	"fmt"
	"ket/config"
	"ket/permissions"
	"log"
	"strings"

	tele "gopkg.in/telebot.v4"
)

// PromptTask holds the necessary information for processing a prompt.
type PromptTask struct {
	ChatID          int64
	Prompt          string
	TargetMessage   *tele.Message
	QueueMessage    *tele.Message // To store the queue message for later deletion
	OriginalContext tele.Context  // To use c.Bot().Reply and other context methods
}

// promptQueue is the channel acting as a queue for prompt processing tasks.
// It will be initialized in telegram.go.
var promptQueue chan *PromptTask

// MaxQueueSize defines the maximum number of prompts that can be queued.
// It will be used in telegram.go for initializing the queue.
var MaxQueueSize = config.GetConfig().BotSetup.MaxQueue

// extractPromptDetails attempts to get the prompt text and the target message.
// It returns the prompt, the message to target for a reply, and an error if the prompt is empty.
func extractPromptDetails(c tele.Context) (promptText string, targetMessage *tele.Message, err error) {
	promptText = ""
	targetMessage = c.Message() // Default to current message

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
		}
		// else if c.Message().Chat.Type == tele.ChatPrivate {
		// // In private chats, if not a /ket command, consider the whole message as a prompt.
		// // This part might need adjustment based on whether non-command messages should be processed.
		// // For now, assuming /ket is the primary trigger.
		// }
	}

	if promptText == "" {
		// Return targetMessage even if prompt is empty, as c.Message() is the default.
		return "", targetMessage, fmt.Errorf("prompt is empty")
	}

	return promptText, targetMessage, nil
}

func HandlePrompt2(c tele.Context) error {
	// Check permissions first
	if !permissions.IsAllowed(c.Chat().ID) {
		log.Printf("Unauthorized access attempt by chat ID: %d", c.Chat().ID)
		return c.Reply("You are not authorized to use this bot.")
	}

	promptText, targetMessage, err := extractPromptDetails(c)
	if err != nil {
		// Log the error for debugging purposes.
		// The error from extractPromptDetails currently only signifies an empty prompt.
		log.Printf("Prompt extraction failed for chat ID %d: %v", c.Chat().ID, err)
		return c.Reply("The prompt is empty. Usage: /ket <your prompt> or reply to a message with /ket.")
	}

	task := &PromptTask{
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
		replyMsg := fmt.Sprintf("Your request has been queued <code>(position %d/%d)</code>", queueLen, MaxQueueSize)
		sentMsg, err := c.Bot().Reply(c.Message(), replyMsg, tele.ModeHTML)
		if err != nil {
			log.Printf("Failed to send queue message: %v", err)
		}
		task.QueueMessage = sentMsg // Store the sent message in the task
	default:
		log.Printf("Queue is full for chat ID %d. Task rejected.", c.Chat().ID)
		return c.Reply("The bot is currently busy. Please try again in a few moments.")
	}

	return nil
}
