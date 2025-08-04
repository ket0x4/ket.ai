package handlers

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"ket/rag"
	"log"
	"strings"

	tele "gopkg.in/telebot.v4"
)

type PromptTask struct {
	ChatID          int64
	UserID          int64
	Prompt          string
	TargetMessage   *tele.Message
	QueueMessage    *tele.Message
	OriginalContext tele.Context
}

var promptQueue chan *PromptTask

func InitPromptQueue(maxQueueSize int) {
	promptQueue = make(chan *PromptTask, maxQueueSize)
}

func extractPromptDetails(c tele.Context) (promptText string, targetMessage *tele.Message, err error) {
	promptText = ""
	targetMessage = c.Message()

	if c.Message().IsReply() && c.Message().ReplyTo != nil && c.Message().ReplyTo.Text != "" {
		promptText = c.Message().ReplyTo.Text
		targetMessage = c.Message().ReplyTo
	} else {
		rawText := c.Message().Text
		cmdVariants := []string{config.GetConfig().GenCommand, "/" + config.GetConfig().GenCommand}
		for _, cmd := range cmdVariants {
			if strings.HasPrefix(rawText, cmd) {
				trimmedText := strings.TrimSpace(strings.TrimPrefix(rawText, cmd))
				if trimmedText != "" {
					promptText = trimmedText
					break
				}
			}
		}
	}

	if promptText == "" {
		return "", targetMessage, fmt.Errorf("prompt is empty")
	}

	return promptText, targetMessage, nil
}

func HandlePrompt(c tele.Context) error {
	promptText, targetMessage, err := extractPromptDetails(c)
	if err != nil {
		log.Printf("Prompt extraction failed for chat ID %d: %v", c.Chat().ID, err)
		return c.Reply(fmt.Sprintf("The prompt is empty. Usage: /%s <your prompt> or reply to a message with /%s.", config.GetConfig().GenCommand, config.GetConfig().GenCommand))
	}

	task := &PromptTask{
		ChatID:          c.Chat().ID,
		UserID:          c.Sender().ID,
		Prompt:          promptText,
		TargetMessage:   targetMessage,
		OriginalContext: c,
	}

	select {
	case promptQueue <- task:
		queueLen := len(promptQueue)
		replyMsg := fmt.Sprintf("Your request has been queued <code>(position %d/%d)</code>", queueLen, config.GetConfig().BotSetup.MaxQueue)
		sentMsg, err := c.Bot().Reply(c.Message(), replyMsg, tele.ModeHTML)
		if err == nil {
			task.QueueMessage = sentMsg
		}
	default:
		return c.Reply("The bot is currently busy. Please try again in a few moments.")
	}

	return nil
}

func StartPromptWorker(systemPrompt string, bot *tele.Bot) {
	go func() {
		for task := range promptQueue {
			processPrompt(task, systemPrompt, bot)
		}
	}()
	log.Println("Prompt processing worker started.")
}

func processPrompt(task *PromptTask, systemPrompt string, bot *tele.Bot) {
	log.Printf("Processing prompt for chat ID %d from queue.", task.ChatID)

	// Ensure queue message is deleted even if processing fails
	defer func() {
		if task.QueueMessage != nil {
			err := bot.Delete(task.QueueMessage)
			if err != nil {
				log.Printf("Failed to delete queue message %d in chat %d: %v", task.QueueMessage.ID, task.ChatID, err)
			}
		}
	}()

	response, err := rag.GetRagResponse(context.Background(), task.Prompt, task.ChatID, task.UserID, task.OriginalContext.Sender().Username, systemPrompt)
	if err != nil {
		log.Printf("Error getting RAG response for chat ID %d: %v", task.ChatID, err)
		// Fallback to standard generation
		response, err = backend.GetResponse(context.Background(), task.Prompt, systemPrompt)
		if err != nil {
			sendError(task.OriginalContext, "Error processing your request", err)
			return
		}
	}

	log.Printf("User: %d, Prompt: %s.", task.ChatID, task.Prompt)

	_, sendErr := bot.Reply(task.TargetMessage, response)
	if sendErr != nil {
		log.Printf("Error sending markdown response to chat ID %d: %v. Retrying as plain text.", task.ChatID, sendErr)
		_, sendErr = bot.Reply(task.TargetMessage, response, &tele.SendOptions{})
		if sendErr != nil {
			log.Printf("Error sending plain text response to chat ID %d: %v", task.ChatID, sendErr)
			sendError(task.OriginalContext, "Failed to send response.", sendErr)
			return
		}
	}
	log.Printf("Successfully sent response to chat ID %d.", task.ChatID)
}
