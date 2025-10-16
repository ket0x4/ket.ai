package handlers

import (
	"context"
	"fmt"
	"ket/backend"
	"ket/config"
	"ket/rag"
	"ket/random"
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

var PromptQueue chan *PromptTask

func InitPromptQueue(maxQueueSize int) {
	PromptQueue = make(chan *PromptTask, maxQueueSize)
}

func extractPromptDetails(c tele.Context) (promptText string, targetMessage *tele.Message, isPrompt bool) {
	promptText = ""
	targetMessage = c.Message()
	isPrompt = false

	if c.Message().IsReply() && c.Message().ReplyTo != nil {
		if c.Message().ReplyTo.Sender.IsBot {
			promptText = c.Message().Text
			targetMessage = c.Message()
			isPrompt = true
		}
	} else {
		rawText := c.Message().Text
		genCommand := "/" + config.GenCommand
		if strings.HasPrefix(rawText, genCommand) {
			trimmedText := strings.TrimSpace(strings.TrimPrefix(rawText, genCommand))
			if trimmedText != "" {
				promptText = trimmedText
				isPrompt = true
			}
		}
	}

	return promptText, targetMessage, isPrompt
}

func HandlePrompt(c tele.Context) error {
	promptText, targetMessage, isPrompt := extractPromptDetails(c)

	if !isPrompt {
		ok, err := random.LogMessage(c.Chat().ID, c.Sender().Username, c.Sender().ID, c.Message().Text)
		if err != nil {
			log.Printf("AutoResponse logMessage error: %v", err)
		}
		if ok {
			log.Printf("Triggered AutoResponse for chat %d", c.Chat().ID)
			response, err := random.GenerateAutoResponse(context.Background(), c.Chat().ID)
			if err != nil {
				log.Printf(" GenerateAutoResponse error: %v", err)
				return nil
			}
			_, sendErr := c.Bot().Send(c.Chat(), response)
			if sendErr != nil {
				log.Printf("AutoResponse Send error: %v", sendErr)
			}
		}
		return nil
	}

	task := &PromptTask{
		ChatID:          c.Chat().ID,
		UserID:          c.Sender().ID,
		Prompt:          promptText,
		TargetMessage:   targetMessage,
		OriginalContext: c,
	}

	select {
	case PromptQueue <- task:
		queueLen := len(PromptQueue)
		replyMsg := fmt.Sprintf("Queued <code>(position %d/%d)</code>", queueLen, config.GetConfig().BotSetup.MaxQueue)
		sentMsg, err := c.Bot().Reply(c.Message(), replyMsg, tele.ModeHTML)
		if err == nil {
			task.QueueMessage = sentMsg
		}
	default:
		return c.Reply("Dave is currently busy.")
	}
	return nil
}

func StartPromptWorker(systemPrompt string, bot *tele.Bot) {
	go func() {
		for task := range PromptQueue {
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
		}
	}
	log.Printf("Successfully sent response to chat ID %d.", task.ChatID)
}
